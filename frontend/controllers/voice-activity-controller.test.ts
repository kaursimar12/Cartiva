import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVoiceActivityStore } from "@/store/voice-activity-store";
import { voiceActivityController } from "./voice-activity-controller";

const activity = () => useVoiceActivityStore.getState().activity;

describe("voiceActivityController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useVoiceActivityStore.setState({ activity: null });
  });
  afterEach(() => vi.useRealTimers());

  it("shows a running label, then the success label, then clears", () => {
    voiceActivityController.started("cart.add");
    expect(activity()).toEqual({ label: "Adding to cart…", state: "running" });

    voiceActivityController.finished("cart.add", { ok: true });
    expect(activity()).toEqual({ label: "Added to cart", state: "done" });

    vi.advanceTimersByTime(2500);
    expect(activity()).toBeNull();
  });

  it("shows the real reason when an action fails", () => {
    voiceActivityController.started("cart.add");
    voiceActivityController.finished("cart.add", { ok: false, error: { message: "Only 2 Surf Excel available." } });
    expect(activity()).toEqual({ label: "Only 2 Surf Excel available.", state: "error" });
  });

  it("ignores methods without a label", () => {
    voiceActivityController.started("unknown.method");
    expect(activity()).toBeNull();
  });

  it("a new action replaces the previous outcome right away", () => {
    voiceActivityController.finished("cart.add", { ok: true });
    voiceActivityController.started("catalog.search");
    vi.advanceTimersByTime(2500);
    expect(activity()).toEqual({ label: "Searching…", state: "running" });
  });
});
