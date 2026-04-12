# Gem Descriptor System

*Companion to GEM-SYSTEM-SPEC.md*

---

## Overview

When a gem is generated, it gets three descriptors assembled automatically:

```
[Size] [Quality] [Cut/Shape] [Gem Name] — [Value] gp
```

Examples:
- "Small cloudy tumbled agate — 3 gp"
- "Sizable fine oval-cut ruby — 820 gp"
- "Impressive flawless brilliant-cut diamond — 12,000 gp"
- "Modest standard round pearl — 85 gp"
- "Large but poorly cut emerald-cut emerald — 1,400 gp"

---

## 1. Size Descriptors

Derived from the gem's "raw material" size — which is `value / valueScore`. This creates an inverse relationship between size and quality at the same price point: a large cloudy gem and a tiny flawless gem can be worth the same amount.

```typescript
// rawSize represents how big the stone is before quality is considered
const rawSize = value / valueScore;
// Then map rawSize to the gem's range to get a percentile
const logMin = Math.log10(gem.min);
const logMax = Math.log10(gem.max);
const logSize = Math.log10(rawSize);
const percentile = (logSize - logMin) / (logMax - logMin);
// percentile → size term
```

| Percentile | Size Term |
|---|---|
| 0–10% | Tiny |
| 10–25% | Small |
| 25–45% | Modest |
| 45–60% | Sizable |
| 60–78% | Large |
| 78–92% | Impressive |
| 92–100% | Massive |

**Example:** A 70 gp diamond with VS 3 → rawSize = 70/3 ≈ 23 → that's large for a cheap diamond. A 70 gp diamond with VS 7 → rawSize = 70/7 = 10 → that's tiny. Same price, different story.

---

## 2. Quality and Cut Quality

The value score (2d4) drives TWO things: the quality label AND the cut quality adjective. The cut SHAPE (oval, cushion, brilliant, etc.) is still rolled randomly from the gem's table, but the cut EXECUTION comes from VS.

### Quality Labels (from VS)

| Value Score | Quality Label | Improvement Headroom |
|---|---|---|
| 2 | Cloudy | Significant (jeweler sees major upside) |
| 3 | Rough | Substantial |
| 4 | Flawed | Moderate |
| 5 | Standard | Some room |
| 6 | Fine | Minor room |
| 7 | Brilliant | Very little room |
| 8 | Flawless | None (ceiling reached) |

### Cut Execution (from VS)

The cut shape is random (oval, cushion, etc.), but how WELL it's cut depends on VS:

| Value Score | Cut Execution | Example Output |
|---|---|---|
| 2–3 | "rough", "uncut", "poorly cut", "crudely shaped" | "Large but poorly cut oval ruby" |
| 4 | "asymmetric", "shallow-cut" | "Sizable asymmetric cushion-cut diamond" |
| 5 | (no modifier — standard execution) | "Modest oval-cut sapphire" |
| 6 | "well-proportioned", "cleanly cut" | "Small well-proportioned emerald-cut emerald" |
| 7 | "expertly cut", "precise" | "Tiny expertly cut brilliant diamond" |
| 8 | "exquisite", "masterfully cut", "museum-quality" | "Small exquisite princess-cut diamond" |

### Organic Gems (Pearl, Amber, Coral, Jet, Black Pearl)

Organic gems have no cut — VS maps to natural quality instead:

| Value Score | Organic Quality | Example |
|---|---|---|
| 2 | "misshapen", "dull" | "Large misshapen pearl" |
| 3 | "irregular", "matte" | "Sizable irregular baroque pearl" |
| 4 | "uneven" | "Modest uneven drop pearl" |
| 5 | (no modifier) | "Modest round pearl" |
| 6 | "smooth", "lustrous" | "Small lustrous round pearl" |
| 7 | "radiant", "luminous" | "Tiny luminous round pearl" |
| 8 | "perfect", "immaculate" | "Tiny perfect round pearl" |

### The Narrative Logic

Size and quality are inversely correlated at the same price. This creates four interesting archetypes:

| Size | Quality | Story | Jeweler's Reaction |
|---|---|---|---|
| Large | Low VS | Big stone, poorly worked | "I can do a LOT with this" |
| Large | High VS | Big AND perfect — jackpot | "This belongs in a crown" |
| Small | Low VS | Tiny and bad — worthless | "Not worth my time" |
| Small | High VS | Tiny but perfect | "Exquisite, but there's nothing to improve" |

