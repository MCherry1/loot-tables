// ---------------------------------------------------------------------------
// Main loot generation orchestrator
// ---------------------------------------------------------------------------

import type {
  CampaignSettings,
  CategoryEntry,
  CoinBreakdown,
  CoinDenom,
  CreatureResult,
  EncounterInput,
  EncounterInputV2,
  EncounterResult,
  LootInput,
  LootResult,
  MagicItemResult,
  MITable,
  ResolvableCreatureResult,
  ResolvableEncounterResult,
  ResolvableLootResult,
  ResolvableMagicItem,
  Role,
  Tier,
  TreasureItem,
  VaultLootInput,
} from './types';
import { calculateBudget, calculateVaultBudget } from './budget';
import {
  MUNDANE_FINDS,
  TIER_CATEGORIES,
  COIN_MIX,
  HOARD_SPELL_COMPONENT_STEALS,
  crToDefaultTier,
} from './constants';
import { coinCountToDiceFormula, evalDiceFormula } from './dice';
import { cryptoRandom, logNormalVariance } from './random';
import { applyRichness } from './richness';
import {
  rollMagicItem,
  rollMagicItemResolvable,
  resolveAllRefs,
} from './roller';
import { generateGemBudget } from './gem-generator';
import { generateArtBudget } from './art-generator';
import { priceItem } from './value-score';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the adjusted category entries for a given budget.
 * Applies magic richness, then converts percentages into expected GP values.
 */
function resolveCategories(
  roleBudget: number,
  tier: Tier,
  settings: CampaignSettings,
): CategoryEntry[] {
  const base = TIER_CATEGORIES[tier];
  return applyRichness(base, settings.magicRichness);
}

/** Roll a probability check: returns true with the given probability (0-1). */
function probHit(probability: number): boolean {
  return cryptoRandom() < probability;
}

/**
 * Turn a gem-share gp amount into a list of gems using the continuous
 * log-scale budget algorithm (GEM-BUDGET-ALGORITHM.md §3, §7).
 *
 * Always generates gems from the full share — no probability gate.
 * If the share is too small for any gem to fit (< 1 gp), the generator
 * naturally produces nothing. The budget IS the gate.
 */
function gemsFromShare(share: number, _tier: Tier): TreasureItem[] {
  if (share <= 0) return [];
  return generateGemBudget(share);
}

/**
 * Turn an art-share gp amount into art objects (ART-SYSTEM-SPEC.md §4).
 *
 * Always generates art from the full share. If the share is below the
 * cheapest art object (~25 gp), nothing is produced — the art value
 * floor acts as a natural gate.
 */
function artFromShare(share: number, _tier: Tier): TreasureItem[] {
  if (share <= 0) return [];
  return generateArtBudget(share);
}

/**
 * Roll the per-hoard spell-component steal for a given tier.
 *
 * Returns a fixed-value TreasureItem (e.g. a 100 gp Pearl) when the tier's
 * probability hits, or null otherwise. Used by vault generation only — the
 * caller is responsible for deducting `item.value` from the coin budget so
 * the hoard's total gp doesn't inflate (GEM-SYSTEM-SPEC.md §6).
 */
function rollHoardSteal(tier: Tier): TreasureItem | null {
  const entry = HOARD_SPELL_COMPONENT_STEALS[tier];
  if (!entry || cryptoRandom() >= entry.probability) return null;
  return {
    name: entry.gem,
    baseValue: entry.value,
    value: entry.value,
    tableName: 'hoard-steal',
    // No valueScore/quality/improvable — steals are exact-value specimens.
  };
}

/** Pick a random mundane find. */
function randomMundaneFind(): string {
  return MUNDANE_FINDS[Math.floor(cryptoRandom() * MUNDANE_FINDS.length)];
}

const ZERO_DENOM: CoinDenom = { formula: '0', average: 0, rolled: 0 };

/** Compute the GP-equivalent average of a coin breakdown. */
function coinBreakdownToGp(coins: CoinBreakdown): number {
  return coins.cp.average / 100 + coins.sp.average / 10 + coins.gp.average + coins.pp.average * 10;
}

