import { catalogService } from "@/lib/container";
import type { Product } from "@/models/entities/product";

export function StockBadge({ product }: { product: Product }) {
  const status = catalogService.getStockStatus(product);
  if (status === "out-of-stock") {
    return <span className="rounded-md bg-foreground px-2 py-0.5 text-[11px] font-semibold text-background">Out of stock</span>;
  }
  if (status === "low-stock") {
    return (
      <span className="rounded-md bg-surface/95 px-2 py-0.5 text-[11px] font-semibold text-zinc-800 shadow-sm ring-1 ring-zinc-200">
        Only {product.availableQuantity} left
      </span>
    );
  }
  return null;
}
