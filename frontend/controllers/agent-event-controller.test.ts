import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAgentEventStore } from "@/store/agent-event-store";
import { agentEventController, finishEffects, startEffects } from "./agent-event-controller";

const state = () => useAgentEventStore.getState();

describe("agent effects", () => {
  it("looks at a product while adding it, then marks it added", () => {
    expect(startEffects("cart.add", { productId: "p004", quantity: 2 }).focus).toEqual({ productIds: ["p004"], kind: "looking" });
    expect(finishEffects("cart.add", { productId: "p004" }, { ok: true }).focus).toEqual({ productIds: ["p004"], kind: "added" });
  });

  it("marks a stock problem as an error on that product", () => {
    const result = { ok: false, error: { code: "PARTIAL_STOCK", message: "Only 2 left." } };
    expect(finishEffects("cart.add", { productId: "p030" }, result).focus).toEqual({ productIds: ["p030"], kind: "error" });
  });

  it("treats updating to zero as a removal", () => {
    expect(finishEffects("cart.update", { productId: "p004", quantity: 0 }, { ok: true }).focus?.kind).toBe("removed");
  });

  it("streams search results in and scans the products the agent was given", () => {
    expect(startEffects("catalog.search", { query: "dishwash" })).toMatchObject({ reveal: true });
    const result = { ok: true, products: [{ productId: "p045" }, { productId: "p046" }] };
    expect(finishEffects("catalog.search", {}, result).focus).toEqual({ productIds: ["p045", "p046"], kind: "looking" });
  });

  it("rings every option when the agent asks the shopper to choose", () => {
    const result = { ok: true, productIds: ["p060", "p061", "p062"], reason: "options" };
    expect(finishEffects("ui.highlight", {}, result).focus).toEqual({ productIds: ["p060", "p061", "p062"], kind: "options" });
  });

  it("waits for a spoken yes after checkout starts, and stops waiting on the next action", () => {
    expect(finishEffects("checkout.start", {}, { ok: true }).pendingCheckout).toBe(true);
    expect(finishEffects("checkout.start", {}, { ok: false }).pendingCheckout).toBe(false);
    expect(finishEffects("cart.get", {}, { ok: true }).pendingCheckout).toBe(false);
  });
});

describe("agentEventController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    agentEventController.reset();
  });
  afterEach(() => vi.useRealTimers());

  it("highlights a product, then clears the highlight", () => {
    agentEventController.finished("cart.add", { productId: "p004" }, { ok: true });
    expect(state().focus).toMatchObject({ productIds: ["p004"], kind: "added" });

    vi.advanceTimersByTime(2200);
    expect(state().focus).toBeNull();
  });

  it("gives each new focus a new sequence number, so a repeat still animates", () => {
    agentEventController.finished("cart.add", { productId: "p004" }, { ok: true });
    const first = state().focus?.seq;
    agentEventController.finished("cart.add", { productId: "p004" }, { ok: true });
    expect(state().focus?.seq).toBeGreaterThan(first!);
  });

  it("forgets everything when the session ends", () => {
    agentEventController.finished("checkout.start", {}, { ok: true });
    agentEventController.reset();
    expect(state()).toMatchObject({ focus: null, navigation: null, reveal: false, pendingCheckout: false });
  });
});
