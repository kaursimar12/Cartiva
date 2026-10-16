/** One item as the list reader (FastAPI + OpenAI) returned it. */
export interface ScannedItem {
  /** Simple English product word, e.g. "tomato". */
  name: string;
  quantity: number | null;
  unit: string | null;
  /** Exactly as written on the list, e.g. "tamatar 2 kg". */
  original: string;
}

export type ListLineStatus = "found" | "choose" | "unavailable" | "not-found";

/** One line of the shopping list being reviewed before it goes into the cart. */
export interface ListLine {
  id: string;
  name: string;
  original: string;
  quantity: number | null;
  unit: string | null;
  status: ListLineStatus;
  /** The product that will be added (set when status is "found" or "unavailable"). */
  productId: string | null;
  /** Candidate products to choose from (same category, best matches first). */
  options: string[];
  /** Number of packs to add. */
  packs: number;
  /** True if fewer packs than asked are available. */
  limited: boolean;
}
