# Gem & Art Object System Spec

*Last updated: April 11, 2026*

---

## 1. Decisions (Locked In)

- **Gems:** Use custom gem roster (with spell-component weighting) on DMG-aligned value tiers
- **Art objects:** Use DMG item lists, but apply value scoring (base = face value ÷ 5, multiply by 2d4)
- **Value scoring:** Universal system — `base × 2d4` — applied to both gems and art objects
- **Gem tiers:** 8 tiers following the DMG's ×5/×2 progression pattern, extending beyond DMG for epic play
- **Jitter:** Small detail modifier on final values (100 gp+) to break up round numbers
- **Quality labels:** Cloudy / Flawed / Standard / Fine / Flawless derived from the 2d4 score
- **Organic gems** (Pearl, Amber, Coral, Jet): Narrower value band concept preserved, not improvable by gemcutter
- **Crafting/improvement:** Future tab, separate from loot — gemcutter tools can improve gem value scores

---

## 2. The 8-Tier System

### ×5/×2 Progression (DMG-aligned)

Tiers 1–6 match the DMG exactly. Tiers 7–8 extend the pattern for epic-tier play and True Resurrection.

| Tier | Face Value | Step | Base (÷5) | 2d4 Range | Average |
|------|-----------|------|-----------|-----------|---------|
| 1 | 10 gp | — | 2 | 4–16 gp | 10 gp |
| 2 | 50 gp | ×5 | 10 | 20–80 gp | 50 gp |
| 3 | 100 gp | ×2 | 20 | 40–160 gp | 100 gp |
| 4 | 500 gp | ×5 | 100 | 200–800 gp | 500 gp |
| 5 | 1,000 gp | ×2 | 200 | 400–1,600 gp | 1,000 gp |
| 6 | 5,000 gp | ×5 | 1,000 | 2,000–8,000 gp | 5,000 gp |
| 7 | 10,000 gp | ×2 | 2,000 | 4,000–16,000 gp | 10,000 gp |
| 8 | 50,000 gp | ×5 | 10,000 | 20,000–80,000 gp | 50,000 gp |

### Value Score Formula

```
base = faceValue / 5
score = roll(2d4)          // range 2–8, average 5
rawValue = base × score    // average = faceValue
```

This replaces the old `5+1d6-1d6` system from the Excel. The 2d4 approach is cleaner:
- Minimum: base × 2 = 40% of face value
- Maximum: base × 8 = 160% of face value
- Average: base × 5 = face value exactly

### Organic Gem Exception

Pearl, Black Pearl, Jet, Amber, and Coral use the same 2d4 formula but are flagged as `improvable: false` for the future crafting system. A gemcutter cannot cut or facet them. Pearls can be polished slightly, but there's no meaningful improvement possible.

---

## 3. Gem Roster

### Current Roster (19 gems from Excel)

Agate, Amethyst, Aquamarine, Citrine, Diamond, Emerald, Garnet, Jacinth, Jade, Jet, Onyx, Opal, Pearl/Black Pearl, Peridot, Quartz, Ruby, Sapphire, Spinel, Topaz, Tourmaline.

### Proposed Expansion (~33 gems)

Adding recognizable gems from the DMG lists plus real-world stones for full color coverage. New additions marked ★. Every color is represented: red (Ruby, Garnet, Carnelian, Bloodstone), blue (Sapphire, Lapis Lazuli, Turquoise, Aquamarine, Zircon), green (Emerald, Jade, Malachite, Peridot, Tourmaline), yellow/gold (Citrine, Topaz, Amber, Tiger Eye), purple (Amethyst), black (Onyx, Jet, Obsidian), white/clear (Quartz, Moonstone, Pearl, Diamond, Opal), orange (Jacinth, Carnelian).

### Spell Component Weighting

Gems that serve as spell components get boosted weights at the tiers matching their spell costs:

