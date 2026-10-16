/** Everything is converted to a base unit: grams, millilitres or pieces. */
type Dimension = "mass" | "volume" | "count";

const UNITS: Record<string, { dimension: Dimension; factor: number }> = {
  g: { dimension: "mass", factor: 1 },
  gm: { dimension: "mass", factor: 1 },
  gram: { dimension: "mass", factor: 1 },
  grams: { dimension: "mass", factor: 1 },
  kg: { dimension: "mass", factor: 1000 },
  kgs: { dimension: "mass", factor: 1000 },
  kilo: { dimension: "mass", factor: 1000 },
  ml: { dimension: "volume", factor: 1 },
  l: { dimension: "volume", factor: 1000 },
  ltr: { dimension: "volume", factor: 1000 },
  litre: { dimension: "volume", factor: 1000 },
  liter: { dimension: "volume", factor: 1000 },
  pc: { dimension: "count", factor: 1 },
  pcs: { dimension: "count", factor: 1 },
  piece: { dimension: "count", factor: 1 },
  pieces: { dimension: "count", factor: 1 },
  pack: { dimension: "count", factor: 1 },
  packs: { dimension: "count", factor: 1 },
  packet: { dimension: "count", factor: 1 },
  dozen: { dimension: "count", factor: 12 },
};

function unitInfo(unit: string) {
  return UNITS[unit.trim().toLowerCase().replace(/\.$/, "")];
}

/** "1 kg" → 1000 g · "4 x 250 g" → 1000 g · "1 dozen" → 12 pieces. Undefined if not understood. */
export function parsePack(unit: string): { value: number; dimension: Dimension } | undefined {
  const match = unit.trim().toLowerCase().match(/^(?:(\d+(?:\.\d+)?)\s*x\s*)?(\d+(?:\.\d+)?)\s*([a-z]+)$/);
  if (!match) return undefined;
  const info = unitInfo(match[3]);
  if (!info) return undefined;
  return { value: Number(match[1] ?? 1) * Number(match[2]) * info.factor, dimension: info.dimension };
}

/**
 * How many packs to add. "2 kg" of a 1 kg pack → 2 · "200 g" of a 100 g pack → 2 ·
 * "500 ml" of a 1 L pack → 1 · just "3" → 3 · nothing → 1. Always a whole number ≥ 1.
 */
export function packsNeeded(quantity: number | null, unit: string | null, packUnit: string): number {
  const requested = unit ? unitInfo(unit) : undefined;
  const pack = parsePack(packUnit);
  if (quantity !== null && requested && pack && requested.dimension === pack.dimension) {
    return Math.max(1, Math.ceil((quantity * requested.factor) / pack.value - 1e-9));
  }
  return Math.max(1, Math.ceil(quantity ?? 1));
}
