"use client";

import { useEffect } from "react";
import { useCartStore } from "@/store/cart-store";
import { useOrderStore } from "@/store/order-store";
import { useThemeStore } from "@/store/theme-store";

/** Restores persisted stores after mount so server and first client render match. */
export function StoreHydrator() {
  useEffect(() => {
    useCartStore.persist.rehydrate();
    useOrderStore.persist.rehydrate();
    useThemeStore.persist.rehydrate();
  }, []);
  return null;
}

/** Mirrors the theme preference onto <html data-theme>, which drives the CSS tokens. */
export function ThemeSync() {
  const theme = useThemeStore((s) => s.theme);
  const hydrated = useThemeStore((s) => s.hasHydrated);

  useEffect(() => {
    // Before rehydration the store holds the default; the pre-paint script already set the saved theme.
    if (hydrated) document.documentElement.dataset.theme = theme;
  }, [theme, hydrated]);
  return null;
}
