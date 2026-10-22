"use client";

import { useAgent } from "@livekit/components-react";
import { useEffect } from "react";
import { useVoiceAgentStore } from "@/store/voice-agent-store";

/**
 * Invisible, mounted once for the whole session (in VoiceProvider): copies the agent's state into
 * useVoiceAgentStore, so components that come and go with pages never call useAgent() themselves.
 */
export function VoiceAgentBridge() {
  const { state } = useAgent();

  useEffect(() => {
    const { greeted } = useVoiceAgentStore.getState();
    useVoiceAgentStore.setState({
      state,
      // Spoken once → greeted; a new call (disconnected) starts over.
      greeted: state === "disconnected" || state === "failed" ? false : greeted || state === "speaking",
    });
  }, [state]);

  return null;
}
