import type {
  CampaignSettings,
  CategoryEntry,
  CreatureRole,
  ItemTier,
  MITable,
  Role,
  SourcePriority,
  Tier,
} from './types';

// ---------------------------------------------------------------------------
// XP by Challenge Rating
// ---------------------------------------------------------------------------

/** XP awarded per CR. Fractional CRs use string keys ("1/8", etc.). */
export const XP_BY_CR: Record<string, number> = {
  '0': 10,
  '1/8': 25,
  '1/4': 50,
  '1/2': 100,
  '1': 200,
  '2': 450,
  '3': 700,
  '4': 1100,
  '5': 1800,
  '6': 2300,
  '7': 2900,
  '8': 3900,
  '9': 5000,
  '10': 5900,
  '11': 7200,
  '12': 8400,
  '13': 10000,
  '14': 11500,
  '15': 13000,
  '16': 15000,
  '17': 18000,
  '18': 20000,
  '19': 22000,
  '20': 25000,
  '21': 33000,
  '22': 41000,
  '23': 50000,
  '24': 62000,
  '25': 75000,
  '26': 90000,
  '27': 105000,
  '28': 120000,
  '29': 135000,
  '30': 155000,
} as const;

// ---------------------------------------------------------------------------
// Gold-per-XP conversion rate by tier
// ---------------------------------------------------------------------------

/** GP earned per 1 XP, indexed by tier of play. */
export const GP_PER_XP: Record<Tier, number> = {
  1: 0.29,
  2: 0.5806,
  3: 2.4257,
  4: 8.8814,
} as const;

// ---------------------------------------------------------------------------
// Fixed vault hoard budget per tier (DMG average hoard values)
// ---------------------------------------------------------------------------

/** Average total hoard value in GP per tier, derived from DMG hoard tables. */
export const VAULT_BUDGET_PER_TIER: Record<Tier, number> = {
  1: 1077,
  2: 7419,
  3: 105922,
  4: 710512,
} as const;

/** Vault size categories for flexible hoard scaling. */
export type VaultSize = 'minor' | 'standard' | 'major';

/** Multiplier applied to the base vault budget per size category. */
export const VAULT_SIZE_MULTIPLIER: Record<VaultSize, number> = {
  minor: 0.5,
  standard: 1.0,
  major: 2.0,
} as const;

// ---------------------------------------------------------------------------
// Role multipliers (fraction of per-creature budget)
// ---------------------------------------------------------------------------

/** Raw role weights (~3× geometric steps). */
export const ROLE_RAW_WEIGHT: Record<CreatureRole, number> = {
  minion: 1,
  elite: 3,
  'mini-boss': 9,
  boss: 27,
} as const;

/** Pre-computed role multipliers. */
export const ROLE_MULTIPLIER: Record<CreatureRole, number> = {
  minion: 0.10,    // pocket change
  elite: 0.30,     // personal belongings
  'mini-boss': 0.90, // well-equipped
  boss: 2.70,      // the big score
} as const;

/** Default role ratios for CampaignSettings (includes vault). */
export const DEFAULT_ROLE_RATIOS: Record<Role, number> = {
  minion: 0.10,
  elite: 0.30,
  'mini-boss': 0.90,
  boss: 2.70,
  vault: 1.00,
} as const;

/**
 * Compute role multipliers from a concentration parameter.
 * @deprecated Use ROLE_MULTIPLIER directly. Kept for UI backward compatibility.
 */
export function computeRoleMultipliers(concentration: number): Record<Role, number> {
  // New system uses fixed 3× steps, concentration parameter is ignored.
  // TODO: remove once CampaignSettings UI is updated.
  return { ...ROLE_MULTIPLIER, vault: 1.0 };
}

// ---------------------------------------------------------------------------
// Magic-item base numbers and average values
// ---------------------------------------------------------------------------

/** Base multiplier number for each MI table (used in buy/sale price calc). */
export const BASE_NUMBERS: Record<MITable, number> = {
  A: 10,
  B: 25,
  F: 100,
  C: 250,
  G: 1000,
  D: 2500,
  H: 10000,
  E: 25000,
  I: 100000,
} as const;

