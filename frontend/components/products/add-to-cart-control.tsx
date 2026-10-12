"use client";

import { cartController } from "@/controllers/cart-controller";
import { useCartQuantity } from "@/hooks/use-cart";
import type { Product } from "@/models/entities/product";
import { QuantityStepper } from "./quantity-stepper";

/** "Add" button that becomes a quantity stepper once the product is in the cart. */
export function AddToCartControl({ product }: { product: Product }) {
  const quantity = useCartQuantity(product.id);

  if (!product.stock) {
    return (
      <span className="flex h-8 items-center rounded-lg bg-zinc-100 px-2.5 text-[11px] font-semibold text-zinc-500">
        Sold out
      </span>
    );
  }

  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={() => cartController.add(product.id)}
        className="h-8 min-w-[4.25rem] rounded-lg border border-brand-600 bg-white px-4 text-xs font-bold tracking-wide text-brand-700 uppercase transition hover:bg-brand-600 hover:text-white"
        aria-label={`Add ${product.name} ${product.unit} to cart`}
      >
        Add
      </button>
    );
  }

  return (
    <QuantityStepper
      label={product.name}
      quantity={quantity}
      onDecrease={() => cartController.decrease(product.id)}
      onIncrease={() => cartController.increase(product.id)}
      canIncrease={quantity < product.availableQuantity}
    />
  );
}