The value score is always calculated and stored as metadata, even when the crafting system is not active. The descriptors make it narratively visible without exposing the number.

---

## 3. Cut/Shape Tables (Per Gem Type)

### Faceted Gems (mineral, cuttable)

**Diamond:**
| Roll | Cut |
|---|---|
| 1 | Brilliant-cut |
| 2 | Cushion-cut |
| 3 | Oval-cut |
| 4 | Princess-cut |
| 5 | Pear-cut |
| 6 | Marquise-cut |
| 7 | Rose-cut |
| 8 | Emerald-cut |
| 9 | Round-cut |
| 10 | Rough (uncut) |

Note: "Rough" only appears at value score 2–3. Higher quality implies a proper cut.

**Ruby:**
| Roll | Cut |
|---|---|
| 1 | Oval-cut |
| 2 | Cushion-cut |
| 3 | Cabochon |
| 4 | Round-cut |
| 5 | Pear-cut |
| 6 | Star (cabochon with asterism) |

Star ruby only appears at value score 6+. It's a natural optical effect in fine specimens.

**Sapphire:**
| Roll | Cut |
|---|---|
| 1 | Oval-cut |
| 2 | Cushion-cut |
| 3 | Cabochon |
| 4 | Round-cut |
| 5 | Emerald-cut |
| 6 | Star (cabochon with asterism) |

Same star rule as ruby — value score 6+ only.

**Emerald:**
| Roll | Cut |
|---|---|
| 1 | Emerald-cut |
| 2 | Oval-cut |
| 3 | Cabochon |
| 4 | Pear-cut |
| 5 | Step-cut |

Emerald-cut is traditional and weighted heavier (most common).

**Amethyst:**
| Roll | Cut |
|---|---|
| 1 | Oval-cut |
| 2 | Round-cut |
| 3 | Cushion-cut |
| 4 | Pear-cut |
| 5 | Faceted |

**Aquamarine:**
| Roll | Cut |
|---|---|
| 1 | Emerald-cut |
| 2 | Oval-cut |
| 3 | Cushion-cut |
| 4 | Pear-cut |

**Citrine:**
| Roll | Cut |
|---|---|
| 1 | Oval-cut |
| 2 | Round-cut |
| 3 | Cushion-cut |
| 4 | Faceted |

**Garnet:**
| Roll | Cut |
|---|---|
| 1 | Round-cut |
| 2 | Oval-cut |
| 3 | Cushion-cut |
| 4 | Cabochon |
| 5 | Faceted |

**Topaz:**
| Roll | Cut |
|---|---|
| 1 | Oval-cut |
| 2 | Cushion-cut |
| 3 | Emerald-cut |
| 4 | Pear-cut |
| 5 | Round-cut |

**Tourmaline:**
| Roll | Cut |
|---|---|
| 1 | Emerald-cut |
| 2 | Oval-cut |
| 3 | Cushion-cut |
| 4 | Round-cut |

**Spinel:**
| Roll | Cut |
|---|---|
| 1 | Oval-cut |
| 2 | Cushion-cut |
| 3 | Round-cut |
| 4 | Cabochon |

**Peridot:**
| Roll | Cut |
|---|---|
| 1 | Oval-cut |
| 2 | Round-cut |
| 3 | Cushion-cut |
| 4 | Emerald-cut |

**Alexandrite:**
| Roll | Cut |
|---|---|
| 1 | Cushion-cut |
| 2 | Oval-cut |
| 3 | Round-cut |
| 4 | Cabochon |

Alexandrite always gets an additional note: "shifts from green to red in firelight"

**Zircon:**
| Roll | Cut |
|---|---|
| 1 | Round-cut |
| 2 | Oval-cut |
| 3 | Cushion-cut |

**Moonstone:**
| Roll | Cut |
|---|---|
| 1 | Cabochon |
| 2 | Oval cabochon |
| 3 | Round cabochon |

Moonstone is almost always cabochon to show its adularescence (inner glow).

**Jacinth:**
| Roll | Cut |
|---|---|
| 1 | Oval-cut |
| 2 | Cushion-cut |
| 3 | Round-cut |
| 4 | Brilliant-cut |

**Opal:**
| Roll | Cut |
|---|---|
| 1 | Cabochon |
| 2 | Oval cabochon |
| 3 | Freeform polished |

