"use client";

import { motion } from "motion/react";
import { CheckIcon, TagIcon, TruckIcon } from "@/components/common/icons";
import { catalogService, pricingService } from "@/lib/container";
import { formatPrice } from "@/lib/format";
import type { OfferHint } from "@/models/entities/cart";
import type { Paise } from "@/models/entities/money";

interface CartHintsProps {
  hints: OfferHint[];
  /** From PricingService.getFreeDeliveryRemaining; null when delivery is already free. */
  freeDeliveryRemaining: Paise | null;
}

/** One goal with a bar that fills as the cart gets closer to it. */
function Goal({ icon, done, title, detail, progress }: { icon: React.ReactNode; done: boolean; title: React.ReactNode; detail: string; progress: number }) {
  return (
    <li className="flex gap-3">
      <span
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
          done ? "bg-brand-600 text-white" : "bg-brand-500/10 text-brand-700"
        }`}
      >
        {done ? <CheckIcon className="h-4 w-4" /> : icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-800">{title}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400"
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(progress * 100)}%` }}
            transition={{ type: "spring", stiffness: 90, damping: 20 }}
          />
        </div>
        <p className="tabular mt-1 text-[11px] text-zinc-500">{detail}</p>
      </div>
    </li>
  );
}

/** "Add ₹X more" goals for free delivery and offers, each with a progress bar. */
export function CartHints({ hints, freeDeliveryRemaining }: CartHintsProps) {
  const freeAbove = pricingService.delivery.freeAbove;
  const deliveryProgress = freeDeliveryRemaining === null ? 1 : 1 - freeDeliveryRemaining / freeAbove;

  return (
    <section aria-labelledby="unlock-heading" className="rounded-3xl border border-hairline bg-surface p-5 sm:p-6">
      <h2 id="unlock-heading" className="text-xs font-semibold tracking-[0.12em] text-zinc-500 uppercase">
        Unlock more savings
      </h2>
      <ul className="mt-4 space-y-5">
        <Goal
          icon={<TruckIcon className="h-4 w-4" />}
          done={freeDeliveryRemaining === null}
          progress={deliveryProgress}
          title={
            freeDeliveryRemaining === null ? (
              <strong className="font-semibold">Free delivery unlocked</strong>
            ) : (
              <>
                Add <strong className="tabular font-semibold">{formatPrice(freeDeliveryRemaining)}</strong> more for{" "}
                <strong className="font-semibold">free delivery</strong>
              </>
            )
          }
          detail={`Free above ${formatPrice(freeAbove)}`}
        />
        {hints.map(({ offer, remaining }) => {
          const categoryName = offer.category ? catalogService.getCategory(offer.category)?.name : undefined;
          return (
            <Goal
              key={offer.id}
              icon={<TagIcon className="h-4 w-4" />}
              done={false}
              progress={1 - remaining / offer.minimumAmount}
              title={
                <>
                  Add <strong className="tabular font-semibold">{formatPrice(remaining)}</strong> more{" "}
                  {categoryName ? `in ${categoryName} ` : ""}for <strong className="font-semibold">{offer.title}</strong>
                </>
              }
              detail={`${categoryName ? `${categoryName} ` : "Orders "}above ${formatPrice(offer.minimumAmount)}`}
            />
          );
        })}
      </ul>
    </section>
  );
}
