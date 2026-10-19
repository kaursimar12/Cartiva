import { catalogService } from "@/lib/container";
import { cartService } from "@/lib/client-container";
import { formatPrice } from "@/lib/format";
import { rupeesToPaise } from "@/models/entities/money";
import { cartController } from "@/controllers/cart-controller";
import type { Product } from "@/models/entities/product";
import { checkoutController } from "@/controllers/checkout-controller";
import { screenController } from "@/controllers/screen-controller";
import { shoppingListController } from "@/controllers/shopping-list-controller";
import { checkoutService, shoppingListService } from "@/lib/client-container";
import type { ListLine } from "@/models/entities/shopping-list";
import { useShoppingListStore } from "@/store/shopping-list-store";

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

  /** Opens a fixed page (e.g. "take me to the cart"). Checkout has its own flow (startCheckout). */
  openPage(input: { page?: unknown }, ui: VoiceUi) {
    const paths: Record<string, string> = { home: "/", cart: "/cart", "scan-list": "/scan-list" };
    const path = typeof input.page === "string" ? paths[input.page] : undefined;
    if (!path) return { ok: false, error: { code: "NOT_FOUND", message: "That page doesn't exist." } };

    ui.navigate(path);
    return { ok: true, shownOnScreen: true, page: input.page };
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

  /**
   * Points at products on screen: one the agent is talking about ("the cheapest is Vim"),
   * or several the shopper must choose between. Changes nothing; it only highlights.
   */
  highlightProducts(input: { productIds?: unknown; reason?: unknown }) {
    const wanted = Array.isArray(input.productIds) ? input.productIds.filter((id): id is string => typeof id === "string") : [];
    const productIds = wanted.filter((id) => catalogService.getProduct(id) !== undefined);
    if (productIds.length === 0) {
      return { ok: false, error: { code: "NOT_FOUND", message: "None of those products exist." } };
    }

    const onScreen = new Set(screenController.current().productIds);
    return {
      ok: true,
      productIds,
      reason: input.reason === "options" ? "options" : "spotlight",
      notOnScreen: productIds.filter((id) => !onScreen.has(id)), // the agent can open them first if needed
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

  // ---------- shopping list (scanned from a photo) ----------

  getShoppingList(ui: VoiceUi) {
    const { lines } = useShoppingListStore.getState();
    if (lines.length === 0) return NO_LIST;
    ui.navigate("/scan-list");
    return { ok: true, count: lines.length, lines: lines.map(toAgentListLine) };
  },

  removeListItem(input: { lineId?: unknown }) {
    const line = findLine(input.lineId);
    if (!line) return UNKNOWN_LINE;
    shoppingListController.remove(line.id);
    return { ok: true, message: `Removed "${line.original}" from the list.` };
  },

  addListItem(input: { name?: unknown; quantity?: unknown; unit?: unknown }, ui: VoiceUi) {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (!name) return { ok: false, error: { code: "INVALID_QUERY", message: "No item name was given." } };
    const quantity = typeof input.quantity === "number" && input.quantity > 0 ? input.quantity : null;
    const unit = typeof input.unit === "string" && input.unit.trim() ? input.unit.trim() : null;
    const line = shoppingListController.add(name, quantity, unit);
    ui.navigate("/scan-list");
    return { ok: true, line: toAgentListLine(line) };
  },

  updateListItem(input: { lineId?: unknown; packs?: unknown }) {
    const line = findLine(input.lineId);
    if (!line) return UNKNOWN_LINE;
    if (!line.productId || line.status !== "found") {
      return { ok: false, error: { code: "INVALID_QUANTITY", message: "That item has no product chosen yet." } };
    }
    if (typeof input.packs !== "number" || !Number.isInteger(input.packs) || input.packs < 1) {
      return { ok: false, error: { code: "INVALID_QUANTITY", message: "Quantity must be a whole number above zero." } };
    }
    shoppingListController.setPacks(line.id, input.packs);
    return { ok: true, line: toAgentListLine(findLine(line.id)!) };
  },

  chooseListItem(input: { lineId?: unknown; productId?: unknown }) {
    const { lines } = useShoppingListStore.getState();
    const choice = typeof input.productId === "string" ? input.productId : "";
    const match = shoppingListService.resolveChoice(lines, input.lineId, choice);
    if (!match) {
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Couldn't match that to one option. Call get_shopping_list and use the exact lineId and productId.",
        },
      };
    }
    shoppingListController.choose(match.line.id, match.productId);
    return { ok: true, line: toAgentListLine(findLine(match.line.id)!) };
  },

  /** Adds every ready line to the cart. The agent only calls it after the shopper agreed. */
  confirmShoppingList(ui: VoiceUi) {
    if (useShoppingListStore.getState().lines.length === 0) return NO_LIST;
    const result = shoppingListController.confirm();
    ui.navigate("/cart");
    return { ok: true, ...result };
  },
};

const NO_LIST = {
  ok: false,
  error: { code: "EMPTY_LIST", message: "No shopping list yet. The shopper can tap Scan list and upload a photo." },
};
const UNKNOWN_LINE = { ok: false, error: { code: "NOT_FOUND", message: "That item is not on the list." } };

function findLine(lineId: unknown): ListLine | undefined {
  return useShoppingListStore.getState().lines.find((line) => line.id === lineId);
}

/** A list line as the agent sees it (product details, never prices as raw paise). */
function toAgentListLine(line: ListLine) {
  const product = line.productId ? catalogService.getProduct(line.productId) : undefined;
  return {
    lineId: line.id,
    written: line.original,
    status: line.status,
    packs: line.packs,
    limited: line.limited,
    product: product ? toAgentProduct(product) : null,
    options:
      line.status === "choose"
        ? line.options
            .map((id) => catalogService.getProduct(id))
            .filter((p): p is Product => p !== undefined)
            .map(toAgentProduct)
        : [],
  };
}
