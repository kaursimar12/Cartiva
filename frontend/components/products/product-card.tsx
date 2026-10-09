import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/models/entities/product";
import { AddToCartControl } from "./add-to-cart-control";
import { ProductImage } from "./product-image";
import { StockBadge } from "./stock-badge";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-zinc-300 bg-surface p-3 transition-shadow hover:shadow-md">
      <div className="absolute top-4 left-4 z-10">
        <StockBadge product={product} />
      </div>
      <Link href={`/product/${product.id}`} className="flex flex-1 flex-col rounded-xl">
        <ProductImage product={product} />
        <div className="mt-3 flex flex-1 flex-col">
          {product.brand && <p className="text-xs text-zinc-500">{product.brand}</p>}
          <h3 className="line-clamp-2 text-sm font-semibold group-hover:text-brand-700">{product.name}</h3>
          <p className="mt-0.5 text-xs text-zinc-500">{product.unit}</p>
        </div>
      </Link>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="font-bold">{formatPrice(product.price)}</p>
        <AddToCartControl product={product} />
      </div>
    </article>
  );
}
