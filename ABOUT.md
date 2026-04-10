# About the Loot Generator

## What This Is

A unified loot generation system for D&D 5e that replaces the DMG's big hoard tables with *per-creature probability*. Every monster you kill has a chance of dropping something — a few copper, a gem, an art object, or a magic item — scaled to its Challenge Rating and its role in the encounter. Over a full tier of play the numbers land in roughly the same place the DMG expects, but the rewards arrive in a rhythm the players can feel at the table.

## How the Math Works

Each creature starts with its XP value from the Monster Manual. That XP is multiplied by a **gp-per-xp ratio** specific to its tier of play, yielding a gold-piece budget. That budget is then scaled by the creature's **role** — the fraction of its budget that actually becomes loot.

| Role | Share | Typical Creature |
|------|-------|------------------|
| Minion | 10% | Goblin, thug, kobold |
| Elite | 30% | Ogre, veteran, hobgoblin captain |
| Boss | 60% | Adult dragon, beholder, lich |
| Vault | 100% | A full hoard with no owner |

## Category Breakdown

A creature's budget is split across four categories: coins, gems, art objects, and magic items. The split is tier-specific and derived from the DMG hoard tables: at tier 1 most of the value lives in coins and the cheapest magic item tables; at tier 4 it's dominated by Tables H and I. Each category rolls against a table sized to the tier — you never roll a 5,000 gp gem at tier 1.

## Magic Item Tables

The DMG organizes magic items into nine tables labelled A through I. A/B/C are the minor tables (potions, scrolls, common gear); D/E are their "Major" counterparts with rarer items. F/G/H/I are the "martial adventurer" tables — weapons, armor, and signature wondrous items whose average value climbs from 500 gp up to 500,000 gp.

On top of the tables we add a **value score** pricing layer: when an item is picked, we roll 2d4 and multiply by the table's base number to get an individualized buy price. A longsword +1 and a wand of fireballs can both come off Table G but they cost wildly different amounts — the value score captures that spread without requiring a hand-priced database.

## DMG Balance Verification

At default settings, a full tier's worth of encounters produces treasure totals that match the DMG's expected hoard values to within a few percent. The engine's `economy-balance` test suite runs every category of drop across a statistically meaningful sample and asserts that the totals fall inside the DMG envelope. You can trust that tuning a campaign to these defaults won't quietly break the math.
