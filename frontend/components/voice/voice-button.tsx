"use client";

import { MicIcon } from "@/components/common/icons";
import { showToast } from "@/store/toast-store";

/** Voice assistant entry point (SRS FR-01, FR-11). Connects to LiveKit in Phase 6. */
export function VoiceButton({ compact = false }: { compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => showToast("Voice shopping is coming soon. For now, shop with search and taps.", "info")}
      className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50 sm:px-4"
      aria-label="Ask Cartiva voice assistant"
    >
      <MicIcon className="h-5 w-5" />
      {!compact && <span className="hidden sm:inline">Ask Cartiva</span>}
    </button>
  );
}