| Gem | Spell | Component Cost | Boosted At Tier |
|-----|-------|---------------|-----------------|
| Diamond | Chromatic Orb | 50 gp | Tier 2 |
| Diamond | Nondetection (dust) | 25 gp | Tier 2 |
| Diamond | Glyph of Warding (dust) | 200 gp | Tier 4 |
| Diamond | Revivify | 300 gp | Tier 4 |
| Diamond | Stoneskin (dust) | 250 gp | Tier 4 |
| Diamond | Raise Dead | 500 gp | Tier 4 |
| Diamond | Resurrection | 1,000 gp | Tier 5 |
| Diamond | Clone | 1,000 gp | Tier 5 |
| Diamond | Gate | 5,000 gp | Tier 6 |
| Diamond | Sequester (dust) | 5,000 gp | Tier 6 |
| Diamond | True Resurrection | 25,000 gp | Tier 8 |
| Ruby | Continual Flame (dust) | 50 gp | Tier 2 |
| Ruby | Sequester (dust) | 5,000 gp | Tier 6 |
| Pearl | Identify | 100 gp | Tier 3 |
| Black Pearl | Circle of Death (powder) | 500 gp | Tier 4 |
| Onyx | Animate Dead | 50 gp (×25 for 150 gp) | Tier 3 |
| Jade | Magic Mouth (dust) | 10 gp | Tier 1 |
| Jade | Shapechange (circlet) | 1,500 gp | Tier 5 |
| Jacinth | Astral Projection | 1,000 gp | Tier 5 |
| Sapphire | Sequester (dust) | 5,000 gp | Tier 6 |
| Emerald | Sequester (dust) | 5,000 gp | Tier 6 |
| Opal | Symbol (with diamond) | 1,000 gp | Tier 5 |

### Phase-In/Phase-Out Rules

- **Tiers 1–2 only:** Malachite, Obsidian, Tiger Eye
- **Tiers 1–3 only:** Lapis Lazuli, Turquoise, Carnelian, Bloodstone, Jet
- **Tiers 2–4 only:** Moonstone, Amber, Coral, Zircon
- **Tiers 1–3 → replaced at Tier 4:** Pearl → Black Pearl
- **Tiers 4+ only:** Alexandrite
- **Tiers 5+ only:** Jacinth
- **All tiers:** Diamond, Ruby, Sapphire, Emerald, Agate, Amethyst, Aquamarine, Citrine, Garnet, Jade, Opal, Peridot, Quartz, Spinel, Topaz, Tourmaline

### Proposed Weight Matrix

**bold** = spell component boost. 0 = absent. ★ = new gem.

