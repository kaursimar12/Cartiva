import type { Paise } from "./money";
import type { CategoryId, Product } from "./product";

export type DiscountType = "percentage" | "flat";

export interface Offer {
  id: string;
  title: string;
  description: string;
  /** Category the offer applies to; null means the whole cart. */
  category: CategoryId | null;
  /**
   * Products the offer is limited to (a "deal", e.g. 20% off Carrot); null means every product in
   * its scope (the category, or the whole cart). Deals stack with category and whole-cart offers.
   */
  productIds: string[] | null;
  /** Minimum eligible amount (subtotal of the products the offer covers). */
  minimumAmount: Paise;
  discountType: DiscountType;
  /** Percent for "percentage"; paise for "flat" (JSON stores rupees). */
  discountValue: number;
  active: boolean;
}

/** True for a product-level deal (limited to specific products) rather than a category or cart-wide offer. */
export function isDeal(offer: Offer): boolean {
  return offer.productIds !== null;
}

/** Whether a product counts toward this offer: inside its category (if any) and its product list (if any). */
export function offerCovers(offer: Offer, product: Pick<Product, "id" | "category">): boolean {
  if (offer.category !== null && offer.category !== product.category) return false;
  return offer.productIds === null || offer.productIds.includes(product.id);
}
