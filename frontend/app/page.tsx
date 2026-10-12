import Image from "next/image";
import Link from "next/link";
import { CategoryGrid } from "@/components/categories/category-grid";
import { MicIcon } from "@/components/common/icons";
import { SectionHeader } from "@/components/common/section-header";
import { OfferList } from "@/components/offers/offer-list";
import { ProductRail } from "@/components/products/product-grid";
import { catalogService } from "@/lib/container";

const voiceExamples = ["Show me vegetables", "Add 1 kg tomatoes", "Dishwashing liquids under ₹200", "What's my total?"];

export default function HomePage() {
  const categories = catalogService.getCategories();
  const featured = catalogService.getFeaturedProducts();
  const offers = catalogService.getActiveOffers();
  const heroImages = categories.slice(0, 4);

  return (
    <div className="space-y-10 sm:space-y-12">
      <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-surface">
        <div className="grid items-center lg:grid-cols-[1fr_440px]">
          <div className="px-6 py-10 sm:px-10 sm:py-14">
            <p className="text-sm font-medium text-zinc-500">Fresh groceries, delivered</p>
            <h1 className="mt-2 text-3xl leading-tight font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
              Shop by tapping — or just ask.
            </h1>
            <p className="mt-4 max-w-xl text-base text-zinc-600 sm:text-lg">
              Fresh produce, daily essentials and household favourites. Browse the store yourself or let the Cartiva
              voice assistant fill your cart.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="#categories"
                className="rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Start shopping
              </Link>
              <Link
                href="/cart"
                className="rounded-xl border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
              >
                View cart
              </Link>
            </div>
            <div className="mt-8">
              <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                <MicIcon className="h-4 w-4" /> Try saying
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {voiceExamples.map((example) => (
                  <li key={example} className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-700">
                    “{example}”
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <ul aria-hidden className="hidden h-full grid-cols-2 gap-1 lg:grid">
            {heroImages.map((category) => (
              <li key={category.id} className="relative min-h-48">
                <Image src={category.image} alt="" fill sizes="220px" priority className="object-cover" />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="categories" aria-labelledby="categories-heading" className="scroll-mt-40">
        <h2 id="categories-heading" className="mb-4 text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
          Shop by category
        </h2>
        <CategoryGrid categories={categories} />
      </section>

      <section aria-label="Offers">
        <SectionHeader title="Offers for you" subtitle="Applied automatically at checkout" />
        <OfferList offers={offers} categories={categories} />
      </section>

      <section aria-label="Featured products">
        <SectionHeader title="Featured products" subtitle="Popular picks this week" />
        <ProductRail products={featured} />
      </section>

      {categories.map((category) => (
        <section key={category.id} aria-label={category.name}>
          <SectionHeader title={category.name} subtitle={category.description} href={`/category/${category.id}`} />
          <ProductRail products={catalogService.getProductsByCategory(category.id).slice(0, 10)} />
        </section>
      ))}
    </div>
  );
}
