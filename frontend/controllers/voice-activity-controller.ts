import { useVoiceActivityStore, type VoiceActivity } from "@/store/voice-activity-store";

/** What the shopper sees while each browser method runs, and after it succeeds. */
const LABELS: Record<string, { running: string; done: string }> = {
  "catalog.search": { running: "Searching…", done: "Results on screen" },
  "cart.get": { running: "Checking your cart…", done: "Cart checked" },
  "cart.add": { running: "Adding to cart…", done: "Added to cart" },
  "cart.remove": { running: "Removing from cart…", done: "Removed from cart" },
  "cart.update": { running: "Updating your cart…", done: "Cart updated" },
  "ui.openCategory": { running: "Opening category…", done: "Category open" },
  "ui.openProduct": { running: "Opening product…", done: "Product open" },
  "ui.openPage": { running: "Opening page…", done: "Page open" },
  "ui.getScreen": { running: "Looking at your screen…", done: "Got it" },
  "checkout.start": { running: "Preparing checkout…", done: "Checkout ready" },
  "checkout.confirm": { running: "Opening payment…", done: "Payment window open" },
  "list.get": { running: "Reading your list…", done: "List read" },
  "list.add": { running: "Adding to your list…", done: "Added to list" },
  "list.remove": { running: "Removing from your list…", done: "Removed from list" },
  "list.update": { running: "Updating your list…", done: "List updated" },
  "list.choose": { running: "Choosing product…", done: "Product chosen" },
  "list.confirm": { running: "Adding your list to the cart…", done: "List added to cart" },
};

const CLEAR_AFTER_MS = 2500;
let clearTimer: ReturnType<typeof setTimeout> | undefined;

function show(activity: VoiceActivity) {
  clearTimeout(clearTimer);
  useVoiceActivityStore.setState({ activity });
}

/** The error message inside a `{ ok: false, error: { message } }` result, if any. */
function failureMessage(result: unknown): string | null {
  if (typeof result !== "object" || result === null || !("ok" in result) || result.ok !== false) return null;
  const error = (result as { error?: { message?: unknown } }).error;
  return typeof error?.message === "string" ? error.message : "That didn't work.";
}

/** Shows what a voice action is doing ("Adding to cart…"), then its outcome for a moment. */
export const voiceActivityController = {
  started(method: string) {
    const labels = LABELS[method];
    if (labels) show({ label: labels.running, state: "running" });
  },

  finished(method: string, result: unknown) {
    const labels = LABELS[method];
    if (!labels) return;
    const failure = failureMessage(result);
    show(failure ? { label: failure, state: "error" } : { label: labels.done, state: "done" });
    clearTimer = setTimeout(() => useVoiceActivityStore.setState({ activity: null }), CLEAR_AFTER_MS);
  },
};
