"use client";

import { AnimatePresence, motion } from "motion/react";
import { cartController } from "@/controllers/cart-controller";
import { useCartQuantity } from "@/hooks/use-cart";
import { catalogService } from "@/lib/container";
import type { Product } from "@/models/entities/product";
import { QuantityStepper } from "./quantity-stepper";

/** "ADD" button that becomes a quantity stepper once the product is in the cart. */
export function AddToCartControl({ product }: { product: Product }) {
  const quantity = useCartQuantity(product.id);

  if (!product.stock) {
    return (
      <span className="flex h-9 items-center rounded-lg bg-surface-muted px-3 text-[11px] font-semibold text-zinc-500">
        Sold out
      </span>
    );
  }

  // ADD and the stepper swap with a quick scale-and-fade, so the change feels like one control morphing.
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {quantity === 0 ? (
        <motion.button
          key="add"
          type="button"
          onClick={() => cartController.add(product.id)}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: "spring", stiffness: 520, damping: 30 }}
          className="h-9 min-w-[4.5rem] rounded-lg border border-brand-600 bg-brand-50 px-4 text-xs font-bold tracking-wider text-brand-700 uppercase transition-colors hover:bg-brand-600 hover:text-white"
          aria-label={`Add ${product.name} ${product.unit} to cart`}
        >
          Add
        </motion.button>
      ) : (
        <motion.div
          key="stepper"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ type: "spring", stiffness: 520, damping: 30 }}
        >
          <QuantityStepper
            label={product.name}
            quantity={quantity}
            onDecrease={() => cartController.decrease(product.id)}
            onIncrease={() => cartController.increase(product.id)}
            canIncrease={catalogService.remainingStock(product, quantity) > 0}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
