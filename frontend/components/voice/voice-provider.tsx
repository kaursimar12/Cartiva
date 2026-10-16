"use client";

import { RoomAudioRenderer, SessionProvider, useSession } from "@livekit/components-react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { notifyAgent, registerVoiceRpc } from "@/lib/voice/rpc";
import { voiceTokenSource } from "@/lib/voice/token-source";
import { VoiceErrorReporter } from "./voice-error-reporter";

/** One voice session for the whole site, so it survives page navigation. */
export function VoiceProvider({ children }: { children: ReactNode }) {
  const session = useSession(voiceTokenSource);
  const router = useRouter();

  // Let the voice agent call browser methods (cart.get, catalog.search, …) through the LiveKit room,
  // and let the browser tell the agent about results (payment.result).
  useEffect(
    () =>
      registerVoiceRpc(session.room, {
        navigate: (url) => router.push(url),
        notifyAgent: (method, payload) => notifyAgent(session.room, method, payload),
      }),
    [session.room, router],
  );

  return (
    <SessionProvider session={session}>
      {children}
      <RoomAudioRenderer />
      <VoiceErrorReporter />
    </SessionProvider>
  );
}
