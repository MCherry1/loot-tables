# Design

The thinking behind how the tables are built and how the loot system works. This isn't a math document — it's about the decisions and why they make sense for your game. If you want the raw formulas, those live in the `specs/` folder.

---

## Item Tables

### Why Categories?

The DMG's magic item tables are flat lists. Table G has 80-something items in one giant pool — swords next to cloaks next to wands next to potions. That creates two problems.

The first is balance. When a new sourcebook comes out and adds fifteen wands but only two swords, the wands dominate the table. The probability of rolling a sword drops because the total pool got bigger, even though swords aren't any less interesting. By splitting items into categories — Arms, Armor, Potions, Spellcaster, and so on — each category maintains its own weight relative to the others. Adding fifteen new wands makes the Spellcaster sub-table bigger, but it doesn't crowd out swords from the Arms sub-table.

The second is usability. When you're a DM and you know the party just killed a hobgoblin war chief, you want to be able to say "this guy should have a weapon" and roll specifically on the Arms table. Or if your wizard player hasn't found anything good in a while, you want to browse the Spellcaster items and pick something. Categories let you roll randomly when you want surprise, choose deliberately when you want control, and switch between the two at any step as you walk through the tables.

### How Items Are Categorized

The categories map roughly to what a creature might be carrying or what a player might want:

**Arms** covers weapons — swords, axes, bows, and anything you swing or shoot. Within Arms, there are sub-tables for weapon types (swords, axes, martial melee, simple melee, ranged). The weights between these reflect how common each type would be in a fantasy world. There are more daggers and longswords than greatswords, because that's what most armed creatures actually carry. A greatsword is a specialized weapon — it should feel special when one shows up.

**Armor** splits by proficiency tier — light, medium, heavy — which naturally maps to character classes. A rogue finds light armor useful. A paladin wants heavy armor. When you're rolling for an enemy, the same split works: a bandit scout wears light armor, a knight wears heavy.

**Spellcaster** items require attunement by a spellcaster — wands, staffs, robes, and similar. This category grew the most as sourcebooks were published. Without category separation, the sheer number of spellcaster items would have drowned out everything else.

**Potions** are consumable liquids. They're separated from other items because they're fundamentally different — you use them once and they're gone. Balancing potions against permanent items within the same pool doesn't make sense; they serve different roles in the game's economy.

**Spells** (for scroll tables) are kept at perfectly equal weight within each spell level. There's no good way to say "Fireball should be more common than Fly" without making judgment calls that every DM would disagree on. So all spells at a given level have the same probability. The tables use whatever die size falls out naturally — a d67 is fine for spells.

**Equipment / Gear** in the minor tables is a catch-all for items that aren't consumable but aren't powerful enough for a major table category. There aren't enough minor apparel items or minor arms to justify separate sub-tables, so they share a pool.

**Miscellaneous** is the catch-all for major items that don't fit elsewhere — Bags of Holding, Portable Holes, Decanters of Endless Water. Things that are useful to anyone regardless of class.

### Sourcebook Weighting

Every item tracks which book it comes from. You can toggle books on or off (don't own Fizban's? turn it off) or set priority levels — Low, Normal, High, Emphasis. Running an Eberron campaign? Set Eberron sources to Emphasis and they'll appear more frequently without completely replacing everything else.

When a source is toggled off, its items disappear and the remaining items redistribute proportionally. No probability is lost — every surviving item gets a fair boost.

There's also a dampening formula that prevents any single large sourcebook from dominating just by having more items. A book with 300 items doesn't get 10× the representation of a book with 30 items. The dampening scales by the square root of item count, so larger books still have more presence, just not linearly more.

---

## Monster Loot & Hoards

### The Core Idea

The DMG gives you four hoard tables (one per tier of play) and expects you to roll once after clearing a dungeon. That works, but it means treasure is disconnected from individual creatures. This system fixes that by converting hoard-level treasure into per-creature probabilities.

Here's the logic: the DMG expects about 7 hoards across Tier 1 (levels 1–4), and the party earns about 6,500 XP to get through that tier. Each hoard has an expected gold value. So the total treasure across the tier is known, and the total XP is known. Divide the first by the second and you get a gold-per-XP ratio. Now every creature with an XP value has a proportional share of the tier's total treasure.

