import type { CartItem } from "@/models/entities/cart";

export interface PaymentRequest {
  /** What is being paid for. Real gateways send these to the server, which computes the amount itself. */
  items: CartItem[];
  /** Amount shown to the shopper (paise). Never trusted by the server. */
  amount: number;
  /** Test-only switch used by the mock gateway to exercise the failure path. */
  simulateFailure?: boolean;
}

export type PaymentResult =
  | { ok: true; orderId: string; paymentId: string }
  | { ok: false; reason: string };

/**
 * Payment boundary. Only a verified success may produce `ok: true` (SRS FR-27).
 * Implementations: MockPaymentGateway (tests, offline demos) and RazorpayPaymentGateway.
 */
export interface PaymentGateway {
  pay(request: PaymentRequest): Promise<PaymentResult>;
}
