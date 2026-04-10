# Encounter Budget System — Design Spec

## Core Promise

You kill a creature, you roll for its loot. Over a tier's worth of fights, your party accumulates roughly the right amount of treasure. You never have to think about the economy — it just works.

## Step 1: Every Creature Has a Budget

```
creature_budget = XP(CR) × GP_PER_XP[tier] × APL_adjustment × role_multiplier
```

- **CR** determines economic weight via XP.
- **Tier** determines the base conversion rate (GP_PER_XP).
- **APL adjustment** is a DM-controlled slider that adjusts for party progression within a tier.
- **Role multiplier** redistributes wealth within narrative hierarchies.

### GP_PER_XP Base Rates (from DMG hoard averages)

| Tier | GP/XP | Levels | Hoards Expected |
|------|-------|--------|----------------|
| 1 | 0.29 | 1–4 | 7 |
| 2 | 0.58 | 5–10 | 18 |
| 3 | 2.43 | 11–16 | 12 |
| 4 | 8.88 | 17–20 | 8 |

## Step 2: Three DM Controls

```
Tier:           [1] [2] [3] [4]     ← sets base GP_PER_XP
APL Adjustment: [────●────────]     ← multiplier on GP_PER_XP
                0.7×    1.0×   1.3×
Concentration:  [────────●────]     ← step size between roles
                1.5×    3.0×   5.0×
```

**Tier** sets the baseline conversion rate. A Tier 1 creature produces dramatically less treasure than a Tier 3 creature of the same CR.

**APL Adjustment** lets the DM tune loot richness without changing anything else. A fresh level 1 party might use 0.7×. A level 4 party about to hit Tier 2 might use 1.3×. This is purely a DM judgment call — no assumptions about CR difficulty, because CR is notoriously squishy.

**Concentration** controls how steeply wealth flows from minions to bosses. Default is 3× steps. A dragon hoarding wealth uses 5× (steep). A criminal organization with comfortable lieutenants uses 1.5× (flat). This is set per encounter or per organization.

## Step 3: Four Roles

| Role | Default Multiplier (3× steps) | Narrative Meaning |
|------|-------------------------------|-------------------|
| Minion | ~0.25× fair share | Foot soldiers, grunts, expendable creatures |
| Elite | ~0.83× fair share | Lieutenants, specialists, independent operators |
| Mini-boss | ~2.50× fair share | Regional leaders, guardians, sub-commanders |
| Boss | ~7.50× fair share | The BBEG, the dragon on the hoard, the crime lord |

Each step is roughly 3× the previous (at default concentration). A boss carries ~27× what a minion carries for the same CR.

### The DM Assigns Roles Narratively

Roles are about narrative position in a hierarchy, not about CR:

- Klarg the bugbear (CR 1) is an **elite** — he works for King Grol
- King Grol (CR 1) is the **boss** — he runs the Cragmaw tribe
- Venomfang (CR 8) is an **elite** — he's a squatter, not a hoard-accumulating overlord
- The Black Spider (CR 4) is the **boss** — he's the BBEG of the entire adventure

The same creature at the same CR drops very different loot depending on its role. CR handles *how much XP the creature is worth*. Role handles *how much of that worth shows up as loot*.

### How Multipliers Are Calibrated

Role multipliers are calibrated against an assumed campaign XP split so that total loot across a tier matches the DMG target. The assumed split:

| Role | % of Campaign XP | Rationale |
|------|------------------|-----------|
| Minion | ~50–60% | Lots of mooks |
| Elite | ~25–35% | Fewer, tougher |
| Mini-boss | ~8–12% | Occasional lieutenants |
| Boss | ~3–8% | Rare, climactic |

The multipliers are normalized against this split. If a particular campaign differs (more bosses, fewer minions), total loot drifts slightly from target — but the DMG already expects variance and doesn't assume parties find everything.

### Concentration Slider Values

The slider controls the ratio between adjacent role multipliers. At each setting, multipliers are re-normalized:

| Setting | Steps | Minion | Elite | Mini-boss | Boss | Feel |
|---------|-------|--------|-------|-----------|------|------|
| Flat (1.5×) | 1.5× | ~0.56× | ~0.83× | ~1.25× | ~1.88× | Everyone has something worth looting |
| Default (3×) | 3× | ~0.25× | ~0.83× | ~2.50× | ~7.50× | Standard hierarchy |
| Steep (5×) | 5× | ~0.10× | ~0.50× | ~2.50× | ~12.5× | Boss has almost everything |

