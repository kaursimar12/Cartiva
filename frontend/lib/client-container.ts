import { ZustandCartStorage, ZustandOrderStorage } from "@/models/repositories/zustand-storage";
import { CartService } from "@/services/cart-service";
import { CheckoutService } from "@/services/checkout-service";
import { MockPaymentGateway } from "@/services/payment/mock-payment-gateway";
import { pricingService, productRepository } from "./container";

/**
 * Composition root for browser-only services that own runtime state.
 * Phase 9: replace MockPaymentGateway with a Razorpay gateway here.
 */
const cartStorage = new ZustandCartStorage();

export const cartService = new CartService(productRepository, cartStorage, pricingService);

export const checkoutService = new CheckoutService(
  cartStorage,
  pricingService,
  new MockPaymentGateway(),
  new ZustandOrderStorage(),
);
