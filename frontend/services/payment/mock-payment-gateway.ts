import type { PaymentGateway, PaymentRequest, PaymentResult } from "./payment-gateway";

/** Stand-in for Razorpay so the full checkout UI can be verified before Phase 9. */
export class MockPaymentGateway implements PaymentGateway {
  constructor(private readonly delayMs = 1500) {}

  async pay(request: PaymentRequest): Promise<PaymentResult> {
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    if (request.simulateFailure || request.amount <= 0) {
      return { ok: false, reason: "The payment was declined. No money has been deducted." };
    }
    return { ok: true, orderId: randomId("order"), paymentId: randomId("pay") };
  }
}

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}
