import { checkoutService } from "@/lib/client-container";
import type { CartItem } from "@/models/entities/cart";

/** UI entry points for checkout. Confirmation is the view's job; this only runs after it. */
export const checkoutController = {
  validate: (items: CartItem[]) => checkoutService.validate(items),
  confirmAndPay: (options: { simulateFailure: boolean }) => checkoutService.pay(options),
};
