"use client";

import { AnimatePresence, motion, useAnimationFrame, useMotionValue, useReducedMotion } from "motion/react";
import { useId } from "react";

/** Who is making sound right now, which sets the sphere's speed and the colour of its waves. */
export type SphereMode = "idle" | "listening" | "user" | "thinking" | "speaking";

/** Seconds per turn of the iridescent rim: lazy when idle, fast while thinking. */
const SPIN_SECONDS: Record<SphereMode, number> = { idle: 16, listening: 11, user: 6, thinking: 2.2, speaking: 5 };

/** Wave colour: teal for Cartiva's voice, cool blue for the shopper's. */
const WAVE_COLOR: Partial<Record<SphereMode, string>> = {
  speaking: "rgba(45, 212, 191, 0.85)",
  user: "rgba(125, 211, 252, 0.85)",
};

const WAVES = 3;

/**
 * A glass voice sphere: black core, iridescent teal/blue/green rim, glowing edge.
 * Voice waves ripple out of it while someone speaks; `level` (0…1) is how loud.
 */
export function VoiceSphere({ mode, level = 0, size = 88 }: { mode: SphereMode; level?: number; size?: number }) {
  const reduce = useReducedMotion();
  const loud = Math.min(level * 2.2, 1); // voice volume is usually small; stretch it to 0…1
  const waveColor = WAVE_COLOR[mode];
  const emitting = !reduce && waveColor !== undefined && loud > 0.06;
  const spin = { animationDuration: `${SPIN_SECONDS[mode]}s` };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Voice waves: rings that grow out of the sphere and fade. */}
      <AnimatePresence>
        {emitting && (
          <motion.div
            key={mode}
            aria-hidden
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 + loud * 0.65 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {Array.from({ length: WAVES }, (_, i) => (
              <motion.span
                key={i}
                className="absolute inset-0 rounded-full"
                style={{ border: `1.5px solid ${waveColor}`, boxShadow: `0 0 18px ${waveColor}` }}
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 2.4 + loud * 0.8, opacity: 0 }}
                transition={{ duration: 1.8, repeat: Infinity, delay: (i * 1.8) / WAVES, ease: "easeOut" }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Soft halo behind the sphere; brighter while someone speaks. */}
      <motion.div
        aria-hidden
        className="absolute -inset-[30%] rounded-full bg-[radial-gradient(circle,rgba(45,212,191,0.45)_0%,rgba(56,189,248,0.18)_45%,transparent_70%)] blur-xl"
        animate={{ opacity: mode === "idle" ? 0.4 : 0.6 + loud * 0.4, scale: 1 + loud * 0.15 }}
        transition={{ duration: 0.2 }}
      />

      {/* The sphere: swells a little with the voice, breathes while waiting. */}
      <motion.div
        className="relative h-full w-full overflow-hidden rounded-full bg-black"
        style={{
          boxShadow:
            "0 0 0 1.5px rgba(94,234,212,0.75), 0 0 22px 2px rgba(45,212,191,0.55), inset 0 0 14px 2px rgba(56,189,248,0.55)",
        }}
        animate={
          emitting || mode === "speaking"
            ? { scale: 1 + loud * 0.12 }
            : { scale: mode === "thinking" ? [0.96, 1.02, 0.96] : [0.98, 1.02, 0.98] }
        }
        transition={
          emitting || mode === "speaking"
            ? { type: "spring", stiffness: 420, damping: 18 }
            : { duration: mode === "thinking" ? 1.2 : 3.2, repeat: Infinity, ease: "easeInOut" }
        }
      >
        {/* Deep water: the liquid the colours move through. */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,#06302c_0%,#03100f_55%,#000_80%)]" />

        {/* Liquid colour clouds, each drifting on its own slow path. */}
        <FluidBlobs mode={mode} reduce={!!reduce} />

        {/* Glowing waves circling through the middle; taller when someone speaks. */}
        <InnerWaves mode={mode} loud={loud} reduce={!!reduce} />

        {/* Iridescent rim: a spinning colour wheel, masked to a thin edge like a soap bubble. */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            maskImage: "radial-gradient(circle, transparent 58%, black 80%)",
            WebkitMaskImage: "radial-gradient(circle, transparent 58%, black 80%)",
          }}
        >
          <div
            className="absolute -inset-[15%] animate-spin bg-[conic-gradient(from_0deg,#10b981,#06b6d4,#2563eb,#22d3ee,#34d399,#0ea5e9,#10b981)] blur-[5px]"
            style={spin}
          />
        </div>

        {/* Glass: a soft sheen on the upper left (no hard highlight) + inner rim. */}
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.22),transparent_38%)]" />
        <span className="absolute inset-0 rounded-full ring-1 ring-white/25 ring-inset" />
      </motion.div>
    </div>
  );
}

/** How fast the liquid moves: one loop's length in seconds per mode (smaller = livelier). */
const FLOW_SECONDS: Record<SphereMode, number> = { idle: 7, listening: 5, user: 2.6, thinking: 1.8, speaking: 2.2 };

