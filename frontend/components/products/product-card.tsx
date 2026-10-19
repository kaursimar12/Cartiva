import Link from "next/link";
import { BoltIcon } from "@/components/common/icons";
import { catalogService } from "@/lib/container";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/models/entities/product";
import { AddToCartControl } from "./add-to-cart-control";
import { AgentCardFrame } from "./agent-card-frame";
import { ProductImage } from "./product-image";
import { StockBadge } from "./stock-badge";

/** `index` is the card's position in its list, so agent results can stream in one by one. */
export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const unitPrice = catalogService.unitPrice(product);

  return (
    <AgentCardFrame
      productId={product.id}
      index={index}
      className="group relative flex h-full flex-col rounded-2xl border border-hairline bg-surface p-2.5 transition-[border-color,box-shadow,translate] duration-300 ease-luxe hover:-translate-y-1 hover:border-zinc-300 hover:shadow-[0_18px_40px_-20px_rgba(22,21,15,0.35)]"
    >
      <div className="absolute top-4 left-4 z-10">
        <StockBadge product={product} />
      </div>
      <Link href={`/product/${product.id}`} className="flex flex-1 flex-col rounded-xl">
        <ProductImage product={product} />
        <div className="mt-3 flex flex-1 flex-col px-1">
          <p className="flex w-fit items-center gap-0.5 rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-600 uppercase">
            <BoltIcon className="h-3 w-3" />
            10 mins
          </p>
          <h3 className="mt-2 line-clamp-2 min-h-10 text-[13px] leading-5 font-semibold text-zinc-900">{product.name}</h3>
          <p className="mt-0.5 text-xs text-zinc-500">{product.unit}</p>
        </div>
      </Link>
      <div className="mt-3 flex items-end justify-between gap-2 px-1 pb-0.5">
        <div className="tabular leading-tight">
          <p className="text-[15px] font-bold text-zinc-900">{formatPrice(product.price)}</p>
          {unitPrice && (
            <p className="text-[11px] text-zinc-500">
              {formatPrice(unitPrice.amount)}/{unitPrice.per}
            </p>
          )}
        </div>
        <AddToCartControl product={product} />
      </div>
    </AgentCardFrame>
  );
}
