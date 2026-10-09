import type { DiscountType, Offer } from "@/models/entities/offer";

/**
 * How an offer turns its eligible amount (paise) into a discount (paise).
 * Add a strategy to support a new discount type.
 */
export interface DiscountStrategy {
  calculate(offer: Offer, eligibleAmount: number): number;
}

const percentage: DiscountStrategy = {
  // Rounds down to the paise: identical in TypeScript and Python (`//`), unlike half-up vs banker's rounding.
  calculate: (offer, eligibleAmount) => Math.floor((eligibleAmount * offer.discountValue) / 100),
};

const flat: DiscountStrategy = {
  calculate: (offer, eligibleAmount) => Math.min(offer.discountValue, eligibleAmount),
};

export const defaultDiscountStrategies: Record<DiscountType, DiscountStrategy> = { percentage, flat };
