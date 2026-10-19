"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckIcon, CloseIcon } from "./icons";
import { dismissToast, useToastStore } from "@/store/toast-store";

/** A small coloured marker per tone; the toast itself is always a neutral glass pill. */
const toneMarker = {
  success: "bg-brand-500 text-white",
  error: "bg-red-500 text-white",
  info: "bg-zinc-500 text-white",
} as const;

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-20 z-50 flex flex-col items-center gap-2 px-4">
      <AnimatePresence initial={false}>
      {toasts.map((toast) => (
        <motion.div
          key={toast.id}
          layout
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.96, transition: { duration: 0.18 } }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          role={toast.tone === "error" ? "alert" : "status"}
          className="pointer-events-auto flex w-full max-w-sm items-center justify-between gap-3 rounded-2xl bg-zinc-900 py-2.5 pr-2 pl-3 text-sm text-background shadow-2xl"
        >
          <span className="flex items-center gap-2.5">
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${toneMarker[toast.tone]}`} aria-hidden>
              {toast.tone === "success" ? <CheckIcon className="h-3 w-3" /> : "!"}
            </span>
            {toast.message}
          </span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="shrink-0 rounded-full p-1.5 opacity-60 hover:opacity-100"
            aria-label="Dismiss notification"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </motion.div>
      ))}
      </AnimatePresence>
    </div>
  );
}