| # | Gem | Organic? | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 |
|---|-----|----------|----|----|----|----|----|----|----|----|
| 1 | Agate | N | 4 | 4 | 4 | 2 | **15** | 3 | 1 | 1 |
| 2 | Amethyst | N | 4 | 4 | 5 | 5 | 3 | 5 | 1 | 1 |
| 3 | Aquamarine | N | 4 | 4 | 4 | 4 | 3 | 4 | 1 | 1 |
| 4 | Citrine | N | 4 | 4 | 3 | 3 | 2 | 4 | 1 | 1 |
| 5 | Diamond | N | **24** | **20** | 4 | **25** | **25** | **25** | 2 | **5** |
| 6 | Emerald | N | 4 | 4 | 5 | 5 | 3 | **10** | 1 | 1 |
| 7 | Garnet | N | 4 | 4 | 4 | 3 | 0 | 3 | 1 | 1 |
| 8 | Jacinth | N | 0 | 0 | 0 | 0 | **10** | 0 | 1 | 1 |
| 9 | Jade | N | **10** | **10** | 4 | 3 | **8** | 4 | 1 | 1 |
| 10 | Jet | Y | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| 11 | Onyx | N | 4 | 3 | **10** | 2 | 0 | 0 | 1 | 1 |
| 12 | Opal | N | 4 | 4 | 4 | 3 | **5** | 4 | 1 | 1 |
| 13 | Pearl | Y | 4 | 4 | **25** | 0 | 0 | 0 | 0 | 0 |
| 14 | Black Pearl | Y | 0 | 0 | 0 | **15** | 2 | 0 | 0 | 0 |
| 15 | Peridot | N | 4 | 3 | 3 | 2 | 0 | 3 | 1 | 1 |
| 16 | Quartz | N | 3 | 3 | 3 | 2 | 0 | 0 | 1 | 1 |
| 17 | Ruby | N | 4 | **10** | 5 | **10** | **15** | **10** | 1 | 1 |
| 18 | Sapphire | N | 4 | 4 | 5 | 5 | **15** | **10** | 1 | 1 |
| 19 | Spinel | N | 4 | 4 | 4 | 3 | 2 | 4 | 1 | 1 |
| 20 | Topaz | N | 4 | 4 | 5 | 5 | 3 | 5 | 1 | 1 |
| 21 | Tourmaline | N | 4 | 4 | 3 | 3 | 0 | 4 | 1 | 1 |
| 22 | ★ Lapis Lazuli | N | 4 | 3 | 2 | 0 | 0 | 0 | 0 | 0 |
| 23 | ★ Turquoise | N | 4 | 3 | 2 | 0 | 0 | 0 | 0 | 0 |
| 24 | ★ Malachite | N | 3 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| 25 | ★ Obsidian | N | 3 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| 26 | ★ Moonstone | N | 0 | 3 | 4 | 3 | 0 | 0 | 0 | 0 |
| 27 | ★ Amber | Y | 0 | 3 | 3 | 2 | 0 | 0 | 0 | 0 |
| 28 | ★ Coral | Y | 0 | 3 | 3 | 2 | 0 | 0 | 0 | 0 |
| 29 | ★ Alexandrite | N | 0 | 0 | 0 | 3 | 3 | 3 | 1 | 1 |
| 30 | ★ Bloodstone | N | 3 | 3 | 2 | 0 | 0 | 0 | 0 | 0 |
| 31 | ★ Zircon | N | 0 | 3 | 3 | 2 | 0 | 0 | 0 | 0 |
| 32 | ★ Tiger Eye | N | 3 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| 33 | ★ Carnelian | N | 3 | 3 | 2 | 0 | 0 | 0 | 0 | 0 |

---

## 4. Art Objects

### Decision: DMG Item Lists + Value Scoring

Art objects use the DMG's existing item descriptions but apply value scoring so values aren't flat.

| DMG Face Value | Base (÷5) | 2d4 Range | Average |
|---------------|-----------|-----------|---------|
| 25 gp | 5 | 10–40 gp | 25 gp |
| 250 gp | 50 | 100–400 gp | 250 gp |
| 750 gp | 150 | 300–1,200 gp | 750 gp |
| 2,500 gp | 500 | 1,000–4,000 gp | 2,500 gp |
| 7,500 gp | 1,500 | 3,000–12,000 gp | 7,500 gp |

### Display

Description + value only. No mention of the base tier.

Example: *"Gold locket with a painted portrait of a noblewoman — 180 gp"*

### No Improvement Mechanic (for now)

Art objects are NOT improvable in the loot system. The crafting tab (future) may address this separately.

---

## 5. Quality Labels

Derived from the 2d4 score. Cosmetic/narrative — the score already drives the price.

| 2d4 Score | Quality Label | Gemcutter Improvement (Future) |
|-----------|--------------|-------------------------------|
| 2 | Cloudy | Can improve (VS +1d4) |
| 3–4 | Flawed | Can improve (VS +1d3 / +1d2) |
| 5–6 | Standard | Modest improvement possible |
| 7 | Fine | Minor improvement (+1) |
| 8 | Flawless | Cannot be improved further |

Organic gems: no quality label displayed. Art objects: no quality label.

---

## 6. Jitter (Detail Modifier)

