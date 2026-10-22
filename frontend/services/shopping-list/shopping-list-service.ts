import type { Product } from "@/models/entities/product";
import type { ListLine, ScannedItem } from "@/models/entities/shopping-list";
import type { CatalogService } from "@/services/catalog-service";
import { packsNeeded, parsePack } from "./units";

const MAX_OPTIONS = 5;

/** Words that say nothing about which option ("the 2 kg one", "wala"). */
const CHOICE_FILLER = new Set(["the", "a", "an", "one", "pack", "of", "please", "wala", "wali", "vala"]);

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/** Turns scanned list items into reviewable lines: which product, how many packs, available or not. */
export class ShoppingListService {
  constructor(private readonly catalog: CatalogService) {}

  toLine(item: ScannedItem, id: string): ListLine {
    const candidates = this.candidates(item.name);
    const line: ListLine = {
      id,
      name: item.name,
      original: item.original,
      quantity: item.quantity,
      unit: item.unit,
      status: "not-found",
      productId: null,
      options: candidates.map((p) => p.id),
      packs: 0,
      limited: false,
    };
    if (candidates.length === 0) return line;

    const product = this.pick(item, candidates);
    return product ? this.withProduct(line, product) : { ...line, status: "choose" };
  }

  /** The shopper picked one of the options. */
  choose(line: ListLine, productId: string): ListLine {
    const product = this.catalog.getProduct(productId);
    return product ? this.withProduct(line, product) : line;
  }

  /**
   * Works out which line and option a voice answer refers to. Only lines still waiting for a choice
   * ("Which one?") can change: never an out-of-stock or already-decided line, even if the agent names
   * it. A wrong lineId falls back to the waiting line that has the option, and the option may be given
   * by name ("Vim 250 ml", "Surf Excel Matic 2 kg"). Returns null unless exactly one option matches.
   */
  resolveChoice(lines: ListLine[], lineId: unknown, choice: string): { line: ListLine; productId: string } | null {
    const waiting = lines.filter((l) => l.status === "choose");
    const target = waiting.find((l) => l.id === lineId);
    const pool = target ? [target] : waiting;
    const options = pool.flatMap((line) => line.options.map((productId) => ({ line, productId })));

    const byId = options.filter((o) => o.productId === choice);
    if (byId.length > 0) return byId.length === 1 ? byId[0] : null;

    // Every word the agent used must appear in the option's name and size ("vim 250 ml").
    const words = normalize(choice)
      .split(" ")
      .filter((w) => w && !CHOICE_FILLER.has(w));
    if (words.length === 0) return null;
    const byName = options.filter(({ productId }) => {
      const product = this.catalog.getProduct(productId);
      if (!product) return false;
      const full = ` ${normalize(`${product.name} ${product.unit}`)} `;
      return words.every((w) => full.includes(` ${w} `));
    });
    return byName.length === 1 ? byName[0] : null;
  }

  /** The shopper changed the number of packs. */
  withPacks(line: ListLine, packs: number): ListLine {
    const product = line.productId ? this.catalog.getProduct(line.productId) : undefined;
    if (!product) return line;
    return { ...line, packs: Math.min(packs, product.availableQuantity), limited: packs > product.availableQuantity };
  }

  /** Search the catalog, keeping only the most common category ("milk" → dairy, not chocolate). */
  private candidates(name: string): Product[] {
    const results = this.catalog.search(name);
    if (results.length === 0) return [];
    const counts = new Map<string, number>();
    for (const p of results) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    const category = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    return results.filter((p) => p.category === category).slice(0, MAX_OPTIONS);
  }

  /** Picks a product only when the list clearly means one; otherwise the shopper chooses. */
  private pick(item: ScannedItem, candidates: Product[]): Product | undefined {
    if (candidates.length === 1) return candidates[0];

    // The plain product over variants: "tomato" → "Tomato", not "Tomato Cherry".
    const word = normalize(item.name);
    const plain = candidates.filter((p) => [word, `${word}s`, `${word}es`].includes(normalize(p.name)));
    if (plain.length === 1) return plain[0];

    // A pack size was written and only one candidate has it: "Surf Excel 2 kg".
    if (item.quantity !== null && item.unit) {
      const wanted = parsePack(`${item.quantity} ${item.unit}`);
      const sameSize = candidates.filter((p) => {
        const pack = parsePack(p.unit);
        return wanted && pack && pack.dimension === wanted.dimension && pack.value === wanted.value;
      });
      if (sameSize.length === 1) return sameSize[0];
    }
    return undefined;
  }

  private withProduct(line: ListLine, product: Product): ListLine {
    if (!product.stock) return { ...line, status: "unavailable", productId: product.id, packs: 0, limited: false };
    const packs = packsNeeded(line.quantity, line.unit, product.unit);
    return {
      ...line,
      status: "found",
      productId: product.id,
      packs: Math.min(packs, product.availableQuantity),
      limited: packs > product.availableQuantity,
    };
  }
}
