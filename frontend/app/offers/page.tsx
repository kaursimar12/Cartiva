import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { TruckIcon } from "@/components/common/icons";
import { Reveal } from "@/components/common/reveal";
import { SectionHeader } from "@/components/common/section-header";
import { OfferList } from "@/components/offers/offer-list";
import { ProductBrowser } from "@/components/products/product-browser";
import { catalogService, pricingService } from "@/lib/container";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Offers" };

/**
 * Every offer running today: store-wide and category offers, then products with their own deal.
 * `?category=vegetables` narrows the page to one aisle ("show only discounted vegetables").
 */
export default async function OffersPage(props: PageProps<"/offers">) {
  const { category: requested } = await props.searchParams;
  const dealCategories = catalogService.getDealCategories();
  const category = dealCategories.find((c) => c.id === requested);

  const storeOffers = catalogService
    .getStoreOffers()
    .filter((offer) => !category || offer.category === null || offer.category === category.id);
  const dealProducts = catalogService.getDealProducts(category?.id);
  const categories = catalogService.getCategories();
  const bestDeal = Math.max(
    0,
    ...dealProducts.map((p) => catalogService.getDeal(p)).map((d) => (d?.discountType === "percentage" ? d.discountValue : 0)),
  );
  const collage = dealProducts.filter((p) => p.stock).slice(0, 4);

  const chip = (active: boolean) =>
    `flex h-9 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors ${
      active
        ? "border-zinc-900 bg-zinc-900 text-background"
        : "border-hairline bg-surface text-zinc-700 hover:border-zinc-300"
    }`;

  return (
    <div className="space-y-12">
      {/* Ad-style hero: the real best discount and deal count, with photos of the discounted products. */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#9a3412] to-[#c2410c] text-white">
        <div className="relative z-10 max-w-2xl p-7 sm:p-10">
          <p className="inline-flex rounded-full bg-[#facc15] px-3 py-1 text-xs font-bold tracking-wide text-[#7c2d12] uppercase">
            {category ? `${category.name} offers` : "Today’s offers"}
          </p>
          <h1 className="mt-4 text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
            {bestDeal > 0 ? `Up to ${bestDeal}% off` : "Offers"}
            {category ? ` on ${category.name.toLowerCase()}` : ""}
          </h1>
          <p className="mt-2 text-base text-white/85">Every discount is applied automatically at checkout. No coupon codes.</p>
          <ul className="mt-6 flex flex-wrap gap-2 text-sm font-medium">
            <li className="rounded-full bg-white/15 px-3.5 py-1.5">
              {dealProducts.length} discounted product{dealProducts.length === 1 ? "" : "s"}
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5">
              <TruckIcon className="h-4 w-4" />
              Free delivery above {formatPrice(pricingService.delivery.freeAbove)}
            </li>
            <li className="rounded-full bg-white/15 px-3.5 py-1.5">No coupon needed</li>
          </ul>
        </div>
        {collage.length > 0 && (
          <div aria-hidden className="absolute inset-y-0 right-0 hidden w-[38%] grid-cols-2 gap-1.5 p-3 lg:grid">
            {collage.map((p) => (
              <span key={p.id} className="relative overflow-hidden rounded-xl">
                <Image src={p.image} alt="" fill sizes="220px" className="object-cover" />
              </span>
            ))}
          </div>
        )}
      </header>

      {storeOffers.length > 0 && (
        <section aria-labelledby="store-offers-heading">
          <Reveal>
            <SectionHeader id="store-offers-heading" title="Store offers" subtitle="On a category or your whole order" />
          </Reveal>
          <OfferList offers={storeOffers} categories={categories} />
        </section>
      )}

      <section aria-labelledby="deals-heading">
        <Reveal>
          <SectionHeader
            id="deals-heading"
            title={category ? `Discounted ${category.name.toLowerCase()}` : "Product deals"}
            subtitle="Discounted items, no minimum order"
          />
        </Reveal>
        <nav aria-label="Filter deals by category" className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Link href="/offers" className={chip(!category)} aria-current={!category ? "page" : undefined}>
            All
          </Link>
          {dealCategories.map((c) => (
            <Link
              key={c.id}
              href={`/offers?category=${c.id}`}
              className={chip(category?.id === c.id)}
              aria-current={category?.id === c.id ? "page" : undefined}
            >
              {c.name}
            </Link>
          ))}
        </nav>
        {dealProducts.length > 0 ? (
          // key: a new aisle starts with fresh filters; screenTitle tells the voice agent what's on screen.
          <ProductBrowser
            key={category?.id ?? "all"}
            products={dealProducts}
            screenTitle={category ? `Discounted ${category.name}` : "Offers"}
          />
        ) : (
          <p className="text-zinc-600">No product deals here today. Check back soon.</p>
        )}
      </section>
    </div>
  );
}
