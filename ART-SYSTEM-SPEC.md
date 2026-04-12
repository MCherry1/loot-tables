# Art Object System Spec

*Last updated: April 11, 2026*

---

## Design Summary

Art objects use a **category-based continuous value system** — similar to gems, but organized by craft type (jewelry, metalwork, textile, etc.) rather than mineral type. Each category has a natural value range, and individual pieces roll on a log scale within that range. Hoards specify a GP budget. Descriptors are assembled from material + form + detail pools to generate unique, evocative items.

No value score — art objects are not improvable in the loot system. Crafting is handled separately (future tab, see TASKS.md).

---

## 1. DMG-Derived Art Budgets

| Hoard | CR Range | Art Budget | Gem Budget (for reference) |
|-------|----------|-----------|---------------------------|
| 1 | CR 0–4 | 40 gp | 137 gp |
| 2 | CR 5–10 | 560 gp | 388 gp |
| 3 | CR 11–16 | 2,500 gp | 3,622 gp |
| 4 | CR 17+ | 3,712 gp | 8,025 gp |

Art budgets are smaller than gem budgets at low tiers, roughly comparable at high tiers. Combined treasure (coins + gems + art + magic items) preserves DMG expected values.

---

## 2. Art Categories (10 types)

Each category maps to an artisan tool (for future crafting integration) and has a natural value range reflecting what that craft can produce from cheap tavern-level work to museum-quality masterpieces.

| # | Category | Artisan Tool | Min | Max | Weight |
|---|----------|-------------|-----|-----|--------|
| 1 | Jewelry | Jeweler's Tools | 5 | 50,000 | 8 |
| 2 | Metalwork | Smith's Tools | 3 | 15,000 | 6 |
| 3 | Sculpture | Mason's / Carver's Tools | 2 | 10,000 | 5 |
| 4 | Textile | Weaver's Tools | 1 | 8,000 | 5 |
| 5 | Painting | Painter's Supplies | 5 | 25,000 | 4 |
| 6 | Pottery | Potter's Tools | 1 | 3,000 | 4 |
| 7 | Glasswork | Glassblower's Tools | 2 | 5,000 | 3 |
| 8 | Woodwork | Carpenter's / Carver's Tools | 1 | 5,000 | 4 |
| 9 | Leatherwork | Leatherworker's Tools | 1 | 3,000 | 3 |
| 10 | Calligraphy | Calligrapher's Supplies | 2 | 10,000 | 3 |

**Jewelry at weight 8** (heaviest) because jewelry spans the full value range and is the most portable treasure. A 5 gp copper ring and a 50,000 gp jeweled platinum crown are both jewelry.

**Pottery and Leatherwork** have lower max values — a pot can only be so valuable before it becomes sculpture, and leather degrades.

---

## 3. Descriptor Generation

Each art object is assembled from three pools: **Material**, **Form**, and **Detail**. Materials and details scale with value.

### Output Format

```
[Material] [Form] [Detail] — [value] gp
```

Examples:
- "Copper ring set with a small agate — 8 gp"
- "Silver chalice with floral filigree — 180 gp"
- "Gold-threaded silk tapestry depicting a naval battle — 2,400 gp"
- "Platinum and diamond tiara — 18,000 gp"

---

### Jewelry (5–50,000 gp)

**Materials** (scale with value):
- < 50 gp: copper, brass, bronze, pewter, bone, shell
- 50–500 gp: silver, electrum, polished steel, silver-gilt
- 500–5,000 gp: gold, white gold, rose gold, platinum-plated
- 5,000+ gp: platinum, mithral, adamantine-inlaid

**Forms:**
Ring, necklace, bracelet, brooch, anklet, circlet, crown, tiara, pendant, locket, chain, earrings, hairpin, torc, armband, signet ring, choker, diadem, bangle

**Details** (scale with value):
- < 50 gp: simple, unadorned, with etched patterns, with colored glass
- 50–500 gp: with filigree, set with a [gem], with engraved motifs, with enamel inlay
- 500–5,000 gp: set with [gems], with intricate filigree, with heraldic device, gem-encrusted
- 5,000+ gp: set with large [precious gem], with masterwork filigree, jewel-encrusted, with [legendary gem]

