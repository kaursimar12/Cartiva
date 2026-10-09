import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Order } from "@/models/entities/order";

interface OrderState {
  lastOrder: Order | null;
  hasHydrated: boolean;
}

/** Most recent order for the success page. No database: kept in session storage. */
export const useOrderStore = create<OrderState>()(
  persist((): OrderState => ({ lastOrder: null, hasHydrated: false }), {
    name: "cartiva-last-order",
    storage: createJSONStorage(() => sessionStorage),
    partialize: (state) => ({ lastOrder: state.lastOrder }),
    skipHydration: true,
    onRehydrateStorage: () => () => useOrderStore.setState({ hasHydrated: true }),
  }),
);
