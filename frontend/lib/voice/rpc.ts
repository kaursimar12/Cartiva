import type { Room, RpcInvocationData } from "livekit-client";
import { voiceActivityController } from "@/controllers/voice-activity-controller";
import { voiceController, type VoiceUi } from "@/controllers/voice-controller";

type RpcMethod = (payload: Record<string, unknown>) => unknown;

/** Registers all voice RPC methods on the room. Returns a function that removes them again. */
export function registerVoiceRpc(room: Room, ui: VoiceUi): () => void {
  /** Every browser method the voice agent may call. Add new voice actions here. */
  const methods: Record<string, RpcMethod> = {
    "cart.get": () => voiceController.getCart(),
    "catalog.search": (payload) => voiceController.searchProducts(payload, ui),
    "cart.add": (payload) => voiceController.addToCart(payload),
    "cart.remove": (payload) => voiceController.removeFromCart(payload),
    "cart.update": (payload) => voiceController.updateCartQuantity(payload),
    "ui.openCategory": (payload) => voiceController.openCategory(payload, ui),
    "ui.openProduct": (payload) => voiceController.openProduct(payload, ui),
    "ui.getScreen": () => voiceController.getScreen(),
    "list.get": () => voiceController.getShoppingList(ui),
    "list.remove": (payload) => voiceController.removeListItem(payload),
    "list.add": (payload) => voiceController.addListItem(payload, ui),
    "list.update": (payload) => voiceController.updateListItem(payload),
    "list.choose": (payload) => voiceController.chooseListItem(payload),
    "list.confirm": () => voiceController.confirmShoppingList(ui),
    "checkout.start": () => voiceController.startCheckout(ui),
    "checkout.confirm": () => voiceController.confirmPayment(ui),

  };

  for (const [name, method] of Object.entries(methods)) {
    room.registerRpcMethod(name, async (data: RpcInvocationData) => {
      const payload = data.payload ? (JSON.parse(data.payload) as Record<string, unknown>) : {};
      voiceActivityController.started(name);
      try {
        const result = await method(payload);
        voiceActivityController.finished(name, result);
        return JSON.stringify(result);
      } catch (error) {
        voiceActivityController.finished(name, { ok: false, error: { message: "Something went wrong." } });
        throw error;
      }
    });
  }

  return () => {
    for (const name of Object.keys(methods)) room.unregisterRpcMethod(name);
  };
}

/** Browser → agent: tells the voice agent something happened (e.g. the payment finished). */
export function notifyAgent(room: Room, method: string, payload: unknown): void {
  const agent = [...room.remoteParticipants.values()].find((participant) => participant.isAgent);
  if (!agent) return; // no voice session right now: nothing to tell

  room.localParticipant
    .performRpc({ destinationIdentity: agent.identity, method, payload: JSON.stringify(payload) })
    .catch(() => {}); // the agent may have hung up meanwhile; the screen already shows the result
}
