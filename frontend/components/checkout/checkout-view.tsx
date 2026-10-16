"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CartSkeleton } from "@/components/cart/cart-view";
import { PricingSummary } from "@/components/cart/pricing-summary";
import { EmptyState } from "@/components/common/empty-state";
import { checkoutController } from "@/controllers/checkout-controller";
import { useCart } from "@/hooks/use-cart";
import { formatPrice } from "@/lib/format";
import { useCheckoutStore } from "@/store/checkout-store";

/**
 * Review → explicit confirmation (FR-23) → payment → success/failure (FR-26, FR-27).
 * Payment starts only after "Proceed to payment" — or a spoken "yes" to the voice agent.
 * The payment status lives in the checkout store, so both paths show the same UI.
 */
export function CheckoutView() {
  const router = useRouter();
  const { hydrated, items, lines, pricing } = useCart();
  const [step, setStep] = useState<"review" | "confirm">("review");
  const status = useCheckoutStore((s) => s.status);

  // A verified payment (from a click or from voice) leads to the order page.
  useEffect(() => {
    if (status.name === "success") router.push("/order-success");
  }, [status, router]);

  // Leaving the page forgets an old success/failure, so the next checkout starts clean.
  useEffect(
    () => () => {
      if (useCheckoutStore.getState().status.name !== "processing") checkoutController.resetPayment();
    },
    [],
  );

  if (status.name === "success") {
    return <p className="py-20 text-center text-zinc-600">Payment successful. Taking you to your order…</p>;
  }
  if (!hydrated) return <CartSkeleton />;

  const validation = checkoutController.validate(items);
  if (!validation.ok && validation.error.code === "EMPTY_CART" && status.name !== "processing") {
    return <EmptyState icon="🛒" title="Nothing to check out" description={validation.error.message} action={{ label: "Start shopping", href: "/" }} />;
  }

  const idle = status.name === "idle";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section aria-labelledby="order-summary" className="rounded-2xl border border-zinc-200 bg-surface shadow-sm p-5 sm:p-6">
        <h2 id="order-summary" className="font-semibold">
          Order summary
        </h2>
        <ul className="mt-4 divide-y divide-zinc-100 text-sm">
          {lines.map(({ product, quantity, lineTotal }) => (
            <li key={product.id} className="flex justify-between gap-4 py-3">
              <span>
                {product.name} <span className="text-zinc-500">({product.unit})</span> × {quantity}
              </span>
              <span className="font-medium">{formatPrice(lineTotal)}</span>
            </li>
          ))}
        </ul>
        <Link href="/cart" className="mt-4 inline-block text-sm font-semibold text-brand-700 hover:text-brand-800">
          ← Edit cart
        </Link>
      </section>

      <aside className="space-y-4 lg:sticky lg:top-36 lg:self-start">
        <section aria-labelledby="payment" className="rounded-2xl border border-zinc-200 bg-surface shadow-sm p-5">
          <h2 id="payment" className="mb-4 font-semibold">
            Payment
          </h2>
          <PricingSummary pricing={pricing} />

          {!validation.ok && (
            <div role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
              {validation.error.message}{" "}
              <Link href="/cart" className="font-semibold underline">
                Go to cart
              </Link>
            </div>
          )}

          {validation.ok && idle && step === "review" && (
            <button
              type="button"
              onClick={() => setStep("confirm")}
              className="mt-5 w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Place order · {formatPrice(pricing.total)}
            </button>
          )}

          {validation.ok && idle && step === "confirm" && (
            <div className="mt-5 rounded-xl border border-brand-200 bg-brand-50 p-4" role="alertdialog" aria-labelledby="confirm-title">
              <p id="confirm-title" className="text-sm font-medium text-brand-900">
                {validation.message}
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => void checkoutController.confirmAndPay({ simulateFailure: false })}
                  autoFocus
                  className="flex-1 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Proceed to payment
                </button>
                <button
                  type="button"
                  onClick={() => setStep("review")}
                  className="rounded-lg border border-zinc-200 bg-surface shadow-sm px-4 py-2.5 text-sm font-semibold hover:bg-surface-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {status.name === "processing" && (
            <p className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-surface-muted py-3 text-sm font-medium" role="status">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" aria-hidden />
              Processing payment…
            </p>
          )}

          {status.name === "failed" && (
            <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">Payment unsuccessful</p>
              <p className="mt-1 text-sm text-red-700">{status.reason}</p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    checkoutController.resetPayment();
                    setStep("confirm");
                  }}
                  className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500"
                >
                  Retry payment
                </button>
                <Link href="/cart" className="rounded-lg border border-zinc-200 bg-surface shadow-sm px-4 py-2.5 text-sm font-semibold hover:bg-surface-muted">
                  Back to cart
                </Link>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-dashed border-zinc-200 bg-surface shadow-sm-muted p-4 text-sm text-zinc-700">
          <p className="font-semibold">Razorpay test mode</p>
          <p className="mt-1">No real money is charged. To try it:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Card <span className="font-mono">4100 2800 0000 1007</span>, any future expiry, any CVV
            </li>
            <li>
              Or Netbanking → any bank → <strong>Success</strong> (or <strong>Failure</strong> to test a failed payment)
            </li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
