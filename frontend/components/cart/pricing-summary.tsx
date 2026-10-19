"use client";

import { AnimatePresence, motion } from "motion/react";
import { AnimatedNumber } from "@/components/common/animated-number";
import { formatPrice } from "@/lib/format";
import type { PricingSummary as Pricing } from "@/models/entities/cart";

/** A bill row that slides in when it starts to apply (e.g. an offer unlocks) and out when it stops. */
const rowMotion = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto" },
  exit: { opacity: 0, height: 0 },
} as const;

export function PricingSummary({ pricing }: { pricing: Pricing }) {
  return (
    <dl className="tabular space-y-2.5 text-sm">
      <div className="flex justify-between">
        <dt className="text-zinc-500">Subtotal ({pricing.itemCount} item{pricing.itemCount === 1 ? "" : "s"})</dt>
        <dd className="text-zinc-900">
          <AnimatedNumber value={pricing.subtotal} format={formatPrice} />
        </dd>
      </div>
      <AnimatePresence initial={false}>
        {pricing.appliedOffers.map(({ offer, amount }) => (
          <motion.div key={offer.id} {...rowMotion} className="flex justify-between overflow-hidden text-brand-700">
            <dt>Offer: {offer.title}</dt>
            <dd>
              −<AnimatedNumber value={amount} format={formatPrice} />
            </dd>
          </motion.div>
        ))}
        {pricing.discount > 0 && (
          <motion.div key="discount" {...rowMotion} className="flex justify-between overflow-hidden font-medium text-brand-700">
            <dt>Total discount</dt>
            <dd>
              −<AnimatedNumber value={pricing.discount} format={formatPrice} />
            </dd>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex justify-between">
        <dt className="text-zinc-500">Delivery fee</dt>
        <dd className="text-zinc-900">
          {pricing.deliveryFee === 0 ? <span className="font-medium text-brand-700">FREE</span> : formatPrice(pricing.deliveryFee)}
        </dd>
      </div>
      <div className="flex items-baseline justify-between border-t border-hairline pt-4">
        <dt className="text-sm font-medium text-zinc-900">Total</dt>
        <dd className="text-2xl font-semibold tracking-tight text-zinc-900">
          <AnimatedNumber value={pricing.total} format={formatPrice} />
        </dd>
      </div>
    </dl>
  );
}
