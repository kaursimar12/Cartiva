"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TagIcon } from "@/components/common/icons";
import type { Category } from "@/models/entities/product";

export function CategoryNav({ categories }: { categories: Category[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Categories" className="border-t border-hairline">
      <ul className="scrollbar-none mx-auto flex max-w-[1920px] gap-2 overflow-x-auto px-4 sm:px-6 lg:px-10">
        <li className="shrink-0">
          <Link
            href="/offers"
            aria-current={pathname === "/offers" ? "page" : undefined}
            className={`flex items-center gap-1 border-b-2 px-2.5 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
              pathname === "/offers" ? "border-brand-600 text-brand-700" : "border-transparent text-brand-700 hover:text-brand-800"
            }`}
          >
            <TagIcon className="h-4 w-4" />
            Offers
          </Link>
        </li>
        {categories.map((category) => {
          const href = `/category/${category.id}`;
          const active = pathname === href;
          return (
            <li key={category.id} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center border-b-2 px-2.5 py-2 text-sm whitespace-nowrap transition-colors ${
                  active
                    ? "border-zinc-900 font-semibold text-zinc-900"
                    : "border-transparent text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {category.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
