# How This Works

### Loot Tables Tab

The Loot Tables tab is an interactive magic item roller. Pick a table letter (A through I), and you'll see every item on that table with its weight and probability.

**Rolling:** Click "Roll dN" to randomly select an item. The roll highlights the winner and pauses so you can see what you got. Click "Continue" to accept, or "Re-roll" to try again.

**Manual picking:** Click any row to select it directly — no randomness, you just choose. This is useful when you know what item you want to place.

**Sub-tables:** Some entries reference sub-tables (shown with an arrow indicator). When you pick one, the stepper walks you through each table in the chain. For example: Table G → Arms → Swords → Longsword. You can roll or pick at each step.

**Skip to End:** Auto-rolls all remaining steps and shows the final result immediately. Good for speed.

**Result card:** When an item is fully resolved, the result card shows its name, source book, and (if Show Item Details is enabled) its full description, rarity, and attunement requirements.

**Roll history:** Previous results are saved below the roller during your session. Clear them with the × button.

### Encounter Builder Tab

The Encounter Builder generates loot for an entire encounter at once.

**Adding creatures:** Set the CR, tier, and role for each creature group. Add as many groups as you need — 6 goblin minions, 2 hobgoblin elites, 1 bugbear boss.

**Roles determine treasure share:**
- **Minion** (×0.10) — pocket change. The fodder.
- **Elite** (×0.30) — personal stash worth looting.
- **Mini-boss** (×0.90) — well-equipped, significant personal treasure.
- **Boss** (×2.70) — the big score. Best gear and a real hoard.

**Rolling:** Click "Roll Encounter" and every creature generates its loot independently. Coins are rolled (not averaged), gems get full descriptions (type, size, cut, quality, color, and gold value), art objects are generated with evocative detail, and magic items are drawn from the weighted tables.

**Gems:** Each creature has a probability of carrying gems based on its XP share. When gems are present, they're drawn from a budget using 33 real-world gem types with log-scale value rolling — most are small and common, but occasionally something valuable shows up. Gem descriptions include size, quality, cut style, and color: "Sizable fine oval-cut ruby — 820 gp."

**Art objects:** Same probability system. 10 categories (jewelry, metalwork, sculpture, textile, etc.) produce descriptive items like "Copper chalice with silver filigree — 25 gp" or "Gold circlet set with four aquamarines — 2,500 gp."

**Spell components:** Certain critical spell components (Identify's pearl, Raise Dead's diamond, Resurrection's diamond, Gate's diamond) are automatically included in hoards at the appropriate tier, deducted from the coin budget. Players don't need to buy these separately — the loot system delivers them.

**Resolving magic items:** Magic items initially show as unresolved table references (e.g., "Table G"). Click any unresolved item to jump to the Loot Tables stepper and walk through the resolution. When you're done, you're returned to the encounter with the resolved item filled in.

### Settings Tab

**Party Size** — Adjusts treasure for larger or smaller parties (default 4). A 6-player party gets ⅔ the treasure per creature; a 3-player party gets 4/3.

**Magic Richness** — Multiplier on magic item probabilities (0.5×–1.5×). At "Scarce" your party finds fewer magic items but more coins. At "Abundant" magic items rain down.

**Party Level** — Number input (1–20). Used with Auto Tier to automatically select the correct hoard tier, and with Tier Progression to scale treasure within the tier.

**Auto Tier** — When enabled, the tier is automatically determined from Party Level (levels 1–4 = Tier 1, 5–10 = Tier 2, 11–16 = Tier 3, 17–20 = Tier 4). When disabled, you can manually select any tier.

**Tier Progression** — When enabled, treasure scales from 0.70× at the start of a tier to 1.30× at the end. A level 11 party gets leaner hoards than a level 16 party, even fighting the same monsters. This late-loads treasure within each tier, matching how published adventures tend to pace their rewards. When disabled, treasure is flat across the tier.

**Show Item Details** — When enabled, result cards display the item's full description, rarity, and attunement requirement.

**Show Values / Show Sale Price** — Display gold piece values and half-price sale values on magic items.

**Sources** — Toggle sourcebooks on/off or set priority (Off, Low, Normal, High, Emphasis). Sources are grouped by category: Core, Campaign Settings, Adventures, Digital/Supplemental, Third Party. Use the batch buttons to set an entire group at once.

**Edition** — Switch between 2014 and 2024 D&D 5e item data.

### Vault Hoard Tab

For placed treasure — a dragon's pile, a locked chest, a bandit camp treasury. Not tied to a specific creature's CR. Choose the tier and vault size, and the system generates an appropriate hoard.
