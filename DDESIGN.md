# D&Design

The math and systems behind the loot generator. This section is for DMs who want to understand the engine, verify the numbers, or tweak the system for their campaign.

### Budget Formula

```
full_budget = XP × GP_PER_XP[tier] × APL_adjustment × (4 / party_size)
role_budget = full_budget × ROLE_MULTIPLIER[role]
```

### GP/XP Ratios

Derived from the DMG's expected hoard totals divided by total XP earned across each tier:

| Tier | Levels | Hoards | Avg Hoard | Total Treasure | Total XP | GP/XP |
|------|--------|--------|-----------|----------------|----------|-------|
| 1 | 1-4 | 7 | 1,077 gp | 7,540 gp | 26,000 | 0.2900 |
| 2 | 5-10 | 18 | 7,419 gp | 133,544 gp | 230,000 | 0.5806 |
| 3 | 11-16 | 12 | 105,922 gp | 1,271,070 gp | 524,000 | 2.4257 |
| 4 | 17-20 | 8 | 710,512 gp | 5,684,100 gp | 640,000 | 8.8814 |

Hoard averages include magic item value using the Value Score pricing system (base × 5 average).

### Role Multipliers

Raw weights 1/3/9/27 (~3× geometric steps), normalized against a 25/25/25/25 assumed campaign XP split:

| Role | Raw Weight | Multiplier | Concrete Example (CR 5, Tier 2) |
|------|-----------|------------|--------------------------------|
| Minion | 1 | ×0.10 | 105 gp budget |
| Elite | 3 | ×0.30 | 314 gp budget |
| Mini-boss | 9 | ×0.90 | 941 gp budget |
| Boss | 27 | ×2.70 | 2,822 gp budget |

The weighted average across all four roles at 25% each is exactly 1.0. Over a balanced campaign, total wealth distributed equals total XP budget — no treasure is created or lost.

Individual encounters over- or under-distribute depending on composition:
- Goblin Warren (6 minions + 2 elites + 1 boss): distributes ~90% of encounter XP budget (minion-heavy = leaner)
- Tier 2 Dungeon (12 guards + 4 veterans + 1 mage + 1 villain): distributes ~133% (boss-heavy = richer)

### Category Breakdown by Tier

Each creature's budget is split across categories. The percentages come from decomposing the DMG hoard tables:

**Tier 1:** 18% coins, 17% gems/art, 65% magic items (Tables A 4%, B 4%, C 29%, F 14%, G 14%)

**Tier 2:** 52% coins, 10% gems/art, 38% magic items (Tables C 5%, D 10%, F 2%, G 7%, H 14%)

**Tier 3:** 30% coins, 5% gems/art, 65% magic items (Tables D 5%, E 9%, G 1%, H 12%, I 38%)

**Tier 4:** 45% coins, 2% gems/art, 53% magic items (Tables D 2%, E 14%, H 2%, I 35%)

### Magic Item Table Values

| Table | Base Number | Avg Value (×5) | Type |
|-------|------------|----------------|------|
| A | 10 gp | 50 gp | Minor Common |
| B | 25 gp | 125 gp | Minor Uncommon |
| F | 100 gp | 500 gp | Major Uncommon |
| C | 250 gp | 1,250 gp | Minor Rare |
| G | 1,000 gp | 5,000 gp | Major Rare |
| D | 2,500 gp | 12,500 gp | Minor Very Rare |
| H | 10,000 gp | 50,000 gp | Major Very Rare |
| E | 25,000 gp | 125,000 gp | Minor Legendary |
| I | 100,000 gp | 500,000 gp | Major Legendary |

### Value Scoring System

Every magic item gets a Value Score: 2d4 (range 2-8, average 5).

| Score | 2d4 Weight | Category |
|-------|-----------|----------|
| 2 | 1 | Low |
| 3 | 2 | Low |
| 4 | 3 | Medium |
| 5 | 4 | Medium |
| 6 | 3 | Medium |
| 7 | 2 | High |
| 8 | 1 | High |

- **Buy price** = Value Score × Base Number
- **Sale price** = floor(Value Score ÷ 2) × Base Number

Gems and art use the same 2d4 as a quality multiplier: `actual_value = base_value × (score / 5)`. A "50 gp gem" ranges 20-80 gp.

### Source Priority Formula

```
effective_weight = TIER_VALUE[weight_tier] × PRIORITY_MULTIPLIER × DAMP_FACTOR
```

**Tier values** (bucketed from raw item weight): Low=1.5, Mid=3.5, High=5.5, VHigh=9.0

**Priority multipliers:** Off=0, Low=0.5, Normal=1.0, High=1.5, Emphasis=2.0

**Dampening factor** per sourcebook: `clamp(sqrt(20 / book_item_count), 0.4, 1.5)`

This prevents large books (DMG, 300+ items) from dominating by raw item count. A book with 20 items gets ×1.0 dampening. A book with 5 items gets ×1.5 (boosted). A book with 80 items gets ~×0.5 (dampened). Source priority still has the final say.

### Probability Redistribution

When a source is toggled off, its items get effective weight = 0 and are removed. The remaining items' probabilities redistribute proportionally — every survivor gets the same relative boost. No items are unfairly favored.

For display, the system snaps the remaining total weight up to the next standard die (d4/d6/d8/d10/d12/d20/d100) using the largest-remainder method for fair integer rounding. Maximum distortion: ~3.8 percentage points when going from d16 → d20.

### DMG Variance Profile

From 100,000 Monte Carlo simulations of the DMG hoard tables:

| Tier | Mean | Median | Std Dev | CV | 90/10 |
|------|------|--------|---------|-----|-------|
| 1 | 990 gp | 569 gp | 1,199 gp | 1.21 | 12× |
| 2 | 6,807 gp | 5,105 gp | 5,182 gp | 0.76 | 3.2× |
| 3 | 89,442 gp | 46,750 gp | 96,385 gp | 1.08 | 5.6× |
| 4 | 715,751 gp | 557,000 gp | 402,021 gp | 0.56 | 4.2× |

The median is always below the mean — the distribution is right-skewed because rare magic items pull the average up. This is intentional and preserved in our system.

**Key insight:** The DMG's variance comes from a two-layer structure. Coins are a guaranteed floor (low variance, ±30% from dice). The d100 "slot machine" determines whether you get nothing extra or a jackpot magic item. Most rolls are below average. Occasional jackpots create the excitement of treasure hunting.

### Auto-Classification Heuristic

New items from 5etools are auto-classified using a priority-ordered rule set:

1. **DMG lootTables field** → direct table assignment (if present)
2. **Common rarity** → Table A
3. **Exclusions** → cursed items and artifacts skipped
4. **Rarity** → determines table pair (uncommon=B/F, rare=C/G, etc.)
5. **Minor vs Major** → attunement, bonuses, sentience, charges → Major; else Minor
6. **Category** (Major tables): spellcaster attunement → Spellcaster; "staff of" → Spellcaster; type-based rules (M/R→Arms, S/HA/MA/LA→Armor, etc.); keyword matching; fallback → Misc
7. **Category** (Minor tables): type P → Potions; spell scroll → Spells; type A → Ammunition; else → Equipment

Accuracy against 533 hand-curated items: 91.2% table assignment, 94.6% minor/major, 93.8% major category.

### Edition Differences

**2014:** Hand-curated tables with sparse rarity adjustments where 2014 stats didn't justify DMG placement. Curation.json weight overrides are authoritative.

**2024:** 100% auto-generated from the classification heuristic. No rarity adjustments — 2024 specifically fixed weak-for-tier items. Separate curation and item-stats files.
