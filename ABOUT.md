# About

### The Problem with DMG Hoards

The Dungeon Master's Guide gives you four hoard tables (one per tier of play) that you roll on after your party clears a dungeon. This has issues:

**Timing.** The party fights twelve goblins, two bugbears, and a boss — then the DM has to figure out where the "hoard" is and roll on one table for the whole dungeon. The treasure feels disconnected from the creatures that were guarding it.

**Granularity.** A CR 1 bugbear and a CR 8 young dragon both contribute to the same Tier 2 hoard roll. There's no way to scale treasure to individual creatures.

**Variance.** A single d100 roll on the hoard table can produce wildly different results — from a handful of coins to a legendary magic item. That's fine for drama but makes it hard for the DM to plan an economy.

### What This Tool Does

This generator assigns a gold-piece budget to every creature based on three inputs: **CR** (how much XP it's worth), **Tier** (what level of play the party is at), and **Role** (how important this creature is in the encounter hierarchy). The budget is then spent probabilistically across coins, gems, art objects, and magic items using the same category distributions as the DMG hoard tables.

A goblin minion might have 1-4 copper. A bugbear boss gets 50-150 gp and a shot at a magic item. An ancient dragon boss carries a fortune. The math balances over a campaign — but each individual roll has real variance because the dice are actually thrown, not averaged.

### Design Philosophy

**DMG-compatible, not DMG-replacing.** The GP/XP ratios, tier breakdowns, and magic item table distributions are all derived from the actual DMG hoard tables. If you ran a full campaign using this tool with default settings, your party would end up with roughly the same total wealth as the DMG intends.

**Per-creature, not per-dungeon.** Every creature resolves independently. You can roll loot for a single random encounter or a 30-room dungeon and the economics scale correctly.

**Source-aware.** The magic item tables draw from 70+ sourcebooks (DMG, Xanathar's, Tasha's, Eberron, Fizban's, and dozens more). Each source can be toggled on/off or weighted by priority. Running an Eberron campaign? Crank Eberron sources to Emphasis and watch the item pool shift.

**DM-controlled variance.** Magic Richness adjusts how much of the budget goes to magic items vs raw coin. The role multipliers control how steeply treasure concentrates on bosses vs minions. Every knob has a sensible default and a clear effect.
