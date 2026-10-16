import { checkoutService } from "@/lib/client-container";
import type { CartItem } from "@/models/entities/cart";
import type { Order } from "@/models/entities/order";
import { type PaymentStatus, useCheckoutStore } from "@/store/checkout-store";
import type { ActionResult } from "@/types/action";

function setStatus(status: PaymentStatus) {
  useCheckoutStore.setState({ status });
}

/** UI entry points for checkout. Confirmation is the caller's job (button or voice); this only runs after it. */
export const checkoutController = {
  validate: (items: CartItem[]) => checkoutService.validate(items),

  /** Pays once. Clicks and voice both use this, and it keeps the shared payment status up to date. */
  async confirmAndPay(options: { simulateFailure: boolean }): Promise<ActionResult<Order>> {
    if (useCheckoutStore.getState().status.name === "processing") {
      return { ok: false, error: { code: "PAYMENT_FAILED", message: "A payment is already in progress." } };
    }

    setStatus({ name: "processing" });
    const result = await checkoutService.pay(options);
    setStatus(result.ok ? { name: "success" } : { name: "failed", reason: result.error.message });
    return result;
  },

  /** Back to "no payment in progress" (Retry, or leaving the checkout page). */
  resetPayment: () => setStatus({ name: "idle" }),
};
