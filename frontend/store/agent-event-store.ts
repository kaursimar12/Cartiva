import { create } from "zustand";

/**
 * How the agent is touching a product right now:
 * looking (scanning results) · spotlight (naming one) · options (asking you to pick) ·
 * added / removed (cart changed) · error (stock or other problem).
 */
export type AgentFocusKind = "looking" | "spotlight" | "options" | "added" | "removed" | "error";

export interface AgentFocus {
  productIds: string[];
  kind: AgentFocusKind;
  /** Increases on every new focus, so the same product can animate twice in a row. */
  seq: number;
}

export interface AgentEventState {
  /** Products the agent is working on, for rings, the pointer and fly-to-cart. */
  focus: AgentFocus | null;
  /** A short "Opening Vegetables…" announcement while the agent changes page. */
  navigation: { label: string; seq: number } | null;
  /** True right after an agent search/category open: the next product grid streams in. */
  reveal: boolean;
  /** Checkout validated by voice; waiting for the shopper's spoken "yes" or "no". */
  pendingCheckout: boolean;
}

/** What the voice agent is doing to the page. State only: agentEventController decides the values. */
export const useAgentEventStore = create<AgentEventState>()(() => ({
  focus: null,
  navigation: null,
  reveal: false,
  pendingCheckout: false,
}));
