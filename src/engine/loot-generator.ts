// ---------------------------------------------------------------------------
// Main loot generation orchestrator — Independent Pool Model
// ---------------------------------------------------------------------------
//
// Each creature's loot is computed from four independent pools, each derived
// directly from XP:
//
//   Coins:  base × COINS_PER_XP[tier]                                  → dice formula → coins
//   Gems:   base × GEMS_PER_XP[tier]  × logNormalVariance(0.75)        → gem generator
//   Art:    base × ART_PER_XP[tier]   × logNormalVariance(0.75)        → art generator
//   Magic:  base × MI_PER_XP[tier][table] × richness × logNormal(1.85) → probHit → roll item
//
// where base = XP × roleMult × tierProg × partySizeScalar.
//
// The pools do not interact. Tuning one does not affect the others, except
// that magicRichness steals from / donates to the coin pool to keep total
// expected value stable.
// ---------------------------------------------------------------------------

import type {
  CampaignSettings,
  CoinBreakdown,
  CoinDenom,
  EncounterInputV2,
  LootInput,
  MITable,
  ResolvableCreatureResult,
  ResolvableEncounterResult,
  ResolvableLootResult,
  ResolvableMagicItem,
  Tier,
  TreasureItem,
  VaultLootInput,
} from './types';
import { calculatePoolBase, calculateVaultBudget } from './budget';
import {
  MUNDANE_FINDS,
  COINS_PER_XP,
  GEMS_PER_XP,
  ART_PER_XP,
  MI_PER_XP,
  GP_PER_XP,
  COIN_MIX,
  HOARD_SPELL_COMPONENT_STEALS,
  crToDefaultTier,
} from './constants';
import { coinCountToDiceFormula, evalDiceFormula } from './dice';
import { cryptoRandom, logNormalVariance } from './random';
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

/** Roll a probability check: returns true with the given probability (0-1). */
function probHit(probability: number): boolean {
  return cryptoRandom() < probability;
}

/**
 * Turn a gem budget into a list of gems using the continuous log-scale
 * algorithm (GEM-BUDGET-ALGORITHM.md §3, §7).
 *
 * If the budget is too small for any gem (< 1 gp), naturally produces nothing.
 */
function gemsFromBudget(budget: number): TreasureItem[] {
  if (budget <= 0) return [];
  return generateGemBudget(budget);
}

/**
 * Turn an art budget into art objects (ART-SYSTEM-SPEC.md §4).
 *
 * If the budget is below the cheapest art object (~25 gp), nothing is produced.
 */
function artFromBudget(budget: number): TreasureItem[] {
  if (budget <= 0) return [];
  return generateArtBudget(budget);
}

/**
 * Roll the per-hoard spell-component steal for a given tier.
 * Returns a fixed-value TreasureItem or null. Vault-only.
 */
