// ---------------------------------------------------------------------------
// Public API barrel export for the treasure economy engine
// ---------------------------------------------------------------------------

// Types
export type {
  CampaignSettings,
  CategoryEntry,
  CoinBreakdown,
  CoinDenom,
  CreatureGroup,
  CreatureResult,
  CreatureRole,
  Edition,
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
  Palette,
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

// Budget calculation
export {
  calculateBudget,
  calculateVaultBudget,
  calculatePoolBase,
} from './budget';
export type { PoolBase } from './budget';

// Constants and mappings
export {
  DEFAULT_CAMPAIGN_SETTINGS,
  CR_TO_DEFAULT_TIER,
  crToDefaultTier,
  computeRoleMultipliers,
  ROLE_MULTIPLIER,
  ROLE_RAW_WEIGHT,
  VAULT_BUDGET_PER_TIER,
  VAULT_SIZE_MULTIPLIER,
  PRIORITY_MULTIPLIER,
  TIER_VALUE,
  SOURCE_GROUPS,
  SOURCE_GROUP_LABELS,
  weightToTier,
  DMG_VARIANCE,
  TIER_RANGES,
  COIN_MIX,
  tierFromLevel,
  progressionMultiplier,
  COINS_PER_XP,
  GEMS_PER_XP,
  ART_PER_XP,
  MI_PER_XP,
  MI_AVG_VALUES,
  GP_PER_XP,
} from './constants';
export type { VaultSize, VarianceProfile } from './constants';

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
  getTablesForEdition,
} from './roller';

// Random
export { cryptoRandom } from './random';
