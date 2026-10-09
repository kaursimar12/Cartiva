export interface PaymentRequest {
  amount: number;
  /** Test-only switch used by the mock gateway to exercise the failure path. */
  simulateFailure?: boolean;
}

export type PaymentResult =
  | { ok: true; orderId: string; paymentId: string }
  | { ok: false; reason: string };

/**
 * Payment boundary. Only a verified success may produce `ok: true` (SRS FR-27).
 * Implementations: MockPaymentGateway now, RazorpayPaymentGateway in Phase 9.
 */
export interface PaymentGateway {
  pay(request: PaymentRequest): Promise<PaymentResult>;
}
