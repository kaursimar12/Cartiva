import Link from "next/link";
import { catalogService } from "@/lib/container";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/models/entities/product";
import { AddToCartControl } from "./add-to-cart-control";
import { AgentCardFrame } from "./agent-card-frame";
import { DealBadge } from "./deal-badge";
import { ProductImage } from "./product-image";
import { StockBadge } from "./stock-badge";

/**
 * Compact catalogue card: photo, name, pack size, price (with MRP struck out on deals) and ADD.
 * `index` is the card's position in its list, so agent results can stream in one by one.
 */
export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const unitPrice = catalogService.unitPrice(product);
  const deal = catalogService.getDeal(product);
  const dealPrice = catalogService.getDealPrice(product);

  return (
    <AgentCardFrame
      productId={product.id}
      index={index}
      className="group relative flex h-full flex-col rounded-xl border border-hairline bg-surface p-2 transition-[border-color,box-shadow] duration-200 hover:border-zinc-300 hover:shadow-card"
    >
      <div className="absolute top-3 left-3 z-10">
        <StockBadge product={product} />
      </div>
      {deal && (
        <div className="absolute top-3 right-3 z-10">
          <DealBadge deal={deal} />
        </div>
      )}
      <Link href={`/product/${product.id}`} className="flex flex-1 flex-col rounded-lg">
        <ProductImage product={product} />
        <div className="mt-2 flex flex-1 flex-col px-0.5">
          <h3 className="line-clamp-2 min-h-10 text-[13px] leading-5 font-medium text-zinc-900">{product.name}</h3>
          <p className="text-xs text-zinc-500">{product.unit}</p>
        </div>
      </Link>
      <div className="mt-2 flex items-end justify-between gap-2 px-0.5">
        <div className="tabular min-w-0 leading-tight">
          <p className="text-sm font-semibold text-zinc-900">{formatPrice(dealPrice ?? product.price)}</p>
          {dealPrice !== null ? (
            <p className="text-[11px] text-zinc-500">
              MRP <s aria-label={`was ${formatPrice(product.price)}`}>{formatPrice(product.price)}</s>
            </p>
          ) : (
            unitPrice && (
              <p className="text-[11px] text-zinc-500">
                {formatPrice(unitPrice.amount)}/{unitPrice.per}
              </p>
            )
          )}
        </div>
        <AddToCartControl product={product} />
      </div>
    </AgentCardFrame>
  );
}