Applied after value scoring to break up round numbers. Only for values ≥ 100 gp.

```typescript
function addJitter(value: number): number {
  if (value < 100) return value;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const step = magnitude / 10;
  const jitter = (rollDie(4) - rollDie(4)) * step;  // ±3 steps
  return Math.max(1, value + jitter);
}
```

| Value | Step | Output Range |
|-------|------|-------------|
| 100 gp | 10 gp | 70–130 gp |
| 500 gp | 10 gp | 470–530 gp |
| 1,000 gp | 100 gp | 700–1,300 gp |
| 5,000 gp | 100 gp | 4,700–5,300 gp |
| 10,000 gp | 1,000 gp | 7,000–13,000 gp |
| 50,000 gp | 1,000 gp | 47,000–53,000 gp |

---

## 7. DMG Hoard Integration

### Gem Tier Mapping (2 per hoard tier)

| DMG Hoard | CR Range | Gem Tiers | Key Spell Components |
|-----------|----------|-----------|---------------------|
| Hoard 1 | CR 0–4 | T1–T2 (10, 50 gp) | Chromatic Orb (50gp diamond), Continual Flame (50gp ruby) |
| Hoard 2 | CR 5–10 | T2–T3 (50, 100 gp) | Identify (100gp pearl) |
| Hoard 3 | CR 11–16 | T4–T5 (500, 1000 gp) | Revivify, Raise Dead, Resurrection, Astral Projection |
| Hoard 4 | CR 17+ | T5–T6 (1000, 5000 gp) | Gate, Sequester |
| (Epic) | CR 20+/Epic | T7–T8 (10000, 50000 gp) | True Resurrection |

### Spell Component Steal Entries

Each hoard gets additional entries for spell components that players NEED at that play tier but that the DMG's gem tiers don't naturally provide. These steals have **no value score variance** — the gem is always worth exactly the listed value, and it's always the specific gem type (not a random roll on the tier table). A small amount of coin value is reduced to compensate.

**Hoard 1 (CR 0–4) — 1 steal:**

| Entry | Gem | Exact Value | Spell | Chance | Coin Reduction |
|-------|-----|------------|-------|--------|---------------|
| 100 gp Pearl | Pearl | 100 gp | Identify (lvl 1, reusable) | ~15–20% | Reduce gp from 2d6×10 to ~1d6×10 |

This is the most important steal. Identify uses a 100 gp pearl and is cast nearly every session by wizards. Fortune's Favor (EGW) also uses a 100 gp white pearl (consumed).

**Hoard 2 (CR 5–10) — 2 steals:**

| Entry | Gem | Exact Value | Spell | Chance | Coin Reduction |
|-------|-----|------------|-------|--------|---------------|
| 300 gp Diamond | Diamond | 300 gp | Revivify (lvl 3, consumed) | ~15% | Negligible (~85 gp expected |
| 500 gp Diamond | Diamond | 500 gp | Raise Dead (lvl 5, consumed) | ~8% | from ~3,857 gp total coins) |

Revivify is the most critical consumed spell in the game. Players learn it at level 5 (start of this tier). The 300 gp diamond also satisfies Glyph of Warding ("worth at least 200 gp"). Raise Dead at 500 gp is the next step up. Niche components (1,000 gp Agate for Awaken, 999 gp Ruby for Infernal Calling) are skipped — too niche for dedicated steal slots; they can appear naturally in T5 gems at higher tiers.

**Hoard 3 (CR 11–16) — 1 steal:**

| Entry | Gem | Exact Value | Spell | Chance | Coin Reduction |
|-------|-----|------------|-------|--------|---------------|
| 5,000 gp gem dust (mixed) | Diamond+Emerald+Ruby+Sapphire | 5,000 gp | Sequester (lvl 7, consumed) | ~10% | Negligible (~500 gp expected |
| | | | | | from ~31,500 gp total coins) |

