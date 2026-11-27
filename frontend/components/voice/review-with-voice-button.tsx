"use client";

import { MicIcon } from "@/components/common/icons";
import { useVoiceSession } from "@/hooks/use-voice-session";
import { brand } from "@/lib/brand";

/** Starts a voice session so Cartiva reads the scanned list aloud (the announcer tells the agent). */
export function ReviewWithVoiceButton() {
  const { active, start } = useVoiceSession();

  if (active) {
    return (
      <p className="flex items-center gap-2 text-sm text-zinc-600" role="status">
        <MicIcon className="h-4 w-4 animate-pulse text-brand-600" /> {brand.assistant.name} is reviewing your list with you.
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void start()}
      className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-800 hover:bg-brand-100"
    >
      <MicIcon className="h-4 w-4" /> Review with {brand.assistant.name}
    </button>
  );
}
