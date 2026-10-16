import { ZustandCartStorage, ZustandOrderStorage } from "@/models/repositories/zustand-storage";
import { CartService } from "@/services/cart-service";
import { CheckoutService } from "@/services/checkout-service";
import { RazorpayPaymentGateway } from "@/services/payment/razorpay-payment-gateway";
import { HttpListScanner } from "@/services/shopping-list/list-scanner";
import { ShoppingListService } from "@/services/shopping-list/shopping-list-service";
import { catalogService, pricingService, productRepository } from "./container";

/**
 * Composition root for browser-only services that own runtime state.
 * Payments go through Razorpay (test mode). For an offline demo, swap in `new MockPaymentGateway()`.
 */
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";
const cartStorage = new ZustandCartStorage();

export const cartService = new CartService(productRepository, cartStorage, pricingService);

export const checkoutService = new CheckoutService(
  cartStorage,
  pricingService,
  new RazorpayPaymentGateway(BACKEND_URL),
  new ZustandOrderStorage(),
);

export const shoppingListService = new ShoppingListService(catalogService);
export const listScanner = new HttpListScanner(BACKEND_URL);
