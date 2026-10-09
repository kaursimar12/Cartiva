import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/models/entities/cart";

/** Cart state container only. Writes happen through CartService via the CartStorage adapter. */
interface CartState {
  items: CartItem[];
  hasHydrated: boolean;
}

export const useCartStore = create<CartState>()(
  persist((): CartState => ({ items: [], hasHydrated: false }), {
    name: "cartiva-cart",
    partialize: (state) => ({ items: state.items }),
    // Rehydrated manually after mount to avoid server/client markup mismatches.
    skipHydration: true,
    onRehydrateStorage: () => () => useCartStore.setState({ hasHydrated: true }),
  }),
);
