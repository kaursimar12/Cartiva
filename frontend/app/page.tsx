import { CategoryGrid } from "@/components/categories/category-grid";
import { SectionHeader } from "@/components/common/section-header";
import { DealsShowcase } from "@/components/home/deals-showcase";
import { PromoBanners } from "@/components/home/promo-banners";
import { OfferList } from "@/components/offers/offer-list";
import { ProductRail } from "@/components/products/product-grid";
import { catalogService } from "@/lib/container";

/**
 * Store front, laid out like a real quick-commerce app: the voice and scan-list features, aisles,
 * then the offers (deals band + offer ads) high up, then bestsellers and each aisle.
 */
export default function HomePage() {
  const categories = catalogService.getCategories();
  const featured = catalogService.getFeaturedProducts();
  const offers = catalogService.getStoreOffers();

  return (
    <div className="space-y-10 sm:space-y-12">
      <h1 className="sr-only">Cartiva: groceries delivered in 10 minutes</h1>

      <PromoBanners />

      <section id="categories" aria-labelledby="categories-heading" className="scroll-mt-40">
        <SectionHeader id="categories-heading" title="Shop by category" />
        <CategoryGrid categories={categories} />
      </section>

      <DealsShowcase />

      {offers.length > 0 && (
        <section aria-labelledby="store-offers-heading">
          <SectionHeader
            id="store-offers-heading"
            title="More ways to save"
            subtitle="Applied automatically at checkout"
            href="/offers"
            linkLabel="All offers"
          />
          <OfferList offers={offers} categories={categories} />
        </section>
      )}

      <section aria-labelledby="bestsellers-heading">
        <SectionHeader id="bestsellers-heading" title="Bestsellers" />
        <ProductRail products={featured} />
      </section>

      {categories.map((category) => (
        <section key={category.id} aria-label={category.name}>
          <SectionHeader title={category.name} subtitle={category.description} href={`/category/${category.id}`} />
          <ProductRail products={catalogService.getProductsByCategory(category.id).slice(0, 12)} />
        </section>
      ))}
    </div>
  );
}
