import { describe, expect, it } from "vitest";
import { catalogService } from "@/lib/container";
import { rupeesToPaise } from "@/models/entities/money";

/** Runs against the real catalog, so it also guards the voice demo scenarios. */
describe("CatalogService (real catalog)", () => {
  it("loads and validates the catalog", () => {
    expect(catalogService.getAllProducts().length).toBeGreaterThan(50);
  });

  it("matches partial names and plurals", () => {
    expect(catalogService.search("tomatoes").some((p) => p.name.toLowerCase().includes("tomato"))).toBe(true);
    expect(catalogService.search("tom").length).toBeGreaterThan(0);
  });

  it("returns nothing for an unknown query", () => {
    expect(catalogService.search("xyzzy")).toEqual([]);
  });

  it("filters dishwashing liquids under ₹200 (demo scenario 3)", () => {
    const results = catalogService.filter({ query: "dishwashing liquid", maxPrice: rupeesToPaise(200) });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((p) => p.price <= 20000)).toBe(true);
  });

  it("filters by availability", () => {
    expect(catalogService.filter({ available: true }).every((p) => p.stock)).toBe(true);
  });

  it("classifies stock status", () => {
    const product = catalogService.getAllProducts()[0];
    expect(catalogService.getStockStatus({ ...product, stock: false, availableQuantity: 0 })).toBe("out-of-stock");
    expect(catalogService.getStockStatus({ ...product, stock: true, availableQuantity: 3 })).toBe("low-stock");
    expect(catalogService.getStockStatus({ ...product, stock: true, availableQuantity: 4 })).toBe("in-stock");
  });
});
