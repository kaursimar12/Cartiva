"use client";

import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { formatPrice } from "@/lib/format";
import { useOrderStore } from "@/store/order-store";

export function OrderSuccessView() {
  const hydrated = useOrderStore((s) => s.hasHydrated);
  const order = useOrderStore((s) => s.lastOrder);

  if (!hydrated) return <div className="mx-auto h-96 max-w-2xl animate-pulse rounded-2xl bg-zinc-200" aria-busy="true" />;

  if (!order) {
    return (
      <EmptyState
        icon="📦"
        title="No recent order"
        description="Once you place an order, its confirmation will appear here."
        action={{ label: "Start shopping", href: "/" }}
      />
    );
  }

  const { pricing } = order;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-zinc-300 bg-surface p-6 text-center sm:p-8">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-3xl text-brand-700" aria-hidden>
          ✓
        </span>
        <h1 className="mt-4 text-2xl font-bold">Order placed!</h1>
        <p className="mt-1 text-zinc-600">Your payment was successful and your order has been placed.</p>
        <dl className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-3 rounded-xl bg-surface-muted p-4 text-left text-sm">
          <dt className="text-zinc-600">Order reference</dt>
          <dd className="font-mono font-semibold break-all">{order.id}</dd>
          <dt className="text-zinc-600">Payment ID</dt>
          <dd className="font-mono break-all">{order.paymentId}</dd>
          <dt className="text-zinc-600">Amount paid</dt>
          <dd className="font-semibold">{formatPrice(pricing.total)}</dd>
        </dl>
      </div>

      <section aria-labelledby="order-items" className="mt-4 rounded-2xl border border-zinc-300 bg-surface p-6">
        <h2 id="order-items" className="font-semibold">
          Items
        </h2>
        <ul className="mt-3 divide-y divide-zinc-300 text-sm">
          {order.lines.map((line) => (
            <li key={line.productId} className="flex justify-between gap-4 py-2.5">
              <span>
                {line.name} <span className="text-zinc-500">({line.unit})</span> × {line.quantity}
              </span>
              <span>{formatPrice(line.price * line.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1.5 border-t border-zinc-300 pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-600">Subtotal</dt>
            <dd>{formatPrice(pricing.subtotal)}</dd>
          </div>
          {pricing.discount > 0 && (
            <div className="flex justify-between text-brand-700">
              <dt>Discount ({pricing.offerTitles.join(", ")})</dt>
              <dd>−{formatPrice(pricing.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-zinc-600">Delivery</dt>
            <dd>{pricing.deliveryFee === 0 ? "FREE" : formatPrice(pricing.deliveryFee)}</dd>
          </div>
          <div className="flex justify-between font-bold">
            <dt>Total paid</dt>
            <dd>{formatPrice(pricing.total)}</dd>
          </div>
        </dl>
      </section>

      <Link
        href="/"
        className="mt-6 flex w-full items-center justify-center rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Continue shopping
      </Link>
    </div>
  );
}
