import Link from "next/link";
import { ChevronRightIcon } from "@/components/common/icons";
import { formatPrice } from "@/lib/format";
import { Reveal } from "@/components/common/reveal";
import type { Offer } from "@/models/entities/offer";
import type { Category } from "@/models/entities/product";

/** Promo banner colours, in order: deep green, saffron, ink. */
const BANNERS = [
  "bg-[#0d3b24] text-[#f6f4ef]",
  "bg-[#f4c64e] text-[#16150f]",
  "bg-[#16150f] text-[#f6f4ef]",
];

export function OfferList({ offers, categories }: { offers: Offer[]; categories: Category[] }) {
  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name;

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {offers.map((offer, i) => (
        <Reveal as="li" key={offer.id} delay={i * 0.08}>
          <Link
            href={offer.category ? `/category/${offer.category}` : "/cart"}
            className={`group sheen relative flex h-full min-h-44 flex-col justify-between overflow-hidden rounded-2xl p-6 transition-[translate] duration-300 ease-luxe hover:-translate-y-1 ${BANNERS[i % BANNERS.length]}`}
          >
            {/* Oversized figure as a graphic element. */}
            <span aria-hidden className="pointer-events-none absolute -right-3 -bottom-10 font-display text-[9rem] leading-none opacity-10 transition-transform duration-700 ease-luxe group-hover:-rotate-12 group-hover:scale-110">
              %
            </span>
            <div className="relative">
              <p className="text-xs font-semibold tracking-[0.14em] uppercase opacity-70">
                {offer.category ? categoryName(offer.category) : "Whole order"}
              </p>
              <p className="mt-2 font-display text-4xl leading-none">{offer.title}</p>
              <p className="mt-3 max-w-[18rem] text-sm opacity-80">{offer.description}</p>
            </div>
            <p className="relative mt-5 flex items-center gap-1 text-sm font-semibold">
              Min. order {formatPrice(offer.minimumAmount)}
              <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </p>
          </Link>
        </Reveal>
      ))}
    </ul>
  );
}
