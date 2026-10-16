"use client";

import { useAgent, useSessionContext } from "@livekit/components-react";
import { useEffect, useRef } from "react";
import { notifyAgent } from "@/lib/voice/rpc";
import { useShoppingListStore } from "@/store/shopping-list-store";

/**
 * Invisible: when a new shopping list has been scanned and the voice agent is connected,
 * tells the agent once, so it reads the list aloud and asks what to do.
 */
export function VoiceListAnnouncer() {
  const session = useSessionContext();
  const agent = useAgent();
  const scanId = useShoppingListStore((s) => s.scanId);
  const hasLines = useShoppingListStore((s) => s.lines.length > 0);
  const announced = useRef(0);

  useEffect(() => {
    if (!agent.isConnected || !hasLines || scanId === 0 || announced.current === scanId) return;
    announced.current = scanId;
    notifyAgent(session.room, "list.scanned", { scanId });
  }, [agent.isConnected, hasLines, scanId, session.room]);

  return null;
}
