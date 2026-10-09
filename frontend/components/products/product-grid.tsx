import type { Product } from "@/models/entities/product";
import { ProductCard } from "./product-card";

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}

/** Horizontally scrolling row for homepage sections. */
export function ProductRail({ products }: { products: Product[] }) {
  return (
    <ul className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:gap-4 sm:px-6">
      {products.map((product) => (
        <li key={product.id} className="w-40 shrink-0 snap-start sm:w-48">
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
