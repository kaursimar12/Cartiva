import type { CategoryId, Product } from "@/models/entities/product";

/** Placeholder visuals until real product photos are added to /public/products. */
export const categoryEmoji: Record<CategoryId, string> = {
  vegetables: "🥦",
  fruits: "🍎",
  dairy: "🥛",
  beverages: "🧃",
  snacks: "🍿",
  breakfast: "🥣",
  cleaning: "🧽",
  laundry: "🧺",
  "personal-care": "🧴",
};

/** Shared neutral surface behind placeholder images. */
export const imageSurface = "bg-surface-muted";

const tagEmoji: [string, string][] = [
  ["cherry tomato", "🍅"], ["tomato", "🍅"], ["ketchup", "🥫"], ["potato", "🥔"], ["onion", "🧅"],
  ["carrot", "🥕"], ["spinach", "🥬"], ["cauliflower", "🥦"], ["capsicum", "🫑"], ["cucumber", "🥒"],
  ["coriander", "🌿"], ["banana", "🍌"], ["apple", "🍎"], ["orange", "🍊"], ["mango", "🥭"],
  ["grapes", "🍇"], ["papaya", "🍈"], ["pomegranate", "🍎"], ["milk", "🥛"], ["butter", "🧈"],
  ["cheese", "🧀"], ["eggs", "🥚"], ["curd", "🥣"], ["paneer", "🧀"], ["cola", "🥤"], ["tea", "🍵"],
  ["coffee", "☕"], ["water", "💧"], ["juice", "🧃"], ["chips", "🥔"], ["chocolate", "🍫"],
  ["biscuits", "🍪"], ["namkeen", "🥨"], ["bread", "🍞"], ["jam", "🍓"], ["oats", "🥣"], ["cereal", "🥣"],
  ["dishwash", "🧴"], ["scrubber", "🧽"], ["floor cleaner", "🧹"], ["toilet cleaner", "🚽"],
  ["glass cleaner", "🪟"], ["fabric conditioner", "🌸"], ["detergent", "🧺"], ["soap", "🧼"],
  ["toothpaste", "🪥"], ["shampoo", "🧴"], ["handwash", "🧼"], ["razor", "🪒"], ["hair oil", "🥥"],
  ["cream", "🧴"],
];

export function getProductEmoji(product: Product): string {
  return tagEmoji.find(([tag]) => product.tags.includes(tag))?.[1] ?? categoryEmoji[product.category];
}
