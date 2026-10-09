import { formatPrice } from "@/lib/format";
import type { OfferHint, PricingSummary } from "@/models/entities/cart";

interface CartHintsProps {
  hints: OfferHint[];
  pricing: PricingSummary;
  freeDeliveryAbove: number;
}

/** "Add ₹X more" nudges for offers and free delivery. */
export function CartHints({ hints, pricing, freeDeliveryAbove }: CartHintsProps) {
  const deliveryGap = pricing.deliveryFee > 0 ? freeDeliveryAbove - pricing.subtotal : 0;
  if (hints.length === 0 && deliveryGap <= 0) return null;

  return (
    <ul className="space-y-2">
      {deliveryGap > 0 && (
        <li className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-zinc-800">
          🚚 Add {formatPrice(deliveryGap)} more for <strong>free delivery</strong>.
        </li>
      )}
      {hints.map(({ offer, remaining }) => (
        <li key={offer.id} className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-900">
          🏷 Add {formatPrice(remaining)} more {offer.category ? `in ${offer.category.replace("-", " ")} ` : ""}to unlock{" "}
          <strong>{offer.title}</strong>.
        </li>
      ))}
    </ul>
  );
}
