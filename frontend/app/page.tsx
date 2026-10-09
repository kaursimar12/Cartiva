import Link from "next/link";
import { CategoryGrid } from "@/components/categories/category-grid";
import { SectionHeader } from "@/components/common/section-header";
import { OfferList } from "@/components/offers/offer-list";
import { ProductRail } from "@/components/products/product-grid";
import { catalogService } from "@/lib/container";

const voiceExamples = ["Show me vegetables", "Add 1 kg tomatoes", "Dishwashing liquids under ₹200", "What's my total?"];

export default function HomePage() {
  const categories = catalogService.getCategories();
  const featured = catalogService.getFeaturedProducts();
  const offers = catalogService.getActiveOffers();

  return (
    <div className="space-y-12">
      <section className="overflow-hidden rounded-3xl bg-zinc-900 px-6 py-10 text-white sm:px-10 sm:py-14">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-wide text-zinc-400 uppercase">Groceries, delivered</p>
          <h1 className="mt-2 text-3xl leading-tight font-extrabold sm:text-5xl">Shop by tapping — or just ask.</h1>
          <p className="mt-4 text-base text-zinc-300 sm:text-lg">
            Fresh produce, daily essentials and household favourites. Browse the store yourself or let the Cartiva
            voice assistant fill your cart.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="#categories"
              className="rounded-xl bg-surface px-5 py-3 text-sm font-semibold text-brand-800 shadow-sm hover:bg-brand-50"
            >
              Start shopping
            </Link>
            <Link
              href="/cart"
              className="rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              View cart
            </Link>
          </div>
          <div className="mt-8">
            <p className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">🎤 Try saying</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {voiceExamples.map((example) => (
                <li key={example} className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200">
                  “{example}”
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="categories" aria-labelledby="categories-heading" className="scroll-mt-40">
        <h2 id="categories-heading" className="mb-4 text-xl font-bold tracking-tight sm:text-2xl">
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
          <ProductRail products={catalogService.getProductsByCategory(category.id).slice(0, 8)} />
        </section>
      ))}
    </div>
  );
}
