import type { DiscountType, Offer } from "@/models/entities/offer";

/** How an offer turns its eligible amount into a discount. Add a strategy to support a new discount type. */
export interface DiscountStrategy {
  calculate(offer: Offer, eligibleAmount: number): number;
}

const percentage: DiscountStrategy = {
  calculate: (offer, eligibleAmount) => Math.round((eligibleAmount * offer.discountValue) / 100),
};

const flat: DiscountStrategy = {
  calculate: (offer, eligibleAmount) => Math.min(offer.discountValue, eligibleAmount),
};

export const defaultDiscountStrategies: Record<DiscountType, DiscountStrategy> = { percentage, flat };
