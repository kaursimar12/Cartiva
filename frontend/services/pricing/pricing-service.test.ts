import { describe, expect, it } from "vitest";
import pricingCases from "@/data/pricing-cases.json";
import type { CartItem } from "@/models/entities/cart";
import type { Offer } from "@/models/entities/offer";
import type { Product } from "@/models/entities/product";
import {
  deliveryFromJson,
  JsonOfferRepository,
  JsonProductRepository,
  type OfferJson,
  type ProductJson,
} from "@/models/repositories/json-catalog-repository";
import { defaultDiscountStrategies } from "./discount-strategies";
import { PricingService } from "./pricing-service";

const { fixture, cases } = pricingCases;

/** Fixture rows only carry the fields pricing needs; fill the rest with neutral defaults. */
const products = fixture.products.map(
  (p): ProductJson => ({
    name: p.id,
    description: "",
    unit: "1 pc",
    brand: null,
    stock: true,
    availableQuantity: 100,
    image: "",
    tags: [],
    featured: false,
    ...(p as Pick<Product, "id" | "category" | "price">),
  }),
);
const offers = fixture.offers.map(
  (o): OfferJson => ({ title: o.id, description: "", ...(o as Omit<Offer, "title" | "description">) }),
);

const pricing = new PricingService(
  new JsonProductRepository(products),
  new JsonOfferRepository(offers),
  defaultDiscountStrategies,
  deliveryFromJson(fixture.delivery),
);

describe("PricingService — shared golden cases (data/pricing-cases.json)", () => {
  it.each(cases)("$name", ({ items, expected }) => {
    const summary = pricing.calculate(items as CartItem[]);

    expect({
      subtotal: summary.subtotal,
      discount: summary.discount,
      deliveryFee: summary.deliveryFee,
      total: summary.total,
      appliedOfferIds: summary.appliedOffers.map((a) => a.offer.id),
    }).toEqual(expected);
  });
});

describe("PricingService — hints", () => {
  it("reports how much more is needed to unlock a started offer", () => {
    const hints = pricing.getOfferHints([{ productId: "tomato", quantity: 7 }]);
    expect(hints.map((h) => [h.offer.id, h.remaining])).toEqual([
      ["veg10", 2000],
      ["flat50", 71900],
    ]);
  });

  it("reports the amount left for free delivery, or null when it is already free", () => {
    expect(pricing.getFreeDeliveryRemaining([{ productId: "chips", quantity: 24 }])).toBe(1900);
    expect(pricing.getFreeDeliveryRemaining([{ productId: "milk", quantity: 10 }])).toBeNull();
    expect(pricing.getFreeDeliveryRemaining([])).toBeNull();
  });
});
