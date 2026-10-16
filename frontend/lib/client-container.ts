import { ZustandCartStorage, ZustandOrderStorage } from "@/models/repositories/zustand-storage";
import { CartService } from "@/services/cart-service";
import { CheckoutService } from "@/services/checkout-service";
import { RazorpayPaymentGateway } from "@/services/payment/razorpay-payment-gateway";
import { pricingService, productRepository } from "./container";

/**
 * Composition root for browser-only services that own runtime state.
 * Payments go through Razorpay (test mode). For an offline demo, swap in `new MockPaymentGateway()`.
 */
const cartStorage = new ZustandCartStorage();

export const cartService = new CartService(productRepository, cartStorage, pricingService);

export const checkoutService = new CheckoutService(
  cartStorage,
  pricingService,
  new RazorpayPaymentGateway(process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000"),
  new ZustandOrderStorage(),
);