At higher values, the gem reference can pull from the actual gem system for specificity: "Gold ring set with a fine oval-cut sapphire."

---

### Metalwork (3–15,000 gp)

**Materials:**
- < 50 gp: tin, copper, brass, iron, pewter
- 50–500 gp: bronze, silver-plated, electrum
- 500–5,000 gp: silver, gold-plated, gilded bronze
- 5,000+ gp: solid gold, platinum-inlaid, mithral

**Forms:**
Chalice, cup, goblet, ewer, bowl, platter, plate, candlestick, candelabra, mirror, bell, tankard, flask, decanter, censer, brazier, sundial, astrolabe, letter opener

**Details:**
- < 50 gp: with simple designs, dented but serviceable, with maker's mark
- 50–500 gp: with filigree, with gem inlay, with engraved scenes, with animal motifs
- 500–5,000 gp: with precious stone settings, with gold leaf, with religious iconography, with battle scenes
- 5,000+ gp: with jeweled rim, masterwork engraving, with platinum filigree, depicting mythological scenes

---

### Sculpture (2–10,000 gp)

**Materials:**
- < 50 gp: clay, carved bone, soapstone, driftwood, carved antler
- 50–500 gp: carved stone, marble, carved ivory, cast bronze, hardwood
- 500–5,000 gp: fine marble, alabaster, jade, obsidian with gold fittings, silver
- 5,000+ gp: gold, mithral, platinum, jewel-inlaid marble

**Forms:**
Statuette, figurine, idol, bust, relief panel, animal figure, mask, totem, gargoyle, chess piece, bookend, doorknob, fountain piece

**Details:**
- < 50 gp: crude but charming, of a common animal, of a hooded figure
- 50–500 gp: well-proportioned, of a noble figure, of a rearing horse, with fine detail
- 500–5,000 gp: exquisitely detailed, of a dragon, of a deity, with gold inlay, with gem eyes
- 5,000+ gp: lifelike, of a famous hero, with precious metal fittings, museum-quality

**Subjects** (randomly selected):
A warrior, a dragon, a praying figure, a dancing maiden, a rearing horse, a coiled serpent, a roaring lion, an eagle in flight, a kneeling knight, a seated king, a mythological beast, a mother and child, a hooded figure, a sleeping cat, a leaping fish, a howling wolf, an owl, a skull, a tree of life, clasped hands

---

### Textile (1–8,000 gp)

**Materials:**
- < 50 gp: wool, linen, hemp, dyed cotton
- 50–500 gp: fine wool, silk, brocade, velvet
- 500–5,000 gp: silk with gold thread, cloth-of-gold, silver-threaded velvet
- 5,000+ gp: cloth-of-platinum, mithral-threaded silk, gem-studded fabric

**Forms:**
Tapestry, rug, carpet, banner, pennant, robe, vestments, cloak, mantle, sash, handkerchief, gloves, tabard, altar cloth, wall hanging, bed canopy, cushion cover, purse, belt

**Details:**
- < 50 gp: with simple geometric patterns, faded but intact, with dye stains
- 50–500 gp: with heraldic design, depicting a forest scene, with gold embroidery, with tassels
- 500–5,000 gp: depicting a battle scene, depicting a royal court, with jeweled clasps, with pearl buttons
- 5,000+ gp: depicting a legendary event, with precious gem buttons, masterwork weaving, with mithral thread

**Scenes** (for tapestries/paintings, randomly selected):
A great battle, a royal coronation, a dragon's lair, a forest hunt, a ship at sea, a mountain fortress, a celestial sky, a feast in a great hall, a wizard's tower, a holy pilgrimage, a market scene, a heroic last stand, an underwater kingdom, a desert caravan, a volcanic eruption, a peaceful village, an ancient ruins landscape

---

### Painting (5–25,000 gp)

**Materials:**
- < 50 gp: charcoal on parchment, watercolor on paper, chalk sketch
- 50–500 gp: oil on canvas, tempera on wood panel, ink wash on silk
- 500–5,000 gp: oil on canvas in gilded frame, masterwork oils, illuminated panel
- 5,000+ gp: oil on canvas in gem-studded frame, ancient masterwork, legendary painting

**Forms:**
Portrait, landscape, battle scene, religious icon, still life, allegorical scene, map/chart, mural fragment, miniature portrait (in locket), triptych panel, ceiling panel fragment

