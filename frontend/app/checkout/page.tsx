import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout/checkout-view";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <div>
      <h1 className="mb-6 font-display text-4xl leading-none tracking-tight sm:text-5xl">Checkout</h1>
      <CheckoutView />
    </div>
  );
}
