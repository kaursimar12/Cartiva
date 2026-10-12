import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/models/entities/product";

export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
      {categories.map((category) => (
        <li key={category.id}>
          <Link href={`/category/${category.id}`} className="group flex h-full flex-col items-center gap-2 text-center">
            <span className="relative aspect-square w-full overflow-hidden rounded-2xl bg-zinc-100 ring-1 ring-zinc-200 transition group-hover:shadow-md">
              <Image
                src={category.image}
                alt=""
                fill
                sizes="(min-width: 1024px) 130px, (min-width: 640px) 18vw, 30vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </span>
            <span className="text-xs leading-tight font-semibold text-zinc-800 sm:text-sm">{category.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
