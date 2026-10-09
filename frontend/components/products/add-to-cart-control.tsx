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
      <span className="flex h-8 items-center rounded-lg border border-zinc-300 px-3 text-xs font-medium text-zinc-500">
        Out of stock
      </span>
    );
  }

  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={() => cartController.add(product.id)}
        className="h-8 rounded-lg border border-brand-600 bg-brand-50 px-4 text-sm font-semibold text-brand-700 hover:bg-brand-100"
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
