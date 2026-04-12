# Gem Budget Generation Algorithm

*Companion to GEM-SYSTEM-SPEC.md and GEM-DESCRIPTORS.md*

---

## 1. DMG-Derived Gem Budgets

Calculated by multiplying each DMG hoard gem entry's d100 probability × average count × face value, summed across all entries.

| Hoard | CR Range | Chance of Any Gems | Expected Gem Value | Gem Budget |
|-------|----------|-------------------|-------------------|------------|
| 1 | CR 0–4 | 60% | 137 gp | **137 gp** |
| 2 | CR 5–10 | 49% | 388 gp | **388 gp** |
| 3 | CR 11–16 | 46% | 3,622 gp | **3,622 gp** |
| 4 | CR 17+ | 49% | 8,025 gp | **8,025 gp** |

These budgets represent the average total gem value a hoard produces in the DMG system. Our system always produces gems (no "chance of gems" gate — gems are treated like money), so these are flat budgets.

Note: The per-creature encounter system fractionalizes these budgets by XP, so individual creatures contribute a proportional gem budget based on their CR.

---

## 2. Gem Roster (33 gems)

Each gem has a natural value range, a base selection weight, and an organic flag.

| # | Gem | Min | Max | Weight | Organic | Spell Component Coverage |
|---|-----|-----|-----|--------|---------|-------------------------|
| 1 | Agate | 1 | 1,500 | 5 | N | Awaken (1,000) |
| 2 | Alexandrite | 50 | 3,000 | 2 | N | — |
| 3 | Amber | 5 | 200 | 3 | Y | — |
| 4 | Amethyst | 5 | 300 | 5 | N | — |
| 5 | Aquamarine | 20 | 1,500 | 4 | N | — |
| 6 | Black Pearl | 50 | 2,000 | 2 | Y | Circle of Death (500) |
| 7 | Bloodstone | 2 | 80 | 3 | N | — |
| 8 | Carnelian | 2 | 80 | 3 | N | — |
| 9 | Citrine | 2 | 120 | 5 | N | — |
| 10 | Coral | 5 | 250 | 2 | Y | — |
| 11 | Diamond | 10 | 100,000 | 8 | N | Many (50–25,000) |
| 12 | Emerald | 50 | 10,000 | 4 | N | Sequester (5,000) |
| 13 | Garnet | 5 | 400 | 5 | N | — |
| 14 | Jacinth | 50 | 5,000 | 2 | N | Astral Projection (1,000) |
| 15 | Jade | 10 | 2,000 | 5 | N | Magic Mouth (10), Shapechange (1,500) |
| 16 | Jet | 2 | 80 | 3 | Y | — |
| 17 | Lapis Lazuli | 3 | 100 | 4 | N | — |
| 18 | Malachite | 1 | 50 | 3 | N | — |
| 19 | Moonstone | 5 | 250 | 3 | N | — |
| 20 | Obsidian | 1 | 30 | 3 | N | — |
| 21 | Onyx | 5 | 200 | 4 | N | Animate Dead (25), Create Undead (150) |
| 22 | Opal | 20 | 3,000 | 3 | N | Symbol (1,000) |
| 23 | Pearl | 10 | 500 | 5 | Y | Identify (100) |
| 24 | Peridot | 10 | 400 | 4 | N | — |
| 25 | Quartz | 1 | 150 | 5 | N | — |
| 26 | Ruby | 50 | 15,000 | 6 | N | Continual Flame (50), Infernal Calling (999), Forbiddance (1,000), Simulacrum (1,500) |
| 27 | Sapphire | 50 | 12,000 | 5 | N | Instant Summons (1,000), Sequester (5,000) |
| 28 | Spinel | 10 | 500 | 4 | N | — |
| 29 | Tiger Eye | 1 | 60 | 3 | N | — |
| 30 | Topaz | 10 | 600 | 4 | N | — |
| 31 | Tourmaline | 10 | 500 | 4 | N | — |
| 32 | Turquoise | 3 | 120 | 4 | N | — |
| 33 | Zircon | 5 | 300 | 3 | N | — |

**Diamond at weight 8** (highest) means ~6.5% of all gems are diamonds. Most will be small and cheap due to log-scale rolling, but they accumulate — naturally feeding grindable spell components (Revivify, Stoneskin, Greater Restoration).

---

## 3. Algorithm

### Step-by-Step

```
INPUT: gemBudget (gp)

1. remaining = gemBudget
2. gems = []
3. WHILE remaining >= 1 gp:
   a. Filter gem roster to gems whose min_value <= remaining
   b. If no eligible gems: break
   c. Pick a gem type via weighted random (using base weights)
   d. Cap the gem's max_value at remaining budget
   e. Roll value on LOG SCALE between [min_value, capped_max]
   f. Apply binning to get a clean number
   g. Roll 2d4 for value score (quality metadata, independent of price)
   h. Subtract gem value from remaining
   i. Add gem to results
4. RETURN gems
```

### Log-Scale Value Rolling

```typescript
function rollGemValue(min: number, max: number): number {
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  const logVal = logMin + Math.random() * (logMax - logMin);
  const raw = Math.pow(10, logVal);
  return applyBinning(raw);
}
```

