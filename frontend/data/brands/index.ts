import type { Brand } from "@/models/entities/brand";
import type { DeliveryJson, OfferJson, ProductJson } from "@/models/repositories/json-catalog-repository";
import type { Category } from "@/models/entities/product";
import cartivaBrand from "./cartiva/brand.json";
import cartivaCategories from "./cartiva/categories.json";
import cartivaDelivery from "./cartiva/delivery.json";
import cartivaOffers from "./cartiva/offers.json";
import cartivaProducts from "./cartiva/products.json";

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
};

export const DEFAULT_BRAND_ID = "cartiva";
