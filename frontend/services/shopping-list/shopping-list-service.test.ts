import { describe, expect, it } from "vitest";
import { catalogService } from "@/lib/container";
import { ShoppingListService } from "./shopping-list-service";
import { packsNeeded, parsePack } from "./units";

const service = new ShoppingListService(catalogService);
const line = (name: string, quantity: number | null = null, unit: string | null = null) =>
  service.toLine({ name, quantity, unit, original: name }, "t");

describe("units", () => {
  it.each([
    ["1 kg", 1000],
    ["500 g", 500],
    ["1.5 L", 1500],
    ["4 x 250 g", 1000],
    ["1 dozen", 12],
  ])("parses %s", (unit, value) => {
    expect(parsePack(unit)?.value).toBe(value);
  });

  it.each([
    [2, "kg", "1 kg", 2],
    [200, "g", "100 g", 2],
    [300, "g", "250 g", 2],
    [500, "ml", "1 L", 1],
    [2, "dozen", "1 dozen", 2],
    [3, null, "52 g", 3],
    [null, null, "1 kg", 1],
    [2, "packets", "52 g", 2],
  ])("%s %s of a %s pack = %s packs", (quantity, unit, pack, packs) => {
    expect(packsNeeded(quantity, unit, pack)).toBe(packs);
  });
});

describe("ShoppingListService (real catalog)", () => {
  it("picks the plain product and converts kg to packs", () => {
    expect(line("tomato", 2, "kg")).toMatchObject({ status: "found", productId: "p001", packs: 2 });
  });

  it("asks when several products match", () => {
    const surf = line("Surf Excel");
    expect(surf.status).toBe("choose");
    expect(surf.options.length).toBeGreaterThan(1);
  });

  it("uses the pack size written to pick one", () => {
    expect(line("Surf Excel", 2, "kg")).toMatchObject({ status: "found", productId: "p055" });
  });

  it("keeps milk in dairy (not chocolate)", () => {
    const milk = line("milk", 1, "L");
    for (const id of milk.options) expect(catalogService.getProduct(id)?.category).toBe("dairy");
  });

  it("marks products we don't sell as not found", () => {
    expect(line("pizza").status).toBe("not-found");
  });

  it("matches a pack size exactly (200 g of a 200 g pack = 1)", () => {
    expect(line("paneer", 200, "g")).toMatchObject({ status: "found", productId: "p023", packs: 1 });
  });

  it("limits packs to what is in stock", () => {
    expect(line("Surf Excel Easy Wash", 5, "kg")).toMatchObject({ status: "found", packs: 2, limited: true });
  });

  it("lets the shopper choose an option", () => {
    const chosen = service.choose(line("Surf Excel"), "p054");
    expect(chosen).toMatchObject({ status: "found", productId: "p054", packs: 1 });
  });
});
