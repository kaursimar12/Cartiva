import { create } from "zustand";
import type { ListLine } from "@/models/entities/shopping-list";

export type ScanStatus =
  | { name: "idle" }
  | { name: "scanning" }
  | { name: "ready" }
  | { name: "error"; message: string };

/** The shopping list being reviewed. State only — rules live in ShoppingListService. */
export const useShoppingListStore = create<{ status: ScanStatus; lines: ListLine[] }>()(() => ({
  status: { name: "idle" },
  lines: [],
}));
