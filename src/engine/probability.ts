// ---------------------------------------------------------------------------
// Budget-to-probability conversion (Step 3)
// ---------------------------------------------------------------------------

import type { Tier, CampaignSettings, CategoryEntry } from './types';
import { TIER_CATEGORIES } from './constants';
import { gpToDiceFormula } from './dice';
import { applyRichness } from './richness';

/** Resolved output for a single treasure category after probability conversion. */
export interface ResolvedCategory {
  type: 'coins' | 'gems' | 'art' | 'magic';
  /** For coins: the dice formula string (e.g. "4d6×10"). */
  formula?: string;
  /** For coins: the expected average gp value of the formula. */
  average?: number;
  /** For gems/art: probability (0-1) of finding one item (when expected < 1). */
  chance?: number;
  /** For gems/art: guaranteed count of items (when expected >= 1). */
  count?: number;
  /** For gems/art: gp value per unit. */
  unitValue?: number;
  /** For gems/art: reference table name (e.g. "Gems-2-50-gp"). */
  tableName?: string;
  /** For magic items: which MI table to roll on. */
  miTable?: string;
  /** For split rolls (expected > 1): number of independent rolls. */
  numRolls?: number;
  /** For split rolls (expected > 1): per-roll success probability. */
  perRollChance?: number;
}

/**
 * Given a role budget and tier, calculate the probability/quantity for each
 * treasure category.
 *
 * 1. Retrieves the tier's category breakdown from TIER_CATEGORIES.
 * 2. Applies the magic richness slider to adjust MI vs coin percentages.
 * 3. For each category, computes the budget share and converts it:
 *    - **Coins**: always present; converted to a dice formula via gpToDiceFormula.
 *    - **Gems/Art**: expected_count = category_budget / unitValue.
 *      - If >= 1: floor is guaranteed count, remainder is chance of one more.
 *      - If < 1: treated as a percentage chance of getting one item.
 *    - **Magic items**: expected = category_budget / avgValue.
 *      - If >= 1: use independent split rolls (numRolls = ceil, perRollChance = expected / numRolls).
 *      - If < 1: percentage chance of getting one item.
 *
 * @param roleBudget - The GP budget for this creature's role.
 * @param tier - Tier of play (1-4).
 * @param settings - Campaign settings (magic richness, etc.).
 * @returns An array of ResolvedCategory entries ready for rolling.
 */
export function resolveCategories(
  roleBudget: number,
  tier: Tier,
  settings: CampaignSettings,
): ResolvedCategory[] {
  // Step 1: Get the tier's base categories.
  const baseCategories: CategoryEntry[] = TIER_CATEGORIES[tier].map((c) => ({
    ...c,
  }));

  // Step 2: Apply magic richness slider.
  const adjusted = applyRichness(baseCategories, settings.magicRichness);

  const resolved: ResolvedCategory[] = [];

  for (const cat of adjusted) {
    const categoryBudget = roleBudget * (cat.pct / 100);

    if (cat.type === 'coins') {
      // Coins are always present; convert budget to a dice formula.
      const { formula, average } = gpToDiceFormula(categoryBudget);
      resolved.push({ type: 'coins', formula, average });
    } else if (cat.type === 'gems' || cat.type === 'art') {
      // Gems and art objects: compute expected count from budget / unit value.
      const unitValue = cat.unitValue!;
      const expectedCount = categoryBudget / unitValue;

      if (expectedCount >= 1) {
        // Guaranteed floor count, plus fractional chance of one more.
        const guaranteed = Math.floor(expectedCount);
        const remainder = expectedCount - guaranteed;
        resolved.push({
          type: cat.type,
          count: guaranteed,
          chance: remainder > 0 ? remainder : undefined,
          unitValue,
          tableName: cat.tableName,
        });
      } else if (expectedCount > 0) {
        // Less than one expected: treat as percentage chance.
        resolved.push({
          type: cat.type,
          chance: expectedCount,
          unitValue,
          tableName: cat.tableName,
        });
      }
      // If expectedCount <= 0, skip entirely.
    } else if (cat.type === 'magic') {
      // Magic items: expected = budget / average table value.
      const avgValue = cat.avgValue!;
      const expected = categoryBudget / avgValue;

      if (expected >= 1) {
        // Independent split rolls.
        const numRolls = Math.ceil(expected);
        const perRollChance = expected / numRolls;
        resolved.push({
          type: 'magic',
          miTable: cat.miTable,
          numRolls,
          perRollChance,
        });
      } else if (expected > 0) {
        // Single percentage chance.
        resolved.push({
          type: 'magic',
          miTable: cat.miTable,
          chance: expected,
        });
      }
      // If expected <= 0, skip entirely.
    }
  }

  return resolved;
}
