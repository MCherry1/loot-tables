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

## Missing Items — Worth Adding

These items exist in 5etools with variants but are completely absent from our tables. They may have been missed during curation or may be from sources that weren't included.

### High Priority (2014 Sources)

| Item | Source | Rarity | Variants | Notes |
|------|--------|--------|----------|-------|
| Armor of Vulnerability | DMG | Rare | 3 (Bludgeoning/Piercing/Slashing) | ★SRD. Cursed armor — might have been intentionally excluded? Verify. |
| Elemental Essence Shard | TCE | Rare | 4 elements + 1 generic | Sorcerer-attuned metamagic item. Fits Spellcaster subtables. |
| Outer Essence Shard | TCE | Rare | 4 alignments + 1 generic | Sorcerer-attuned metamagic item. Fits Spellcaster subtables. |
| Spell Gem | OotA | Uncommon–Legendary | 10 gem types by spell level | Out of the Abyss. Interesting niche item — gem stores a spell. |

### Medium Priority (Adventure/Expansion Sources)

| Item | Source | Rarity | Variants | Notes |
|------|--------|--------|----------|-------|
| Mind Crystal | PaBTSO | Common–Rare | 7 metamagic types | Phandelver and Below. Single-use metamagic stones. |
| Shard Solitaire | KftGV | Legendary | 5 gem types | Keys from the Golden Vault. Already has `[Shard-I]` subtable — verify these are included in it. |

### Low Priority (2024-Only / Obscure)

| Item | Source | Rarity | Variants | Notes |
|------|--------|--------|----------|-------|
| Enspelled Staff | XDMG | Uncommon–Legendary | 9 spell levels | 2024 DMG only. Equivalent to spell scrolls but as staffs. |
| Scroll of Titan Summoning | XDMG | Legendary | 7 creature types | 2024 DMG only. Very niche high-level item. |
| Flensing Claws | VGM | Unknown | 4 sizes | Monster equipment from Volo's Guide, not typical player loot. Skip. |
| Mechanical Wonder | FRAiF | Common–Rare | 4 types | From a Forgotten Realms adventure. Very obscure. |

---

## Recommendations

1. **Immediate:** Create `Carpet-of-Flying` subtable (4 entries). This is the only item already in our tables that needs a subtable added.

2. **Curation review:** Add Armor of Vulnerability, Elemental Essence Shard, Outer Essence Shard, and Spell Gem to the curation pipeline. They should be auto-classified and appear for review.

3. **2024 content:** Enspelled Staff and Scroll of Titan Summoning should be picked up by `npm run sync:2024` when the 2024 curation is next updated.

4. **Skip:** Flensing Claws (monster equipment) and Mechanical Wonder (too obscure).

---

## SRD Audit Summary

Cross-checked 44 items against known SRD membership:
- **36 known SRD items checked:** 30 confirmed present in 5etools flags, 6 stored under variant names (Carpet of Flying sizes, etc.)
- **8 known non-SRD items checked:** 0 false positives
- **Conclusion:** The 5etools `srd`/`srd52` flag is reliable and conservative. It may miss a few SRD items (stored as variants) but will never incorrectly flag a non-SRD item as SRD. Safe to use as the basis for public description serving.