**Details:**
- < 50 gp: faded but recognizable, by an unknown artist, roughly done, partially damaged
- 50–500 gp: well-preserved, vivid colors, by a regional artist, in a carved frame
- 500–5,000 gp: strikingly detailed, by a renowned artist, in a gilded frame, remarkably preserved
- 5,000+ gp: by a legendary master, in a jeweled frame, of historical significance, breathtaking

**Subjects** (same pool as Sculpture scenes, plus):
A noble family portrait, a king on his throne, a maiden with flowers, a scholar in a library, a monk in contemplation, a merchant ship, a distant city

---

### Pottery (1–3,000 gp)

**Materials:**
- < 50 gp: earthenware, terracotta, stoneware, fired clay
- 50–500 gp: fine porcelain, glazed ceramic, white stoneware
- 500+ gp: celadon, eggshell porcelain, imperial-grade ceramic, gold-lustered

**Forms:**
Vase, urn, bowl, plate, jug, amphora, teapot, tile (decorative), incense burner, figurine, jar, lamp

**Details:**
- < 50 gp: with simple glaze, chipped but intact, with thumbprint marks
- 50–500 gp: with painted scene, with intricate glaze patterns, with animal handles
- 500+ gp: with gold-leaf accents, museum-quality glaze, with precious metal rim, translucent

---

### Glasswork (2–5,000 gp)

**Materials:**
- < 50 gp: colored glass, bottle glass, crude blown glass
- 50–500 gp: fine crystal, frosted glass, stained glass
- 500+ gp: leaded crystal, precious metal-caged glass, enchantment-quality crystal

**Forms:**
Bottle, vase, ornament, prism, lens, drinking glass, goblet, window panel (stained glass), paperweight, perfume bottle, figurine, chandelier piece, mosaic tile set

**Details:**
- < 50 gp: with air bubbles, asymmetric but charming, in a single color
- 50–500 gp: with swirled colors, precisely shaped, with etched designs, multi-colored
- 500+ gp: flawless clarity, with gold filigree cage, depicting a scene in stained glass, prismatic

---

### Woodwork (1–5,000 gp)

**Materials:**
- < 50 gp: pine, oak, ash, birch, common hardwood
- 50–500 gp: mahogany, ebony, teak, rosewood, exotic hardwood
- 500+ gp: petrified wood, ironwood, darkwood, gold-inlaid exotic wood

**Forms:**
Carved box, chess set, game board, instrument (lute, harp, flute, drum), pipe, comb, holy symbol, walking stick, picture frame, bookends, jewelry box, trinket box, dice set, fan, mask

**Details:**
- < 50 gp: with simple carving, worn but sturdy, with brass fittings
- 50–500 gp: with intricate carving, with ivory inlay, with silver fittings, depicting animals
- 500+ gp: with gold fittings, with gem inlay, masterwork carving, with platinum hinges

---

### Leatherwork (1–3,000 gp)

**Materials:**
- < 50 gp: cowhide, pigskin, goatskin
- 50–500 gp: deerskin, snakeskin, fine calfskin, dyed leather
- 500+ gp: dragon hide, wyvern skin, exotic reptile hide, gold-tooled

**Forms:**
Book cover, journal, scabbard, belt, pouch, satchel, map case, quiver, saddle, shield cover, scroll case, coin purse, gloves, boots (decorative), mask, bracer

**Details:**
- < 50 gp: with simple tooling, with brass buckle, dyed a single color
- 50–500 gp: with embossed design, with silver clasps, with dyed patterns, with stitched motifs
- 500+ gp: with gold tooling, with gem-set clasps, masterwork stitching, with platinum fittings

---

### Calligraphy (2–10,000 gp)

**Materials:**
- < 50 gp: common ink on parchment, chalk on slate, charcoal on vellum
- 50–500 gp: fine ink on vellum, gold-leaf letters on parchment, painted borders
- 500+ gp: illuminated manuscript pages, precious ink on dragonhide, platinum-leaf script

**Forms:**
Illuminated manuscript page, map, letter of marque, royal decree (copy), prayer scroll, poetry collection, spell formula (non-magical), heraldic chart, genealogy, bestiary page, historical chronicle, musical score, alchemical recipe, navigational chart

