import { useThemeStore, type Theme } from "@/store/theme-store";

/** UI entry point for the appearance setting. */
export const themeController = {
  set: (theme: Theme) => useThemeStore.setState({ theme }),
  toggle: () => useThemeStore.setState((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
};
