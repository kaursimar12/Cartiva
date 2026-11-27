import type { DeliveryPolicy } from "@/models/entities/delivery";
import { rupeesToPaise } from "@/models/entities/money";
import type { Offer } from "@/models/entities/offer";
import type { Category, Product } from "@/models/entities/product";
import type { CategoryRepository, DeliveryPolicyRepository, OfferRepository, ProductRepository } from "./interfaces";

/** JSON stores money in rupees; the domain uses paise. These are the only conversion points. */
export type ProductJson = Product;
/** `productIds` may be left out in JSON for category and whole-cart offers. */
export type OfferJson = Omit<Offer, "productIds"> & { productIds?: string[] | null };
export type DeliveryJson = DeliveryPolicy;

export function productFromJson(raw: ProductJson): Product {
  return { ...raw, price: rupeesToPaise(raw.price) };
}

export function offerFromJson(raw: OfferJson): Offer {
  return {
    ...raw,
    productIds: raw.productIds ?? null,
    minimumAmount: rupeesToPaise(raw.minimumAmount),
    discountValue: raw.discountType === "flat" ? rupeesToPaise(raw.discountValue) : raw.discountValue,
  };
}

export function deliveryFromJson(raw: DeliveryJson): DeliveryPolicy {
  return { fee: rupeesToPaise(raw.fee), freeAbove: rupeesToPaise(raw.freeAbove) };
}

export class JsonProductRepository implements ProductRepository {
  private readonly products: Product[];
  private readonly byId: Map<string, Product>;

  constructor(raw: ProductJson[]) {
    this.products = raw.map(productFromJson);
    this.byId = new Map(this.products.map((p) => [p.id, p]));
  }

  findAll(): Product[] {
    return this.products;
  }

  findById(id: string): Product | undefined {
    return this.byId.get(id);
  }
}

export class JsonCategoryRepository implements CategoryRepository {
  private readonly byId: Map<string, Category>;

  constructor(private readonly categories: Category[]) {
    this.byId = new Map(categories.map((c) => [c.id, c]));
  }

  findAll(): Category[] {
    return this.categories;
  }

  findById(id: string): Category | undefined {
    return this.byId.get(id);
  }
}

export class JsonOfferRepository implements OfferRepository {
  private readonly offers: Offer[];

  constructor(raw: OfferJson[]) {
    this.offers = raw.map(offerFromJson);
  }

  findAll(): Offer[] {
    return this.offers;
  }

  findActive(): Offer[] {
    return this.offers.filter((o) => o.active);
  }
}

export class JsonDeliveryPolicyRepository implements DeliveryPolicyRepository {
  private readonly policy: DeliveryPolicy;

  constructor(raw: DeliveryJson) {
    this.policy = deliveryFromJson(raw);
  }

  get(): DeliveryPolicy {
    return this.policy;
  }
}
