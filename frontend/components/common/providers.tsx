"use client";

import { useEffect } from "react";
import { useCartStore } from "@/store/cart-store";
import { useOrderStore } from "@/store/order-store";

/** Restores persisted stores after mount so server and first client render match. */
export function StoreHydrator() {
  useEffect(() => {
    useCartStore.persist.rehydrate();
    useOrderStore.persist.rehydrate();
  }, []);
  return null;
}
