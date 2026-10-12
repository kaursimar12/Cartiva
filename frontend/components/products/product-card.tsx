import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/models/entities/product";
import { AddToCartControl } from "./add-to-cart-control";
import { ProductImage } from "./product-image";
import { StockBadge } from "./stock-badge";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-zinc-200 bg-surface p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="absolute top-3.5 left-3.5 z-10">
        <StockBadge product={product} />
      </div>
      <Link href={`/product/${product.id}`} className="flex flex-1 flex-col rounded-xl">
        <ProductImage product={product} />
        <div className="mt-2.5 flex flex-1 flex-col px-1">
          {product.brand && <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">{product.brand}</p>}
          <h3 className="line-clamp-2 min-h-10 text-sm leading-5 font-semibold text-zinc-900">{product.name}</h3>
          <p className="mt-1 text-xs text-zinc-500">{product.unit}</p>
        </div>
      </Link>
      <div className="mt-3 flex items-center justify-between gap-2 px-1 pb-0.5">
        <p className="text-[15px] font-bold text-zinc-900">{formatPrice(product.price)}</p>
        <AddToCartControl product={product} />
      </div>
    </article>
  );
}
