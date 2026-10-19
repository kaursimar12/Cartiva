"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/common/empty-state";
import { screenController } from "@/controllers/screen-controller";
import { catalogService } from "@/lib/container";
import { rupeesToPaise } from "@/models/entities/money";
import type { Product } from "@/models/entities/product";
import type { ProductSort } from "@/services/catalog-service";
import { ProductGrid } from "./product-grid";

const priceRanges = [
  { id: "all", label: "Any price" },
  { id: "0-50", label: "Under ₹50", max: 50 },
  { id: "50-100", label: "₹50 – ₹100", min: 50, max: 100 },
  { id: "100-200", label: "₹100 – ₹200", min: 100, max: 200 },
  { id: "200-500", label: "₹200 – ₹500", min: 200, max: 500 },
  { id: "500+", label: "Above ₹500", min: 500 },
] as const;

type PriceRangeId = (typeof priceRanges)[number]["id"];

const sortOptions: { id: ProductSort; label: string }[] = [
  { id: "relevance", label: "Relevance" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "name", label: "Name" },
];

const selectClass =
  "h-10 rounded-full border border-hairline bg-zinc-50/70 px-4 text-sm font-medium text-zinc-800 transition-colors hover:border-zinc-300 focus:border-brand-500 focus:outline-none";

/** Filterable, sortable product listing (SRS FR-05). Filtering rules live in CatalogService. */
export function ProductBrowser({ products, screenTitle }: { products: Product[]; screenTitle: string }) {
  const [priceRange, setPriceRange] = useState<PriceRangeId>("all");
  const [brand, setBrand] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<ProductSort>("relevance");

  const brands = useMemo(() => catalogService.getBrands(products), [products]);

  const visible = useMemo(() => {
    const range = priceRanges.find((r) => r.id === priceRange)!;
    const filtered = catalogService.filter(
      {
        minPrice: "min" in range ? rupeesToPaise(range.min) : undefined,
        maxPrice: "max" in range ? rupeesToPaise(range.max) : undefined,
        brand: brand || undefined,
        available: inStockOnly,
      },
      products,
    );
    return catalogService.sort(filtered, sort);
  }, [products, priceRange, brand, inStockOnly, sort]);

  // Tell the voice agent what is on screen, in on-screen order (after filters and sorting).
  useEffect(() => {
    screenController.showProducts(screenTitle, visible.map((p) => p.id));
  }, [screenTitle, visible]);

  const hasFilters = priceRange !== "all" || brand !== "" || inStockOnly;

  function resetFilters() {
    setPriceRange("all");
    setBrand("");
    setInStockOnly(false);
  }

  return (
    <div>
      <div className="glass mb-6 flex flex-wrap items-center gap-2 rounded-3xl p-2 lg:rounded-full">
        <label className="sr-only" htmlFor="filter-price">
          Price range
        </label>
        <select id="filter-price" value={priceRange} onChange={(e) => setPriceRange(e.target.value as PriceRangeId)} className={selectClass}>
          {priceRanges.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>

        {brands.length > 1 && (
          <>
            <label className="sr-only" htmlFor="filter-brand">
              Brand
            </label>
            <select id="filter-brand" value={brand} onChange={(e) => setBrand(e.target.value)} className={selectClass}>
              <option value="">All brands</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </>
        )}

        <label className="flex h-10 cursor-pointer items-center gap-2 rounded-full border border-hairline bg-zinc-50/70 px-4 text-sm font-medium text-zinc-800">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="h-4 w-4 accent-brand-600"
          />
          In stock only
        </label>

        {hasFilters && (
          <button type="button" onClick={resetFilters} className="px-2 text-sm font-semibold text-brand-700 hover:text-brand-800">
            Clear filters
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="sort" className="text-sm text-zinc-600">
            Sort
          </label>
          <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as ProductSort)} className={selectClass}>
            {sortOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mb-3 text-sm text-zinc-600" aria-live="polite">
        {visible.length} product{visible.length === 1 ? "" : "s"}
      </p>

      {visible.length > 0 ? (
        <ProductGrid products={visible} />
      ) : (
        <EmptyState icon="🔎" title="No products match these filters" description="Try a different price range or brand.">
          <button
            type="button"
            onClick={resetFilters}
            className="mt-6 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Clear filters
          </button>
        </EmptyState>
      )}
    </div>
  );
}
