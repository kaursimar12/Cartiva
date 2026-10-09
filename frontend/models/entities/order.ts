import type { PricingSummary } from "./cart";

export interface OrderLine {
  productId: string;
  name: string;
  unit: string;
  price: number;
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
