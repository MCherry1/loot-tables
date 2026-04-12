// ---------------------------------------------------------------------------
// Art object category definitions — category-based continuous value system
// Authoritative source: ART-SYSTEM-SPEC.md §2-§6
// ---------------------------------------------------------------------------

/** A value-scaled pool: options that apply up to a given max value. */
export interface ScaledPool {
  maxValue: number;
  options: string[];
}

export interface ArtCategoryDefinition {
  /** Display name (e.g. "Jewelry"). */
  name: string;
  /** Associated artisan tool (for future crafting integration). */
  artisanTool: string;
  /** Minimum gp value a specimen of this category can have. */
  min: number;
  /** Maximum gp value a specimen of this category can have. */
  max: number;
  /** Selection probability weight. */
  weight: number;
  /** Materials pool, tiered by max value threshold (ascending). */
  materials: ScaledPool[];
  /** All possible forms — picked uniformly at random. */
  forms: string[];
  /** Detail modifiers, tiered by max value threshold (ascending). */
  details: ScaledPool[];
}

/**
 * DMG named art entries — verbatim items with an exact gp value.
 * When the algorithm produces an item in the matching category & value band,
 * there is a small chance it yields this item as-is (ART-SYSTEM-SPEC.md §6).
 */
export interface DmgNamedArt {
  category: string;
  value: number;
  description: string;
}

