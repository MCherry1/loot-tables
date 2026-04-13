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
import { XP_BY_CR, GP_PER_XP, VAULT_BUDGET_PER_TIER, VAULT_SIZE_MULTIPLIER, progressionMultiplier } from './constants';

/**
 * Raw role weights (regression-optimized against published adventures).
 * Calibrated against LMoP (all chapters), Curse of Strahd, and mixed
 * encounter compositions to minimize delivery variance across adventure
 * styles while maintaining narrative role differentiation.
 *
 * Mini-boss = exactly fair share (1.0×): not penalized for being in
 * an organization, not skimming. The lieutenant gets what they'd get solo.
 *
 * See specs/ENCOUNTER-BALANCE.md for the full regression analysis.
 */
export const ROLE_RAW_WEIGHT: Record<CreatureRole, number> = {
  minion: 3,
  elite: 10,
  'mini-boss': 20,
  boss: 35,
} as const;

/** Divisor calibrated so mini-boss = 1.00× (exactly fair share). */
const WEIGHTED_AVG = 20;

/** Pre-computed role multipliers (rawWeight / weightedAvg). */
export const ROLE_MULTIPLIER: Record<CreatureRole, number> = {
  minion: 0.15,       // pocket change — part of the machine
  elite: 0.50,        // personal gear — decent personal wealth
  'mini-boss': 1.00,  // exactly fair share — the lieutenant
  boss: 1.75,         // the big score — accumulated wealth
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
  // New system: compute from partyLevel + tierProgression.
  // Backward compat: fall back to stored aplAdjustment for old settings.
  const aplAdj = settings.partyLevel != null
    ? progressionMultiplier(settings.partyLevel, tier, settings.tierProgression ?? true)
    : (settings.aplAdjustment ?? 1.0);
  const partySizeScalar = 4 / settings.partySize;
  const fullBudget = xp * gpPerXp * aplAdj * partySizeScalar;

  // Vault role uses 1.0 multiplier (it's placed treasure, sized separately)
  // When useRoles is false, all creature roles also get 1.0 (flat CR distribution)
  const useRoles = settings.useRoles ?? true;
  const mult = role === 'vault' ? 1.0
    : useRoles ? ROLE_MULTIPLIER[role as CreatureRole]
    : 1.0;
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
