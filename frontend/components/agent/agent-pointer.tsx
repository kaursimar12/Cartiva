"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useAgentEventStore } from "@/store/agent-event-store";

type Point = { x: number; y: number };

/** How long the pointer rests on each option before moving to the next. */
const HOP_MS = 900;

/** The on-screen element for a product: prefer one already in view (a product can appear twice on a page). */
function findTarget(productId: string): HTMLElement | null {
  const all = [...document.querySelectorAll<HTMLElement>(`[data-agent-target="product:${productId}"]`)];
  const inView = all.find((el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > 80 && r.top < window.innerHeight - 80 && r.right > 0 && r.left < window.innerWidth;
  });
  return inView ?? all[0] ?? null;
}

/** Where the pointer rests on a card: near the bottom right, over the Add button. */
function restingPoint(el: HTMLElement): Point {
  const r = el.getBoundingClientRect();
  return { x: r.right - Math.min(44, r.width / 3), y: r.bottom - 24 };
}

/**
 * A glowing cursor that glides to whatever product the agent is working on, scrolling it into
 * view first if needed, so it looks like the agent is operating the page. Hidden with reduced motion.
 */
export function AgentPointer() {
  const focus = useAgentEventStore((s) => s.focus);
  const reduce = useReducedMotion();
  // Where the pointer sits, remembered per product so a stale position is never shown.
  const [placed, setPlaced] = useState<{ productId: string; point: Point } | null>(null);
  // Which option the pointer is visiting, remembered per agent action so each new one starts at 1.
  const [tour, setTour] = useState({ seq: -1, hop: 0 });

  const ids = focus?.productIds ?? [];
  const hop = focus && tour.seq === focus.seq ? tour.hop : 0;
  // While scanning many results, just rest on the first; for options, visit each one in turn.
  const productId = focus ? (focus.kind === "options" ? ids[hop % ids.length] : ids[0]) : undefined;
  const point = !reduce && placed && placed.productId === productId ? placed.point : null;

  useEffect(() => {
    if (focus?.kind !== "options" || ids.length < 2) return;
    const seq = focus.seq;
    const timer = setInterval(() => setTour((t) => ({ seq, hop: (t.seq === seq ? t.hop : 0) + 1 })), HOP_MS);
    return () => clearInterval(timer);
  }, [focus?.kind, focus?.seq, ids.length]);

  useEffect(() => {
    if (!productId || reduce) return;
    const el = findTarget(productId);
    if (!el) return;

    const r = el.getBoundingClientRect();
    const offScreen = r.top < 80 || r.bottom > window.innerHeight - 90;
    if (offScreen && focus?.kind !== "looking") el.scrollIntoView({ behavior: "smooth", block: "center" });

    // Follow the card while the page scrolls (ours or the shopper's).
    let frame = 0;
    const follow = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setPlaced({ productId, point: restingPoint(el) }));
    };
    follow();
    window.addEventListener("scroll", follow, { passive: true });
    window.addEventListener("resize", follow);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", follow);
      window.removeEventListener("resize", follow);
    };
  }, [productId, focus?.kind, focus?.seq, reduce]);

  const tone =
    focus?.kind === "error" ? "bg-red-500 shadow-red-500/80" : focus?.kind === "options" ? "bg-sky-400 shadow-sky-400/80" : "bg-brand-500 shadow-brand-500/80";

  return (
    <AnimatePresence>
      {point && (
        <motion.div
          key="agent-pointer"
          aria-hidden
          className="pointer-events-none fixed top-0 left-0 z-[60]"
          initial={{ opacity: 0, scale: 0.4, x: point.x, y: point.y + 40 }}
          animate={{ opacity: 1, scale: 1, x: point.x, y: point.y }}
          exit={{ opacity: 0, scale: 0.4 }}
          transition={{ type: "spring", stiffness: 170, damping: 22, mass: 0.9 }}
        >
          {/* Cursor arrow with a glowing tip. */}
          <svg width="26" height="26" viewBox="0 0 24 24" className="-translate-x-1 -translate-y-1 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
            <path d="M4 3l15 7.5-6.2 1.7L10 19 4 3z" fill="white" stroke="black" strokeOpacity="0.4" strokeWidth="1" />
          </svg>
          <motion.span
            className={`absolute -top-2 -left-2 h-4 w-4 rounded-full shadow-[0_0_18px_4px] ${tone}`}
            animate={{ scale: [1, 1.6, 1], opacity: [0.9, 0.3, 0.9] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
          <span className="absolute top-6 left-4 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-background shadow-lg">
            Cartiva
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
