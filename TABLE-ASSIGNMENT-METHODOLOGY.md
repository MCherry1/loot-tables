# Table Assignment Methodology

## Overview

This document describes how magic items are assigned to tables (A–I), categories, sub-tables, and weights in the loot generation system. It covers both the manual curation philosophy used to build the original tables and the automated classification rules for ingesting new items from upstream data sources (5etools).

The system is designed to:
- Preserve the DMG's original table assignments as a baseline
- Extend to hundreds of non-DMG items using consistent heuristics
- Balance categories against individual items through nested table structure
- Support a hybrid roll/choose workflow where DMs can steer results to fit their party

---

## Table Structure Recap

| Table | Rarity | Tier | Base Value |
|-------|--------|------|------------|
| A | Common | — | 10 gp |
| B | Uncommon | Minor | 25 gp |
| F | Uncommon | Major | 100 gp |
| C | Rare | Minor | 250 gp |
| G | Rare | Major | 1,000 gp |
| D | Very Rare | Minor | 2,500 gp |
| H | Very Rare | Major | 10,000 gp |
| E | Legendary | Minor | 25,000 gp |
| I | Legendary | Major | 100,000 gp |

**Table A is special.** It holds all common items regardless of other properties. The minor/major distinction does not apply to common items. Attunement does not affect Table A assignment — many XGE/TCE common items require attunement and still belong on Table A.

**Minor vs Major only applies to Uncommon and above.** The split reflects how impactful an item is: minor items are consumable, situational, or limited-use; major items are permanent, broadly useful, or mechanically significant.

---

## Assignment Rules (Priority Order)

Items are classified by evaluating these rules in order. The first matching rule wins.

### Rule 0: Existing Curation Overrides

If an item exists in `curation.json` with `status: "approved"`, use that assignment. This preserves all manual decisions and is never overridden by auto-classification.

### Rule 1: DMG Original Assignments

If 5etools provides a `lootTables` field (e.g. `"Magic Item Table G"`), use that assignment. These are the 292 items the DMG explicitly placed on tables. They are the ground truth baseline.

**Exception:** A small number of items were deliberately moved down from their DMG table during original curation (e.g., certain Ioun stones moved down a tier for being mechanically weak). These overrides live in `curation.json` and take precedence via Rule 0.

### Rule 2: Common Items → Table A

If `rarity == "common"` → **Table A**. No further classification needed. This is absolute.

### Rule 3: Exclusions

The following items are excluded from all tables by default:
- Items with `curse: true` → excluded (status: "excluded", reason: "cursed")
- Items with `rarity == "artifact"` → excluded (artifacts are story items, not random loot)
- Items with `rarity == "varies"` → review queue (need manual rarity assignment)
- Items with `rarity == "unknown"` or `"unknown (magic)"` → review queue

### Rule 4: Rarity → Table Pair

For uncommon through legendary items, rarity determines which pair of tables (minor/major) the item could land on:

| Rarity | Minor Table | Major Table |
|--------|-------------|-------------|
| Uncommon | B | F |
| Rare | C | G |
| Very Rare | D | H |
| Legendary | E | I |

### Rule 5: Minor vs Major Classification

Within a rarity, determine minor or major:

**5a. If 5etools provides `tier` field** → use it directly. ~405 items have this.

**5b. If requires attunement AND rarity > common** → **Major**. Attunement is the single strongest predictor of major status (95% precision against the original tables). Items requiring attunement are almost always permanent, personal, and significant.

**5c. Override: attunement items that are still Minor.** Certain item patterns require attunement but are weak enough to be minor:
- Common items (already handled by Rule 2)
- Items that are purely flavor/utility with no mechanical combat benefit and no bonus fields

**5d. Non-attunement items that are still Major.** These patterns push a non-attunement item to major:
- Has `bonusWeapon`, `bonusAc`, or `bonusSavingThrow` (permanent stat bonuses)
- Has `bonusSpellAttack` or `bonusSpellSaveDc`
- Has `sentient: true`
- Is a stat-boost book (Manual of X, Tome of Y — permanent ability score increase)
- Has `attachedSpells` AND (`charges` with `recharge`) — reusable spell items (wands, staves)
- Has `modifySpeed` with permanent flight or teleportation
- Name contains "figurine of wondrous power" — summoning items, always major. Group with DMG originals that have pre-assignments.
- Name contains "deck of" — game-altering items (Deck of Many Things, Deck of Wild Cards, etc.), always major
- Item is part of a named progression series (Dormant/Awakened/Exalted or Stirring/Wakened/Ascendant) — progressive power items, always major
- `rarity == "legendary"` — legendary items are almost always major. The legendary minor table (E) is essentially just potions and spell scrolls. Any legendary item that isn't a potion or spell scroll → major.

