"use client";

import { useAgent, useSessionContext } from "@livekit/components-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { notifyAgent } from "@/lib/voice/rpc";
import { useShoppingListStore } from "@/store/shopping-list-store";

/**
 * Invisible: keeps the voice agent in step with list scanning, once per scan —
 * "list.scanning" while the photo is read (the agent says hello and that it's reading),
 * "list.scanned" when it's ready (the agent goes through it), "list.failed" if it couldn't be read.
 * Every voice session starts a fresh agent with no memory, so a new session on the scan-list page
 * is told about the list that's already there.
 */
export function VoiceListAnnouncer() {
  const session = useSessionContext();
  const agent = useAgent();
  const status = useShoppingListStore((s) => s.status);
  const scanId = useShoppingListStore((s) => s.scanId);
  const hasLines = useShoppingListStore((s) => s.lines.length > 0);
  const announced = useRef(0);
  const toldScanning = useRef(false);
  const toldFailure = useRef<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!agent.isConnected) {
      // The call ended: the next agent knows nothing, so it must be told again.
      announced.current = 0;
      toldScanning.current = false;
      toldFailure.current = null;
      return;
    }

    if (status.name === "scanning") {
      if (!toldScanning.current) notifyAgent(session.room, "list.scanning", {});
      toldScanning.current = true;
      return;
    }
    toldScanning.current = false;

    if (status.name === "error" && toldFailure.current !== status.message) {
      toldFailure.current = status.message;
      notifyAgent(session.room, "list.failed", { message: status.message });
      return;
    }

    // Only review the list on its own page; elsewhere the shopper may want something else.
    if (status.name === "ready" && hasLines && scanId !== 0 && announced.current !== scanId && pathname === "/scan-list") {
      announced.current = scanId;
      toldFailure.current = null;
      notifyAgent(session.room, "list.scanned", { scanId });
    }
  }, [agent.isConnected, status, hasLines, scanId, session.room, pathname]);

  return null;
}
