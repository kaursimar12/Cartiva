"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { LockIcon } from "@/components/common/icons";
import { checkoutController } from "@/controllers/checkout-controller";
import { formatPrice } from "@/lib/format";
import type { Paise } from "@/models/entities/money";
import type { PaymentStatus } from "@/store/checkout-store";

/** Each state swaps in place with a short rise, so the panel feels like one control changing. */
const swap = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.98 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
} as const;

interface PayPanelProps {
  total: Paise;
  status: PaymentStatus;
  step: "review" | "confirm";
  /** The confirmation sentence from checkout validation ("Your total is ₹495…"). */
  confirmMessage: string;
  onStepChange: (step: "review" | "confirm") => void;
}

/**
 * The payment control: Pay → explicit confirmation (FR-23) → processing → failure with retry (FR-27).
 * Payment only starts from "Confirm & pay" (or a spoken "yes" to the voice agent).
 */
export function PayPanel({ total, status, step, confirmMessage, onStepChange }: PayPanelProps) {
  const view = status.name === "processing" ? "processing" : status.name === "failed" ? "failed" : step;

  return (
    <div className="mt-6">
      <AnimatePresence mode="wait" initial={false}>
        {view === "review" && (
          <motion.button
            key="review"
            {...swap}
            type="button"
            onClick={() => onStepChange("confirm")}
            whileTap={{ scale: 0.98 }}
            className="group flex h-14 w-full items-center justify-between rounded-2xl bg-zinc-900 pr-2 pl-5 text-background transition-colors hover:bg-zinc-800"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <LockIcon className="h-4 w-4 opacity-70" />
              Pay securely
            </span>
            <span className="tabular flex h-10 items-center rounded-xl bg-background/10 px-4 text-base font-semibold transition-colors group-hover:bg-background/15">
              {formatPrice(total)}
            </span>
          </motion.button>
        )}

        {view === "confirm" && (
          <motion.div
            key="confirm"
            {...swap}
            role="alertdialog"
            aria-labelledby="confirm-title"
            className="rounded-2xl border border-brand-500/30 bg-brand-50 p-5"
          >
            <p className="text-xs font-semibold tracking-[0.12em] text-brand-700 uppercase">Confirm payment</p>
            <p className="tabular mt-1 font-display text-4xl leading-none text-zinc-900">{formatPrice(total)}</p>
            <p id="confirm-title" className="mt-2 text-sm text-zinc-600">
              {confirmMessage}
            </p>
            <div className="mt-5 flex gap-2">
              <motion.button
                type="button"
                onClick={() => void checkoutController.confirmAndPay({ simulateFailure: false })}
                autoFocus
                whileTap={{ scale: 0.97 }}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                <LockIcon className="h-4 w-4" />
                Confirm &amp; pay
              </motion.button>
              <button
                type="button"
                onClick={() => onStepChange("review")}
                className="h-12 rounded-xl border border-hairline bg-surface px-5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {view === "processing" && (
          <motion.div key="processing" {...swap} role="status" className="overflow-hidden rounded-2xl bg-surface-muted p-5">
            <div className="flex items-center gap-3">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface">
                <LockIcon className="h-4 w-4 text-brand-600" />
                <span className="absolute inset-0 animate-spin rounded-full border-2 border-brand-600/20 border-t-brand-600" />
              </span>
              <div>
                <p className="text-sm font-semibold text-zinc-900">Processing payment…</p>
                <p className="text-xs text-zinc-500">Complete it in the Razorpay window. Don’t close this tab.</p>
              </div>
            </div>
            {/* Indeterminate progress line. */}
            <div className="relative mt-4 h-1 overflow-hidden rounded-full bg-zinc-200">
              <motion.span
                className="absolute inset-y-0 w-1/3 rounded-full bg-brand-600"
                animate={{ x: ["-100%", "300%"] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        )}

        {view === "failed" && status.name === "failed" && (
          <motion.div
            key="failed"
            role="alert"
            initial={{ opacity: 0, x: 0 }}
            animate={{ opacity: 1, x: [0, -8, 8, -5, 5, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="rounded-2xl border border-red-500/30 bg-red-50 p-5"
          >
            <p className="text-sm font-semibold text-red-800">Payment didn’t go through</p>
            <p className="mt-1 text-sm text-red-700">{status.reason}</p>
            <p className="mt-1 text-xs text-red-700/80">Nothing was charged. Your cart is saved.</p>
            <div className="mt-4 flex gap-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  checkoutController.resetPayment();
                  onStepChange("confirm");
                }}
                className="h-11 flex-1 rounded-xl bg-red-600 text-sm font-semibold text-white transition-colors hover:bg-red-500"
              >
                Try again
              </motion.button>
              <Link
                href="/cart"
                className="flex h-11 items-center rounded-xl border border-hairline bg-surface px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Back to cart
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
