export type Status = "Hazır" | "Kontrol" | "Öneri" | "Hatalı";

export type Product = {
  id: number;
  code: string;
  name: string;
  brand: string;
  unit: string;
  pack: string;
  qty: number;
  buy: number;
  sell: number;
  kdv: number;
  barcode: string;
  category: string;
  stock: number;
  minStock: number;
  description: string;
  active: boolean;
};

export type Checked = Product & { status: Status; note: string };

export const UNITS = ["ADET", "KG", "M²", "METRE", "LT", "KUTU", "Çift", "SET", "TON", "M³"];
export const PACKS = ["–", "Torba", "Çubuk", "Palet", "Kutu", "Kova", "Boru", "Rulo", "Paket", "Set", "Koli"];
export const KDV = [1, 10, 20];
export const CATEGORIES = [
  "Kaba İnşaat", "Demir & Çelik", "Seramik & Vitrifiye", "Boya & Kimyasal", "Tesisat",
  "Elektrik", "Yalıtım", "Kapı & Pencere", "Hırdavat > El Aletleri", "Diğer",
];

export const fmt = (n: number) =>
  n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Turkish number parsing: "1.250,50" -> 1250.5, also accepts "1250.5". */
export function parseNum(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v ?? "").trim().replace(/[₺%\s]/g, "");
  if (!s) return 0;
  const norm = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(norm);
  return Number.isFinite(n) ? n : 0;
}

/** Validation rules for an import row, evaluated against the whole list. */
export function validate(list: Product[]): Checked[] {
  const codes = new Map<string, number>();
  const barcodes = new Map<string, number>();
  for (const p of list) {
    const c = p.code.trim().toUpperCase();
    if (c) codes.set(c, (codes.get(c) ?? 0) + 1);
    const b = p.barcode.trim();
    if (b) barcodes.set(b, (barcodes.get(b) ?? 0) + 1);
  }
  return list.map((p) => {
    const errs: string[] = [];
    if (!p.code.trim()) errs.push("Ürün kodu boş");
    else if ((codes.get(p.code.trim().toUpperCase()) ?? 0) > 1) errs.push("Ürün kodu tekrarlı");
    if (!p.name.trim()) errs.push("Ürün adı boş");
    if (p.barcode.trim() && (barcodes.get(p.barcode.trim()) ?? 0) > 1) errs.push("Barkod çakışması");
    if (p.sell <= 0) errs.push("Satış fiyatı yok");
    if (errs.length) return { ...p, status: "Hatalı", note: errs.join(", ") };

    const checks: string[] = [];
    if (!p.pack || p.pack === "–") checks.push("Ambalaj bilgisi eksik");
    if (p.qty <= 0) checks.push("İçerik miktarı belirtilmemiş");
    if (!p.brand.trim()) checks.push("Marka eksik");
    if (checks.length) return { ...p, status: "Kontrol", note: checks.join(", ") };

    if (p.buy > 0 && p.sell < p.buy) return { ...p, status: "Öneri", note: "Satış fiyatı alıştan düşük" };
    return { ...p, status: "Hazır", note: "–" };
  });
}

const ALIASES: Record<string, keyof Product> = {
  "ürün kodu": "code", "urun kodu": "code", kod: "code", "stok kodu": "code", code: "code",
  "ürün adı": "name", "urun adi": "name", "stok adı": "name", ad: "name", name: "name", açıklama: "name",
  marka: "brand", brand: "brand",
  birim: "unit", unit: "unit",
  ambalaj: "pack", paket: "pack",
  "içerik miktarı": "qty", miktar: "qty", "içerik": "qty",
  "alış fiyatı": "buy", alış: "buy", "alis fiyati": "buy", maliyet: "buy",
  "satış fiyatı": "sell", satış: "sell", "satis fiyati": "sell", fiyat: "sell",
  kdv: "kdv", "kdv oranı": "kdv",
  barkod: "barcode", barcode: "barcode",
  kategori: "category",
  stok: "stock", "stok miktarı": "stock", "mevcut stok": "stock",
};

/** Maps spreadsheet header names to product fields. */
export function mapHeader(h: string): keyof Product | undefined {
  const k = h.toLowerCase().replace(/\(.*?\)/g, "").trim();
  return ALIASES[k];
}

export function rowsToProducts(records: Record<string, unknown>[]): Product[] {
  return records.map((r, i) => {
    const p: Product = {
      id: i + 1, code: "", name: "", brand: "", unit: "ADET", pack: "–", qty: 0, buy: 0, sell: 0,
      kdv: 20, barcode: "", category: "Diğer", stock: 0, minStock: 0, description: "", active: true,
    };
    for (const [h, v] of Object.entries(r)) {
      const f = mapHeader(h);
      if (!f) continue;
      if (f === "qty" || f === "buy" || f === "sell" || f === "kdv" || f === "stock") (p[f] as number) = parseNum(v);
      else if (f !== "id" && f !== "active" && f !== "minStock") (p[f] as string) = String(v ?? "").trim();
    }
    if (!p.pack) p.pack = "–";
    p.unit = p.unit.toUpperCase() || "ADET";
    return p;
  });
}
