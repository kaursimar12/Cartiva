import Link from "next/link";
import { CategoryGrid } from "@/components/categories/category-grid";
import { HeroHeadline } from "@/components/common/hero-headline";
import { BoltIcon, ShieldIcon, TruckIcon } from "@/components/common/icons";
import { Reveal } from "@/components/common/reveal";
import { SectionHeader } from "@/components/common/section-header";
import { OfferList } from "@/components/offers/offer-list";
import { ProductRail } from "@/components/products/product-grid";
import { VoiceHeroCard } from "@/components/voice/voice-hero-card";
import { catalogService, pricingService } from "@/lib/container";
import { formatPrice } from "@/lib/format";

export default function HomePage() {
  const categories = catalogService.getCategories();
  const featured = catalogService.getFeaturedProducts();
  const offers = catalogService.getActiveOffers();

  const promises = [
    { icon: BoltIcon, text: "Delivered in 10 minutes" },
    { icon: TruckIcon, text: `Free delivery above ${formatPrice(pricingService.delivery.freeAbove)}` },
    { icon: ShieldIcon, text: "Secure Razorpay checkout" },
  ];

  return (
    <div className="space-y-16 sm:space-y-20">
      <section className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col justify-between rounded-[1.75rem] border border-hairline bg-surface p-7 sm:p-12">
          <div>
            <p className="text-sm font-medium text-brand-700">Groceries, by voice or by tap</p>
            <HeroHeadline lines={[{ text: "Fill your cart" }, { text: "just by asking.", accent: true }]} />
            <p className="mt-6 max-w-md text-base text-zinc-600 sm:text-lg">
              Fresh produce, dairy and daily essentials from the brands you know. Browse yourself, or tell Cartiva
              what you need and watch it shop.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="#categories"
                className="flex h-12 items-center rounded-full bg-zinc-900 px-7 text-sm font-semibold text-background transition-opacity hover:opacity-90"
              >
                Start shopping
              </Link>
              <Link
                href="/scan-list"
                className="flex h-12 items-center rounded-full border border-hairline px-7 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50"
              >
                Scan a shopping list
              </Link>
            </div>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-hairline pt-6 text-sm text-zinc-600">
            {promises.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-brand-600" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <VoiceHeroCard />
      </section>

      <section id="categories" aria-labelledby="categories-heading" className="scroll-mt-40">
        <Reveal>
          <SectionHeader id="categories-heading" title="Shop by category" />
        </Reveal>
        <CategoryGrid categories={categories} />
      </section>

      <section aria-label="Offers">
        <Reveal>
          <SectionHeader title="Today’s offers" subtitle="Applied automatically at checkout" />
        </Reveal>
        <OfferList offers={offers} categories={categories} />
      </section>

      <section aria-label="Featured products">
        <Reveal>
          <SectionHeader title="Bestsellers" subtitle="What everyone’s adding this week" />
        </Reveal>
        <ProductRail products={featured} />
      </section>

      {categories.map((category) => (
        <section key={category.id} aria-label={category.name}>
          <Reveal>
            <SectionHeader title={category.name} subtitle={category.description} href={`/category/${category.id}`} />
          </Reveal>
          <ProductRail products={catalogService.getProductsByCategory(category.id).slice(0, 10)} />
        </section>
      ))}
    </div>
  );
}
