import Link from "next/link";
import { LeafIcon, ShieldIcon, TruckIcon } from "@/components/common/icons";
import { pricingService } from "@/lib/container";
import { DELIVERY_AREAS } from "@/lib/delivery-areas";
import { formatPrice } from "@/lib/format";
import type { Category } from "@/models/entities/product";

const linkClass = "hover:text-zinc-900";

/** Store footer. Every link goes to a real page or section of this site. */
export function Footer({ categories }: { categories: Category[] }) {
  const promises = [
    { icon: LeafIcon, title: "Fresh every morning", text: "Fruits and vegetables restocked daily" },
    { icon: TruckIcon, title: "Free delivery", text: `On orders above ${formatPrice(pricingService.delivery.freeAbove)}` },
    { icon: ShieldIcon, title: "Secure payments", text: "UPI, cards and netbanking via Razorpay" },
  ];

  const columns = [
    {
      title: "Shop",
      links: [
        { href: "/offers", label: "Offers" },
        { href: "/scan-list", label: "Scan a shopping list" },
        { href: "/search", label: "Search" },
        { href: "/cart", label: "Your cart" },
      ],
    },
    {
      title: "Help",
      links: [
        { href: "/help#delivery", label: "Delivery & fees" },
        { href: "/help#offers", label: "Offers & prices" },
        { href: "/help#payments", label: "Payments" },
        { href: "/help#voice", label: "Shopping by voice" },
      ],
    },
  ];

  return (
    <footer className="mt-20 border-t border-hairline bg-surface text-zinc-600">
      <ul className="mx-auto grid max-w-[1920px] gap-4 border-b border-hairline px-4 py-6 sm:grid-cols-3 sm:px-6 lg:px-10">
        {promises.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-zinc-700">
              <Icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-zinc-900">{title}</span>
              <span className="block text-xs text-zinc-500">{text}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mx-auto grid max-w-[1920px] gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.3fr_1.4fr_1fr_1fr_1.2fr] lg:px-10">
        <div>
          <p className="flex items-baseline gap-1">
            <span className="text-xl font-semibold tracking-tight text-zinc-900">cartiva</span>
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden />
          </p>
          <p className="mt-2 max-w-xs text-sm text-zinc-500">
            Groceries and daily essentials delivered in about 10 minutes. Shop by tapping, or just tell Cartiva what you
            need.
          </p>
        </div>

        <nav aria-label="Footer categories">
          <p className="text-sm font-semibold text-zinc-900">Categories</p>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/category/${c.id}`} className={linkClass}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="text-sm font-semibold text-zinc-900">{col.title}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={linkClass}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div>
          <p className="text-sm font-semibold text-zinc-900">We deliver to</p>
          <ul className="mt-3 space-y-2 text-sm">
            {DELIVERY_AREAS.map((area) => (
              <li key={area}>{area}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-hairline">
        <p className="mx-auto flex max-w-[1920px] flex-wrap justify-between gap-2 px-4 py-4 text-xs text-zinc-500 sm:px-6 lg:px-10">
          <span>© {new Date().getFullYear()} Cartiva. All prices include taxes.</span>
          <span>Payments run in Razorpay test mode; no real money is charged.</span>
        </p>
      </div>
    </footer>
  );
}