Opal is never faceted — always cabochon or polished to show play of color. Append variety: "fire opal", "black opal", or "white opal" based on value (black > fire > white).

### Polished / Cabochon Gems (semi-precious, usually not faceted)

**Agate:**
| Roll | Shape |
|---|---|
| 1 | Polished |
| 2 | Tumbled |
| 3 | Cabochon |
| 4 | Carved |
| 5 | Sliced (showing bands) |

Append variety: "banded", "moss", "fire", "eye" — randomly selected.

**Bloodstone:**
| Roll | Shape |
|---|---|
| 1 | Polished |
| 2 | Cabochon |
| 3 | Tumbled |

**Carnelian:**
| Roll | Shape |
|---|---|
| 1 | Polished |
| 2 | Cabochon |
| 3 | Carved |

**Lapis Lazuli:**
| Roll | Shape |
|---|---|
| 1 | Polished |
| 2 | Cabochon |
| 3 | Carved |
| 4 | Tumbled |

**Malachite:**
| Roll | Shape |
|---|---|
| 1 | Polished |
| 2 | Cabochon |
| 3 | Carved |
| 4 | Sliced (showing bands) |

**Obsidian:**
| Roll | Shape |
|---|---|
| 1 | Polished |
| 2 | Tumbled |
| 3 | Carved |
| 4 | Knapped (arrowhead shape) |

**Quartz:**
| Roll | Shape |
|---|---|
| 1 | Polished point |
| 2 | Cabochon |
| 3 | Tumbled |
| 4 | Faceted |
| 5 | Raw crystal |

Append variety: "clear", "smoky", "rose", "star" — star quartz at value score 6+ only.

**Tiger Eye:**
| Roll | Shape |
|---|---|
| 1 | Cabochon |
| 2 | Polished |
| 3 | Tumbled |

**Turquoise:**
| Roll | Shape |
|---|---|
| 1 | Cabochon |
| 2 | Polished |
| 3 | Carved |
| 4 | Tumbled |

**Onyx:**
| Roll | Shape |
|---|---|
| 1 | Polished |
| 2 | Cabochon |
| 3 | Carved |
| 4 | Faceted |

Append: "black onyx" at value score 5+ (spell component quality).

**Jade:**
| Roll | Shape |
|---|---|
| 1 | Polished |
| 2 | Cabochon |
| 3 | Carved |
| 4 | Tumbled |

Append variety: "nephrite" (common, green-gray) or "jadeite" (rarer, vivid green). Jadeite at higher values (top 40% of range). At very high values (1,000+ gp), "imperial jadeite."

### Organic Gems (not cut — natural shapes)

**Pearl:**
| Roll | Shape |
|---|---|
| 1 | Round |
| 2 | Baroque (irregular) |
| 3 | Button |
| 4 | Drop |
| 5 | Oval |

Append color: "white", "cream", "pink", "golden", "silver-gray". No quality adjective (organic rule). Display as: "Modest round white pearl — 85 gp"

**Black Pearl:**
| Roll | Shape |
|---|---|
| 1 | Round |
| 2 | Baroque |
| 3 | Drop |
| 4 | Button |

Always described as black. At very high values: "iridescent black" or "peacock black."

**Amber:**
| Roll | Shape |
|---|---|
| 1 | Polished |
| 2 | Cabochon |
| 3 | Tumbled |
| 4 | Carved |

At value score 6+, append: "with preserved insect" or "with plant inclusion." This is a fun loot detail.

**Coral:**
| Roll | Shape |
|---|---|
| 1 | Polished branch |
| 2 | Cabochon |
| 3 | Carved |
| 4 | Tumbled bead |

Append color: "crimson", "salmon pink", "deep red", "orange-red."

**Jet:**
| Roll | Shape |
|---|---|
| 1 | Polished |
| 2 | Carved |
| 3 | Tumbled |
| 4 | Cabochon |

Always black. At higher values: "deeply polished" or "mirror-black."

---

## 4. Color Variants

Some gems come in multiple colors. Roll for variety:

| Gem | Colors |
|---|---|
| Agate | Banded brown/white, Moss green, Fire (iridescent), Eye (concentric gray), Blue lace |
| Amethyst | Deep purple, Pale violet, Rose (pinkish) |
| Aquamarine | Pale blue, Blue-green, Deep sea blue |
| Citrine | Pale yellow, Golden, Amber-orange |
| Diamond | White (colorless), Pale yellow, Faint blue, Champagne, Smoky gray |
| Emerald | Deep green, Vivid green, Blue-green |
| Garnet | Deep red, Orange (hessonite), Green (tsavorite), Purple (rhodolite) |
| Jade | Pale green, Deep green, White, Lavender |
| Moonstone | Translucent white, Blue sheen, Peach |
| Obsidian | Black, Mahogany (brown-black), Snowflake (with white spots) |
| Opal | White (milky iridescence), Fire (orange-red), Black (dark with vivid play of color) |
| Quartz | Clear, Smoky gray-brown, Rose pink, Milky white |
| Ruby | Blood red, Pinkish red, Deep crimson, Pigeon blood (top quality, value score 7-8 only) |
| Sapphire | Blue, Yellow, Pink, Green, Padparadscha (pink-orange, very rare, value score 7-8 only) |
| Spinel | Red, Blue, Pink, Black |
| Topaz | Golden, Imperial (pink-orange), Blue, White |
| Tourmaline | Green, Pink (rubellite), Watermelon (pink center/green rim), Blue (indicolite) |
| Turquoise | Sky blue, Blue-green, Green (with brown matrix) |
| Zircon | Pale blue, Colorless, Golden |

---

## 5. Legendary Descriptors (Top 5% of a gem's max value)

When a gem's rolled value exceeds 95% of its type's maximum, it gets a legendary name. These are generated from templates — no setting-specific references.

**Name Templates:**

```
"The [Adjective] [Gem]"
"The [Noun] of [Abstract]"
"[Ruler]'s [Gem]"
"The [Color] [Noun]"
"The [Ordinal] [Gem]"
```

**Adjective pool:** Eternal, Radiant, Sovereign, Twilight, Crimson, Azure, Midnight, Golden, Silent, Ancient, Celestial, Abyssal, Imperial, Prismatic, Sunken, Frozen, Burning

**Noun pool:** Heart, Eye, Tear, Crown, Star, Flame, Dream, Throne, Fist, Shard, Beacon, Bloom, Veil, Breath

**Ruler pool:** Emperor's, Queen's, Archon's, Tyrant's, Sage's, Prophet's, Warlord's, Hierophant's, Merchant Prince's

**Abstract pool:** Ages, Shadows, Dawn, Twilight, Storms, Silence, Kings, Depths, Stars, Ruin, Glory, Fortune, Sorrows, Wrath

**Examples of generated legendary names:**
- "The Sovereign Diamond — 'Heart of Ages' — 78,000 gp"
- "The Ancient Ruby — 'The Tyrant's Flame' — 14,200 gp"
- "The Imperial Emerald — 'Tear of Storms' — 9,400 gp"
- "The Radiant Sapphire — 'The Celestial Eye' — 11,000 gp"

---

## 6. Full Output Examples

### Low Tier (CR 0–4, 137 gp budget)
```
Modest tumbled moss agate — 8 gp
Large but poorly cut oval ruby — 55 gp
Tiny lustrous round cream pearl — 15 gp
Small standard cabochon turquoise — 20 gp
Sizable but rough polished quartz — 12 gp
Tiny well-proportioned faceted citrine — 10 gp
Small tumbled obsidian — 3 gp
```

### Mid Tier (CR 5–10, 388 gp budget)
```
Large but rough uncut diamond — 100 gp
Small expertly cut cushion-cut sapphire — 130 gp
Modest standard oval-cut garnet — 45 gp
Sizable but flawed cabochon moonstone — 50 gp
Tiny flawless round white pearl — 40 gp
Small standard polished jade — 20 gp
Tiny luminous drop pearl — 15 gp
```

### High Tier (CR 11–16, 3,622 gp budget)
```
Impressive but rough emerald-cut emerald — 1,500 gp
Small exquisite brilliant-cut diamond — 1,100 gp
Sizable but cloudy oval-cut sapphire — 670 gp
Large standard cushion-cut ruby — 650 gp
Modest well-proportioned cabochon fire opal — 380 gp
Tiny perfect round iridescent black pearl — 280 gp
Pouch of assorted semi-precious stones (18 gems) — 542 gp total
```

### Legendary (CR 17+, 8,025 gp budget)
```
Massive but cloudy oval-cut ruby — "The Crimson Fist" — 4,100 gp
Sizable expertly cut cushion-cut sapphire — 1,100 gp
Impressive standard emerald-cut emerald — 1,600 gp
Large fine brilliant-cut diamond — 1,500 gp
Modest standard oval-cut jacinth — 1,000 gp
Pouch of assorted gems (28 gems) — 1,725 gp total
```

