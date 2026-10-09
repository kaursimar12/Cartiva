import type {
  CategoryRepository,
  DeliveryPolicyRepository,
  OfferRepository,
  ProductRepository,
} from "./interfaces";

const DISCOUNT_TYPES = ["percentage", "flat"];

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

/** Fails fast on malformed catalog data so bad JSON never reaches the UI or the agent. */
export function validateCatalog(
  products: ProductRepository,
  categories: CategoryRepository,
  offers: OfferRepository,
  delivery: DeliveryPolicyRepository,
): void {
  const errors: string[] = [];
  const all = products.findAll();

  if (new Set(all.map((p) => p.id)).size !== all.length) errors.push("Duplicate product IDs");
  for (const p of all) {
    if (!categories.findById(p.category)) errors.push(`${p.id}: unknown category "${p.category}"`);
    if (!isPositiveInteger(p.price)) errors.push(`${p.id}: invalid price`);
    if (!Number.isInteger(p.availableQuantity) || p.availableQuantity < 0)
      errors.push(`${p.id}: invalid availableQuantity`);
    if (p.stock !== p.availableQuantity > 0) errors.push(`${p.id}: stock flag disagrees with availableQuantity`);
  }

  for (const o of offers.findAll()) {
    if (o.category && !categories.findById(o.category)) errors.push(`${o.id}: unknown category "${o.category}"`);
    if (!DISCOUNT_TYPES.includes(o.discountType)) errors.push(`${o.id}: unknown discountType "${o.discountType}"`);
    if (!Number.isInteger(o.minimumAmount) || o.minimumAmount < 0) errors.push(`${o.id}: invalid minimumAmount`);
    if (!isPositiveInteger(o.discountValue)) errors.push(`${o.id}: invalid discountValue`);
    if (o.discountType === "percentage" && o.discountValue > 100) errors.push(`${o.id}: percentage above 100`);
  }

  const policy = delivery.get();
  if (!Number.isInteger(policy.fee) || policy.fee < 0) errors.push("delivery: invalid fee");
  if (!Number.isInteger(policy.freeAbove) || policy.freeAbove < 0) errors.push("delivery: invalid freeAbove");

  if (errors.length) throw new Error(`Invalid catalog data:\n${errors.join("\n")}`);
}
