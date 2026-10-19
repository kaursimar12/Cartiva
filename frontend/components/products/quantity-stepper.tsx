"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

interface QuantityStepperProps {
  label: string;
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
  canIncrease?: boolean;
  size?: "sm" | "md";
}

export function QuantityStepper({
  label,
  quantity,
  onDecrease,
  onIncrease,
  canIncrease = true,
  size = "sm",
}: QuantityStepperProps) {
  const button = size === "sm" ? "h-9 w-8" : "h-12 w-12 text-lg";
  // Roll the number up when it grows and down when it shrinks.
  const [previous, setPrevious] = useState(quantity);
  const [direction, setDirection] = useState(1);
  if (quantity !== previous) {
    setDirection(quantity > previous ? 1 : -1);
    setPrevious(quantity);
  }

  return (
    <div
      className="flex items-center rounded-lg bg-brand-600 text-white shadow-sm"
      role="group"
      aria-label={`Quantity of ${label}`}
    >
      <button
        type="button"
        onClick={onDecrease}
        className={`${button} rounded-l-lg font-bold transition-colors hover:bg-white/10 active:bg-white/20`}
        aria-label={`Decrease ${label}`}
      >
        −
      </button>
      <span
        className={`${size === "sm" ? "min-w-6" : "min-w-10"} tabular relative flex h-5 items-center justify-center overflow-hidden text-sm font-semibold`}
        aria-live="polite"
      >
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.span
            key={quantity}
            custom={direction}
            initial={{ y: direction * 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: direction * -14, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
          >
            {quantity}
          </motion.span>
        </AnimatePresence>
      </span>
      <button
        type="button"
        onClick={onIncrease}
        disabled={!canIncrease}
        className={`${button} rounded-r-lg font-bold transition-colors hover:bg-white/10 active:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40`}
        aria-label={`Increase ${label}`}
      >
        +
      </button>
    </div>
  );
}
