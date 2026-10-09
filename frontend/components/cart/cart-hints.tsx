import { catalogService } from "@/lib/container";
import { formatPrice } from "@/lib/format";
import type { OfferHint } from "@/models/entities/cart";
import type { Paise } from "@/models/entities/money";

interface CartHintsProps {
  hints: OfferHint[];
  /** From PricingService.getFreeDeliveryRemaining; null when delivery is already free. */
  freeDeliveryRemaining: Paise | null;
}

/** "Add ₹X more" nudges for offers and free delivery. */
export function CartHints({ hints, freeDeliveryRemaining }: CartHintsProps) {
  if (hints.length === 0 && freeDeliveryRemaining === null) return null;

  return (
    <ul className="space-y-2">
      {freeDeliveryRemaining !== null && (
        <li className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-zinc-800">
          🚚 Add {formatPrice(freeDeliveryRemaining)} more for <strong>free delivery</strong>.
        </li>
      )}
      {hints.map(({ offer, remaining }) => {
        const categoryName = offer.category ? catalogService.getCategory(offer.category)?.name : undefined;
        return (
          <li key={offer.id} className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-900">
            🏷 Add {formatPrice(remaining)} more {categoryName ? `in ${categoryName} ` : ""}to unlock{" "}
            <strong>{offer.title}</strong>.
          </li>
        );
      })}
    </ul>
  );
}
