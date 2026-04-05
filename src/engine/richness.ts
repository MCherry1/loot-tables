// ---------------------------------------------------------------------------
// Magic richness slider (Step 4)
// ---------------------------------------------------------------------------

import type { CategoryEntry } from './types';

/** Maximum total percentage that magic item categories can consume. */
const MAX_MI_PCT = 85;

/**
 * Apply the magic richness slider to tier category percentages.
 *
 * - Multiply every magic-item category's pct by `richness` (0.5-1.5).
 * - Redistribute the difference (gained or lost) to the coins category.
 * - Cap total magic-item pct at 85%; any excess goes back to coins.
 *
 * @param categories - The original tier category entries (not mutated).
 * @param richness - The magic richness multiplier (0.5-1.5, default 1.0).
 * @returns A new array of CategoryEntry with adjusted percentages.
 */
export function applyRichness(
  categories: readonly CategoryEntry[],
  richness: number,
): CategoryEntry[] {
  // Deep-copy so we don't mutate the original.
  const result: CategoryEntry[] = categories.map((c) => ({ ...c }));

  // Sum the original magic pct.
  const originalMagicPct = result
    .filter((c) => c.type === 'magic')
    .reduce((sum, c) => sum + c.pct, 0);

  // Scale every magic category.
  for (const cat of result) {
    if (cat.type === 'magic') {
      cat.pct *= richness;
    }
  }

  // Compute the new magic total.
  let newMagicPct = result
    .filter((c) => c.type === 'magic')
    .reduce((sum, c) => sum + c.pct, 0);

  // Cap total magic at MAX_MI_PCT.
  if (newMagicPct > MAX_MI_PCT) {
    const scale = MAX_MI_PCT / newMagicPct;
    for (const cat of result) {
      if (cat.type === 'magic') {
        cat.pct *= scale;
      }
    }
    newMagicPct = MAX_MI_PCT;
  }

  // Redistribute the delta to coins.
  const delta = originalMagicPct - newMagicPct;
  const coinsEntry = result.find((c) => c.type === 'coins');
  if (coinsEntry) {
    coinsEntry.pct = Math.max(0, coinsEntry.pct + delta);
  }

  return result;
}
