"use client";

import { RoomAudioRenderer, SessionProvider, useSession } from "@livekit/components-react";
import { useEffect, type ReactNode } from "react"; // ★ added useEffect
import { voiceTokenSource } from "@/lib/voice/token-source";
import { registerVoiceRpc } from "@/lib/voice/rpc"; // ★ new import

/** One voice session for the whole site, so it survives page navigation. */
export function VoiceProvider({ children }: { children: ReactNode }) {
  const session = useSession(voiceTokenSource);

  useEffect(() => registerVoiceRpc(session.room), [session.room]);

  return (
    <SessionProvider session={session}>
      {children}
      <RoomAudioRenderer />
    </SessionProvider>
  );
}
