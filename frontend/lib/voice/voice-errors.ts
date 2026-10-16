import { DisconnectReason, MediaDeviceFailure } from "livekit-client";
import { VoiceServerError } from "./token-source";

/** Everything that can go wrong with the voice connection itself. */
export type VoiceProblem =
  | "mic-denied"
  | "mic-missing"
  | "mic-busy"
  | "server-unreachable"
  | "agent-unavailable"
  | "connection-lost";

/** What the shopper sees. Shopping by tapping always keeps working, so every message says so. */
export const VOICE_PROBLEM_MESSAGES: Record<VoiceProblem, string> = {
  "mic-denied":
    "Microphone access is blocked. Click the lock icon in the address bar, allow the microphone, then tap Ask Cartiva again.",
  "mic-missing": "No microphone was found. Connect one and try again — you can keep shopping by tapping.",
  "mic-busy": "Your microphone is being used by another app. Close it and try again.",
  "server-unreachable": "The voice assistant is offline right now. You can keep shopping by tapping.",
  "agent-unavailable": "The voice assistant didn't answer. Please try again in a moment — tapping still works.",
  "connection-lost": "The voice connection was lost. Tap Ask Cartiva to reconnect.",
};

/** Microphone errors → which problem it is. */
export function micProblem(error: unknown): VoiceProblem {
  switch (MediaDeviceFailure.getFailure(error)) {
    case MediaDeviceFailure.NotFound:
      return "mic-missing";
    case MediaDeviceFailure.DeviceInUse:
      return "mic-busy";
    default:
      return "mic-denied";
  }
}

/** Errors thrown by session.start() → which problem it is. */
export function startProblem(error: unknown): VoiceProblem {
  return error instanceof VoiceServerError ? "server-unreachable" : micProblem(error);
}

/** Was this disconnect a real failure, or a normal ending (the shopper or the agent hung up)? */
export function isUnexpectedDisconnect(reason?: DisconnectReason): boolean {
  return reason !== undefined && reason !== DisconnectReason.CLIENT_INITIATED && reason !== DisconnectReason.ROOM_DELETED;
}
