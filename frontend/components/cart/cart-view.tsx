"use client";

import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { cartController } from "@/controllers/cart-controller";
import { useCart } from "@/hooks/use-cart";
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

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section aria-labelledby="cart-items" className="rounded-2xl border border-zinc-300 bg-surface px-4 sm:px-6">
        <div className="flex items-center justify-between border-b border-zinc-300 py-4">
          <h2 id="cart-items" className="font-semibold">
            Items ({pricing.itemCount})
          </h2>
          {confirmingClear ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-zinc-600">Clear all items?</span>
              <button
                type="button"
                onClick={() => {
                  cartController.clear();
                  setConfirmingClear(false);
                }}
                className="rounded-lg bg-red-600 px-3 py-1 font-semibold text-white hover:bg-red-700"
              >
                Clear
              </button>
              <button type="button" onClick={() => setConfirmingClear(false)} className="px-2 font-semibold text-zinc-600">
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmingClear(true)} className="text-sm font-semibold text-red-600 hover:text-red-700">
              Clear cart
            </button>
          )}
        </div>
        <ul className="divide-y divide-zinc-300">
          {lines.map((line) => (
            <CartLineRow key={line.product.id} line={line} />
          ))}
        </ul>
      </section>

      <aside className="space-y-4 lg:sticky lg:top-36 lg:self-start">
        <CartHints hints={offerHints} freeDeliveryRemaining={freeDeliveryRemaining} />
        <section aria-labelledby="bill-details" className="rounded-2xl border border-zinc-300 bg-surface p-5">
          <h2 id="bill-details" className="mb-4 font-semibold">
            Bill details
          </h2>
          <PricingSummary pricing={pricing} />
          <Link
            href="/checkout"
            className="mt-5 flex w-full items-center justify-center rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Proceed to checkout
          </Link>
        </section>
      </aside>
    </div>
  );
}

export function CartSkeleton() {
  return (
    <div className="grid animate-pulse gap-6 lg:grid-cols-[1fr_360px]" aria-busy="true" aria-label="Loading cart">
      <div className="h-80 rounded-2xl bg-zinc-200" />
      <div className="h-64 rounded-2xl bg-zinc-200" />
    </div>
  );
}
