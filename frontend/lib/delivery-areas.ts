/** Areas the store delivers to (shown in the header picker, footer and help page). */
export const DELIVERY_AREAS = [
  "Sector 62, Noida",
  "Sector 18, Noida",
  "Indirapuram, Ghaziabad",
  "Connaught Place, New Delhi",
  "DLF Phase 3, Gurugram",
] as const;

export type DeliveryArea = (typeof DELIVERY_AREAS)[number];

export const DEFAULT_DELIVERY_AREA: DeliveryArea = DELIVERY_AREAS[0];
