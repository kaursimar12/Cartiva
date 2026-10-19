import Image from "next/image";
import type { Product } from "@/models/entities/product";

const sizes = {
  sm: { box: "h-16 w-16 rounded-xl", sizes: "64px" },
  md: { box: "aspect-square w-full rounded-xl", sizes: "(min-width: 1280px) 220px, (min-width: 640px) 30vw, 45vw" },
  lg: { box: "aspect-square w-full rounded-3xl", sizes: "(min-width: 768px) 45vw, 100vw" },
} as const;

/**
 * Product image filling its whole square tile. Packshots are square images shot on white;
 * `mix-blend-multiply` melts that white into the tile colour so every product sits on the same background.
 */
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
    <div className={`relative shrink-0 overflow-hidden bg-tile ${box}`}>
      <Image
          src={product.image}
          alt={product.name}
          fill
          sizes={imageSizes}
          priority={priority}
          className={`object-cover mix-blend-multiply transition-transform duration-500 ease-luxe group-hover:scale-[1.05] ${
            product.stock ? "" : "opacity-40 grayscale"
          }`}
        />
    </div>
  );
}