/** Average gp value of items from each MI table (Base x 5). */
export const MI_AVG_VALUES: Record<MITable, number> = {
  A: 50,
  B: 125,
  F: 500,
  C: 1250,
  G: 5000,
  D: 12500,
  H: 50000,
  E: 125000,
  I: 500000,
} as const;

// ---------------------------------------------------------------------------
// CR → default tier mapping
// ---------------------------------------------------------------------------

/** Derive the default tier of play from a creature's CR. */
export function crToDefaultTier(cr: number): Tier {
  if (cr <= 5) return 1;
  if (cr <= 10) return 2;
  if (cr <= 15) return 3;
  return 4;
}

/**
 * Lookup table version: maps each integer CR (0-30) to its default tier.
 * For fractional CRs (0, 1/8, 1/4, 1/2) use tier 1.
 */
export const CR_TO_DEFAULT_TIER: Record<number, Tier> = Object.fromEntries(
  Array.from({ length: 31 }, (_, cr) => [cr, crToDefaultTier(cr)])
) as Record<number, Tier>;

// ---------------------------------------------------------------------------
// Tier category breakdowns
// ---------------------------------------------------------------------------

/** Per-tier breakdown of how total hoard value is distributed across categories. */
export const TIER_CATEGORIES: Record<Tier, CategoryEntry[]> = {
  // --- Tier 1 ---
  1: [
    { type: 'coins', pct: 18.2 },
    { type: 'gems', pct: 1.7, unitValue: 25, tableName: 'Gems-1-25-gp' },
    { type: 'art', pct: 3.9, unitValue: 100, tableName: 'Art-1-100-gp' },
    { type: 'gems', pct: 11.0, unitValue: 50, tableName: 'Gems-2-50-gp' },
    { type: 'magic', pct: 3.9, miTable: 'A', avgValue: 50 },
    { type: 'magic', pct: 4.4, miTable: 'B', avgValue: 125 },
    { type: 'magic', pct: 29.0, miTable: 'C', avgValue: 1250 },
    { type: 'magic', pct: 13.9, miTable: 'F', avgValue: 500 },
    { type: 'magic', pct: 13.9, miTable: 'G', avgValue: 5000 },
  ],

  // --- Tier 2 ---
  2: [
    { type: 'coins', pct: 52.0 },
    { type: 'art', pct: 0.4, unitValue: 100, tableName: 'Art-1-100-gp' },
    { type: 'gems', pct: 1.7, unitValue: 50, tableName: 'Gems-2-50-gp' },
    { type: 'gems', pct: 3.5, unitValue: 125, tableName: 'Gems-3-125-gp' },
    { type: 'art', pct: 3.9, unitValue: 500, tableName: 'Art-2-500-gp' },
    { type: 'magic', pct: 0.4, miTable: 'A', avgValue: 50 },
    { type: 'magic', pct: 0.8, miTable: 'B', avgValue: 125 },
    { type: 'magic', pct: 4.6, miTable: 'C', avgValue: 1250 },
    { type: 'magic', pct: 10.1, miTable: 'D', avgValue: 12500 },
    { type: 'magic', pct: 2.4, miTable: 'F', avgValue: 500 },
    { type: 'magic', pct: 6.7, miTable: 'G', avgValue: 5000 },
    { type: 'magic', pct: 13.5, miTable: 'H', avgValue: 50000 },
  ],

  // --- Tier 3 ---
  3: [
    { type: 'coins', pct: 29.7 },
    { type: 'art', pct: 0.3, unitValue: 500, tableName: 'Art-2-500-gp' },
    { type: 'gems', pct: 1.1, unitValue: 500, tableName: 'Gems-4-500-gp' },
    { type: 'art', pct: 0.9, unitValue: 1250, tableName: 'Art-3-1250-gp' },
    { type: 'gems', pct: 2.3, unitValue: 1250, tableName: 'Gems-5-1250-gp' },
    { type: 'magic', pct: 0.05, miTable: 'A', avgValue: 50 },
    { type: 'magic', pct: 0.1, miTable: 'B', avgValue: 125 },
    { type: 'magic', pct: 0.9, miTable: 'C', avgValue: 1250 },
    { type: 'magic', pct: 4.7, miTable: 'D', avgValue: 12500 },
    { type: 'magic', pct: 9.4, miTable: 'E', avgValue: 125000 },
    { type: 'magic', pct: 0.05, miTable: 'F', avgValue: 500 },
    { type: 'magic', pct: 0.9, miTable: 'G', avgValue: 5000 },
    { type: 'magic', pct: 11.8, miTable: 'H', avgValue: 50000 },
    { type: 'magic', pct: 37.8, miTable: 'I', avgValue: 500000 },
  ],

  // --- Tier 4 ---
  4: [
    { type: 'coins', pct: 45.3 },
    { type: 'gems', pct: 0.4, unitValue: 1250, tableName: 'Gems-5-1250-gp' },
    { type: 'art', pct: 0.5, unitValue: 5000, tableName: 'Art-4-5000-gp' },
    { type: 'gems', pct: 0.8, unitValue: 5000, tableName: 'Gems-6-5000-gp' },
    { type: 'art', pct: 0.6, unitValue: 12500, tableName: 'Art-5-12500-gp' },
    { type: 'magic', pct: 0.1, miTable: 'C', avgValue: 1250 },
    { type: 'magic', pct: 2.0, miTable: 'D', avgValue: 12500 },
    { type: 'magic', pct: 13.5, miTable: 'E', avgValue: 125000 },
    { type: 'magic', pct: 0.1, miTable: 'G', avgValue: 5000 },
    { type: 'magic', pct: 1.6, miTable: 'H', avgValue: 50000 },
    { type: 'magic', pct: 35.2, miTable: 'I', avgValue: 500000 },
  ],
} as const;