export const ART_CATEGORIES: ArtCategoryDefinition[] = [
  {
    name: 'Jewelry',
    artisanTool: "Jeweler's Tools",
    min: 5,
    max: 50000,
    weight: 8,
    materials: [
      { maxValue: 50,    options: ['copper', 'brass', 'bronze', 'pewter', 'bone', 'shell'] },
      { maxValue: 500,   options: ['silver', 'electrum', 'polished steel', 'silver-gilt'] },
      { maxValue: 5000,  options: ['gold', 'white-gold', 'rose-gold', 'platinum-plated'] },
      { maxValue: Infinity, options: ['platinum', 'mithral', 'adamantine-inlaid'] },
    ],
    forms: [
      'ring', 'necklace', 'bracelet', 'brooch', 'anklet', 'circlet', 'crown',
      'tiara', 'pendant', 'locket', 'chain', 'earrings', 'hairpin', 'torc',
      'armband', 'signet ring', 'choker', 'diadem', 'bangle',
    ],
    details: [
      { maxValue: 50,    options: ['with etched patterns', 'with colored glass', 'unadorned', 'simply made'] },
      { maxValue: 500,   options: ['with filigree', 'set with a small gem', 'with engraved motifs', 'with enamel inlay'] },
      { maxValue: 5000,  options: ['set with matched gems', 'with intricate filigree', 'bearing a heraldic device', 'gem-encrusted'] },
      { maxValue: Infinity, options: ['set with a large precious gem', 'with masterwork filigree', 'jewel-encrusted', 'bearing a legendary stone'] },
    ],
  },
  {
    name: 'Metalwork',
    artisanTool: "Smith's Tools",
    min: 3,
    max: 15000,
    weight: 6,
    materials: [
      { maxValue: 50,    options: ['tin', 'copper', 'brass', 'iron', 'pewter'] },
      { maxValue: 500,   options: ['bronze', 'silver-plated', 'electrum'] },
      { maxValue: 5000,  options: ['silver', 'gold-plated', 'gilded bronze'] },
      { maxValue: Infinity, options: ['solid gold', 'platinum-inlaid', 'mithral'] },
    ],
    forms: [
      'chalice', 'cup', 'goblet', 'ewer', 'bowl', 'platter', 'plate',
      'candlestick', 'candelabra', 'mirror', 'bell', 'tankard', 'flask',
      'decanter', 'censer', 'brazier', 'sundial', 'astrolabe', 'letter opener',
    ],
    details: [
      { maxValue: 50,    options: ['with simple designs', 'dented but serviceable', 'bearing a maker\u2019s mark'] },
      { maxValue: 500,   options: ['with filigree', 'with gem inlay', 'engraved with hunting scenes', 'with animal motifs'] },
      { maxValue: 5000,  options: ['with precious-stone settings', 'with gold leaf', 'depicting religious iconography', 'depicting battle scenes'] },
      { maxValue: Infinity, options: ['with a jeweled rim', 'with masterwork engraving', 'with platinum filigree', 'depicting mythological scenes'] },
    ],
  },
  {
    name: 'Sculpture',
    artisanTool: "Mason's Tools",
    min: 2,
    max: 10000,
    weight: 5,
    materials: [
      { maxValue: 50,    options: ['clay', 'carved bone', 'soapstone', 'driftwood', 'carved antler'] },
      { maxValue: 500,   options: ['carved stone', 'marble', 'carved ivory', 'cast bronze', 'hardwood'] },
      { maxValue: 5000,  options: ['fine marble', 'alabaster', 'jade', 'obsidian with gold fittings', 'silver'] },
      { maxValue: Infinity, options: ['gold', 'mithral', 'platinum', 'jewel-inlaid marble'] },
    ],
    forms: [
      'statuette', 'figurine', 'idol', 'bust', 'relief panel', 'animal figure',
      'mask', 'totem', 'gargoyle', 'chess piece', 'bookend', 'fountain piece',
    ],
    details: [
      { maxValue: 50,    options: ['crudely carved', 'of a common animal', 'of a hooded figure'] },
      { maxValue: 500,   options: ['well-proportioned', 'of a noble figure', 'of a rearing horse', 'with fine detail'] },
      { maxValue: 5000,  options: ['exquisitely detailed', 'of a dragon', 'of a deity', 'with gold inlay', 'with gem eyes'] },
      { maxValue: Infinity, options: ['lifelike', 'of a famous hero', 'with precious-metal fittings', 'of museum quality'] },
    ],
  },
  {
    name: 'Textile',
    artisanTool: "Weaver's Tools",
    min: 1,
    max: 8000,
    weight: 5,
    materials: [
      { maxValue: 50,    options: ['wool', 'linen', 'hemp', 'dyed cotton'] },
      { maxValue: 500,   options: ['fine wool', 'silk', 'brocade', 'velvet'] },
      { maxValue: 5000,  options: ['gold-threaded silk', 'cloth-of-gold', 'silver-threaded velvet'] },
      { maxValue: Infinity, options: ['cloth-of-platinum', 'mithral-threaded silk', 'gem-studded fabric'] },
    ],
    forms: [
      'tapestry', 'rug', 'carpet', 'banner', 'pennant', 'robe', 'vestments',
      'cloak', 'mantle', 'sash', 'tabard', 'altar cloth', 'wall hanging',
      'cushion cover', 'purse', 'belt',
    ],
    details: [
      { maxValue: 50,    options: ['with simple geometric patterns', 'faded but intact', 'dye-stained'] },
      { maxValue: 500,   options: ['with a heraldic design', 'depicting a forest scene', 'with gold embroidery', 'fringed with tassels'] },
      { maxValue: 5000,  options: ['depicting a battle scene', 'depicting a royal court', 'with jeweled clasps', 'with pearl buttons'] },
      { maxValue: Infinity, options: ['depicting a legendary event', 'with precious-gem buttons', 'of masterwork weave', 'threaded with mithral'] },
    ],
  },
  {
    name: 'Painting',
    artisanTool: "Painter's Supplies",
    min: 5,
    max: 25000,
    weight: 4,
    materials: [
      { maxValue: 50,    options: ['charcoal on parchment', 'watercolor on paper', 'chalk sketch'] },
      { maxValue: 500,   options: ['oil on canvas', 'tempera on wood panel', 'ink wash on silk'] },
      { maxValue: 5000,  options: ['oil on canvas in a gilded frame', 'masterwork oils', 'illuminated panel'] },
      { maxValue: Infinity, options: ['oil on canvas in a gem-studded frame', 'ancient masterwork', 'legendary painting'] },
    ],
    forms: [
      'portrait', 'landscape', 'battle scene', 'religious icon', 'still life',
      'allegorical scene', 'mural fragment', 'miniature portrait', 'triptych panel',
    ],
    details: [
      { maxValue: 50,    options: ['faded but recognizable', 'by an unknown artist', 'roughly done', 'partially damaged'] },
      { maxValue: 500,   options: ['well-preserved', 'in vivid colors', 'by a regional artist', 'in a carved frame'] },
      { maxValue: 5000,  options: ['strikingly detailed', 'by a renowned artist', 'in a gilded frame', 'remarkably preserved'] },
      { maxValue: Infinity, options: ['by a legendary master', 'in a jeweled frame', 'of historical significance', 'breathtaking'] },
    ],
  },
  {
    name: 'Pottery',
    artisanTool: "Potter's Tools",
    min: 1,
    max: 3000,
    weight: 4,
    materials: [
      { maxValue: 50,    options: ['earthenware', 'terracotta', 'stoneware', 'fired clay'] },
      { maxValue: 500,   options: ['fine porcelain', 'glazed ceramic', 'white stoneware'] },
      { maxValue: Infinity, options: ['celadon', 'eggshell porcelain', 'imperial-grade ceramic', 'gold-lustered'] },
    ],
    forms: ['vase', 'urn', 'bowl', 'plate', 'jug', 'amphora', 'teapot', 'tile', 'incense burner', 'figurine', 'jar', 'lamp'],
    details: [
      { maxValue: 50,    options: ['with a simple glaze', 'chipped but intact', 'with thumbprint marks'] },
      { maxValue: 500,   options: ['with a painted scene', 'with intricate glaze patterns', 'with animal-shaped handles'] },
      { maxValue: Infinity, options: ['with gold-leaf accents', 'of museum-quality glaze', 'with a precious-metal rim', 'translucent'] },
    ],
  },
  {
    name: 'Glasswork',
    artisanTool: "Glassblower's Tools",
    min: 2,
    max: 5000,
    weight: 3,
    materials: [
      { maxValue: 50,    options: ['colored glass', 'bottle glass', 'crude blown glass'] },
      { maxValue: 500,   options: ['fine crystal', 'frosted glass', 'stained glass'] },
      { maxValue: Infinity, options: ['leaded crystal', 'precious-metal-caged glass', 'enchantment-quality crystal'] },
    ],
    forms: [
      'bottle', 'vase', 'ornament', 'prism', 'lens', 'drinking glass', 'goblet',
      'stained-glass panel', 'paperweight', 'perfume bottle', 'figurine', 'mosaic tile set',
    ],
    details: [
      { maxValue: 50,    options: ['with air bubbles', 'asymmetric but charming', 'in a single color'] },
      { maxValue: 500,   options: ['with swirled colors', 'precisely shaped', 'with etched designs', 'multi-colored'] },
      { maxValue: Infinity, options: ['of flawless clarity', 'with gold filigree cage', 'depicting a scene in stained glass', 'prismatic'] },
    ],
  },
  {
    name: 'Woodwork',
    artisanTool: "Carpenter's Tools",
    min: 1,
    max: 5000,
    weight: 4,
    materials: [
      { maxValue: 50,    options: ['pine', 'oak', 'ash', 'birch', 'common hardwood'] },
      { maxValue: 500,   options: ['mahogany', 'ebony', 'teak', 'rosewood', 'exotic hardwood'] },
      { maxValue: Infinity, options: ['petrified wood', 'ironwood', 'darkwood', 'gold-inlaid exotic wood'] },
    ],
    forms: [
      'carved box', 'chess set', 'game board', 'lute', 'harp', 'flute', 'pipe',
      'comb', 'holy symbol', 'walking stick', 'picture frame', 'jewelry box',
      'trinket box', 'dice set', 'fan', 'mask',
    ],
    details: [
      { maxValue: 50,    options: ['with simple carving', 'worn but sturdy', 'with brass fittings'] },
      { maxValue: 500,   options: ['with intricate carving', 'with ivory inlay', 'with silver fittings', 'depicting animals'] },
      { maxValue: Infinity, options: ['with gold fittings', 'with gem inlay', 'of masterwork carving', 'with platinum hinges'] },
    ],
  },
  {
    name: 'Leatherwork',
    artisanTool: "Leatherworker's Tools",
    min: 1,
    max: 3000,
    weight: 3,
    materials: [
      { maxValue: 50,    options: ['cowhide', 'pigskin', 'goatskin'] },
      { maxValue: 500,   options: ['deerskin', 'snakeskin', 'fine calfskin', 'dyed leather'] },
      { maxValue: Infinity, options: ['dragon hide', 'wyvern skin', 'exotic reptile hide', 'gold-tooled leather'] },
    ],
    forms: [
      'book cover', 'journal', 'scabbard', 'belt', 'pouch', 'satchel', 'map case',
      'quiver', 'scroll case', 'coin purse', 'decorative gloves', 'mask', 'bracer',
    ],
    details: [
      { maxValue: 50,    options: ['with simple tooling', 'with a brass buckle', 'dyed a single color'] },
      { maxValue: 500,   options: ['with an embossed design', 'with silver clasps', 'with dyed patterns', 'with stitched motifs'] },
      { maxValue: Infinity, options: ['with gold tooling', 'with gem-set clasps', 'of masterwork stitching', 'with platinum fittings'] },
    ],
  },
  {
    name: 'Calligraphy',
    artisanTool: "Calligrapher's Supplies",
    min: 2,
    max: 10000,
    weight: 3,
    materials: [
      { maxValue: 50,    options: ['common ink on parchment', 'chalk on slate', 'charcoal on vellum'] },
      { maxValue: 500,   options: ['fine ink on vellum', 'gold-leaf letters on parchment', 'painted borders'] },
      { maxValue: Infinity, options: ['illuminated manuscript pages', 'precious ink on dragonhide', 'platinum-leaf script'] },
    ],
    forms: [
      'illuminated manuscript page', 'map', 'letter of marque', 'royal decree',
      'prayer scroll', 'poetry collection', 'heraldic chart', 'genealogy',
      'bestiary page', 'historical chronicle', 'musical score', 'alchemical recipe',
      'navigational chart',
    ],
    details: [
      { maxValue: 50,    options: ['faded but legible', 'in a common tongue', 'with simple borders'] },
      { maxValue: 500,   options: ['with illuminated capitals', 'with gold-leaf borders', 'in an ancient script', 'with illustrated margins'] },
      { maxValue: Infinity, options: ['with gem-dust ink', 'of masterwork illumination', 'with mythological illustrations', 'of museum-quality preservation'] },
    ],
  },
];

