"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cartController } from "@/controllers/cart-controller";
import { screenController } from "@/controllers/screen-controller";
import { useCartQuantity } from "@/hooks/use-cart";
import { catalogService } from "@/lib/container";
import type { Product } from "@/models/entities/product";
import { QuantityStepper } from "./quantity-stepper";

/** Quantity selector + add-to-cart for the product detail page (SRS FR-06). */
export function ProductPurchasePanel({ product }: { product: Product }) {
  const inCart = useCartQuantity(product.id);
  const [quantity, setQuantity] = useState(1);
  const remaining = catalogService.remainingStock(product, inCart);

  // On a product page, "this one" means this product.
  useEffect(() => {
    screenController.showProducts(product.name, [product.id]);
  }, [product]);

  if (!product.stock) {
    return (
      <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm font-medium text-zinc-700">
        This product is currently out of stock.
      </p>
    );
  }

  const selected = Math.min(quantity, Math.max(remaining, 1));

  function handleAdd() {
    const result = cartController.add(product.id, selected);
    if (result.ok) setQuantity(1);
  }

  return (
    <div className="space-y-4">
      {remaining > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <QuantityStepper
            size="md"
            label={product.name}
            quantity={selected}
            onDecrease={() => setQuantity(Math.max(1, selected - 1))}
            onIncrease={() => setQuantity(Math.min(remaining, selected + 1))}
            canIncrease={selected < remaining}
          />
          <button
            type="button"
            onClick={handleAdd}
            className="h-10 flex-1 rounded-lg bg-brand-600 px-6 text-sm font-semibold text-white hover:bg-brand-700 sm:flex-none"
          >
            Add to cart
          </button>
        </div>
      ) : (
        <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-zinc-800">
          You have all available units of this product in your cart.
        </p>
      )}
      {inCart > 0 && (
        <p className="text-sm text-zinc-600">
          {inCart} in your cart ·{" "}
          <Link href="/cart" className="font-semibold text-brand-700 hover:text-brand-800">
            View cart
          </Link>
        </p>
      )}
    </div>
  );
}
