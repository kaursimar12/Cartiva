"use client";

import { MicIcon } from "@/components/common/icons";
import { useVoiceSession } from "@/hooks/use-voice-session";

/** Header voice entry point (SRS FR-01, FR-11): starts and stops the LiveKit voice session. */
export function VoiceButton({ compact = false }: { compact?: boolean }) {
  const { active, label, state, toggle } = useVoiceSession();

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      aria-pressed={active}
      aria-label={active ? "Stop Cartiva voice assistant" : "Ask Cartiva voice assistant"}
      className={`flex h-11 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors sm:px-4 ${
        active ? "bg-zinc-900 text-background" : "border border-hairline bg-surface text-zinc-800 hover:bg-zinc-50"
      }`}
    >
      <span className="relative flex h-5 w-5 items-center justify-center">
        {active && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-teal-400/50" />}
        <MicIcon className="relative h-5 w-5" />
      </span>
      {!compact && <span className="hidden sm:inline">{state === "disconnected" ? "Ask Cartiva" : label}</span>}
    </button>
  );
}
