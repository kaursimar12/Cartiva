import { create } from "zustand";

/** Where the current payment is. Shared, so clicks and voice update the same checkout UI. */
export type PaymentStatus =
  | { name: "idle" }
  | { name: "processing" }
  | { name: "failed"; reason: string }
  | { name: "success" };

export const useCheckoutStore = create<{ status: PaymentStatus }>()(() => ({ status: { name: "idle" } }));
