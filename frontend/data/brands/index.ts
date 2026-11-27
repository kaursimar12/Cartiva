import type { Brand } from "@/models/entities/brand";
import type { DeliveryJson, OfferJson, ProductJson } from "@/models/repositories/json-catalog-repository";
import type { Category } from "@/models/entities/product";
import cartivaBrand from "./cartiva/brand.json";
import cartivaCategories from "./cartiva/categories.json";
import cartivaDelivery from "./cartiva/delivery.json";
import cartivaOffers from "./cartiva/offers.json";
import cartivaProducts from "./cartiva/products.json";
import cocaColaBrand from "./coca-cola/brand.json";
import cocaColaCategories from "./coca-cola/categories.json";
import cocaColaDelivery from "./coca-cola/delivery.json";
import cocaColaOffers from "./coca-cola/offers.json";
import cocaColaProducts from "./coca-cola/products.json";
import pepsicoBrand from "./pepsico/brand.json";
import pepsicoCategories from "./pepsico/categories.json";
import pepsicoDelivery from "./pepsico/delivery.json";
import pepsicoOffers from "./pepsico/offers.json";
import pepsicoProducts from "./pepsico/products.json";

/** One storefront's data: its brand settings and its catalog (all in data/brands/<id>/). */
export interface BrandBundle {
  brand: Brand;
  products: ProductJson[];
  categories: Category[];
  offers: OfferJson[];
  delivery: DeliveryJson;
}

/**
 * Every storefront this codebase can build. Imported statically (the JSON is small), and the
 * deployment picks one with NEXT_PUBLIC_BRAND (lib/brand.ts). Add a brand: add a folder + an entry here.
 */
export const BRANDS: Record<string, BrandBundle> = {
  cartiva: {
    brand: cartivaBrand as Brand,
    products: cartivaProducts as ProductJson[],
    categories: cartivaCategories as Category[],
    offers: cartivaOffers as OfferJson[],
    delivery: cartivaDelivery as DeliveryJson,
  },
  "coca-cola": {
    brand: cocaColaBrand as Brand,
    products: cocaColaProducts as ProductJson[],
    categories: cocaColaCategories as Category[],
    offers: cocaColaOffers as OfferJson[],
    delivery: cocaColaDelivery as DeliveryJson,
  },
  pepsico: {
    brand: pepsicoBrand as Brand,
    products: pepsicoProducts as ProductJson[],
    categories: pepsicoCategories as Category[],
    offers: pepsicoOffers as OfferJson[],
    delivery: pepsicoDelivery as DeliveryJson,
  },
};

export const DEFAULT_BRAND_ID = "cartiva";
