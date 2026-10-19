"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { BoltIcon, ChevronRightIcon, LockIcon, TagIcon } from "@/components/common/icons";
import { ProductCard } from "@/components/products/product-card";
import { cartController } from "@/controllers/cart-controller";
import { useCart } from "@/hooks/use-cart";
import { catalogService } from "@/lib/container";
import { formatPrice } from "@/lib/format";
import { CartHints } from "./cart-hints";
import { CartLineRow } from "./cart-line-row";
import { PricingSummary } from "./pricing-summary";

export function CartView() {
  const { hydrated, lines, pricing, offerHints, freeDeliveryRemaining } = useCart();
  const [confirmingClear, setConfirmingClear] = useState(false);

  if (!hydrated) return <CartSkeleton />;

  if (lines.length === 0) {
    return (
      <EmptyState
        icon="🛒"
        title="Your cart is empty"
        description="Browse categories or search for products to start shopping."
        action={{ label: "Start shopping", href: "/" }}
      />
    );
  }

  const suggestions = catalogService.getSuggestions(lines.map((l) => l.product.id), 10);

  return (
    <div>
      <p className="-mt-3 mb-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
        <span className="tabular">
          {pricing.itemCount} item{pricing.itemCount === 1 ? "" : "s"} · {formatPrice(pricing.total)}
        </span>
        <span className="h-1 w-1 rounded-full bg-zinc-300" aria-hidden />
        <span className="flex items-center gap-1 text-brand-700">
          <BoltIcon className="h-4 w-4" />
          Arrives in about 10 minutes
        </span>
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="cart-items" className="rounded-3xl border border-hairline bg-surface px-5 sm:px-7">
            <div className="flex items-center justify-between border-b border-hairline py-5">
              <h2 id="cart-items" className="font-display text-3xl leading-none">
                Items
              </h2>
              <AnimatePresence mode="wait" initial={false}>
                {confirmingClear ? (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="text-zinc-600">Remove everything?</span>
                    <button
                      type="button"
                      onClick={() => {
                        cartController.clear();
                        setConfirmingClear(false);
                      }}
                      className="rounded-full bg-red-600 px-3.5 py-1.5 font-semibold text-white hover:bg-red-500"
                    >
                      Clear
                    </button>
                    <button type="button" onClick={() => setConfirmingClear(false)} className="px-2 font-semibold text-zinc-600">
                      Keep
                    </button>
                  </motion.div>
                ) : (
                  <motion.button
                    key="clear"
                    type="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setConfirmingClear(true)}
                    className="rounded-full px-3 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-600"
                  >
                    Clear cart
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            <ul className="py-2">
              <AnimatePresence initial={false}>
                {lines.map((line) => (
                  <CartLineRow key={line.product.id} line={line} />
                ))}
              </AnimatePresence>
            </ul>
          </section>

          {suggestions.length > 0 && (
            <section aria-labelledby="suggestions-heading">
              <div className="mb-4 flex items-end justify-between">
                <h2 id="suggestions-heading" className="font-display text-3xl leading-none">
                  You might also like
                </h2>
              </div>
              <ul className="scrollbar-none -mx-4 grid snap-x auto-cols-[minmax(10.5rem,1fr)] grid-flow-col gap-3 overflow-x-auto px-4 pt-3 pb-2 sm:mx-0 sm:auto-cols-[minmax(11rem,1fr)] sm:px-0">
                {suggestions.map((product, index) => (
                  <motion.li
                    key={product.id}
                    className="snap-start"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index, 8) * 0.05, duration: 0.45 }}
                  >
                    <ProductCard product={product} index={index} />
                  </motion.li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-36 lg:self-start">
          <section aria-labelledby="bill-details" className="rounded-3xl border border-hairline bg-surface p-6 shadow-card sm:p-7">
            <h2 id="bill-details" className="mb-5 font-display text-3xl leading-none">
              Bill
            </h2>
            <PricingSummary pricing={pricing} />
            <AnimatePresence>
              {pricing.discount > 0 && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <span className="tabular mt-4 flex items-center gap-2 rounded-xl bg-brand-500/10 px-3 py-2 text-sm font-medium text-brand-700">
                    <TagIcon className="h-4 w-4" />
                    You’re saving {formatPrice(pricing.discount)} on this order
                  </span>
                </motion.p>
              )}
            </AnimatePresence>
            <Link
              href="/checkout"
              className="group mt-6 flex h-14 w-full items-center justify-between rounded-2xl bg-zinc-900 pr-2 pl-5 text-background transition-colors hover:bg-zinc-800"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                Checkout
                <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
              <span className="tabular flex h-10 items-center rounded-xl bg-background/10 px-4 text-base font-semibold">
                {formatPrice(pricing.total)}
              </span>
            </Link>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
              <LockIcon className="h-3.5 w-3.5" />
              Secure payment with Razorpay
            </p>
          </section>
          <CartHints hints={offerHints} freeDeliveryRemaining={freeDeliveryRemaining} />
        </aside>
      </div>

      {/* Phones: keep the total and checkout within thumb reach. */}
      <div className="glass fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-x-0 border-b-0 px-4 py-3 lg:hidden in-data-[voice=on]:hidden">
        <div className="tabular leading-tight">
          <p className="text-xs text-zinc-500">
            {pricing.itemCount} item{pricing.itemCount === 1 ? "" : "s"}
          </p>
          <p className="text-lg font-bold text-zinc-900">{formatPrice(pricing.total)}</p>
        </div>
        <Link href="/checkout" className="flex h-12 items-center gap-1 rounded-xl bg-zinc-900 px-6 text-sm font-semibold text-background">
          Checkout
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      </div>
      <div className="h-20 lg:hidden" aria-hidden />
    </div>
  );
}

export function CartSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]" aria-busy="true" aria-label="Loading cart">
      <div className="shimmer h-80 rounded-3xl" />
      <div className="shimmer h-64 rounded-3xl" />
    </div>
  );
}
