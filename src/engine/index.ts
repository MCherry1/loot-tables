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
  ItemTier,
  LootInput,
  LootResult,
  MagicItemResult,
  MITable,
  ResolvableCreatureResult,
  ResolvableEncounterResult,
  ResolvableLootResult,
  ResolvableMagicItem,
  Role,
  SourcePriority,
  SourceSettings,
  ThemePref,
  Tier,
  TreasureItem,
  VaultLootInput,
} from './types';

// Loot generation
export {
  generateLoot,
  generateEncounter,
  generateLootResolvable,
  generateVaultLootResolvable,
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
  VAULT_BUDGET_PER_TIER,
  VAULT_SIZE_MULTIPLIER,
  PRIORITY_MULTIPLIER,
  TIER_VALUE,
  SOURCE_GROUPS,
  SOURCE_GROUP_LABELS,
  weightToTier,
} from './constants';
export type { VaultSize } from './constants';

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
  getEffectiveWeight,
  getFilteredEntries,
  getBookItemCounts,
  getBookDampFactors,
  ALL_TABLES,
} from './roller';

// Random
export { cryptoRandom } from './random';
