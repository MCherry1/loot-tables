// ---------------------------------------------------------------------------
// Budget calculation — Role Multiplier Model
// ---------------------------------------------------------------------------
//
// Each creature's loot budget = XP × GP/XP[tier] × roleMultiplier
//
// Role multipliers are derived from raw weights (1/3/9/27, ~3× geometric
// steps) normalized against an assumed 25/25/25/25 campaign XP split.
// This produces multipliers of 0.10 / 0.30 / 0.90 / 2.70 which sum to
// exactly 1.0 over a balanced campaign — no wealth is lost or created.
//
// Individual encounters will over- or under-distribute depending on
// composition. Boss-heavy encounters are richer. Minion-heavy encounters
// are leaner. It balances out over a campaign.
//
// Vault is separate — it's placed treasure, not a creature role.
// ---------------------------------------------------------------------------

import type { Tier, Role, CreatureRole, CampaignSettings } from './types';
import type { VaultSize } from './constants';
import { XP_BY_CR, GP_PER_XP, VAULT_BUDGET_PER_TIER, VAULT_SIZE_MULTIPLIER } from './constants';

/**
 * Raw role weights (~3× geometric steps).
 * Normalized against 25/25/25/25 assumed campaign XP split:
 *   weightedAvg = (1+3+9+27)/4 = 10
 *   multiplier = rawWeight / 10
 */
export const ROLE_RAW_WEIGHT: Record<CreatureRole, number> = {
  minion: 1,
  elite: 3,
  'mini-boss': 9,
  boss: 27,
} as const;

/** The assumed-even-split weighted average of role weights. */
const WEIGHTED_AVG = 10; // (1 + 3 + 9 + 27) / 4

/** Pre-computed role multipliers (rawWeight / weightedAvg). */
export const ROLE_MULTIPLIER: Record<CreatureRole, number> = {
  minion: ROLE_RAW_WEIGHT.minion / WEIGHTED_AVG,       // 0.10
  elite: ROLE_RAW_WEIGHT.elite / WEIGHTED_AVG,         // 0.30
  'mini-boss': ROLE_RAW_WEIGHT['mini-boss'] / WEIGHTED_AVG, // 0.90
  boss: ROLE_RAW_WEIGHT.boss / WEIGHTED_AVG,           // 2.70
} as const;

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
 * Calculate the budget for a single creature.
 *
 * fullBudget  = XP_BY_CR[cr] × GP_PER_XP[tier] × aplAdjustment × (4 / partySize)
 * roleBudget  = fullBudget × ROLE_MULTIPLIER[role]
 *
 * The role multiplier determines what fraction of the creature's "fair share"
 * it actually carries. A minion carries 10% (pocket change). A boss carries
 * 270% (the big score). Over a campaign with even role distribution, the
 * average multiplier is exactly 1.0 — total wealth distributed equals total
 * XP budget.
 *
 * @param cr - Challenge Rating as a number (0, 0.125, 0.25, 0.5, 1..30).
 * @param tier - Tier of play (1-4).
 * @param role - Creature's economy role.
 * @param settings - Campaign settings (party size, APL adjustment, etc.).
 * @returns The full (pre-role) budget and the role-adjusted budget in GP.
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

  // Vault role uses 1.0 multiplier (it's placed treasure, sized separately)
  const mult = role === 'vault' ? 1.0 : ROLE_MULTIPLIER[role as CreatureRole];
  const roleBudget = fullBudget * mult;

  return { fullBudget, roleBudget };
}

/**
 * Calculate the budget for a vault hoard using fixed per-tier values.
 * Vault is separate from creature roles — it's placed treasure.
 *
 * vault_budget = VAULT_BUDGET_PER_TIER[tier] × size_multiplier × (4 / partySize)
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