**Details:**
- < 50 gp: faded but legible, in a common tongue, with simple borders
- 50–500 gp: with illuminated capitals, with gold-leaf borders, in an ancient script, with illustrated margins
- 500+ gp: with gem-dust ink, masterwork illumination, with mythological illustrations, museum-quality preservation

---

## 4. Generation Algorithm

Identical to gems (see GEM-BUDGET-ALGORITHM.md):

1. Start with art budget
2. Pick a category (weighted random; only categories with min ≤ remaining budget)
3. Roll value on log scale between [min, min(max, remaining)]
4. Apply binning (same rules as gems)
5. Generate descriptors: pick material (scaled to value), form (random), detail (scaled to value)
6. Subtract from budget, repeat until budget < 1 gp

### Per-Creature Integration

Same probability system as gems:

```
perCreatureShare = totalArtValue × (creatureXP / tierTotalXP)
probability = perCreatureShare / meaningfulMinimum
```

Art meaningful minimums are slightly lower than gems (art objects are more common at low values):

| Tier | Meaningful Minimum |
|------|-------------------|
| 1 (CR 0–4) | 50 gp |
| 2 (CR 5–10) | 200 gp |
| 3 (CR 11–16) | 1,000 gp |
| 4 (CR 17+) | 3,000 gp |

### Consolidation

Same 15-gem threshold applies. Low-value art objects consolidated as: "A collection of small decorative objects (12 pieces) — 340 gp total"

---

## 5. Evocative Description Assembly

The generator should aim for DMG-quality specificity. Instead of just "[material] [form] [detail]", combine elements into mini-narratives:

**Generic (avoid):** "Gold ring with a gem"
**Evocative (aim for):** "Gold signet ring bearing a dragon crest, set with a single blood-red garnet"

### Assembly Rules

1. **Add a subject/motif** when the form supports it: combs get animal shapes, brooches get heraldic devices, tapestries get scenes, sculptures get subjects
2. **Name the gem specifically** when jewelry or metalwork references gems — pull from the gem roster: "set with a cabochon moonstone" not "set with a gem"
3. **Add a functional hint** when possible: "ceremonial dagger" not just "dagger", "prayer scroll" not just "scroll", "merchant's ledger" not just "book"
4. **Keep it to one sentence** — evocative but scannable in a loot list

### Motifs Pool (for decorative elements)

Animals: dragon, lion, serpent, eagle, wolf, stag, raven, owl, phoenix, griffin, unicorn, bear, hawk, fish, spider, horse, swan, turtle, boar, fox

Heraldic: crossed swords, crown and scepter, shield and lance, tower, tree of life, rising sun, crescent moon, star, anchor, key, hammer and anvil, scales of justice, open hand, closed fist

Nature: vine and leaf, thorned rose, oak branch, flowering tree, wave pattern, mountain peak, flame motif, snowflake, cloud and lightning, wheat sheaf

Religious/Mystical: holy symbol, prayer beads, all-seeing eye, celestial sigil, arcane runes, ouroboros, angel wings, demon face, skull and bones, hourglass

### Scene Pool (for paintings, tapestries, murals — expanded to 40+)

Epic: A great battle between armies, a dragon's assault on a castle, a ship in a terrible storm, a volcanic eruption consuming a city, a titan wrestling a kraken, a siege of a mountain fortress

Noble: A royal coronation ceremony, a king holding court, a noble wedding feast, a knight receiving accolades, a merchant prince's banquet, a duke's hunting party

Pastoral: A peaceful village at harvest time, a shepherd in rolling hills, a fishing village at dawn, a market day in a small town, monks tending a garden, children playing by a river

Mythological: A goddess emerging from the sea, a hero slaying a hydra, angels descending from clouds, a wizard opening a portal, the creation of the world, a phoenix rising from flames

Adventure: A party of adventurers entering a dungeon, a rogue picking a lock, a wizard in a tower library, a ranger tracking through a forest, a paladin facing undead, a bard performing for a crowd

Dark: A ruined city overgrown with vines, a cemetery at midnight, a shadowy figure on a throne, a ghost ship on a fog-bound sea, a battlefield aftermath with crows, a lonely watchtower in rain

---

