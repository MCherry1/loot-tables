# Item Variant Audit Report

**Date:** April 13, 2026
**Method:** Cross-referenced 5etools items.json (2,416 items) against magic-items.ts (963 unique item names) and supplemental.ts. Checked for items with multiple variants (size, type, element, level) where our tables might have only one entry or be missing the item entirely.

---

## Already Handled Well ✓

These variant items are correctly represented in our tables with subtables or individual entries:

| Item | Variants | How we handle it |
|------|----------|-----------------|
| Spell Scroll | 10 levels (Cantrip–9th) | Level-specific entries: `Spell Scroll ([Spells-Level-N])` |
| Spellwrought Tattoo | 10 levels | Level-specific entries: `Spellwrought Tattoo ([Spells-Level-N])` |
| Barrier Tattoo | 3 sizes | Individual entries: Small/Medium/Large Barrier Tattoo |
| Sword of Answering | 9 named swords | Subtable: `[Answering-I]` |
| Shard Solitaire | 5 gem types | Subtable: `[Shard-I]` |
| Scroll of Protection | 14 creature types | Subtable: `[Creature-Type-C]` |
| Ring of Elemental Command | 4 elements | Subtable: `[Elemental-I]` |
| Sage's Signet | 6 animal variants | All 6 listed individually |

**No action needed for these.**

---

## Needs Subtable: Carpet of Flying ★SRD

**Currently:** One entry — "Carpet of Flying" as a single item.

**Should be:** A 4-entry subtable with size variants. Each size has different speed and carrying capacity:

| Variant | Size | Speed | Capacity | Rarity |
|---------|------|-------|----------|--------|
| Carpet of Flying, 3 ft. × 5 ft. | Small | 80 ft. | 200 lb. | Very Rare |
| Carpet of Flying, 4 ft. × 6 ft. | Medium | 60 ft. | 400 lb. | Very Rare |
| Carpet of Flying, 5 ft. × 7 ft. | Large | 40 ft. | 600 lb. | Very Rare |
| Carpet of Flying, 6 ft. × 9 ft. | Huge | 30 ft. | 800 lb. | Very Rare |

**Action:** Create a `Carpet-of-Flying` subtable with 4 entries. Replace the current "Carpet of Flying" entry in the parent table with `[Carpet-of-Flying]`. Suggested weights: 4/3/2/1 (smaller = more common, fits a d10 with other items or standalone as d4).

**This is SRD content** — all four variants have descriptions available under CC BY 4.0.

---

## Missing Items — Corrected Findings

### Items Confirmed Present (false alarm in initial audit)

| Item | How we name it | Where |
|------|---------------|-------|
| Elemental Essence Shard (Air/Earth/Fire/Water) | Air/Earth/Fire/Water Essence Shard | Sorcerer-G subtable, weight 1 each |
| Outer Essence Shard (Chaotic/Evil/Good/Lawful) | Chaotic/Evil/Good/Lawful Essence Shard | Sorcerer-G subtable, weight 1 each |
| Astral Shard, Far Realm Shard, Shadowfell Shard | Same names | Sorcerer-G subtable, weight 1 each |

These were flagged as "missing" because 5etools uses "Elemental Essence Shard (Air)" while our tables use "Air Essence Shard". **No action needed** — all 11 shards are present and correctly weighted.

### Weight-0 Cursed Items (present in Excel, missing from magic-items.ts)

The Excel has cursed items at weight 0 — intentionally present but not rollable:

| Item | Excel Location | Weight | Notes |
|------|---------------|--------|-------|
| `[Heavy-Armor] of Vulnerability` | Armor-G | 0 | Cursed. References Heavy-Armor subtable for armor type. |
| Cursed Luckstone | Misc-F | 0 | Cursed. From Ghosts of Saltmarsh. |

**These were filtered out during data extraction** (`scripts/extract-data.ts` likely skips weight-0 entries). The user's intent is that weight-0 items should exist in the tables as deliberate DM choices — visible in the Reference view, selectable by clicking, but never rolled randomly.

**Action:** Modify `extract-data.ts` to include weight-0 items. In the roller, weight-0 items are already excluded from random selection (they contribute 0 to the total weight). In the Reference view, weight-0 items should appear at the bottom of their subtable with a visual indicator (e.g., "Cursed — DM choice only" tag in `--ck-text-tertiary`).

### Items Genuinely Missing (not in Excel or magic-items.ts)

| Item | Source | Rarity | Variants | Recommendation |
|------|--------|--------|----------|----------------|
| Spell Gem | OotA | Uncommon–Legendary | 10 gem types | Adventure-specific. Add if Out of the Abyss source is enabled. Low priority. |
| Mind Crystal | PaBTSO | Common–Rare | 7 metamagic types | Adventure-specific. Add if PaBTSO source is enabled. Low priority. |
| Enspelled Staff | XDMG | Uncommon–Legendary | 9 spell levels | 2024-only. Will appear via `npm run sync:2024`. |
| Scroll of Titan Summoning | XDMG | Legendary | 7 creature types | 2024-only. Will appear via `npm run sync:2024`. |

---

## Recommendations

1. **Immediate:** Create `Carpet-of-Flying` subtable (4 size entries). This is the only item already in our tables that needs a subtable added.

2. **Extract script fix:** Modify `extract-data.ts` to include weight-0 items (cursed items like Armor of Vulnerability and Cursed Luckstone). These should be present in the data but not rollable.

3. **No subtable restructuring needed for essence shards.** The current approach (individual items like "Air Essence Shard" rather than "Elemental Essence Shard (Air)") works well. Each shard is its own item with its own weight — no parent/child relationship needed.

4. **2024 content:** Enspelled Staff and Scroll of Titan Summoning will be picked up by `npm run sync:2024`.

5. **Skip:** Flensing Claws (monster equipment), Mechanical Wonder (too obscure), Spell Gem and Mind Crystal (adventure-specific, low priority).

---

## SRD Audit Summary

Cross-checked 44 items against known SRD membership:
- **36 known SRD items checked:** 30 confirmed present in 5etools flags, 6 stored under variant names (Carpet of Flying sizes, etc.)
- **8 known non-SRD items checked:** 0 false positives
- **Conclusion:** The 5etools `srd`/`srd52` flag is reliable and conservative. It may miss a few SRD items (stored as variants) but will never incorrectly flag a non-SRD item as SRD. Safe to use as the basis for public description serving.
