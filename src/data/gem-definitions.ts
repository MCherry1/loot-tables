// ---------------------------------------------------------------------------
// Gem definitions — continuous log-scale value system
// Authoritative source: GEM-SYSTEM-SPEC.md §1, §8 and GEM-DESCRIPTORS.md
// ---------------------------------------------------------------------------

export interface GemDefinition {
  /** Display name (e.g. "Diamond", "Black Pearl"). */
  name: string;
  /** Minimum gp value for a specimen of this type. */
  min: number;
  /** Maximum gp value for a specimen of this type. */
  max: number;
  /** Selection probability weight. */
  weight: number;
  /** True for organic gems (cannot be cut). */
  organic: boolean;
  /** False for organic gems — cannot be improved by a gemcutter. */
  improvable: boolean;
}

/**
 * The 33-gem continuous-value roster (GEM-SYSTEM-SPEC.md §1).
 * Each entry has a natural [min, max] gp range. Individual specimens
 * roll on a log scale within this range so most are cheap and common,
 * with occasional valuable specimens at the top.
 */
export const GEM_DEFINITIONS: GemDefinition[] = [
  { name: 'Agate',        min: 1,   max: 1500,    weight: 5, organic: false, improvable: true  },
  { name: 'Alexandrite',  min: 50,  max: 3000,    weight: 2, organic: false, improvable: true  },
  { name: 'Amber',        min: 5,   max: 200,     weight: 3, organic: true,  improvable: false },
  { name: 'Amethyst',     min: 5,   max: 300,     weight: 5, organic: false, improvable: true  },
  { name: 'Aquamarine',   min: 20,  max: 1500,    weight: 4, organic: false, improvable: true  },
  { name: 'Black Pearl',  min: 50,  max: 2000,    weight: 2, organic: true,  improvable: false },
  { name: 'Bloodstone',   min: 2,   max: 80,      weight: 3, organic: false, improvable: true  },
  { name: 'Carnelian',    min: 2,   max: 80,      weight: 3, organic: false, improvable: true  },
  { name: 'Citrine',      min: 2,   max: 120,     weight: 5, organic: false, improvable: true  },
  { name: 'Coral',        min: 5,   max: 250,     weight: 2, organic: true,  improvable: false },
  { name: 'Diamond',      min: 10,  max: 100000,  weight: 8, organic: false, improvable: true  },
  { name: 'Emerald',      min: 50,  max: 10000,   weight: 4, organic: false, improvable: true  },
  { name: 'Garnet',       min: 5,   max: 400,     weight: 5, organic: false, improvable: true  },
  { name: 'Jacinth',      min: 50,  max: 5000,    weight: 2, organic: false, improvable: true  },
  { name: 'Jade',         min: 10,  max: 2000,    weight: 5, organic: false, improvable: true  },
  { name: 'Jet',          min: 2,   max: 80,      weight: 3, organic: true,  improvable: false },
  { name: 'Lapis Lazuli', min: 3,   max: 100,     weight: 4, organic: false, improvable: true  },
  { name: 'Malachite',    min: 1,   max: 50,      weight: 3, organic: false, improvable: true  },
  { name: 'Moonstone',    min: 5,   max: 250,     weight: 3, organic: false, improvable: true  },
  { name: 'Obsidian',     min: 1,   max: 30,      weight: 3, organic: false, improvable: true  },
  { name: 'Onyx',         min: 5,   max: 200,     weight: 4, organic: false, improvable: true  },
  { name: 'Opal',         min: 20,  max: 3000,    weight: 3, organic: false, improvable: true  },
  { name: 'Pearl',        min: 10,  max: 500,     weight: 5, organic: true,  improvable: false },
  { name: 'Peridot',      min: 10,  max: 400,     weight: 4, organic: false, improvable: true  },
  { name: 'Quartz',       min: 1,   max: 150,     weight: 5, organic: false, improvable: true  },
  { name: 'Ruby',         min: 50,  max: 15000,   weight: 6, organic: false, improvable: true  },
  { name: 'Sapphire',     min: 50,  max: 12000,   weight: 5, organic: false, improvable: true  },
  { name: 'Spinel',       min: 10,  max: 500,     weight: 4, organic: false, improvable: true  },
  { name: 'Tiger Eye',    min: 1,   max: 60,      weight: 3, organic: false, improvable: true  },
  { name: 'Topaz',        min: 10,  max: 600,     weight: 4, organic: false, improvable: true  },
  { name: 'Tourmaline',   min: 10,  max: 500,     weight: 4, organic: false, improvable: true  },
  { name: 'Turquoise',    min: 3,   max: 120,     weight: 4, organic: false, improvable: true  },
  { name: 'Zircon',       min: 5,   max: 300,     weight: 3, organic: false, improvable: true  },
];