## 6. Output Examples (with evocative descriptions)

### Low Tier (CR 0–4, 40 gp budget)
```
Copper ring engraved with a coiled serpent — 8 gp
Terracotta jug with a simple harvest-scene glaze — 5 gp
Charcoal sketch of a harbor at dawn on parchment — 7 gp
Dyed wool sash with geometric border stitching — 4 gp
Pine pipe carved in the shape of a dragon's head — 6 gp
Pewter candlestick with a maker's mark shaped like a hammer — 10 gp
```

### Mid Tier (CR 5–10, 560 gp budget)
```
Silver pendant shaped like a crescent moon, set with a small cabochon moonstone — 240 gp
Oil painting of a merchant ship at full sail in a carved oak frame — 130 gp
Fine porcelain teapot with painted herons and gold-leaf rim — 90 gp
Embossed calfskin journal with silver wolf-head clasps — 55 gp
Rosewood lute with ivory pegs and mother-of-pearl inlay — 45 gp
```

### High Tier (CR 11–16, 2,500 gp budget)
```
Gold choker set with a row of matched oval-cut sapphires — 1,100 gp
Silk wall hanging with gold thread depicting a royal coronation — 580 gp
Alabaster bust of a stern-faced general with obsidian eyes — 420 gp
Leaded crystal decanter etched with a vineyard scene, gold stopper — 250 gp
Illuminated bestiary page with gold-leaf borders and vivid painted wyvern — 150 gp
```

### Legendary (CR 17+, 3,712 gp budget)
```
Platinum diadem set with a large cushion-cut emerald and diamond accents — 1,600 gp
Masterwork oil painting of a dragon's assault on a castle, in a gilded frame — 950 gp
Gold censer with platinum filigree depicting celestial sigils — 520 gp
Cloth-of-gold ceremonial tabard embroidered with a phoenix in silver thread — 380 gp
Ironwood chess set with gold and silver pieces, board inlaid with jet and ivory — 262 gp
```

---

## 6. DMG Named Items

The 48 DMG art objects are included as "named" entries within their categories. When the generator produces an item in the matching category and value range, there is a small chance (~10%) it produces the DMG item verbatim instead of assembling a description. This prevents duplicate one-of-a-kind items — each named item can only appear once per hoard.

### Jewelry (14 DMG items)
| Value Range | DMG Item |
|---|---|
| ~25 gp | Small gold bracelet |
| ~25 gp | Gold locket with a painted portrait inside |
| ~250 gp | Gold ring set with bloodstones |
| ~250 gp | Large gold bracelet |
| ~250 gp | Silver necklace with a gemstone pendant |
| ~250 gp | Bronze crown |
| ~750 gp | Silver and gold brooch |
| ~2,500 gp | Fine gold chain set with a fire opal |
| ~2,500 gp | Platinum bracelet set with a sapphire |
| ~2,500 gp | Jeweled anklet |
| ~2,500 gp | Gold circlet set with four aquamarines |
| ~2,500 gp | A necklace string of small pink pearls |
| ~7,500 gp | Jeweled gold crown |
| ~7,500 gp | Jeweled platinum ring |

### Metalwork (7 DMG items)
| Value Range | DMG Item |
|---|---|
| ~25 gp | Silver ewer |
| ~25 gp | Copper chalice with silver filigree |
| ~250 gp | Brass mug with jade inlay |
| ~750 gp | Silver chalice set with moonstones |
| ~750 gp | Bottle stopper cork embossed with gold leaf and set with amethysts |
| ~7,500 gp | Gold cup set with emeralds |
| ~7,500 gp | Bejeweled ivory drinking horn with gold filigree |

### Sculpture (6 DMG items)
| Value Range | DMG Item |
|---|---|
| ~25 gp | Carved bone statuette |
| ~250 gp | Carved ivory statuette |
| ~250 gp | Box of turquoise animal figurines |
| ~750 gp | Small gold idol |
| ~750 gp | Obsidian statuette with gold fittings and inlay |
| ~7,500 gp | Small gold statuette set with rubies |

