import type { Room, RpcInvocationData } from "livekit-client";
import { agentEventController } from "@/controllers/agent-event-controller";
import { voiceActivityController } from "@/controllers/voice-activity-controller";
import { voiceController, type VoiceUi } from "@/controllers/voice-controller";

type RpcMethod = (payload: Record<string, unknown>) => unknown;

/** Cart actions the on-screen pointer "performs": it travels to the card first, then the action lands. */
const POINTER_ACTIONS = new Set(["cart.add", "cart.remove", "cart.update"]);
/** Time for the agent pointer to reach a card (its spring settles in about this long). */
const POINTER_TRAVEL_MS = 350;

/** Lets the pointer reach the product's card before the cart changes, when that card is on screen. */
async function letPointerArrive(method: string, payload: Record<string, unknown>): Promise<void> {
  if (!POINTER_ACTIONS.has(method) || typeof payload.productId !== "string") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // no pointer is shown
  if (!document.querySelector(`[data-agent-target="product:${payload.productId}"]`)) return;
  await new Promise((resolve) => setTimeout(resolve, POINTER_TRAVEL_MS));
}

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
    "ui.openPage": (payload) => voiceController.openPage(payload, ui),
    "ui.getScreen": () => voiceController.getScreen(),
    "ui.highlight": (payload) => voiceController.highlightProducts(payload),
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
      // Show what the agent is doing: the caption, and the effect on the page (glows, pointer, …).
      voiceActivityController.started(name, payload);
      agentEventController.started(name, payload);
      try {
        await letPointerArrive(name, payload);
        const result = await method(payload);
        voiceActivityController.finished(name, result, payload);
        agentEventController.finished(name, payload, result);
        return JSON.stringify(result);
      } catch (error) {
        const failure = { ok: false, error: { message: "Something went wrong." } };
        voiceActivityController.finished(name, failure, payload);
        agentEventController.finished(name, payload, failure);
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
