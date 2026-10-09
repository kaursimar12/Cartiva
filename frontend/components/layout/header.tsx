import Link from "next/link";
import { VoiceButton } from "@/components/voice/voice-button";
import type { Category } from "@/models/entities/product";
import { CartLink } from "./cart-link";
import { CategoryNav } from "./category-nav";
import { SearchForm } from "./search-form";

export function Header({ categories }: { categories: Category[] }) {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-900 text-zinc-100">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Cartiva home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-700 text-lg" aria-hidden>
            🛍
          </span>
          <span className="text-xl font-extrabold tracking-tight text-white">Cartiva</span>
        </Link>
        <SearchForm id="site-search" className="hidden flex-1 md:block" />
        <div className="ml-auto flex items-center gap-2">
          <VoiceButton />
          <CartLink />
        </div>
      </div>
      <div className="px-4 pb-3 md:hidden">
        <SearchForm id="site-search-mobile" />
      </div>
      <CategoryNav categories={categories} />
    </header>
  );
}
