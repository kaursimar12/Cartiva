"use client";

import { TruckIcon } from "@/components/common/icons";
import { ProductRail } from "@/components/products/product-grid";
import { catalogService, pricingService } from "@/lib/container";
import { formatPrice } from "@/lib/format";
import type { Paise } from "@/models/entities/money";

interface FreeDeliveryNudgeProps {
  /** Still needed for free delivery (PricingService.getFreeDeliveryRemaining). */
  remaining: Paise;
  cartProductIds: string[];
}

/**
 * At checkout, below the free-delivery amount: says what's missing and offers products that get there,
 * with ADD buttons (same cards as everywhere, so adding goes through the cart controller). The voice agent
 * gets the same suggestions from checkout.start and mentions them.
 */
export function FreeDeliveryNudge({ remaining, cartProductIds }: FreeDeliveryNudgeProps) {
  const picks = catalogService.getFreeDeliverySuggestions(cartProductIds, remaining);
  if (picks.length === 0) return null;

  return (
    <section
      aria-labelledby="free-delivery-heading"
      className="rounded-3xl border border-brand-500/40 bg-brand-500/5 p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-700">
          <TruckIcon className="h-5 w-5" />
        </span>
        <div>
          <h2 id="free-delivery-heading" className="text-base font-semibold text-zinc-900">
            Add <span className="tabular">{formatPrice(remaining)}</span> more and delivery is free
          </h2>
          <p className="mt-0.5 text-sm text-zinc-600">
            Right now you pay {formatPrice(pricingService.delivery.fee)} for delivery. These would get you there:
          </p>
        </div>
      </div>
      <div className="mt-2">
        <ProductRail products={picks} inset />
      </div>
    </section>
  );
}
