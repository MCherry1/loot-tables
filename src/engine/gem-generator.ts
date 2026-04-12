// ---------------------------------------------------------------------------
// Continuous-value gem generation
//
// Authoritative spec: GEM-SYSTEM-SPEC.md §1-§4, GEM-BUDGET-ALGORITHM.md §2-§3,
// GEM-DESCRIPTORS.md §1-§5.
//
// Entry points:
//   rollGemValue(min, max)     — single-value log-scale roll + binning
//   generateGemBudget(budget)  — spend a gp budget into a list of gems
//   generateGemDescriptor(...)  — assembles size/cut/quality/color/legendary
// ---------------------------------------------------------------------------

import type { GemQuality, GemSize, TreasureItem } from './types';
import {
  GEM_DEFINITIONS,
  GEM_CUTS,
  GEM_COLORS,
  LEGENDARY_ADJECTIVES,
  LEGENDARY_NOUNS,
  type GemDefinition,
} from '../data/gem-definitions';
import { cryptoRandom } from './random';
import { rollDice } from './dice';

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

/** Pick a random element from a list using crypto randomness. */
function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(cryptoRandom() * arr.length)];
}

/** Weighted pick across gem definitions. Returns null if list is empty. */
function weightedPickGem(eligible: GemDefinition[]): GemDefinition | null {
  if (eligible.length === 0) return null;
  const total = eligible.reduce((s, g) => s + g.weight, 0);
  let roll = cryptoRandom() * total;
  for (const gem of eligible) {
    roll -= gem.weight;
    if (roll <= 0) return gem;
  }
  return eligible[eligible.length - 1];
}

/**
 * Round `value` to a clean number appropriate to its scale
 * (GEM-BUDGET-ALGORITHM.md §3 binning rules).
 */
export function applyBinning(value: number): number {
  if (value < 10) return Math.max(1, Math.round(value));
  if (value < 100) return Math.round(value / 5) * 5;
  if (value < 1000) return Math.round(value / 10) * 10;
  if (value < 10000) return Math.round(value / 100) * 100;
  return Math.round(value / 1000) * 1000;
}

/**
 * Log-scale value roll between `min` and `max` inclusive (GEM-SYSTEM-SPEC.md §2).
 * Most rolls cluster near the low end — a diamond with range 10–100,000
 * usually lands 10–100 gp, occasionally 100–1,000, rarely higher.
 */
export function rollGemValue(min: number, max: number): number {
  const lo = Math.max(1, Math.min(min, max));
  const hi = Math.max(lo, max);
  if (lo === hi) return applyBinning(lo);
  const logMin = Math.log10(lo);
  const logMax = Math.log10(hi);
  const logVal = logMin + cryptoRandom() * (logMax - logMin);
  return applyBinning(Math.pow(10, logVal));
}

// ---------------------------------------------------------------------------
// Descriptor generation (GEM-DESCRIPTORS.md)
// ---------------------------------------------------------------------------

/** 2d4 quality labels per GEM-SYSTEM-SPEC.md §3 and GEM-DESCRIPTORS.md §2. */
export const GEM_QUALITY_LABELS: Record<number, GemQuality> = {
  2: 'Cloudy',
  3: 'Rough',
  4: 'Flawed',
  5: 'Standard',
  6: 'Fine',
  7: 'Brilliant',
  8: 'Flawless',
};

/** Cut-execution modifier by value score for faceted gems (GEM-DESCRIPTORS.md §2). */
const CUT_EXECUTION: Record<number, string> = {
  2: 'poorly cut',
  3: 'rough',
  4: 'asymmetric',
  5: '',
  6: 'well-proportioned',
  7: 'expertly cut',
  8: 'exquisite',
};

/** Natural-quality modifier by VS for organic gems (GEM-DESCRIPTORS.md §2). */
const ORGANIC_QUALITY: Record<number, string> = {
  2: 'misshapen',
  3: 'irregular',
  4: 'uneven',
  5: '',
  6: 'lustrous',
  7: 'luminous',
  8: 'perfect',
};

/** Size thresholds by log-percentile (GEM-DESCRIPTORS.md §1). */
const SIZE_THRESHOLDS: Array<{ pct: number; label: GemSize }> = [
  { pct: 0.10, label: 'Tiny' },
  { pct: 0.25, label: 'Small' },
  { pct: 0.45, label: 'Modest' },
  { pct: 0.60, label: 'Sizable' },
  { pct: 0.78, label: 'Large' },
  { pct: 0.92, label: 'Impressive' },
  { pct: 1.01, label: 'Massive' },
];

/** Compute the size percentile and label for a specimen. */
function computeSize(gem: GemDefinition, value: number, valueScore: number): GemSize {
  // rawSize = value / valueScore — the "material bulk" before quality factoring.
  const rawSize = Math.max(1, value / Math.max(1, valueScore));
  const logMin = Math.log10(Math.max(1, gem.min));
  const logMax = Math.log10(Math.max(gem.min + 1, gem.max));
  const logSize = Math.log10(Math.max(1, rawSize));
  let pct = (logSize - logMin) / (logMax - logMin);
  if (!Number.isFinite(pct)) pct = 0.5;
  pct = Math.max(0, Math.min(1, pct));
  for (const t of SIZE_THRESHOLDS) {
    if (pct <= t.pct) return t.label;
  }
  return 'Massive';
}

