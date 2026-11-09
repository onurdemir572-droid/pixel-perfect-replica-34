import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleHelp,
  Download, FileSpreadsheet, Info, Lightbulb, Pencil, Search, Trash2, TriangleAlert, Upload,
  X, XCircle, CheckCircle2, Zap, Funnel, PartyPopper, RotateCcw,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  CATEGORIES, KDV, PACKS, UNITS, fmt, mapHeader, rowsToProducts, validate,
  type Checked, type Product, type Status,
} from "@/lib/stock-import";
import { SAMPLE_FILE, sampleProducts } from "@/lib/sample-stock";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Excel'den Ürün Aktarımı — İnşaatÇevrem ERP" },
      { name: "description", content: "İnşaat malzemesi satıcıları için Excel stok listesini analiz edip düzenleyerek sisteme aktarın." },
      { property: "og:title", content: "Excel'den Ürün Aktarımı — İnşaatÇevrem ERP" },
      { property: "og:description", content: "İnşaat malzemesi satıcıları için Excel stok listesi aktarımı." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const steps = ["Dosya Yükle", "Sütun Eşleştir", "Verileri Analiz Et", "Önizle ve Düzelt", "Aktarımı Tamamla"];
const FIELD_LABELS: Partial<Record<keyof Product, string>> = {
  code: "Ürün Kodu", name: "Ürün Adı", brand: "Marka", unit: "Birim", pack: "Ambalaj", qty: "İçerik Miktarı",
  buy: "Alış Fiyatı", sell: "Satış Fiyatı", kdv: "KDV", barcode: "Barkod", category: "Kategori", stock: "Stok",
};
type Tab = "all" | "Hatalı" | "Öneri" | "Hazır";

/* ---------- small UI pieces ---------- */
function StatusPill({ s }: { s: Status }) {
  if (s === "Hazır") return <span className="inline-flex items-center gap-1 rounded bg-success-soft px-1.5 py-0.5 text-[11px] font-medium text-success"><CheckCircle2 className="h-3.5 w-3.5 fill-success text-surface" />Hazır</span>;
  if (s === "Hatalı") return <span className="inline-flex items-center gap-1 rounded bg-danger-soft px-1.5 py-0.5 text-[11px] font-medium text-danger"><XCircle className="h-3.5 w-3.5 fill-danger text-surface" />Hatalı</span>;
  return <span className="inline-flex items-center gap-1 rounded bg-warning-soft px-1.5 py-0.5 text-[11px] font-medium text-warning"><TriangleAlert className="h-3.5 w-3.5" />{s}</span>;
}
const inputCls = "h-7 w-full rounded border border-border bg-surface px-2 text-[11px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";
const cellSel = "h-[22px] w-full rounded border border-border bg-surface px-1 text-[11px] outline-none focus:border-primary";

function TSel({ value, options, onChange, className = cellSel }: { value: string; options: (string | number)[]; onChange: (v: string) => void; className?: string }) {
  const opts = options.map(String);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} onClick={(e) => e.stopPropagation()} className={className}>
      {!opts.includes(value) && <option value={value}>{value || "—"}</option>}
      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
function Field({ label, req, children }: { label: string; req?: boolean; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[68px_1fr] items-center gap-2">
      <label className="text-[11px] text-foreground/80">{label}{req && <span className="text-danger"> *</span>}</label>
      {children}
    </div>
  );
}
function Section({ title, open = true, children }: { title: string; open?: boolean; children?: ReactNode }) {
  const [o, setO] = useState(open);
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
      <button onClick={() => setO(!o)} className="flex w-full items-center gap-2 text-[12px] font-semibold">
        {o ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}{title}
      </button>
      {o && children && <div className="mt-2.5">{children}</div>}
    </div>
  );
}
function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button onClick={() => onChange(!on)} className="flex items-center gap-2 text-[11px] font-medium">
      <span className={`relative h-4 w-7 rounded-full transition ${on ? "bg-primary" : "bg-border"}`}>
        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-surface shadow transition-all ${on ? "left-3.5" : "left-0.5"}`} />
      </span>{label}
    </button>
  );
}

/* ---------- page ---------- */
function Index() {
  const [step, setStep] = useState(3);
  const [fileName, setFileName] = useState(SAMPLE_FILE);
  const [headers, setHeaders] = useState<string[]>(Object.values(FIELD_LABELS) as string[]);
  const [products, setProducts] = useState<Product[]>(sampleProducts);
  const [selId, setSelId] = useState<number | null>(15);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [imported, setImported] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const checked = useMemo(() => validate(products), [products]);
  const counts = useMemo(() => {
    const c = { Hazır: 0, Kontrol: 0, Öneri: 0, Hatalı: 0 };
    checked.forEach((p) => c[p.status]++);
    return c;
  }, [checked]);
  const total = checked.length || 1;
  const pct = (n: number) => `(%${((n / total) * 100).toLocaleString("tr-TR", { maximumFractionDigits: 1 })})`;

  const filtered = useMemo(() => {
    const s = q.trim().toLocaleLowerCase("tr");
    return checked.filter((p) => {
      if (tab === "Öneri" && !(p.status === "Öneri" || p.status === "Kontrol")) return false;
      if (tab !== "all" && tab !== "Öneri" && p.status !== tab) return false;
      if (!s) return true;
      return [p.code, p.name, p.brand, p.barcode].some((v) => v.toLocaleLowerCase("tr").includes(s));
    });
  }, [checked, tab, q]);
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const cur = Math.min(page, pages);
  const visible = filtered.slice((cur - 1) * perPage, cur * perPage);
  const sel = checked.find((p) => p.id === selId) ?? null;

  const update = (id: number, patch: Partial<Product>) =>
    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  async function onFile(f: File) {
    try {
      const wb = XLSX.read(await f.arrayBuffer());
      const ws = wb.Sheets[wb.SheetNames[0]!]!;
      const recs = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      if (!recs.length) return toast.error("Dosyada satır bulunamadı");
      setHeaders(Object.keys(recs[0]!));
      setProducts(rowsToProducts(recs));
      setFileName(f.name);
      setSelId(null);
      setPage(1);
      setStep(2);
      toast.success(`${recs.length} satır okundu`);
    } catch {
      toast.error("Dosya okunamadı. .xlsx, .xls veya .csv yükleyin.");
    }
  }
  function exportErrors() {
    const data = checked.filter((p) => p.status !== "Hazır").map((p) => ({
      "Ürün Kodu": p.code, "Ürün Adı": p.name, Marka: p.brand, Birim: p.unit, Ambalaj: p.pack, Barkod: p.barcode,
      "Alış Fiyatı": p.buy, "Satış Fiyatı": p.sell, Durum: p.status, Açıklama: p.note,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Sorunlu Kayıtlar");
    XLSX.writeFile(wb, "sorunlu-kayitlar.xlsx");
  }
  function bulk(action: "delete" | "kdv20" | "price5" | "packKutu") {
    const ids = checkedIds.size ? checkedIds : new Set(filtered.map((p) => p.id));
    if (action === "delete") {
      setProducts((ps) => ps.filter((p) => !ids.has(p.id)));
      if (selId && ids.has(selId)) setSelId(null);
    } else setProducts((ps) => ps.map((p) => {
      if (!ids.has(p.id)) return p;
      if (action === "kdv20") return { ...p, kdv: 20 };
      if (action === "price5") return { ...p, sell: Math.round(p.sell * 1.05 * 100) / 100 };
      return p.pack === "–" ? { ...p, pack: "Kutu" } : p;
    }));
    setCheckedIds(new Set());
    setBulkOpen(false);
    toast.success(`${ids.size} kayda işlem uygulandı`);
  }
  function startImport() {
    if (counts.Hatalı > 0) {
      toast.error(`${counts.Hatalı} hatalı kayıt var`, { description: "Hatalı kayıtlar aktarılmaz. Önce düzeltin veya silin." });
    }
    setImported(counts.Hazır + counts.Öneri + counts.Kontrol);
    setStep(5);
  }
  function reset() {
    setProducts(sampleProducts()); setFileName(SAMPLE_FILE); setStep(3); setSelId(15); setTab("all"); setQ(""); setPage(1);
  }

  const allVisibleChecked = visible.length > 0 && visible.every((p) => checkedIds.has(p.id));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <div className="mx-auto flex max-w-[1240px] gap-3 px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-4 py-1">
            <button onClick={() => setStep(Math.max(1, step === 5 ? 3 : step - 1))} aria-label="Geri"><ArrowLeft className="mt-2 h-4 w-4" /></button>
            <div>
              <h1 className="text-[19px] font-bold">Excel'den Ürün Aktarımı</h1>
              <p className="text-[11px] text-foreground/80">{fileName} &nbsp;•&nbsp; {products.length.toLocaleString("tr-TR")} satır &nbsp;•&nbsp; Sayfa: Sayfa1</p>
            </div>
            <button onClick={() => fileRef.current?.click()} className="ml-auto mt-1 flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-[11px] font-medium"><Upload className="h-3.5 w-3.5" />Yeni Dosya</button>
          </div>

          <div className="mt-2 flex gap-2">
            {steps.map((s, i) => {
              const n = i + 1;
              const visualStep = step === 3 ? (selId ? 4 : 3) : step;
              const done = n < visualStep, act = n === visualStep;
              const reachable = n <= 3 || (n === 4 && step >= 3);
              return (
                <button key={s} disabled={!reachable || step === 5} onClick={() => setStep(n >= 3 ? 3 : n)}
                  className={`flex h-8 flex-1 items-center gap-2 rounded-full px-1 text-[11px] transition ${act ? "bg-info-soft font-semibold text-primary" : "bg-muted"}`}>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold ${act ? "bg-primary text-primary-foreground" : "border border-border bg-surface"}`}>{n}</span>
                  {s}{done && <Check className="h-3.5 w-3.5 text-success" />}
                </button>
              );
            })}
          </div>

          {step === 1 && (
            <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
              className="mt-4 flex h-[420px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-primary/40 bg-surface text-center">
              <FileSpreadsheet className="h-12 w-12 text-success" />
              <h2 className="text-[16px] font-bold">Stok listenizi buraya sürükleyin</h2>
              <p className="max-w-sm text-[12px] text-muted-foreground">.xlsx, .xls veya .csv. İlk satır başlık olmalı: Ürün Kodu, Ürün Adı, Marka, Birim, Ambalaj, Alış/Satış Fiyatı, KDV, Barkod…</p>
              <div className="flex gap-2">
                <button onClick={() => fileRef.current?.click()} className="flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[12px] font-semibold text-primary-foreground"><Upload className="h-4 w-4" />Dosya Seç</button>
                <button onClick={reset} className="h-9 rounded-md border border-border px-4 text-[12px] font-medium">Örnek liste ile dene</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="mt-4 rounded-lg border border-border bg-surface p-4">
              <h2 className="text-[14px] font-bold">Sütun Eşleştirme</h2>
              <p className="text-[11px] text-muted-foreground">Dosyanızdaki sütunlar otomatik olarak sistem alanlarıyla eşleştirildi.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {headers.map((h) => {
                  const f = mapHeader(h);
                  return (
                    <div key={h} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-[12px]">
                      <span className="flex-1 truncate font-medium">{h}</span><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      {f ? <span className="flex flex-1 items-center gap-1 text-success"><Check className="h-3.5 w-3.5" />{FIELD_LABELS[f] ?? f}</span>
                        : <span className="flex-1 text-warning">Eşleşmedi (atlanacak)</span>}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-end"><button onClick={() => setStep(3)} className="flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[12px] font-semibold text-primary-foreground">Verileri Analiz Et<ArrowRight className="h-4 w-4" /></button></div>
            </div>
          )}

          {step === 5 && (
            <div className="mt-4 flex h-[420px] flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-soft"><PartyPopper className="h-8 w-8 text-success" /></span>
              <h2 className="text-[18px] font-bold">Aktarım tamamlandı</h2>
              <p className="text-[12px] text-muted-foreground"><b className="text-foreground">{imported.toLocaleString("tr-TR")}</b> ürün stok listenize aktarıldı.{counts.Hatalı > 0 && <> <b className="text-danger">{counts.Hatalı}</b> hatalı kayıt atlandı.</>}</p>
              <div className="flex gap-2">
                {counts.Hatalı > 0 && <button onClick={exportErrors} className="flex h-9 items-center gap-2 rounded-md border border-border px-4 text-[12px] font-medium"><Download className="h-4 w-4" />Atlanan kayıtları indir</button>}
                <button onClick={() => { setStep(1); }} className="flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-[12px] font-semibold text-primary-foreground"><RotateCcw className="h-4 w-4" />Yeni aktarım</button>
              </div>
            </div>
          )}

          {step === 3 && (<>
            <div className="mt-4 grid grid-cols-[1fr_1fr_1fr_1fr_1.05fr] gap-2.5">
              {[
                { t: "Toplam Satır", v: products.length, p: "", cls: "bg-surface", ic: <Search className="h-5 w-5 text-primary" />, icb: "bg-info-soft border-2 border-primary", tc: "", tab: "all" as Tab },
                { t: "Aktarıma Hazır", v: counts.Hazır, p: pct(counts.Hazır), cls: "bg-success-soft", ic: <Check className="h-5 w-5 text-surface" strokeWidth={3} />, icb: "bg-success", tc: "", tab: "Hazır" as Tab },
                { t: "Kontrol Gerekli", v: counts.Kontrol + counts.Öneri, p: pct(counts.Kontrol + counts.Öneri), cls: "bg-warning-soft", ic: <TriangleAlert className="h-7 w-7 text-warning" />, icb: "", tc: "text-warning", tab: "Öneri" as Tab },
                { t: "Hatalı", v: counts.Hatalı, p: pct(counts.Hatalı), cls: "bg-danger-soft", ic: <X className="h-5 w-5 text-surface" strokeWidth={3} />, icb: "bg-danger", tc: "text-danger", tab: "Hatalı" as Tab },
              ].map((c) => (
                <button key={c.t} onClick={() => { setTab(c.tab); setPage(1); }} className={`flex h-[60px] items-center gap-3 rounded-lg border px-3 text-left transition hover:shadow-sm ${c.cls} ${tab === c.tab ? "border-primary/50" : "border-border"}`}>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full ${c.icb}`}>{c.ic}</span>
                  <div>
                    <div className={`text-[11px] font-semibold ${c.tc}`}>{c.t}</div>
                    <div className={`text-[18px] font-bold leading-6 ${c.tc}`}>{c.v.toLocaleString("tr-TR")} <span className="text-[10px] font-normal">{c.p}</span></div>
                  </div>
                </button>
              ))}
              <div className="flex gap-2 rounded-lg bg-info-soft p-2 text-[9.5px] leading-[13px] text-foreground/80">
                <Lightbulb className="h-4 w-4 shrink-0 text-primary" />
                <p><b className="text-primary">İpucu:</b> Tüm alanları listede doğrudan düzenleyebilir, ambalaj, stok ve fiyat bilgilerini sağ panelde belirleyebilirsiniz.</p>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-border bg-surface">
              <div className="flex items-center gap-1.5 p-2.5">
                {([
                  ["all", `Tümü (${products.length})`, <Funnel key="a" className="h-3.5 w-3.5" />],
                  ["Hatalı", `Hatalar (${counts.Hatalı})`, <XCircle key="b" className="h-3.5 w-3.5 fill-danger text-surface" />],
                  ["Öneri", `Öneriler (${counts.Öneri + counts.Kontrol})`, <TriangleAlert key="c" className="h-3.5 w-3.5 text-warning" />],
                  ["Hazır", `Hazır (${counts.Hazır})`, <CheckCircle2 key="d" className="h-3.5 w-3.5 fill-success text-surface" />],
                ] as [Tab, string, ReactNode][]).map(([k, l, ic]) => (
                  <button key={k} onClick={() => { setTab(k); setPage(1); }} className={`flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium transition ${tab === k ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{ic}{l}</button>
                ))}
                <label className="ml-auto flex h-7 w-[200px] items-center gap-2 rounded-md border border-border px-2 focus-within:border-primary">
                  <Search className="h-3.5 w-3.5" />
                  <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Ürün kodu, ürün adı, marka ara..." className="w-full bg-transparent text-[10px] outline-none" />
                </label>
                <button onClick={exportErrors} className="flex h-7 items-center gap-1 rounded-md border border-border px-2 text-[10px] font-medium"><Download className="h-3.5 w-3.5" />Sorunlular</button>
                <div className="relative">
                  <button onClick={() => setBulkOpen(!bulkOpen)} className="flex h-7 items-center gap-1 rounded-md border border-border px-2 text-[10px] font-medium"><Zap className="h-3.5 w-3.5" />Toplu İşlemler{checkedIds.size > 0 && ` (${checkedIds.size})`}<ChevronDown className="h-3.5 w-3.5" /></button>
                  {bulkOpen && (
                    <div className="absolute right-0 z-20 mt-1 w-56 rounded-md border border-border bg-popover p-1 text-[11px] shadow-lg">
                      <p className="px-2 py-1 text-[10px] text-muted-foreground">{checkedIds.size ? `${checkedIds.size} seçili kayıt` : `Filtrelenen ${filtered.length} kayıt`}</p>
                      {[["packKutu", "Eksik ambalajları 'Kutu' yap"], ["kdv20", "KDV'yi %20 yap"], ["price5", "Satış fiyatına %5 zam"], ["delete", "Kayıtları sil"]].map(([a, l]) => (
                        <button key={a} onClick={() => bulk(a as "delete")} className={`block w-full rounded px-2 py-1.5 text-left hover:bg-muted ${a === "delete" ? "text-danger" : ""}`}>{l}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <table className="w-full table-fixed text-[11px]">
                <colgroup>
                  <col className="w-7" /><col className="w-7" /><col className="w-[74px]" /><col className="w-[124px]" /><col className="w-[72px]" /><col className="w-[60px]" /><col className="w-[62px]" /><col className="w-[48px]" /><col className="w-[58px]" /><col className="w-[58px]" /><col className="w-[44px]" /><col className="w-[62px]" /><col /><col className="w-7" />
                </colgroup>
                <thead>
                  <tr className="border-y border-border bg-muted/50 text-[10px] font-semibold">
                    <th className="py-1.5"><input type="checkbox" checked={allVisibleChecked} onChange={() => setCheckedIds((s) => { const n = new Set(s); visible.forEach((p) => allVisibleChecked ? n.delete(p.id) : n.add(p.id)); return n; })} className="h-3 w-3 accent-primary" /></th>
                    <th>#</th><th className="text-left">Ürün Kodu</th><th className="text-left">Ürün Adı</th><th className="text-left">Marka</th><th className="text-left">Birim</th><th className="text-left">Ambalaj</th>
                    <th className="leading-3">İçerik<br />Miktarı</th><th className="leading-3">Alış Fiyatı<br />(₺)</th><th className="leading-3">Satış Fiyatı<br />(₺)</th><th>KDV</th><th className="text-left">Durum</th><th className="text-left">Açıklama</th><th />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => <TableRow key={r.id} r={r} index={products.findIndex((p) => p.id === r.id) + 1} active={r.id === selId}
                    checked={checkedIds.has(r.id)} onCheck={() => setCheckedIds((s) => { const n = new Set(s); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; })}
                    onSelect={() => setSelId(r.id)} onChange={(p) => update(r.id, p)} />)}
                  {!visible.length && <tr><td colSpan={14} className="py-10 text-center text-muted-foreground">Bu filtrede kayıt yok.</td></tr>}
                </tbody>
              </table>
              <div className="flex items-center gap-2 px-3 py-2.5 text-[10px]">
                <span>{filtered.length.toLocaleString("tr-TR")} kayıttan {filtered.length ? (cur - 1) * perPage + 1 : 0} – {Math.min(cur * perPage, filtered.length)} arası gösteriliyor</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <button disabled={cur === 1} onClick={() => setPage(cur - 1)} className="flex h-6 w-7 items-center justify-center rounded border border-border disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" /></button>
                  {Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - cur) <= 2).map((n, i, arr) => (
                    <span key={n} className="flex items-center gap-1.5">
                      {i > 0 && n - arr[i - 1]! > 1 && <span>...</span>}
                      <button onClick={() => setPage(n)} className={`flex h-6 min-w-6 items-center justify-center rounded px-2 text-[11px] ${n === cur ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{n}</button>
                    </span>
                  ))}
                  <button disabled={cur === pages} onClick={() => setPage(cur + 1)} className="flex h-6 w-7 items-center justify-center rounded border border-border disabled:opacity-40"><ChevronRight className="h-3.5 w-3.5" /></button>
                </div>
                <div className="ml-auto flex items-center gap-2">Sayfa başına:
                  <TSel value={String(perPage)} options={[10, 25, 50, 100]} onChange={(v) => { setPerPage(Number(v)); setPage(1); }} className="h-6 w-[60px] rounded border border-border bg-surface px-1 text-[11px]" />
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <button onClick={() => setStep(2)} className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-4 text-[12px] font-semibold"><ChevronLeft className="h-4 w-4" />Önceki Adım</button>
              <div className="mx-auto flex h-8 items-center gap-2 rounded-md bg-info-soft px-4 text-[11px]"><Info className="h-4 w-4 text-primary" />
                {sel ? "Seçili 1 kayıt düzenleniyor. Değişiklikler anında tabloya yansır." : "Düzenlemek için tablodan bir satır seçin."}
              </div>
            </div>
          </>)}
        </div>

        <aside className="w-[272px] shrink-0">
          <div className="flex h-12 items-center justify-end gap-4 text-[11px]">
            <span className="flex items-center gap-1"><CircleHelp className="h-4 w-4" />Yardım</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[12px] font-semibold text-primary-foreground">MK</span>
            <div className="leading-4"><div className="font-semibold">Mehmet Kaya</div><div>Yönetici</div></div>
            <ChevronDown className="h-4 w-4" />
          </div>
          {step === 3 && sel ? (
            <EditPanel key={sel.id} p={sel} index={products.findIndex((x) => x.id === sel.id) + 1}
              onChange={(patch) => update(sel.id, patch)} onClose={() => setSelId(null)}
              onDelete={() => { setProducts((ps) => ps.filter((x) => x.id !== sel.id)); setSelId(null); toast.success("Kayıt silindi"); }} />
          ) : (
            <div className="mt-2 rounded-lg border border-border bg-surface p-4 text-[12px]">
              <h2 className="text-[14px] font-bold">Aktarım Özeti</h2>
              <ul className="mt-3 space-y-2">
                <li className="flex justify-between"><span>Hazır</span><b className="text-success">{counts.Hazır}</b></li>
                <li className="flex justify-between"><span>Kontrol / Öneri</span><b className="text-warning">{counts.Kontrol + counts.Öneri}</b></li>
                <li className="flex justify-between"><span>Hatalı (aktarılmaz)</span><b className="text-danger">{counts.Hatalı}</b></li>
              </ul>
              <p className="mt-3 text-[11px] text-muted-foreground">Bir ürünü düzenlemek için tablodan satır seçin.</p>
            </div>
          )}
          {step === 3 && (
            <button onClick={startImport} className="mt-4 flex h-9 w-full items-center justify-center gap-3 rounded-md bg-primary text-[13px] font-semibold text-primary-foreground transition hover:bg-primary/90">
              Aktarımı Başlat<ArrowRight className="h-4 w-4" />
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}

function TableRow({ r, index, active, checked, onCheck, onSelect, onChange }: {
  r: Checked; index: number; active: boolean; checked: boolean; onCheck: () => void; onSelect: () => void; onChange: (p: Partial<Product>) => void;
}) {
  return (
    <tr onClick={onSelect} className={`h-[24px] cursor-pointer border-b border-border/60 ${active ? "bg-info-soft" : "hover:bg-muted/40"}`}>
      <td className="text-center" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={checked} onChange={onCheck} className="h-3 w-3 accent-primary" /></td>
      <td className="text-center">{index}</td>
      <td className="truncate pr-1">{r.code || <span className="text-danger">—</span>}</td>
      <td className="truncate pr-1">{r.name}</td>
      <td className="pr-1"><input value={r.brand} onClick={(e) => e.stopPropagation()} onChange={(e) => onChange({ brand: e.target.value })} className={cellSel} /></td>
      <td className="pr-1"><TSel value={r.unit} options={UNITS} onChange={(v) => onChange({ unit: v })} /></td>
      <td className="pr-1"><TSel value={r.pack} options={PACKS} onChange={(v) => onChange({ pack: v })} /></td>
      <td className="pr-1 text-right">{fmt(r.qty)}</td>
      <td className="pr-1 text-right">{fmt(r.buy)}</td>
      <td className="pr-1 text-right">{fmt(r.sell)}</td>
      <td className="text-center">%{r.kdv}</td>
      <td><StatusPill s={r.status} /></td>
      <td className={`truncate pl-1 text-[10px] ${r.status === "Hazır" ? "" : "text-danger"}`} title={r.note}>{r.note}</td>
      <td><Pencil className={`mx-auto h-3.5 w-3.5 ${active ? "text-primary" : ""}`} /></td>
    </tr>
  );
}

function NumInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [s, setS] = useState(fmt(value));
  return <input value={s} onChange={(e) => setS(e.target.value)} onBlur={() => { const n = Number(s.replace(/\./g, "").replace(",", ".")); const v = Number.isFinite(n) ? n : 0; onChange(v); setS(fmt(v)); }} className={inputCls} />;
}

function EditPanel({ p, index, onChange, onClose, onDelete }: { p: Checked; index: number; onChange: (patch: Partial<Product>) => void; onClose: () => void; onDelete: () => void }) {
  const [tab, setTab] = useState(0);
  const margin = p.buy > 0 ? ((p.sell - p.buy) / p.buy) * 100 : 0;
  return (
    <div className="mt-2 space-y-2 rounded-lg border border-border bg-muted/40 p-1.5">
      <div className="rounded-lg bg-surface p-3">
        <div className="flex items-center justify-between"><h2 className="text-[14px] font-bold">Ürün Düzenle</h2><button onClick={onClose} aria-label="Kapat"><X className="h-4 w-4" /></button></div>
        <div className="mt-3">
          <div className="text-[14px] font-bold">{p.name || "İsimsiz ürün"}</div>
          <div className="text-[10px] text-foreground/70">{p.code || "Kod yok"}</div>
          <div className="mt-2 flex gap-2"><StatusPill s={p.status} /><span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">Excel Satırı: {index}</span></div>
          {p.status !== "Hazır" && <p className={`mt-2 rounded px-2 py-1 text-[10px] ${p.status === "Hatalı" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"}`}>{p.note}</p>}
        </div>
        <div className="mt-3 flex gap-3 border-b border-border text-[10px]">
          {["Temel Bilgiler", "Stok & Fiyat", "Diğer"].map((t, i) => (
            <button key={t} onClick={() => setTab(i)} className={`pb-1.5 ${i === tab ? "border-b-2 border-primary font-semibold text-primary" : ""}`}>{t}</button>
          ))}
        </div>
        {tab === 0 && (
          <div className="mt-3 space-y-2">
            <Field label="Ürün Kodu" req><input value={p.code} onChange={(e) => onChange({ code: e.target.value })} className={inputCls} /></Field>
            <Field label="Ürün Adı" req><input value={p.name} onChange={(e) => onChange({ name: e.target.value })} className={inputCls} /></Field>
            <Field label="Marka"><input value={p.brand} onChange={(e) => onChange({ brand: e.target.value })} className={inputCls} /></Field>
            <Field label="Kategori"><TSel value={p.category} options={CATEGORIES} onChange={(v) => onChange({ category: v })} className={inputCls} /></Field>
            <Field label="Birim" req><TSel value={p.unit} options={UNITS} onChange={(v) => onChange({ unit: v })} className={inputCls} /></Field>
            <Field label="Barkod">
              <div className="flex items-center gap-1.5">
                <input value={p.barcode} onChange={(e) => onChange({ barcode: e.target.value })} className={inputCls} />
                {p.note.includes("Barkod") && <TriangleAlert className="h-4 w-4 shrink-0 text-danger" />}
              </div>
            </Field>
            <Field label="Açıklama"><textarea value={p.description} onChange={(e) => onChange({ description: e.target.value })} placeholder="Ürün açıklaması (isteğe bağlı)" className={`${inputCls} h-12 py-1.5`} /></Field>
          </div>
        )}
        {tab === 1 && (
          <div className="mt-3 space-y-3 text-[10px]">
            <div className="grid grid-cols-2 gap-2">
              <div>Ambalaj<TSel value={p.pack} options={PACKS} onChange={(v) => onChange({ pack: v })} className={`${inputCls} mt-1`} /></div>
              <div>İçerik Miktarı<div className="mt-1"><NumInput value={p.qty} onChange={(n) => onChange({ qty: n })} /></div></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>Alış (₺)<div className="mt-1"><NumInput value={p.buy} onChange={(n) => onChange({ buy: n })} /></div></div>
              <div>Satış (₺)<div className="mt-1"><NumInput value={p.sell} onChange={(n) => onChange({ sell: n })} /></div></div>
              <div>KDV<TSel value={String(p.kdv)} options={KDV} onChange={(v) => onChange({ kdv: Number(v) })} className={`${inputCls} mt-1`} /></div>
            </div>
            <p className={margin < 0 ? "text-danger" : "text-success"}>Kâr marjı: %{margin.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} · KDV dahil satış: ₺{fmt(p.sell * (1 + p.kdv / 100))}</p>
            <div className="grid grid-cols-2 gap-2">
              <div>Başlangıç Stoku<div className="mt-1"><NumInput value={p.stock} onChange={(n) => onChange({ stock: n })} /></div></div>
              <div>Min. Stok<div className="mt-1"><NumInput value={p.minStock} onChange={(n) => onChange({ minStock: n })} /></div></div>
            </div>
            {p.stock < p.minStock && <p className="text-warning">Stok, minimum seviyenin altında.</p>}
          </div>
        )}
        {tab === 2 && (
          <div className="mt-3 space-y-3">
            <Toggle on={p.active} onChange={(v) => onChange({ active: v })} label="Aktif (satışa açık)" />
            <button onClick={onDelete} className="flex h-8 w-full items-center justify-center gap-2 rounded-md border border-danger/40 text-[11px] font-medium text-danger"><Trash2 className="h-3.5 w-3.5" />Bu kaydı aktarımdan çıkar</button>
          </div>
        )}
      </div>
      <Section title="Önizleme" open>
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between"><span className="text-muted-foreground">Satış birimi</span><span>{p.pack !== "–" ? `1 ${p.pack} = ${fmt(p.qty)} ${p.unit}` : p.unit}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Birim fiyat</span><span>₺{fmt(p.qty > 0 ? p.sell / p.qty : p.sell)} / {p.unit}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Kategori</span><span>{p.category}</span></div>
        </div>
      </Section>
      <div className="flex gap-3 p-1.5 pt-2">
        <button onClick={onClose} className="h-8 flex-1 rounded-md border border-border bg-surface text-[12px] font-medium">Kapat</button>
        <button onClick={() => { toast.success("Kaydedildi", { description: `${p.code} · ${p.status}` }); onClose(); }} className="flex h-8 flex-1 items-center justify-center gap-2 rounded-md bg-primary text-[12px] font-semibold text-primary-foreground"><Check className="h-4 w-4" />Kaydet</button>
      </div>
    </div>
  );
}
