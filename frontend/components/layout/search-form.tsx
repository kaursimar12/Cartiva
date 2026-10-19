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
      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-zinc-500" aria-hidden>
        <SearchIcon className="h-[18px] w-[18px]" />
      </span>
      <input
        id={id}
        name="q"
        type="search"
        placeholder='Search "tomato", "milk", "Surf Excel"…'
        autoComplete="off"
        className="h-11 w-full rounded-full border border-hairline bg-surface-muted pr-4 pl-11 text-sm text-zinc-900 transition placeholder:text-zinc-500 focus:border-brand-500/50 focus:bg-surface focus:ring-4 focus:ring-brand-500/10 focus:outline-none"
      />
    </form>
  );
}
