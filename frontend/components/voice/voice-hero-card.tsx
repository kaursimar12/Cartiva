"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import type { PointerEvent } from "react";
import { VoiceSphere } from "@/components/agent/voice-sphere";
import { useVoiceSession } from "@/hooks/use-voice-session";

const EXAMPLES = ["“Add 2 kg potatoes”", "“Dishwashing liquid under ₹200”", "“Which one is cheapest?”"];

/** How far (px) the sphere leans toward the cursor. */
const PULL = 18;

/** The home page's voice entry: the Cartiva sphere on a dark stage. Tap it to start talking. */
export function VoiceHeroCard() {
  const { active, label, toggle } = useVoiceSession();
  const reduce = useReducedMotion();

  // The sphere drifts gently toward the pointer, like it's paying attention.
  const x = useSpring(useMotionValue(0), { stiffness: 120, damping: 16 });
  const y = useSpring(useMotionValue(0), { stiffness: 120, damping: 16 });

  function follow(event: PointerEvent<HTMLButtonElement>) {
    if (reduce) return;
    const r = event.currentTarget.getBoundingClientRect();
    x.set(((event.clientX - r.left) / r.width - 0.5) * 2 * PULL);
    y.set(((event.clientY - r.top) / r.height - 0.5) * 2 * PULL);
  }

  function release() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.button
      type="button"
      onClick={() => void toggle()}
      onPointerMove={follow}
      onPointerLeave={release}
      aria-pressed={active}
      aria-label={active ? "Stop Cartiva voice assistant" : "Start talking to Cartiva"}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="group relative isolate flex h-full min-h-[22rem] w-full flex-col items-center justify-center overflow-hidden rounded-[1.75rem] bg-[#07090a] px-6 py-10 text-center text-white"
    >
      {/* Dot grid that slowly drifts, and a teal light that follows the sphere. */}
      <motion.span
        aria-hidden
        className="absolute -inset-10 -z-10 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.09)_1px,transparent_1px)] [background-size:22px_22px]"
        animate={reduce ? undefined : { x: [0, -22], y: [0, -22] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
      <motion.span
        aria-hidden
        style={{ x, y }}
        className="absolute top-1/2 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 -translate-y-[62%] rounded-full bg-teal-500/20 blur-3xl"
      />

      {/* The sphere floats, and leans toward the cursor. */}
      <motion.span style={{ x, y }} className="block">
        <motion.span
          className="block"
          animate={reduce ? undefined : { y: [0, -10, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="block transition-transform duration-500 ease-luxe group-hover:scale-105">
            <VoiceSphere mode={active ? "listening" : "idle"} size={150} />
          </span>
        </motion.span>
      </motion.span>

      <span className="mt-10 text-lg font-medium tracking-tight">{active ? label : "Tap to talk to Cartiva"}</span>
      <span className="mt-1 text-sm text-white/55">It shops the store for you, right on this screen.</span>
      <span className="mt-6 flex flex-wrap justify-center gap-2">
        {EXAMPLES.map((example, i) => (
          <motion.span
            key={example}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 transition-colors group-hover:border-white/20"
          >
            {example}
          </motion.span>
        ))}
      </span>
    </motion.button>
  );
}
