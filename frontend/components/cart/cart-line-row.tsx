"use client";

import Link from "next/link";
import { ProductImage } from "@/components/products/product-image";
import { QuantityStepper } from "@/components/products/quantity-stepper";
import { cartController } from "@/controllers/cart-controller";
import { formatPrice } from "@/lib/format";
import type { CartLine } from "@/models/entities/cart";

export function CartLineRow({ line }: { line: CartLine }) {
  const { product, quantity, lineTotal } = line;
  const overStock = !product.stock || quantity > product.availableQuantity;

  return (
    <li className="flex gap-3 py-4 sm:gap-4">
      <Link href={`/product/${product.id}`} className="shrink-0">
        <ProductImage product={product} size="sm" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <Link href={`/product/${product.id}`} className="line-clamp-2 text-sm font-semibold hover:text-brand-700">
            {product.name}
          </Link>
          <p className="text-xs text-zinc-500">
            {product.unit} · {formatPrice(product.price)} each
          </p>
          {overStock && (
            <p className="mt-1 text-xs font-medium text-red-600">
              {product.stock ? `Only ${product.availableQuantity} available` : "Out of stock — please remove"}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <QuantityStepper
            label={product.name}
            quantity={quantity}
            onDecrease={() => cartController.decrease(product.id)}
            onIncrease={() => cartController.increase(product.id)}
            canIncrease={quantity < product.availableQuantity}
          />
          <p className="w-20 text-right font-semibold">{formatPrice(lineTotal)}</p>
          <button
            type="button"
            onClick={() => cartController.remove(product.id)}
            className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
            aria-label={`Remove ${product.name} from cart`}
          >
            🗑
          </button>
        </div>
      </div>
    </li>
  );
}
