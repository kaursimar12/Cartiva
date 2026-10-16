import type { PaymentGateway, PaymentRequest, PaymentResult } from "./payment-gateway";

const CHECKOUT_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

/** Reply of FastAPI's POST /api/payment/create-order. */
interface CreateOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
}

/** What Razorpay Checkout hands back after a successful payment. */
interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckout {
  open(): void;
  on(event: "payment.failed", handler: (response: { error: { description?: string } }) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

/**
 * Real payments with Razorpay Checkout (test mode while developing).
 * The server creates the order (it decides the amount) and verifies the signature;
 * only a verified payment returns ok: true (SRS FR-27).
 */
export class RazorpayPaymentGateway implements PaymentGateway {
  constructor(private readonly backendUrl: string) {}

  async pay(request: PaymentRequest): Promise<PaymentResult> {
    const items = request.items.map(({ productId, quantity }) => ({ productId, quantity }));

    try {
      const order = await this.post<CreateOrderResponse>("/api/payment/create-order", { items });
      await loadCheckoutScript();

      const outcome = await openCheckout(order);
      if (!outcome.ok) return outcome;

      await this.post("/api/payment/verify", { ...outcome.payment, items });
      return { ok: true, orderId: order.order_id, paymentId: outcome.payment.razorpay_payment_id };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : "The payment could not be completed." };
    }
  }

  /** POSTs JSON to FastAPI and returns the reply, or throws with the server's error message. */
  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.backendUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.detail?.message ?? "The payment service is unavailable. No money was taken.");
    return data as T;
  }
}

/** Adds Razorpay's checkout.js to the page once. */
function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT_URL;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Couldn't load Razorpay. Check your internet connection."));
    document.body.appendChild(script);
  });
}

/** Opens the Razorpay popup and waits until the shopper pays, fails, or closes it. */
function openCheckout(
  order: CreateOrderResponse,
): Promise<{ ok: true; payment: RazorpaySuccess } | { ok: false; reason: string }> {
  return new Promise((resolve) => {
    const Razorpay = window.Razorpay!;
    const checkout = new Razorpay({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      order_id: order.order_id,
      name: "Cartiva",
      description: "Grocery order",
      theme: { color: "#16a34a" },
      handler: (payment: RazorpaySuccess) => resolve({ ok: true, payment }),
      modal: {
        ondismiss: () => resolve({ ok: false, reason: "Payment cancelled. No money was taken." }),
      },
    });
    checkout.on("payment.failed", (response) =>
      resolve({ ok: false, reason: response.error.description ?? "The payment failed. No money was taken." }),
    );
    checkout.open();
  });
}
