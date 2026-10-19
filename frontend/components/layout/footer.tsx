import Link from "next/link";
import { LeafIcon, ShieldIcon, TruckIcon } from "@/components/common/icons";
import { pricingService } from "@/lib/container";
import { formatPrice } from "@/lib/format";
import type { Category } from "@/models/entities/product";

export function Footer({ categories }: { categories: Category[] }) {
  const promises = [
    { icon: LeafIcon, title: "Fresh every day", text: "Produce sourced daily" },
    { icon: TruckIcon, title: "Free delivery", text: `On orders above ${formatPrice(pricingService.delivery.freeAbove)}` },
    { icon: ShieldIcon, title: "Secure payments", text: "Pay safely at checkout" },
  ];

  return (
    <footer className="mt-24 border-t border-hairline bg-surface/60 text-zinc-700">
      <ul className="mx-auto grid max-w-[1920px] gap-4 border-b border-zinc-100 px-4 py-6 sm:grid-cols-3 sm:px-6 lg:px-10">
        {promises.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
              <Icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-zinc-900">{title}</span>
              <span className="block text-xs text-zinc-500">{text}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mx-auto grid max-w-[1920px] gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:px-10 lg:grid-cols-3">
        <div>
          <p className="text-xl font-semibold tracking-[-0.04em] text-zinc-900">cartiva</p>
          <p className="mt-2 max-w-xs text-sm text-zinc-500">
            Intelligent grocery shopping. Browse with taps or just ask with your voice.
          </p>
        </div>
        <nav aria-label="Footer categories">
          <p className="text-sm font-semibold text-zinc-900">Categories</p>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-zinc-500">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/category/${c.id}`} className="hover:text-brand-700">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="text-sm font-semibold text-zinc-900">Shopping</p>
          <ul className="mt-3 space-y-2 text-sm text-zinc-500">
            <li>
              <Link href="/cart" className="hover:text-brand-700">
                My cart
              </Link>
            </li>
            <li>
              <Link href="/search" className="hover:text-brand-700">
                Search products
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <p className="border-t border-zinc-100 py-4 text-center text-xs text-zinc-400">
        © {new Date().getFullYear()} Cartiva · Portfolio project · Test mode, no real orders
      </p>
    </footer>
  );
}
