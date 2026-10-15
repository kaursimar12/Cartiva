import type { Room, RpcInvocationData } from "livekit-client";
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
    "checkout.start": () => voiceController.startCheckout(ui),
    "checkout.confirm": () => voiceController.confirmPayment(ui),

  };

  for (const [name, method] of Object.entries(methods)) {
    room.registerRpcMethod(name, async (data: RpcInvocationData) => {
      const payload = data.payload ? (JSON.parse(data.payload) as Record<string, unknown>) : {};
      return JSON.stringify(await method(payload));
    });
  }

  return () => {
    for (const name of Object.keys(methods)) room.unregisterRpcMethod(name);
  };
}
