import type { Metadata } from "next";
import { OrderSuccessView } from "@/components/checkout/order-success-view";

export const metadata: Metadata = { title: "Order placed" };

export default function OrderSuccessPage() {
  return <OrderSuccessView />;
}
