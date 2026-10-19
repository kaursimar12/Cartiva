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

  it("works out a fair price per kg, litre or piece", () => {
    const product = (id: string) => catalogService.getProduct(id)!;
    expect(catalogService.unitPrice(product("p002"))).toEqual({ amount: 24000, per: "kg" }); // 250 g at ₹60
    expect(catalogService.unitPrice(product("p045"))?.per).toBe("L"); // Vim 250 ml
    expect(catalogService.unitPrice(product("p012"))?.per).toBe("pc"); // bananas, 1 dozen
    expect(catalogService.unitPrice(product("p001"))).toBeNull(); // 1 kg: same as the price
  });

  it("suggests in-stock products from the cart's aisles, never what's already in it", () => {
    const suggestions = catalogService.getSuggestions(["p001", "p004"], 6);
    expect(suggestions.length).toBe(6);
    expect(suggestions.some((p) => p.id === "p001" || p.id === "p004")).toBe(false);
    expect(suggestions.every((p) => p.stock)).toBe(true);
    expect(suggestions[0].category).toBe("vegetables");
  });

  it("lists the offers a product counts toward, never inactive ones", () => {
    const offers = catalogService.getOffersFor(catalogService.getProduct("p001")!); // tomato
    expect(offers.map((o) => o.id).sort()).toEqual(["offer001", "offer003"]);
    const fruit = catalogService.getOffersFor(catalogService.getProduct("p013")!);
    expect(fruit.some((o) => o.id === "offer004")).toBe(false); // fruits offer is inactive
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

  it("knows how many more units fit in the cart", () => {
    const product = { ...catalogService.getAllProducts()[0], stock: true, availableQuantity: 5 };
    expect(catalogService.remainingStock(product, 2)).toBe(3);
    expect(catalogService.remainingStock(product, 7)).toBe(0);
    expect(catalogService.remainingStock({ ...product, stock: false }, 0)).toBe(0);
  });

  it("explains why a cart quantity can't be bought", () => {
    const product = { ...catalogService.getAllProducts()[0], stock: true, availableQuantity: 5 };
    expect(catalogService.cartQuantityProblem(product, 5)).toBeNull();
    expect(catalogService.cartQuantityProblem(product, 6)).toBe("Only 5 available");
    expect(catalogService.cartQuantityProblem({ ...product, stock: false }, 1)).toBe("Out of stock — please remove");
  });
});