**5e. "Similar item matching" heuristic:** When an unclassified item is mechanically similar to a DMG item that has a known table assignment, match it. Examples:
- Ornithopter of Flying is mechanically similar to Broom of Flying (DMG, Table F/major) → classify the same way
- A new +1d6 cold damage weapon should match existing +1d6 fire damage weapons
- This requires comparing bonus fields and mechanical properties against a reference set of DMG-assigned items

**5f. Default: no attunement → Minor.** Consumables, one-use items, limited-charge items without recharge, situational utility items.

### Mechanical Equivalency Rules (for rarity assignment of new items)

When 5etools provides an item without a `lootTables` assignment, its rarity is usually correct but occasionally an item's mechanics suggest it belongs on a different tier than its printed rarity. These equivalency rules capture the patterns from the original curation:

**Weapons:**
- +1 weapon (no other bonuses) → uncommon, **major** (Table F)
- +1 weapon with +1d6 extra damage → rare, **major** (Table G). The +1d6 bumps it up one rarity from a plain +1.
- +2 weapon ≈ +1 weapon with +1d6 damage. Same tier (rare major, Table G).
- +3 weapon → very rare, **major** (Table H)

**Armor:**
- Armor is always **one rarity tier higher than the equivalent weapon bonus**, because AC is more bounded in 5e game design.
- +1 armor → **rare**, major (Table G) — not uncommon like a +1 weapon
- +2 armor → **very rare**, major (Table H)
- +3 armor → **legendary**, major (Table I)

**Spellcasting foci (+N to spell attack/save DC):**
- Follow the same progression as weapons: +1 = uncommon major, +2 = rare major, +3 = very rare major

**General damage bonus equivalencies:**
- +1d6 damage (any type) ≈ +1 to attack/damage. Equivalent power level.
- An item that is effectively "+1 weapon + 1d6 damage" is one rarity above a plain +1 weapon.

### Rule 6: Category Assignment (Stage 2 — depends on table)

Category assignment is the SECOND stage. It only runs after the table letter is determined. The available categories differ by table type.

**Table A (Common):** Six categories on d100.
- **Potions-A** (40%) — Potion of Healing dominates. All `type: P` items.
- **Gear-A** (20%) — mechanically useful utility items (Bag of Holding, Driftglobe, Everbright Lantern). Items with concrete mechanical benefits.
- **Spell-Scrolls-A** (10%) — cantrip/1st/2nd level spell scrolls and spellwrought tattoos.
- **Arms-Armor-A** (10%) — common weapons, armor, ammunition, shields.
- **Spellcaster-A** (10%) — common spellcasting foci, class-attuned items.
- **Trinkets-A** (10%) — flavor/fun items with minimal mechanical impact (Cloak of Billowing, Wand of Smiles, Pipe of Smoke Monsters).

