import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout/checkout-view";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <div>
      <h1 className="mb-6 font-display text-3xl leading-tight sm:text-4xl">Checkout</h1>
      <CheckoutView />
    </div>
  );
}