function rollHoardSteal(tier: Tier): TreasureItem | null {
  const entry = HOARD_SPELL_COMPONENT_STEALS[tier];
  if (!entry || cryptoRandom() >= entry.probability) return null;
  return {
    name: entry.gem,
    baseValue: entry.value,
    value: entry.value,
    tableName: 'hoard-steal',
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

/** Convert a GP budget into a per-denomination coin breakdown with dice. */
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
// Core pool generation (shared by V1, V2, and vault)
// ---------------------------------------------------------------------------

/**
 * Generate loot from the four independent pools.
 *
 * @param base - Pool base = XP × roleMult × tierProg × partySizeScalar.
 * @param tier - Tier of play.
 * @param settings - Campaign settings.
 * @param rollMI - Callback to produce a magic item (V1 or V2 style).
 * @returns The raw coin GP budget and generated treasure arrays.
 */
function generateFromPools<MI>(
  base: number,
  tier: Tier,
  settings: CampaignSettings,
  rollMI: (table: MITable) => MI,
): { coinBudget: number; gems: TreasureItem[]; artObjects: TreasureItem[]; magicItems: MI[] } {
  const richness = settings.magicRichness;

  // ---- Coins ----
  // base × COINS_PER_XP[tier] — coins are independent of MI richness.
  const coinBudget = base * COINS_PER_XP[tier];

  // ---- Gems ----
  // base × GEMS_PER_XP[tier] × logNormalVariance(0.75)
  const gemBudget = base * GEMS_PER_XP[tier] * logNormalVariance(0.75);
  const gems = gemsFromBudget(gemBudget);

  // ---- Art ----
  // base × ART_PER_XP[tier] × logNormalVariance(0.75)
  const artBudget = base * ART_PER_XP[tier] * logNormalVariance(0.75);
  const artObjects = artFromBudget(artBudget);

  // ---- Magic Items ----
  // For each table: base × MI_PER_XP[tier][table] × richness × logNormal(1.85) → count → roll
  const magicItems: MI[] = [];
  const tables = MI_PER_XP[tier];
  for (const [table, rate] of Object.entries(tables)) {
    const expected = base * rate * richness * logNormalVariance(1.85);
    // Floor for guaranteed items, remainder for probHit on one more.
    const guaranteed = Math.floor(expected);
    const remainder = expected - guaranteed;
    const count = guaranteed + (probHit(remainder) ? 1 : 0);
    for (let i = 0; i < count; i++) {
      magicItems.push(rollMI(table as MITable));
    }
  }

  return { coinBudget, gems, artObjects, magicItems };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate loot for a single creature, returning ResolvableMagicItems
 * (segments parsed but optionally not yet recursively resolved).
 */
export function generateLootResolvable(
  input: LootInput,
  resolveImmediately: boolean,
): ResolvableLootResult {
  const { cr, tier, role, settings } = input;
  const pool = calculatePoolBase(cr, tier, role, settings);

  const { coinBudget, gems, artObjects, magicItems } = generateFromPools(
    pool.base,
    tier,
    settings,
    (table: MITable): ResolvableMagicItem => {
      const item = rollMagicItemResolvable(table);

      if (resolveImmediately) {
        const resolved = resolveAllRefs(item.segments);
        item.segments = resolved.segments;
        if (resolved.source) item.source = resolved.source;
        item.isFullyResolved = true;
      }

      if (settings.showValues) {
        const pricing = priceItem(table);
        item.valueScore = pricing.valueScore;
        item.buyPrice = pricing.buyPrice;
        if (settings.showSalePrice) {
          item.salePrice = pricing.salePrice;
        }
      }
      return item;
    },
  );

  const coins = gpToCoinBreakdown(coinBudget, tier);
  const mundaneFinds: string[] = [];
  if (coinBreakdownToGp(coins) < 1 && settings.showMundane) {
    mundaneFinds.push(randomMundaneFind());
  }

  return { coins, gems, artObjects, magicItems, mundaneFinds };
}

/**
 * Generate loot for a vault hoard using fixed per-tier budgets.
 *
 * Derives a "virtual base" from the vault budget so the same four
 * independent pools apply with correct proportions:
 *   vaultBase = vaultBudget / GP_PER_XP[tier]
 */
export function generateVaultLootResolvable(
  input: VaultLootInput,
  resolveImmediately: boolean,
): ResolvableLootResult {
  const { tier, size, settings } = input;
  const vaultBudget = calculateVaultBudget(tier, size, settings);

  // Convert total GP budget into a virtual base that the pools can use.
  // Since sum(pool_per_xp) ≈ GP_PER_XP, this preserves the total.
  const vaultBase = vaultBudget / GP_PER_XP[tier];

  const { coinBudget, gems, artObjects, magicItems } = generateFromPools(
    vaultBase,
    tier,
    settings,
    (table: MITable): ResolvableMagicItem => {
      const item = rollMagicItemResolvable(table);

      if (resolveImmediately) {
        const resolved = resolveAllRefs(item.segments);
        item.segments = resolved.segments;
        if (resolved.source) item.source = resolved.source;
        item.isFullyResolved = true;
      }

      if (settings.showValues) {
        const pricing = priceItem(table);
        item.valueScore = pricing.valueScore;
        item.buyPrice = pricing.buyPrice;
        if (settings.showSalePrice) {
          item.salePrice = pricing.salePrice;
        }
      }
      return item;
    },
  );

  // Hoard spell-component steal (vault-only). Deduct from coin budget
  // so total GP stays stable (GEM-SYSTEM-SPEC.md §6).
  let adjustedCoinBudget = coinBudget;
  const steal = rollHoardSteal(tier);
  if (steal) {
    adjustedCoinBudget = Math.max(0, adjustedCoinBudget - steal.value);
    gems.push(steal);
  }

  const coins = gpToCoinBreakdown(adjustedCoinBudget, tier);
  const mundaneFinds: string[] = [];
  if (coinBreakdownToGp(coins) < 1 && settings.showMundane) {
    mundaneFinds.push(randomMundaneFind());
  }

  return { coins, gems, artObjects, magicItems, mundaneFinds };
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
