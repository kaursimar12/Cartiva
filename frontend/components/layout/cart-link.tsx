"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { AnimatedNumber } from "@/components/common/animated-number";
import { CartIcon } from "@/components/common/icons";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/hooks/use-cart";
import { useAgentEventStore } from "@/store/agent-event-store";

export function CartLink() {
  const { hydrated, pricing } = useCart();
  const count = hydrated ? pricing.itemCount : 0;
  // The agent just added something: the cart catches it with a stronger pulse.
  const agentAdded = useAgentEventStore((s) => (s.focus?.kind === "added" ? s.focus.seq : null));

  return (
    <Link
      id="cart-link"
      href="/cart"
      className={`relative flex h-11 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-semibold transition-colors sm:px-4 ${
        count > 0
          ? "bg-brand-600 text-white hover:bg-brand-700"
          : "border border-hairline bg-surface text-zinc-700 hover:bg-zinc-50"
      }`}
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
    >
      {agentAdded !== null && (
        <motion.span
          key={agentAdded}
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-brand-400"
          initial={{ opacity: 0.9, scale: 1 }}
          animate={{ opacity: 0, scale: 1.35 }}
          transition={{ duration: 0.8, delay: 0.75 }} // lands as the flying product arrives
        />
      )}
      <CartIcon className="h-5 w-5" />
      {count > 0 ? (
        <span className="tabular flex items-center gap-2 leading-tight">
          {/* Small bump on every change, by tap or by voice. */}
          <motion.span
            key={count}
            initial={{ scale: 1.5 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
            className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 text-xs font-semibold"
          >
            {count}
          </motion.span>
          <AnimatedNumber value={pricing.total} format={formatPrice} className="hidden text-sm font-semibold sm:inline" />
        </span>
      ) : (
        <span className="hidden sm:inline">Cart</span>
      )}
    </Link>
  );
}
