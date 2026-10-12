"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Category } from "@/models/entities/product";

export function CategoryNav({ categories }: { categories: Category[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Categories" className="border-t border-zinc-100">
      <ul className="scrollbar-none mx-auto flex max-w-[1920px] gap-1 overflow-x-auto px-4 sm:gap-2 sm:px-6 lg:px-10">
        {categories.map((category) => {
          const href = `/category/${category.id}`;
          const active = pathname === href;
          return (
            <li key={category.id} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center border-b-2 px-2.5 py-2.5 text-sm whitespace-nowrap transition-colors ${
                  active
                    ? "border-zinc-900 font-semibold text-zinc-900"
                    : "border-transparent text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
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
