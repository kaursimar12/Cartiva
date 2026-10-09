"use client";

import { useMemo } from "react";
import { pricingService } from "@/lib/container";
import { useCartStore } from "@/store/cart-store";

/** Read-only view model of the cart for components. Mutations go through cartController. */
export function useCart() {
  const items = useCartStore((s) => s.items);
  const hydrated = useCartStore((s) => s.hasHydrated);

  return useMemo(
    () => ({
      items,
      hydrated,
      lines: pricingService.getLines(items),
      pricing: pricingService.calculate(items),
      offerHints: pricingService.getOfferHints(items),
    }),
    [items, hydrated],
  );
}

export function useCartQuantity(productId: string): number {
  return useCartStore((s) => (s.hasHydrated ? (s.items.find((i) => i.productId === productId)?.quantity ?? 0) : 0));
}
