import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";

export const metadata: Metadata = { title: "Your cart" };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="mb-6 font-display text-4xl leading-none tracking-tight sm:text-5xl">Your cart</h1>
      <CartView />
    </div>
  );
}
