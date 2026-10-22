import { create } from "zustand";

/**
 * The voice agent's state ("disconnected", "connecting", "listening", "speaking", …), mirrored from
 * LiveKit by VoiceAgentBridge. Page components read it here instead of calling useAgent() themselves:
 * every useAgent() that mounts mid-call restarts LiveKit's shared 20 s "agent joined?" timer and makes
 * it fail with "Agent did not join the room", which ended working calls.
 *
 * `greeted` turns true once Cartiva has spoken in this call: until then the agent may report
 * "listening", but it isn't (it introduces itself first), so the UI says it's still joining.
 */
export const useVoiceAgentStore = create<{ state: string; greeted: boolean }>()(() => ({
  state: "disconnected",
  greeted: false,
}));
