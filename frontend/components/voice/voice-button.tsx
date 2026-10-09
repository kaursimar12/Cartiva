"use client";

import { showToast } from "@/store/toast-store";

/** Voice assistant entry point (SRS FR-01, FR-11). Connects to LiveKit in Phase 6. */
export function VoiceButton({ compact = false }: { compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => showToast("Voice shopping is coming soon. For now, shop with search and taps.", "info")}
      className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-700 sm:px-4"
      aria-label="Ask Cartiva voice assistant"
    >
      <span aria-hidden>🎤</span>
      {!compact && <span className="hidden sm:inline">Ask Cartiva</span>}
    </button>
  );
}
