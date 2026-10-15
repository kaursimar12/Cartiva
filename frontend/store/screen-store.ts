import { create } from "zustand";

/** What the shopper currently sees: which page, and which products in on-screen order. */
export interface ScreenState {
  path: string;
  title: string;
  productIds: string[];
}

export const useScreenStore = create<ScreenState>()(() => ({ path: "", title: "", productIds: [] }));
