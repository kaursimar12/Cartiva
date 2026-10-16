import { DisconnectReason } from "livekit-client";
import { describe, expect, it } from "vitest";
import { VoiceServerError } from "./token-source";
import { isUnexpectedDisconnect, micProblem, startProblem, VOICE_PROBLEM_MESSAGES } from "./voice-errors";

function domError(name: string): Error {
  const error = new Error(name);
  error.name = name;
  return error;
}

describe("voice errors", () => {
  it("classifies microphone errors from the browser", () => {
    expect(micProblem(domError("NotAllowedError"))).toBe("mic-denied");
    expect(micProblem(domError("NotFoundError"))).toBe("mic-missing");
    expect(micProblem(domError("NotReadableError"))).toBe("mic-busy");
  });

  it("blames the server, not the mic, when the token request fails", () => {
    expect(startProblem(new VoiceServerError("down"))).toBe("server-unreachable");
    expect(startProblem(domError("NotAllowedError"))).toBe("mic-denied");
  });

  it("treats hanging up as normal and network failures as unexpected", () => {
    expect(isUnexpectedDisconnect(DisconnectReason.CLIENT_INITIATED)).toBe(false);
    expect(isUnexpectedDisconnect(DisconnectReason.ROOM_DELETED)).toBe(false);
    expect(isUnexpectedDisconnect(undefined)).toBe(false);
    expect(isUnexpectedDisconnect(DisconnectReason.SIGNAL_CLOSE)).toBe(true);
  });

  it("has a message for every problem that mentions how to continue", () => {
    for (const message of Object.values(VOICE_PROBLEM_MESSAGES)) expect(message.length).toBeGreaterThan(20);
  });
});
