# How it Works

### Budget Calculation

Every creature's loot starts with a gold-piece budget:

```
full_budget = XP × GP_PER_XP[tier] × APL_adjustment × (4 / party_size)
role_budget = full_budget × ROLE_MULTIPLIER[role]
```

**GP/XP ratios** are derived from the DMG's expected hoard totals divided by the total XP a party earns across each tier:

| Tier | Levels | GP/XP Ratio | What it means |
|------|--------|-------------|---------------|
| 1 | 1-4 | 0.29 | 1 XP ≈ 3 sp of treasure |
| 2 | 5-10 | 0.58 | 1 XP ≈ 6 sp |
| 3 | 11-16 | 2.43 | 1 XP ≈ 2.4 gp |
| 4 | 17-20 | 8.88 | 1 XP ≈ 9 gp |

The steep climb reflects D&D's exponential wealth curve — high-level treasure is worth dramatically more per XP because magic items at those tiers cost tens of thousands of gold.

### Role Multipliers

Not every creature carries equal treasure. A goblin grunt has pocket change; the goblin king has the war chest. Role multipliers scale the budget using ~3× geometric steps:

| Role | Multiplier | Raw Weight | Feel |
|------|-----------|------------|------|
| Minion | ×0.10 | 1 | Pocket change. A few coins. |
| Elite | ×0.30 | 3 | Personal stash worth searching. |
| Mini-boss | ×0.90 | 9 | Well-equipped, significant treasure. |
| Boss | ×2.70 | 27 | The big score. Best gear, personal hoard. |

These are normalized against an assumed 25/25/25/25 campaign XP split. Over a balanced campaign, the average multiplier is exactly 1.0 — total wealth distributed equals total XP budget. No treasure is created or lost.

Individual encounters will over- or under-distribute depending on composition. A boss-heavy encounter is richer. A minion swarm is leaner. It balances out.

**Vault** is separate — it's placed treasure (a dragon's pile, a locked chest) sized by tier, not by creature CR.

### Category Breakdown

Each creature's budget is split across categories using percentages derived from the DMG hoard tables. The split is tier-specific:

- **Coins** — guaranteed floor, expressed as a dice formula (e.g., 2d6×10 gp). Each creature rolls independently, so three goblins get three different coin amounts.
- **Gems** — probability = budget_share / gem_unit_value. A 50 gp gem has a 20% chance of appearing on a creature with a 10 gp gem budget. When it does appear, its actual value varies by quality (2d4 scoring: range 0.4×–1.6× base).
- **Art Objects** — same probability system as gems, with value scoring.
- **Magic Items** — probability = budget_share / table_average_value. Low-CR creatures have slim chances at magic items; high-CR creatures expect them. The actual item is rolled from the weighted magic item tables.

At Tier 1, most value is in coins and Table A/B items. At Tier 4, Tables H and I dominate.

### Magic Item Tables

The nine tables (A through I) are organized by rarity and power:

| Table | Type | Avg Value | Contents |
|-------|------|-----------|----------|
| A | Minor Common | 50 gp | Potions, cantrip scrolls, trinkets |
| B | Minor Uncommon | 125 gp | Better potions, low-level scrolls |
| C | Minor Rare | 1,250 gp | Serious consumables, rare scrolls |
| D | Minor V.Rare | 12,500 gp | High-level scrolls, rare potions |
| E | Minor Legendary | 125,000 gp | Legendary consumables |
| F | Major Uncommon | 500 gp | Permanent uncommon gear |
| G | Major Rare | 5,000 gp | Signature weapons, rare wondrous items |
| H | Major V.Rare | 50,000 gp | Very rare arms, armor, and artifacts |
| I | Major Legendary | 500,000 gp | Legendary items, world-shaping gear |

Each table contains sub-categories (Arms, Armor, Apparel, Jewelry, Spellcaster, Misc, Potions, etc.) with weighted entries. The weights determine dice ranges — a d20 sub-table with 6 items might give the Flame Tongue a range of 1-4 and the Sun Blade a range of 5-6.

### Value Scoring

Every magic item, gem, and art object gets an individualized value through the scoring system:

- **Magic items:** Roll 2d4 (range 2-8, average 5). Buy price = score × base number. A Table G item (base 1,000 gp) could cost 2,000-8,000 gp depending on the roll.
- **Gems and art:** Same 2d4 quality roll, applied as a multiplier (score/5 × base value). A "50 gp gem" is actually worth 20-80 gp.

This creates natural price variance without a hand-maintained price database. Two +1 longswords from the same table cost different amounts — one is battle-worn, the other is pristine.

### Source Priority System

Magic item entries are tagged with their sourcebook (DMG, XGE, TCE, ELW, etc.). The priority system lets you weight books higher or lower:

| Priority | Multiplier | Use case |
|----------|-----------|----------|
| Off | ×0 | Remove all items from this book |
| Low | ×0.5 | De-emphasize (rarely appears) |
| Normal | ×1.0 | Default |
| High | ×1.5 | Emphasize (appears more often) |
| Emphasis | ×2.0 | Strong emphasis (Eberron campaign, etc.) |

A dampening factor prevents large books (DMG with 300+ items) from dominating: `clamp(sqrt(20/itemCount), 0.4, 1.5)`. Small books get a slight boost; large books get dampened. Source priority still matters, but item count alone doesn't determine representation.

When a source is toggled off, its items are removed from the pool and probability redistributes proportionally to everything remaining. The dice ranges renumber automatically.

### DMG Variance Profile

The system preserves the DMG's natural variance — most rolls are below average, with occasional jackpots from magic items:

| Tier | Mean | Median | CV | 90/10 Spread |
|------|------|--------|-----|-------------|
| 1 | 990 gp | 569 gp | 1.21 | 12× |
| 2 | 6,807 gp | 5,105 gp | 0.76 | 3.2× |
| 3 | 89,442 gp | 46,750 gp | 1.08 | 5.6× |
| 4 | 715,751 gp | 557,000 gp | 0.56 | 4.2× |

The median is always lower than the mean because rare magic items pull the average up. This right-skew is intentional — it's the excitement of treasure hunting.

### Edition Support

The app supports both 2014 and 2024 D&D 5e via a toggle in Settings. The 2014 tables are hand-curated with sparse rarity adjustments. The 2024 tables are auto-generated from the classification heuristic (2024 fixed the weak-for-tier items, so DMG placements are trusted). Each edition has its own item descriptions.
