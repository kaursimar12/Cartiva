import { formatPrice } from "@/lib/format";
import type { Offer } from "@/models/entities/offer";

/** Short label for a deal badge: "20% OFF" or "₹10 OFF". */
export function dealLabel(deal: Offer): string {
  return deal.discountType === "percentage" ? `${deal.discountValue}% OFF` : `${formatPrice(deal.discountValue)} OFF`;
}

/** Small "20% OFF" tag shown on products that have a deal. */
export function DealBadge({ deal, className = "" }: { deal: Offer; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white ${className}`}
      title={deal.description}
    >
      {dealLabel(deal)}
    </span>
  );
}
