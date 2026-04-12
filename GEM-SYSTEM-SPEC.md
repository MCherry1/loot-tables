# Gem & Art Object System — Final Spec

*Last updated: April 11, 2026*
*Companion docs: GEM-DESCRIPTORS.md (descriptor tables), GEM-BUDGET-ALGORITHM.md (generation algorithm)*

---

## Design Summary

Gems use a **continuous value system** — each gem type has a natural value range (min to max gp), and individual specimens roll on a log scale within that range. There are no quantized tiers or buckets. Hoards specify a **GP budget** for gems rather than "X gems of tier Y." The system produces naturally varied treasure where most gems are cheap and common, with occasional valuable specimens.

**Value score** (2d4) is rolled independently as quality metadata — it doesn't determine price. It represents how close to its potential a gem is, which matters for the future crafting/jeweler improvement system.

**Art objects** use DMG item lists with value scoring applied (face value ÷ 5 × 2d4).

**Spell components** that require a specific single gem (Identify's pearl, Raise Dead's diamond, etc.) are auto-purchased from gold at fixed rates. Grindable components (diamond dust, ruby dust, etc.) are handled naturally by gem accumulation.

---

## 1. Gem Roster (33 gems)

Each gem has a natural value range, a selection weight, and an organic flag.

| # | Gem | Min | Max | Weight | Organic | Recognition |
|---|-----|-----|-----|--------|---------|-------------|
| 1 | Agate | 1 | 1,500 | 5 | N | Well-known |
| 2 | Alexandrite | 50 | 3,000 | 2 | N | Niche |
| 3 | Amber | 5 | 200 | 3 | Y | Universal |
| 4 | Amethyst | 5 | 300 | 5 | N | Universal |
| 5 | Aquamarine | 20 | 1,500 | 4 | N | Well-known |
| 6 | Black Pearl | 50 | 2,000 | 2 | Y | Well-known |
| 7 | Bloodstone | 2 | 80 | 3 | N | Niche |
| 8 | Carnelian | 2 | 80 | 3 | N | Niche |
| 9 | Citrine | 2 | 120 | 5 | N | Well-known |
| 10 | Coral | 5 | 250 | 2 | Y | Well-known |
| 11 | Diamond | 10 | 100,000 | 8 | N | Universal |
| 12 | Emerald | 50 | 10,000 | 4 | N | Universal |
| 13 | Garnet | 5 | 400 | 5 | N | Universal |
| 14 | Jacinth | 50 | 5,000 | 2 | N | Niche (D&D) |
| 15 | Jade | 10 | 2,000 | 5 | N | Universal |
| 16 | Jet | 2 | 80 | 3 | Y | Niche |
| 17 | Lapis Lazuli | 3 | 100 | 4 | N | Well-known |
| 18 | Malachite | 1 | 50 | 3 | N | Well-known |
| 19 | Moonstone | 5 | 250 | 3 | N | Well-known |
| 20 | Obsidian | 1 | 30 | 3 | N | Universal |
| 21 | Onyx | 5 | 200 | 4 | N | Universal |
| 22 | Opal | 20 | 3,000 | 3 | N | Universal |
| 23 | Pearl | 10 | 500 | 5 | Y | Universal |
| 24 | Peridot | 10 | 400 | 4 | N | Well-known |
| 25 | Quartz | 1 | 150 | 5 | N | Universal |
| 26 | Ruby | 50 | 15,000 | 6 | N | Universal |
| 27 | Sapphire | 50 | 12,000 | 5 | N | Universal |
| 28 | Spinel | 10 | 500 | 4 | N | Niche |
| 29 | Tiger Eye | 1 | 60 | 3 | N | Well-known |
| 30 | Topaz | 10 | 600 | 4 | N | Universal |
| 31 | Tourmaline | 10 | 500 | 4 | N | Niche |
| 32 | Turquoise | 3 | 120 | 4 | N | Universal |
| 33 | Zircon | 5 | 300 | 3 | N | Niche |

15 universally known, 10 well-known, 8 niche. Every color of the rainbow is covered.

**Diamond at weight 8** (~6.5% of all gems) is heaviest because diamonds are genuinely common in the real world and because players need them for grindable spell components (Revivify, Stoneskin, Greater Restoration). Most rolled diamonds are cheap (10–100 gp) due to log-scale clustering.

