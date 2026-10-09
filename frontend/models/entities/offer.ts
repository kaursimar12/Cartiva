import type { Paise } from "./money";
import type { CategoryId } from "./product";

export type DiscountType = "percentage" | "flat";

export interface Offer {
  id: string;
  title: string;
  description: string;
  /** Category the offer applies to; null means the whole cart. */
  category: CategoryId | null;
  /** Minimum eligible amount (category subtotal, or cart subtotal when category is null). */
  minimumAmount: Paise;
  discountType: DiscountType;
  /** Percent for "percentage"; paise for "flat" (JSON stores rupees). */
  discountValue: number;
  active: boolean;
}
