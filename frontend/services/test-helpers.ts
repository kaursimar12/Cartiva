import type { CartItem } from "@/models/entities/cart";
import type { Order } from "@/models/entities/order";
import type { Product } from "@/models/entities/product";
import { JsonOfferRepository, JsonProductRepository, type ProductJson } from "@/models/repositories/json-catalog-repository";
import type { CartStorage, OrderStorage } from "@/models/repositories/interfaces";
import { defaultDiscountStrategies } from "./pricing/discount-strategies";
import { PricingService } from "./pricing/pricing-service";

export class InMemoryCartStorage implements CartStorage {
  constructor(private items: CartItem[] = []) {}

  getItems(): CartItem[] {
    return this.items;
  }

  setItems(items: CartItem[]): void {
    this.items = items;
  }
}

export class InMemoryOrderStorage implements OrderStorage {
  saved: Order[] = [];

  save(order: Order): void {
    this.saved.push(order);
  }
}

/** A product row in rupees, as it would appear in products.json. */
export function productJson(overrides: Partial<ProductJson> & Pick<Product, "id">): ProductJson {
  return {
    name: overrides.id,
    category: "vegetables",
    description: "",
    price: 50,
    unit: "1 kg",
    brand: null,
    stock: true,
    availableQuantity: 10,
    image: "",
    tags: [],
    featured: false,
    ...overrides,
  };
}

export function buildCatalog(products: ProductJson[]) {
  const productRepository = new JsonProductRepository(products);
  const pricingService = new PricingService(productRepository, new JsonOfferRepository([]), defaultDiscountStrategies, {
    fee: 3000,
    freeAbove: 49900,
  });
  return { productRepository, pricingService };
}
