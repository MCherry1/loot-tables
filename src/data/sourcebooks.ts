// Source book definitions for the loot tables system.
// Abbreviations use 5etools conventions. Full names from 5etools metadata.
// Group determines UI placement: core, settings, adventures, digital, thirdparty.

export type SourceGroup =
  | 'core'
  | 'settings'
  | 'adventures'
  | 'digital'
  | 'thirdparty';

export interface Sourcebook {
  /** 5etools abbreviation (canonical). */
  acronym: string;
  /** Full book title. */
  name: string;
  /** UI grouping. */
  group: SourceGroup;
}

export const SOURCEBOOKS: Sourcebook[] = [
  // ── Core Supplements ──────────────────────────────────────────────
  // Rule books and major supplements that expand core rules and items.
  { acronym: 'DMG',    name: "Dungeon Master's Guide",               group: 'core' },
  { acronym: 'XGE',    name: "Xanathar's Guide to Everything",       group: 'core' },
  { acronym: 'TCE',    name: "Tasha's Cauldron of Everything",        group: 'core' },
  { acronym: 'FTD',    name: "Fizban's Treasury of Dragons",          group: 'core' },
  { acronym: 'BGG',    name: "Bigby Presents: Glory of the Giants",   group: 'core' },
  { acronym: 'BMT',    name: "The Book of Many Things",               group: 'core' },
  { acronym: 'MTF',    name: "Mordenkainen's Tome of Foes",           group: 'core' },
  { acronym: 'VGM',    name: "Volo's Guide to Monsters",              group: 'core' },

  // ── Campaign Settings ─────────────────────────────────────────────
  // Books that define a specific campaign world with setting-specific items.
  { acronym: 'ERLW',   name: "Eberron: Rising from the Last War",     group: 'settings' },
  { acronym: 'EGW',    name: "Explorer's Guide to Wildemount",        group: 'settings' },
  { acronym: 'MOT',    name: "Mythic Odysseys of Theros",             group: 'settings' },
  { acronym: 'GGR',    name: "Guildmasters' Guide to Ravnica",        group: 'settings' },
  { acronym: 'SCC',    name: "Strixhaven: A Curriculum of Chaos",     group: 'settings' },
  { acronym: 'AAG',    name: "Astral Adventurer's Guide",             group: 'settings' },
  { acronym: 'VRGR',   name: "Van Richten's Guide to Ravenloft",      group: 'settings' },
  { acronym: 'SatO',   name: "Sigil and the Outlands",                group: 'settings' },
  { acronym: 'DSotDQ', name: "Dragonlance: Shadow of the Dragon Queen", group: 'settings' },

  // ── Adventures ────────────────────────────────────────────────────
  // Published adventure modules with unique magic items.
  { acronym: 'HotDQ',  name: "Hoard of the Dragon Queen",             group: 'adventures' },
  { acronym: 'RoT',    name: "Rise of Tiamat",                        group: 'adventures' },
  { acronym: 'PotA',   name: "Princes of the Apocalypse",             group: 'adventures' },
  { acronym: 'CoS',    name: "Curse of Strahd",                       group: 'adventures' },
  { acronym: 'SKT',    name: "Storm King's Thunder",                  group: 'adventures' },
  { acronym: 'TftYP',  name: "Tales from the Yawning Portal",         group: 'adventures' },
  { acronym: 'ToA',    name: "Tomb of Annihilation",                   group: 'adventures' },
  { acronym: 'WDH',    name: "Waterdeep: Dragon Heist",               group: 'adventures' },
  { acronym: 'WDMM',   name: "Waterdeep: Dungeon of the Mad Mage",    group: 'adventures' },
  { acronym: 'GoS',    name: "Ghosts of Saltmarsh",                   group: 'adventures' },
  { acronym: 'BGDIA',  name: "Baldur's Gate: Descent Into Avernus",    group: 'adventures' },
  { acronym: 'IDRotF', name: "Icewind Dale: Rime of the Frostmaiden", group: 'adventures' },
  { acronym: 'CM',     name: "Candlekeep Mysteries",                  group: 'adventures' },
  { acronym: 'WBtW',   name: "The Wild Beyond the Witchlight",        group: 'adventures' },
  { acronym: 'CRCotN', name: "Critical Role: Call of the Netherdeep", group: 'adventures' },
  { acronym: 'KftGV',  name: "Keys from the Golden Vault",            group: 'adventures' },
  { acronym: 'PaBTSO', name: "Phandelver and Below: The Shattered Obelisk", group: 'adventures' },
  { acronym: 'CoA',    name: "Chains of Asmodeus",                    group: 'adventures' },
  { acronym: 'OotA',   name: "Out of the Abyss",                      group: 'adventures' },
  { acronym: 'LMoP',   name: "Lost Mine of Phandelver",               group: 'adventures' },
  { acronym: 'LLK',    name: "Lost Laboratory of Kwalish",            group: 'adventures' },
  { acronym: 'AI',     name: "Acquisitions Incorporated",             group: 'adventures' },
  { acronym: 'IMR',    name: "Infernal Machine Rebuild",              group: 'adventures' },
  { acronym: 'VEoR',   name: "Vecna: Eve of Ruin",                    group: 'adventures' },
  { acronym: 'QftIS',  name: "Quests from the Infinite Staircase",    group: 'adventures' },
  { acronym: 'DitLCoT', name: "Descent into the Lost Caverns of Tsojcanth", group: 'adventures' },
  { acronym: 'JttRC',  name: "Journeys through the Radiant Citadel",  group: 'adventures' },

  // ── Digital / Supplemental ────────────────────────────────────────
  // Smaller digital-only releases, promotional content, and extras.
  { acronym: 'HAT-LMI', name: "Honor Among Thieves: Legendary Magic Items", group: 'digital' },
  { acronym: 'RoTOS',  name: "Rise of Tiamat Online Supplement",      group: 'digital' },
  { acronym: 'XMtS',   name: "X Marks the Spot",                     group: 'digital' },
  { acronym: 'SDW',    name: "Sleeping Dragon's Wake",                group: 'digital' },
  { acronym: 'DC',     name: "Divine Contention",                     group: 'digital' },
  { acronym: 'BAM',    name: "Boo's Astral Menagerie",                group: 'digital' },
  { acronym: 'TTP',    name: "The Tortle Package",                    group: 'digital' },
  { acronym: 'OGA',    name: "One Grung Above",                       group: 'digital' },
  { acronym: 'HftT',   name: "Hunt for the Thessalhydra",             group: 'digital' },
  { acronym: 'AitFR-AVT', name: "Adventures in the Forgotten Realms: A Verdant Tomb", group: 'digital' },
  { acronym: 'AitFR-THP', name: "Adventures in the Forgotten Realms: The Hidden Page", group: 'digital' },
  { acronym: 'NRH-AT', name: "NERDS Restoring Harmony: Adventure Together", group: 'digital' },
  { acronym: 'NRH-TLT', name: "NERDS Restoring Harmony: The Lost Tomb", group: 'digital' },
  { acronym: 'RMBRE',  name: "The Lost Dungeon of Rickedness: Big Rick Energy", group: 'digital' },
  { acronym: 'AZfyT',  name: "A Zib for Your Thoughts",              group: 'digital' },
  { acronym: 'MCV2DC', name: "Monstrous Compendium Volume 2: Dragonlance Creatures", group: 'digital' },

  // ── Third Party ───────────────────────────────────────────────────
  // DMs Guild and other non-WotC sources. Not in 5etools — maintained manually.
  { acronym: 'ExE',    name: "Exploring Eberron",                     group: 'thirdparty' },
  { acronym: 'TDCSR',  name: "Tal'Dorei Campaign Setting Reborn",     group: 'thirdparty' },
];

/**
 * Maps legacy abbreviations (from hand-curated tables) to 5etools canonical
 * abbreviations. Used during data ingest to normalize source references.
 */
export const LEGACY_ACRONYM_MAP: Record<string, string> = {
  'IWD':  'IDRotF',   // Icewind Dale: Rime of the Frostmaiden
  'ToD':  'HotDQ',    // Tyranny of Dragons → Hoard of the Dragon Queen
  'DIA':  'BGDIA',    // Descent Into Avernus
  'KGV':  'KftGV',    // Keys from the Golden Vault
  'PaB':  'PaBTSO',   // Phandelver and Below
  'TYP':  'TftYP',    // Tales from the Yawning Portal
  'CotN': 'CRCotN',   // Call of the Netherdeep
  'PoTA': 'PotA',     // Princes of the Apocalypse (capitalization)
  'TDCS': 'TDCSR',    // Tal'Dorei Campaign Setting → Reborn
  'DL':   'DSotDQ',   // Dragonlance
};