/** Colour clouds: colour, size and the path each one drifts along (in % of the sphere). */
const BLOBS = [
  { color: "bg-teal-400", size: "70%", x: ["-20%", "25%", "-5%"], y: ["10%", "-15%", "20%"], k: 1 },
  { color: "bg-blue-600", size: "65%", x: ["30%", "-10%", "35%"], y: ["35%", "10%", "-5%"], k: 1.3 },
  { color: "bg-emerald-400", size: "55%", x: ["10%", "40%", "0%"], y: ["-20%", "30%", "10%"], k: 0.8 },
  { color: "bg-cyan-300", size: "40%", x: ["40%", "5%", "25%"], y: ["50%", "25%", "45%"], k: 1.6 },
] as const;

function FluidBlobs({ mode, reduce }: { mode: SphereMode; reduce: boolean }) {
  const base = FLOW_SECONDS[mode];
  return (
    <div className="absolute inset-0 mix-blend-screen">
      {BLOBS.map((blob, i) => (
        <motion.span
          key={i}
          className={`absolute top-0 left-0 rounded-full opacity-50 ${blob.color}`}
          style={{ width: blob.size, height: blob.size, filter: "blur(10px)" }}
          animate={reduce ? { x: blob.x[0], y: blob.y[0] } : { x: [...blob.x], y: [...blob.y] }}
          transition={{ duration: base * 1.8 * blob.k, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/** A sine wave across x = 0…400 (two copies of the 200-wide view), so sliding it left by 200 loops seamlessly. */
function wavePath(amplitude: number, period: number, offset: number): string {
  let d = "";
  for (let x = 0; x <= 400; x += 4) {
    const y = 50 + offset + amplitude * Math.sin((2 * Math.PI * x) / period);
    d += `${x === 0 ? "M" : "L"}${x} ${y.toFixed(2)} `;
  }
  return d;
}

/** Three waves: shape, colour, line width (px), drift speed, and how fast they circle (deg/s, sign = direction). */
const WAVES_INSIDE = [
  { d: wavePath(9, 100, 0), stroke: "a", width: 1.1, k: 1, spin: 38 },
  { d: wavePath(6, 66.666, 0), stroke: "b", width: 0.8, k: 1.35, spin: -27 },
  { d: wavePath(12, 200, 0), stroke: "a", width: 0.6, k: 0.75, spin: 19 },
] as const;

/** How fast the waves circle (×) per mode. */
const SPIN_PACE: Record<SphereMode, number> = { idle: 0.4, listening: 0.7, user: 1.6, thinking: 2.6, speaking: 1.8 };

/**
 * Voice waves inside the sphere: three sine waves that flow along themselves and also circle
 * around the centre at their own speeds (the middle one the other way). Taller when someone speaks.
 */
function InnerWaves({ mode, loud, reduce }: { mode: SphereMode; loud: number; reduce: boolean }) {
  const id = useId();
  const base = FLOW_SECONDS[mode];
  // Calm ripples while waiting; tall waves that follow the voice while someone speaks.
  const height = mode === "speaking" || mode === "user" ? 0.6 + loud * 1.6 : mode === "thinking" ? 1.1 : 0.55;

  // Angles accumulate frame by frame, so a speed change (new mode) never makes the waves jump.
  const angle0 = useMotionValue(0);
  const angle1 = useMotionValue(0);
  const angle2 = useMotionValue(0);
  const angles = [angle0, angle1, angle2];
  useAnimationFrame((_, delta) => {
    if (reduce) return;
    const seconds = (delta / 1000) * SPIN_PACE[mode];
    WAVES_INSIDE.forEach((wave, i) => angles[i].set(angles[i].get() + wave.spin * seconds));
  });

  return (
    <div className="absolute inset-0 mix-blend-screen" style={{ filter: "drop-shadow(0 0 1.5px rgba(94,234,212,0.85))" }}>
      <svg className="absolute h-0 w-0" aria-hidden>
        <defs>
          <linearGradient id={`${id}a`} x1="0" x2="1">
            <stop offset="0%" stopColor="#5eead4" />
            <stop offset="50%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
          <linearGradient id={`${id}b`} x1="0" x2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
        </defs>
      </svg>
      {WAVES_INSIDE.map((wave, i) => (
        // Each wave turns around the sphere's centre.
        <motion.div key={i} className="absolute inset-0" style={{ rotate: angles[i] }}>
          <motion.div
            className="absolute inset-x-[6%] inset-y-[18%]"
            style={{
              maskImage: "linear-gradient(90deg, transparent, black 22%, black 78%, transparent)",
              WebkitMaskImage: "linear-gradient(90deg, transparent, black 22%, black 78%, transparent)",
            }}
            animate={{ scaleY: height }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
              <motion.path
                d={wave.d}
                fill="none"
                stroke={`url(#${id}${wave.stroke})`}
                strokeWidth={wave.width}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                animate={reduce ? undefined : { x: [0, -200] }}
                transition={{ duration: base * wave.k, repeat: Infinity, ease: "linear" }}
              />
            </svg>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}
