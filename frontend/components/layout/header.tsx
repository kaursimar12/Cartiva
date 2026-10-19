import Link from "next/link";
import { BoltIcon, CameraIcon } from "@/components/common/icons";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { VoiceButton } from "@/components/voice/voice-button";
import { pricingService } from "@/lib/container";
import { formatPrice } from "@/lib/format";
import type { Category } from "@/models/entities/product";
import { CartLink } from "./cart-link";
import { CategoryNav } from "./category-nav";
import { HeaderShell } from "./header-shell";
import { SearchForm } from "./search-form";

export function Header({ categories }: { categories: Category[] }) {
  return (
    <HeaderShell>
      <div className="mx-auto flex max-w-[1920px] items-center gap-3 px-4 py-3 transition-[padding] duration-300 ease-luxe group-data-[scrolled=true]:py-2 sm:gap-6 sm:px-6 lg:px-10">
        <Link href="/" className="flex shrink-0 items-baseline gap-1" aria-label="Cartiva home">
          <span className="font-display text-[30px] leading-none tracking-tight text-zinc-900">cartiva</span>
          <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden />
        </Link>

        <div className="hidden shrink-0 border-l border-hairline pl-6 xl:block">
          <p className="flex items-center gap-1 text-sm font-semibold text-zinc-900">
            <BoltIcon className="h-4 w-4 text-brand-600" />
            Delivery in 10 minutes
          </p>
          <p className="text-xs text-zinc-500">Free above {formatPrice(pricingService.delivery.freeAbove)}</p>
        </div>

        <SearchForm id="site-search" className="hidden flex-1 md:block" />
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/scan-list"
            className="flex h-11 items-center gap-2 rounded-full border border-hairline bg-surface px-3 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 sm:px-4"
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
    </HeaderShell>
  );
}
