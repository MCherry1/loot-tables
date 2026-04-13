// ---------------------------------------------------------------------------
// Budget calculation — Independent Pool Model
// ---------------------------------------------------------------------------
//
// Each creature's loot is computed from four independent pools:
//   coins  = base × COINS_PER_XP[tier]
//   gems   = base × GEMS_PER_XP[tier]
//   art    = base × ART_PER_XP[tier]
//   magic  = base × MI_PER_XP[tier][table]  (expected item count)
//
// where base = XP × roleMult × tierProg × partySizeScalar.
//
// Role multipliers (0.15 / 0.50 / 1.00 / 1.75) are regression-optimized
// against published adventures. Mini-boss = exactly fair share (1.0×).
//
// Vault is separate — it's placed treasure, not a creature role.
// ---------------------------------------------------------------------------

import type { Tier, Role, CreatureRole, CampaignSettings } from './types';
import type { VaultSize } from './constants';
import { XP_BY_CR, GP_PER_XP, VAULT_BUDGET_PER_TIER, VAULT_SIZE_MULTIPLIER, progressionMultiplier, ROLE_MULTIPLIER } from './constants';

// ---------------------------------------------------------------------------
// Pool base — the shared multiplier for independent pool calculations
// ---------------------------------------------------------------------------

export interface PoolBase {
  /** Raw XP value for this CR. */
  xp: number;
  /** Role multiplier (0.15 / 0.50 / 1.00 / 1.75, or 1.0 when roles disabled). */
  roleMult: number;
  /** Tier progression multiplier (0.70–1.30, or 1.0 when disabled). */
  tierProg: number;
  /** Party size scalar (4 / partySize). */
  partySizeScalar: number;
  /** Pre-computed product: xp × roleMult × tierProg × partySizeScalar. */
  base: number;
}

/**
 * Compute the shared base that all four independent pools multiply against.
 *
 *   base = XP × roleMult × tierProg × partySizeScalar
 *
 * Each pool then applies its own per-XP constant:
 *   coins  = base × COINS_PER_XP[tier]
 *   gems   = base × GEMS_PER_XP[tier]
 *   art    = base × ART_PER_XP[tier]
 *   magic  = base × MI_PER_XP[tier][table]  (per table, = expected item count)
 */
export function calculatePoolBase(
  cr: number,
  tier: Tier,
  role: Role,
  settings: CampaignSettings,
): PoolBase {
  const key = crToKey(cr);
  const xp = XP_BY_CR[key];
  if (xp === undefined) {
    throw new Error(`Unknown CR: ${cr} (key "${key}")`);
  }

  const useRoles = settings.useRoles ?? true;
  const roleMult = role === 'vault' ? 1.0
    : useRoles ? ROLE_MULTIPLIER[role as CreatureRole]
    : 1.0;

  const tierProg = settings.partyLevel != null
    ? progressionMultiplier(settings.partyLevel, tier, settings.tierProgression ?? true)
    : (settings.aplAdjustment ?? 1.0);

  const partySizeScalar = 4 / settings.partySize;

  return {
    xp,
    roleMult,
    tierProg,
    partySizeScalar,
    base: xp * roleMult * tierProg * partySizeScalar,
  };
}

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
 * it actually carries. A minion carries 15% (pocket change). A boss carries
 * 175% (the big score). Over a balanced campaign, total wealth distributed
 * approximates total XP budget.
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
