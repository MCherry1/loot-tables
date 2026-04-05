# Unified D&D 5e Treasure Economy

## Overview

Build a unified loot generation system for D&D 5e that replaces the DMG's hoard tables with a per-creature probability system. Every creature in the game resolves to a simple probability table based on three inputs: **CR**, **Tier of Play**, and **Role**. Two campaign-level sliders adjust the economy globally.

The system is economically balanced against the 2014 DMG: if a party fights a tier's worth of encounters and collects all the loot, the total equals what the DMG expects from its prescribed number of hoards.

-----

## Architecture

### Inputs (per roll)

| Input            | Values                     | Description |
|------------------|----------------------------|-------------|
| **CR**           | 0–30                       | Creature's Challenge Rating. Determines XP, which determines budget size. |
| **Tier of Play** | 1, 2, 3, or 4              | The party's current tier. Determines GP/XP ratio AND which loot categories are available. Auto-detected from CR by default (CR 0-4→T1, 5-10→T2, 11-16→T3, 17+→T4) but manually overridable. |
| **Role**         | Minion, Elite, Boss, Vault  | Creature's position in the hierarchy. Determines what fraction of their full budget they personally carry. |

### Inputs (campaign settings, set once)

| Input              | Values      | Default            | Description |
|--------------------|-------------|--------------------|-------------|
| **Magic Richness** | 0.5x – 1.5x | 1.0x (Standard)   | Multiplier on magic item probabilities. Labels: Scarce / Low / Standard / High / Abundant. |
| **Role Ratios**    | Adjustable  | 10 / 30 / 60 / 100 | What percentage of full budget each role gets. |

### Output (per roll)

A loot result containing any/all of:

- **Coins** (expressed as dice formulas)
- **Gems** (from custom gem tables)
- **Art Objects** (from custom art tables)
- **Magic Items** (from expanded item tables A-I)

-----

## Core Math

### Step 1: Budget Calculation

```
full_budget = XP_BY_CR[cr] × GP_PER_XP[tier]
role_budget = full_budget × ROLE_PCT[role]
```

**GP/XP ratios** (derived from DMG hoard expected values ÷ tier XP):

| Tier | Levels | Hoards | Avg Hoard   | Total Treasure  | Total XP | GP/XP  |
|------|--------|--------|-------------|-----------------|----------|--------|
| 1    | 1–5    | 7      | 1,077 gp    | 7,540 gp        | 26,000   | 0.2900 |
| 2    | 5–10   | 18     | 7,419 gp    | 133,544 gp      | 230,000  | 0.5806 |
| 3    | 10–16  | 12     | 105,922 gp  | 1,271,070 gp    | 524,000  | 2.4257 |
| 4    | 16–20  | 8      | 710,512 gp  | 5,684,100 gp    | 640,000  | 8.8814 |

Hoard averages include magic item value using the project's custom Value Score pricing (Base × 5 average):

| Table | Base       | Avg Value   | Type             |
|-------|------------|-------------|------------------|
| A     | 10 gp      | 50 gp       | Minor Common     |
| B     | 25 gp      | 125 gp      | Minor Uncommon   |
| F     | 100 gp     | 500 gp      | Major Uncommon   |
| C     | 250 gp     | 1,250 gp    | Minor Rare       |
| G     | 1,000 gp   | 5,000 gp    | Major Rare       |
| D     | 2,500 gp   | 12,500 gp   | Minor Very Rare  |
| H     | 10,000 gp  | 50,000 gp   | Major Very Rare  |
| E     | 25,000 gp  | 125,000 gp  | Minor Legendary  |
| I     | 100,000 gp | 500,000 gp  | Major Legendary  |

**Role percentages:**

| Role   | % of Budget | Description |
|--------|-------------|-------------|
| Minion | 10%         | Fodder, grunts. Pocket change. |
| Elite  | 30%         | Lieutenant. Personal gear and stash. |
| Boss   | 60%         | The leader. Best equipment, personal treasure. |
| Vault  | 100%        | The group's accumulated wealth. The "hoard." |

### Step 2: Category Breakdown

Each tier has a fixed percentage breakdown across loot categories, derived from the actual DMG hoard table probability weights.

**Tier 1:**

| Category  | % of Hoard Value |
|-----------|------------------|
| Coins     | 18.2%            |
| 10gp gems | 1.7%             |
| 25gp art  | 3.9%             |
| 50gp gems | 11.0%            |
| Table A   | 3.9%             |
| Table B   | 4.4%             |
| Table C   | 29.0%            |
| Table F   | 13.9%            |
| Table G   | 13.9%            |

**Tier 2:**

