import type { CategoryId } from "./product";

export type DiscountType = "percentage" | "flat";

export interface Offer {
  id: string;
  title: string;
  description: string;
  /** Category the offer applies to; null means the whole cart. */
  category: CategoryId | null;
  /** Minimum eligible amount (category subtotal, or cart subtotal when category is null). */
  minimumAmount: number;
  discountType: DiscountType;
  /** Percent for "percentage", rupees for "flat". */
  discountValue: number;
  active: boolean;
}
