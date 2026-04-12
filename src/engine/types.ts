/** Roles a creature can have in the treasure economy. */
export type Role = 'minion' | 'elite' | 'mini-boss' | 'boss' | 'vault';

/** Tiers of play (1-4), mapping to character-level bands. */
export type Tier = 1 | 2 | 3 | 4;

/** Magic item table letters (DMG Appendix). */
export type MITable = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';

/** Priority level for a single sourcebook. */
export type SourcePriority = 'off' | 'low' | 'normal' | 'high' | 'emphasis';

/** Bucketed "named item" tier derived from raw entry weight. */
export type ItemTier = 'low' | 'mid' | 'high' | 'veryHigh';

/** Per-sourcebook priority map keyed by acronym (e.g. "DMG"). Missing keys
 *  are treated as 'normal'. */
export type SourceSettings = Record<string, SourcePriority>;

/** User-chosen color theme preference. */
export type ThemePref = 'auto' | 'light' | 'dark';

/** D&D edition for item data and table assignments. */
export type Edition = '2014' | '2024';

/** Campaign-level settings that affect all loot generation. */
export interface CampaignSettings {
  /** Number of players in the party (1-8, default 4). */
  partySize: number;
  /** Multiplier for magic item frequency (0.5-1.5, default 1.0). */
  magicRichness: number;
  /** Whether to display gp values on results. */
  showValues: boolean;
  /** Whether to display sale (half) prices on results. */
  showSalePrice: boolean;
  /** Whether to include mundane flavor finds. */
  showMundane: boolean;
  /** Per-sourcebook priority overrides (missing keys = 'normal'). */
  sourceSettings: SourceSettings;
  /** Color theme preference. */
  theme: ThemePref;
  /**
   * Party level (1-20, default 5).
   * Used to auto-determine tier and compute progression multiplier.
   */
  partyLevel: number;
  /**
   * When true (default), tier is auto-determined from partyLevel.
   * When false, the user picks tier manually via tier buttons.
   */
  autoTier: boolean;
  /**
   * When true (default), treasure scales within a tier based on partyLevel
   * (×0.70 at tier start → ×1.30 at tier end, "Natural Progression").
   * When false, treasure is flat ×1.00 across the entire tier.
   */
  tierProgression: boolean;
  /**
   * @deprecated Use partyLevel + tierProgression instead.
   * Kept for backward compatibility with stored settings.
   * Computed from partyLevel when tierProgression is true.
   */
  aplAdjustment: number;
  /** D&D edition for item data (default '2014'). */
  edition: Edition;
  /** Enable 3D dice rolling animation. */
  dice3d: boolean;
  /** Whether to show item descriptions on result cards. */
  showItemDetails: boolean;
  /** When true, trade up lower denominations to maximize gold. */
  convertToGold: boolean;
  /** When true, divide coins among party members. */
  splitAmongParty: boolean;
}

/** Input for generating loot for a single creature. */
export interface LootInput {
  /** Challenge Rating (0-30). */
  cr: number;
  /** Tier of play. */
  tier: Tier;
  /** Creature's role in the economy. */
  role: Role;
  /** Campaign settings to apply. */
  settings: CampaignSettings;
}

/** Input for generating a vault hoard (tier-based, no CR). */
export interface VaultLootInput {
  /** Tier of play. */
  tier: Tier;
  /** Vault size (minor/standard/major). */
  size: import('./constants').VaultSize;
  /** Campaign settings to apply. */
  settings: CampaignSettings;
}

/** Input for generating loot for an entire encounter. */
export interface EncounterInput {
  /** Challenge Rating shared by all creatures (0-30). */
  cr: number;
  /** Tier of play. */
  tier: Tier;
  /** Whether to derive tier automatically from CR. */
  autoTier: boolean;
  /** How many creatures of each role are in the encounter. */
  counts: Record<Role, number>;
  /** Campaign settings to apply. */
  settings: CampaignSettings;
}

/** Gem quality label derived from the 2d4 value score (GEM-SYSTEM-SPEC.md §3). */
export type GemQuality =
  | 'Cloudy'
  | 'Rough'
  | 'Flawed'
  | 'Standard'
  | 'Fine'
  | 'Brilliant'
  | 'Flawless';

/** Gem size descriptor derived from `value / valueScore` percentile. */
export type GemSize =
  | 'Tiny'
  | 'Small'
  | 'Modest'
  | 'Sizable'
  | 'Large'
  | 'Impressive'
  | 'Massive';

/** A single gem or art object result. */
export interface TreasureItem {
  /** Display name (e.g. "Star rose quartz", "Gold locket"). */
  name: string;
  /**
   * Category/tier base reference:
   * - Legacy tier-bucket system: the sub-table's baseValue (e.g. 100 gp for Gems-4-500-gp).
   * - Continuous-value system: equal to `value` (no separate base concept).
   */
  baseValue: number;
  /** Actual value after all scoring / jitter / binning, in gp. */
  value: number;
  /** Reference table / source identifier (e.g. "Gems-3-125-gp", "gem-budget", "art-budget"). */
  tableName: string;
  /** 2d4 roll (2–8). Present for gems and art; absent for fixed-value hoard steals. */
  valueScore?: number;
  /** Quality label derived from valueScore. Gems only. */
  quality?: GemQuality;
  /** False for organic gems (Pearl, Black Pearl, Jet, Amber, Coral). Gems only. */
  improvable?: boolean;
  /** Size descriptor derived from value / valueScore percentile. Gems only (continuous system). */
  size?: GemSize;
  /** Cut or shape rolled from the gem's cut table (e.g. "oval-cut", "carved figurine"). Gems only. */
  cut?: string;
  /** Cut-quality modifier from valueScore (e.g. "poorly cut", "expertly cut"). Gems only. */
  cutQuality?: string;
  /** Color variant when the gem type has multiple (e.g. "deep green", "pigeon blood"). Gems only. */
  color?: string;
  /** Legendary name assigned when the specimen lands in the top 5% of its max value. Gems only. */
  legendary?: string;
  /** Pre-assembled display string produced by the descriptor generator. */
  description?: string;
  /** Art-object category (e.g. "Jewelry", "Textile"). Art only. */
  category?: string;
  /** Artisan tool associated with the category (for future crafting tab). Art only. */
  artisanTool?: string;
}

