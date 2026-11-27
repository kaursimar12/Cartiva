import Link from "next/link";
import { ChevronRightIcon, TagIcon } from "@/components/common/icons";
import { ProductRail } from "@/components/products/product-grid";
import { brand } from "@/lib/brand";
import { catalogService } from "@/lib/container";

/** "Deals of the day" as an ad band: bold headline with the real numbers, then the discounted products. */
export function DealsShowcase() {
  const deals = catalogService.getDealProducts().filter((p) => p.stock);
  const ink = brand.palette?.light[900] ?? "#14532d"; // dark text on the band's light chips
  if (deals.length === 0) return null;

  const best = Math.max(
    ...deals.map((p) => catalogService.getDeal(p)).map((d) => (d?.discountType === "percentage" ? d.discountValue : 0)),
  );

  return (
    <section
      aria-labelledby="deals-heading"
      className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#14532d] to-[#166534] px-4 pt-6 pb-4 text-white sm:px-6"
      // Brands with their own colours get the band in their deepest shades (fixed hex, same in light and dark mode).
      style={
        brand.palette
          ? { backgroundImage: `linear-gradient(to bottom right, ${brand.palette.light[900]}, ${brand.palette.light[700]})` }
          : undefined
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-4 px-1">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-[#facc15] px-3 py-1 text-xs font-bold tracking-wide uppercase" style={{ color: ink }}>
            <TagIcon className="h-3.5 w-3.5" />
            Deals of the day
          </p>
          <h2 id="deals-heading" className="mt-3 text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
            {best > 0 ? `Up to ${best}% off` : "Today’s deals"} on {deals.length} items
          </h2>
          <p className="mt-1 text-sm text-white/75">No coupon needed. The discount is applied at checkout.</p>
        </div>
        <Link
          href="/offers"
          className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-semibold hover:bg-white/90"
          style={{ color: ink }}
        >
          See all deals
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-4">
        <ProductRail products={deals} inset />
      </div>
    </section>
  );
}
