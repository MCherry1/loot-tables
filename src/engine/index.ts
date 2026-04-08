// ---------------------------------------------------------------------------
// Public API barrel export for the treasure economy engine
// ---------------------------------------------------------------------------

// Types
export type {
  CampaignSettings,
  CategoryEntry,
  CreatureGroup,
  CreatureResult,
  CreatureRole,
  EncounterInput,
  EncounterInputV2,
  EncounterResult,
  ItemSegment,
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

// Loot generation
export {
  generateLoot,
  generateEncounter,
  generateLootResolvable,
  generateEncounterV2,
} from './loot-generator';

// Value scoring and pricing
export {
  rollValueScore,
  calculateBuyPrice,
  calculateSalePrice,
  priceItem,
} from './value-score';

// Constants and mappings
export {
  DEFAULT_CAMPAIGN_SETTINGS,
  CR_TO_DEFAULT_TIER,
  crToDefaultTier,
} from './constants';

// Table rollers
export {
  rollMagicItem,
  rollMagicItemResolvable,
  rollGem,
  rollArt,
  parseSegments,
  resolveOneRef,
  resolveAllRefs,
  hasUnresolvedRefs,
  segmentsToString,
  weightedPick,
  ALL_TABLES,
} from './roller';

// Random
export { cryptoRandom } from './random';