/** Pick a cut/shape, honoring special value-score rules. */
function pickCut(gem: GemDefinition, valueScore: number): string {
  const list = GEM_CUTS[gem.name];
  if (!list || list.length === 0) return '';

  // VS 2-3 faceted gems can come "rough" / uncut — fall through to normal picks.
  const pick = pickRandom(list);

  // Star cuts (ruby / sapphire / quartz) only appear at VS 6+.
  if ((gem.name === 'Ruby' || gem.name === 'Sapphire' || gem.name === 'Quartz')
      && pick.startsWith('star')) {
    if (valueScore < 6) return 'oval-cut';
  }
  return pick;
}

/** Pick a color variant, or '' if the gem has none. */
function pickColor(gem: GemDefinition, valueScore: number): string {
  const list = GEM_COLORS[gem.name];
  if (!list || list.length === 0) return '';
  // Premium color upgrades at high VS.
  if (valueScore >= 7) {
    if (gem.name === 'Ruby') return 'pigeon blood';
    if (gem.name === 'Sapphire') return 'padparadscha';
  }
  return pickRandom(list);
}

/** Assemble a legendary name for top-5% specimens. */
function rollLegendary(gem: GemDefinition): string {
  const adj = pickRandom(LEGENDARY_ADJECTIVES);
  const noun = pickRandom(LEGENDARY_NOUNS);
  return `The ${adj} ${noun}`;
}

/** Full descriptor pack for a single gem specimen. */
export interface GemDescriptors {
  size: GemSize;
  quality: GemQuality;
  cut: string;
  cutQuality: string;
  color: string;
  legendary?: string;
  description: string;
}

/**
 * Assemble the full descriptor pack for a rolled gem.
 * Produces a human-readable `description` along with individual fields.
 */
export function generateGemDescriptor(
  gem: GemDefinition,
  value: number,
  valueScore: number,
): GemDescriptors {
  const size = computeSize(gem, value, valueScore);
  const quality = GEM_QUALITY_LABELS[valueScore] ?? 'Standard';

  const cut = pickCut(gem, valueScore);
  const color = pickColor(gem, valueScore);

  const modifier = gem.organic ? ORGANIC_QUALITY[valueScore] ?? '' : CUT_EXECUTION[valueScore] ?? '';

  // Legendary on top 5% of gem's max value
  const legendary = value >= gem.max * 0.95 ? rollLegendary(gem) : undefined;

  // Assemble: "{Size} {modifier?} {cut?} {color?} {name}"
  // e.g. "Large but poorly cut oval-cut deep-red ruby"
  const parts: string[] = [size];
  if (modifier) {
    // Use "but" when size is high and quality is low (narrative tension).
    const highSize = size === 'Large' || size === 'Impressive' || size === 'Massive';
    const lowQuality = valueScore <= 4;
    if (highSize && lowQuality) parts.push('but');
    parts.push(modifier);
  }
  if (cut) parts.push(cut);
  // Skip color if the gem name already contains it (e.g., "Black Pearl")
  if (color && !gem.name.toLowerCase().includes(color.toLowerCase())) {
    parts.push(color);
  }
  parts.push(gem.name.toLowerCase());

  const baseDesc = parts.join(' ').replace(/\s+/g, ' ').trim();
  const description = legendary ? `${legendary} — ${baseDesc}` : baseDesc;

  return {
    size,
    quality,
    cut,
    cutQuality: modifier,
    color,
    legendary,
    description: description.charAt(0).toUpperCase() + description.slice(1),
  };
}

// ---------------------------------------------------------------------------
// Budget-based generation (GEM-BUDGET-ALGORITHM.md §3)
// ---------------------------------------------------------------------------

/**
 * Spend `budget` gp on gems, returning a list of TreasureItems.
 *
 * Loop: filter gems to those whose min ≤ remaining, weighted-pick one, roll
 * its value on log-scale (capped at remaining), roll 2d4 for value score,
 * generate descriptors, subtract, repeat until remaining < 1 gp or no
 * eligible gems remain. Always exhausts the budget (within 1 gp rounding).
 */
export function generateGemBudget(budget: number): TreasureItem[] {
  const out: TreasureItem[] = [];
  let remaining = budget;
  // Safety cap — shouldn't ever be needed but prevents runaway loops.
  let iterations = 0;
  const MAX_ITER = 500;

  while (remaining >= 1 && iterations < MAX_ITER) {
    iterations++;
    const eligible = GEM_DEFINITIONS.filter((g) => g.min <= remaining);
    if (eligible.length === 0) break;

    const gem = weightedPickGem(eligible);
    if (!gem) break;

    const cappedMax = Math.min(gem.max, remaining);
    // applyBinning may round UP past the cap at bin boundaries (e.g. raw 13 → 15
    // in the 10-99 band). Clamp to remaining so totals never overshoot the budget.
    const rawValue = rollGemValue(gem.min, cappedMax);
    const value = Math.min(rawValue, Math.floor(remaining));
    if (value < 1) break;
    const valueScore = rollDice(2, 4); // 2-8
    const desc = generateGemDescriptor(gem, value, valueScore);

    out.push({
      name: gem.name,
      baseValue: value,
      value,
      tableName: 'gem-budget',
      valueScore,
      quality: desc.quality,
      improvable: gem.improvable,
      size: desc.size,
      cut: desc.cut || undefined,
      cutQuality: desc.cutQuality || undefined,
      color: desc.color || undefined,
      legendary: desc.legendary,
      description: desc.description,
    });

    remaining -= value;
  }

  return out;
}
