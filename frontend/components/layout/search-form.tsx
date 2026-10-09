"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

export function SearchForm({ className = "" }: { className?: string }) {
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    if (query) router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <form role="search" onSubmit={handleSubmit} className={`relative ${className}`}>
      <label htmlFor="site-search" className="sr-only">
        Search products
      </label>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400" aria-hidden>
        🔍
      </span>
      <input
        id="site-search"
        name="q"
        type="search"
        placeholder='Search "tomato", "milk", "Surf Excel"…'
        autoComplete="off"
        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
      />
    </form>
  );
}