### Textile (7 DMG items)
| Value Range | DMG Item |
|---|---|
| ~25 gp | Cloth-of-gold vestments |
| ~25 gp | Black velvet mask stitched with silver thread |
| ~25 gp | Embroidered silk handkerchief |
| ~250 gp | Silk robe with gold embroidery |
| ~250 gp | Large well-made tapestry |
| ~2,500 gp | Embroidered silk and velvet mantle set with numerous moonstones |
| ~2,500 gp | Embroidered glove set with jewel chips |

### Painting (2 DMG items)
| Value Range | DMG Item |
|---|---|
| ~25 gp | Small mirror set in a painted wooden frame |
| ~2,500 gp | Old masterpiece painting |

### Woodwork (2 DMG items)
| Value Range | DMG Item |
|---|---|
| ~750 gp | Carved harp of exotic wood with ivory inlay and zircon gems |
| ~7,500 gp | Jade game board with solid gold playing pieces |

### Metalwork/Mask (3 DMG items)
| Value Range | DMG Item |
|---|---|
| ~750 gp | Gold dragon comb set with red garnets as eyes |
| ~750 gp | Painted gold war mask |
| ~2,500 gp | Eye patch with a mock eye set in blue sapphire and moonstone |

### Weapon (2 DMG items)
| Value Range | DMG Item |
|---|---|
| ~750 gp | Silver-plated steel longsword with jet set in hilt |
| ~750 gp | Ceremonial electrum dagger with a black pearl in the pommel |

### Music (2 DMG items)
| Value Range | DMG Item |
|---|---|
| ~2,500 gp | Gold music box |

### Container (3 DMG items)
| Value Range | DMG Item |
|---|---|
| ~250 gp | Gold bird cage with electrum filigree |
| ~7,500 gp | Gold jewelry box with platinum filigree |
| ~7,500 gp | Painted gold child's sarcophagus |

### Game/Curiosity (1 DMG item)
| Value Range | DMG Item |
|---|---|
| ~25 gp | Pair of engraved bone dice |

---

## 7. Crafting Integration (Future — see TASKS.md)

Each category maps to an artisan tool. The crafting system will allow players to:

**Requirements for crafting art objects:**
- **Tool proficiency:** Must be proficient with the relevant artisan tools
- **Raw materials:** Value of materials scales with intended piece value (roughly 50% of target value)
- **Skill check:** Artisan tool check determines quality/execution — higher roll = closer to target value
- **Renown:** Higher-tier pieces (500+ gp) require the crafter to have established reputation — sold X pieces, completed commissions, been recognized by a guild. This gates progression naturally
- **Time:** More valuable pieces take longer to craft

**Revenue model:**
- Crafted art sells at market value in appropriate markets
- A dwarven metalwork piece sells better in a dwarven city
- A painting sells better in a wealthy human court
- Haggling mechanics apply (same as gem/item haggling from the Value Score system)
- Renown builds with each successful sale, unlocking access to higher-value commissions

**Key difference from gems:** No "improvement" mechanic. You create a new piece from scratch, not upgrade an existing one. A painter doesn't improve someone else's painting — they make their own. A smith doesn't improve a chalice — they forge a new one.

This is separate from the loot generation system. Art objects found as loot are finished pieces — their value is what it is.

---

## 7. Data Model

```typescript
interface ArtCategory {
  name: string;
  artisanTool: string;
  min: number;
  max: number;
  weight: number;
  materials: { maxValue: number; options: string[] }[];  // scaled by value
  forms: string[];
  details: { maxValue: number; options: string[] }[];    // scaled by value
}

interface RolledArt {
  category: string;
  material: string;
  form: string;
  detail: string;
  description: string;       // assembled: "[material] [form] [detail]"
  value: number;
  artisanTool: string;
}
```

---

## 8. Open Items

1. **Scene/subject pools:** The scenes table (battles, coronations, forests, etc.) needs expansion — currently ~25 entries. Could easily be 50+.
2. **Cultural flavor:** Could add regional style modifiers (dwarven metalwork, elven silk, orcish bone carving) but keeping generic for now.
3. **Interaction with gem system:** High-value jewelry and metalwork reference gems in their descriptions. Could pull from the actual gem roster for specificity.
4. **DMG item inclusion:** The 48 DMG art items could be included as "named" entries — when the system generates a 25 gp jewelry piece, there's a small chance it's specifically "Gold locket with a painted portrait inside" verbatim from the DMG.
