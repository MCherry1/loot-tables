// ---------------------------------------------------------------------------
// Budget calculation (Steps 1-2)
// ---------------------------------------------------------------------------

import type { Tier, Role, CampaignSettings } from './types';
import type { VaultSize } from './constants';
import { XP_BY_CR, GP_PER_XP, VAULT_BUDGET_PER_TIER, VAULT_SIZE_MULTIPLIER, computeRoleMultipliers } from './constants';

/**
 * Map from numeric CR values to the string keys used in XP_BY_CR.
 * Fractional CRs (0.125, 0.25, 0.5) are mapped to "1/8", "1/4", "1/2".
 */
function crToKey(cr: number): string {
  if (cr === 0.125) return '1/8';
  if (cr === 0.25) return '1/4';
  if (cr === 0.5) return '1/2';
  return String(cr);
}

/**
 * Calculate the full budget and role budget for a creature.
 *
 * full_budget = XP_BY_CR[cr] × GP_PER_XP[tier] × aplAdjustment × (4 / partySize)
 * role_budget = full_budget × roleMultiplier[role]
 *
 * Role multipliers are derived from the concentration setting when available,
 * falling back to the legacy flat roleRatios for backwards compatibility.
 *
 * @param cr - Challenge Rating as a number (0, 0.125, 0.25, 0.5, 1..30).
 * @param tier - Tier of play (1-4).
 * @param role - Creature's economy role.
 * @param settings - Campaign settings (party size, role ratios, etc.).
 * @returns The full hoard budget and the role-adjusted budget in GP.
 */
export function calculateBudget(
  cr: number,
  tier: Tier,
  role: Role,
  settings: CampaignSettings,
): { fullBudget: number; roleBudget: number } {
  const key = crToKey(cr);
  const xp = XP_BY_CR[key];

  if (xp === undefined) {
    throw new Error(`Unknown CR: ${cr} (key "${key}")`);
  }

  const gpPerXp = GP_PER_XP[tier];
  const aplAdj = settings.aplAdjustment ?? 1.0;
  const partySizeScalar = 4 / settings.partySize;
  const fullBudget = xp * gpPerXp * aplAdj * partySizeScalar;

  // Use concentration-derived multipliers when concentration is set,
  // otherwise fall back to the legacy flat roleRatios.
  const concentration = settings.concentration;
  const roleRatio = concentration != null
    ? computeRoleMultipliers(concentration)[role]
    : settings.roleRatios[role];
  const roleBudget = fullBudget * roleRatio;

  return { fullBudget, roleBudget };
}

/**
 * Calculate the budget for a vault hoard using fixed per-tier values.
 *
 * vault_budget = VAULT_BUDGET_PER_TIER[tier] × size_multiplier × (4 / partySize)
 *
 * @param tier - Tier of play (1-4).
 * @param size - Vault size category (minor/standard/major).
 * @param settings - Campaign settings (party size, etc.).
 * @returns The vault budget in GP.
 */
export function calculateVaultBudget(
  tier: Tier,
  size: VaultSize,
  settings: CampaignSettings,
): number {
  const base = VAULT_BUDGET_PER_TIER[tier];
  const sizeMultiplier = VAULT_SIZE_MULTIPLIER[size];
  const partySizeScalar = 4 / settings.partySize;
  return base * sizeMultiplier * partySizeScalar;
}
