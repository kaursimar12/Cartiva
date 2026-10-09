import { describe, expect, it } from "vitest";
import { formatPrice, rupeesToPaise } from "./money";

describe("money", () => {
  it.each([
    [40, 4000],
    [49.9, 4990],
    [133.35, 13335],
    [249.75, 24975],
  ])("converts ₹%s to %s paise without float drift", (rupees, paise) => {
    expect(rupeesToPaise(rupees)).toBe(paise);
  });

  it.each([
    [0, "₹0"],
    [4000, "₹40"],
    [3450, "₹34.50"],
    [125000, "₹1,250"],
    [12345678, "₹1,23,456.78"],
  ])("formats %s paise as %s", (paise, text) => {
    expect(formatPrice(paise)).toBe(text);
  });
});
