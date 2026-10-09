import type { Paise } from "./money";

/** Delivery charge rule (data/delivery.json). Free when the subtotal reaches `freeAbove`. */
export interface DeliveryPolicy {
  fee: Paise;
  freeAbove: Paise;
}
