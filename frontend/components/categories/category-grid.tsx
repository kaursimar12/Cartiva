import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/models/entities/product";

/** Shop-by-category tiles: photo first, name underneath, on plain white cards. */
export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
      {categories.map((category) => (
        <li key={category.id}>
          <Link
            href={`/category/${category.id}`}
            className="flex h-full flex-col overflow-hidden rounded-2xl border border-hairline bg-surface p-2 transition-colors hover:border-zinc-300"
          >
            <span className="relative block aspect-square w-full overflow-hidden rounded-xl bg-tile">
              <Image
                src={category.image}
                alt=""
                fill
                sizes="(min-width: 1024px) 140px, (min-width: 640px) 18vw, 30vw"
                className="object-cover"
              />
            </span>
            <span className="mt-2 px-1 pb-1 text-center text-[13px] leading-tight font-medium text-zinc-800">
              {category.name}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
