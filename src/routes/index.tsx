import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useState, type ReactNode } from "react";
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleHelp,
  Filter, Info, Lightbulb, Pencil, Plus, ScanBarcode, Search, Settings, Trash2, TriangleAlert,
  X, XCircle, CheckCircle2, Zap, Funnel,
} from "lucide-react";
import drill from "@/assets/drill-set.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Excel'den Ürün Aktarımı — İnşaatÇevrem ERP" },
      { name: "description", content: "Excel dosyasından ürünleri analiz edip düzenleyerek sisteme aktarın." },
      { property: "og:title", content: "Excel'den Ürün Aktarımı — İnşaatÇevrem ERP" },
      { property: "og:description", content: "Excel dosyasından ürünleri analiz edip düzenleyerek sisteme aktarın." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Status = "Hazır" | "Kontrol" | "Öneri" | "Hatalı";
type Row = { code: string; name: string; brand: string; unit: string; pack: string; qty: string; buy: string; sell: string; kdv: string; status: Status; note: string };

const raw: [string, string, string, string, string, string, string, string, string, Status?, string?][] = [
  ["CMT-001", "Çimento 50 KG", "Çimsa", "KG", "Torba", "50,00", "165,00", "195,00", "%20"],
  ["DMR-12", "İnşaat Demiri 12 mm", "Kardemir", "KG", "Çubuk", "12,00", "24,50", "28,50", "%20"],
  ["DMR-16", "İnşaat Demiri 16 mm", "Kardemir", "KG", "Çubuk", "12,00", "28,00", "32,75", "%20"],
  ["DMR-20", "İnşaat Demiri 20 mm", "Kardemir", "KG", "Çubuk", "12,00", "35,00", "40,25", "%20"],
  ["TGL-001", "Tuğla 13,5", "Ytong", "ADET", "Palet", "420,00", "3,90", "4,50", "%20", "Kontrol", "Ambalaj bilgisi eksik"],
  ["BRK-20", "Briket 20", "İzocam", "KUTU", "Kutu", "20,00", "58,00", "65,00", "%20", "Kontrol", "Kutu içeriği belirtilmemiş"],
  ["SER-6060", "Seramik 60x60", "Kale", "M²", "Kutu", "1,44", "300,00", "325,00", "%10"],
  ["FA-Y01", "Fayans 30x60", "Kale", "M²", "Kutu", "1,08", "195,00", "210,00", "%10"],
  ["BOY-001", "Boya 15 LT", "Dyo", "LT", "Kova", "15,00", "1.050,00", "1.250,00", "%20", "Öneri", "Marka eşleşmesi önerildi"],
  ["BOY-002", "Boya 2,5 LT", "Dyo", "LT", "Kova", "2,50", "235,00", "275,00", "%20", "Öneri", "Marka eşleşmesi önerildi"],
  ["PVC-001", "PVC Boru 50 mm", "Intenova", "METRE", "Boru", "1,00", "42,00", "48,50", "%20"],
  ["ELE-003", "Kablo 2,5 mm", "Prysmian", "M²", "Kutu", "10,00", "1.950,00", "2.450,00", "%20"],
  ["TAK-001", "Akülü Vidalama", "Bosch", "M²", "Kutu", "1,00", "3.300,00", "850,00", "%20"],
  ["VID-001", "Avuç 5xKG 0,5 SET", "Fischer", "KG", "Kutu", "1,00", "3.850,00", "4.750,00", "%20"],
  ["HHR-001", "Matkap Ucu Seti", "Bosch", "ADET", "Set", "1,00", "520,00", "850,00", "%20", "Hatalı", "Barkod çakışması"],
  ["VİD-001", "Vida 5x50", "Fischer", "ADET", "Kutu", "200,00", "0,38", "0,45", "%20", "Öneri", "Ambalaj alternatifi var"],
  ["YES-001", "Alçı 25 KG", "Knauf", "KG", "Torba", "25,00", "95,00", "105,00", "%20"],
  ["İZER-001", "Taş Yünü 5 cm", "İzocam", "M²", "Paket", "7,20", "210,00", "245,00", "%20"],
  ["SUI-001", "Su Yalıtım Membran", "Bitümlü", "M²", "Rulo", "0,00", "125,00", "155,00", "%20"],
  ["KAP-001", "İç Kapı 90x210", "Vario", "ADET", "Boru", "1,00", "2.450,00", "3.200,00", "%20"],
  ["PEN-001", "PVC Pencere 120x150", "Egepen", "ADET", "–", "1,00", "3.250,00", "4.100,00", "%20"],
  ["SIV-001", "Sıva Harcı 40 KG", "Akçansa", "KG", "Kutu", "1,00", "260,00", "920,00", "%20"],
  ["YAP-001", "Yapıştırıcı 25 KG", "Seramiksan", "KG", "Kutu", "8,00", "195,00", "120,00", "%20"],
  ["DER-001", "Derz Dolgu", "Viko", "ADET", "Kutu", "5,00", "275,00", "340,00", "%20"],
  ["PRZ-001", "Priz 280 ml", "Viko", "ADET", "Kutu", "3,00", "55,00", "48,00", "%20"],
  ["GRA-001", "Granit Seramik", "Vitra", "METRE", "Boru", "4,00", "35,00", "38,00", "%20"],
  ["GRR-001", "Grafit", "Fırat", "ADET", "Boru", "1,00", "23,00", "68,00", "%20"],
  ["DRS-001", "Dirsek 20 mm", "Fırat", "ADET", "Kutu", "3,00", "13,00", "2,75", "%20"],
  ["ASM-001", "Asma Tavan Panel 60x60", "Fırat", "ADET", "Kutu", "3,00", "120,00", "38,00", "%20"],
  ["DIER-001", "Dere Panel 40 KG", "Ebroo", "M²", "–", "3,00", "38,00", "13,00", "%20"],
  ["VEE-001", "Vana 1/2", "Ebroo", "KG", "Kutu", "3,00", "22,00", "28,00", "%20"],
  ["VLV-001", "Vana 1/2\"", "Ebromm", "KG", "Kutu", "3,00", "13,00", "18,00", "%20"],
  ["BAT-001", "Banyo Dolabı", "Ebaa", "ADET", "Kutu", "2,00", "135,00", "130,00", "%20"],
  ["BAT-002", "Banyo Bataryası", "Vitra", "ADET", "–", "8,00", "1,00", "13,75", "%20"],
  ["LAV-001", "Lavabo", "Vitra", "ADET", "Koli", "1,00", "39,00", "1.30,00", "%20"],
  ["KLO-001", "Klozet Takımı", "Vitra", "ADET", "–", "1,00", "130,00", "3.330,00", "%20"],
  ["DUŞ-001", "Duş Ayağı", "Kluta", "ADET", "Kutu", "3,00", "210,00", "1.300,00", "%20"],
  ["AYN-001", "Fırça 4/31", "Katen", "ADET", "–", "2,00", "33,00", "43,00", "%20"],
  ["RAF-001", "Banyo Rafı", "Vitra", "ADET", "Kutu", "1,00", "35,00", "125,00", "%20"],
  ["SÜP-001", "Süpürgelik 8 cm", "Kartonpiyer", "METRE", "–", "2,40", "18,00", "24,00", "%20"],
  ["ZIM-001", "Köşe Profili 2,5 m", "Alform", "METRE", "–", "2,50", "12,00", "15,00", "%20"],
  ["FIR-001", "Zımpara 120", "Klexor", "ADET", "Paket", "9,00", "6,50", "8,00", "%20"],
  ["RUL-001", "Fırça 4\"", "Dekor", "ADET", "–", "1,00", "25,00", "45,00", "%20"],
  ["BEZ-001", "Temizlik Bezi", "Parex", "ADET", "–", "0,00", "18,00", "24,00", "%20"],
  ["ELD-001", "Eldiven İşçi", "Mapa", "Çift", "Paket", "2,00", "12,00", "18,00", "%20"],
];
const rows: Row[] = raw.map((r) => ({
  code: r[0], name: r[1], brand: r[2], unit: r[3], pack: r[4], qty: r[5], buy: r[6], sell: r[7], kdv: r[8],
  status: r[9] ?? "Hazır", note: r[10] ?? "–",
}));

function Sel({ v, className = "" }: { v: string; className?: string }) {
  return (
    <div className={`flex h-[22px] items-center justify-between gap-1 rounded border border-border bg-surface px-1.5 text-[11px] ${className}`}>
      <span className="truncate">{v}</span>
      <ChevronDown className="h-3 w-3 shrink-0 text-foreground/70" />
    </div>
  );
}

function StatusPill({ s }: { s: Status }) {
  if (s === "Hazır") return <span className="inline-flex items-center gap-1 rounded bg-success-soft px-1.5 py-0.5 text-[11px] font-medium text-success"><CheckCircle2 className="h-3.5 w-3.5 fill-success text-surface" />Hazır</span>;
  if (s === "Hatalı") return <span className="inline-flex items-center gap-1 rounded bg-danger-soft px-1.5 py-0.5 text-[11px] font-medium text-danger"><XCircle className="h-3.5 w-3.5 fill-danger text-surface" />Hatalı</span>;
  return <span className="inline-flex items-center gap-1 rounded bg-warning-soft px-1.5 py-0.5 text-[11px] font-medium text-warning"><TriangleAlert className="h-3.5 w-3.5" />{s}</span>;
}

const steps = ["Dosya Yükle", "Sütun Eşleştir", "Verileri Analiz Et", "Önizle ve Düzelt", "Aktarımı Tamamla"];

function Field({ label, req, children }: { label: string; req?: boolean; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[68px_1fr] items-center gap-2">
      <label className="text-[11px] text-foreground/80">{label}{req && <span className="text-danger"> *</span>}</label>
      {children}
    </div>
  );
}
const Inp = ({ v, className = "" }: { v: string; className?: string }) => (
  <div className={`flex h-7 items-center rounded border border-border bg-surface px-2 text-[11px] ${className}`}>{v}</div>
);
const SelL = ({ v, className = "" }: { v: string; className?: string }) => (
  <div className={`flex h-7 items-center justify-between rounded border border-border bg-surface px-2 text-[11px] ${className}`}>{v}<ChevronDown className="h-3.5 w-3.5" /></div>
);
function Section({ title, open = true, children }: { title: string; open?: boolean; children?: ReactNode }) {
  const [o, setO] = useState(open);
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
      <button onClick={() => setO(!o)} className="flex w-full items-center gap-2 text-[12px] font-semibold">
        {o ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}{title}
        <span className="ml-auto">{o ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
      </button>
      {o && children && <div className="mt-2.5">{children}</div>}
    </div>
  );
}
function Toggle({ on, label }: { on?: boolean; label: string }) {
  const [v, setV] = useState(!!on);
  return (
    <button onClick={() => setV(!v)} className="flex items-center gap-2 text-[11px] font-medium">
      <span className={`relative h-4 w-7 rounded-full transition ${v ? "bg-primary" : "bg-border"}`}>
        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-surface shadow transition ${v ? "left-3.5" : "left-0.5"}`} />
      </span>{label}
    </button>
  );
}

function Index() {
  const [sel, setSel] = useState(14);
  const [tab, setTab] = useState("all");
  const cur = rows[sel] ?? rows[0]!;
  const stat = [
    { t: "Toplam Satır", v: "1.352", p: "", cls: "bg-surface", ic: <Search className="h-6 w-6 text-primary" />, icb: "bg-info-soft border-2 border-primary", tc: "text-foreground" },
    { t: "Aktarıma Hazır", v: "1.156", p: "(%85,5)", cls: "bg-success-soft", ic: <Check className="h-5 w-5 text-surface" strokeWidth={3} />, icb: "bg-success", tc: "text-foreground" },
    { t: "Kontrol Gerekli", v: "115", p: "(%8,5)", cls: "bg-warning-soft", ic: <TriangleAlert className="h-7 w-7 text-warning" />, icb: "", tc: "text-warning" },
    { t: "Hatalı", v: "81", p: "(%6,0)", cls: "bg-danger-soft", ic: <X className="h-5 w-5 text-surface" strokeWidth={3} />, icb: "bg-danger", tc: "text-danger" },
  ];
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-[1180px] gap-3 px-3 py-2">
        {/* MAIN */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-4 py-1">
            <ArrowLeft className="mt-2 h-4 w-4" />
            <div>
              <h1 className="text-[19px] font-bold">Excel'den Ürün Aktarımı</h1>
              <p className="text-[11px] text-foreground/80">AKTİF ÜRÜN YELPAZESİ(4).xls &nbsp;•&nbsp; 1.352 satır &nbsp;•&nbsp; Sayfa: Sayfa1</p>
            </div>
          </div>
          {/* steps */}
          <div className="mt-2 flex gap-2">
            {steps.map((s, i) => {
              const done = i < 2, act = i === 2;
              return (
                <div key={s} className={`flex h-8 flex-1 items-center gap-2 rounded-full px-1 text-[11px] ${act ? "bg-info-soft font-semibold text-primary" : "bg-muted"}`}>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold ${act ? "bg-primary text-primary-foreground" : "border border-border bg-surface"}`}>{i + 1}</span>
                  {s}{done && <Check className="h-3.5 w-3.5 text-success" />}
                </div>
              );
            })}
          </div>
          {/* stats */}
          <div className="mt-4 grid grid-cols-[1fr_1fr_1fr_1fr_1.05fr] gap-2.5">
            {stat.map((c) => (
              <div key={c.t} className={`flex h-[60px] items-center gap-3 rounded-lg border border-border px-3 ${c.cls}`}>
                <span className={`flex h-8 w-8 items-center justify-center rounded-full ${c.icb}`}>{c.ic}</span>
                <div>
                  <div className={`text-[11px] font-semibold ${c.tc}`}>{c.t}</div>
                  <div className={`text-[18px] font-bold leading-6 ${c.tc}`}>{c.v} <span className="text-[10px] font-normal">{c.p}</span></div>
                </div>
              </div>
            ))}
            <div className="flex gap-2 rounded-lg bg-info-soft p-2 text-[9.5px] leading-[13px] text-foreground/80">
              <Lightbulb className="h-4 w-4 shrink-0 text-primary" />
              <p><b className="text-primary">İpucu:</b> Tüm alanları listede doğrudan düzenleyebilir, ambalaj, varyant ve diğer bilgilerini sağ panelde belirleyebilirsiniz.</p>
            </div>
          </div>
          {/* table card */}
          <div className="mt-3 rounded-lg border border-border bg-surface">
            <div className="flex items-center gap-2 p-2.5">
              {[
                ["all", "Tümü (1.352)", <Funnel key="a" className="h-3.5 w-3.5" />],
                ["err", "Hatalar (81)", <XCircle key="b" className="h-3.5 w-3.5 fill-danger text-surface" />],
                ["sug", "Öneriler (115)", <TriangleAlert key="c" className="h-3.5 w-3.5 text-warning" />],
                ["ok", "Hazır (1.156)", <CheckCircle2 key="d" className="h-3.5 w-3.5 fill-success text-surface" />],
              ].map(([k, l, ic]) => (
                <button key={k as string} onClick={() => setTab(k as string)} className={`flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium ${tab === k ? "bg-primary text-primary-foreground" : ""}`}>{ic}{l}</button>
              ))}
              <div className="ml-auto flex h-7 w-[186px] items-center gap-2 rounded-md border border-border px-2 text-[10px] text-muted-foreground"><Search className="h-3.5 w-3.5 text-foreground" />Ürün kodu, ürün adı, marka ara...</div>
              <button className="flex h-7 items-center gap-1 rounded-md border border-border px-2 text-[10px] font-medium"><Filter className="h-3.5 w-3.5" />Filtrele<ChevronDown className="h-3.5 w-3.5" /></button>
              <button className="flex h-7 items-center gap-1 rounded-md border border-border px-2 text-[10px] font-medium"><Zap className="h-3.5 w-3.5" />Toplu İşlemler<ChevronDown className="h-3.5 w-3.5" /></button>
            </div>
            <table className="w-full table-fixed text-[11px]">
              <colgroup>
                <col className="w-7" /><col className="w-7" /><col className="w-[72px]" /><col className="w-[108px]" /><col className="w-[58px]" /><col className="w-[48px]" /><col className="w-[56px]" /><col className="w-[44px]" /><col className="w-[44px]" /><col className="w-[44px]" /><col className="w-[30px]" /><col className="w-[58px]" /><col /><col className="w-7" />
              </colgroup>
              <thead>
                <tr className="border-y border-border bg-muted/50 text-[10px] font-semibold">
                  <th className="py-1.5"><input type="checkbox" className="h-3 w-3" /></th>
                  <th>#</th><th className="text-left">Ürün Kodu</th><th className="text-left">Ürün Adı</th><th className="text-left">Marka</th><th className="text-left">Birim</th><th className="text-left">Ambalaj</th>
                  <th className="leading-3">İçerik<br />Miktarı</th><th className="leading-3">Alış Fiyatı<br />(₺)</th><th className="leading-3">Satış Fiyatı<br />(₺)</th><th>KDV</th><th className="text-left">Durum</th><th className="text-left">Açıklama</th>
                  <th><Settings className="mx-auto h-3.5 w-3.5" /></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const active = i === sel;
                  return (
                    <tr key={i} onClick={() => setSel(i)} className={`h-[22.7px] cursor-pointer border-b border-border/60 ${active ? "bg-info-soft" : "hover:bg-muted/40"}`}>
                      <td className="text-center"><input type="checkbox" readOnly checked={active} className="h-3 w-3 accent-primary" /></td>
                      <td className="text-center">{i + 1}</td>
                      <td className="truncate">{r.code}</td>
                      <td className="truncate">{r.name}</td>
                      <td className="pr-1"><Sel v={r.brand} /></td>
                      <td className="pr-1"><Sel v={r.unit} /></td>
                      <td className="pr-1"><Sel v={r.pack} /></td>
                      <td className="pr-1 text-right">{r.qty}</td>
                      <td className="pr-1 text-right">{r.buy}</td>
                      <td className="pr-1 text-right">{r.sell}</td>
                      <td className="text-center">{r.kdv}</td>
                      <td><StatusPill s={r.status} /></td>
                      <td className={`truncate pl-1 text-[10px] ${r.status === "Hazır" ? "" : "text-danger"}`}>{r.note}</td>
                      <td><Pencil className="mx-auto h-3.5 w-3.5" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex items-center gap-2 px-3 py-2.5 text-[10px]">
              <span>1.352 kayıttan 1 – 50 arası gösteriliyor</span>
              <div className="ml-auto flex items-center gap-2.5">
                <button className="flex h-6 w-7 items-center justify-center rounded border border-border"><ChevronLeft className="h-3.5 w-3.5" /></button>
                {["1", "2", "3", "4", "5", "...", "28"].map((p) => (
                  <span key={p} className={`flex h-6 min-w-6 items-center justify-center rounded text-[11px] ${p === "1" ? "bg-primary px-2 text-primary-foreground" : ""}`}>{p}</span>
                ))}
                <button className="flex h-6 w-7 items-center justify-center rounded border border-border"><ChevronRight className="h-3.5 w-3.5" /></button>
              </div>
              <div className="ml-auto flex items-center gap-2">Sayfa başına: <SelL v="50" className="h-6 w-[60px]" /></div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <button className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-4 text-[12px] font-semibold"><ChevronLeft className="h-4 w-4" />Önceki Adım</button>
            <div className="mx-auto flex h-8 items-center gap-2 rounded-md bg-info-soft px-4 text-[11px]"><Info className="h-4 w-4 text-primary" />Seçili 1 kayıt düzenleniyor. Değişiklikler anında tabloya yansır.</div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <aside className="w-[268px] shrink-0">
          <div className="flex h-12 items-center justify-end gap-4 text-[11px]">
            <span className="flex items-center gap-1"><CircleHelp className="h-4 w-4" />Yardım</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[12px] font-semibold text-primary-foreground">MK</span>
            <div className="leading-4"><div className="font-semibold">Mehmet Kaya</div><div>Yönetici</div></div>
            <ChevronDown className="h-4 w-4" />
          </div>
          <div className="mt-2 space-y-2 rounded-lg border border-border bg-muted/40 p-1.5">
            <div className="rounded-lg bg-surface p-3">
              <div className="flex items-center justify-between"><h2 className="text-[14px] font-bold">Ürün Düzenle</h2><X className="h-4 w-4" /></div>
              <div className="mt-3 flex justify-between">
                <div>
                  <div className="text-[14px] font-bold">{cur.name}</div>
                  <div className="text-[10px] text-foreground/70">{cur.code}</div>
                  <div className="mt-2 flex gap-2">
                    <StatusPill s={cur.status} />
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">Excel Satırı: {sel + 1}</span>
                  </div>
                </div>
                <img src={drill} alt={cur.name} width={56} height={56} className="h-14 w-14 object-contain" />
              </div>
              <div className="mt-3 flex gap-3 border-b border-border text-[10px]">
                {["Temel Bilgiler", "Varyantlar", "Ambalaj & Paketleme", "Diğer"].map((t, i) => (
                  <span key={t} className={`pb-1.5 ${i === 0 ? "border-b-2 border-primary font-semibold text-primary" : ""}`}>{t}</span>
                ))}
              </div>
              <h3 className="mt-3 text-[12px] font-semibold">Temel Bilgiler</h3>
              <div className="mt-2 space-y-2">
                <Field label="Ürün Kodu" req><Inp v={cur.code} /></Field>
                <Field label="Ürün Adı" req><Inp v={cur.name} /></Field>
                <Field label="Marka" req><div className="flex gap-1.5"><SelL v={cur.brand} className="flex-1" /><button className="flex h-7 items-center gap-1 rounded border border-border px-1.5 text-[10px] text-primary"><Plus className="h-3 w-3" />Yeni Marka</button></div></Field>
                <Field label="Kategori"><SelL v="Hırdavat > El Aletleri" /></Field>
                <Field label="Alt Kategori"><SelL v="Matkap Aksesuarları" /></Field>
                <Field label="Birim" req><div className="flex items-center gap-1.5"><SelL v={cur.unit} className="w-16" /><span className="text-[10px]">Çevrim Birimi</span><Inp v="SET" className="w-10" /></div></Field>
                <Field label="Barkod"><div className="flex items-center gap-1.5"><div className="flex h-7 flex-1 items-center justify-between rounded border border-border px-2 text-[11px]">8691234567890<ScanBarcode className="h-3.5 w-3.5 text-primary" /></div><TriangleAlert className="h-4 w-4 text-danger" /></div></Field>
                <Field label="Açıklama"><div className="h-9 rounded border border-border px-2 py-1.5 text-[10px] text-muted-foreground">Ürün açıklaması (isteğe bağlı)</div></Field>
              </div>
            </div>
            <Section title="Ambalaj & Paketleme">
              <div className="grid grid-cols-[1fr_1fr_1fr_14px] gap-1.5 text-[10px]">
                <span className="font-semibold">Ambalaj</span><span className="font-semibold">İçerik Miktarı</span><span className="font-semibold">Satış Birimi</span><span />
                {([["Set", "1"], ["Kutu", "10"], ["Koli", "50"]] as const).map(([a, b]) => (
                  <Fragment key={a}><SelL v={a} /><Inp v={b} /><SelL v="ADET" /><Trash2 className="h-3.5 w-3.5 self-center text-danger" /></Fragment>
                ))}
              </div>
              <button className="mt-2.5 flex h-7 items-center gap-1 rounded border border-border px-3 text-[11px] font-medium text-primary"><Plus className="h-3.5 w-3.5" />Ambalaj Ekle</button>
            </Section>
            <Section title="Varyantlar (Opsiyonel)" open={false} />
            <Section title="Stok ve Depo">
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>Başlangıç Stoku<Inp v="0,00" className="mt-1" /></div>
                <div>Depo<SelL v="Ana Depo" className="mt-1" /></div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                <div>Min. Stok<Inp v="5" className="mt-1" /></div>
                <div>Max. Stok<Inp v="50" className="mt-1" /></div>
                <div>Raf / Lokasyon<SelL v="A-12-04" className="mt-1" /></div>
              </div>
            </Section>
            <Section title="Fiyat ve Vergi">
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div>Alış Fiyatı (₺)<Inp v={cur.buy} className="mt-1" /></div>
                <div>Satış Fiyatı (₺)<Inp v={cur.sell} className="mt-1" /></div>
                <div>KDV Oranı<SelL v={cur.kdv} className="mt-1" /></div>
              </div>
              <div className="mt-2 grid grid-cols-[1fr_2fr] gap-2 text-[10px]">
                <div>Para Birimi<SelL v="TRY" className="mt-1" /></div>
                <div>Fiyat Listesi<SelL v="Genel" className="mt-1" /></div>
              </div>
            </Section>
            <Section title="Diğer Bilgiler">
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>GTİP<Inp v="8207.50.00.00" className="mt-1" /></div>
                <div>Menşei<SelL v="Almanya" className="mt-1" /></div>
              </div>
              <div className="mt-2 text-[10px]">Ürün Ailesi<SelL v="Matkap Uçları" className="mt-1" /></div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                <div>Ağırlık (kg)<Inp v="0,450" className="mt-1" /></div>
                <div>Hacim (m³)<Inp v="0,002" className="mt-1" /></div>
                <div>Garanti Süresi<SelL v="24 Ay" className="mt-1" /></div>
              </div>
              <div className="mt-3 space-y-2.5">
                <Toggle on label="Aktif (satışa açık)" /><Toggle label="Seri/Parti Takibi" /><Toggle label="Varyantlı Ürün" />
              </div>
            </Section>
            <div className="flex gap-3 p-1.5 pt-3">
              <button className="h-8 flex-1 rounded-md border border-border bg-surface text-[12px] font-medium">İptal</button>
              <button className="flex h-8 flex-1 items-center justify-center gap-2 rounded-md bg-primary text-[12px] font-semibold text-primary-foreground"><Check className="h-4 w-4" />Kaydet</button>
            </div>
          </div>
          <button className="mt-4 flex h-9 w-full items-center justify-center gap-3 rounded-md bg-primary text-[13px] font-semibold text-primary-foreground">Aktarımı Başlat<ArrowRight className="h-4 w-4" /></button>
        </aside>
      </div>
    </div>
  );
}
