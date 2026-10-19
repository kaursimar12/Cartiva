import { catalogService } from "@/lib/container";
import type { Product } from "@/models/entities/product";

const pill = "rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide";

export function StockBadge({ product }: { product: Product }) {
  const status = catalogService.getStockStatus(product);
  if (status === "out-of-stock") {
    return <span className={`${pill} bg-zinc-900 text-background`}>Out of stock</span>;
  }
  if (status === "low-stock") {
    return <span className={`${pill} bg-amber-100 text-amber-900 ring-1 ring-amber-300/60`}>Only {product.availableQuantity} left</span>;
  }
  return null;
}
