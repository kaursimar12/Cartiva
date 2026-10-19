"use client";

import { useAgent, useTrackVolume } from "@livekit/components-react";
import { AnimatePresence, motion } from "motion/react";

/**
 * A soft green glow around the edges of the screen while the agent is on the call:
 * it breathes while listening, flickers while thinking and swells with the agent's voice.
 * Purely decorative; it never blocks clicks.
 */
export function AgentAura() {
  const agent = useAgent();
  const volume = useTrackVolume(agent.microphoneTrack);
  const active = agent.state !== "disconnected" && agent.state !== "failed";

  const animate =
    agent.state === "speaking"
      ? { opacity: 0.55 + Math.min(volume, 1) * 0.45 }
      : agent.state === "thinking"
        ? { opacity: [0.35, 0.8, 0.35] }
        : { opacity: [0.25, 0.45, 0.25] };
  const transition =
    agent.state === "speaking"
      ? { duration: 0.12 }
      : { duration: agent.state === "thinking" ? 1.2 : 3.2, repeat: Infinity, ease: "easeInOut" as const };

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="agent-aura"
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[45]"
          initial={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          animate={animate}
          transition={transition}
          style={{
            boxShadow:
              "inset 0 0 140px -30px color-mix(in oklab, var(--color-brand-500) 80%, transparent), inset 0 0 2px 1px color-mix(in oklab, var(--color-brand-400) 50%, transparent)",
          }}
        />
      )}
    </AnimatePresence>
  );
}
