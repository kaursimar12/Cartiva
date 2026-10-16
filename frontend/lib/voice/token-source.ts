import { TokenSource } from "livekit-client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";

/** FastAPI could not give us a voice token (server down, network, or an error reply). */
export class VoiceServerError extends Error {}

/** Shape of the JSON returned by FastAPI's POST /api/livekit/token. */
interface TokenResponse {
  token: string;
  url: string;
  room_name: string;
  identity: string;
}

/**
 * Tells LiveKit how to get a token: ask our FastAPI backend.
 * FastAPI signs it with the secret and adds "dispatch cartiva-agent".
 */
export const voiceTokenSource = TokenSource.custom(async () => {
  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}/api/livekit/token`, { method: "POST" });
  } catch {
    throw new VoiceServerError("The voice server is not reachable.");
  }
  if (!response.ok) throw new VoiceServerError(`Could not get a voice token (HTTP ${response.status})`);

  const data: TokenResponse = await response.json();
  return { serverUrl: data.url, participantToken: data.token };
});
