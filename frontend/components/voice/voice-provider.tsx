"use client";

import { RoomAudioRenderer, SessionProvider, useSession } from "@livekit/components-react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { registerVoiceRpc } from "@/lib/voice/rpc";
import { voiceTokenSource } from "@/lib/voice/token-source";

/** One voice session for the whole site, so it survives page navigation. */
export function VoiceProvider({ children }: { children: ReactNode }) {
  const session = useSession(voiceTokenSource);
  const router = useRouter();

  // Let the voice agent call browser methods (cart.get, catalog.search, …) through the LiveKit room.
  useEffect(
    () => registerVoiceRpc(session.room, { navigate: (url) => router.push(url) }),
    [session.room, router],
  );

  return (
    <SessionProvider session={session}>
      {children}
      <RoomAudioRenderer />
    </SessionProvider>
  );
}