/** A single magic item result. */
export interface MagicItemResult {
  /** Item name (e.g. "Cloak of Protection"). */
  name: string;
  /** Sourcebook acronym (DMG, XGE, etc.). */
  source: string;
  /** Which MI table (A-I) produced this item. */
  table: MITable;
  /** Value score from 2d4 roll (2-8). */
  valueScore?: number;
  /** Buy price: valueScore x baseNumber. */
  buyPrice?: number;
  /** Sale price: floor(valueScore / 2) x baseNumber. */
  salePrice?: number;
}

/** A single denomination's dice formula and rolled result. */
export interface CoinDenom {
  formula: string;
  average: number;
  rolled: number;
}

/** Coin breakdown by denomination. */
export interface CoinBreakdown {
  cp: CoinDenom;
  sp: CoinDenom;
  gp: CoinDenom;
  pp: CoinDenom;
}

/** Complete loot result for a single creature. */
export interface LootResult {
  /** Coin award broken down by denomination. */
  coins: CoinBreakdown;
  /** Gem drops. */
  gems: TreasureItem[];
  /** Art object drops. */
  artObjects: TreasureItem[];
  /** Magic item drops. */
  magicItems: MagicItemResult[];
  /** Flavor text for mundane pocket finds. */
  mundaneFinds: string[];
}

/** One creature's results within an encounter. */
export interface CreatureResult {
  /** The creature's economy role. */
  role: Role;
  /** Ordinal index within its role group (e.g. "Minion 3" -> 3). */
  index: number;
  /** The generated loot. */
  loot: LootResult;
}

/** Aggregated results for an entire encounter. */
export interface EncounterResult {
  /** Per-creature breakdown. */
  creatures: CreatureResult[];
  /** Sum of all coin averages across every creature. */
  totalCoinsAvg: number;
  /** Total number of gems + art objects + magic items. */
  totalItems: number;
}

// ---------------------------------------------------------------------------
// V2: Mixed-CR encounters and step-by-step resolution
// ---------------------------------------------------------------------------

/** Creature roles for creature groups (vault handled separately). */
export type CreatureRole = 'minion' | 'elite' | 'mini-boss' | 'boss';

/** A creature group in a mixed-CR encounter. */
export interface CreatureGroup {
  /** Unique ID for React keys. */
  id: string;
  /** This group's Challenge Rating. */
  cr: number;
  /** Economy role (minion, elite, boss). */
  role: CreatureRole;
  /** How many creatures in this group (min 1). */
  count: number;
}

/** Input for the new mixed-CR encounter generator. */
export interface EncounterInputV2 {
  /** Creature groups, each with their own CR/role/count. */
  groups: CreatureGroup[];
  /** Number of vault hoards (separate from creature groups). */
  vaultCount: number;
  /** Vault size category (minor/standard/major). */
  vaultSize: import('./constants').VaultSize;
  /** Tier of play. */
  tier: Tier;
  /** Whether to derive tier from the highest CR. */
  autoTier: boolean;
  /** Campaign settings to apply. */
  settings: CampaignSettings;
}

/** A segment of partially-resolved item text. */
export type ItemSegment =
  | { type: 'text'; value: string }
  | { type: 'ref'; tableName: string; id: string };

/** A magic item that supports step-by-step resolution. */
export interface ResolvableMagicItem {
  /** Parsed segments (text + unresolved refs). */
  segments: ItemSegment[];
  /** Sourcebook acronym. */
  source: string;
  /** Which MI table (A-I) produced this item. */
  table: MITable;
  /** True when no ref segments remain. */
  isFullyResolved: boolean;
  /** Value score from 2d4 roll (2-8). */
  valueScore?: number;
  /** Buy price: valueScore x baseNumber. */
  buyPrice?: number;
  /** Sale price: floor(valueScore / 2) x baseNumber. */
  salePrice?: number;
}

/** Loot result with resolvable magic items for step-by-step mode. */
export interface ResolvableLootResult {
  coins: CoinBreakdown;
  gems: TreasureItem[];
  artObjects: TreasureItem[];
  magicItems: ResolvableMagicItem[];
  mundaneFinds: string[];
}

/** One creature's results with resolvable items. */
export interface ResolvableCreatureResult {
  role: Role;
  index: number;
  loot: ResolvableLootResult;
}

/** Aggregated results with resolvable items. */
export interface ResolvableEncounterResult {
  creatures: ResolvableCreatureResult[];
  totalCoinsAvg: number;
  totalItems: number;
}

// ---------------------------------------------------------------------------
// Internal engine types
// ---------------------------------------------------------------------------

/** A category entry in the tier breakdown (used internally by the engine). */
export interface CategoryEntry {
  /** What kind of treasure this category represents. */
  type: 'coins' | 'gems' | 'art' | 'magic';
  /** Percentage of total hoard value allocated to this category. */
  pct: number;
  /** For gems/art: gp value per unit (e.g. 50 for 50gp gems). */
  unitValue?: number;
  /** For gems/art: reference table name (e.g. "Gems-2-50-gp"). */
  tableName?: string;
  /** For magic items: which MI table to roll on. */
  miTable?: MITable;
  /** For magic items: average gp value of items from this table. */
  avgValue?: number;
}