// ---------------------------------------------------------------------------
// DMG Hoard Table Variance Profile (100,000 Monte Carlo simulations)
// ---------------------------------------------------------------------------
//
// These values capture the actual variance in the DMG's hoard tables.
// Our per-creature fractional system should produce similar spread.
//
// Key insight: the DMG's variance comes from a two-layer structure:
//   1. Coins = guaranteed floor (low variance, ±30% from dice)
//   2. d100 "slot machine" = rare jackpots (magic items worth 10-100× the coins)
// The median is always below the mean because most rolls are "normal"
// and rare jackpots pull the average up. This right-skew is intentional
// and creates the excitement of treasure hunting.

export interface VarianceProfile {
  mean: number;
  median: number;
  /** Coefficient of variation (stddev / mean). Higher = more variance. */
  cv: number;
  /** 90th percentile / 10th percentile. The "typical session spread." */
  spread9010: number;
  /** Percentiles in GP for a single DMG hoard roll. */
  percentiles: { p5: number; p10: number; p25: number; p50: number; p75: number; p90: number; p95: number; p99: number };
}

export const DMG_VARIANCE: Record<Tier, VarianceProfile> = {
  1: {
    mean: 990, median: 569, cv: 1.21, spread9010: 12.1,
    percentiles: { p5: 209, p10: 248, p25: 346, p50: 569, p75: 934, p90: 2997, p95: 3544, p99: 5931 },
  },
  2: {
    mean: 6807, median: 5105, cv: 0.76, spread9010: 3.2,
    percentiles: { p5: 3558, p10: 3856, p25: 4404, p50: 5105, p75: 6208, p90: 12253, p95: 18160, p99: 32507 },
  },
  3: {
    mean: 89442, median: 46750, cv: 1.08, spread9010: 5.6,
    percentiles: { p5: 29375, p10: 32125, p25: 37600, p50: 46750, p75: 90000, p90: 179000, p95: 367250, p99: 421500 },
  },
  4: {
    mean: 715751, median: 557000, cv: 0.56, spread9010: 4.2,
    percentiles: { p5: 305000, p10: 332750, p25: 389750, p50: 557000, p75: 994500, p90: 1406000, p95: 1526000, p99: 1610500 },
  },
} as const;

// ---------------------------------------------------------------------------
// Mundane finds (flavor items with no monetary value)
// ---------------------------------------------------------------------------

