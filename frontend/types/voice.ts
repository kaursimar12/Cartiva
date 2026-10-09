/** Voice assistant states from SRS FR-12. Wired to LiveKit in Phase 6. */
export type VoiceState =
  | "IDLE"
  | "LISTENING"
  | "USER_SPEAKING"
  | "THINKING"
  | "EXECUTING_ACTION"
  | "ACTION_SUCCESS"
  | "ACTION_ERROR"
  | "AGENT_SPEAKING"
  | "DISCONNECTED";
