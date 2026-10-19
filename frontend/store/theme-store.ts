import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "dark" | "light";

/** Key shared with the pre-paint script in app/layout.tsx. */
export const THEME_STORAGE_KEY = "cartiva-theme-v2"; // v2: light became the default

/** Theme preference container only. Changes go through themeController. */
interface ThemeState {
  theme: Theme;
  hasHydrated: boolean;
}

export const useThemeStore = create<ThemeState>()(
  persist((): ThemeState => ({ theme: "light", hasHydrated: false }), {
    name: THEME_STORAGE_KEY,
    partialize: (state) => ({ theme: state.theme }),
    // Rehydrated manually after mount to avoid server/client markup mismatches.
    skipHydration: true,
    onRehydrateStorage: () => () => useThemeStore.setState({ hasHydrated: true }),
  }),
);
