"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { AnimatedNumber } from "@/components/common/animated-number";
import { TrashIcon } from "@/components/common/icons";
import { ProductImage } from "@/components/products/product-image";
import { QuantityStepper } from "@/components/products/quantity-stepper";
import { cartController } from "@/controllers/cart-controller";
import { useAgentFocus } from "@/hooks/use-agent-focus";
import { catalogService } from "@/lib/container";
import { formatPrice } from "@/lib/format";
import type { CartLine } from "@/models/entities/cart";

/** Background tint for the row the voice agent just changed. */
const AGENT_TINT = {
  added: "bg-brand-500/10",
  removed: "bg-zinc-500/10",
  error: "bg-red-500/10",
} as const;

export function CartLineRow({ line }: { line: CartLine }) {
  const { product, quantity, lineTotal } = line;
  const problem = catalogService.cartQuantityProblem(product, quantity);
  const focus = useAgentFocus(product.id);
  const tint = focus && focus.kind in AGENT_TINT ? AGENT_TINT[focus.kind as keyof typeof AGENT_TINT] : "";

  return (
    <motion.li
      layout
      data-agent-target={`product:${product.id}`}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40, height: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`-mx-3 flex gap-3 overflow-hidden rounded-2xl px-3 py-4 transition-colors duration-500 sm:gap-4 ${tint}`}
    >
      <Link href={`/product/${product.id}`} className="shrink-0">
        <ProductImage product={product} size="sm" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <Link href={`/product/${product.id}`} className="line-clamp-2 text-sm font-medium hover:text-brand-700">
            {product.name}
          </Link>
          <p className="tabular text-xs text-zinc-500">
            {product.unit} · {formatPrice(product.price)} each
          </p>
          {problem && <p className="mt-1 text-xs font-medium text-red-600">{problem}</p>}
        </div>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <QuantityStepper
            label={product.name}
            quantity={quantity}
            onDecrease={() => cartController.decrease(product.id)}
            onIncrease={() => cartController.increase(product.id)}
            canIncrease={catalogService.remainingStock(product, quantity) > 0}
          />
          <p className="tabular w-20 text-right font-semibold">
            <AnimatedNumber value={lineTotal} format={formatPrice} />
          </p>
          <button
            type="button"
            onClick={() => cartController.remove(product.id)}
            className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-600"
            aria-label={`Remove ${product.name} from cart`}
          >
            <TrashIcon className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </motion.li>
  );
}