Everything else at this tier (500–1,500 gp components: Resurrection, Simulacrum, Forcecage, Clone) is naturally available in T4–T5 gems. Create Undead's 150 gp Black Onyx fits in T3 range which overlaps from prior hoards.

**Hoard 4 (CR 17+) — 1 steal:**

| Entry | Gem | Exact Value | Spell | Chance | Coin Reduction |
|-------|-----|------------|-------|--------|---------------|
| 25,000 gp Diamond | Diamond | 25,000 gp | True Resurrection (lvl 9, consumed) | ~5% | Negligible (~1,250 gp expected |
| | | | | | from ~322,000 gp total coins) |

The iconic spell gets the iconic steal. Everything else (1,000–5,000 gp: Gate, Astral Projection, Shapechange, Time Ravage) is naturally available in T5–T6.

### Steal Entry Rules

1. Steal entries are **always exact value** — no 2d4 value score, no jitter
2. Steal entries are **always the specific gem** listed — no random tier table roll
3. Steal entries appear as a **d100 percentage chance** per hoard, independent of other gem/art rolls
4. When a steal entry hits, it displaces coin value equivalently (the coin dice are pre-reduced to account for the expected value)
5. Steal entries are **cumulative** — a hoard can produce normal gems AND steal gems in the same roll
6. Display: just the gem and value, no special labeling — "Round white pearl — 100 gp" or "Diamond — 500 gp"

### Hoard Roll Procedure

See GEM-BUDGET-ALGORITHM.md for the full generation algorithm. Summary:
1. Determine gem budget from DMG-derived averages
2. Generate gems using log-scale budget-filling algorithm
3. Each gem gets a type, value, value score, and descriptors

Steal entries roll separately:
1. Roll d100 against steal chance
2. If hit: add exactly 1 of the specific gem at exact value
3. No value score, no quality label — just the gem and its price
4. Output: "Round white pearl — 100 gp"

---

## 8. Code Changes Required

### Bug Fix in roller.ts

Current (wrong):
```typescript
const score = rollDice(2, 4);
const value = Math.round(table.baseValue * (score / 5));
```

Correct:
```typescript
const base = tier.faceValue / 5;
const score = rollDice(2, 4);
const rawValue = base * score;
const finalValue = addJitter(rawValue);
```

### Data Model

```typescript
interface GemDefinition {
  name: string;
  organic: boolean;
  improvable: boolean;
}

interface GemTier {
  tier: number;               // 1–8
  faceValue: number;          // 10, 50, 100, 500, 1000, 5000, 10000, 50000
  entries: { gem: string; weight: number }[];
}

interface RolledGem {
  name: string;
  quality: "Cloudy" | "Flawed" | "Standard" | "Fine" | "Flawless" | null;
  valueScore: number;
  faceValue: number;
  rawValue: number;
  finalValue: number;
  improvable: boolean;
}

interface RolledArt {
  name: string;
  description: string;
  faceValue: number;
  rawValue: number;
  finalValue: number;
}
```

---

## 9. Display Examples

### Gem Output
```
Flawed Diamond — 620 gp
Standard Ruby — 510 gp
Pearl — 38 gp
Cloudy Tourmaline — 8 gp
Flawless Emerald — 8,200 gp
```

### Art Object Output
```
Gold locket with a painted portrait of a noblewoman — 280 gp
Embroidered silk handkerchief — 210 gp
Carved bone statuette with gold inlay — 1,340 gp
```

---

## 10. Open Items

1. **Expanded gem roster sign-off:** 33 gems proposed. Need confirmation on which to keep/cut.
2. **Per-gem value score overrides:** Old Excel had fixed scores at specific tiers. Preserve any with the new 2d4 system, or let everything float?
3. **Tier 7–8 in hoards:** Only in custom Epic Vault hoards, or can per-creature probability drop them at high CR?
4. **Crafting tab design:** Future work. Gemcutter improving value scores, artisan tools creating items. You mentioned uploading your Roll20 crafting system.
