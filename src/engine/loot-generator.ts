// ---------------------------------------------------------------------------
// Main loot generation orchestrator
// ---------------------------------------------------------------------------

import type {
  CampaignSettings,
  CategoryEntry,
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
} from './types';
import { calculateBudget } from './budget';
import {
  MUNDANE_FINDS,
  TIER_CATEGORIES,
  crToDefaultTier,
} from './constants';
import { gpToDiceFormula, evalDiceFormula } from './dice';
import { applyRichness } from './richness';
import {
  rollMagicItem,
  rollMagicItemResolvable,
  resolveAllRefs,
  segmentsToString,
  rollGem,
  rollArt,
} from './roller';
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
  return Math.random() < probability;
}

/** Pick a random mundane find. */
function randomMundaneFind(): string {
  return MUNDANE_FINDS[Math.floor(Math.random() * MUNDANE_FINDS.length)];
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

  let coinsFormula = '0';
  let coinsAverage = 0;
  const gems: TreasureItem[] = [];
  const artObjects: TreasureItem[] = [];
  const magicItems: MagicItemResult[] = [];
  const mundaneFinds: string[] = [];

  for (const cat of categories) {
    const categoryGp = (cat.pct / 100) * roleBudget;

    switch (cat.type) {
      case 'coins': {
        const diceInfo = gpToDiceFormula(categoryGp);
        coinsFormula = diceInfo.formula;
        coinsAverage = diceInfo.average;
        break;
      }

      case 'gems': {
        if (!cat.unitValue || !cat.tableName) break;
        const probability = categoryGp / cat.unitValue;
        // For probabilities >= 1, always drop at least one; fractional part is extra chance.
        const guaranteed = Math.floor(probability);
        const fractional = probability - guaranteed;
        const count = guaranteed + (probHit(fractional) ? 1 : 0);
        for (let i = 0; i < count; i++) {
          gems.push(rollGem(cat.tableName));
        }
        break;
      }

      case 'art': {
        if (!cat.unitValue || !cat.tableName) break;
        const probability = categoryGp / cat.unitValue;
        const guaranteed = Math.floor(probability);
        const fractional = probability - guaranteed;
        const count = guaranteed + (probHit(fractional) ? 1 : 0);
        for (let i = 0; i < count; i++) {
          artObjects.push(rollArt(cat.tableName));
        }
        break;
      }

      case 'magic': {
        if (!cat.miTable || !cat.avgValue) break;
        const probability = categoryGp / cat.avgValue;
        const guaranteed = Math.floor(probability);
        const fractional = probability - guaranteed;
        const count = guaranteed + (probHit(fractional) ? 1 : 0);
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

  // If coins are negligible and mundane finds are enabled, add flavor.
  if (coinsAverage < 1 && settings.showMundane) {
    mundaneFinds.push(randomMundaneFind());
  }

  return {
    coins: { formula: coinsFormula, average: coinsAverage },
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
  const roles: Role[] = ['minion', 'elite', 'boss', 'vault'];

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
    (sum, c) => sum + c.loot.coins.average,
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

  let coinsFormula = '0';
  let coinsAverage = 0;
  const gems: TreasureItem[] = [];
  const artObjects: TreasureItem[] = [];
  const magicItems: ResolvableMagicItem[] = [];
  const mundaneFinds: string[] = [];

  for (const cat of categories) {
    const categoryGp = (cat.pct / 100) * roleBudget;

    switch (cat.type) {
      case 'coins': {
        const diceInfo = gpToDiceFormula(categoryGp);
        coinsFormula = diceInfo.formula;
        coinsAverage = diceInfo.average;
        break;
      }

      case 'gems': {
        if (!cat.unitValue || !cat.tableName) break;
        const probability = categoryGp / cat.unitValue;
        const guaranteed = Math.floor(probability);
        const fractional = probability - guaranteed;
        const count = guaranteed + (probHit(fractional) ? 1 : 0);
        for (let i = 0; i < count; i++) {
          gems.push(rollGem(cat.tableName));
        }
        break;
      }

      case 'art': {
        if (!cat.unitValue || !cat.tableName) break;
        const probability = categoryGp / cat.unitValue;
        const guaranteed = Math.floor(probability);
        const fractional = probability - guaranteed;
        const count = guaranteed + (probHit(fractional) ? 1 : 0);
        for (let i = 0; i < count; i++) {
          artObjects.push(rollArt(cat.tableName));
        }
        break;
      }

      case 'magic': {
        if (!cat.miTable || !cat.avgValue) break;
        const probability = categoryGp / cat.avgValue;
        const guaranteed = Math.floor(probability);
        const fractional = probability - guaranteed;
        const count = guaranteed + (probHit(fractional) ? 1 : 0);
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

  if (coinsAverage < 1 && settings.showMundane) {
    mundaneFinds.push(randomMundaneFind());
  }

  return {
    coins: { formula: coinsFormula, average: coinsAverage },
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
  const { groups, vaultCount, vaultCr, tier: inputTier, autoTier, settings } = input;

  // Derive tier from the highest CR across all groups + vault
  const allCrs = groups.map((g) => g.cr);
  if (vaultCount > 0) allCrs.push(vaultCr);
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

  // Process vault hoards
  for (let i = 0; i < vaultCount; i++) {
    const loot = generateLootResolvable(
      { cr: vaultCr, tier, role: 'vault', settings },
      resolveImmediately,
    );
    creatures.push({
      role: 'vault',
      index: i + 1,
      loot,
    });
  }

  const totalCoinsAvg = creatures.reduce(
    (sum, c) => sum + c.loot.coins.average,
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