Note the narrative tension: "Massive but cloudy ruby" tells a story. It's huge and valuable, but a jeweler could make it worth much more. "Small exquisite diamond" is the opposite — tiny but perfect, nothing left to improve.

---

## 7. Updated Value Ranges (with spell component coverage)

Two gems needed range increases to cover their spell component costs:

| Gem | Old Range | New Range | Reason |
|---|---|---|---|
| Agate | 1–100 gp | 1–1,500 gp | Awaken requires 1,000 gp agate. Fire agate and exceptional moss agate can genuinely reach this value. |
| Jade | 10–500 gp | 10–2,000 gp | Shapechange requires 1,500 gp jade circlet. Imperial jadeite genuinely commands these prices in real life. |

All other gems already cover their spell component costs within their natural ranges.

### Complete Value Range Table

| # | Gem | Organic? | Min | Max | Spell Component? | Weight |
|---|-----|----------|-----|-----|-----------------|--------|
| 1 | Agate | N | 1 | 1,500 | Awaken (1,000) | 5 |
| 2 | Alexandrite | N | 50 | 3,000 | — | 2 |
| 3 | Amber | Y | 5 | 200 | — | 3 |
| 4 | Amethyst | N | 5 | 300 | — | 5 |
| 5 | Aquamarine | N | 20 | 1,500 | — | 4 |
| 6 | Black Pearl | Y | 50 | 2,000 | Circle of Death (500) | 2 |
| 7 | Bloodstone | N | 2 | 80 | — | 3 |
| 8 | Carnelian | N | 2 | 80 | — | 3 |
| 9 | Citrine | N | 2 | 120 | — | 5 |
| 10 | Coral | Y | 5 | 250 | — | 2 |
| 11 | Diamond | N | 10 | 100,000 | MANY (50–25,000) | 8 |
| 12 | Emerald | N | 50 | 10,000 | Sequester (5,000) | 4 |
| 13 | Garnet | N | 5 | 400 | — | 5 |
| 14 | Jacinth | N | 50 | 5,000 | Astral Projection (1,000) | 2 |
| 15 | Jade | N | 10 | 2,000 | Magic Mouth (10), Shapechange (1,500) | 5 |
| 16 | Jet | Y | 2 | 80 | — | 3 |
| 17 | Lapis Lazuli | N | 3 | 100 | — | 4 |
| 18 | Malachite | N | 1 | 50 | — | 3 |
| 19 | Moonstone | N | 5 | 250 | — | 3 |
| 20 | Obsidian | N | 1 | 30 | — | 3 |
| 21 | Onyx | N | 5 | 200 | Animate Dead (25), Create Undead (150) | 4 |
| 22 | Opal | N | 20 | 3,000 | Symbol (1,000) | 3 |
| 23 | Pearl | Y | 10 | 500 | Identify (100) | 5 |
| 24 | Peridot | N | 10 | 400 | — | 4 |
| 25 | Quartz | N | 1 | 150 | — | 5 |
| 26 | Ruby | N | 50 | 15,000 | Continual Flame (50), Infernal Calling (999), Forbiddance (1,000), Simulacrum (1,500) | 6 |
| 27 | Sapphire | N | 50 | 12,000 | Instant Summons (1,000), Sequester (5,000) | 5 |
| 28 | Spinel | N | 10 | 500 | — | 4 |
| 29 | Tiger Eye | N | 1 | 60 | — | 3 |
| 30 | Topaz | N | 10 | 600 | — | 4 |
| 31 | Tourmaline | N | 10 | 500 | — | 4 |
| 32 | Turquoise | N | 3 | 120 | — | 4 |
| 33 | Zircon | N | 5 | 300 | — | 3 |

**Weight column:** Base probability weight for gem selection. Diamond is heaviest at 8 (most common find, widest range). Ruby at 6 (next most common precious gem). Semi-precious gems at 3–5. Rare/exotic gems (Alexandrite, Jacinth, Black Pearl) at 2.

**Diamond at weight 8** means ~6.5% of all gems found are diamonds. Most will be tiny cheap ones (log-scale clustering toward the low end), but they accumulate — which is exactly what players need for grindable spell components like Revivify, Stoneskin, and Greater Restoration.
