import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHeader } from "@/components/common/section-header";
import { ProductRail } from "@/components/products/product-grid";
import { ProductImage } from "@/components/products/product-image";
import { ProductPurchasePanel } from "@/components/products/product-purchase-panel";
import { StockBadge } from "@/components/products/stock-badge";
import { formatPrice } from "@/lib/format";
import { catalogService } from "@/lib/container";

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

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-zinc-500 sm:text-sm">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>{" "}
        /{" "}
        <Link href={`/category/${product.category}`} className="hover:text-brand-700">
          {category?.name}
        </Link>{" "}
        / <span className="text-zinc-800">{product.name}</span>
      </nav>

      <article className="grid gap-6 rounded-3xl border border-zinc-200 bg-surface p-4 shadow-sm sm:p-6 md:grid-cols-2 md:gap-10 md:p-8">
        <ProductImage product={product} size="lg" priority />
        <div className="flex flex-col">
          {product.brand && <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">{product.brand}</p>}
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">{product.name}</h1>
          <p className="mt-2 inline-flex w-fit rounded-md bg-zinc-100 px-2 py-0.5 text-sm font-medium text-zinc-700">{product.unit}</p>

          <div className="mt-4 flex items-center gap-3">
            <p className="text-3xl font-extrabold text-zinc-900">{formatPrice(product.price)}</p>
            <StockBadge product={product} />
            {catalogService.getStockStatus(product) === "in-stock" && (
              <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">In stock</span>
            )}
          </div>
          <p className="text-xs text-zinc-500">Inclusive of all taxes</p>

          <div className="mt-6">
            <ProductPurchasePanel product={product} />
          </div>

          <section aria-labelledby="about" className="mt-8 border-t border-zinc-200 pt-6">
            <h2 id="about" className="font-semibold">
              About this product
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">{product.description}</p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-surface-muted p-4 text-sm">
              <dt className="text-zinc-500">Category</dt>
              <dd className="font-medium">{category?.name}</dd>
              <dt className="text-zinc-500">Brand</dt>
              <dd className="font-medium">{product.brand ?? "Fresh / unbranded"}</dd>
              <dt className="text-zinc-500">Pack size</dt>
              <dd className="font-medium">{product.unit}</dd>
            </dl>
          </section>
        </div>
      </article>

      {related.length > 0 && (
        <section aria-label="Related products" className="mt-12">
          <SectionHeader title={`More in ${category?.name}`} href={`/category/${product.category}`} />
          <ProductRail products={related} />
        </section>
      )}
    </div>
  );
}
