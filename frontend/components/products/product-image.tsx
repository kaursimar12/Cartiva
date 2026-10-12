import Image from "next/image";
import type { Product } from "@/models/entities/product";

const sizes = {
  sm: { box: "h-16 w-16 rounded-xl", sizes: "64px" },
  md: { box: "aspect-square w-full rounded-xl", sizes: "(min-width: 1280px) 220px, (min-width: 640px) 30vw, 45vw" },
  lg: { box: "aspect-square w-full rounded-2xl", sizes: "(min-width: 768px) 45vw, 100vw" },
} as const;

/** Product photo from `product.image`, on a neutral tile. */
export function ProductImage({
  product,
  size = "md",
  priority = false,
}: {
  product: Product;
  size?: keyof typeof sizes;
  priority?: boolean;
}) {
  const { box, sizes: imageSizes } = sizes[size];
  return (
    <div className={`relative shrink-0 overflow-hidden bg-zinc-100 ${box}`}>
      <Image
        src={product.image}
        alt={product.name}
        fill
        sizes={imageSizes}
        priority={priority}
        className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
          product.stock ? "" : "opacity-50 grayscale"
        }`}
      />
    </div>
  );
}
