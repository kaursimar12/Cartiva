"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { SearchIcon } from "@/components/common/icons";

/** `id` must be unique per page: the header renders one form for desktop and one for mobile. */
export function SearchForm({ id, className = "" }: { id: string; className?: string }) {
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    if (query) router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <form role="search" onSubmit={handleSubmit} className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">
        Search products
      </label>
      <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-zinc-500" aria-hidden>
        <SearchIcon className="h-[18px] w-[18px]" />
      </span>
      <input
        id={id}
        name="q"
        type="search"
        placeholder='Search "tomato", "milk", "Surf Excel"…'
        autoComplete="off"
        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pr-4 pl-10 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100 focus:outline-none"
      />
    </form>
  );
}
