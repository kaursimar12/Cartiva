import { useAgentEventStore, type AgentEventState, type AgentFocusKind } from "@/store/agent-event-store";

/** How long a highlight stays: long enough for the agent to finish its sentence about it. */
const FOCUS_MS: Record<AgentFocusKind, number> = {
  looking: 1800,
  added: 2200,
  removed: 2200,
  error: 3000,
  spotlight: 6000,
  options: 9000,
};
const NAVIGATION_MS = 1600;
const REVEAL_MS = 2500;

type Payload = Record<string, unknown>;
type Focus = { productIds: string[]; kind: AgentFocusKind };

/** The changes one voice event makes to the page; `undefined` fields are left as they are. */
export interface AgentEffects {
  focus?: Focus | null;
  navigation?: string | null;
  reveal?: boolean;
  pendingCheckout?: boolean;
}

const str = (value: unknown) => (typeof value === "string" && value ? value : undefined);
const record = (value: unknown): Payload => (typeof value === "object" && value !== null ? (value as Payload) : {});

/** Product ids inside a result list like `products: [{ productId }]`. */
function productIdsIn(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list.map((item) => str(record(item).productId)).filter((id): id is string => id !== undefined);
}

function one(productId: unknown, kind: AgentFocusKind): Focus | undefined {
  const id = str(productId);
  return id ? { productIds: [id], kind } : undefined;
}

/** Effects while a voice method is running (before its result is known). */
export function startEffects(method: string, payload: Payload): AgentEffects {
  switch (method) {
    case "cart.add":
    case "cart.remove":
    case "cart.update":
    case "ui.openProduct":
      return { focus: one(payload.productId, "looking") };
    case "catalog.search":
      return { reveal: true, navigation: str(payload.query) ? `Searching for “${str(payload.query)}”` : "Searching…" };
    case "ui.openCategory":
      return { reveal: true, navigation: str(payload.category) ? `Opening ${str(payload.category)}…` : "Opening category…" };
    case "ui.openPage":
      return { navigation: str(payload.page) ? `Opening ${String(payload.page).replace("-", " ")}…` : "Opening page…" };
    case "checkout.start":
      return { navigation: "Opening checkout…" };
    default:
      return {};
  }
}

/** Effects once a voice method has finished, based on its result. */
export function finishEffects(method: string, payload: Payload, result: unknown): AgentEffects {
  const data = record(result);
  const ok = data.ok === true;
  // Any new action means the checkout question has been answered or abandoned.
  const base: AgentEffects = method.startsWith("checkout.") ? {} : { pendingCheckout: false };

  switch (method) {
    case "cart.add":
      return { ...base, focus: one(payload.productId, ok ? "added" : "error") ?? null };
    case "cart.update":
      return { ...base, focus: one(payload.productId, !ok ? "error" : payload.quantity === 0 ? "removed" : "added") ?? null };
    case "cart.remove":
      return { ...base, focus: one(payload.productId, ok ? "removed" : "error") ?? null };
    case "catalog.search":
    case "ui.openCategory": {
      const ids = ok ? productIdsIn(data.products) : [];
      return { ...base, focus: ids.length ? { productIds: ids, kind: "looking" } : null };
    }
    case "ui.openProduct":
      return { ...base, focus: ok ? (one(payload.productId, "spotlight") ?? null) : null };
    case "ui.highlight": {
      const ids = ok && Array.isArray(data.productIds) ? data.productIds.filter((id): id is string => typeof id === "string") : [];
      return { ...base, focus: ids.length ? { productIds: ids, kind: data.reason === "options" ? "options" : "spotlight" } : null };
    }
    case "checkout.start":
      return { pendingCheckout: ok };
    case "checkout.confirm":
      return { pendingCheckout: false };
    default:
      return base;
  }
}

let seq = 0;
let focusTimer: ReturnType<typeof setTimeout> | undefined;
let navigationTimer: ReturnType<typeof setTimeout> | undefined;
let revealTimer: ReturnType<typeof setTimeout> | undefined;

function apply(effects: AgentEffects) {
  const patch: Partial<AgentEventState> = {};

  if (effects.focus !== undefined) {
    clearTimeout(focusTimer);
    if (effects.focus) {
      patch.focus = { ...effects.focus, seq: ++seq };
      focusTimer = setTimeout(() => useAgentEventStore.setState({ focus: null }), FOCUS_MS[effects.focus.kind]);
    } else {
      patch.focus = null;
    }
  }
  if (effects.navigation !== undefined) {
    clearTimeout(navigationTimer);
    patch.navigation = effects.navigation ? { label: effects.navigation, seq: ++seq } : null;
    if (effects.navigation) navigationTimer = setTimeout(() => useAgentEventStore.setState({ navigation: null }), NAVIGATION_MS);
  }
  if (effects.reveal !== undefined) {
    clearTimeout(revealTimer);
    patch.reveal = effects.reveal;
    if (effects.reveal) revealTimer = setTimeout(() => useAgentEventStore.setState({ reveal: false }), REVEAL_MS);
  }
  if (effects.pendingCheckout !== undefined) patch.pendingCheckout = effects.pendingCheckout;

  if (Object.keys(patch).length > 0) useAgentEventStore.setState(patch);
}

/**
 * Turns voice RPC calls into on-screen effects (which cards glow, what the pointer points at,
 * when results stream in). Views only read the resulting state; the rules live here.
 */
export const agentEventController = {
  started(method: string, payload: Payload) {
    apply(startEffects(method, payload));
  },

  finished(method: string, payload: Payload, result: unknown) {
    apply(finishEffects(method, payload, result));
  },

  /** The voice session ended: nothing on screen is the agent's any more. */
  reset() {
    clearTimeout(focusTimer);
    clearTimeout(navigationTimer);
    clearTimeout(revealTimer);
    useAgentEventStore.setState({ focus: null, navigation: null, reveal: false, pendingCheckout: false });
  },
};
