"use client";

import Link from "next/link";
import { CartIcon } from "@/components/common/icons";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/hooks/use-cart";

export function CartLink() {
  const { hydrated, pricing } = useCart();
  const count = hydrated ? pricing.itemCount : 0;

  return (
    <Link
      href="/cart"
      className={`flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold shadow-sm transition-colors sm:px-4 ${
        count > 0 ? "bg-brand-600 text-white hover:bg-brand-700" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
      }`}
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
    >
      <CartIcon className="h-5 w-5" />
      {count > 0 ? (
        <span className="flex flex-col leading-tight">
          <span className="text-xs font-semibold">
            {count} item{count === 1 ? "" : "s"}
          </span>
          <span className="hidden text-sm sm:inline">{formatPrice(pricing.total)}</span>
        </span>
      ) : (
        <span className="hidden sm:inline">My Cart</span>
      )}
    </Link>
  );
}