The Gear vs Trinkets distinction is editorial: "does this item have meaningful mechanical utility?" There is no reliable 5etools field that encodes this. The auto-classifier should attempt a best-guess split (items with `charges`, `attachedSpells`, or utility-suggesting names → Gear; items from XGE's common magic items list that are primarily flavor → Trinkets) but **flag all Gear/Trinkets assignments as ready-for-review**. The reviewer confirms which bucket each item belongs in.

**Tables B, C, D (Minor Uncommon/Rare/Very Rare):** Simplified. Only 5 categories:
- **Potions** — all items with 5etools `type: P`, including oils, philters, and bottled substances. Simpler than splitting by name; everything typed as a potion stays together.
- **Consumables** — multi-use items with charges that get expended (dusts, pigments, roses, tablets, bags of beans, necklace of fireballs, ointments)
- **Ammunition** — arrows, bolts, bullets, sling stones
- **Spells** — spell scrolls
- **Equipment** — everything else. No sub-classification. Apparel, jewelry, rods, wondrous items, armor without bonuses — all go here on minor tables.

**Table E (Minor Legendary):** Even simpler. Only:
- Potions, Consumables, Ammunition, Spells (no Equipment — too few items at this tier)

**Tables F, G, H, I (Major):** Rich categorization with sub-tables.

**Classification priority order for major tables (evaluate in this order, first match wins):**

**Priority 1 — Any spellcaster attunement → Spellcaster.** If `reqAttune` mentions ANY spellcaster class (wizard, sorcerer, bard, cleric, druid, warlock, paladin, ranger) OR the generic phrase "by a spellcaster" → **Spellcaster**. This overrides all keyword and type-based rules. A mask attuned to bard/sorcerer/warlock is Spellcaster, not Apparel. A wand that requires a spellcaster is Spellcaster, not Misc. A rod attuned to cleric/druid/paladin is Spellcaster, not Misc.

Items within the Spellcaster category are then subdivided into sub-tables as needed: Wizard, Sorcerer, Bard, Wands (spellcaster-attuned wands), and general Spellcaster.

Note: `reqAttune: true` (any creature, no class restriction) does NOT trigger this rule. Only explicit spellcaster class requirements or the generic "by a spellcaster" phrase.

**Priority 2 — "staff of" in name → Spellcaster.** Safety net for staves that might lack `reqAttuneTags` in the 5etools data. Nearly all staves are spellcaster items. The rare exception (a staff that is purely a weapon with no spellcaster connection) goes to Arms — but this should be caught by Priority 1 first (most weapon-only staves don't require spellcaster attunement).

**Priority 3 — Type-based rules:**

| 5etools `type` | Category | Notes |
|----------------|----------|-------|
| `P` | Potions | Unless name is "oil of", "bottled", "philter" → Consumables |
| `RG\|DMG` | Jewelry | Rings |
| `M` or `R` + `sentient` | Sentient | Sentient weapons sub-table |
| `M` or `R` (all other weapons) | Arms | |
| `S` | Armor | Shields. Sub-table if enough exist on that table. |
| `HA` / `MA` / `LA` | Armor | Heavy / Medium / Light |
| `RD\|DMG` | Misc | Rods (without spellcaster attunement — those were caught by Priority 1) |
| `WD\|DMG` + spellcaster attunement | Spellcaster | Wands sub-table under Spellcaster (caught by Priority 1) |
| `WD\|DMG` without spellcaster attunement | Misc | Wands anyone can use (Wand of Fear, Wand of Enemy Detection, etc.) |
| `SC\|DMG` | Misc | Non-spell scrolls on major tables (Tarrasque Summoning, etc.) |
| `SCF` | Spellcaster | Spellcasting foci. Sub-route to Wizard/Sorcerer/Bard by `focus` field. |
| `INS` | Misc | Musical instruments (without spellcaster attunement — those were caught by Priority 1) |
| `A` | Ammunition | (Rarely on major tables) |

**Priority 4 — Keyword matching** (for `type: "none"` / wondrous items):

| Pattern | Category | Notes |
|---------|----------|-------|
| boot, shoe, slipper, sandal | Apparel | |
| cloak, cape, robe, mantle, vestment | Apparel | |
| helm, helmet, cap, hat, hood, mask, crown, coronet, diadem | Apparel | |
| glove, gauntlet, bracer, vambrace (WITHOUT `bonusWeapon`/`dmg1`) | Apparel | Defensive hand items |
| glove, gauntlet, bracer, wraps (WITH `bonusWeapon`/`dmg1`) | Arms | Attack hand items |
| belt, girdle | Apparel | |
| goggles, eyes of, lenses | Apparel | |
| tattoo | Apparel | |
| ornament, scarf, shroud, bib, headband | Apparel | |
| ring of | Jewelry | |
| amulet, periapt, brooch, necklace, pendant, medallion, circlet, locket, torc | Jewelry | |
| talisman, scarab, charm of, solitaire, lodestone | Jewelry | |
| quiver | Arms | It's a ranged weapon accessory |
| manual of, tome of | Stat-Books | Sub-table of Misc |
| figurine | Misc | Figurines sub-table |
| dust of, pigment, ointment | Consumables | |
| scroll (non-spell, on major table) | Misc | |

**Priority 5 — Fallback → Misc.** Major-table catch-all.

Category descriptions:
- **Apparel** — wearable items anyone can use: boots, cloaks, robes, helms, gloves, bracers (defensive), belts, goggles, crowns, tattoos, scarves, ornaments
- **Armor** — items requiring armor proficiency: heavy/medium/light armor, shields. Shields may have their own sub-table on tables with enough shields.
- **Arms** — weapons and weapon-like items: swords, axes, bows, maces, plus gauntlets/bracers/wraps/tattoos that deal damage. Also quivers and weapon accessories.
- **Jewelry** — rings, amulets, periapts, brooches, necklaces, pendants, medallions, circlets, talismans, scarabs, charms, ioun stones, gems (magic gem items like Shard Solitaire, Amethyst Lodestone)
- **Spellcaster** — any item requiring spellcaster attunement: staves, spellcasting foci, wands with spellcaster attunement, rods with spellcaster attunement, class-attuned masks/mantles/bracers/cauldrons/etc. Sub-tables for Wizard, Sorcerer, Bard, and Wands when enough items exist.
- **Misc** — major-table catch-all: wands without spellcaster attunement (Wand of Fear, Wand of Enemy Detection), rods without spellcaster attunement (Rod of Rulership, Rod of Security), instruments without spellcaster attunement (Pipes of Haunting, War Horn), figurines, bowls/braziers, decks, legendary scrolls, miscellaneous powerful items

### Rule 7: Sub-Table Refs

Some items need sub-table references because they come in variants:
- Weapons with `baseItem` pointing to a specific weapon → no ref needed (it IS the specific weapon)
- Items that say "any sword" or reference a weapon category → `[Swords]`, `[Weapons]`, etc.
- Armor items that specify a base armor type → no ref needed
- Items that say "any armor" → `[Armor]` ref
- Items with damage type variants (e.g., "Resistance") → `[Damage-Type]` ref
- Items with dragon color variants → `[Dragon-Color]` ref

Auto-detection: check the item's `entries` text for phrases like "any melee weapon", "any sword", "one type of armor", "choose a damage type". Map these to the appropriate sub-table ref.

---

## Weight Assignment Philosophy

### Weights Are About Tree Balancing

Weights in this system do **not** represent individual item power or desirability. They represent how frequently an item should appear *relative to its siblings in the same sub-table*, with the goal of giving every terminal item in the full tree a roughly equal probability of being the final result.

The nested table structure is itself the primary balancing mechanism:
- A category with many items (e.g., Wizard spellcasting foci) is gated behind a sub-table
- The category's weight in the parent table controls how often that entire branch is entered
- Individual items within the sub-table are balanced relative to each other

### Weight Rules

### Weight Rules

**Weights are always positive integers** because they map to dice ranges. A sub-table's total weight determines the die type, and each item's weight is a contiguous range on that die. This means you can't assign fractional weights — balancing requires quantized decisions.

**Standard dice only.** Sub-table totals must map to a physically rollable die: d4, d6, d8, d10, d12, d20, or d100. Nothing else. Root tables (Magic Item Table A through I) are always d100.

**When items don't fit a clean die**, round up to the next standard die and distribute the slack:
- 11 items can't use d10. d12 wastes only 1 slot but gives one item unfair double weight.
- So go to d20: 9 items get weight 2, 2 items get weight 1. Pick the least exciting items for the weight-1 slots.
- If a table would exceed d20, either jump to d100 (lots of room) or split into sub-tables.
- Splitting into sub-tables is effectively nested dice: a d6 category roll × a d4 within-category roll = 24 effective slots.

**Sub-tables are created when needed for balance, not by default.** Only create a sub-table when the parent table is getting too large for its die, or when a category is overwhelming its siblings (like class-specific spellcaster items).

**New auto-classified items get a default weight of 3.** This is the most common weight in the existing tables and a safe starting point. The actual weight tuning happens during human review.

**Existing items (seeded from current tables) keep their exact weights.** These are the result of careful manual curation and should not be auto-adjusted.

### Rebalancing When Adding Items

When new items are added to a sub-table, the total weight changes. This may push the table past its current die size. The system handles this by proposing a rebalanced table:

**The "steal probability" method:**
1. Calculate the new total weight with the new item(s) at default weight.
2. If the total still fits the current die → no rebalancing needed, just assign weight.
3. If the total exceeds the current die:
   a. Check if it fits the next standard die up. If so, expand to that die and redistribute slack (some items get +1 weight).
   b. If not, propose splitting a category into a sub-table, or suggest which items to steal probability from.
4. "Stealing" means reducing the weight of existing items to make room. Prefer stealing from:
   - The most dominant item on the table (e.g., Potion of Healing at weight 30 on a d100 → trim to 25)
   - Items at the bottom of their weight tier that are the least interesting
   - Items in the same category as the new item (so total category probability stays similar, but specific items shift)

**Example:** Table A is d100. Potion of Healing has weight 30 (~30%). Adding 5 new potions: steal 10 weight from Potion of Healing (now 20), give 2 weight to each new potion. Total potions probability is similar, but the mix is more interesting.

**The review UI should present rebalancing proposals as highlighted diffs:**
- Green: new items being added, with proposed weight
- Yellow: existing items whose weight changed, showing old → new
- The total and die type shown before and after
- One-click to accept the proposal, or manual adjustment

### Review Batching by Source

Reviews are grouped by source book, not accumulated into a single growing queue. When 5etools adds items from a new book:

- All items from that book form one review batch
- The batch view shows: "4 new items from Bigby Presents: Glory of the Giants"
- For each item: auto-classified table, category, proposed weight, the sub-table context
- Items may land on different tables (one rare weapon on G, one uncommon trinket on B) — the batch still groups them for review
- Approve individually or approve the whole batch
- Rebalancing proposals are shown per-table (since items from one book may affect multiple tables)

This prevents the review queue from becoming an overwhelming backlog. Each review is scoped, bounded, and actionable.

**Category-specific defaults:**

| Category | Default Weight | Rationale |
|----------|---------------|-----------|
| Potions (common/uncommon) | 5 | Consumable, everyone can use, frequently found |
| Potions (rare+) | 1 | Powerful consumables are rare finds |
| Apparel | 3–4 | Broadly useful, popular loot |
| Arms (weapons) | 3 | Standard |
| Spellcaster | 3 | Standard |
| Jewelry | 1–2 | Niche — lots of rings exist, don't want to overwhelm |
| Consumables | 1 | One-use items, less exciting |
| Equipment (minor catch-all) | 1–3 | Varies widely, default to 1 for unreviewed items |
| Miscellaneous (major catch-all) | 1–3 | Varies widely, default to 1 for unreviewed items |
| Sentient weapons | 9 | Rare and dramatic — when they show up, it's a moment |
| Stat books | 1 | Game-warping, keep very rare |
| Shields | 1 | Not every character uses shields |
| Class-specific sub-tables (Wizard, Sorcerer, Bard) | 1 per item | The sub-table category weight controls overall frequency |

**Category weight balancing (parent table entries):**

When a category has many items gated behind a sub-table, the category's weight in the parent table should be set so that the probability of entering that branch is proportional to the "fair share" of that category, NOT proportional to the number of items it contains.

Example: If Table G has 6 categories and you want roughly equal category representation, each category gets roughly equal parent weight. The fact that Arms-G has 40 items and Figurines has 9 items doesn't mean Arms should be 4x more likely — the sub-table handles the internal distribution.

**Niche category depression:** Categories that only apply to certain character builds get depressed weights relative to universally-useful categories:
- Shields: ~60% of normal weight (not all characters use shields)
- Class-specific (Wizard, Sorcerer, Bard): controlled by sub-table gating, parent entry is already depressed
- Setting-specific items: handled by source emphasis system, not individual weights

### When to Create a New Sub-Table

A new sub-table should be created when:
1. A category would have many items that belong to a recognizable sub-group (e.g., 5+ wizard-specific items within Spellcaster)
2. One sub-group would overwhelm its siblings without gating (e.g., if TCE added 12 wizard items but only 2 bard items, gate wizard items)
3. A DM would naturally want to filter or reroll within that sub-group (e.g., "I rolled Spellcaster → Wizard, but we don't have a wizard, let me reroll")

Sub-tables should NOT be created for very small groups (< 3 items) — those just go directly in the parent table.

---

## The 5etools Ingest Pipeline

### Data Flow

```
5etools items.json (upstream, read-only)
         ↓
    ingest script (filter + auto-classify)
         ↓
  auto-assignments.json (generated, reproducible from rules above)
         +
  curation.json (manual overrides, checked into git)
         ↓
    merge script
         ↓
  src/data/magic-items.ts (final output for the app)
```

### curation.json Schema

```typescript
interface CurationEntry {
  /** Which table this item belongs to */
  table: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';
  /** Which category within that table */
  category: string;
  /** Weight (integer). Null = not yet assigned, use default. */
  weight: number | null;
  /** Sub-table references this item carries */
  refs?: string[];
  /** Curation status */
  status: 'approved' | 'ready-for-review' | 'excluded';
  /** Reason for exclusion */
  reason?: string;
  /** Optional notes */
  notes?: string;
}

// Keyed by "ItemName|Source" (5etools' unique key format)
type CurationFile = Record<string, CurationEntry>;
```

**Status values:**
- `approved` — Human has confirmed the assignment. Fully trusted.
- `ready-for-review` — Auto-classified, in the tables, rollable. But the human hasn't personally confirmed it yet. Not a blocker — just a flag.
- `excluded` — Deliberately removed from all tables (cursed items, artifacts, items you don't want).

### Seeding from Existing Tables

The initial `curation.json` should be seeded by reverse-engineering the current `magic-items.ts`:
- For each terminal item in the current tables, create a curation entry with `status: "approved"`
- The table letter and category are extracted from the item's position in the tree
- The actual integer weight from the existing tables is preserved directly
- Sub-table refs are extracted from composed entry names

This preserves all existing curation decisions as the immutable baseline. These 885 items are the foundation — auto-classification only applies to items NOT already in the curation file.

### Update Workflow

1. **Sync**: Pull fresh `items.json` from 5etools. Run ingest script.
2. **Diff**: Compare against `curation.json`. New items not in the curation file get auto-classified.
3. **Auto-assign**: New items get a table letter and category from the rules engine. They get a default weight (3, or category-specific default). Status is set to `"ready-for-review"`.
4. **Live immediately**: Auto-assigned items appear in the tables and are rollable right away. They're functional — just unconfirmed.
5. **Review at your pace**: Open admin UI. See items flagged as "ready for review." Confirm assignments, adjust weights, reassign categories. Each confirmed item moves to `status: "approved"`.
6. **Weight tuning**: This is the manual step that matters most. The review UI shows the sub-table context — what siblings exist, what the current die is, how adding this item at weight N changes things. Adjust weight, confirm, move on.
7. **Build**: Merge script produces final `magic-items.ts`.

Items removed from 5etools upstream (edition changes, corrections) should be flagged but not auto-removed from `curation.json` — the curator decides whether to remove them.

### Source Abbreviation Alignment

Your tables and 5etools may use different abbreviations for the same source book. Known mismatches:

| Your abbreviation | 5etools abbreviation | Book |
|-------------------|---------------------|------|
| KGV | KftGV | Keys from the Golden Vault |
| IDRotF | IdRotF | Icewind Dale: Rime of the Frostmaiden |
| DIA | BGDIA | Baldur's Gate: Descent into Avernus |

The ingest script must maintain a mapping table for these. When matching items between your curation file and 5etools data, normalize source abbreviations through this table. New mismatches should be flagged during sync.

### Review UI

The admin/editor view (gated behind auth, accessible from Settings tab) shows:

- **Ready for review**: Items with `status: "ready-for-review"` — auto-classified, live in tables, awaiting human confirmation
- **Approved**: Items with `status: "approved"` — manually confirmed
- **Excluded**: Items with `status: "excluded"` — acknowledged but hidden

Each item row shows:
- Item name and source (full book name)
- 5etools rarity, type, attunement, bonus fields
- Auto-classified table, category, weight (editable)
- Status toggle
- Notes field
- Item description/stats (behind admin gate, from 5etools `entries`)

**Weight-in-context view**: When editing an item's weight, show the full sub-table it belongs to — all siblings, their weights, the current total, what die it maps to, and how this item's weight changes the die. This context is essential for the dice-quantization balancing.

**Speed is critical.** If the review experience is clunky, it won't get done. Design for:
- One-click approve for items that look right
- Inline editing (no modals, no separate pages)
- Keyboard shortcuts (arrows to navigate, number keys for weight, Enter to approve)
- Filter by status, source, rarity, table letter, category
- Sort by source (review all items from a new book at once)
- Batch operations ("set all unreviewed items in this sub-table to weight 2")

Filters: by status, by source, by rarity, by table letter, by category. Search by name.

### Public vs Private Build

The merge script has two output modes:

**Public build** (for GitHub Pages deployment):
- Item names, sources, table assignments, categories, weights, sub-table refs
- No item descriptions, no stat blocks, no `entries` text
- This is the creative curation work (which items, where, what weight) — not copyrightable content

**Private build** (for personal use):
- Everything in public build, plus:
- Full 5etools `entries` text (item descriptions and mechanics)
- Bonus fields, charges, attunement details, attached spells
- Displayed in the stepper UI when clicking an item for details

The build target is a flag in the build script, not a runtime toggle. The deployed site never contains copyrighted content.

---

## Table A Restructure

Table A (Common) had 11 categories on a d20, which was over-structured for common-tier items. The new structure simplifies to 6 entries on a d100 (root tables are always d100).

### Problems with the Original Table A

1. **Too many categories.** 11 categories with most at weight 1 (5% each). Common items don't need rich categorization — a DM doesn't choose between "common Apparel" and "common Jewelry."
2. **Items-A was doing triple duty.** It was the 41-item catch-all AND referenced by Apparel-A AND referenced by Jewelry-A. Rolling on Apparel could dump you into the same catch-all.
3. **Food-A was over-engineered.** Sub-tables for specific beverages (Coffee, Black Tea, Green Tea) and ingredients (Game, Vegetables) — flavor items masquerading as mechanical structure.
4. **Eberron items dominated Items-A.** Exploring Eberron items had hardcoded weight 5 while XGE items had weight 1. Source emphasis should handle this, not structural weight.

### New Structure

```
Magic Item Table A (d100)
─────────────────────────────────────────
[Potions-A]         w=40  (40%)    5 items
[Gear-A]            w=20  (20%)   23 items
[Spell Scrolls-A]   w=10  (10%)    6 items
[Arms & Armor-A]    w=10  (10%)    9 items
[Spellcaster-A]     w=10  (10%)   10 items
[Trinkets-A]        w=10  (10%)  ~49 items
```

Practical: **90%**. Fun: **10%**. Clean d100 with room to add new items to any category without rebalancing the top level.

### Category Definitions

**Potions-A (40%)** — Healing potions dominate, as the DMG intended. Potion of Healing at internal weight 12 (~24% overall — roughly one in four rolls). Plus Climbing, Comprehension, Watchful Rest, Greater Healing. New common potions from future books slot in easily.

**Gear-A (20%)** — Practical adventuring equipment. Items that solve real problems for a party. Bag of Holding lives here at internal weight 2 (~1.1% overall, close to the DMG's original 1%). The full list:

| Item | Why it's gear |
|------|--------------|
| Bag of Holding | Storage — the classic |
| Driftglobe | Reliable light + levitation |
| Everbright Lantern | Permanent hands-free light |
| Lantern of Tracking | Tracking creatures by type |
| Breathing Bubble | Underwater survival |
| Feather Token | Fall protection |
| Thermal Cube | Environmental protection |
| Rope of Mending | Self-repairing utility rope |
| Horn of Silent Alarm | Silent 600ft communication |
| Clockwork Amulet | Guarantees a 10 on one d20 |
| Lock of Trickery | Appears locked when unlocked and vice versa |
| Chest of Preserving | Prevents food spoilage |
| Orb of Direction | Always find north |
| Orb of Time | Always know the time |
| Ear Horn of Hearing | Suppresses deafness |
| Coin of Delving | Measures depth when dropped |
| Vox Seeker | Clockwork tracking device |
| Shiftweave | Practical disguise clothing |
| Spellshard | Information storage |
| Cleansing Stone | Party hygiene |
| Ersatz Eye | Replaces a lost eye |
| Prosthetic Limb | Replaces a lost limb |
| Mystery Key | 5% chance to open any lock |

**Spell Scrolls-A (10%)** — Spell scrolls and spellwrought tattoos, cantrip through 2nd level. Keep internal structure as-is.

**Arms & Armor-A (10%)** — Common-tier weapons, armor, ammunition, and shields. Moon-Touched Swords via `[Swords]` ref, generic mundane-plus weapons via `[Weapons]` ref, Cast-Off Armor, Armor of Gleaming, Smoldering Armor, Shield of Expression, Walloping Ammunition, Unbreakable Ammunition.

**Spellcaster-A (10%)** — Items requiring spellcaster attunement or functioning as spellcasting foci: Dark Shard Amulet, Ruby of the War Mage, Enduring Spellbook, Hat of Wizardry, Instruments of Illusions/Scribing, and Eberron foci (Orb of Shielding, Imbued Wood — at normal weight, source emphasis handles Eberron representation).

**Trinkets-A (10%)** — The fun stuff. Flavor items, joke items, appearance-changers, novelties. Cloak of Billowing, Wand of Smiles, Pipe of Smoke Monsters, Pole of Angling, Talking Doll, Clothes of Mending, Common Glamerweave, Perfume of Bewitching, and so on. One flat table, no sub-tables. Weight all items at 1 within this table — no item here is more important than another. Source emphasis handles Eberron vs XGE balance. Former Food-A items (Beads of Nourishment, Beads of Refreshment, Bottle of Boundless Coffee, Tankard of Plenty) become individual Trinkets entries at weight 1.

### What Gets Dropped

- **Food-A, Beverages-A, Alcohols-A, Ingredients-A** — beverage/ingredient sub-tables removed entirely. The actual items become Trinkets entries.
- **Apparel-A** as a separate category — merged, items split between Gear (wearable utility) and Trinkets (wearable fashion).
- **Jewelry-A** as a separate category — merged into Trinkets.
- **Items-A / Misc-A split** — replaced by the Gear/Trinkets split. Practical items → Gear, everything else → Trinkets.
- **Prosthesis sub-table** — Ersatz Eye and Prosthetic Limb are individual Gear entries.
- **Warforged-A sub-table** — setting-specific, handled by source emphasis on ERLW.
- **Original-DMG-A** — legacy reference table no longer needed. The new structure preserves DMG intent (potions dominant, Bag of Holding ~1%).

### Auto-Classification for Table A

```
If potion or elixir → Potions-A
If spell scroll or spellwrought tattoo → Spell Scrolls-A
If has spellcaster class attunement OR is SCF/focus → Spellcaster-A
If weapon (M, R) OR armor (HA, MA, LA, S) OR ammunition (A) → Arms & Armor-A
If item solves a practical problem (see Gear list) → Gear-A
Everything else → Trinkets-A
```

The Gear-A classification requires a curated list of what counts as "practical" since there's no structured field in 5etools that distinguishes utility from flavor. New common items default to Trinkets-A and can be promoted to Gear-A during review if they're genuinely useful.

---

## Admin Persistence: GitHub API + Local Drafts

The deployed GitHub Pages site is static and cannot write back to the repo. The admin UI uses a two-layer approach:

### Draft Layer (localStorage)

All changes made in the admin UI (approving items, adjusting weights, reassigning categories, excluding items) save immediately to the browser's localStorage as a draft. This means:
- You can review 3 items, close the tab, come back tomorrow, and your changes are still there
- Multiple review sessions accumulate into one draft
- No data loss if you lose connection or close accidentally
- Drafts are per-browser (your phone and laptop have separate drafts)

### Publish Layer (GitHub API)

When you're satisfied with a batch of changes, you click "Publish" in the admin UI. This:
1. Reads the current `curation.json` from the repo via GitHub API (GET `/repos/MCherry1/loot-tables/contents/data/curation.json`)
2. Merges your draft changes into it
3. Commits the updated file back to the repo (PUT with the file's SHA)
4. GitHub Actions rebuilds and deploys the site
5. Clears the published changes from localStorage draft

### Authentication

The admin UI has a one-time setup in its settings panel where you paste a GitHub Personal Access Token (PAT). The token:
- Only needs `repo` scope on the loot-tables repository
- Is stored in localStorage, never in the repo or deployed code
- Is only sent to `api.github.com`, never to any other endpoint
- Can be revoked and regenerated from GitHub settings at any time

### Conflict Handling

If someone (or a sync script) updated `curation.json` in the repo since your last fetch, the publish step detects the SHA mismatch. In that case:
- Fetch the latest version
- Merge changes (your overrides take precedence for items you explicitly reviewed)
- Re-commit with the new SHA
- If a true conflict exists (same item edited both places), flag it for manual resolution

### Offline / Fallback

If the GitHub API is unavailable or you prefer not to use a token, the admin UI offers an "Export" button that downloads the merged `curation.json` as a file. You can then manually commit it to the repo.
