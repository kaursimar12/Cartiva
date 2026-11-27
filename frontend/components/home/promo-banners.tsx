import Image from "next/image";
import Link from "next/link";
import { CameraIcon, ChevronRightIcon } from "@/components/common/icons";
import { catalogService, pricingService } from "@/lib/container";
import { formatPrice } from "@/lib/format";
import { VoiceBanner } from "./voice-banner";
import { brand } from "@/lib/brand";

/** Biggest deal in an aisle, e.g. 20 for "up to 20% off". */
function maxDealPercent(categoryId: string): number {
  return Math.max(
    0,
    ...catalogService
      .getDealProducts(categoryId)
      .map((p) => catalogService.getDeal(p))
      .filter((d) => d?.discountType === "percentage")
      .map((d) => d!.discountValue),
  );
}

/**
 * Top of the home page. The two signature features lead: shop by voice (the large panel) and
 * scan a shopping list; today's deals on the featured aisle sit beside them. Static: nothing auto-rotates.
 */
export function PromoBanners() {
  const featured = catalogService.getCategory(brand.featuredAisle.categoryId);
  const featuredDeal = maxDealPercent(brand.featuredAisle.categoryId);

  return (
    <div className="grid gap-3 lg:grid-cols-3 lg:grid-rows-2">
      <div className="lg:col-span-2 lg:row-span-2">
        <VoiceBanner />
      </div>

      <Link
        href="/scan-list"
        className="group flex h-full flex-col justify-between gap-5 rounded-2xl border border-hairline bg-surface p-6 transition-colors hover:border-zinc-300"
      >
        <span>
          <span className="flex items-center justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <CameraIcon className="h-6 w-6" />
            </span>
            <span className="rounded-full bg-brand-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">New</span>
          </span>
          <span className="mt-4 block text-xl leading-tight font-semibold text-zinc-900">Scan your shopping list</span>
          <span className="mt-2 block text-sm text-zinc-600">
            Take a photo of a handwritten list. {brand.assistant.name} reads it, matches every item and fills your cart. Hindi lists
            work too.
          </span>
        </span>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors group-hover:bg-brand-700">
          <CameraIcon className="h-4 w-4" />
          Scan a list
        </span>
      </Link>

      <Link
        href={`/offers?category=${brand.featuredAisle.categoryId}`}
        className="relative flex h-full min-h-40 overflow-hidden rounded-2xl border border-hairline bg-[#fbf3e4] text-zinc-900 dark:bg-[#3a352c]"
      >
        <span className="relative z-10 flex max-w-[62%] flex-col justify-between p-6">
          <span>
            <span className="block text-xs font-medium text-zinc-600">Today’s deals</span>
            <span className="mt-1 block text-lg leading-tight font-semibold">
              {featuredDeal > 0 ? `Up to ${featuredDeal}% off ${brand.featuredAisle.label}` : `Shop ${brand.featuredAisle.label}`}
            </span>
            <span className="mt-1 block text-sm text-zinc-600">
              Free delivery above {formatPrice(pricingService.delivery.freeAbove)}
            </span>
          </span>
          <span className="mt-3 inline-flex items-center gap-0.5 text-sm font-semibold text-zinc-900">
            View offers
            <ChevronRightIcon className="h-4 w-4" />
          </span>
        </span>
        {featured && (
          <Image
            src={featured.image}
            alt=""
            width={300}
            height={300}
            className="absolute top-0 right-0 h-full w-[40%] object-cover"
            priority
          />
        )}
      </Link>
    </div>
  );
}