/** Random mundane pocket finds to add flavor to creature loot. */
export const MUNDANE_FINDS: readonly string[] = [
  'A half-eaten apple',
  'A wooden comb',
  'A crumpled letter (unreadable)',
  'A clay mug',
  'A tallow candle stub',
  '3 bent nails',
  'A ball of twine',
  'A wooden holy symbol',
  "A rabbit's foot",
  "A child's doll",
  'A smooth river stone',
  'A hunk of bread',
  'A wedge of cheese',
  'A strip of dried meat',
  'A tin flask (empty)',
  'A pair of worn dice',
  'A scrap of cloth',
  'A broken buckle',
  'A bent spoon',
  'A whittling knife (dull)',
  'A charcoal stub',
  'A bird feather',
  'A cork',
  'A copper button',
  'A gnawed bone',
  'A folded handkerchief',
  'A wooden whistle (cracked)',
  'A leather coin purse (empty)',
  'A tarnished ring (worthless)',
  'A pressed flower',
] as const;

// ---------------------------------------------------------------------------
// Default campaign settings
// ---------------------------------------------------------------------------

/** Sensible defaults for a standard 5e campaign. */
export const DEFAULT_CAMPAIGN_SETTINGS: CampaignSettings = {
  partySize: 4,
  magicRichness: 1.0,
  showValues: true,
  showSalePrice: false,
  showMundane: true,
  sourceSettings: {},
  theme: 'auto',
  aplAdjustment: 1.0,
  edition: '2014',
  dice3d: false,
  showItemDetails: false,
};

// ---------------------------------------------------------------------------
// Sourcebook priority system (STEPPER-DESIGN.md §Sources)
// ---------------------------------------------------------------------------

/** Per-sourcebook multiplier applied to every item from that source. */
export const PRIORITY_MULTIPLIER: Record<SourcePriority, number> = {
  off: 0,
  low: 0.5,
  normal: 1.0,
  high: 1.5,
  emphasis: 2.0,
} as const;

/** Bucketed tier values mapped from each item's raw weight. */
export const TIER_VALUE: Record<ItemTier, number> = {
  low: 1.5,
  mid: 3.5,
  high: 5.5,
  veryHigh: 9.0,
} as const;

/**
 * Bucket a raw item weight into a named tier.
 *
 * Derived from the raw-weight distribution in the data: ~368 entries at
 * weight 1, ~251 at 2, ~210 at 3, ~136 at 4, then a thin tail at 5+.
 */
export function weightToTier(raw: number): ItemTier {
  if (raw <= 1) return 'low';
  if (raw === 2) return 'mid';
  if (raw <= 4) return 'high';
  return 'veryHigh';
}

/**
 * Source acronym groupings for the Settings UI (STEPPER-DESIGN.md §Sources).
 * Must stay in sync with the `group` field in sourcebooks.ts.
 * Acronyms present in the data but not listed here fall into an "Other" group.
 */
export const SOURCE_GROUPS = {
  core: ['DMG', 'XGE', 'TCE', 'FTD', 'BGG', 'BMT', 'MTF', 'VGM'],
  settings: ['ERLW', 'EGW', 'MOT', 'GGR', 'SCC', 'AAG', 'VRGR', 'SatO', 'DSotDQ'],
  adventures: [
    'HotDQ', 'RoT', 'PotA', 'CoS', 'SKT', 'TftYP', 'ToA',
    'WDH', 'WDMM', 'GoS', 'BGDIA', 'IDRotF', 'CM', 'WBtW',
    'CRCotN', 'KftGV', 'PaBTSO', 'CoA', 'OotA', 'LMoP',
    'LLK', 'AI', 'IMR', 'VEoR', 'QftIS', 'DitLCoT', 'JttRC',
  ],
  digital: [
    'HAT-LMI', 'RoTOS', 'XMtS', 'SDW', 'DC', 'BAM', 'TTP',
    'OGA', 'HftT', 'AitFR-AVT', 'AitFR-THP', 'NRH-AT',
    'NRH-TLT', 'RMBRE', 'AZfyT', 'MCV2DC',
  ],
  thirdparty: ['ExE', 'TDCSR'],
} as const;

/** Labels for source groups, keyed by group name. */
export const SOURCE_GROUP_LABELS: Record<keyof typeof SOURCE_GROUPS, string> = {
  core: 'Core Supplements',
  settings: 'Campaign Settings',
  adventures: 'Adventures',
  digital: 'Digital / Supplemental',
  thirdparty: 'Third Party',
} as const;
