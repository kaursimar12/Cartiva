import { catalogService } from "@/lib/container";
import type { Product } from "@/models/entities/product";

export function StockBadge({ product }: { product: Product }) {
  const status = catalogService.getStockStatus(product);
  if (status === "out-of-stock") {
    return <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-white">Out of stock</span>;
  }
  if (status === "low-stock") {
    return (
      <span className="rounded-md border border-zinc-300 bg-surface px-2 py-0.5 text-xs font-semibold text-zinc-800">
        Only {product.availableQuantity} left
      </span>
    );
  }
  return null;
}