A CR 1 goblin (200 XP) gets a small share. A CR 4 owlbear (1,100 XP) gets a bigger share. A boss creature gets even more because of the role multiplier — bosses are worth 2.7× their base share, minions are worth 0.1×.

### Roles

Every creature in an encounter has a role that determines its treasure share:

**Minion (×0.10)** — the fodder. A goblin, a skeleton, a guard. They have pocket change. Maybe a few copper coins.

**Elite (×0.30)** — a creature worth looting. A hobgoblin sergeant, a bandit captain, a veteran. Personal belongings, maybe a gem or a minor item.

**Mini-boss (×0.90)** — well-equipped and dangerous. A mage, a vampire spawn, a young dragon. Significant treasure, real chance of magic items.

**Boss (×2.70)** — the big score. An adult dragon, an archdevil's lieutenant, the final villain. This is where the real loot lives.

The multipliers follow a 3× geometric progression (1, 3, 9, 27 → normalized to 0.10, 0.30, 0.90, 2.70). Over a balanced campaign where XP is spread roughly equally across roles, the weighted average is exactly 1.0 — no treasure is created or lost compared to what the DMG expects.

### Tier Progression

Within each tier, treasure scales from 0.70× at the start to 1.30× at the end. A level 5 party fighting CR 6 creatures gets leaner hoards than a level 10 party fighting the same creatures. This late-loads treasure — published adventures tend to reserve richer rewards for later in each tier, and the progression multiplier captures that pattern automatically.

### Gems

Gems use a continuous value system instead of the DMG's fixed-value buckets. In the DMG, every gem at a given tier is worth exactly the same amount — every "100 gp gem" is 100 gp, no exceptions. That's boring and unrealistic.

In this system, each of the 33 gem types has a natural value range. A diamond can be worth anywhere from 10 gp (a tiny, cloudy chip) to 100,000 gp (a legendary stone). Values are rolled on a logarithmic scale, which means most gems cluster toward the cheap end — just like in real life. You find a lot of small diamonds and very few large ones.

Every gem gets a full description: size, quality, cut style, and color. A "Large but poorly cut oval ruby — 820 gp" tells a story that "500 gp gem" doesn't. The quality score also feeds into a future crafting system — a gem with low quality but high value means a jeweler could significantly improve it.

Gem budgets for each hoard tier are derived from the DMG's expected values. For individual creatures, the system fractionalizes the probability rather than the budget — a goblin has a 7% chance of carrying 100 gp worth of gems, rather than always carrying 7 gp of gravel. When gems are present, they're interesting. When they're not, the creature just had coins.

Spell components that require specific gems — like the 100 gp pearl for Identify or the 500 gp diamond for Raise Dead — are handled separately. They're automatically included in hoards at the appropriate tier, deducted from the coin budget. Players don't need to go shopping for Identify pearls; the loot system delivers them. Other grindable components (diamond dust for Revivify, Stoneskin, Greater Restoration) accumulate naturally because diamonds are the most commonly generated gem.

### Art Objects

Art objects follow the same continuous-value, budget-based approach as gems. Ten categories — Jewelry, Metalwork, Sculpture, Textile, Painting, Pottery, Glasswork, Woodwork, Leatherwork, and Calligraphy — each produce descriptive items assembled from material, form, and detail pools. "Copper chalice with silver filigree" at the low end. "Platinum diadem set with a large cushion-cut emerald" at the high end.

Each category maps to an artisan tool, which matters for a future crafting system. The 48 specific art objects from the DMG show up as occasional named drops — you might find the exact "Gold locket with a painted portrait inside" from the DMG, but you'll also find generated items that are just as evocative.

### Vault Hoards

For placed treasure that isn't tied to a specific creature — a dragon's pile, a locked chest, a bandit camp treasury — the Vault rolls the full hoard budget for a tier at once. This is the closest equivalent to the DMG's hoard tables, but with all the improvements: continuous gem values, descriptive art objects, sourcebook filtering on magic items, and spell component inclusion.
