"use client";

import { useAgent, useSessionContext } from "@livekit/components-react";
import { MicIcon } from "@/components/common/icons";
import { voiceSessionController } from "@/controllers/voice-session-controller";
import { startProblem } from "@/lib/voice/voice-errors";

/** Starts a voice session so Cartiva reads the scanned list aloud (the announcer tells the agent). */
export function ReviewWithVoiceButton() {
  const session = useSessionContext();
  const agent = useAgent();
  const active = agent.state !== "disconnected" && agent.state !== "failed";

  if (active) {
    return (
      <p className="flex items-center gap-2 text-sm text-zinc-600" role="status">
        <MicIcon className="h-4 w-4 animate-pulse text-brand-600" /> Cartiva is reviewing your list with you.
      </p>
    );
  }

  async function start() {
    try {
      await session.start({ tracks: { microphone: { enabled: true } } });
    } catch (error) {
      voiceSessionController.reportProblem(startProblem(error));
    }
  }

  return (
    <button
      type="button"
      onClick={start}
      className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-800 hover:bg-brand-100"
    >
      <MicIcon className="h-4 w-4" /> Review with Cartiva
    </button>
  );
}
