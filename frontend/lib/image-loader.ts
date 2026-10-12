"use client";

import type { ImageLoaderProps } from "next/image";

/**
 * Unsplash's CDN resizes on the fly, so we ask it for the exact width instead of
 * letting Next.js download multi-megabyte originals. Local images are served as-is.
 */
export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  if (src.startsWith("https://images.unsplash.com/")) {
    return `${src}?auto=format&fit=crop&w=${width}&q=${quality ?? 75}`;
  }
  return src;
}
