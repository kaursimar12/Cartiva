"use client";

import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";

/**
 * A number that rolls to its new value (bill totals, cart badge) instead of jumping.
 * `format` turns the in-between value into text, e.g. formatPrice.
 */
export function AnimatedNumber({
  value,
  format = (n) => String(n),
  className,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const spring = useSpring(value, { stiffness: 140, damping: 22, mass: 0.6 });
  const text = useTransform(spring, (n) => format(Math.round(n)));

  useEffect(() => {
    if (reduce) spring.jump(value);
    else spring.set(value);
  }, [value, reduce, spring]);

  return (
    <>
      {/* Screen readers get the final value only, not every frame of the roll. */}
      <span className="sr-only">{format(value)}</span>
      <motion.span aria-hidden className={className}>
        {text}
      </motion.span>
    </>
  );
}
