"use client";

import { motion } from "motion/react";

/** Each line rises out of a mask, one after another — the first thing that moves on the home page. */
export function HeroHeadline({ lines }: { lines: { text: string; accent?: boolean }[] }) {
  return (
    <h1 className="mt-4 font-display text-5xl leading-[0.95] tracking-tight text-zinc-900 sm:text-7xl">
      {lines.map((line, i) => (
        <span key={line.text} className="block overflow-hidden pb-[0.08em]">
          <motion.span
            className={`block ${line.accent ? "text-brand-600 italic" : ""}`}
            initial={{ y: "105%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            {line.text}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}
