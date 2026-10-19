import type { Product } from "@/models/entities/product";
import { Reveal } from "@/components/common/reveal";
import { ProductCard } from "./product-card";

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-5 pt-3 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 min-[1800px]:grid-cols-7">
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} index={index} />
        </li>
      ))}
    </ul>
  );
}

/** Placeholder cards shown while a page of products loads. */
export function ProductGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="rounded-3xl border border-hairline bg-surface p-2">
          <div className="shimmer aspect-square rounded-2xl" />
          <div className="mt-3 h-3 w-1/3 shimmer rounded" />
          <div className="mt-2 h-4 w-4/5 shimmer rounded" />
          <div className="mt-4 flex items-center justify-between">
            <div className="h-4 w-12 shimmer rounded" />
            <div className="h-8 w-16 shimmer rounded-lg" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Single row for homepage sections: cards stretch to fill the width, and the row
 * scrolls horizontally once they would shrink below their minimum width.
 */
export function ProductRail({ products }: { products: Product[] }) {
  return (
    <ul className="scrollbar-none -mx-4 grid snap-x auto-cols-[minmax(10.5rem,1fr)] grid-flow-col gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:auto-cols-[minmax(12rem,1fr)] sm:gap-4 sm:px-6 lg:-mx-10 lg:px-10">
      {products.map((product, index) => (
        <Reveal as="li" key={product.id} delay={Math.min(index, 8) * 0.05} className="snap-start pt-3">
          <ProductCard product={product} index={index} />
        </Reveal>
      ))}
    </ul>
  );
}
