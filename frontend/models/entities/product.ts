import type { Paise } from "./money";

/**
 * A category id from the brand's categories.json (e.g. "vegetables", "colas"). Each brand has its own
 * aisles, so this is a string; catalog-validator.ts checks every reference against the loaded categories.
 */
export type CategoryId = string;

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
  /** Price per unit, in paise (JSON stores rupees). */
  price: Paise;
  /** Pack size sold as one unit, e.g. "1 kg", "500 ml". Cart quantity counts these units. */
  unit: string;
  brand: string | null;
  stock: boolean;
  availableQuantity: number;
  image: string;
  tags: string[];
  featured: boolean;
}
