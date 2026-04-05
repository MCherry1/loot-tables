// ---------------------------------------------------------------------------
// Public API barrel export for the treasure economy engine
// ---------------------------------------------------------------------------

// Types
export type {
  CampaignSettings,
  CategoryEntry,
  CreatureResult,
  EncounterInput,
  EncounterResult,
  LootInput,
  LootResult,
  MagicItemResult,
  MITable,
  Role,
  Tier,
  TreasureItem,
} from './types';

// Loot generation
export { generateLoot, generateEncounter } from './loot-generator';

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
} from './constants';

// Table rollers
export { rollMagicItem, rollGem, rollArt } from './roller';
