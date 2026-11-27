/** Brand-colour scale (hex), same steps as the `brand-*` Tailwind colours in app/globals.css. */
export interface BrandPalette {
  50: string;
  100: string;
  200: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

/**
 * Everything that differs between storefronts built from this codebase (data/brands/<id>/brand.json).
 * The catalog (products, categories, offers, delivery) sits next to it in the same folder.
 */
export interface Brand {
  /** Folder name and NEXT_PUBLIC_BRAND value, e.g. "cartiva", "coca-cola". */
  id: string;
  /** The store's name: wordmark, page titles, "Not sold at …". */
  storeName: string;
  /** Lower-case wordmark shown in the header and footer. */
  wordmark: string;
  /** Set for concept stores built for a company: shows "Concept demo by Cartiva — not affiliated with …". */
  conceptFor: string | null;
  meta: { title: string; description: string };
  /** One line about the store (footer, screen-reader page heading). */
  tagline: string;
  /** Razorpay order description, e.g. "Grocery order". */
  orderDescription: string;
  /** Delivery promise used across the store, e.g. "10 minutes". */
  deliveryTime: string;
  deliveryAreas: string[];
  /** Footer promise next to free delivery and secure payments. */
  freshnessPromise: { title: string; text: string };
  assistant: {
    /** What the voice assistant is called ("Ask Cartiva", "Cartiva is joining…"). */
    name: string;
    /** Languages it speaks, in plain words. */
    languages: string;
  };
  /** Example commands shown on the home page voice panel. */
  voiceExamples: string[];
  /** Search box placeholder and the suggestions on an empty search page. */
  search: { placeholder: string; suggestions: string[] };
  /** Home page "Today's deals" card: which aisle it promotes and how it's described. */
  featuredAisle: { categoryId: string; label: string };
  /** Category whose photo illustrates whole-order offers. */
  wholeOrderImageCategory: string;
  /** Example deal used on the help page, e.g. "20% off carrots". */
  dealExample: string;
  /** Brand colours (light and dark theme). Null keeps the default green in app/globals.css. */
  palette: { light: BrandPalette; dark: BrandPalette } | null;
}
