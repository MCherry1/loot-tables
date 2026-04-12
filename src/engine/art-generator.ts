// ---------------------------------------------------------------------------
// Continuous-value art object generation
//
// Authoritative spec: ART-SYSTEM-SPEC.md §2-§6 and GEM-BUDGET-ALGORITHM.md §3
// (art uses the same log-scale value rolling and budget loop as gems).
//
// Entry point:
//   generateArtBudget(budget) — spend a gp budget into TreasureItem[]
// ---------------------------------------------------------------------------

import type { TreasureItem } from './types';
import {
  ART_CATEGORIES,
  DMG_NAMED_ART,
  type ArtCategoryDefinition,
  type ScaledPool,
} from '../data/art-definitions';
import { cryptoRandom } from './random';
import { applyBinning, rollGemValue } from './gem-generator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(cryptoRandom() * arr.length)];
}

function weightedPickCategory(eligible: ArtCategoryDefinition[]): ArtCategoryDefinition | null {
  if (eligible.length === 0) return null;
  const total = eligible.reduce((s, c) => s + c.weight, 0);
  let roll = cryptoRandom() * total;
  for (const cat of eligible) {
    roll -= cat.weight;
    if (roll <= 0) return cat;
  }
  return eligible[eligible.length - 1];
}

/** Pick the tier from a scaled pool matching the given value. */
function scaledPick(pool: ScaledPool[], value: number): string {
  for (const tier of pool) {
    if (value <= tier.maxValue) {
      return pickRandom(tier.options);
    }
  }
  return pickRandom(pool[pool.length - 1].options);
}

// ---------------------------------------------------------------------------
// Descriptor assembly
// ---------------------------------------------------------------------------

export interface ArtDescriptors {
  material: string;
  form: string;
  detail: string;
  description: string;
  dmgNamed?: string;
}

/** Probability of pulling a verbatim DMG named item in the matching band. */
const DMG_NAMED_PROBABILITY = 0.10;

/**
 * Pick a DMG named item if one matches the category + value band.
 * "Match" = same category AND value within ±40% of the DMG face value.
 */
function tryDmgNamed(category: string, value: number): string | null {
  if (cryptoRandom() > DMG_NAMED_PROBABILITY) return null;
  const matches = DMG_NAMED_ART.filter(
    (d) => d.category === category && value >= d.value * 0.6 && value <= d.value * 1.4,
  );
  if (matches.length === 0) return null;
  return pickRandom(matches).description;
}

/**
 * Assemble a descriptor for an art piece of the given category at the
 * given value. Rolls material / form / detail from the category's pools,
 * with ~10% chance of yielding a verbatim DMG named item instead.
 */
export function generateArtDescriptor(
  category: ArtCategoryDefinition,
  value: number,
): ArtDescriptors {
  const dmgNamed = tryDmgNamed(category.name, value);
  if (dmgNamed) {
    return {
      material: '',
      form: '',
      detail: '',
      description: dmgNamed,
      dmgNamed,
    };
  }

  const material = scaledPick(category.materials, value);
  const form = pickRandom(category.forms);
  const detail = scaledPick(category.details, value);

  // Assemble: "<Material> <form> <detail>"
  const parts = [material, form, detail].filter(Boolean);
  const raw = parts.join(' ').replace(/\s+/g, ' ').trim();
  const description = raw.charAt(0).toUpperCase() + raw.slice(1);

  return { material, form, detail, description };
}

// ---------------------------------------------------------------------------
// Budget loop
// ---------------------------------------------------------------------------

/**
 * Spend `budget` gp on art objects, returning a list of TreasureItems.
 * Same log-scale + binning algorithm as gems, but picks from categories
 * and rolls descriptors instead of cuts/colors.
 */
export function generateArtBudget(budget: number): TreasureItem[] {
  const out: TreasureItem[] = [];
  let remaining = budget;
  let iterations = 0;
  const MAX_ITER = 500;

  while (remaining >= 1 && iterations < MAX_ITER) {
    iterations++;
    const eligible = ART_CATEGORIES.filter((c) => c.min <= remaining);
    if (eligible.length === 0) break;

    const cat = weightedPickCategory(eligible);
    if (!cat) break;

    const cappedMax = Math.min(cat.max, remaining);
    const raw = rollGemValue(cat.min, cappedMax);
    // Clamp to remaining so binning drift never overshoots the budget.
    const binned = applyBinning(raw);
    const value = Math.min(binned, Math.floor(remaining));
    if (value < 1) break;

    const desc = generateArtDescriptor(cat, value);

    out.push({
      name: desc.dmgNamed ?? `${cat.name} piece`,
      baseValue: value,
      value,
      tableName: 'art-budget',
      category: cat.name,
      artisanTool: cat.artisanTool,
      description: desc.description,
    });

    remaining -= value;
  }

  return out;
}
