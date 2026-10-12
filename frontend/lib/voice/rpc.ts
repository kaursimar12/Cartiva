import type { Room, RpcInvocationData } from "livekit-client";
import { voiceController } from "@/controllers/voice-controller";

type RpcMethod = (payload: unknown) => unknown;

/** Every browser method the voice agent may call. Phase 7 adds more (catalog.search, cart.add…). */
const methods: Record<string, RpcMethod> = {
  "cart.get": () => voiceController.getCart(),
};

/** Registers all voice RPC methods on the room. Returns a function that removes them again. */
export function registerVoiceRpc(room: Room): () => void {
  for (const [name, method] of Object.entries(methods)) {
    room.registerRpcMethod(name, async (data: RpcInvocationData) => {
      const payload: unknown = data.payload ? JSON.parse(data.payload) : {};
      return JSON.stringify(await method(payload));
    });
  }

  return () => {
    for (const name of Object.keys(methods)) room.unregisterRpcMethod(name);
  };
}
