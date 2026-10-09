import type { CategoryRepository, OfferRepository, ProductRepository } from "./interfaces";

/** Fails fast on malformed catalog data so bad JSON never reaches the UI or the agent. */
export function validateCatalog(
  products: ProductRepository,
  categories: CategoryRepository,
  offers: OfferRepository,
): void {
  const errors: string[] = [];
  const all = products.findAll();

  if (new Set(all.map((p) => p.id)).size !== all.length) errors.push("Duplicate product IDs");
  for (const p of all) {
    if (!categories.findById(p.category)) errors.push(`${p.id}: unknown category "${p.category}"`);
    if (!Number.isInteger(p.price) || p.price <= 0) errors.push(`${p.id}: invalid price`);
    if (!Number.isInteger(p.availableQuantity) || p.availableQuantity < 0)
      errors.push(`${p.id}: invalid availableQuantity`);
    if (p.stock !== p.availableQuantity > 0) errors.push(`${p.id}: stock flag disagrees with availableQuantity`);
  }
  for (const o of offers.findActive()) {
    if (o.category && !categories.findById(o.category)) errors.push(`${o.id}: unknown category "${o.category}"`);
  }

  if (errors.length) throw new Error(`Invalid catalog data:\n${errors.join("\n")}`);
}
