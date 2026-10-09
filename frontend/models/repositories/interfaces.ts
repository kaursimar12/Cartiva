import type { CartItem } from "@/models/entities/cart";
import type { DeliveryPolicy } from "@/models/entities/delivery";
import type { Offer } from "@/models/entities/offer";
import type { Order } from "@/models/entities/order";
import type { Category, Product } from "@/models/entities/product";

/** Read access to the product catalog. JSON today; swappable for a database later. */
export interface ProductRepository {
  findAll(): Product[];
  findById(id: string): Product | undefined;
}

export interface CategoryRepository {
  findAll(): Category[];
  findById(id: string): Category | undefined;
}

export interface OfferRepository {
  findAll(): Offer[];
  findActive(): Offer[];
}

export interface DeliveryPolicyRepository {
  get(): DeliveryPolicy;
}

/** Where cart items live at runtime (Zustand in the browser). */
export interface CartStorage {
  getItems(): CartItem[];
  setItems(items: CartItem[]): void;
}

/** Where the most recent order is kept for the confirmation page. */
export interface OrderStorage {
  save(order: Order): void;
}
