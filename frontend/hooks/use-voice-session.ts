"use client";

import { useSessionContext } from "@livekit/components-react";
import { voiceSessionController } from "@/controllers/voice-session-controller";
import { startProblem } from "@/lib/voice/voice-errors";
import { useVoiceAgentStore } from "@/store/voice-agent-store";

/** What a voice control says for each agent state (SRS FR-12). */
const STATUS_LABELS: Record<string, string> = {
  disconnected: "Ask Cartiva",
  connecting: "Connecting…",
  "pre-connect-buffering": "Connecting…",
  initializing: "Agent joining…",
  idle: "Agent joining…",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…",
  failed: "Try again",
  reconnecting: "Reconnecting…",
};

/**
 * The voice session as seen by a start/stop control (header mic, hero sphere):
 * whether it is on, what to call it right now, and a toggle. Problems are reported by voiceSessionController.
 */
export function useVoiceSession() {
  const session = useSessionContext();
  // Not useAgent(): this hook is used by page components that mount and unmount mid-call (see the store).
  const state = useVoiceAgentStore((s) => s.state);
  const greeted = useVoiceAgentStore((s) => s.greeted);

  const active = state !== "disconnected" && state !== "failed";
  const reconnecting = session.connectionState === "reconnecting" || session.connectionState === "signalReconnecting";
  // Until Cartiva has introduced itself it isn't really listening yet, so don't say "Listening…".
  const joining = active && !greeted && state !== "speaking";
  const label = reconnecting
    ? STATUS_LABELS.reconnecting
    : joining
      ? "Cartiva is joining…"
      : (STATUS_LABELS[state] ?? "Ask Cartiva");

  async function start() {
    if (active) return;
    try {
      await session.start({ tracks: { microphone: { enabled: true } } });
    } catch (error) {
      voiceSessionController.reportProblem(startProblem(error));
    }
  }

  async function toggle() {
    if (!active) return start();
    try {
      await session.end();
    } catch (error) {
      voiceSessionController.reportProblem(startProblem(error));
    }
  }

  return { active, label, state, start, toggle };
}
