import type { Product } from "@/models/entities/product";

export const LOW_STOCK_THRESHOLD = 3;

export function StockBadge({ product }: { product: Product }) {
  if (!product.stock) {
    return <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-white">Out of stock</span>;
  }
  if (product.availableQuantity <= LOW_STOCK_THRESHOLD) {
    return (
      <span className="rounded-md border border-zinc-300 bg-surface px-2 py-0.5 text-xs font-semibold text-zinc-800">
        Only {product.availableQuantity} left
      </span>
    );
  }
  return null;
}
