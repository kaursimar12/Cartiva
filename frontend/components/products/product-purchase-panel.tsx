"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect } from "react";
import { cartController } from "@/controllers/cart-controller";
import { screenController } from "@/controllers/screen-controller";
import { useCartQuantity } from "@/hooks/use-cart";
import { catalogService } from "@/lib/container";
import type { Product } from "@/models/entities/product";
import { QuantityStepper } from "./quantity-stepper";

/** Swap between "Add to cart" and the stepper with a quick scale-and-fade. */
const swap = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.92 },
  transition: { type: "spring", stiffness: 480, damping: 30 },
} as const;

/**
 * Add-to-cart for the product detail page (SRS FR-06). Works like the product cards:
 * "Add to cart" until the product is in the cart, then a stepper showing the cart quantity.
 */
export function ProductPurchasePanel({ product }: { product: Product }) {
  const inCart = useCartQuantity(product.id);
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

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout" initial={false}>
        {inCart === 0 ? (
          <motion.button
            key="add"
            {...swap}
            type="button"
            onClick={() => cartController.add(product.id)}
            whileTap={{ scale: 0.97 }}
            className="h-13 w-full rounded-2xl bg-brand-600 px-10 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Add to cart
          </motion.button>
        ) : (
          <motion.div key="stepper" {...swap} className="flex flex-wrap items-center gap-4">
            <QuantityStepper
              size="md"
              label={product.name}
              quantity={inCart}
              onDecrease={() => cartController.decrease(product.id)}
              onIncrease={() => cartController.increase(product.id)}
              canIncrease={remaining > 0}
            />
            <p className="text-sm text-zinc-600">
              In your cart ·{" "}
              <Link href="/cart" className="font-semibold text-brand-700 hover:text-brand-800">
                View cart
              </Link>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      {inCart > 0 && remaining === 0 && (
        <p className="text-xs text-zinc-500">That’s all we have in stock right now.</p>
      )}
    </div>
  );
}
