import type { Paise } from "./money";
import type { Offer } from "./offer";
import type { Product } from "./product";

/** What the cart persists: only references and quantities, never prices. */
export interface CartItem {
  productId: string;
  quantity: number;
}

/** A cart item resolved against the catalog. */
export interface CartLine {
  product: Product;
  quantity: number;
  lineTotal: Paise;
}

export interface AppliedOffer {
  offer: Offer;
  amount: Paise;
}

export interface OfferHint {
  offer: Offer;
  /** Amount still needed in the eligible basket to unlock the offer. */
  remaining: Paise;
}

export interface PricingSummary {
  itemCount: number;
  subtotal: Paise;
  discount: Paise;
  appliedOffers: AppliedOffer[];
  deliveryFee: Paise;
  total: Paise;
}
