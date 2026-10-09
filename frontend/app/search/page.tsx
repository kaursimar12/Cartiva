import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { ProductBrowser } from "@/components/products/product-browser";
import { catalogService } from "@/lib/container";

const suggestions = ["tomato", "milk", "Surf Excel", "dishwashing liquid", "chips", "shampoo"];

export async function generateMetadata(props: PageProps<"/search">): Promise<Metadata> {
  const { q } = await props.searchParams;
  return { title: typeof q === "string" && q ? `Search: ${q}` : "Search" };
}

export default async function SearchPage(props: PageProps<"/search">) {
  const { q } = await props.searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const results = query ? catalogService.search(query) : [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">
        {query ? (
          <>
            Results for <span className="text-brand-700">“{query}”</span>
          </>
        ) : (
          "Search products"
        )}
      </h1>

      {results.length > 0 ? (
        <ProductBrowser key={query} products={results} />
      ) : (
        <EmptyState
          icon="🔍"
          title={query ? "We couldn't find that product" : "What are you looking for?"}
          description={query ? "Check the spelling or try one of these popular searches." : "Try one of these popular searches."}
        >
          <ul className="mt-6 flex flex-wrap justify-center gap-2">
            {suggestions.map((s) => (
              <li key={s}>
                <Link
                  href={`/search?q=${encodeURIComponent(s)}`}
                  className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm hover:border-brand-500 hover:text-brand-700"
                >
                  {s}
                </Link>
              </li>
            ))}
          </ul>
        </EmptyState>
      )}
    </div>
  );
}
