import type { CartItem, PricingSummary } from "@/models/entities/cart";
import { formatPrice } from "@/models/entities/money";
import type { Order } from "@/models/entities/order";
import type { CartStorage, OrderStorage } from "@/models/repositories/interfaces";
import type { ActionResult } from "@/types/action";
import type { PaymentGateway } from "./payment/payment-gateway";
import type { PricingService } from "./pricing/pricing-service";

/** Checkout validation (FR-22) and payment → order flow (FR-25 – FR-27). */
export class CheckoutService {
  constructor(
    private readonly cart: CartStorage,
    private readonly pricing: PricingService,
    private readonly payments: PaymentGateway,
    private readonly orders: OrderStorage,
  ) {}

  validate(items: CartItem[] = this.cart.getItems()): ActionResult<PricingSummary> {
    const lines = this.pricing.getLines(items);
    if (lines.length === 0) {
      return { ok: false, error: { code: "EMPTY_CART", message: "Your cart is empty. Add some items before checking out." } };
    }

    for (const { product, quantity } of lines) {
      if (!product.stock) {
        return { ok: false, error: { code: "OUT_OF_STOCK", message: `${product.name} is out of stock. Please remove it to continue.` } };
      }
      if (!Number.isInteger(quantity) || quantity < 1) {
        return { ok: false, error: { code: "INVALID_QUANTITY", message: `${product.name} has an invalid quantity.` } };
      }
      if (quantity > product.availableQuantity) {
        return {
          ok: false,
          error: {
            code: "PARTIAL_STOCK",
            message: `Only ${product.availableQuantity} ${product.name} available. Please update the quantity.`,
            available: product.availableQuantity,
          },
        };
      }
    }

    const pricing = this.pricing.calculate(items);
    return { ok: true, data: pricing, message: `Your total is ${formatPrice(pricing.total)}. Would you like to proceed to payment?` };
  }

  /**
   * Call only after explicit user confirmation (FR-23).
   * Re-validates, charges, and clears the cart only on a successful payment.
   */
  async pay(options: { simulateFailure?: boolean } = {}): Promise<ActionResult<Order>> {
    const items = this.cart.getItems();
    const validation = this.validate(items);
    if (!validation.ok) return validation;

    const pricing = validation.data;
    const result = await this.payments.pay({ amount: pricing.total, simulateFailure: options.simulateFailure });
    if (!result.ok) return { ok: false, error: { code: "PAYMENT_FAILED", message: result.reason } };

    const order = this.buildOrder(items, pricing, result.orderId, result.paymentId);
    this.orders.save(order);
    this.cart.setItems([]);
    return { ok: true, data: order, message: "Your payment was successful and your order has been placed." };
  }

  private buildOrder(items: CartItem[], pricing: PricingSummary, orderId: string, paymentId: string): Order {
    const { appliedOffers, ...totals } = pricing;
    return {
      id: orderId,
      paymentId,
      createdAt: new Date().toISOString(),
      lines: this.pricing.getLines(items).map(({ product, quantity }) => ({
        productId: product.id,
        name: product.name,
        unit: product.unit,
        price: product.price,
        quantity,
      })),
      pricing: { ...totals, offerTitles: appliedOffers.map((a) => a.offer.title) },
    };
  }
}
