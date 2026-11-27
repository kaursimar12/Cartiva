import { BRANDS, DEFAULT_BRAND_ID, type BrandBundle } from "@/data/brands";

/**
 * The storefront this deployment builds, chosen with NEXT_PUBLIC_BRAND (e.g. "coca-cola").
 * Next.js inlines NEXT_PUBLIC_* at build time, so server and browser code agree on it.
 * An unknown value fails loudly instead of silently showing the wrong store.
 */
function pickBrand(id: string | undefined): BrandBundle {
  const key = id?.trim() || DEFAULT_BRAND_ID;
  const bundle = BRANDS[key];
  if (!bundle) throw new Error(`Unknown NEXT_PUBLIC_BRAND "${key}". Known brands: ${Object.keys(BRANDS).join(", ")}`);
  return bundle;
}

export const brandBundle = pickBrand(process.env.NEXT_PUBLIC_BRAND);

/** The current brand's settings (store name, assistant name, copy, colours…). */
export const brand = brandBundle.brand;
