"use client";

import { useEffect, useState } from "react";

/**
 * A flag that turns on at once but turns off only after it has stayed off for `holdMs`.
 * Used for "the shopper is speaking": mic volume dips between words, and without the hold the
 * caption and sphere would flip back and forth several times a second.
 */
export function useHeldFlag(on: boolean, holdMs: number): boolean {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    // Both updates run in a timer callback: on → mark held right away, off → release after the hold.
    const timer = setTimeout(() => setHeld(on), on ? 0 : holdMs);
    return () => clearTimeout(timer);
  }, [on, holdMs]);

  return on || held;
}
