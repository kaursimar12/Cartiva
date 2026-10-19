"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CartSkeleton } from "@/components/cart/cart-view";
import { PricingSummary } from "@/components/cart/pricing-summary";
import { EmptyState } from "@/components/common/empty-state";
import { BoltIcon, ChevronLeftIcon, LockIcon, TagIcon } from "@/components/common/icons";
import { ProductImage } from "@/components/products/product-image";
import { checkoutController } from "@/controllers/checkout-controller";
import { useCart } from "@/hooks/use-cart";
import { formatPrice } from "@/lib/format";
import { useAgentEventStore } from "@/store/agent-event-store";
import { useCheckoutStore } from "@/store/checkout-store";
import { CheckoutSteps } from "./checkout-steps";
import { PayPanel } from "./pay-panel";

const PAYMENT_METHODS = ["UPI", "Cards", "Netbanking", "Wallets"];

/**
 * Review → explicit confirmation (FR-23) → payment → success/failure (FR-26, FR-27).
 * Payment starts only after "Confirm & pay" — or a spoken "yes" to the voice agent.
 * The payment status lives in the checkout store, so both paths show the same UI.
 */
export function CheckoutView() {
  const router = useRouter();
  const { hydrated, items, lines, pricing, freeDeliveryRemaining } = useCart();
  const [step, setStep] = useState<"review" | "confirm">("review");
  const status = useCheckoutStore((s) => s.status);
  // The voice agent read out the total and is waiting for a spoken "yes" or "no".
  const awaitingVoice = useAgentEventStore((s) => s.pendingCheckout);

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
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <CheckoutSteps current={3} />
        <p className="mt-8 text-zinc-600">Payment successful. Taking you to your order…</p>
      </div>
    );
  }
  if (!hydrated) return <CartSkeleton />;

  const validation = checkoutController.validate(items);
  if (!validation.ok && validation.error.code === "EMPTY_CART" && status.name !== "processing") {
    return <EmptyState icon="🛒" title="Nothing to check out" description={validation.error.message} action={{ label: "Start shopping", href: "/" }} />;
  }

  const idle = status.name === "idle";
  const voiceWaiting = awaitingVoice && idle && validation.ok;
  const currentStep = idle && step === "review" ? 1 : 2;

  return (
    <div>
      <div className="mb-8 overflow-x-auto pb-1">
        <CheckoutSteps current={currentStep} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
        {/* ---------- Your order ---------- */}
        <section aria-labelledby="order-summary" className="space-y-4">
          <div className="rounded-3xl border border-hairline bg-surface p-5 sm:p-7">
            <div className="flex items-baseline justify-between">
              <h2 id="order-summary" className="font-display text-3xl leading-none">
                Your order
              </h2>
              <Link href="/cart" className="flex items-center gap-0.5 text-sm font-semibold text-brand-700 hover:text-brand-800">
                <ChevronLeftIcon className="h-4 w-4" />
                Edit cart
              </Link>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              {pricing.itemCount} item{pricing.itemCount === 1 ? "" : "s"}
            </p>

            <ul className="mt-5 divide-y divide-hairline">
              {lines.map(({ product, quantity, lineTotal }, i) => (
                <motion.li
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.4 }}
                  className="flex items-center gap-4 py-3.5"
                >
                  <div className="relative">
                    <ProductImage product={product} size="sm" />
                    <span className="tabular absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1 text-[11px] font-semibold text-background">
                      {quantity}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900">{product.name}</p>
                    <p className="tabular text-xs text-zinc-500">
                      {product.unit} · {formatPrice(product.price)} × {quantity}
                    </p>
                  </div>
                  <p className="tabular text-sm font-semibold text-zinc-900">{formatPrice(lineTotal)}</p>
                </motion.li>
              ))}
            </ul>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <BoltIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-zinc-900">Arrives in about 10 minutes</p>
                <p className="text-xs text-zinc-500">
                  {freeDeliveryRemaining === null
                    ? "Free delivery on this order"
                    : `Add ${formatPrice(freeDeliveryRemaining)} more for free delivery`}
                </p>
              </div>
            </div>
            {pricing.discount > 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 rounded-2xl bg-[#0d3b24] p-4 text-[#f6f4ef]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <TagIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="tabular text-sm font-semibold">You’re saving {formatPrice(pricing.discount)}</p>
                  <p className="text-xs opacity-75">{pricing.appliedOffers.map((o) => o.offer.title).join(" · ")}</p>
                </div>
              </motion.div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-dashed border-hairline p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-zinc-500">
                  <TagIcon className="h-5 w-5" />
                </span>
                <p className="text-sm text-zinc-500">Offers apply automatically when your cart qualifies.</p>
              </div>
            )}
          </div>
        </section>

        {/* ---------- Bill + pay ---------- */}
        <aside className="space-y-3 lg:sticky lg:top-36 lg:self-start">
          <section
            id="checkout-bill"
            aria-labelledby="payment"
            className={`rounded-3xl border bg-surface p-6 transition-[border-color,box-shadow] duration-500 sm:p-7 ${
              voiceWaiting ? "glow-brand border-brand-500/60" : "border-hairline shadow-card"
            }`}
          >
            <h2 id="payment" className="mb-5 font-display text-3xl leading-none">
              Bill
            </h2>
            <PricingSummary pricing={pricing} />

            <AnimatePresence>
              {voiceWaiting && (
                <motion.p
                  role="status"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <span className="mt-5 flex items-center gap-2 rounded-2xl bg-brand-500/10 px-4 py-3 text-sm text-zinc-800 ring-1 ring-brand-500/30">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/60" />
                      <span className="relative h-2.5 w-2.5 rounded-full bg-brand-500" />
                    </span>
                    <span>
                      Say <strong className="font-semibold text-zinc-900">“yes”</strong> to pay, or{" "}
                      <strong className="font-semibold text-zinc-900">“no”</strong> to cancel.
                    </span>
                  </span>
                </motion.p>
              )}
            </AnimatePresence>

            {!validation.ok && (
              <div role="alert" className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
                {validation.error.message}{" "}
                <Link href="/cart" className="font-semibold underline">
                  Go to cart
                </Link>
              </div>
            )}

            {(validation.ok || !idle) && (
              <PayPanel
                total={pricing.total}
                status={status}
                step={step}
                confirmMessage={validation.ok ? validation.message : ""}
                onStepChange={setStep}
              />
            )}

            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-hairline pt-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1 font-medium text-zinc-700">
                <LockIcon className="h-3.5 w-3.5" />
                Secured by Razorpay
              </span>
              {PAYMENT_METHODS.map((method) => (
                <span key={method} className="rounded-md bg-surface-muted px-2 py-0.5">
                  {method}
                </span>
              ))}
            </div>
          </section>

          <details className="group rounded-2xl border border-dashed border-hairline px-4 py-3 text-sm text-zinc-600">
            <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-zinc-700">
              Test mode · no real money is charged
              <span className="text-zinc-400 transition-transform group-open:rotate-45">+</span>
            </summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Card <span className="font-mono">4100 2800 0000 1007</span>, any future expiry, any CVV
              </li>
              <li>
                Or Netbanking → any bank → <strong>Success</strong> (or <strong>Failure</strong> to test a failed payment)
              </li>
            </ul>
          </details>
        </aside>
      </div>

      {/* Phones: the bill is far below the items, so keep the total and Pay within thumb reach. */}
      <AnimatePresence>
        {validation.ok && idle && step === "review" && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="glass fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-x-0 border-b-0 px-4 py-3 lg:hidden in-data-[voice=on]:hidden"
          >
            <div className="tabular leading-tight">
              <p className="text-xs text-zinc-500">Total</p>
              <p className="text-lg font-bold text-zinc-900">{formatPrice(pricing.total)}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep("confirm");
                document.getElementById("checkout-bill")?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="flex h-12 items-center gap-2 rounded-xl bg-zinc-900 px-6 text-sm font-semibold text-background"
            >
              <LockIcon className="h-4 w-4 opacity-70" />
              Pay securely
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="h-20 lg:hidden" aria-hidden />
    </div>
  );
}
