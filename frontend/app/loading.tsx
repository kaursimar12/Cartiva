import { ProductGridSkeleton } from "@/components/products/product-grid";

/** Shown instantly while a page (category, product, search) loads. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading">
      <div className="mb-6 h-8 w-56 animate-pulse rounded-lg bg-zinc-200" />
      <ProductGridSkeleton />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
