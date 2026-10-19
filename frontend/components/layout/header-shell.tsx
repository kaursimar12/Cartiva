"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * The sticky header's frame: once the page scrolls, it tightens and gains a soft shadow
 * (children style themselves with `group-data-[scrolled=true]:…`).
 */
export function HeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 12);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      data-scrolled={scrolled}
      style={{ viewTransitionName: "site-header" }}
      className="group glass sticky top-0 z-40 border-x-0 border-t-0 transition-shadow duration-300 data-[scrolled=true]:shadow-[0_8px_30px_-12px_rgba(22,21,15,0.18)]"
    >
      {children}
    </header>
  );
}
