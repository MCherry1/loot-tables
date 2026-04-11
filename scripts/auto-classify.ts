// ---------------------------------------------------------------------------
// Auto-classification rules engine for 5etools items.
//
// Implements the 7 priority rules from TABLE-ASSIGNMENT-METHODOLOGY.md.
// Input: a 5etools item JSON object.
// Output: a CurationEntry with status "ready-for-review".
// ---------------------------------------------------------------------------

import type { CurationEntry, CurationFile } from './curation-types';

// ---------------------------------------------------------------------------
// 5etools item shape (fields we care about)
// ---------------------------------------------------------------------------

export interface FiveToolsItem {
  name: string;
  source: string;
  rarity?: string;
  type?: string;
  reqAttune?: string | boolean;
  reqAttuneTags?: Array<{ class?: string; spellcasting?: boolean; [k: string]: unknown }>;
  bonusWeapon?: string;
  bonusAc?: string;
  bonusSavingThrow?: string;
  bonusSpellAttack?: string;
  bonusSpellSaveDc?: string;
  focus?: string[] | boolean;
  sentient?: boolean;
  curse?: boolean;
  tier?: string;
  lootTables?: string[];
  charges?: unknown;
  recharge?: unknown;
  attachedSpells?: string[];
  modifySpeed?: unknown;
  entries?: unknown[];
  baseItem?: string;
  dmg1?: string;
}

export type ClassifyResult =
  | { classified: true; entry: CurationEntry }
  | { classified: false; reason: string };

type TableLetter = CurationEntry['table'];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RARITY_TO_TABLE_PAIR: Record<string, { minor: TableLetter; major: TableLetter }> = {
  uncommon: { minor: 'B', major: 'F' },
  rare: { minor: 'C', major: 'G' },
  'very rare': { minor: 'D', major: 'H' },
  legendary: { minor: 'E', major: 'I' },
};

const SPELLCASTER_CLASSES = new Set([
  'wizard', 'sorcerer', 'bard', 'cleric', 'druid', 'warlock', 'paladin', 'ranger', 'artificer',
]);

const APPAREL_KEYWORDS = [
  'boot', 'shoe', 'slipper', 'sandal',
  'cloak', 'cape', 'robe', 'mantle', 'vestment',
  'helm', 'helmet', 'cap', 'hat', 'hood', 'mask', 'crown', 'coronet', 'diadem',
  'belt', 'girdle',
  'goggles', 'eyes of', 'lenses',
  'tattoo',
  'ornament', 'scarf', 'shroud', 'bib', 'headband',
];

const JEWELRY_KEYWORDS = [
  'ring of',
  'amulet', 'periapt', 'brooch', 'necklace', 'pendant', 'medallion', 'circlet', 'locket', 'torc',
  'talisman', 'scarab', 'charm of', 'solitaire', 'lodestone',
];

// ---------------------------------------------------------------------------
// Rule implementations
// ---------------------------------------------------------------------------

/**
 * Rule 0: Existing curation overrides — checked by the caller before
 * calling classify(), not in this function.
 */

/** Rule 1: DMG lootTables field → direct table assignment. */
function rule1_dmgAssignment(item: FiveToolsItem): TableLetter | null {
  if (!item.lootTables || item.lootTables.length === 0) return null;
  // "Magic Item Table G" → "G"
  const m = /Magic Item Table ([A-I])/.exec(item.lootTables[0]);
  return m ? (m[1] as TableLetter) : null;
}

/** Rule 2: Common → Table A. */
function rule2_common(item: FiveToolsItem): boolean {
  return item.rarity === 'common';
}

/** Rule 3: Exclusions. */
function rule3_exclusion(item: FiveToolsItem): ClassifyResult | null {
  if (item.curse) {
    return {
      classified: true,
      entry: { table: 'A', category: '', weight: null, status: 'excluded', reason: 'cursed' },
    };
  }
  if (item.rarity === 'artifact') {
    return {
      classified: true,
      entry: { table: 'A', category: '', weight: null, status: 'excluded', reason: 'artifact' },
    };
  }
  if (item.rarity === 'varies' || item.rarity === 'unknown' || item.rarity === 'unknown (magic)') {
    return { classified: false, reason: `rarity "${item.rarity}" needs manual assignment` };
  }
  return null;
}

