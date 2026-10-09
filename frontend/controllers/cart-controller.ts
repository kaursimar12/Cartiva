import { cartService } from "@/lib/client-container";
import { showToast } from "@/store/toast-store";
import type { ActionResult } from "@/types/action";

/**
 * UI entry points for cart events. Delegates rules to CartService and maps results
 * to user feedback. The voice RPC handlers (Phase 7) will call CartService the same way.
 */
function notify<T>(result: ActionResult<T>, announceSuccess: boolean): ActionResult<T> {
  if (!result.ok) showToast(result.error.message, "error");
  else if (announceSuccess) showToast(result.message, "success");
  return result;
}

export const cartController = {
  add: (productId: string, quantity = 1) => notify(cartService.add(productId, quantity), true),
  increase: (productId: string) => notify(cartService.increase(productId), false),
  decrease: (productId: string) => notify(cartService.decrease(productId), false),
  updateQuantity: (productId: string, quantity: number) => notify(cartService.updateQuantity(productId, quantity), false),
  remove: (productId: string) => notify(cartService.remove(productId), true),
  clear: () => notify(cartService.clear(), true),
};
