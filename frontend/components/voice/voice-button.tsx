"use client";

import { MicIcon } from "@/components/common/icons";
import { useVoiceSession } from "@/hooks/use-voice-session";
import { brand } from "@/lib/brand";

/** Header voice entry point (SRS FR-01, FR-11): starts and stops the LiveKit voice session. */
export function VoiceButton({ compact = false }: { compact?: boolean }) {
  const { active, label, state, toggle } = useVoiceSession();

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      aria-pressed={active}
      aria-label={active ? `Stop ${brand.assistant.name} voice assistant` : `Ask ${brand.assistant.name} voice assistant`}
      // The main feature, so the strongest button in the header: filled brand green (dark while a call runs).
      className={`flex h-11 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-semibold transition-colors sm:px-5 ${
        active ? "bg-zinc-900 text-background" : "bg-brand-600 text-white hover:bg-brand-700"
      }`}
    >
      <span className="relative flex h-5 w-5 items-center justify-center">
        {active && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-teal-400/50" />}
        <MicIcon className="relative h-5 w-5" />
      </span>
      {!compact && <span className="hidden sm:inline">{state === "disconnected" ? `Ask ${brand.assistant.name}` : label}</span>}
    </button>
  );
}
