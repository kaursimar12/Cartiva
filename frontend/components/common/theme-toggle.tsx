"use client";

import { themeController } from "@/controllers/theme-controller";
import { useThemeStore } from "@/store/theme-store";
import { MoonIcon, SunIcon } from "./icons";

/** Header setting that switches between the dark (default) and light themes. */
export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={themeController.toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-surface text-zinc-700 transition-colors hover:bg-zinc-50"
    >
      {theme === "dark" ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
    </button>
  );
}