/** Convert a GP budget into a per-denomination coin breakdown. */
function gpToCoinBreakdown(gpBudget: number, tier: Tier): CoinBreakdown {
  if (gpBudget < 0.01) {
    return { cp: { ...ZERO_DENOM }, sp: { ...ZERO_DENOM }, gp: { ...ZERO_DENOM }, pp: { ...ZERO_DENOM } };
  }

  const mix = COIN_MIX[tier];

  function makeDenom(share: number, unitsPerGp: number): CoinDenom {
    const coinCount = gpBudget * share * unitsPerGp;
    if (coinCount < 1) return { ...ZERO_DENOM };
    const dice = coinCountToDiceFormula(coinCount);
    return { formula: dice.formula, average: dice.average, rolled: evalDiceFormula(dice.formula) };
  }

  return {
    cp: makeDenom(mix.cp, 100),
    sp: makeDenom(mix.sp, 10),
    gp: makeDenom(mix.gp, 1),
    pp: makeDenom(mix.pp, 0.1),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate loot for a single creature.
 *
 * 1. Calculate the role-adjusted budget.
 * 2. Resolve category breakdowns (with richness applied).
 * 3. For coins: build a dice formula from the coins budget, roll it.
 * 4. For gems/art: probability = categoryGP / unitValue; if hit, roll on table.
 * 5. For magic items: probability = categoryGP / avgValue; if hit, roll + price.
 * 6. If coins < 1gp: add a random mundane find instead.
 */
export function generateLoot(input: LootInput): LootResult {
  const { cr, tier, role, settings } = input;
  const { roleBudget } = calculateBudget(cr, tier, role, settings);

  const categories = resolveCategories(roleBudget, tier, settings);

  let coinGpBudget = 0;
  let gemGpShare = 0;
  let artGpShare = 0;
  const magicItems: MagicItemResult[] = [];
  const mundaneFinds: string[] = [];

  for (const cat of categories) {
    const categoryGp = (cat.pct / 100) * roleBudget;

    switch (cat.type) {
      case 'coins': {
        coinGpBudget = categoryGp;
        break;
      }

      case 'gems': {
        // Continuous-value system: accumulate total gem gp share here;
        // gems are rolled once after the loop via gemsFromShare().
        gemGpShare += categoryGp;
        break;
      }

      case 'art': {
        // Continuous-value system: accumulate total art gp share here.
        artGpShare += categoryGp;
        break;
      }

      case 'magic': {
        if (!cat.miTable || !cat.avgValue) break;
        // Independent variance per table (DMG CV ~1.85). Each table
        // rolls its own multiplier — a creature can get lucky on Table A
        // but unlucky on Table G, matching the DMG's independent outcomes.
        const variedGp = categoryGp * logNormalVariance(1.85);
        const probability = variedGp / cat.avgValue;
        // Single variance source: log-normal determines count directly.
        const count = Math.round(probability);
        for (let i = 0; i < count; i++) {
          const { name, source } = rollMagicItem(cat.miTable);
          const miResult: MagicItemResult = {
            name,
            source,
            table: cat.miTable,
          };
          if (settings.showValues) {
            const pricing = priceItem(cat.miTable);
            miResult.valueScore = pricing.valueScore;
            miResult.buyPrice = pricing.buyPrice;
            if (settings.showSalePrice) {
              miResult.salePrice = pricing.salePrice;
            }
          }
          magicItems.push(miResult);
        }
        break;
      }
    }
  }

  // Apply log-normal variance to gem/art shares (DMG CV ~0.75).
  const gems: TreasureItem[] = gemsFromShare(gemGpShare * logNormalVariance(0.75), tier);
  const artObjects: TreasureItem[] = artFromShare(artGpShare * logNormalVariance(0.75), tier);

  const coins = gpToCoinBreakdown(coinGpBudget, tier);

  // If coins are negligible and mundane finds are enabled, add flavor.
  if (coinBreakdownToGp(coins) < 1 && settings.showMundane) {
    mundaneFinds.push(randomMundaneFind());
  }

  return {
    coins,
    gems,
    artObjects,
    magicItems,
    mundaneFinds,
  };
}

/**
 * Generate loot for a full encounter.
 *
 * For each role, generates `counts[role]` creatures, labels them
 * "Minion 1", "Elite 1", "Boss 1", etc., and sums totals.
 */
export function generateEncounter(input: EncounterInput): EncounterResult {
  const { cr, tier: inputTier, autoTier, counts, settings } = input;
  const tier: Tier = autoTier ? crToDefaultTier(cr) : inputTier;

  const creatures: CreatureResult[] = [];
  const roles: Role[] = ['minion', 'elite', 'mini-boss', 'boss', 'vault'];

  for (const role of roles) {
    const count = counts[role] ?? 0;
    for (let i = 0; i < count; i++) {
      const loot = generateLoot({ cr, tier, role, settings });
      creatures.push({
        role,
        index: i + 1,
        loot,
      });
    }
  }

  const totalCoinsAvg = creatures.reduce(
    (sum, c) => sum + coinBreakdownToGp(c.loot.coins),
    0,
  );

  const totalItems = creatures.reduce(
    (sum, c) =>
      sum +
      c.loot.gems.length +
      c.loot.artObjects.length +
      c.loot.magicItems.length,
    0,
  );

  return { creatures, totalCoinsAvg, totalItems };
}

// ---------------------------------------------------------------------------
// V2: Mixed-CR encounters with resolvable magic items
// ---------------------------------------------------------------------------

/**
 * Generate loot for a single creature, returning ResolvableMagicItems
 * (segments parsed but not recursively resolved).
 *
 * When resolveImmediately is true, all refs are resolved at once (same as V1).
 */
export function generateLootResolvable(
  input: LootInput,
  resolveImmediately: boolean,
): ResolvableLootResult {
  const { cr, tier, role, settings } = input;
  const { roleBudget } = calculateBudget(cr, tier, role, settings);

  const categories = resolveCategories(roleBudget, tier, settings);

  let coinGpBudget = 0;
  let gemGpShare = 0;
  let artGpShare = 0;
  const magicItems: ResolvableMagicItem[] = [];
  const mundaneFinds: string[] = [];

  for (const cat of categories) {
    const categoryGp = (cat.pct / 100) * roleBudget;

    switch (cat.type) {
      case 'coins': {
        coinGpBudget = categoryGp;
        break;
      }

      case 'gems': {
        gemGpShare += categoryGp;
        break;
      }

      case 'art': {
        artGpShare += categoryGp;
        break;
      }

      case 'magic': {
        if (!cat.miTable || !cat.avgValue) break;
        const variedGp = categoryGp * logNormalVariance(1.85);
        const probability = variedGp / cat.avgValue;
        // Single variance source: log-normal determines count directly.
        const count = Math.round(probability);
        for (let i = 0; i < count; i++) {
          const item = rollMagicItemResolvable(cat.miTable);

          if (resolveImmediately) {
            const resolved = resolveAllRefs(item.segments);
            item.segments = resolved.segments;
            if (resolved.source) item.source = resolved.source;
            item.isFullyResolved = true;
          }

          if (settings.showValues) {
            const pricing = priceItem(cat.miTable);
            item.valueScore = pricing.valueScore;
            item.buyPrice = pricing.buyPrice;
            if (settings.showSalePrice) {
              item.salePrice = pricing.salePrice;
            }
          }
          magicItems.push(item);
        }
        break;
      }
    }
  }

  // Apply log-normal variance to gem/art shares (DMG CV ~0.75).
  const gems: TreasureItem[] = gemsFromShare(gemGpShare * logNormalVariance(0.75), tier);
  const artObjects: TreasureItem[] = artFromShare(artGpShare * logNormalVariance(0.75), tier);

  const coins = gpToCoinBreakdown(coinGpBudget, tier);

  if (coinBreakdownToGp(coins) < 1 && settings.showMundane) {
    mundaneFinds.push(randomMundaneFind());
  }

  return {
    coins,
    gems,
    artObjects,
    magicItems,
    mundaneFinds,
  };
}

/**
 * Generate loot for a vault hoard using fixed per-tier budgets.
 *
 * Uses VAULT_BUDGET_PER_TIER instead of CR-based budget calculation.
 * Category breakdown still uses TIER_CATEGORIES for the selected tier.
 */
export function generateVaultLootResolvable(
  input: VaultLootInput,
  resolveImmediately: boolean,
): ResolvableLootResult {
  const { tier, size, settings } = input;
  const roleBudget = calculateVaultBudget(tier, size, settings);

  const categories = resolveCategories(roleBudget, tier, settings);

  let coinGpBudget = 0;
  let gemGpShare = 0;
  let artGpShare = 0;
  const magicItems: ResolvableMagicItem[] = [];
  const mundaneFinds: string[] = [];

  for (const cat of categories) {
    const categoryGp = (cat.pct / 100) * roleBudget;

    switch (cat.type) {
      case 'coins': {
        coinGpBudget = categoryGp;
        break;
      }

      case 'gems': {
        gemGpShare += categoryGp;
        break;
      }

      case 'art': {
        artGpShare += categoryGp;
        break;
      }

      case 'magic': {
        if (!cat.miTable || !cat.avgValue) break;
        const variedGp = categoryGp * logNormalVariance(1.85);
        const probability = variedGp / cat.avgValue;
        // Single variance source: log-normal determines count directly.
        const count = Math.round(probability);
        for (let i = 0; i < count; i++) {
          const item = rollMagicItemResolvable(cat.miTable);

          if (resolveImmediately) {
            const resolved = resolveAllRefs(item.segments);
            item.segments = resolved.segments;
            if (resolved.source) item.source = resolved.source;
            item.isFullyResolved = true;
          }

          if (settings.showValues) {
            const pricing = priceItem(cat.miTable);
            item.valueScore = pricing.valueScore;
            item.buyPrice = pricing.buyPrice;
            if (settings.showSalePrice) {
              item.salePrice = pricing.salePrice;
            }
          }
          magicItems.push(item);
        }
        break;
      }
    }
  }

  // Apply log-normal variance to gem/art shares (DMG CV ~0.75).
  const gems: TreasureItem[] = gemsFromShare(gemGpShare * logNormalVariance(0.75), tier);
  const artObjects: TreasureItem[] = artFromShare(artGpShare * logNormalVariance(0.75), tier);

  // Hoard spell-component steal (vault-only). Deduct from the coin budget
  // before coin dice are built, so the total gp for the hoard stays stable.
  const steal = rollHoardSteal(tier);
  if (steal) {
    coinGpBudget = Math.max(0, coinGpBudget - steal.value);
    gems.push(steal);
  }

  const coins = gpToCoinBreakdown(coinGpBudget, tier);

  if (coinBreakdownToGp(coins) < 1 && settings.showMundane) {
    mundaneFinds.push(randomMundaneFind());
  }

  return {
    coins,
    gems,
    artObjects,
    magicItems,
    mundaneFinds,
  };
}

/**
 * Generate loot for a mixed-CR encounter (V2).
 *
 * Each creature group has its own CR and role. Vault is handled separately.
 * Tier is derived from the highest CR across all groups when autoTier is true.
 */
export function generateEncounterV2(input: EncounterInputV2, resolveImmediately: boolean): ResolvableEncounterResult {
  const { groups, vaultCount, vaultSize, tier: inputTier, autoTier, settings } = input;

  // Derive tier from the highest CR across creature groups
  const allCrs = groups.map((g) => g.cr);
  const maxCr = allCrs.length > 0 ? Math.max(...allCrs) : 0;
  const tier: Tier = autoTier ? crToDefaultTier(maxCr) : inputTier;

  const creatures: ResolvableCreatureResult[] = [];

  // Process creature groups (minion/elite/boss)
  for (const group of groups) {
    for (let i = 0; i < group.count; i++) {
      const loot = generateLootResolvable(
        { cr: group.cr, tier, role: group.role, settings },
        resolveImmediately,
      );
      creatures.push({
        role: group.role,
        index: i + 1,
        loot,
      });
    }
  }

  // Process vault hoards (fixed per-tier budget)
  for (let i = 0; i < vaultCount; i++) {
    const loot = generateVaultLootResolvable(
      { tier, size: vaultSize, settings },
      resolveImmediately,
    );
    creatures.push({
      role: 'vault',
      index: i + 1,
      loot,
    });
  }

  const totalCoinsAvg = creatures.reduce(
    (sum, c) => sum + coinBreakdownToGp(c.loot.coins),
    0,
  );

  const totalItems = creatures.reduce(
    (sum, c) =>
      sum +
      c.loot.gems.length +
      c.loot.artObjects.length +
      c.loot.magicItems.length,
    0,
  );

  return { creatures, totalCoinsAvg, totalItems };
}
