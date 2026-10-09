import Link from "next/link";
import { categoryEmoji, imageSurface } from "@/components/products/visuals";
import type { Category } from "@/models/entities/product";

export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
      {categories.map((category) => (
        <li key={category.id}>
          <Link
            href={`/category/${category.id}`}
            className="flex h-full flex-col items-center gap-2 rounded-2xl border border-zinc-300 bg-surface p-3 text-center transition-shadow hover:border-zinc-400 hover:shadow-md"
          >
            <span className={`flex h-14 w-14 items-center justify-center rounded-xl text-3xl ${imageSurface}`} aria-hidden>
              {categoryEmoji[category.id]}
            </span>
            <span className="text-xs font-semibold sm:text-sm">{category.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
