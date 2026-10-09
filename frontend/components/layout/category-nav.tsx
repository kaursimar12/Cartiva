"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { categoryEmoji } from "@/components/products/visuals";
import type { Category } from "@/models/entities/product";

export function CategoryNav({ categories }: { categories: Category[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Categories" className="border-t border-zinc-800">
      <ul className="scrollbar-none mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">
        {categories.map((category) => {
          const href = `/category/${category.id}`;
          const active = pathname === href;
          return (
            <li key={category.id} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm whitespace-nowrap ${
                  active ? "bg-zinc-200 font-semibold text-zinc-900" : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <span aria-hidden>{categoryEmoji[category.id]}</span>
                {category.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
