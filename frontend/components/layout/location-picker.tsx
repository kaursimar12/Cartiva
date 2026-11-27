"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BoltIcon } from "@/components/common/icons";
import { brand } from "@/lib/brand";
import { DEFAULT_DELIVERY_AREA, DELIVERY_AREAS, type DeliveryArea } from "@/lib/delivery-areas";

const STORAGE_KEY = "cartiva-delivery-area";

/** The chosen area lives in localStorage; listeners re-render every picker on the page when it changes. */
const listeners = new Set<() => void>();

function readArea(): DeliveryArea {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return DELIVERY_AREAS.find((a) => a === saved) ?? DEFAULT_DELIVERY_AREA;
  } catch {
    return DEFAULT_DELIVERY_AREA; // storage unavailable (private mode)
  }
}

function saveArea(area: DeliveryArea) {
  try {
    localStorage.setItem(STORAGE_KEY, area);
  } catch {
    // ignore: nothing to persist to
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

/** "Delivery in 10 minutes · Sector 62, Noida ▾": pick the area you're ordering for (remembered on this device). */
export function LocationPicker() {
  // The server (and first paint) render the default; the saved area takes over after hydration.
  const area = useSyncExternalStore(subscribe, readArea, () => DEFAULT_DELIVERY_AREA);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(next: DeliveryArea) {
    saveArea(next);
    setOpen(false);
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="block rounded-lg px-1 py-0.5 text-left hover:bg-zinc-50"
      >
        <span className="flex items-center gap-1 text-sm font-semibold text-zinc-900">
          <BoltIcon className="h-4 w-4 text-brand-600" />
          Delivery in {brand.deliveryTime}
        </span>
        <span className="flex max-w-[13rem] items-center gap-1 text-xs text-zinc-600">
          <span className="truncate">{area}</span>
          <svg aria-hidden viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" fill="currentColor">
            <path d="M5.2 7.7a.75.75 0 0 1 1.06.02L10 11.7l3.74-3.98a.75.75 0 1 1 1.1 1.02l-4.3 4.57a.75.75 0 0 1-1.1 0L5.18 8.76a.75.75 0 0 1 .02-1.06Z" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-2 w-72 rounded-xl border border-hairline bg-surface p-2 shadow-card">
          <p className="px-2 pt-1 pb-2 text-xs font-medium text-zinc-500">Choose your delivery area</p>
          <ul role="listbox" aria-label="Delivery area">
            {DELIVERY_AREAS.map((a) => (
              <li key={a}>
                <button
                  type="button"
                  role="option"
                  aria-selected={a === area}
                  onClick={() => choose(a)}
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-zinc-50 ${
                    a === area ? "font-semibold text-zinc-900" : "text-zinc-700"
                  }`}
                >
                  {a}
                  {a === area && <span className="text-xs text-brand-700">Selected</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
