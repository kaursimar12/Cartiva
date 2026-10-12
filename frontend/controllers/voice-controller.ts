import { cartService } from "@/lib/client-container";
import { formatPrice } from "@/lib/format";

/**
 * Entry points for the voice agent (called through LiveKit RPC).
 * Uses the same services as the buttons, and returns plain JSON the agent can read aloud.
 */
export const voiceController = {
  getCart() {
    const result = cartService.getCart();
    if (!result.ok) return { ok: false, error: result.error };

    const { lines, pricing } = result.data;
    return {
      ok: true,
      message: result.message,
      items: lines.map(({ product, quantity, lineTotal }) => ({
        productId: product.id,
        name: product.name,
        unit: product.unit,
        quantity,
        lineTotal: formatPrice(lineTotal),
      })),
      subtotal: formatPrice(pricing.subtotal),
      discount: formatPrice(pricing.discount),
      deliveryFee: formatPrice(pricing.deliveryFee),
      total: formatPrice(pricing.total),
    };
  },
};
