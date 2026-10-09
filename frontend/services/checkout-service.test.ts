import { describe, expect, it } from "vitest";
import { CheckoutService } from "./checkout-service";
import { MockPaymentGateway } from "./payment/mock-payment-gateway";
import { buildCatalog, InMemoryCartStorage, InMemoryOrderStorage, productJson } from "./test-helpers";

function setup(items: { productId: string; quantity: number }[]) {
  const { pricingService } = buildCatalog([
    productJson({ id: "tomato", name: "Tomato", price: 40, availableQuantity: 5 }),
    productJson({ id: "milk", name: "Milk", price: 30, stock: false, availableQuantity: 0 }),
  ]);
  const cart = new InMemoryCartStorage(items);
  const orders = new InMemoryOrderStorage();
  const checkout = new CheckoutService(cart, pricingService, new MockPaymentGateway(0), orders);
  return { checkout, cart, orders };
}

describe("CheckoutService.validate", () => {
  it("rejects an empty cart", () => {
    const result = setup([]).checkout.validate();
    expect(result.ok || result.error.code).toBe("EMPTY_CART");
  });

  it("rejects an out-of-stock item", () => {
    const result = setup([{ productId: "milk", quantity: 1 }]).checkout.validate();
    expect(result.ok || result.error.code).toBe("OUT_OF_STOCK");
  });

  it("rejects a quantity above available stock", () => {
    const result = setup([{ productId: "tomato", quantity: 6 }]).checkout.validate();
    expect(result.ok || result.error.code).toBe("PARTIAL_STOCK");
  });

  it("returns the final total and asks for confirmation", () => {
    const result = setup([{ productId: "tomato", quantity: 2 }]).checkout.validate();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.total).toBe(11000);
      expect(result.message).toBe("Your total is ₹110. Would you like to proceed to payment?");
    }
  });
});

describe("CheckoutService.pay", () => {
  it("saves the order and clears the cart only after a successful payment", async () => {
    const { checkout, cart, orders } = setup([{ productId: "tomato", quantity: 2 }]);
    const result = await checkout.pay();
    expect(result.ok).toBe(true);
    expect(cart.getItems()).toEqual([]);
    expect(orders.saved).toHaveLength(1);
    expect(orders.saved[0].pricing.total).toBe(11000);
  });

  it("keeps the cart and saves nothing when payment fails", async () => {
    const { checkout, cart, orders } = setup([{ productId: "tomato", quantity: 2 }]);
    const result = await checkout.pay({ simulateFailure: true });
    expect(result.ok || result.error.code).toBe("PAYMENT_FAILED");
    expect(cart.getItems()).toEqual([{ productId: "tomato", quantity: 2 }]);
    expect(orders.saved).toEqual([]);
  });
});
