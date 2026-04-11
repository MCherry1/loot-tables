# About

This is a loot generator for D&D 5e that gives every creature its own treasure drop — scaled to its Challenge Rating, tier of play, and role in the encounter.

### Why Not Just Use the DMG Hoard Tables?

The DMG gives you four hoard tables that you roll on after clearing a dungeon. They work, but they have friction:

**The treasure feels disconnected.** Your party fights twelve goblins, two bugbears, and a boss — then you have to figure out where the "hoard" is and roll one table for the whole dungeon. Did the goblins have anything? Did the boss have better stuff? The table doesn't say.

**There's no creature-level granularity.** A CR 1 bugbear and a CR 8 young dragon both feed into the same Tier 2 hoard roll. You can't express that the dragon should have more treasure than the bugbear.

**Planning is hard.** A single d100 roll can produce a handful of coins or a legendary magic item. That variance is fun for drama but makes it difficult to pace an economy across a campaign.

### What This Does Instead

This generator gives every creature a gold-piece budget based on its CR and role, then rolls that budget against probability tables for coins, gems, art objects, and magic items. The probabilities are derived from the same DMG hoard tables — so over a full campaign, the total treasure matches what the DMG expects.

But now a goblin minion has 1-4 copper in its pocket. A bugbear boss has 50-150 gp and a real shot at a magic item. Three goblins of the same CR get three different coin amounts because the dice are actually thrown, not averaged.

### Design Philosophy

**DMG-compatible, not DMG-replacing.** Default settings produce the same total wealth the DMG intends across a tier. The math is verified.

**Per-creature, not per-dungeon.** Every creature resolves independently. Works for a single random encounter or a 30-room dungeon.

**Source-aware.** 70+ sourcebooks with per-book priority controls. Running an Eberron campaign? Crank Eberron to Emphasis. Don't own Fizban's? Turn it off.

**Real variance.** Coins are dice formulas that roll differently each time. Gems and art objects have quality scores. Magic items have value scores. Two identical goblins carry different loot.