/** Rule 5: Determine minor vs major within a rarity pair. */
function isMajor(item: FiveToolsItem): boolean {
  // 5a: Explicit tier field
  if (item.tier === 'major') return true;
  if (item.tier === 'minor') return false;

  // 5b: Attunement → Major (strong predictor)
  if (item.reqAttune) return true;

  // 5d: Non-attunement items that are still Major
  if (item.bonusWeapon || item.bonusAc || item.bonusSavingThrow) return true;
  if (item.bonusSpellAttack || item.bonusSpellSaveDc) return true;
  if (item.sentient) return true;
  if (item.attachedSpells && item.charges && item.recharge) return true;
  if (item.modifySpeed) return true;

  const lower = item.name.toLowerCase();
  if (lower.includes('manual of') || lower.includes('tome of')) return true;
  if (lower.includes('figurine of wondrous power')) return true;
  if (lower.includes('deck of')) return true;

  // 5d: Legendary non-potion/non-scroll → Major
  if (item.rarity === 'legendary') {
    const type = item.type?.toLowerCase() ?? '';
    if (type !== 'p' && !lower.startsWith('spell scroll') && !lower.startsWith('potion')) {
      return true;
    }
  }

  // 5f: Default → Minor
  return false;
}

/** Rule 6: Category assignment for major tables (F, G, H, I). */
function classifyMajorCategory(item: FiveToolsItem): string {
  const lower = item.name.toLowerCase();
  const type = item.type ?? '';

  // Priority 1: Any spellcaster attunement → Spellcaster
  if (item.reqAttuneTags) {
    const hasSpellcaster = item.reqAttuneTags.some(
      (tag) => (tag.class && SPELLCASTER_CLASSES.has(tag.class.toLowerCase())) ||
               tag.spellcasting,
    );
    if (hasSpellcaster) return 'Spellcaster';
  }
  if (typeof item.reqAttune === 'string' && item.reqAttune.toLowerCase().includes('spellcaster')) {
    return 'Spellcaster';
  }

  // Priority 2: "staff of" → Spellcaster
  if (lower.startsWith('staff of')) return 'Spellcaster';

  // Priority 3: Type-based rules
  if (type === 'P') {
    if (lower.startsWith('oil of') || lower.startsWith('bottled') || lower.startsWith('philter')) {
      return 'Consumables';
    }
    return 'Potions';
  }
  if (type === 'RG|DMG' || type === 'RG') return 'Jewelry';
  if ((type === 'M' || type === 'R') && item.sentient) return 'Sentient';
  if (type === 'M' || type === 'R') return 'Arms';
  if (type === 'S' || type === 'HA' || type === 'MA' || type === 'LA') return 'Armor';
  if ((type === 'RD|DMG' || type === 'RD') && item.focus) return 'Spellcaster';
  if (type === 'RD|DMG' || type === 'RD') return 'Misc';
  if (type === 'WD|DMG' || type === 'WD') return 'Misc';
  if (type === 'SC|DMG' || type === 'SC') return 'Misc';
  if (type === 'SCF') return 'Spellcaster';
  if ((type === 'INS') && item.focus) return 'Spellcaster';
  if (type === 'INS') return 'Misc';
  if (type === 'A') return 'Ammunition';

  // Priority 4: Keyword matching (wondrous items, type "none" or empty)
  // Defensive hand items vs attack hand items
  if (/glove|gauntlet|bracer|vambrace/.test(lower)) {
    if (item.bonusWeapon || item.dmg1) return 'Arms';
    return 'Apparel';
  }

  for (const kw of APPAREL_KEYWORDS) {
    if (lower.includes(kw)) return 'Apparel';
  }
  for (const kw of JEWELRY_KEYWORDS) {
    if (lower.includes(kw)) return 'Jewelry';
  }

  if (lower.includes('quiver')) return 'Arms';
  if (lower.includes('manual of') || lower.includes('tome of')) return 'Misc';
  if (lower.includes('figurine')) return 'Misc';
  if (lower.includes('dust of') || lower.includes('pigment') || lower.includes('ointment')) return 'Consumables';

  // Priority 5: Fallback → Misc
  return 'Misc';
}

