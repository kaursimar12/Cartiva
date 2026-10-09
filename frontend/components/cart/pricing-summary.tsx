import { formatPrice } from "@/lib/format";
import type { PricingSummary as Pricing } from "@/models/entities/cart";

export function PricingSummary({ pricing }: { pricing: Pricing }) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-zinc-600">Subtotal ({pricing.itemCount} item{pricing.itemCount === 1 ? "" : "s"})</dt>
        <dd>{formatPrice(pricing.subtotal)}</dd>
      </div>
      {pricing.appliedOffers.map(({ offer, amount }) => (
        <div key={offer.id} className="flex justify-between text-brand-700">
          <dt>Offer: {offer.title}</dt>
          <dd>−{formatPrice(amount)}</dd>
        </div>
      ))}
      {pricing.discount > 0 && (
        <div className="flex justify-between font-medium text-brand-700">
          <dt>Total discount</dt>
          <dd>−{formatPrice(pricing.discount)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-zinc-600">Delivery fee</dt>
        <dd>{pricing.deliveryFee === 0 ? <span className="font-medium text-brand-700">FREE</span> : formatPrice(pricing.deliveryFee)}</dd>
      </div>
      <div className="flex justify-between border-t border-zinc-300 pt-3 text-base font-bold">
        <dt>Total</dt>
        <dd>{formatPrice(pricing.total)}</dd>
      </div>
    </dl>
  );
}
