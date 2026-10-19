import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductBrowser } from "@/components/products/product-browser";
import { catalogService } from "@/lib/container";

export function generateStaticParams() {
  return catalogService.getCategories().map((c) => ({ category: c.id }));
}

export async function generateMetadata(props: PageProps<"/category/[category]">): Promise<Metadata> {
  const { category } = await props.params;
  return { title: catalogService.getCategory(category)?.name ?? "Category not found" };
}

export default async function CategoryPage(props: PageProps<"/category/[category]">) {
  const { category: categoryId } = await props.params;
  const category = catalogService.getCategory(categoryId);
  if (!category) notFound();

  const products = catalogService.getProductsByCategory(category.id);

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-zinc-500 sm:text-sm">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>{" "}
        / <span className="text-zinc-800">{category.name}</span>
      </nav>
      <header className="mb-6 flex items-center gap-4">
        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-zinc-100 ring-1 ring-hairline sm:h-20 sm:w-20">
          <Image src={category.image} alt="" fill sizes="80px" className="object-cover" priority />
        </span>
        <div>
          <h1 className="font-display text-4xl leading-none tracking-tight text-zinc-900 sm:text-5xl">{category.name}</h1>
          <p className="mt-0.5 text-sm text-zinc-600">{category.description}</p>
        </div>
      </header>
      <ProductBrowser products={products} screenTitle={category.name} />
    </div>
  );
}
