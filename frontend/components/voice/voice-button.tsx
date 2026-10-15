"use client";

import { useAgent, useSessionContext } from "@livekit/components-react";
import { MicIcon } from "@/components/common/icons";
import { showToast } from "@/store/toast-store";

/** What the button says for each agent state (SRS FR-12). */
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
};

/** Voice assistant entry point (SRS FR-01, FR-11): starts and stops the LiveKit voice session. */
export function VoiceButton({ compact = false }: { compact?: boolean }) {
  const session = useSessionContext();
  const agent = useAgent();

  const active = agent.state !== "disconnected" && agent.state !== "failed";
  const label = STATUS_LABELS[agent.state] ?? "Ask Cartiva";

  async function toggle() {
    try {
      if (active) {
        await session.end();
      } else {
        await session.start({ tracks: { microphone: { enabled: true } } });
      }
    } catch {
      showToast("Couldn't start voice. Check your microphone permission and try again.", "error");
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={active}
      aria-label={active ? "Stop Cartiva voice assistant" : "Ask Cartiva voice assistant"}
      className={`flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors sm:px-4 ${
        active ? "border-foreground bg-foreground text-background" : "border-zinc-200 bg-surface text-zinc-800 hover:bg-zinc-50"
      }`}
    >
      <MicIcon className={`h-5 w-5 ${agent.state === "listening" ? "animate-pulse" : ""}`} />
      {!compact && <span className="hidden sm:inline">{label}</span>}
    </button>
  );
}