/**
 * Cut/shape tables per gem type (GEM-DESCRIPTORS.md §3).
 * Picked uniformly at random from the list for each gem.
 * Special cases (star cuts, rough cuts) handled in gem-generator.ts.
 */
export const GEM_CUTS: Record<string, string[]> = {
  // Faceted mineral gems
  Diamond:     ['brilliant-cut', 'cushion-cut', 'oval-cut', 'princess-cut', 'pear-cut', 'marquise-cut', 'rose-cut', 'emerald-cut', 'round-cut'],
  Ruby:        ['oval-cut', 'cushion-cut', 'cabochon', 'round-cut', 'pear-cut'],
  Sapphire:    ['oval-cut', 'cushion-cut', 'cabochon', 'round-cut', 'emerald-cut'],
  Emerald:     ['emerald-cut', 'oval-cut', 'cabochon', 'pear-cut', 'step-cut'],
  Amethyst:    ['oval-cut', 'round-cut', 'cushion-cut', 'pear-cut', 'faceted'],
  Aquamarine:  ['emerald-cut', 'oval-cut', 'cushion-cut', 'pear-cut'],
  Citrine:     ['oval-cut', 'round-cut', 'cushion-cut', 'faceted'],
  Garnet:      ['round-cut', 'oval-cut', 'cushion-cut', 'cabochon', 'faceted'],
  Topaz:       ['oval-cut', 'cushion-cut', 'emerald-cut', 'pear-cut', 'round-cut'],
  Tourmaline:  ['emerald-cut', 'oval-cut', 'cushion-cut', 'round-cut'],
  Spinel:      ['oval-cut', 'cushion-cut', 'round-cut', 'cabochon'],
  Peridot:     ['oval-cut', 'round-cut', 'cushion-cut', 'emerald-cut'],
  Alexandrite: ['cushion-cut', 'oval-cut', 'round-cut', 'cabochon'],
  Zircon:      ['round-cut', 'oval-cut', 'cushion-cut'],
  Moonstone:   ['cabochon', 'oval cabochon', 'round cabochon'],
  Jacinth:     ['oval-cut', 'cushion-cut', 'round-cut', 'brilliant-cut'],
  Opal:        ['cabochon', 'oval cabochon', 'freeform polished'],
  // Polished / carved semi-precious
  Agate:        ['polished', 'tumbled', 'cabochon', 'carved cameo', 'sliced', 'bead', 'carved figurine'],
  Bloodstone:   ['polished', 'cabochon', 'carved seal', 'tumbled'],
  Carnelian:    ['polished', 'cabochon', 'carved seal', 'intaglio', 'bead'],
  'Lapis Lazuli': ['polished', 'cabochon', 'carved scarab', 'carved seal', 'bead strand', 'inlay piece', 'tumbled'],
  Malachite:    ['polished', 'cabochon', 'carved figurine', 'sliced', 'inlay piece', 'small carved box'],
  Obsidian:     ['polished', 'tumbled', 'carved figurine', 'knapped arrowhead', 'ritual blade', 'polished mirror'],
  Quartz:       ['polished point', 'cabochon', 'tumbled', 'faceted', 'raw crystal'],
  'Tiger Eye':  ['cabochon', 'polished', 'tumbled'],
  Turquoise:    ['cabochon', 'polished', 'carved pendant', 'inlay piece', 'bead strand', 'tumbled'],
  Onyx:         ['polished', 'cabochon', 'carved cameo', 'carved figurine', 'faceted', 'seal stone'],
  Jade:         ['polished stone', 'cabochon', 'carved figurine', 'carved seal', 'bangle', 'pendant', 'circlet', 'bead strand', 'tumbled'],
  // Organic — natural forms
  Pearl:        ['round', 'baroque', 'button', 'drop', 'oval'],
  'Black Pearl':['round', 'baroque', 'drop', 'button'],
  Amber:        ['polished nugget', 'cabochon', 'pendant', 'carved figurine', 'bead strand', 'tumbled'],
  Coral:        ['polished branch', 'cabochon', 'carved figurine', 'bead strand', 'brooch piece', 'tumbled'],
  Jet:          ['polished', 'carved cameo', 'bead strand', 'cabochon', 'mourning brooch', 'carved pendant'],
};

