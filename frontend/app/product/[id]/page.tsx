import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BoltIcon, ChevronRightIcon, MicIcon, ShieldIcon, TagIcon, TruckIcon } from "@/components/common/icons";
import { SectionHeader } from "@/components/common/section-header";
import { ProductRail } from "@/components/products/product-grid";
import { ProductImage } from "@/components/products/product-image";
import { ProductPurchasePanel } from "@/components/products/product-purchase-panel";
import { StockBadge } from "@/components/products/stock-badge";
import { formatPrice } from "@/lib/format";
import { catalogService, pricingService } from "@/lib/container";

export function generateStaticParams() {
  return catalogService.getAllProducts().map((p) => ({ id: p.id }));
}

export async function generateMetadata(props: PageProps<"/product/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const product = catalogService.getProduct(id);
  return product
    ? { title: `${product.name} (${product.unit})`, description: product.description }
    : { title: "Product not found" };
}

export default async function ProductPage(props: PageProps<"/product/[id]">) {
  const { id } = await props.params;
  const product = catalogService.getProduct(id);
  if (!product) notFound();

  const category = catalogService.getCategory(product.category);
  const related = catalogService.getProductsByCategory(product.category).filter((p) => p.id !== product.id).slice(0, 8);
  const unitPrice = catalogService.unitPrice(product);
  const offers = catalogService.getOffersFor(product);
  const inStock = catalogService.getStockStatus(product) !== "out-of-stock";

  const perks = [
    { icon: BoltIcon, title: "Arrives in about 10 minutes", text: "Packed fresh when you order" },
    { icon: TruckIcon, title: "Free delivery", text: `On orders above ${formatPrice(pricingService.delivery.freeAbove)}` },
    { icon: ShieldIcon, title: "Secure payment", text: "UPI, cards and netbanking via Razorpay" },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-900">
          Home
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <Link href={`/category/${product.category}`} className="hover:text-zinc-900">
          {category?.name}
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="truncate text-zinc-900">{product.name}</span>
      </nav>

      <article className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-14">
        {/* Photo: a contained tile that stays in view while the details scroll. */}
        <div className="md:sticky md:top-36 md:self-start">
          <div className="relative">
            <ProductImage product={product} size="lg" priority />
            <div className="absolute top-4 left-4 flex flex-col items-start gap-2">
              <span className="flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-zinc-900 uppercase shadow-sm backdrop-blur">
                <BoltIcon className="h-3.5 w-3.5 text-brand-600" />
                10 mins
              </span>
              <StockBadge product={product} />
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          <Link
            href={`/category/${product.category}`}
            className="w-fit text-xs font-semibold tracking-[0.14em] text-brand-700 uppercase hover:text-brand-800"
          >
            {product.brand ?? category?.name}
          </Link>
          <h1 className="mt-3 font-display text-5xl leading-[0.95] tracking-tight text-zinc-900 sm:text-6xl">{product.name}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full border border-hairline bg-surface px-3 py-1 font-medium text-zinc-700">{product.unit}</span>
            {unitPrice && (
              <span className="tabular text-zinc-500">
                {formatPrice(unitPrice.amount)} per {unitPrice.per}
              </span>
            )}
          </div>

          <div className="mt-6 flex items-end gap-3">
            <p className="tabular text-5xl font-semibold tracking-tight text-zinc-900">{formatPrice(product.price)}</p>
            {inStock && (
              <span className="mb-2 flex items-center gap-1.5 rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-medium text-brand-700">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                In stock
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-500">Inclusive of all taxes</p>

          {/* Buy box. */}
          <section aria-label="Buy" className="mt-7 rounded-3xl border border-hairline bg-surface p-5 shadow-card sm:p-6">
            <ProductPurchasePanel product={product} />
            <ul className="mt-5 space-y-3 border-t border-hairline pt-5">
              {perks.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-zinc-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="leading-tight">
                    <span className="block text-sm font-medium text-zinc-900">{title}</span>
                    <span className="block text-xs text-zinc-500">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {offers.length > 0 && (
            <section aria-label="Offers" className="mt-4 grid gap-2 sm:grid-cols-2">
              {offers.map((offer) => (
                <div key={offer.id} className="flex items-center gap-3 rounded-2xl border border-dashed border-brand-500/40 bg-brand-500/5 px-4 py-3">
                  <TagIcon className="h-5 w-5 shrink-0 text-brand-600" />
                  <div className="leading-tight">
                    <p className="text-sm font-semibold text-zinc-900">{offer.title}</p>
                    <p className="tabular text-xs text-zinc-500">
                      {offer.category ? `${category?.name} above` : "Orders above"} {formatPrice(offer.minimumAmount)}
                    </p>
                  </div>
                </div>
              ))}
            </section>
          )}

          <p className="mt-4 flex w-fit items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-xs text-background">
            <MicIcon className="h-3.5 w-3.5 text-teal-300" />
            Try saying <span className="font-semibold">“Add 2 {product.name}”</span>
          </p>

          <section aria-labelledby="about" className="mt-10">
            <h2 id="about" className="font-display text-3xl leading-none">
              About this product
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-zinc-600">{product.description}</p>
            <dl className="mt-5 grid grid-cols-3 gap-2">
              {[
                ["Aisle", category?.name],
                ["Brand", product.brand ?? "Farm fresh"],
                ["Pack", product.unit],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-hairline bg-surface p-3">
                  <dt className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">{label}</dt>
                  <dd className="mt-1 truncate text-sm font-semibold text-zinc-900">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </article>

      {related.length > 0 && (
        <section aria-label="Related products" className="mt-20">
          <SectionHeader title={`More in ${category?.name}`} href={`/category/${product.category}`} />
          <ProductRail products={related} />
        </section>
      )}
    </div>
  );
}
