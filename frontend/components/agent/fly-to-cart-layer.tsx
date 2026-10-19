"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useAgentEventStore } from "@/store/agent-event-store";

interface Flight {
  id: number;
  src: string;
  from: DOMRect;
  to: DOMRect;
}

/** The product photo on screen for a product, if its card is visible. */
function productImage(productId: string): HTMLImageElement | null {
  const cards = document.querySelectorAll<HTMLElement>(`[data-agent-target="product:${productId}"]`);
  for (const card of cards) {
    const img = card.querySelector("img");
    const r = img?.getBoundingClientRect();
    if (img && r && r.bottom > 0 && r.top < window.innerHeight) return img;
  }
  return null;
}

/**
 * When the agent adds a product, a copy of its photo flies along a curve into the header cart —
 * the clearest sign that the agent, not the shopper, just pressed Add.
 */
export function FlyToCartLayer() {
  const reduce = useReducedMotion();
  const [flights, setFlights] = useState<Flight[]>([]);

  // Each time the agent adds a product, launch a flight from its photo to the cart.
  useEffect(() => {
    if (reduce) return;
    return useAgentEventStore.subscribe((state, before) => {
      const focus = state.focus;
      if (focus?.kind !== "added" || focus.seq === before.focus?.seq) return;
      const img = productImage(focus.productIds[0]);
      const cart = document.getElementById("cart-link");
      if (!img || !cart) return;

      const flight = { id: focus.seq, src: img.currentSrc || img.src, from: img.getBoundingClientRect(), to: cart.getBoundingClientRect() };
      setFlights((all) => [...all, flight]);
    });
  }, [reduce]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70]">
      {flights.map(({ id, src, from, to }) => {
        const size = Math.min(from.width, 160);
        const start = { x: from.left + from.width / 2 - size / 2, y: from.top + from.height / 2 - size / 2 };
        const end = { x: to.left + to.width / 2 - size / 2, y: to.top + to.height / 2 - size / 2 };
        const peak = Math.max(8, Math.min(start.y, end.y) - 120); // arc upwards (but stay on screen) before dropping in

        return (
          <motion.img
            key={id}
            src={src}
            alt=""
            className="absolute top-0 left-0 rounded-2xl object-cover shadow-2xl ring-2 ring-brand-500"
            style={{ width: size, height: size }}
            initial={{ x: start.x, y: start.y, scale: 1, opacity: 1 }}
            animate={{
              x: [start.x, (start.x + end.x) / 2, end.x],
              y: [start.y, peak, end.y],
              scale: [1, 0.7, 0.12],
              opacity: [1, 1, 0.2],
              rotate: [0, -8, 0],
            }}
            transition={{ duration: 0.85, ease: [0.5, 0, 0.2, 1], times: [0, 0.45, 1] }}
            onAnimationComplete={() => setFlights((all) => all.filter((f) => f.id !== id))}
          />
        );
      })}
    </div>
  );
}
