/** Roles a creature can have in the treasure economy. */
export type Role = 'minion' | 'elite' | 'boss' | 'vault';

/** Tiers of play (1-4), mapping to character-level bands. */
export type Tier = 1 | 2 | 3 | 4;

/** Magic item table letters (DMG Appendix). */
export type MITable = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';

/** Campaign-level settings that affect all loot generation. */
export interface CampaignSettings {
  /** Number of players in the party (1-8, default 4). */
  partySize: number;
  /** Multiplier for magic item frequency (0.5-1.5, default 1.0). */
  magicRichness: number;
  /** Fraction of total hoard value assigned to each creature role. */
  roleRatios: Record<Role, number>;
  /** Whether to display gp values on results. */
  showValues: boolean;
  /** Whether to display sale (half) prices on results. */
  showSalePrice: boolean;
  /** Whether to include mundane flavor finds. */
  showMundane: boolean;
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

/** A single gem or art object result. */
export interface TreasureItem {
  /** Display name (e.g. "Star rose quartz"). */
  name: string;
  /** The tier's base gp value for this category. */
  baseValue: number;
  /** Reference table name (e.g. "Gems-3-125-gp"). */
  tableName: string;
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

/** Complete loot result for a single creature. */
export interface LootResult {
  /** Coin award as a dice formula and its expected (average) value. */
  coins: { formula: string; average: number };
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