/** Rule 6: Category assignment for minor tables (B, C, D) and Table E. */
function classifyMinorCategory(item: FiveToolsItem): string {
  const lower = item.name.toLowerCase();
  const type = item.type ?? '';

  if (type === 'P' || lower.startsWith('potion') || lower.startsWith('elixir')) return 'Potions';
  if (lower.startsWith('spell scroll') || lower.startsWith('spellwrought tattoo')) return 'Spells';
  if (type === 'A') return 'Ammunition';

  // Consumables: multi-use items with charges, dusts, oils, etc.
  if (lower.includes('dust of') || lower.includes('pigment') || lower.includes('oil of') ||
      lower.includes('ointment') || lower.includes('bead') || lower.includes('necklace of fireballs')) {
    return 'Consumables';
  }

  return 'Equipment';
}

/** Rule 6: Category assignment for Table A (Common). */
function classifyCommonCategory(item: FiveToolsItem): string {
  const lower = item.name.toLowerCase();
  const type = item.type ?? '';

  if (type === 'P' || lower.startsWith('potion') || lower.startsWith('elixir')) return 'Potions';
  if (lower.startsWith('spell scroll') || lower.startsWith('spellwrought tattoo')) return 'Spell-Scrolls';

  // Spellcaster
  if (item.reqAttuneTags) {
    const hasSpellcaster = item.reqAttuneTags.some(
      (tag) => (tag.class && SPELLCASTER_CLASSES.has(tag.class.toLowerCase())) ||
               tag.spellcasting,
    );
    if (hasSpellcaster) return 'Spellcaster';
  }
  if (typeof item.reqAttune === 'string' && item.reqAttune.toLowerCase().includes('spellcaster')) {
    return 'Spellcaster';
  }
  if (type === 'SCF') return 'Spellcaster';

  // Arms & Armor
  if (type === 'M' || type === 'R' || type === 'HA' || type === 'MA' || type === 'LA' || type === 'S' || type === 'A') {
    return 'Arms-Armor';
  }

  // Default: Trinkets (new items default here; can be promoted to Gear during review)
  return 'Trinkets';
}

// ---------------------------------------------------------------------------
// Main classify function
// ---------------------------------------------------------------------------

/**
 * Classify a 5etools item into a table, category, and proposed weight.
 *
 * Rule 0 (existing curation overrides) should be checked by the caller
 * before calling this function.
 */
export function classify(
  item: FiveToolsItem,
  existingCuration?: CurationFile,
): ClassifyResult {
  const key = `${item.name}|${item.source}`;

  // Rule 0: Existing curation override
  if (existingCuration?.[key]?.status === 'approved') {
    return { classified: true, entry: existingCuration[key] };
  }

  // Rule 1: DMG lootTables field
  const dmgTable = rule1_dmgAssignment(item);

  // Rule 3: Exclusions
  const exclusion = rule3_exclusion(item);
  if (exclusion) return exclusion;

  // Rule 2: Common → Table A
  if (rule2_common(item)) {
    const category = classifyCommonCategory(item);
    return {
      classified: true,
      entry: {
        table: 'A',
        category,
        weight: 3,
        status: 'ready-for-review',
      },
    };
  }

  // Rule 4: Rarity → table pair
  const rarity = (item.rarity ?? '').toLowerCase();
  const pair = RARITY_TO_TABLE_PAIR[rarity];
  if (!pair) {
    return { classified: false, reason: `unknown rarity "${item.rarity}"` };
  }

  // If DMG explicitly assigns a table, use that directly.
  if (dmgTable) {
    const isMinor = dmgTable === pair.minor;
    const category = isMinor
      ? classifyMinorCategory(item)
      : classifyMajorCategory(item);
    return {
      classified: true,
      entry: {
        table: dmgTable,
        category,
        weight: 3,
        status: 'ready-for-review',
      },
    };
  }

  // Rule 5: Minor vs Major
  const major = isMajor(item);
  const table = major ? pair.major : pair.minor;

  // Rule 6: Category assignment
  const category = major
    ? classifyMajorCategory(item)
    : classifyMinorCategory(item);

  return {
    classified: true,
    entry: {
      table,
      category,
      weight: 3,
      status: 'ready-for-review',
    },
  };
}
