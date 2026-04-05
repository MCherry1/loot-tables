import type {
  CampaignSettings,
  CategoryEntry,
  MITable,
  Role,
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
// Role ratios (fraction of per-creature hoard value)
// ---------------------------------------------------------------------------

/** Default fraction of total hoard value that each role receives. */
export const DEFAULT_ROLE_RATIOS: Record<Role, number> = {
  minion: 0.10,
  elite: 0.30,
  boss: 0.60,
  vault: 1.00,
} as const;

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
  if (cr <= 4) return 1;
  if (cr <= 10) return 2;
  if (cr <= 16) return 3;
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
  roleRatios: { ...DEFAULT_ROLE_RATIOS },
  showValues: true,
  showSalePrice: false,
  showMundane: true,
} as const;
