import { catalogService } from "@/lib/container";
import { cartService } from "@/lib/client-container";
import { formatPrice } from "@/lib/format";
import { rupeesToPaise } from "@/models/entities/money";
import { cartController } from "@/controllers/cart-controller";
import type { Product } from "@/models/entities/product";
import { checkoutController } from "@/controllers/checkout-controller";
import { screenController } from "@/controllers/screen-controller";
import { checkoutService } from "@/lib/client-container";

/** What the voice controller may ask the screen to do (implemented with the Next.js router). */
export interface VoiceUi {
  navigate(url: string): void;
  /** Sends a message to the voice agent (browser → agent RPC). */
  notifyAgent(method: string, payload: unknown): void;
}

/** How many products we describe to the agent; the screen still shows all of them. */
const MAX_RESULTS_FOR_AGENT = 8;

/** How many on-screen products we describe to the agent (a page can show many more). */
const MAX_SCREEN_PRODUCTS_FOR_AGENT = 20;

/** Accepts a rupee amount only if it is a real, non-negative number. */
function rupees(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

/** The product fields the agent needs, with the price already formatted. */
function toAgentProduct(p: Product) {
  return {
    productId: p.id,
    name: p.name,
    brand: p.brand,
    unit: p.unit,
    price: formatPrice(p.price),
    priceRupees: p.price / 100, // a plain number, so "cheapest" is a reliable comparison
    inStock: p.stock,
  };
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
            products: results.slice(0, MAX_RESULTS_FOR_AGENT).map(toAgentProduct),
    };
  },
    /** Adds a product to the cart, exactly like pressing its ADD button (same rules, same toast). */
  addToCart(input: { productId?: unknown; quantity?: unknown }) {
    const productId = typeof input.productId === "string" ? input.productId : "";
    const quantity = input.quantity ?? 1;
    if (typeof quantity !== "number") {
      return { ok: false, error: { code: "INVALID_QUANTITY", message: "Quantity must be a whole number above zero." } };
    }

    const result = cartController.add(productId, quantity);
    return result.ok
      ? { ok: true, message: result.message, quantityInCart: result.data.quantity }
      : { ok: false, error: result.error };
  },
    /** Removes a product from the cart, exactly like pressing its bin button. */
  removeFromCart(input: { productId?: unknown }) {
    const productId = typeof input.productId === "string" ? input.productId : "";
    const result = cartController.remove(productId);
    return result.ok ? { ok: true, message: result.message } : { ok: false, error: result.error };
  },

  /** Sets an exact quantity for a product already in the cart. 0 removes it. */
  updateCartQuantity(input: { productId?: unknown; quantity?: unknown }) {
    const productId = typeof input.productId === "string" ? input.productId : "";
    if (typeof input.quantity !== "number") {
      return { ok: false, error: { code: "INVALID_QUANTITY", message: "Quantity must be a whole number." } };
    }

    const result = cartController.updateQuantity(productId, input.quantity);
    return result.ok
      ? { ok: true, message: result.message, quantityInCart: result.data.quantity }
      : { ok: false, error: result.error };
  },
    /** Opens a category page (e.g. "go to fruits") and returns the products shown there. */
  openCategory(input: { category?: unknown }, ui: VoiceUi) {
    const wanted = typeof input.category === "string" ? input.category.trim().toLowerCase() : "";
    const category = catalogService
      .getCategories()
      .find((c) => c.id === wanted || c.name.toLowerCase() === wanted);
    if (!category) {
      return { ok: false, error: { code: "NOT_FOUND", message: "That category doesn't exist." } };
    }

    ui.navigate(`/category/${category.id}`);
    const products = catalogService.getProductsByCategory(category.id);
    return {
      ok: true,
      shownOnScreen: true,
      category: category.name,
      count: products.length,
      products: products.slice(0, MAX_RESULTS_FOR_AGENT).map(toAgentProduct),
    };
  },

  /** Opens one product's detail page (e.g. "show me that one"). */
  openProduct(input: { productId?: unknown }, ui: VoiceUi) {
    const product = typeof input.productId === "string" ? catalogService.getProduct(input.productId) : undefined;
    if (!product) {
      return { ok: false, error: { code: "NOT_FOUND", message: "That product couldn't be found." } };
    }

    ui.navigate(`/product/${product.id}`);
    return { ok: true, shownOnScreen: true, product: { ...toAgentProduct(product), description: product.description } };
  },

  /** What the shopper sees right now: the page and its products in on-screen order. */
  getScreen() {
    const screen = screenController.current();
    const products = screen.productIds
      .map((id) => catalogService.getProduct(id))
      .filter((p): p is Product => p !== undefined);

    return {
      ok: true,
      page: screen.path,
      title: screen.title,
      productCount: products.length,
      products: products
        .slice(0, MAX_SCREEN_PRODUCTS_FOR_AGENT)
        .map((p, index) => ({ position: index + 1, ...toAgentProduct(p) })),
    };
  },

  /** Voice checkout step 1: checks the cart and opens the checkout page. Never takes payment. */
  startCheckout(ui: VoiceUi) {
    const result = checkoutService.validate();
    if (!result.ok) return { ok: false, error: result.error };

    ui.navigate("/checkout");
    return {
      ok: true,
      itemCount: result.data.itemCount,
      total: formatPrice(result.data.total),
      message: result.message,
    };
  },

  /**
   * Voice checkout step 2 (the agent only calls it after an explicit "yes").
   * Opens the payment exactly like the Pay button, but doesn't wait: entering card details takes
   * longer than an RPC may. The result is sent to the agent afterwards as "payment.result".
   */
  confirmPayment(ui: VoiceUi) {
    ui.navigate("/checkout"); // the shopper sees the payment status there
    void checkoutController.confirmAndPay({ simulateFailure: false }).then((result) =>
      ui.notifyAgent(
        "payment.result",
        result.ok
          ? { ok: true, orderId: result.data.id, total: formatPrice(result.data.pricing.total) }
          : { ok: false, reason: result.error.message },
      ),
    );

    return {
      ok: true,
      paymentWindowOpen: true,
      message: "The payment window is open. The shopper completes the payment on screen; you will be told the result.",
    };
  },

};
