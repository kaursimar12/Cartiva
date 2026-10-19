"use client";

import { useAgentEventStore, type AgentFocusKind } from "@/store/agent-event-store";

export interface ProductFocus {
  kind: AgentFocusKind;
  /** Changes on every new agent action, so the same effect can replay. */
  seq: number;
  /** Position among the products in focus (for "option 1 / 2 / 3"). */
  index: number;
  total: number;
}

/** Read-only view model: is the voice agent working on this product right now, and how? */
export function useAgentFocus(productId: string): ProductFocus | null {
  const focus = useAgentEventStore((s) => s.focus);
  if (!focus) return null;
  const index = focus.productIds.indexOf(productId);
  return index === -1 ? null : { kind: focus.kind, seq: focus.seq, index, total: focus.productIds.length };
}

/** True while an agent search or category open is putting new products on screen. */
export function useAgentReveal(): boolean {
  return useAgentEventStore((s) => s.reveal);
}
