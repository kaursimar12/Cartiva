import { describe, expect, it } from "vitest";
import { validateCatalog } from "@/models/repositories/catalog-validator";
import {
  JsonCategoryRepository,
  JsonDeliveryPolicyRepository,
  JsonOfferRepository,
  JsonProductRepository,
} from "@/models/repositories/json-catalog-repository";
import { BRANDS, DEFAULT_BRAND_ID } from ".";

const HEX = /^#[0-9a-f]{6}$/i;

/** Every storefront must ship a valid catalog and a complete, self-consistent brand.json. */
describe.each(Object.entries(BRANDS))("brand %s", (id, bundle) => {
  const { brand, categories } = bundle;
  const categoryIds = new Set(categories.map((c) => c.id));

  it("has a valid catalog", () => {
    expect(() =>
      validateCatalog(
        new JsonProductRepository(bundle.products),
        new JsonCategoryRepository(bundle.categories),
        new JsonOfferRepository(bundle.offers),
        new JsonDeliveryPolicyRepository(bundle.delivery),
      ),
    ).not.toThrow();
  });

  it("is registered under its own id", () => {
    expect(brand.id).toBe(id);
  });

  it("names the store and the assistant", () => {
    expect(brand.storeName.trim()).not.toBe("");
    expect(brand.wordmark.trim()).not.toBe("");
    expect(brand.assistant.name.trim()).not.toBe("");
    expect(brand.meta.title.trim()).not.toBe("");
  });

  it("points its featured aisle and whole-order image at real categories", () => {
    expect(categoryIds.has(brand.featuredAisle.categoryId)).toBe(true);
    expect(categoryIds.has(brand.wholeOrderImageCategory)).toBe(true);
  });

  it("has delivery areas, voice examples and search suggestions", () => {
    expect(brand.deliveryAreas.length).toBeGreaterThan(0);
    expect(brand.voiceExamples.length).toBeGreaterThan(0);
    expect(brand.search.suggestions.length).toBeGreaterThan(0);
  });

  it("uses hex colours for every palette step, when it has a palette", () => {
    if (!brand.palette) return;
    for (const scale of [brand.palette.light, brand.palette.dark]) {
      for (const hex of Object.values(scale)) expect(hex).toMatch(HEX);
    }
  });
});

describe("brand registry", () => {
  it("includes the default brand", () => {
    expect(BRANDS[DEFAULT_BRAND_ID]).toBeDefined();
  });
});
