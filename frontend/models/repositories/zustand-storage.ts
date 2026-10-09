import type { CartItem } from "@/models/entities/cart";
import type { Order } from "@/models/entities/order";
import { useCartStore } from "@/store/cart-store";
import { useOrderStore } from "@/store/order-store";
import type { CartStorage, OrderStorage } from "./interfaces";

/** Adapts the Zustand cart store to the CartStorage interface services depend on. */
export class ZustandCartStorage implements CartStorage {
  getItems(): CartItem[] {
    return useCartStore.getState().items;
  }

  setItems(items: CartItem[]): void {
    useCartStore.setState({ items });
  }
}

export class ZustandOrderStorage implements OrderStorage {
  save(order: Order): void {
    useOrderStore.setState({ lastOrder: order });
  }
}