/**
 * Color variants per gem type (GEM-DESCRIPTORS.md §4).
 * Most gems have multiple colors — one is picked at random.
 * Empty array = no color variant (name alone is enough).
 */
export const GEM_COLORS: Record<string, string[]> = {
  Agate:       ['banded brown-and-white', 'moss green', 'fire', 'eye', 'blue lace'],
  Amethyst:    ['deep purple', 'pale violet', 'rose'],
  Aquamarine:  ['pale blue', 'blue-green', 'deep sea blue'],
  Citrine:     ['pale yellow', 'golden', 'amber-orange'],
  Diamond:     ['white', 'pale yellow', 'faint blue', 'champagne', 'smoky gray'],
  Emerald:     ['deep green', 'vivid green', 'blue-green'],
  Garnet:      ['deep red', 'orange', 'green', 'purple'],
  Jade:        ['pale green', 'deep green', 'white', 'lavender'],
  Moonstone:   ['translucent white', 'blue-sheen', 'peach'],
  Obsidian:    ['black', 'mahogany', 'snowflake'],
  Opal:        ['white', 'fire', 'black'],
  Quartz:      ['clear', 'smoky', 'rose', 'milky white'],
  Ruby:        ['blood-red', 'pinkish red', 'deep crimson'],
  Sapphire:    ['blue', 'yellow', 'pink', 'green'],
  Spinel:      ['red', 'blue', 'pink', 'black'],
  Topaz:       ['golden', 'imperial pink-orange', 'blue', 'white'],
  Tourmaline:  ['green', 'pink', 'watermelon', 'blue'],
  Turquoise:   ['sky blue', 'blue-green', 'green with brown matrix'],
  Zircon:      ['pale blue', 'colorless', 'golden'],
  // Organic colors
  Pearl:       ['white', 'cream', 'pink', 'golden', 'silver-gray'],
  'Black Pearl': ['black'],
  Amber:       ['honey', 'deep gold', 'cherry'],
  Coral:       ['crimson', 'salmon pink', 'deep red', 'orange-red'],
  Jet:         ['black'],
  // Gems without listed variants (leave empty)
  Alexandrite: [],
  Bloodstone:  [],
  Carnelian:   [],
  'Lapis Lazuli': [],
  Malachite:   [],
  Jacinth:     [],
  Onyx:        [],
  Peridot:     [],
  'Tiger Eye': [],
  Jet_:        [], // placeholder — keep arrays aligned
};

/** Legendary name template pools (GEM-DESCRIPTORS.md §5). */
export const LEGENDARY_ADJECTIVES = [
  'Eternal', 'Radiant', 'Sovereign', 'Twilight', 'Crimson', 'Azure', 'Midnight',
  'Golden', 'Silent', 'Ancient', 'Celestial', 'Abyssal', 'Imperial', 'Prismatic',
  'Sunken', 'Frozen', 'Burning',
];
export const LEGENDARY_NOUNS = [
  'Heart', 'Eye', 'Tear', 'Crown', 'Star', 'Flame', 'Dream', 'Throne', 'Fist',
  'Shard', 'Beacon', 'Bloom', 'Veil', 'Breath',
];