**Organic gems** (Pearl, Black Pearl, Amber, Coral, Jet) cannot be improved by a gemcutter. They are flagged `improvable: false`.

---

## 2. Value Generation

### Log-Scale Rolling

Each gem's value is rolled on a logarithmic scale between its min and max. This produces a realistic distribution: most specimens cluster near the low end, with rare exceptional ones near the top.

```typescript
function rollGemValue(min: number, max: number): number {
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  const logVal = logMin + Math.random() * (logMax - logMin);
  return applyBinning(Math.pow(10, logVal));
}
```

Example — Diamond (10–100,000 gp): ~40% of rolls land below 100 gp, ~60% below 1,000 gp. A 10,000+ gp diamond is roughly a 1-in-5 roll.

### Binning

Values are rounded to clean numbers appropriate to their scale:

| Value Range | Rounds To | Examples |
|---|---|---|
| < 10 gp | Nearest 1 | 1, 2, 3, 7, 9 |
| 10–99 gp | Nearest 5 | 10, 15, 25, 45, 80 |
| 100–999 gp | Nearest 10 | 100, 130, 250, 670 |
| 1,000–9,999 gp | Nearest 100 | 1,100, 2,300, 5,600 |
| 10,000+ gp | Nearest 1,000 | 12,000, 37,000, 72,000 |

---

## 3. Value Score (Quality Metadata)

After a gem's gold value is determined, roll 2d4 (range 2–8, average 5) for its value score. **This does NOT change the gem's price.** It represents the gem's quality relative to its potential:

| VS | Quality | Meaning |
|---|---|---|
| 2 | Cloudy | Rough, unworked — major improvement potential |
| 3 | Rough | Substantial room for a jeweler |
| 4 | Flawed | Moderate improvement possible |
| 5 | Standard | Some room |
| 6 | Fine | Minor room |
| 7 | Brilliant | Very little room |
| 8 | Flawless | Perfect — cannot be improved |

**Crafting connection (future):** When a jeweler improves a gem's VS, its value increases proportionally toward the gem type's max. A 70 gp amethyst (max 300) with VS 3 has lots of headroom. The same amethyst with VS 7 is near its ceiling. The VS is always calculated and stored even when crafting isn't active.

---

## 4. Descriptors

See **GEM-DESCRIPTORS.md** for complete tables. Summary of how descriptors are generated:

### Size (from value ÷ valueScore)

Size represents the gem's raw material bulk before quality is factored in. This creates an inverse correlation: a large cloudy gem and a tiny flawless gem can be worth the same amount.

```
rawSize = value / valueScore
→ map to percentile within gem's range
→ Tiny / Small / Modest / Sizable / Large / Impressive / Massive
```

### Cut Quality (from valueScore)

The cut SHAPE is random per gem type (oval, cushion, brilliant, cabochon, etc.). The cut EXECUTION depends on VS:

- VS 2–3: "rough", "uncut", "poorly cut"
- VS 4: "asymmetric", "shallow-cut"
- VS 5: standard (no modifier)
- VS 6: "well-proportioned", "cleanly cut"
- VS 7: "expertly cut", "precise"
- VS 8: "exquisite", "masterfully cut"

Organic gems use natural quality terms instead: "misshapen" → "lustrous" → "perfect."

### Color Variants

Most gems have multiple color options rolled randomly (e.g., tourmaline: green, pink, watermelon, blue; sapphire: blue, yellow, pink, green, padparadscha).

### Shaped Forms (non-faceted gems)

Jade, obsidian, lapis lazuli, malachite, onyx, and other traditionally carved gems have expanded shape tables including figurines, seals, circlets, bangles, inlay pieces, ritual blades, etc.

### Legendary Names (top 5% of max value)

Generated from generic templates: "The [Adjective] [Noun]" — e.g., "The Sovereign Heart", "The Twilight Eye." No setting-specific references.

### Example Output

```
Large but poorly cut oval ruby — 820 gp
Tiny exquisite brilliant-cut diamond — 70 gp
Modest standard round white pearl — 85 gp
Impressive but rough emerald-cut emerald — 1,500 gp
Small polished mirror-black obsidian — 12 gp
Sizable standard carved jade figurine — 340 gp
```

---

## 5. Hoard Gem Budgets

