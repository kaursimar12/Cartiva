"use client";

import { AnimatePresence, motion } from "motion/react";
import { useAgentEventStore } from "@/store/agent-event-store";

/**
 * When the agent changes the page ("Opening vegetables…"), a progress beam runs across the top
 * of the screen with a small label, so the route change reads as the agent's doing.
 */
export function AgentNavigationToast() {
  const navigation = useAgentEventStore((s) => s.navigation);

  return (
    <AnimatePresence>
      {navigation && (
        <motion.div key={navigation.seq} aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[65]">
          <motion.div
            className="h-0.5 origin-left bg-gradient-to-r from-brand-400 via-sky-400 to-brand-500 shadow-[0_0_12px_2px] shadow-brand-500/60"
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.p
            className="glass mx-auto mt-3 w-fit rounded-full px-4 py-1.5 text-xs font-medium text-zinc-900 shadow-xl"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
          >
            <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500 align-middle" />
            {navigation.label}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
