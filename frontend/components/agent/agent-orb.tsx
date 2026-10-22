"use client";

import { useAgent, useLocalParticipant, useSessionContext, useTrackVolume } from "@livekit/components-react";
import type { LocalAudioTrack } from "livekit-client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect } from "react";
import { CheckIcon, CloseIcon } from "@/components/common/icons";
import { agentEventController } from "@/controllers/agent-event-controller";
import { useVoiceActivityStore } from "@/store/voice-activity-store";
import { useVoiceAgentStore } from "@/store/voice-agent-store";
import { VoiceSphere, type SphereMode } from "./voice-sphere";

/** What the caption says when the agent isn't running an action. */
const STATE_TEXT: Record<string, string> = {
  connecting: "Connecting…",
  "pre-connect-buffering": "Connecting…",
  initializing: "Cartiva is joining…",
  idle: "Cartiva is joining…",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking",
};

/** Above this volume the shopper counts as speaking (filters out room noise). */
const USER_SPEAKING_LEVEL = 0.04;

/**
 * The agent's presence during a voice session: a glass voice sphere that sends out waves
 * while Cartiva or the shopper speaks, plus one line saying what the agent is doing.
 * It opens large in the middle of the screen, then docks at the bottom so the page stays usable.
 * There is deliberately no chat history — the page itself shows what the agent did.
 */
export function AgentOrb() {
  const session = useSessionContext();
  const agent = useAgent();
  const { microphoneTrack } = useLocalParticipant();
  const activity = useVoiceActivityStore((s) => s.activity);
  const reduce = useReducedMotion();

  const agentLevel = useTrackVolume(agent.microphoneTrack); // 0…1, Cartiva's voice
  const userLevel = useTrackVolume(microphoneTrack?.track as LocalAudioTrack | undefined); // 0…1, the shopper's mic

  const active = agent.state !== "disconnected" && agent.state !== "failed";
  const userSpeaking = agent.state === "listening" && userLevel > USER_SPEAKING_LEVEL;
  const mode: SphereMode =
    agent.state === "speaking"
      ? "speaking"
      : agent.state === "thinking"
        ? "thinking"
        : userSpeaking
          ? "user"
          : agent.state === "listening"
            ? "listening"
            : "idle";
  const level = mode === "speaking" ? agentLevel : mode === "user" ? userLevel : 0;

  // Before Cartiva's first words it isn't listening yet (it introduces itself first).
  const greeted = useVoiceAgentStore((s) => s.greeted);
  const joining = !greeted && agent.state !== "speaking";
  const caption =
    activity?.label ??
    (joining ? "Cartiva is joining…" : userSpeaking ? "Go on, I'm listening…" : (STATE_TEXT[agent.state] ?? "Cartiva"));
  const captionKey = activity ? `${activity.state}:${activity.label}` : joining ? "joining" : userSpeaking ? "user" : agent.state;

  // Leave room at the bottom of the page so the dock never covers the last buttons.
  useEffect(() => {
    if (!active) return;
    document.body.dataset.voice = "on";
    return () => {
      delete document.body.dataset.voice;
      agentEventController.reset(); // the call ended: nothing on screen is the agent's any more
    };
  }, [active]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <AnimatePresence>
        {active && (
          <motion.aside
            key="agent-orb"
            aria-label="Cartiva voice assistant"
            className="flex flex-col items-center gap-3"
            exit={{ opacity: 0, y: 30, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            {/* Light fade-and-rise: this plays during "Hi, I'm Cartiva", so it must stay cheap for the browser. */}
            <motion.div
              initial={reduce ? false : { y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <VoiceSphere mode={mode} level={level} size={84} />
            </motion.div>

            <motion.div
              className="glass pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full py-1.5 pr-1.5 pl-4 shadow-2xl"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0 : 0.15 }}
            >
              <div className="relative min-w-0 overflow-hidden" aria-live="polite" role="status">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.p
                    key={captionKey}
                    initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                    transition={{ duration: 0.28 }}
                    className={`flex max-w-[16rem] items-center gap-1.5 text-sm font-medium sm:max-w-xs ${
                      activity?.state === "error" ? "text-red-500" : "text-zinc-900"
                    }`}
                  >
                    {activity?.state === "running" && (
                      <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" aria-hidden />
                    )}
                    {activity?.state === "done" && <CheckIcon className="h-4 w-4 shrink-0 text-teal-400" />}
                    <span className="truncate">{caption}</span>
                  </motion.p>
                </AnimatePresence>
              </div>
              <button
                type="button"
                onClick={() => void session.end()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                aria-label="End voice session"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </motion.div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
