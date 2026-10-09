import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductBrowser } from "@/components/products/product-browser";
import { categoryEmoji, imageSurface } from "@/components/products/visuals";
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
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-zinc-500">
        <Link href="/" className="hover:text-brand-700">
          Home
        </Link>{" "}
        / <span className="text-zinc-800">{category.name}</span>
      </nav>
      <header className="mb-6 flex items-center gap-4">
        <span className={`flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ${imageSurface}`} aria-hidden>
          {categoryEmoji[category.id]}
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{category.name}</h1>
          <p className="text-sm text-zinc-600">{category.description}</p>
        </div>
      </header>
      <ProductBrowser products={products} />
    </div>
  );
}