"Flat" suits criminal organizations, military units, well-funded groups. "Steep" suits dragons, tyrants, hoarding creatures. The DM sets this per encounter or per organization based on the narrative.

### Role Multipliers Are Fixed

A minion always gets the same fraction of its fair share, regardless of encounter composition. You don't need to know the full encounter to roll for one creature. This means:

- A goblin minion encountered alone on a road drops ~4 gp (Tier 1, CR 1/4)
- The same goblin encountered as part of King Grol's army drops ~4 gp
- The total encounter loot varies by composition, but any individual creature's loot is deterministic given its CR, tier, APL, role, and concentration setting

## Step 4: Roll for Loot (Variance)

The creature's budget is the **expected value**, not the actual loot. We roll using the DMG's hoard table mechanics to determine actual loot, preserving the excitement of dice-based treasure.

### How Variance Works

The DMG hoard tables have massive variance:

| Tier | Per-Hoard Mean | Per-Hoard Median | CV | Skew |
|------|---------------|-----------------|-----|------|
| 1 (CR 0-4) | 1,075 gp | 562 gp | 123% | 1.9× |
| 2 (CR 5-10) | 23,097 gp | 6,060 gp | 318% | 3.8× |
| 3 (CR 11-16) | 192,359 gp | 161,000 gp | 57% | 1.2× |
| 4 (CR 17+) | 7,386,374 gp | 7,328,750 gp | 13% | 1.0× |

36% of Tier 1 hoards have zero magic items. The median Tier 2 hoard is only a quarter of the mean (right-skew from rare high-value magic items). This variance is intentional — it creates the slot-machine excitement that makes treasure discovery fun.

### Applying Variance to Creature Budgets

1. The creature's budget determines which **tier** of hoard table to sample from
2. The budget scales the quantities: a creature worth 0.5 hoards rolls on the same tier table but with halved dice/quantities
3. The d100 roll, gem dice, magic item dice are preserved from the DMG tables
4. Boss/mini-boss creatures get full variance (exciting loot moments). Minion creatures get simplified rolls (just coins — keeps things fast at the table)

The actual implementation should use the DMG's exact dice formulas per tier:
- Coins: NdS × multiplier (e.g., 6d6×100 cp)
- Gems/Art: probability from d100, then NdS count × value
- Magic items: probability from d100, then NdS count from specified table

The creature budget scales these dice proportionally while preserving their ratios and variance profiles.

## Step 5: The Vault (Separate Tool)

The vault is a standalone hoard generator for placed treasure not tied to any creature. Pick a tier and size:

| Size | Multiplier | Use Case |
|------|-----------|----------|
| Minor | 0.5× | Small cache, hidden stash |
| Standard | 1.0× | Typical hoard, treasure room |
| Major | 2.0× | Dragon's pile, king's treasury |

The vault is purely additive. The economy doesn't require it — creature loot handles the baseline. The vault is for when the DM wants a big treasure moment that isn't on a body.

## Validated Against Lost Mine of Phandelver

With DM-assigned narrative roles, breaking the adventure into organizations:

| Organization | XP | Hoards Equiv | Boss Loot |
|-------------|-----|-------------|-----------|
| Cragmaw Goblins | 2,850 | 0.8 | King Grol: 458 gp |
| Redbrands | 2,500 | 0.7 | Glasstaff: 399 gp |
| Venomfang + ruins | 5,150 | 1.4 | Venomfang: 1,465 gp |
| Wave Echo Cave | 13,500 | 3.6 | Black Spider: 1,506 gp |
| Side quests | ~2,650 | 0.7 | Various |
| **Total** | **~26,650** | **7.2** | |

The DMG expects 7 hoards for Tier 1. The adventure's XP totals 7.2 hoards. The system slightly over-budgets (826 gp for Cragmaw vs ~570 gp published), which accounts for the fact that parties don't find everything — the system provides the ceiling, natural attrition brings the actual take to roughly the right level.

Individual creature budgets match published treasure within reasonable variance: goblins at 4 gp (pocket change), Klarg at 153 gp (his chest), King Grol at 458 gp (the castle treasury), Venomfang at 1,465 gp (a dragon's small hoard).
