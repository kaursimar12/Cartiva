import Link from "next/link";
import { pricingService } from "@/lib/container";
import { formatPrice } from "@/lib/format";
import type { Category } from "@/models/entities/product";

export function Footer({ categories }: { categories: Category[] }) {
  return (
    <footer className="mt-16 border-t border-zinc-800 bg-zinc-900 text-zinc-100">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        <div>
          <p className="text-lg font-extrabold text-white">Cartiva</p>
          <p className="mt-2 max-w-xs text-sm text-zinc-400">
            Intelligent grocery shopping. Browse with taps or just ask with your voice.
          </p>
        </div>
        <nav aria-label="Footer categories">
          <p className="text-sm font-semibold">Categories</p>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-zinc-400">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/category/${c.id}`} className="hover:text-white">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="text-sm font-semibold">Shopping</p>
          <ul className="mt-3 space-y-2 text-sm text-zinc-400">
            <li>
              <Link href="/cart" className="hover:text-white">
                My cart
              </Link>
            </li>
            <li>Free delivery on orders of {formatPrice(pricingService.delivery.freeAbove)} or more</li>
          </ul>
        </div>
      </div>
      <p className="border-t border-zinc-800 py-4 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} Cartiva · Portfolio project · Test mode, no real orders
      </p>
    </footer>
  );
}
