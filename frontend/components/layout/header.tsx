import Link from "next/link";
import { BoltIcon, CameraIcon } from "@/components/common/icons";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { VoiceButton } from "@/components/voice/voice-button";
import { pricingService } from "@/lib/container";
import { formatPrice } from "@/lib/format";
import type { Category } from "@/models/entities/product";
import { CartLink } from "./cart-link";
import { CategoryNav } from "./category-nav";
import { SearchForm } from "./search-form";

export function Header({ categories }: { categories: Category[] }) {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-surface/95 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur">
      <div className="mx-auto flex max-w-[1920px] items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6 lg:px-10">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Cartiva home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-lg font-black text-background" aria-hidden>
            c
          </span>
          <span className="text-[22px] font-extrabold tracking-tight text-zinc-900">cartiva</span>
        </Link>

        <div className="hidden shrink-0 border-l border-zinc-200 pl-6 lg:block">
          <p className="flex items-center gap-1 text-sm font-semibold text-zinc-900">
            <BoltIcon className="h-4 w-4 text-zinc-500" />
            Groceries in minutes
          </p>
          <p className="text-xs text-zinc-500">Free delivery above {formatPrice(pricingService.delivery.freeAbove)}</p>
        </div>

        <SearchForm id="site-search" className="hidden flex-1 md:block" />
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            href="/scan-list"
            className="flex h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-surface px-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 sm:px-4"
            aria-label="Scan a shopping list"
          >
            <CameraIcon className="h-5 w-5" />
            <span className="hidden lg:inline">Scan list</span>
          </Link>
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
