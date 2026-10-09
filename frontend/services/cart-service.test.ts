import { describe, expect, it } from "vitest";
import { CartService } from "./cart-service";
import { buildCatalog, InMemoryCartStorage, productJson } from "./test-helpers";

function setup(initialItems: { productId: string; quantity: number }[] = []) {
  const { productRepository, pricingService } = buildCatalog([
    productJson({ id: "tomato", name: "Tomato", price: 40, availableQuantity: 5 }),
    productJson({ id: "milk", name: "Milk", category: "dairy", price: 30, stock: false, availableQuantity: 0 }),
  ]);
  const storage = new InMemoryCartStorage(initialItems);
  return { cart: new CartService(productRepository, storage, pricingService), storage };
}

describe("CartService.add", () => {
  it("adds a new product and then increases its quantity", () => {
    const { cart, storage } = setup();
    expect(cart.add("tomato", 2).ok).toBe(true);
    expect(cart.add("tomato", 1).ok).toBe(true);
    expect(storage.getItems()).toEqual([{ productId: "tomato", quantity: 3 }]);
  });

  it.each([0, -1, 1.5, Number.NaN])("rejects invalid quantity %s", (quantity) => {
    const result = setup().cart.add("tomato", quantity);
    expect(result.ok || result.error.code).toBe("INVALID_QUANTITY");
  });

  it("rejects unknown products", () => {
    const result = setup().cart.add("ghost");
    expect(result.ok || result.error.code).toBe("NOT_FOUND");
  });

  it("rejects out-of-stock products", () => {
    const result = setup().cart.add("milk");
    expect(result.ok || result.error.code).toBe("OUT_OF_STOCK");
  });

  it("reports partial stock with how many more can be added, and changes nothing", () => {
    const { cart, storage } = setup([{ productId: "tomato", quantity: 3 }]);
    const result = cart.add("tomato", 4);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatchObject({ code: "PARTIAL_STOCK", available: 2 });
    expect(storage.getItems()).toEqual([{ productId: "tomato", quantity: 3 }]);
  });
});

describe("CartService.updateQuantity / remove", () => {
  it("sets an exact quantity", () => {
    const { cart, storage } = setup([{ productId: "tomato", quantity: 1 }]);
    expect(cart.updateQuantity("tomato", 4).ok).toBe(true);
    expect(storage.getItems()).toEqual([{ productId: "tomato", quantity: 4 }]);
  });

  it("removes the item when set to zero", () => {
    const { cart, storage } = setup([{ productId: "tomato", quantity: 1 }]);
    expect(cart.updateQuantity("tomato", 0).ok).toBe(true);
    expect(storage.getItems()).toEqual([]);
  });

  it("rejects a quantity above available stock", () => {
    const result = setup([{ productId: "tomato", quantity: 1 }]).cart.updateQuantity("tomato", 6);
    expect(result.ok || result.error.code).toBe("PARTIAL_STOCK");
  });

  it("rejects updating or removing an item that is not in the cart", () => {
    const { cart } = setup();
    const update = cart.updateQuantity("tomato", 2);
    const remove = cart.remove("tomato");
    expect(update.ok || update.error.code).toBe("NOT_IN_CART");
    expect(remove.ok || remove.error.code).toBe("NOT_IN_CART");
  });
});

describe("CartService.decrease", () => {
  it("steps down by one and removes at zero", () => {
    const { cart, storage } = setup([{ productId: "tomato", quantity: 2 }]);
    cart.decrease("tomato");
    expect(storage.getItems()).toEqual([{ productId: "tomato", quantity: 1 }]);
    cart.decrease("tomato");
    expect(storage.getItems()).toEqual([]);
  });

  it("snaps down to available stock when the cart holds more than is available", () => {
    const { cart, storage } = setup([{ productId: "tomato", quantity: 9 }]);
    expect(cart.decrease("tomato").ok).toBe(true);
    expect(storage.getItems()).toEqual([{ productId: "tomato", quantity: 5 }]);
  });

  it("removes an item that went out of stock", () => {
    const { cart, storage } = setup([{ productId: "milk", quantity: 2 }]);
    expect(cart.decrease("milk").ok).toBe(true);
    expect(storage.getItems()).toEqual([]);
  });
});

describe("CartService.getCart", () => {
  it("returns lines and pricing in paise", () => {
    const result = setup([{ productId: "tomato", quantity: 2 }]).cart.getCart();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.lines[0].lineTotal).toBe(8000);
      expect(result.data.pricing).toMatchObject({ subtotal: 8000, deliveryFee: 3000, total: 11000 });
    }
  });
});
