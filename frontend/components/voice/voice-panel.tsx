"use client";

import {
  BarVisualizer,
  type ReceivedAgentTranscriptionMessage,
  type ReceivedUserTranscriptionMessage,
  useAgent,
  useSessionContext,
  useSessionMessages,
} from "@livekit/components-react";
import { useEffect, useRef } from "react";
import { CheckIcon, CloseIcon } from "@/components/common/icons";
import { useVoiceActivityStore } from "@/store/voice-activity-store";

type Transcript = ReceivedUserTranscriptionMessage | ReceivedAgentTranscriptionMessage;

const STATE_TEXT: Record<string, string> = {
  connecting: "Connecting…",
  "pre-connect-buffering": "Connecting…",
  initializing: "Starting…",
  idle: "Starting…",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…",
};

const MAX_LINES = 8;

/** Floating panel during a voice call: state, audio bars, live transcript and what the agent is doing. */
export function VoicePanel() {
  const session = useSessionContext();
  const agent = useAgent();
  const { messages } = useSessionMessages();
  const activity = useVoiceActivityStore((s) => s.activity);
  const listRef = useRef<HTMLOListElement>(null);

  const transcript = messages
    .filter((m): m is Transcript => m.type === "userTranscript" || m.type === "agentTranscript")
    .slice(-MAX_LINES);
  const lastLine = transcript.at(-1)?.message;

  // Keep the newest line in view (also while it grows word by word).
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [transcript.length, lastLine]);

  const active = agent.state !== "disconnected" && agent.state !== "failed";
  if (!active) return null;

  return (
    <aside
      aria-label="Cartiva voice assistant"
      className="fixed inset-x-3 bottom-3 z-50 flex max-h-[55vh] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-surface shadow-xl sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-96"
    >
      <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
        <BarVisualizer
          state={agent.state}
          track={agent.microphoneTrack}
          barCount={5}
          className="flex h-6 w-10 items-center justify-center gap-1 [&>span]:w-1.5 [&>span]:rounded-full [&>span]:bg-zinc-300 [&>span]:transition-all [&>[data-lk-highlighted=true]]:bg-brand-600"
        />
        <p className="flex-1 text-sm font-semibold" aria-live="polite">
          {STATE_TEXT[agent.state] ?? "Cartiva"}
        </p>
        <button
          type="button"
          onClick={() => void session.end()}
          className="rounded-lg p-2 text-zinc-500 hover:bg-surface-muted hover:text-zinc-900"
          aria-label="End voice session"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </header>

      <ol ref={listRef} aria-live="polite" aria-label="Conversation" className="flex-1 space-y-2 overflow-y-auto px-4 py-3 text-sm">
        {transcript.length === 0 && <li className="text-zinc-500">Try: “Show me vegetables” or “What’s in my cart?”</li>}
        {transcript.map((m) => (
          <li
            key={m.id}
            className={
              m.type === "userTranscript"
                ? "ml-10 rounded-xl rounded-br-sm bg-brand-600 px-3 py-2 text-white"
                : "mr-10 rounded-xl rounded-bl-sm bg-surface-muted px-3 py-2 text-zinc-800"
            }
          >
            <span className="sr-only">{m.type === "userTranscript" ? "You: " : "Cartiva: "}</span>
            {m.message}
          </li>
        ))}
      </ol>

      {activity && (
        <p
          role="status"
          className={`flex items-center gap-2 border-t border-zinc-100 px-4 py-2.5 text-sm font-medium ${
            activity.state === "error" ? "text-red-700" : activity.state === "done" ? "text-brand-700" : "text-zinc-700"
          }`}
        >
          {activity.state === "running" && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" aria-hidden />
          )}
          {activity.state === "done" && <CheckIcon className="h-4 w-4" />}
          {activity.label}
        </p>
      )}
    </aside>
  );
}
