import Link from "next/link";
import { TagIcon } from "@/components/common/icons";
import { formatPrice } from "@/lib/format";
import type { Offer } from "@/models/entities/offer";
import type { Category } from "@/models/entities/product";

export function OfferList({ offers, categories }: { offers: Offer[]; categories: Category[] }) {
  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name;

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {offers.map((offer) => (
        <li key={offer.id}>
          <Link
            href={offer.category ? `/category/${offer.category}` : "/cart"}
            className="flex h-full gap-4 rounded-2xl border border-zinc-200 bg-surface p-4 transition hover:border-zinc-300 hover:shadow-md"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <TagIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-500">
                {offer.category ? categoryName(offer.category) : "On your order"}
              </p>
              <p className="text-lg font-bold text-zinc-900">{offer.title}</p>
              <p className="mt-0.5 text-sm text-zinc-600">{offer.description}</p>
              <p className="mt-2 text-xs font-medium text-zinc-500">
                Min. order {formatPrice(offer.minimumAmount)} · Auto-applied
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