See **GEM-BUDGET-ALGORITHM.md** for the full algorithm and simulation results.

### DMG-Derived Budgets

Calculated by multiplying each DMG hoard entry's d100 probability × average gem count × face value, summed across all entries:

| Hoard | CR Range | Gem Budget |
|-------|----------|------------|
| 1 | CR 0–4 | 137 gp |
| 2 | CR 5–10 | 388 gp |
| 3 | CR 11–16 | 3,622 gp |
| 4 | CR 17+ | 8,025 gp |

### Generation Algorithm

1. Start with gem budget
2. Pick a gem type (weighted random; only gems with min ≤ remaining budget eligible)
3. Roll value on log scale between [gem min, min(gem max, remaining budget)]
4. Apply binning
5. Roll 2d4 for value score
6. Generate descriptors (size, quality, cut, color)
7. Subtract value from budget
8. Repeat until budget < 1 gp

### Consolidation

When a hoard produces 15+ gems, the cheapest are consolidated: "Pouch of assorted semi-precious stones (24 gems) — 1,989 gp total." Individual gems above a tier-appropriate detail threshold are always listed.

### Simulation Results

| Tier | Budget | Avg Gems | Character |
|------|--------|----------|-----------|
| CR 0–4 | 137 gp | 6–8 | Mostly tiny cheap stones, occasionally one mid-value piece |
| CR 5–10 | 388 gp | 9–12 | Mix of cheap and mid-range; pearls, rubies start appearing |
| CR 11–16 | 3,622 gp | 25–30 | Big stones (1,000+ gp) with many smaller gems |
| CR 17+ | 8,025 gp | 35–40 | Individual gems worth 2,000–5,000 gp regularly |

---

## 6. Spell Component Auto-Purchase

Completely separate from the gem generation system. Specific high-impact spell components are auto-deducted from gold coin budgets and included as treasure items. No special labeling — a pearl is just a pearl.

### Gated vs. Grindable

**Gated** (need a specific single gem): "a diamond worth at least 500 gp" — these are the ones we auto-purchase.

**Grindable** (dust/powder/plural): "diamonds worth 300 gp", "diamond dust worth 100 gp" — handled naturally by gem accumulation. Diamond at weight 8 ensures steady supply.

Key finding: **Revivify says "diamonds" (plural)** — it's grindable, not gated. Players can combine small diamonds. Same for True Resurrection.

### Auto-Purchase Schedule

| Tier | Component | Exact Value | Frequency | Spell |
|------|-----------|------------|-----------|-------|
| 1 (CR 0–4) | Pearl | 100 gp | Every hoard | Identify (reusable) |
| 2 (CR 5–10) | Diamond | 500 gp | ~2 of 7 hoards | Raise Dead (consumed) |
| 3 (CR 11–16) | Diamond | 1,000 gp | ~2 of 7 hoards | Resurrection (consumed) |
| 4 (CR 17+) | Diamond | 5,000 gp | ~1 of 7 hoards | Gate (reusable) |

Rules:
1. Always exact value — no log-scale rolling, no value score, no quality descriptor
2. Always the specific gem — not a random type
3. Deducted from coin budget before coins are generated
4. Cumulative with normal gem generation — a hoard can have both
5. No spell component labeling in output

### All Other Spell Components

The continuous gem system covers the rest organically:

| Gem | Spell Components Covered | How |
|-----|-------------------------|-----|
| Diamond | Revivify (300, grindable), Stoneskin (100, dust), Greater Restoration (100, dust), Gate (5,000), True Resurrection (25,000, grindable) | Weight 8 + wide range = steady accumulation |
| Ruby | Continual Flame (50, dust), Infernal Calling (999), Forbiddance (1,000, dust), Simulacrum (1,500, dust) | Weight 6 + range to 15,000 |
| Sapphire | Instant Summons (1,000), Sequester (5,000, dust) | Weight 5 + range to 12,000 |
| Emerald | Sequester (5,000, dust) | Range to 10,000 |
| Pearl | Identify (100, but auto-purchased at Tier 1) | Range to 500, shows up organically at higher tiers |
| Jade | Magic Mouth (10, dust), Shapechange (1,500, circlet form) | Range to 2,000, circlet in shape table |
| Onyx | Animate Dead (25), Create Undead (150) | Range covers both |
| Jacinth | Astral Projection (1,000) | Range to 5,000 |
| Opal | Symbol (1,000, with diamond) | Range to 3,000 |
| Agate | Awaken (1,000) | Range extended to 1,500 for this |
| Black Pearl | Circle of Death (500, powder) | Range to 2,000 |

