"use client";

import { RoomAudioRenderer, SessionProvider, useSession } from "@livekit/components-react";
import type { ReactNode } from "react";
import { voiceTokenSource } from "@/lib/voice/token-source";

/** One voice session for the whole site, so it survives page navigation. */
export function VoiceProvider({ children }: { children: ReactNode }) {
  const session = useSession(voiceTokenSource);

  return (
    <SessionProvider session={session}>
      {children}
      <RoomAudioRenderer />
    </SessionProvider>
  );
}
