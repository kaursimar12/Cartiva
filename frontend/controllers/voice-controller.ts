import { catalogService } from "@/lib/container";
import { cartService } from "@/lib/client-container";
import { formatPrice } from "@/lib/format";
import { rupeesToPaise } from "@/models/entities/money";

/** What the voice controller may ask the screen to do (implemented with the Next.js router). */
export interface VoiceUi {
  navigate(url: string): void;
}

/** How many products we describe to the agent; the screen still shows all of them. */
const MAX_RESULTS_FOR_AGENT = 8;

/** Accepts a rupee amount only if it is a real, non-negative number. */
function rupees(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

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

  /** Searches the catalog, shows the results on screen, and returns the same results. */
  searchProducts(input: { query?: unknown; minPrice?: unknown; maxPrice?: unknown }, ui: VoiceUi) {
    const query = typeof input.query === "string" ? input.query.trim() : "";
    if (!query) {
      return { ok: false, error: { code: "INVALID_QUERY", message: "No search words were given." } };
    }

    const minRupees = rupees(input.minPrice);
    const maxRupees = rupees(input.maxPrice);
    const results = catalogService.filter({
      query,
      minPrice: minRupees === undefined ? undefined : rupeesToPaise(minRupees),
      maxPrice: maxRupees === undefined ? undefined : rupeesToPaise(maxRupees),
    });

    // Show the same results on screen (the search page runs the same filter).
    const params = new URLSearchParams({ q: query });
    if (minRupees !== undefined) params.set("min", String(minRupees));
    if (maxRupees !== undefined) params.set("max", String(maxRupees));
    ui.navigate(`/search?${params}`);

    return {
      ok: true,
      count: results.length,
      shownOnScreen: true,
      products: results.slice(0, MAX_RESULTS_FOR_AGENT).map((p) => ({
        productId: p.id,
        name: p.name,
        brand: p.brand,
        unit: p.unit,
        price: formatPrice(p.price),
        inStock: p.stock,
      })),
    };
  },
};
