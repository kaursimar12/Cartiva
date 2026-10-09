import type { PricingSummary } from "./cart";
import type { Paise } from "./money";

export interface OrderLine {
  productId: string;
  name: string;
  unit: string;
  price: Paise;
  quantity: number;
}

export interface Order {
  /** Order reference shown to the user (Razorpay order ID once payment is integrated). */
  id: string;
  paymentId: string;
  createdAt: string;
  lines: OrderLine[];
  pricing: Omit<PricingSummary, "appliedOffers"> & { offerTitles: string[] };
}
