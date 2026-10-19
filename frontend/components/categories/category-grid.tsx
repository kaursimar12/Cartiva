import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/common/reveal";
import type { Category } from "@/models/entities/product";

/** A soft tint per aisle, so the grid reads like store signage rather than a photo wall. */
const TINTS: Record<string, string> = {
  vegetables: "bg-[#e7f3e3] dark:bg-[#e7f3e3]/10",
  fruits: "bg-[#fdeedd] dark:bg-[#fdeedd]/10",
  dairy: "bg-[#eaf1fb] dark:bg-[#eaf1fb]/10",
  beverages: "bg-[#fbe6e6] dark:bg-[#fbe6e6]/10",
  snacks: "bg-[#fdf3d6] dark:bg-[#fdf3d6]/10",
  breakfast: "bg-[#f6ecdf] dark:bg-[#f6ecdf]/10",
  cleaning: "bg-[#e3f2f4] dark:bg-[#e3f2f4]/10",
  laundry: "bg-[#ece8f8] dark:bg-[#ece8f8]/10",
  "personal-care": "bg-[#f9e7f0] dark:bg-[#f9e7f0]/10",
};

export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
      {categories.map((category, i) => (
        <Reveal as="li" key={category.id} delay={i * 0.04}>
          <Link
            href={`/category/${category.id}`}
            className={`group flex h-full flex-col overflow-hidden rounded-2xl p-3 transition-[translate,box-shadow] duration-300 ease-luxe hover:-translate-y-1 hover:shadow-card active:translate-y-0 ${
              TINTS[category.id] ?? "bg-surface-muted"
            }`}
          >
            <span className="text-[13px] leading-tight font-semibold text-zinc-900">{category.name}</span>
            <span className="relative mt-3 block aspect-square w-full overflow-hidden rounded-xl">
              <Image
                src={category.image}
                alt=""
                fill
                sizes="(min-width: 1024px) 140px, (min-width: 640px) 18vw, 30vw"
                className="object-cover transition-transform duration-700 ease-luxe group-hover:scale-105"
              />
            </span>
          </Link>
        </Reveal>
      ))}
    </ul>
  );
}