| Category   | % of Hoard Value |
|------------|------------------|
| Coins      | 52.0%            |
| 25gp art   | 0.4%             |
| 50gp gems  | 1.7%             |
| 100gp gems | 3.5%             |
| 250gp art  | 3.9%             |
| Table A    | 0.4%             |
| Table B    | 0.8%             |
| Table C    | 4.6%             |
| Table D    | 10.1%            |
| Table F    | 2.4%             |
| Table G    | 6.7%             |
| Table H    | 13.5%            |

**Tier 3:**

| Category    | % of Hoard Value |
|-------------|------------------|
| Coins       | 29.7%            |
| 250gp art   | 0.3%             |
| 500gp gems  | 1.1%             |
| 750gp art   | 0.9%             |
| 1000gp gems | 2.3%             |
| Table A     | <0.1%            |
| Table B     | 0.1%             |
| Table C     | 0.9%             |
| Table D     | 4.7%             |
| Table E     | 9.4%             |
| Table F     | <0.1%            |
| Table G     | 0.9%             |
| Table H     | 11.8%            |
| Table I     | 37.8%            |

**Tier 4:**

| Category    | % of Hoard Value |
|-------------|------------------|
| Coins       | 45.3%            |
| 1000gp gems | 0.4%             |
| 2500gp art  | 0.5%             |
| 5000gp gems | 0.8%             |
| 7500gp art  | 0.6%             |
| Table C     | 0.1%             |
| Table D     | 2.0%             |
| Table E     | 13.5%            |
| Table G     | 0.1%             |
| Table H     | 1.6%             |
| Table I     | 35.2%            |

### Step 3: Convert Budget to Probabilities

For each category:

```
category_budget = role_budget × (category_pct / 100)
```

- **Coins**: Always present. Convert to a dice formula (NdM × mult) that averages near the budget.
- **Gems/Art**: `expected_count = category_budget / unit_value`. If ≥ 1, roll that many. If < 1, treat as percentage chance.
- **Magic Items**: `chance = category_budget / MI_AVG[table]`. If ≥ 1, use split rolls. If < 1, percentage chance.

### Step 4: Apply Magic Richness Slider

```
adjusted_mi_pct = original_mi_pct × richness_slider
coin_adjustment = sum(original_mi_pcts) - sum(adjusted_mi_pcts)
adjusted_coin_pct = original_coin_pct + coin_adjustment
```

### Step 5: Variance

Natural variance through three layers:
1. **Coin dice** — NdM formulas give ~6x spread
2. **Category probability** — percentage chances create excitement
3. **Item table internal weights** — different items from the same table

### Multiple Items Over 100% Probability

```
num_rolls = ceil(expected_count)
per_roll_chance = expected_count / num_rolls
```

-----

## Role Descriptions

**Minion (10%)** — Fodder, grunts. A few coins in their pocket. The goblin warrior, the skeleton guard.

**Elite (30%)** — Lieutenants, named NPCs. Personal stash worth searching. The goblin sergeant, the bandit captain.

**Boss (60%)** — The leader, the main threat. Best personal equipment, significant personal wealth. The bugbear chief, the dragon.

**Vault (100%)** — The group's accumulated treasury. The locked chest, the dragon's pile. This is the DMG's "hoard" concept.

-----

## Key Design Insight: Tier vs CR

**Tier** controls: GP/XP ratio + which loot categories are available.
**CR** controls: How much XP the creature is worth (budget size).

The same CR 5 creature produces different loot depending on tier context.

-----

## Value Score System

Every magic item has a Value Score (0–10), default 2d4.

- **Buy price** = Value Score × Base Number
- **Sale price** = floor(Value Score ÷ 2) × Base Number

| Score | Weight (2d4) | Category   |
|-------|-------------|------------|
| 0     | 0           | Broken     |
| 1     | 0           | Worthless  |
| 2     | 1           | Low        |
| 3     | 2           | Low        |
| 4     | 3           | Medium     |
| 5     | 4           | Medium     |
| 6     | 3           | Medium     |
| 7     | 2           | High       |
| 8     | 1           | High       |
| 9     | 0           | Luxury     |
| 10    | 0           | Masterwork |

-----

## Party Size Adjustment

```
adjusted_gp_per_xp = base_gp_per_xp × (4 / party_size)
```

-----

## Mundane Finds

For very low budgets (< 1 gp coins), include a flavor item instead of "nothing."

-----

## Verification Targets

1. Tier totals at Vault (100%) across a tier's XP ≈ DMG expected hoard total
2. Only MI tables appearing in the DMG hoard for that tier have nonzero probability
3. At Richness 1.0x and default ratios, expected values match DMG baseline
4. Typical dungeon (8m + 2e + 1b + 1v) ≈ 0.25–1.0 DMG hoards
5. CR 4 solo boss (Tier 1) ≈ CR 4 regional elite (Tier 2) in personal wealth (~190 gp)
