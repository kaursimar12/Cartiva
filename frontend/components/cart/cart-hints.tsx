import { TagIcon, TruckIcon } from "@/components/common/icons";
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
        <li className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800">
          <TruckIcon className="h-5 w-5 shrink-0" />
          <span>
            Add {formatPrice(freeDeliveryRemaining)} more for <strong>free delivery</strong>.
          </span>
        </li>
      )}
      {hints.map(({ offer, remaining }) => {
        const categoryName = offer.category ? catalogService.getCategory(offer.category)?.name : undefined;
        return (
          <li key={offer.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800">
            <TagIcon className="h-5 w-5 shrink-0" />
            <span>
              Add {formatPrice(remaining)} more {categoryName ? `in ${categoryName} ` : ""}to unlock{" "}
              <strong>{offer.title}</strong>.
            </span>
          </li>
        );
      })}
    </ul>
  );
}
