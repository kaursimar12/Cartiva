"use client";

import { SessionEvent, useAgent, useSessionContext } from "@livekit/components-react";
import { RoomEvent, type DisconnectReason } from "livekit-client";
import { useEffect } from "react";
import { voiceSessionController } from "@/controllers/voice-session-controller";
import { isUnexpectedDisconnect, micProblem } from "@/lib/voice/voice-errors";

/** Invisible: watches the voice session and tells the shopper when something breaks. */
export function VoiceErrorReporter() {
  const session = useSessionContext();
  const agent = useAgent();

  // Microphone blocked / missing / busy → explain, and end the half-working session.
  useEffect(() => {
    const emitter = session.internal.emitter;
    const onMicError = (error: Error) => {
      voiceSessionController.reportProblem(micProblem(error));
      void session.end();
    };
    emitter.on(SessionEvent.MediaDevicesError, onMicError);
    return () => {
      emitter.off(SessionEvent.MediaDevicesError, onMicError);
    };
  }, [session]);

  // The agent never joined (worker down, or the free credit is used up). LiveKit gives up after 20 s.
  useEffect(() => {
    if (agent.state !== "failed") return;
    voiceSessionController.reportProblem("agent-unavailable");
    void session.end();
  }, [agent.state, session]);

  // The network dropped and LiveKit could not reconnect.
  useEffect(() => {
    const room = session.room;
    const onDisconnected = (reason?: DisconnectReason) => {
      if (isUnexpectedDisconnect(reason)) voiceSessionController.reportProblem("connection-lost");
    };
    room.on(RoomEvent.Disconnected, onDisconnected);
    return () => {
      room.off(RoomEvent.Disconnected, onDisconnected);
    };
  }, [session.room]);

  return null;
}
