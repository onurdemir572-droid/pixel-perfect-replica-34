import { describe, expect, it } from "vitest";
import { autoMapping, missingRequired, parseNum, validate, type Product } from "./stock-import";

const base: Product = {
  id: 1, code: "A-1", name: "Çimento", brand: "Çimsa", unit: "KG", pack: "Torba", qty: 50, buy: 100,
  sell: 120, kdv: 20, barcode: "", category: "Diğer", stock: 0, minStock: 0, description: "", active: true,
};

describe("stock import validation", () => {
  it("complete row is ready", () => expect(validate([base])[0]!.status).toBe("Hazır"));
  it("duplicate barcode is an error", () => {
    const r = validate([{ ...base, barcode: "869" }, { ...base, id: 2, code: "A-2", barcode: "869" }]);
    expect(r[0]!.status).toBe("Hatalı");
  });
  it("duplicate code is an error", () =>
    expect(validate([base, { ...base, id: 2 }])[1]!.status).toBe("Hatalı"));
  it("missing package needs check", () => expect(validate([{ ...base, pack: "–" }])[0]!.status).toBe("Kontrol"));
  it("sell below buy is a suggestion", () => expect(validate([{ ...base, sell: 90 }])[0]!.status).toBe("Öneri"));
  it("auto maps headers and reports missing required", () => {
    const m = autoMapping(["Stok Kodu", "Ürün Adı", "Fiyat"]);
    expect(m["Stok Kodu"]).toBe("code");
    expect(missingRequired(m)).toEqual(["unit"]);
  });
  it("parses Turkish numbers", () => expect(parseNum("1.250,50")).toBe(1250.5));
});
