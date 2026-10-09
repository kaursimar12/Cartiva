export type CategoryId =
  | "vegetables"
  | "fruits"
  | "dairy"
  | "beverages"
  | "snacks"
  | "breakfast"
  | "cleaning"
  | "laundry"
  | "personal-care";

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  image: string;
}

export interface Product {
  id: string;
  name: string;
  category: CategoryId;
  description: string;
  /** Price in whole rupees (INR) per unit. */
  price: number;
  /** Pack size sold as one unit, e.g. "1 kg", "500 ml". Cart quantity counts these units. */
  unit: string;
  brand: string | null;
  stock: boolean;
  availableQuantity: number;
  image: string;
  tags: string[];
  featured: boolean;
}
