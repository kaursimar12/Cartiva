import type { Product } from "@/models/entities/product";
import { ProductCard } from "./product-card";

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 min-[1800px]:grid-cols-7">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
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
      {products.map((product) => (
        <li key={product.id} className="snap-start">
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
