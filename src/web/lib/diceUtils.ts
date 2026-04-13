/**
 * Shared dice / weight utilities. Used by the stepper (LootTables.tsx)
 * and the reference view (ReferenceView.tsx). Keep roll-time logic
 * (randomInRange, weightedPick) out of this module — those belong in
 * the stepper where they're wired to the reducer.
 */

export const STANDARD_DICE = [4, 6, 8, 10, 12, 20, 100];

/** Smallest standard die big enough to contain `total`. */
export function nextDieUp(total: number): number {
  for (const d of STANDARD_DICE) {
    if (d >= total) return d;
  }
  return 100;
}

/**
 * Compute display dice ranges from cumulative integer weights.
 * Weight-0 (cursed) entries produce an empty range where `hi < lo`,
 * which `formatRange` renders as an en-dash.
 */
export function computeDiceRanges(
  entries: { weight: number }[],
): { lo: number; hi: number }[] {
  const ranges: { lo: number; hi: number }[] = [];
  let cumulative = 0;
  for (const entry of entries) {
    const lo = cumulative + 1;
    const hi = cumulative + entry.weight;
    ranges.push({ lo, hi });
    cumulative = hi;
  }
  return ranges;
}

/** Format a dice range as "1", "1–6", or an en-dash for empty (cursed) slots. */
export function formatRange(r: { lo: number; hi: number }): string {
  if (r.hi < r.lo) return '\u2013';
  return r.lo === r.hi ? `${r.lo}` : `${r.lo}\u2013${r.hi}`;
}
