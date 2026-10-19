import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/common/empty-state";
import { formatPrice, rupeesToPaise } from "@/models/entities/money";
import { ProductBrowser } from "@/components/products/product-browser";
import { catalogService } from "@/lib/container";

const suggestions = ["tomato", "milk", "Surf Excel", "dishwashing liquid", "chips", "shampoo"];

/** Reads an optional rupee amount from the URL, e.g. ?max=200 → 20000 paise. */
function rupeesParam(value: string | string[] | undefined): number | undefined {
  const rupees = typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(rupees) && rupees >= 0 ? rupeesToPaise(rupees) : undefined;
}

export async function generateMetadata(props: PageProps<"/search">): Promise<Metadata> {
  const { q } = await props.searchParams;
  return { title: typeof q === "string" && q ? `Search: ${q}` : "Search" };
}

export default async function SearchPage(props: PageProps<"/search">) {
  const { q, min, max } = await props.searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const minPrice = rupeesParam(min);
  const maxPrice = rupeesParam(max);
  const results = query ? catalogService.filter({ query, minPrice, maxPrice }) : [];

  return (
    <div>
      <h1 className="mb-6 font-display text-4xl leading-none tracking-tight sm:text-5xl">
        {query ? (
          <>
            Results for <span className="text-brand-700">“{query}”</span>
            {maxPrice !== undefined && <> under {formatPrice(maxPrice)}</>}
            {minPrice !== undefined && <> from {formatPrice(minPrice)}</>}

          </>
        ) : (
          "Search products"
        )}
      </h1>

      {results.length > 0 ? (
        <ProductBrowser
          key={`${query}-${minPrice}-${maxPrice}`}
          products={results}
          screenTitle={`Search results for "${query}"`}
        />
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