/**
 * DMG named art items (ART-SYSTEM-SPEC.md §6).
 * When the budget algorithm produces an item in the matching category &
 * within ~40% of the DMG face value, a small chance picks the DMG item
 * verbatim instead of assembling a description.
 */
export const DMG_NAMED_ART: DmgNamedArt[] = [
  // Jewelry
  { category: 'Jewelry', value: 25,   description: 'Small gold bracelet' },
  { category: 'Jewelry', value: 25,   description: 'Gold locket with a painted portrait inside' },
  { category: 'Jewelry', value: 250,  description: 'Gold ring set with bloodstones' },
  { category: 'Jewelry', value: 250,  description: 'Large gold bracelet' },
  { category: 'Jewelry', value: 250,  description: 'Silver necklace with a gemstone pendant' },
  { category: 'Jewelry', value: 250,  description: 'Bronze crown' },
  { category: 'Jewelry', value: 750,  description: 'Silver and gold brooch' },
  { category: 'Jewelry', value: 2500, description: 'Fine gold chain set with a fire opal' },
  { category: 'Jewelry', value: 2500, description: 'Platinum bracelet set with a sapphire' },
  { category: 'Jewelry', value: 2500, description: 'Jeweled anklet' },
  { category: 'Jewelry', value: 2500, description: 'Gold circlet set with four aquamarines' },
  { category: 'Jewelry', value: 2500, description: 'A necklace of small pink pearls' },
  { category: 'Jewelry', value: 7500, description: 'Jeweled gold crown' },
  { category: 'Jewelry', value: 7500, description: 'Jeweled platinum ring' },
  // Metalwork
  { category: 'Metalwork', value: 25,   description: 'Silver ewer' },
  { category: 'Metalwork', value: 25,   description: 'Copper chalice with silver filigree' },
  { category: 'Metalwork', value: 250,  description: 'Brass mug with jade inlay' },
  { category: 'Metalwork', value: 750,  description: 'Silver chalice set with moonstones' },
  { category: 'Metalwork', value: 750,  description: 'Bottle stopper cork embossed with gold leaf and set with amethysts' },
  { category: 'Metalwork', value: 7500, description: 'Gold cup set with emeralds' },
  { category: 'Metalwork', value: 7500, description: 'Bejeweled ivory drinking horn with gold filigree' },
  { category: 'Metalwork', value: 750,  description: 'Gold dragon comb set with red garnets as eyes' },
  { category: 'Metalwork', value: 750,  description: 'Painted gold war mask' },
  { category: 'Metalwork', value: 2500, description: 'Eye patch with a mock eye set in blue sapphire and moonstone' },
  // Sculpture
  { category: 'Sculpture', value: 25,   description: 'Carved bone statuette' },
  { category: 'Sculpture', value: 250,  description: 'Carved ivory statuette' },
  { category: 'Sculpture', value: 250,  description: 'Box of turquoise animal figurines' },
  { category: 'Sculpture', value: 750,  description: 'Small gold idol' },
  { category: 'Sculpture', value: 750,  description: 'Obsidian statuette with gold fittings and inlay' },
  { category: 'Sculpture', value: 7500, description: 'Small gold statuette set with rubies' },
  // Textile
  { category: 'Textile', value: 25,   description: 'Cloth-of-gold vestments' },
  { category: 'Textile', value: 25,   description: 'Black velvet mask stitched with silver thread' },
  { category: 'Textile', value: 25,   description: 'Embroidered silk handkerchief' },
  { category: 'Textile', value: 250,  description: 'Silk robe with gold embroidery' },
  { category: 'Textile', value: 250,  description: 'Large well-made tapestry' },
  { category: 'Textile', value: 2500, description: 'Embroidered silk and velvet mantle set with numerous moonstones' },
  { category: 'Textile', value: 2500, description: 'Embroidered glove set with jewel chips' },
  // Painting
  { category: 'Painting', value: 25,   description: 'Small mirror set in a painted wooden frame' },
  { category: 'Painting', value: 2500, description: 'Old masterpiece painting' },
  // Woodwork
  { category: 'Woodwork', value: 750,  description: 'Carved harp of exotic wood with ivory inlay and zircon gems' },
  { category: 'Woodwork', value: 7500, description: 'Jade game board with solid gold playing pieces' },
];
