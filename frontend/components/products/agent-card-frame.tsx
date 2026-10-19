"use client";

import { AnimatePresence, motion, useAnimate, type DOMKeyframesDefinition } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { useAgentFocus, useAgentReveal } from "@/hooks/use-agent-focus";
import type { AgentFocusKind } from "@/store/agent-event-store";

/** How the card itself moves for each kind of agent focus. */
const CARD_MOTION: Partial<Record<AgentFocusKind, { keyframes: DOMKeyframesDefinition; duration: number }>> = {
  spotlight: { keyframes: { y: -6, scale: 1.03 }, duration: 0.4 },
  options: { keyframes: { y: -4, scale: 1.02 }, duration: 0.4 },
  added: { keyframes: { scale: [1, 1.05, 1] }, duration: 0.45 },
  error: { keyframes: { x: [0, -8, 8, -6, 6, -3, 0] }, duration: 0.5 },
};
const REST: DOMKeyframesDefinition = { y: 0, x: 0, scale: 1 };

/** The ring drawn around the card for each kind of focus. */
const RING: Record<AgentFocusKind, string> = {
  looking: "ring-1 ring-brand-500/40",
  spotlight: "ring-2 ring-brand-500 shadow-[0_0_48px_-8px] shadow-brand-500/70",
  options: "ring-2 ring-sky-400 shadow-[0_0_40px_-10px] shadow-sky-400/70",
  added: "ring-2 ring-brand-500 shadow-[0_0_40px_-10px] shadow-brand-500/80",
  removed: "ring-1 ring-zinc-400/50",
  error: "ring-2 ring-red-500 shadow-[0_0_40px_-10px] shadow-red-500/70",
};

/**
 * Client wrapper around a product card: shows what the voice agent is doing to this product
 * (scanning, naming it, offering it as an option, adding it, or failing), and lets cards
 * stream in one by one when the agent puts new results on screen.
 */
export function AgentCardFrame({
  productId,
  index = 0,
  className,
  children,
}: {
  productId: string;
  index?: number;
  className: string;
  children: ReactNode;
}) {
  const focus = useAgentFocus(productId);
  const reveal = useAgentReveal();
  // Decided once, on mount: only cards the agent just brought on screen stream in.
  const [streamIn] = useState(reveal);
  const [scope, animate] = useAnimate<HTMLElement>();
  const kind = focus?.kind;
  const seq = focus?.seq;

  // Each new agent action (seq) plays its effect, even on the same product twice in a row.
  useEffect(() => {
    if (!scope.current) return;
    const effect = kind ? CARD_MOTION[kind] : undefined;
    animate(scope.current, effect?.keyframes ?? REST, { duration: effect?.duration ?? 0.35, ease: [0.22, 1, 0.36, 1] });
  }, [kind, seq, animate, scope]);

  return (
    <motion.article
      ref={scope}
      data-agent-target={`product:${productId}`}
      initial={streamIn ? { opacity: 0, y: 18, filter: "blur(6px)" } : false}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={streamIn ? { delay: Math.min(index, 14) * 0.045, duration: 0.45 } : undefined}
      className={`${className} ${focus ? RING[focus.kind] : ""} transition-shadow duration-300`}
    >
      {children}

      {/* "Looking": a light sweep across the card while the agent scans the results. */}
      <AnimatePresence>
        {focus?.kind === "looking" && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[inherit]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.span
              className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-brand-400/25 to-transparent"
              initial={{ x: "-120%" }}
              animate={{ x: "260%" }}
              transition={{ duration: 1.1, delay: Math.min(focus.index, 10) * 0.06, ease: "easeInOut" }}
            />
          </motion.span>
        )}
      </AnimatePresence>

      {/* Chips that say why the card is lit up. */}
      <AnimatePresence>
        {focus && focus.kind !== "looking" && focus.kind !== "removed" && (
          <motion.span
            className={`absolute -top-2.5 right-3 z-30 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white shadow-lg ${
              focus.kind === "error" ? "bg-red-500" : focus.kind === "options" ? "bg-sky-500" : "bg-brand-600"
            }`}
            initial={{ opacity: 0, y: 6, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.8 }}
          >
            {focus.kind === "options"
              ? `Option ${focus.index + 1}`
              : focus.kind === "added"
                ? "Added by Cartiva"
                : focus.kind === "error"
                  ? "Can't add"
                  : "Cartiva's pick"}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
