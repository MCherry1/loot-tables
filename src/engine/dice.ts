// ---------------------------------------------------------------------------
// Dice utilities for the treasure economy engine
// ---------------------------------------------------------------------------

import { cryptoRandom } from './random';

/** Common dice sizes used in D&D 5e. */
const DICE_SIZES = [4, 6, 8, 10, 12] as const;

/** Roll a single die of size M (uniform 1..M). */
function rollOne(m: number): number {
  return Math.floor(cryptoRandom() * m) + 1;
}

/** Roll NdM and return the sum. */
export function rollDice(n: number, m: number): number {
  let total = 0;
  for (let i = 0; i < n; i++) {
    total += rollOne(m);
  }
  return total;
}

/** Roll 2d4 (for value scores). Range 2-8, average 5. */
export function roll2d4(): number {
  return rollDice(2, 4);
}

/**
 * Given a target average GP value, produce a dice formula string and its average.
 *
 * The formula is in the form "NdM" or "NdM×K" where the average ≈ target.
 * - For small values (<1 gp): returns formula "0" with average 0.
 * - For values 1-10: use NdM (no multiplier).
 * - For values 10-100: use NdM×10.
 * - For values 100-1000: use NdM×100.
 * - For values 1000+: use NdM×1000.
 *
 * Chooses N and M from common dice so that N × (M+1)/2 × K ≈ target.
 */
export function gpToDiceFormula(targetGp: number): { formula: string; average: number } {
  if (targetGp < 1) {
    return { formula: '0', average: 0 };
  }

  // Determine the multiplier bracket.
  let multiplier: number;
  if (targetGp < 10) {
    multiplier = 1;
  } else if (targetGp < 100) {
    multiplier = 10;
  } else if (targetGp < 1000) {
    multiplier = 100;
  } else {
    multiplier = 1000;
  }

  // We need N × (M+1)/2 ≈ targetGp / multiplier.
  const scaledTarget = targetGp / multiplier;

  // Search for the best (N, M) combination.
  let bestN = 1;
  let bestM = 4;
  let bestError = Infinity;

  for (const m of DICE_SIZES) {
    const avgPerDie = (m + 1) / 2;
    // N = scaledTarget / avgPerDie, round to nearest positive integer.
    const rawN = scaledTarget / avgPerDie;
    const n = Math.max(1, Math.round(rawN));
    const actual = n * avgPerDie;
    const error = Math.abs(actual - scaledTarget);
    if (error < bestError) {
      bestError = error;
      bestN = n;
      bestM = m;
    }
  }

  const average = bestN * ((bestM + 1) / 2) * multiplier;
  const formula =
    multiplier === 1
      ? `${bestN}d${bestM}`
      : `${bestN}d${bestM}\u00d7${multiplier}`;

  return { formula, average };
}

/**
 * Evaluate a dice formula string and return the rolled result.
 *
 * Supported formats:
 * - "0"          → 0
 * - "NdM"        → roll NdM
 * - "NdM×K"      → roll NdM then multiply by K
 * - "NdM*K"      → same as above (ASCII asterisk variant)
 */
export function evalDiceFormula(formula: string): number {
  if (formula === '0') return 0;

  // Normalise multiplication sign: accept × or *.
  const normalized = formula.replace(/\u00d7/g, '*');

  // Split on '*' to separate dice part from optional multiplier.
  const parts = normalized.split('*');
  const dicePart = parts[0];
  const multiplier = parts.length > 1 ? parseInt(parts[1], 10) : 1;

  // Parse NdM.
  const match = dicePart.match(/^(\d+)d(\d+)$/);
  if (!match) {
    throw new Error(`Invalid dice formula: "${formula}"`);
  }

  const n = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);

  return rollDice(n, m) * multiplier;
}
