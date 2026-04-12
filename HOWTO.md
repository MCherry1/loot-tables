# How to Use

---

## Loot Tables

The Loot Tables tab is an interactive magic item roller. Pick a table letter (A through I) and browse every item on that table with its weight and probability.

### Rolling vs. Choosing

You can **roll randomly** — click the dice button and the system picks an item weighted by probability. Or you can **choose directly** — click any row to select it. You can switch between rolling and choosing at every step.

This is the key flexibility: maybe you roll on the top-level table and get "Arms," but then you want to specifically give the party a sword. So you choose "Swords" at the next step, then roll within Swords to see which one. Roll when you want surprise, pick when you want control.

### Stepping Through Sub-Tables

Many entries reference sub-tables (shown with an arrow). When you select one, the stepper walks you through each table in the chain. For example: Table G → Arms → Swords → Longsword. At each step you can roll or pick.

**Skip to End** auto-rolls all remaining steps and shows the final result. Good for speed when you don't care about the intermediate choices.

### Result Cards

When an item is fully resolved, the result card shows its name and source book. With **Show Item Details** enabled (on by default), you'll also see the full description, rarity, and attunement requirements.

### Roll History

Previous results are saved below the roller during your session. Clear them with the × button.

### Spell Tables

The Spells tab works the same way but organizes by spell level (Cantrip through 9th). All spells within a level have equal weight — no spell is more "common" than another.

---

## Monster Loot & Hoards

### Quick Start

1. Set the **CR** for the creatures in the encounter
2. Set the **Party Level** (this determines the tier and scales treasure)
3. Add creatures by role: use the +/- buttons for Minion, Elite, Mini-boss, and Boss
4. Click **Roll Encounter**

Every creature generates loot independently. The goblin minions might have a few coins each (or nothing). The boss has the real treasure.

### Roles

Roles determine how much treasure a creature carries relative to its CR:

**Minion** — pocket change. Use for rank-and-file enemies: goblins, skeletons, guards. Most won't have anything interesting, and that's intentional.

**Elite** — worth searching. Sergeants, veterans, spellcasters in a group. Personal belongings, possibly a gem or small valuable.

**Mini-boss** — significant treasure. The mage at the top of the tower, the vampire spawn guarding the crypt. Real chance of magic items.

**Boss** — the big score. The encounter's final villain. Best gear, biggest hoard, highest probability of powerful magic items.

You don't need to use all four roles. A simple encounter might be 4 minions and 1 boss. A complex dungeon might use all four.

### Party Level and Tier

**Party Level** (1–20) does two things. With **Auto Tier** enabled, it automatically selects the correct treasure tier (Tier 1 = levels 1–4, Tier 2 = 5–10, Tier 3 = 11–16, Tier 4 = 17–20).

With **Tier Progression** enabled, treasure scales within the tier — 0.70× at the start, 1.30× at the end. A level 5 party gets leaner hoards than a level 10 party, even fighting the same CR creatures. This matches how published adventures pace their rewards.

You can disable Auto Tier and manually select any tier if you want more control.

### Resolving Magic Items

Magic items initially appear as unresolved table references (e.g., "Table G"). Click any unresolved item to jump to the Loot Tables stepper and walk through the resolution — rolling or choosing at each step. When you're done, you're returned to the encounter with the resolved item filled in.

### Vault Hoards

For placed treasure that isn't tied to a specific creature — a dragon's lair, a locked vault, a merchant's strongbox — use the Vault tab. Choose the tier and the system generates a full hoard: coins, gems with descriptions, art objects, and magic item rolls. No CR needed.

### Settings

**Party Size** — Adjusts treasure for larger or smaller parties (default 4). A 6-player party gets ⅔ the per-creature treasure; a 3-player party gets 4/3.

**Magic Richness** — Multiplier on magic item probabilities (0.5×–1.5×). "Scarce" means fewer magic items but more coins. "Abundant" means magic items rain down.

**Show Values / Show Sale Price** — Display gold piece values and merchant buy-back prices on magic items.

**Sources** — Toggle sourcebooks on or off, or set priority (Off, Low, Normal, High, Emphasis). Sources are grouped by category: Core, Campaign Settings, Adventures, Digital/Supplemental, Third Party. Use the batch buttons to set an entire group at once.

**Edition** — Switch between 2014 and 2024 D&D 5e item data.
