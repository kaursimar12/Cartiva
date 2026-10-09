/**
 * Every money amount in the domain is an integer number of paise (₹1 = 100 paise).
 * JSON data is written in rupees for readability and converted once, on load.
 * The FastAPI backend follows the same rules so both compute identical totals.
 */
export type Paise = number;

export function rupeesToPaise(rupees: number): Paise {
  return Math.round(rupees * 100);
}

/** "₹1,250" for whole rupees, "₹34.50" when there are paise. */
export function formatPrice(amount: Paise): string {
  const rupees = amount / 100;
  const fractionDigits = Number.isInteger(rupees) ? 0 : 2;
  return `₹${rupees.toLocaleString("en-IN", { minimumFractionDigits: fractionDigits, maximumFractionDigits: 2 })}`;
}
