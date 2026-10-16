import { cartService, listScanner, shoppingListService } from "@/lib/client-container";
import type { ListLine } from "@/models/entities/shopping-list";
import { useShoppingListStore } from "@/store/shopping-list-store";
import { showToast } from "@/store/toast-store";

let nextId = 1;
const newId = () => `line-${nextId++}`;

const lines = () => useShoppingListStore.getState().lines;
const setLines = (next: ListLine[]) => useShoppingListStore.setState({ lines: next, status: { name: "ready" } });
const updateLine = (id: string, change: (line: ListLine) => ListLine) =>
  setLines(lines().map((line) => (line.id === id ? change(line) : line)));

/** Entry points for the shopping-list feature: the review page and the voice agent both use these. */
export const shoppingListController = {
  async scan(image: File) {
    useShoppingListStore.setState({ status: { name: "scanning" }, lines: [] });
    try {
      const items = await listScanner.scan(image);
      setLines(items.map((item) => shoppingListService.toLine(item, newId())));
      useShoppingListStore.setState((state) => ({ scanId: state.scanId + 1 }));
      return { ok: true as const, lines: lines() };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Couldn't read the photo.";
      useShoppingListStore.setState({ status: { name: "error", message } });
      return { ok: false as const, message };
    }
  },

  remove: (id: string) => setLines(lines().filter((line) => line.id !== id)),

  setPacks(id: string, packs: number) {
    if (!Number.isInteger(packs) || packs < 1) return;
    updateLine(id, (line) => shoppingListService.withPacks(line, packs));
  },

  choose: (id: string, productId: string) => updateLine(id, (line) => shoppingListService.choose(line, productId)),

  /** Adds an item typed (or said) by the shopper, matched the same way as scanned items. */
  add(name: string, quantity: number | null = null, unit: string | null = null) {
    const line = shoppingListService.toLine({ name, quantity, unit, original: name }, newId());
    setLines([...lines(), line]);
    return line;
  },

  /** Adds every ready line to the cart and empties the list. Nothing is added before this. */
  confirm() {
    const added: string[] = [];
    const failed: { name: string; reason: string }[] = [];
    const skipped: string[] = [];

    for (const line of lines()) {
      if (line.status !== "found" || !line.productId) {
        skipped.push(line.original);
        continue;
      }
      const result = cartService.add(line.productId, line.packs);
      if (result.ok) added.push(line.original);
      else failed.push({ name: line.original, reason: result.error.message });
    }

    useShoppingListStore.setState({ status: { name: "idle" }, lines: [] });
    if (added.length > 0) showToast(`Added ${added.length} item${added.length === 1 ? "" : "s"} to your cart.`, "success");
    return { added, failed, skipped };
  },

  clear: () => useShoppingListStore.setState({ status: { name: "idle" }, lines: [] }),
};
