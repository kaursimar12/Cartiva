"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/hooks/use-cart";

export function CartLink() {
  const { hydrated, pricing } = useCart();
  const count = hydrated ? pricing.itemCount : 0;

  return (
    <Link
      href="/cart"
      className="flex items-center gap-2 rounded-xl bg-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-300 sm:px-4"
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
    >
      <span aria-hidden>🛒</span>
      {count > 0 ? (
        <span className="flex flex-col leading-tight">
          <span className="text-xs font-medium">{count} item{count === 1 ? "" : "s"}</span>
          <span className="hidden sm:inline">{formatPrice(pricing.total)}</span>
        </span>
      ) : (
        <span className="hidden sm:inline">My Cart</span>
      )}
    </Link>
  );
}
