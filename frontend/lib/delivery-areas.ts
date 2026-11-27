import { brand } from "@/lib/brand";

/** Areas the store delivers to (header picker, footer, help page), from the brand's brand.json. */
export const DELIVERY_AREAS: readonly string[] = brand.deliveryAreas;

export type DeliveryArea = string;

export const DEFAULT_DELIVERY_AREA: DeliveryArea = DELIVERY_AREAS[0];
