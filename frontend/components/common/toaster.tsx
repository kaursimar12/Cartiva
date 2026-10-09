"use client";

import { dismissToast, useToastStore } from "@/store/toast-store";

const toneStyles = {
  success: "bg-brand-700 text-white",
  error: "bg-red-600 text-white",
  info: "bg-zinc-900 text-white",
} as const;

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === "error" ? "alert" : "status"}
          className={`pointer-events-auto flex w-full max-w-sm items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm shadow-lg ${toneStyles[toast.tone]}`}
        >
          <span>
            {toast.tone === "success" ? "✓ " : toast.tone === "error" ? "⚠ " : ""}
            {toast.message}
          </span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="shrink-0 rounded px-1 text-white/80 hover:text-white"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
