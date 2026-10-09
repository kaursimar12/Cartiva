import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { Offer } from "@/models/entities/offer";
import type { Category } from "@/models/entities/product";

const surfaces = ["bg-zinc-900", "bg-zinc-800", "bg-zinc-700"];

export function OfferList({ offers, categories }: { offers: Offer[]; categories: Category[] }) {
  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name;

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {offers.map((offer, i) => (
        <li key={offer.id}>
          <Link
            href={offer.category ? `/category/${offer.category}` : "/cart"}
            className={`flex h-full flex-col justify-between rounded-2xl p-5 text-white shadow-sm hover:shadow-md ${surfaces[i % surfaces.length]}`}
          >
            <div>
              <p className="text-xs font-semibold tracking-wide uppercase opacity-90">
                {offer.category ? categoryName(offer.category) : "On your order"}
              </p>
              <p className="mt-1 text-2xl font-extrabold">{offer.title}</p>
              <p className="mt-1 text-sm opacity-95">{offer.description}</p>
            </div>
            <p className="mt-4 text-xs font-semibold opacity-90">Min. {formatPrice(offer.minimumAmount)} · Auto-applied</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
