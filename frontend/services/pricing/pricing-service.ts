import type { AppliedOffer, CartItem, CartLine, OfferHint, PricingSummary } from "@/models/entities/cart";
import type { DeliveryPolicy } from "@/models/entities/delivery";
import type { Paise } from "@/models/entities/money";
import type { DiscountType, Offer } from "@/models/entities/offer";
import type { OfferRepository, ProductRepository } from "@/models/repositories/interfaces";
import type { DiscountStrategy } from "./discount-strategies";

/**
 * Single source of truth for cart pricing: Subtotal − Discount + Delivery = Total (SRS FR-09, FR-10).
 * All amounts are paise. backend/app/pricing.py mirrors these rules; data/pricing-cases.json keeps them in sync.
 */
export class PricingService {
  constructor(
    private readonly products: ProductRepository,
    private readonly offers: OfferRepository,
    private readonly strategies: Record<DiscountType, DiscountStrategy>,
    readonly delivery: DeliveryPolicy,
  ) {}

  /** Resolves cart items against the catalog, dropping products that no longer exist. */
  getLines(items: CartItem[]): CartLine[] {
    return items.flatMap((item) => {
      const product = this.products.findById(item.productId);
      return product ? [{ product, quantity: item.quantity, lineTotal: product.price * item.quantity }] : [];
    });
  }

  calculate(items: CartItem[]): PricingSummary {
    const lines = this.getLines(items);
    const subtotal = this.subtotal(lines);
    const appliedOffers = this.applicableOffers(lines);
    const discount = Math.min(
      appliedOffers.reduce((sum, a) => sum + a.amount, 0),
      subtotal,
    );
    const deliveryFee = this.deliveryFee(subtotal);

    return {
      itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
      subtotal,
      discount,
      appliedOffers,
      deliveryFee,
      total: subtotal - discount + deliveryFee,
    };
  }

  /** Offers the cart has started on but not yet unlocked, for "Add ₹X more" hints. */
  getOfferHints(items: CartItem[]): OfferHint[] {
    const lines = this.getLines(items);
    return this.offers.findActive().flatMap((offer) => {
      const eligible = this.eligibleAmount(offer, lines);
      if (eligible === 0 || eligible >= offer.minimumAmount) return [];
      return [{ offer, remaining: offer.minimumAmount - eligible }];
    });
  }

  /** Amount still needed for free delivery, or null when delivery is already free (or the cart is empty). */
  getFreeDeliveryRemaining(items: CartItem[]): Paise | null {
    const subtotal = this.subtotal(this.getLines(items));
    return this.deliveryFee(subtotal) > 0 ? this.delivery.freeAbove - subtotal : null;
  }

  private subtotal(lines: CartLine[]): Paise {
    return lines.reduce((sum, line) => sum + line.lineTotal, 0);
  }

  private eligibleAmount(offer: Offer, lines: CartLine[]): Paise {
    return offer.category
      ? this.subtotal(lines.filter((l) => l.product.category === offer.category))
      : this.subtotal(lines);
  }

  private applicableOffers(lines: CartLine[]): AppliedOffer[] {
    return this.offers.findActive().flatMap((offer) => {
      const eligible = this.eligibleAmount(offer, lines);
      if (eligible === 0 || eligible < offer.minimumAmount) return [];
      return [{ offer, amount: this.strategies[offer.discountType].calculate(offer, eligible) }];
    });
  }

  private deliveryFee(subtotal: Paise): Paise {
    if (subtotal === 0 || subtotal >= this.delivery.freeAbove) return 0;
    return this.delivery.fee;
  }
}
