import type { Product } from "@/models/entities/product";
import { getProductEmoji, imageSurface } from "./visuals";

const sizes = {
  sm: "h-16 w-16 text-3xl rounded-lg",
  md: "aspect-square w-full text-6xl rounded-xl",
  lg: "aspect-square w-full text-[8rem] rounded-2xl",
} as const;

/** Illustrated placeholder until real photos exist at `product.image`. */
export function ProductImage({ product, size = "md" }: { product: Product; size?: keyof typeof sizes }) {
  return (
    <div
      role="img"
      aria-label={product.name}
      className={`flex shrink-0 items-center justify-center ${imageSurface} ${sizes[size]} ${
        product.stock ? "" : "grayscale"
      }`}
    >
      <span aria-hidden className="select-none">
        {getProductEmoji(product)}
      </span>
    </div>
  );
}