---

## 7. Art Objects

### Decision: DMG Item Lists + Value Scoring

Art objects use the DMG's existing item descriptions (golden locket, silk robe, etc.) but apply value scoring so values aren't flat.

| DMG Face Value | Base (÷5) | 2d4 Range | Average |
|---------------|-----------|-----------|---------|
| 25 gp | 5 | 10–40 gp | 25 gp |
| 250 gp | 50 | 100–400 gp | 250 gp |
| 750 gp | 150 | 300–1,200 gp | 750 gp |
| 2,500 gp | 500 | 1,000–4,000 gp | 2,500 gp |
| 7,500 gp | 1,500 | 3,000–12,000 gp | 7,500 gp |

Display: description + value only. No tier label, no quality label.

Example: *"Gold locket with a painted portrait of a noblewoman — 280 gp"*

Art objects are NOT improvable. The crafting system (future tab) may address artisan tool creation separately.

---

## 8. Data Model

```typescript
interface GemDefinition {
  name: string;
  min: number;              // minimum gp value
  max: number;              // maximum gp value
  weight: number;           // selection probability weight
  organic: boolean;         // true = Pearl, Black Pearl, Jet, Amber, Coral
  improvable: boolean;      // false for organic gems
}

interface RolledGem {
  name: string;
  value: number;            // the gold piece price (after binning)
  valueScore: number;       // 2d4 roll (2–8), quality metadata
  size: string;             // "Tiny" through "Massive"
  quality: string;          // "Cloudy" through "Flawless"
  cut: string;              // "oval-cut", "cabochon", "carved figurine", etc.
  cutQuality: string;       // "poorly cut", "standard", "expertly cut", etc.
  color: string;            // gem-specific color variant
  legendary: string | null; // legendary name if top 5% of max
  improvable: boolean;
}

interface RolledArt {
  description: string;      // DMG item description
  faceValue: number;        // DMG tier value
  value: number;            // (faceValue / 5) × 2d4
}
```

---

## 9. Open Items

**Shipped (April 2026):**
- Value scoring formula, quality labels, ±10% jitter on legacy tier tables, organic-gem flag, hoard spell-component steals — `roller.ts`, `gem-generator.ts`.
- **Continuous log-scale gem roster** (§1, §2) — 33 gems with `{min, max, weight, organic, improvable}` in `src/data/gem-definitions.ts`.
- **Log-scale value rolling + binning** (`GEM-BUDGET-ALGORITHM.md` §3) — `rollGemValue()` and `applyBinning()` in `src/engine/gem-generator.ts`.
- **Budget-loop gem generation** — `generateGemBudget(budget)` in `src/engine/gem-generator.ts`.
- **Descriptor generation** (§4, `GEM-DESCRIPTORS.md` §1-§5) — `generateGemDescriptor()` assembles size / quality / cut / cutQuality / color / legendary and produces a human-readable `description`.
- **Per-creature probability** (`GEM-BUDGET-ALGORITHM.md` §7) — `gemsFromShare()` in `loot-generator.ts` with `GEM_MEANINGFUL_MIN` constants.
- **Art object category system** (§7, `ART-SYSTEM-SPEC.md`) — 10-category roster in `src/data/art-definitions.ts` with `generateArtBudget()` / `generateArtDescriptor()` in `src/engine/art-generator.ts`.
- **UI descriptor rendering** — `EncounterResults.tsx` prefers `description` when present.

**Still outstanding:**
1. **Consolidation:** Fold cheap gems/art into a single "pouch of assorted stones" line when a hoard produces 15+ items. Algorithm design is in `GEM-BUDGET-ALGORITHM.md` §4; not yet implemented.
2. **Per-tier consolidation thresholds:** May need per-tier detail thresholds (e.g. consolidate below 50 gp at CR 11–16, below 500 gp at CR 17+).
3. **Crafting system integration:** Future tab. Gemcutter VS improvement, artisan tool creation, material cost structure. See TASKS.md.
4. **Weight tuning:** Current weights mirror the spec simulation. May need adjustment after playtesting.
