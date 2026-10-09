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
  lineTotal: number;
}

export interface AppliedOffer {
  offer: Offer;
  amount: number;
}

export interface OfferHint {
  offer: Offer;
  /** Rupees still needed in the eligible basket to unlock the offer. */
  remaining: number;
}

export interface PricingSummary {
  itemCount: number;
  subtotal: number;
  discount: number;
  appliedOffers: AppliedOffer[];
  deliveryFee: number;
  total: number;
}
