import Image from "next/image";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { catalogService } from "@/lib/container";
import { formatPrice } from "@/lib/format";
import type { Offer } from "@/models/entities/offer";
import type { Category } from "@/models/entities/product";

/**
 * Ad colours, handed out in the order of the brand's offers.json (so each offer keeps one colour on every
 * page, filtered or not). Fixed colours with fixed text (not theme tokens), so banners read the same in
 * light and dark mode.
 */
interface BannerTheme {
  bg: string; // banner colour
  accent: string; // small heading text
  light: string; // button background (dark text on it uses `bg`)
}

const THEMES: BannerTheme[] = [
  { bg: "#14532d", accent: "#bbf7d0", light: "#bbf7d0" },
  { bg: "#1e3a8a", accent: "#bfdbfe", light: "#bfdbfe" },
  { bg: "#9a3412", accent: "#fed7aa", light: "#fed7aa" },
  { bg: "#3b0764", accent: "#e9d5ff", light: "#e9d5ff" },
  { bg: "#134e4a", accent: "#99f6e4", light: "#99f6e4" },
];

/** A brand with its own colours leads with them (its deepest shade); the default store keeps the green. */
const BRAND_THEMES: BannerTheme[] = brand.palette
  ? [{ bg: brand.palette.light[800], accent: brand.palette.light[200], light: brand.palette.light[100] }, ...THEMES.slice(1)]
  : THEMES;

function themeFor(offer: Offer): BannerTheme {
  const position = catalogService.getStoreOffers().findIndex((o) => o.id === offer.id);
  return BRAND_THEMES[Math.max(position, 0) % BRAND_THEMES.length];
}

/** Photo for a whole-order offer (a spread of the store's products). */
const WHOLE_ORDER_IMAGE_CATEGORY = brand.wholeOrderImageCategory;

/** "10%" or "₹50": the big number on the banner. */
function bigNumber(offer: Offer): string {
  return offer.discountType === "percentage" ? `${offer.discountValue}%` : formatPrice(offer.discountValue);
}

/** Store-wide and category offers as advertisement banners: big discount, photo, clear condition. */
export function OfferList({ offers, categories }: { offers: Offer[]; categories: Category[] }) {
  const byId = (id: string | null) => categories.find((c) => c.id === id);

  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {offers.map((offer) => {
        const category = byId(offer.category);
        const theme = themeFor(offer);
        const image = (category ?? byId(WHOLE_ORDER_IMAGE_CATEGORY))?.image;
        const scope = category ? `On ${category.name.toLowerCase()}` : "On your whole order";

        return (
          <li key={offer.id}>
            <Link
              href={offer.category ? `/category/${offer.category}` : "/"}
              className="relative flex h-full min-h-48 overflow-hidden rounded-2xl text-white"
              style={{ backgroundColor: theme.bg }}
            >
              <span className="relative z-10 flex w-[62%] flex-col justify-between p-6">
                <span>
                  <span className="block text-xs font-semibold tracking-wide uppercase" style={{ color: theme.accent }}>
                    {scope}
                  </span>
                  <span className="mt-2 flex items-baseline gap-2">
                    <span className="text-5xl leading-none font-bold tracking-tight">{bigNumber(offer)}</span>
                    <span className="text-xl font-bold">OFF</span>
                  </span>
                  <span className="mt-3 block text-sm text-white/80">
                    {category ? `${category.name} worth` : "Orders of"} {formatPrice(offer.minimumAmount)} or more
                  </span>
                </span>
                <span
                  className="mt-4 w-fit rounded-full px-4 py-1.5 text-sm font-semibold"
                  style={{ backgroundColor: theme.light, color: theme.bg }}
                >
                  Shop now
                </span>
              </span>
              {image && (
                <span className="absolute inset-y-0 right-0 w-[42%]">
                  <Image src={image} alt="" fill sizes="220px" className="object-cover" />
                  {/* Blend the photo into the colour block so the text side stays clean. */}
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-1/3 [mask-image:linear-gradient(to_right,black,transparent)]"
                    style={{ backgroundColor: theme.bg }}
                  />
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
