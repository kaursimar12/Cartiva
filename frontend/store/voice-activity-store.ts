import { create } from "zustand";

/** What the voice agent is doing on screen right now, e.g. "Adding to cart…". */
export type VoiceActivity = { label: string; state: "running" | "done" | "error" } | null;

export const useVoiceActivityStore = create<{ activity: VoiceActivity }>()(() => ({ activity: null }));