This produces a log-normal distribution: most gems cluster near the low end of their range, with rare specimens at the top. A diamond (10–100,000 gp) will usually roll 10–100 gp, occasionally 100–1,000 gp, and rarely above 1,000 gp.

### Binning Rules

Clean numbers appropriate to scale — no "7.3 gp gems."

```typescript
function applyBinning(value: number): number {
  if (value < 10) return Math.max(1, Math.round(value));
  if (value < 100) return Math.round(value / 5) * 5;
  if (value < 1000) return Math.round(value / 10) * 10;
  if (value < 10000) return Math.round(value / 100) * 100;
  return Math.round(value / 1000) * 1000;
}
```

| Value Range | Rounds To | Examples |
|---|---|---|
| < 10 gp | Nearest 1 | 1, 2, 3, 7, 9 |
| 10–99 gp | Nearest 5 | 10, 15, 25, 45, 80 |
| 100–999 gp | Nearest 10 | 100, 130, 250, 670 |
| 1,000–9,999 gp | Nearest 100 | 1,100, 2,300, 5,600 |
| 10,000+ gp | Nearest 1,000 | 12,000, 37,000, 72,000 |

---

## 4. Consolidation

At higher tiers, the algorithm can produce 30–60+ gems per hoard. To keep output readable:

**If gem count > 15:** combine the cheapest gems into a summary line.

```
Hoard output:
  Brilliant ruby — 2,600 gp
  Standard sapphire — 1,100 gp
  Rough jacinth — 1,000 gp
  Flawless ruby — 310 gp
  ... (8 more listed individually)
  Pouch of assorted semi-precious stones (24 gems) — 1,989 gp total
```

The consolidation threshold (15) can be adjusted. Individual gems above a "detail threshold" (e.g., 100 gp at CR 11–16, 500 gp at CR 17+) are always listed individually. Everything below is consolidated into the pouch.

---

## 5. Spell Component Auto-Purchase

Separate from the gem generation. Specific high-impact spell components are auto-deducted from the gold coin budget and included as exact-value line items.

| Tier | Component | Gem | Exact Value | Frequency | Spell |
|------|-----------|-----|------------|-----------|-------|
| 1 | Pearl | Pearl | 100 gp | Every hoard (1/1) | Identify (reusable) |
| 2 | Diamond | Diamond | 500 gp | ~2 out of 7 hoards | Raise Dead (consumed) |
| 3 | Diamond | Diamond | 1,000 gp | ~2 out of 7 hoards | Resurrection (consumed) |
| 4 | Diamond | Diamond | 5,000 gp | 1 out of 7 hoards | Gate (reusable) |

These are NOT generated by the gem algorithm. They are flat deductions from gold with no variance, no value score, no quality label. Output tagged as "(spell component)."

All other spell components (grindable dust, niche spells) are handled naturally by the gem system — diamonds accumulate due to their high weight, and the continuous value range means any gem CAN roll into spell component territory organically.

---

## 6. Simulation Results

Tested with 10 hoards per tier. Key metrics:

| Tier | Budget | Avg Gems | Avg Value | Budget Match |
|------|--------|----------|-----------|-------------|
| CR 0–4 | 137 gp | 8.0 | 137 gp | ✓ exact |
| CR 5–10 | 388 gp | 11.5 | 388 gp | ✓ exact |
| CR 11–16 | 3,622 gp | 26.8 | 3,622 gp | ✓ exact |
| CR 17+ | 8,025 gp | 37.2 | 8,025 gp | ✓ exact |

The algorithm always exhausts the budget (leftover < 1 gp). Value matching is exact by construction — gems are generated until the budget is spent.

### Character of Output by Tier

**CR 0–4:** Mostly tiny stones (agate, quartz, obsidian, tiger eye) worth 1–10 gp each. Occasionally one mid-value piece (50–120 gp pearl, amethyst, or garnet) that dominates the hoard. Feels like picking through a goblin's pockets.

**CR 5–10:** Mix of cheap and mid-range. Rubies, sapphires, emeralds start appearing at 50–500 gp. Pearls naturally land in the 50–120 gp Identify range. Diamonds appear but are usually small (10–100 gp). A bandit lord's strongbox.

**CR 11–16:** Big stones start appearing — 1,000+ gp rubies and sapphires, diamonds in the hundreds to low thousands. Still padded with many smaller gems. A dragon's hoard starting to feel real.

**CR 17+:** Individual gems worth 2,000–5,000 gp are common. Diamonds in the 500–1,500 gp range appear regularly, naturally feeding Resurrection/Clone needs. Occasionally a single gem dominates (4,000+ gp). Ancient wyrm territory.

### Observed Patterns

- Log-scale produces 1–3 "anchor" gems per hoard that consume 30–60% of the budget, surrounded by many small gems filling the rest
- Diamond appears in most hoards due to weight 8, but usually as cheap chips (10–100 gp)
- Precious gems (ruby, sapphire, emerald) appear less frequently but at higher individual values
- Organic gems (pearl, amber, coral, jet) appear at appropriate rates and values
- No two hoards look alike — high variance in composition, consistent in total value
