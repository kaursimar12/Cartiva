"use client";

import { motion } from "motion/react";
import { CheckIcon } from "@/components/common/icons";

const STEPS = ["Cart", "Review", "Pay", "Done"] as const;

/** Where the shopper is in checkout. `current` is the index of the active step. */
export function CheckoutSteps({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label="Checkout progress">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
            <span
              className={`relative flex h-7 items-center gap-1.5 rounded-full px-3 font-medium transition-colors duration-300 ${
                active ? "text-background" : done ? "text-zinc-900" : "text-zinc-400"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="checkout-step"
                  className="absolute inset-0 -z-10 rounded-full bg-zinc-900"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              {done ? (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-white">
                  <CheckIcon className="h-2.5 w-2.5" />
                </span>
              ) : (
                <span className="tabular text-xs opacity-70">{i + 1}</span>
              )}
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="relative h-px w-6 overflow-hidden bg-zinc-200 sm:w-10" aria-hidden>
                <motion.span
                  className="absolute inset-0 origin-left bg-brand-600"
                  initial={false}
                  animate={{ scaleX: done ? 1 : 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
