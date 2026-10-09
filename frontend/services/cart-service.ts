import type { CartItem, CartLine, PricingSummary } from "@/models/entities/cart";
import type { CartStorage, ProductRepository } from "@/models/repositories/interfaces";
import type { ActionResult } from "@/types/action";
import type { PricingService } from "./pricing/pricing-service";

const INVALID_QUANTITY = {
  ok: false,
  error: { code: "INVALID_QUANTITY", message: "Quantity must be a whole number above zero." },
} as const;

/**
 * Cart business rules (SRS FR-07, FR-18). The only writer of cart state.
 * The manual UI and the voice agent both reach the cart through this service.
 */
export class CartService {
  constructor(
    private readonly products: ProductRepository,
    private readonly storage: CartStorage,
    private readonly pricing: PricingService,
  ) {}

  quantityOf(productId: string): number {
    return this.storage.getItems().find((i) => i.productId === productId)?.quantity ?? 0;
  }

  add(productId: string, quantity = 1): ActionResult<CartItem> {
    if (!isValidQuantity(quantity)) return INVALID_QUANTITY;
    const product = this.products.findById(productId);
    if (!product) return { ok: false, error: { code: "NOT_FOUND", message: "That product couldn't be found." } };
    if (!product.stock) {
      return { ok: false, error: { code: "OUT_OF_STOCK", message: `${product.name} is currently out of stock.` } };
    }

    const current = this.quantityOf(productId);
    const canAdd = product.availableQuantity - current;
    if (quantity > canAdd) {
      const message =
        canAdd === 0
          ? `You already have all ${product.availableQuantity} available ${product.name} (${product.unit}) in your cart.`
          : `Only ${canAdd} more ${product.name} (${product.unit}) available.`;
      return { ok: false, error: { code: "PARTIAL_STOCK", message, available: canAdd } };
    }

    const next = current + quantity;
    const items = this.storage.getItems();
    this.storage.setItems(
      current === 0
        ? [...items, { productId, quantity: next }]
        : items.map((i) => (i.productId === productId ? { ...i, quantity: next } : i)),
    );
    return {
      ok: true,
      data: { productId, quantity: next },
      message: `Added ${quantity} × ${product.name} (${product.unit}) to your cart.`,
    };
  }

  remove(productId: string): ActionResult<{ productId: string }> {
    if (this.quantityOf(productId) === 0) {
      return { ok: false, error: { code: "NOT_IN_CART", message: "That item isn't in your cart." } };
    }
    const name = this.products.findById(productId)?.name ?? "the item";
    this.storage.setItems(this.storage.getItems().filter((i) => i.productId !== productId));
    return { ok: true, data: { productId }, message: `Removed ${name} from your cart.` };
  }

  /** Sets an exact quantity. Zero removes the item. */
  updateQuantity(productId: string, quantity: number): ActionResult<CartItem> {
    if (quantity === 0) {
      const removed = this.remove(productId);
      return removed.ok ? { ok: true, data: { productId, quantity: 0 }, message: removed.message } : removed;
    }
    if (!isValidQuantity(quantity)) return INVALID_QUANTITY;
    const product = this.products.findById(productId);
    if (!product) return { ok: false, error: { code: "NOT_FOUND", message: "That product couldn't be found." } };
    if (this.quantityOf(productId) === 0) {
      return { ok: false, error: { code: "NOT_IN_CART", message: `${product.name} isn't in your cart.` } };
    }
    if (quantity > product.availableQuantity) {
      return {
        ok: false,
        error: {
          code: "PARTIAL_STOCK",
          message: `Only ${product.availableQuantity} ${product.name} (${product.unit}) available.`,
          available: product.availableQuantity,
        },
      };
    }

    this.storage.setItems(this.storage.getItems().map((i) => (i.productId === productId ? { ...i, quantity } : i)));
    return { ok: true, data: { productId, quantity }, message: `Updated ${product.name} to ${quantity}.` };
  }

  increase(productId: string): ActionResult<CartItem> {
    return this.add(productId, 1);
  }

  /**
   * Steps down by one. Always allowed: if stock dropped below the cart quantity,
   * it snaps down to what is available (0 removes the item).
   */
  decrease(productId: string): ActionResult<CartItem> {
    const current = this.quantityOf(productId);
    const available = this.products.findById(productId)?.availableQuantity ?? 0;
    return this.updateQuantity(productId, Math.max(0, Math.min(current - 1, available)));
  }

  clear(): ActionResult<null> {
    this.storage.setItems([]);
    return { ok: true, data: null, message: "Your cart is now empty." };
  }

  getCart(): ActionResult<{ lines: CartLine[]; pricing: PricingSummary }> {
    const items = this.storage.getItems();
    const lines = this.pricing.getLines(items);
    const pricing = this.pricing.calculate(items);
    const message =
      lines.length === 0
        ? "Your cart is empty."
        : `You have ${pricing.itemCount} item${pricing.itemCount === 1 ? "" : "s"} in your cart.`;
    return { ok: true, data: { lines, pricing }, message };
  }
}

function isValidQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity > 0;
}
