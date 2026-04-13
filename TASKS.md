# Tasks & Implementation Plan

Current priorities and future work for the CherryKeep loot generator.

Specs live in `specs/`. Read the relevant spec BEFORE starting each task — they are detailed and literal.

---

## 🔴 Priority 0: Data Cleanup (before visual redesign)

These are quick data-level fixes that should land before the UI work begins, since the visual redesign and Reference view will display this data.

### Subtable Rectification — Align Names with 5etools

Our tables use custom item names (e.g., "Air Essence Shard") while 5etools uses the canonical names (e.g., "Elemental Essence Shard (Air)"). Since 5etools is our sync pipeline source, rename items to match 5etools naming and introduce subtables where the data naturally groups.

**Changes to `src/data/magic-items.ts`:**

1. **Elemental Essence Shards** — Currently 4 separate items in Sorcerer-G: "Air Essence Shard", "Earth Essence Shard", "Fire Essence Shard", "Water Essence Shard". Replace with a single parent entry `[Elemental-Essence-Shard]` and a new subtable:
   ```
   "Elemental-Essence-Shard": [
     { "name": "Elemental Essence Shard (Air)", "source": "TCE", "weight": 1 },
     { "name": "Elemental Essence Shard (Earth)", "source": "TCE", "weight": 1 },
     { "name": "Elemental Essence Shard (Fire)", "source": "TCE", "weight": 1 },
     { "name": "Elemental Essence Shard (Water)", "source": "TCE", "weight": 1 }
   ]
   ```
   Die: d4. Equal weights. The parent entry in Sorcerer-G gets the combined weight of the 4 items it replaces (4, or whatever their current total is).

2. **Outer Essence Shards** — Currently "Chaotic Essence Shard", "Evil Essence Shard", "Good Essence Shard", "Lawful Essence Shard" in Sorcerer-G. Replace with `[Outer-Essence-Shard]`:
   ```
   "Outer-Essence-Shard": [
     { "name": "Outer Essence Shard (Chaotic)", "source": "TCE", "weight": 1 },
     { "name": "Outer Essence Shard (Evil)", "source": "TCE", "weight": 1 },
     { "name": "Outer Essence Shard (Good)", "source": "TCE", "weight": 1 },
     { "name": "Outer Essence Shard (Lawful)", "source": "TCE", "weight": 1 }
   ]
   ```
   Die: d4. Equal weights.

3. **Astral Shard, Far Realm Shard, Shadowfell Shard** — These are NOT subtypes of the same item. They are three distinct items. Keep them as individual entries. But verify the names match 5etools exactly.

4. **Carpet of Flying** — Currently one entry. Replace with `[Carpet-of-Flying]`:
   ```
   "Carpet-of-Flying": [
     { "name": "Carpet of Flying, 3 ft. × 5 ft.", "source": "DMG", "weight": 4 },
     { "name": "Carpet of Flying, 4 ft. × 6 ft.", "source": "DMG", "weight": 3 },
     { "name": "Carpet of Flying, 5 ft. × 7 ft.", "source": "DMG", "weight": 2 },
     { "name": "Carpet of Flying, 6 ft. × 9 ft.", "source": "DMG", "weight": 1 }
   ]
   ```
   Die: d10. Smaller carpets are more common (lighter, cheaper in-world).

5. **Systematic naming fixes** — Our items use different naming conventions than 5etools. These MUST be aligned for item-stats lookups (descriptions, SRD flags) to work. The fixes, ordered by impact:

   **a) +N prefix vs suffix (~30 items, 10 base items × 3 tiers):**
   Our format: `"All-Purpose Tool, +1"` → 5etools: `"+1 All-Purpose Tool"`
   Affected: All-Purpose Tool, Amulet of the Devout, Arcane Grimoire, Bloodwell Vial, Dragonhide Belt, Fate Dealer's Deck, Moon Sickle, Rhythm-Maker's Drum, Rod of the Pact Keeper, Wand of the War Mage, Wraps of Unarmed Prowess. Each has +1/+2/+3 variants.
   **Fix:** Rename all to `"+N ItemName"` format.

   **b) Barrier Tattoo (3 items):**
   Ours: `"Small Barrier Tattoo"` → 5etools: `"Barrier Tattoo (Small)"`
   **Fix:** Rename to `"Barrier Tattoo (Small/Medium/Large)"`.

   **c) Sage's Signet (6 items):**
   Ours: `"Sage's Bear Signet"` → 5etools: `"Sage's Signet (Bear)"`
   **Fix:** Rename to `"Sage's Signet (Bear/Hart/Lion/Serpent/Songbird/Wolf)"`.

   **d) Specific one-off renames:**
   - `"Boots of Springing and Striding"` → `"Boots of Striding and Springing"` (word order)
   - `"Elven Chain Shirt, +1"` → `"Elven Chain"` (5etools name)
   - `"Efreeti Chain Mail"` → `"Efreeti Chain"` (5etools name)
   - `"Plate Armor of Invulnerability"` → `"Armor of Invulnerability"` (5etools name, verify)
   - `"Glamoured Studded Leather, +1"` → check 5etools exact name

   **Important context:** The existing stepper's `lookupItemStats` function (LootTables.tsx:50-145) already has six fallback strategies that handle most of these mismatches — including a `"Foo, +N" → "+N Foo"` conversion (step 6) and subtable-ref stripping (step 4). So **the current stepper will NOT break** if renames are deferred. Descriptions already work for most items despite the naming differences.

   **Why rename anyway:** The Reference view displays items directly from the data (no stepper composition), and the SRD flag matching uses exact `name|source` keys. Without renaming, the Reference view would need its own parallel lookup logic, and SRD descriptions wouldn't serve publicly for misnamed items. Renaming is a one-time cleanup that simplifies everything downstream.

   **e) Subtable shortnames (141 items) — DO NOT RENAME these.** Items like "Answerer, CG, Emerald" in the Answering-I subtable are intentionally short because the parent entry provides context. The item-stats lookup for these must use the composed name (parent + variant), not the shortname alone. The stepper already does this via `composedName`. Verify the Reference view does the same.

**Also update `scripts/extract-data.ts`:**
- Include weight-0 items in the output (currently filtered out).
- These are cursed items that exist in the tables but are not rollable.

### Weight-0 Cursed Item Display

Weight-0 items (cursed items like Armor of Vulnerability, Cursed Luckstone) should appear in the tables with special treatment:

**In the stepper (Magic Item Tables tab):**
- Weight-0 items appear at the bottom of their subtable, below all weighted items.
- The dice range column shows an en-dash `–` instead of a number range.
- The item name is displayed normally (not grayed out — it's a deliberate choice, not disabled).
- The item IS clickable. Clicking it selects it as if the DM chose it manually.
- The ROLL button never lands on weight-0 items (they contribute 0 to the total, so they have no dice range).

**In the Reference view:**
- Same placement: bottom of subtable, en-dash for range.
- Add a small tag after the item name: "Cursed" in `--ck-text-tertiary` with a subtle style.
- Clicking the row opens the detail panel same as any other item.

**In the roll result (if manually selected):**
- Show normally, but add "Cursed Item" label in the result metadata.

**CSS for weight-0 rows:**
```css
.entry-row.cursed .entry-dice-range,
.ref-row.cursed .ref-range {
  color: var(--ck-text-tertiary);
  font-style: italic;
}

.cursed-tag {
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-xs);
  color: var(--ck-text-tertiary);
  font-style: italic;
  margin-left: 6px;
}
```

---

## 🔴 Priority 1: CherryKeep Visual Redesign

**Spec:** `specs/CHERRYKEEP-DESIGN-SPEC.md`

Complete visual overhaul from the "DM's Binder" parchment theme to the "Iron Forge + Cherry" design system. This is the foundation — everything else depends on these design tokens being in place.

**Implementation order (follow the spec's Section 10 step-by-step):**

1. **Engine types** — Delete `Palette` type, remove `palette` from `CampaignSettings` (`src/engine/types.ts`, `src/engine/constants.ts`).
2. **Self-host fonts** — Download WOFF2 files for Cinzel, Crimson Text, and Source Sans 3 into `public/fonts/`. Add `@font-face` declarations to `app.css` per spec Section 4.1. DELETE the Google Fonts `<link>` tags from `index.html`. Update `<title>` to "CherryKeep — D&D 5e Loot Tools".
3. **CSS tokens** — In `src/web/styles/app.css`, delete ALL palette blocks (`:root` through all `[data-palette='...']` variants, ~235 lines). Replace with the new `:root` (dark default) and `[data-theme='light']` blocks from the spec.
4. **CSS migration** — Find-and-replace every `var(--old-token)` → `var(--ck-*)` using the mapping table in spec Section 3. Replace every `font-family` using the mapping in spec Section 4.4. Update base styles (`html`, `body`, `button`) per spec Section 5. Add global `:focus-visible` rule.
5. **Layout** — Replace `<h1 class="app-title">` + `.tab-bar` in `App.tsx` with the new `<nav class="ck-nav">` structure (spec Section 6). Add theme toggle (☀ ◐ ☾) to nav bar. Add footer.
6. **Components** — Update cards, table pills (replacing letter tabs), buttons, segmented controls, entry rows, result card, inputs per spec Section 7. Each component has exact CSS provided.
7. **LootTables.tsx** — Replace letter tab JSX with scrollable pill bar. Add `TABLE_SUBTITLES` constant.
8. **CampaignSettings.tsx** — Remove palette selector. Theme toggle can stay as secondary location or be removed (nav bar is primary).
9. **Responsive** — Update mobile breakpoints per spec Section 9.
10. **Verify** — Run through the 10-point checklist in spec Section 12.

**Key constraints:**
- Every interactive element: 44px minimum touch target.
- Every interactive element: visible `:focus-visible` ring for keyboard users.
- Active/selected elements pop UP from scale(1.0) baseline. Never shrink inactive elements.
- Zero texture images. All effects are GPU-accelerated CSS (transform, opacity, box-shadow).
- The `data-theme` attribute system stays. Only `data-palette` is removed.
- No engine logic changes. No data changes.

---

## 🔴 Priority 2: Reference Tables Tab

**Spec:** `specs/REFERENCE-VIEW-SPEC.md`

New "Reference" tab — a book-style view showing all magic item tables laid out with every item visible. No stepper, no dice roller. Users with physical dice look up their roll in the Range column and click subtable links to navigate.

**Implementation order:**

1. **Create `src/web/components/ReferenceView.tsx`** — New component. Props: `{ settings: CampaignSettings, adminMode: boolean }`.
2. **Add tab to `App.tsx`** — "Reference" tab between "Tables" and "Loot Drops".
3. **Table pill selector** — Reuse the `.table-pills` component from the design spec. Add a "Supplemental" pill at the end.
4. **Table rendering** — For each main table (A–I), render sorted entries with columns: Range, Item/Category, Source, Weight, %. Subtable references are clickable cherry-colored links.
5. **Subtable rendering** — Below each main table, render its child subtables as cards with a cherry left-border connector. Recursive for nested subtables.
6. **Supplemental section** — Render `SUPPLEMENTAL_TABLES` in their own section.
7. **Scroll navigation** — Pill clicks and subtable link clicks use `scrollIntoView({ behavior: 'smooth' })`. Cherry flash highlight on arrival.
8. **Sorting** — Weight desc → source alpha → name alpha. Dice ranges computed AFTER sorting.
9. **Source filtering** — Disabled-source items are dimmed (opacity 0.4, strikethrough), not hidden.
10. **Admin mode: weight steppers** — +/− buttons on each weight. Track manually touched vs untouched items.
11. **Admin mode: status bar** — Per-table bar showing total, target die, delta. Auto-rebalance checkbox.
12. **Admin mode: rebalancing** — Largest-remainder algorithm redistributes delta across untouched items. Manual edits = ember highlight, auto-adjusted = blue highlight.
13. **Admin mode: global bar** — Sticky bottom bar with edit summary, Discard All, Publish to GitHub.
14. **CSS** — All styles go in `app.css` under a `Reference Tables — Book View` section header.
15. **Verify** — Run through the 16-point checklist in spec Section 13.

**Key data sources:** `MAGIC_ITEMS` from `src/data/magic-items.ts`, `SUPPLEMENTAL_TABLES` from `src/data/supplemental.ts`. Dice range computation reuses `computeDiceRanges` and `nextDieUp` from `LootTables.tsx` — extract to a shared utility.

---

## 🔴 Priority 3: Auth & Encrypted Descriptions

**Spec:** `specs/AUTH-SPEC.md`

Password-gated item descriptions using client-side AES-256-GCM encryption. The public site shows only non-copyrightable data. Authenticated users see full descriptions. Admin mode is gated behind auth.

**Implementation order:**

1. **Prerequisite: Add SRD flag to item-stats** — Modify `scripts/generate-item-stats.ts` to read the `srd` and `srd52` boolean fields from the 5etools `items.json` source data. Add `srd: boolean` to each item's output in `item-stats.json` and `item-stats-2024.json`. Then run `npm run sync` to regenerate both files with the flag. This must be done BEFORE the encrypt step works, because the encrypt script reads the `srd` flag to split items into public vs protected.
2. **Build script** — Create `scripts/encrypt-descriptions.ts`. Reads `item-stats.json` + `item-stats-2024.json`, checks each item's `srd` flag, splits into three outputs: `public/data/item-public.json` (metadata for all items), `public/data/item-srd-descriptions.json` (descriptions for SRD items, unencrypted), `public/data/item-protected.enc` + `item-protected.meta.json` (encrypted non-SRD descriptions). Uses AES-256-GCM with PBKDF2-derived key from `CHERRYKEEP_PASSWORD` env var.
2. **Decryption lib** — Create `src/web/lib/decrypt.ts`. Uses Web Crypto API for PBKDF2 key derivation + AES-GCM decryption in the browser.
3. **Auth context** — Create `src/web/lib/authContext.ts`. Provides `{ authenticated, descriptions, adminMode }` to the component tree.
4. **Login modal** — Create `src/web/components/LoginModal.tsx`. Password input, unlock button, shake animation on wrong password, loading state during PBKDF2.
5. **Nav bar integration** — Add lock icon to nav bar in `App.tsx`. When authenticated, dropdown with "Admin Mode" toggle and "Log Out".
6. **Session caching** — "Remember for this session" checkbox stores password in `sessionStorage`. Auto-decrypt on page load if present.
7. **Description display** — In `ReferenceView.tsx`, clicking a leaf item row expands an inline detail panel showing type, attunement, and description (if authenticated) or a locked prompt (if not).
8. **Stepper integration** — In `LootTables.tsx` `FinalResultCard`, show description from auth context when available.
9. **Admin gating** — Weight editing and Publish button in Reference view require `authenticated && adminMode`.
10. **Migrate admin mode** — Remove admin toggle from CampaignSettings. Admin mode now controlled exclusively through the auth dropdown.
11. **Build integration** — Add `"encrypt"` npm script. Update `"build"` to run encrypt first.
12. **Verify** — Run through the 11-point checklist in spec Section 10.

**Critical:** The `CHERRYKEEP_PASSWORD` env var is set at build time and NEVER committed to the repo.

---

## 🟡 Pending: Engine & Content

### Documentation Refresh
`ABOUT.md`, `HOW-IT-WORKS.md`, `DDESIGN.md` are stale after recent engine changes. Need updates for: independent pool model, updated role multipliers (0.15/0.50/1.00/1.75), removal of concentration slider, gem/art continuous-value systems, magic richness scaling.

### Independent Richness Knobs (Four Sliders)
Expose four independent richness controls in CampaignSettings: coin, gem, art, magic item. Each scales its pool without affecting others. `CampaignSettings` needs: `coinRichness`, `gemRichness`, `artRichness`, `magicRichness`. Each defaults to 1.0.

### MI_PER_XP Verification (Tiers 2–4)
Tier 1 values verified exact against DMG CR 0-4 hoard table. Tiers 2-4 reconstructed from partial data — need cross-check against actual DMG hoard tables (CR 5-10, CR 11-16, CR 17+) entry by entry.

### Paired Items Display (Wand Sheath)
Wand Sheath (ERLW) should display as two linked cards (sheath + random wand), not one card with inlined text. Add optional `paired` field to item data. Render companion items as a sub-card.

### Gem/Art Consolidation
15+ low-value gems should consolidate into "pouch of assorted semi-precious stones." Per-tier detail thresholds (50 gp at T3, 500 gp at T4).

---

## 🟡 Pending: Infrastructure

### Custom Domain
DNS configured for cherrykeep.com → GitHub Pages. Remaining steps:
- Add `CNAME` file to repo containing `cherrykeep.com`
- In GitHub repo Settings → Pages → Custom domain, enter `cherrykeep.com`
- Check "Enforce HTTPS"
- Update `vite.config.ts` base path from `/loot-tables/` to `/` once domain is active

### ~~License~~ ✓
Done — `LICENSE` file in repo root. MIT for code, CC BY 4.0 for table design, plus Fan Content Policy and SRD attribution.

### Dice Colors (12 options)
Dice-box supports `themeColor`. Add a color picker to settings: 12 color swatches. Store preference in localStorage. Apply via `diceBoxRef.current.updateConfig()`.

---

## 🔵 Future (implement when explicitly asked)

### First-Time Tutorial
Lightweight overlay for new DMs on first visit. Dismissable, localStorage flag.

### URL-Shareable Source Configs
Share source settings via URL params: `?sources=DMG,XGE&priority=ERLW:emphasis`

### PWA / Offline Support
Service worker cache for table use without WiFi. Web app manifest for mobile "Add to Home Screen."

### Class-Gated Armor Categories
Extend the Spellcaster pattern to armor: light armor (rogues, bards), medium (druids, rangers), heavy (fighters, paladins). Sub-tables already exist.

### Crafting System
Gemcutter improving value scores, artisan tools creating art objects, material cost structure, magic item crafting with special components, skill check + reputation gating. Needs full design discussion before speccing.

### Item Moving in Admin Mode
Move items between subtables via a row-level menu. Reserved space in Reference view admin UI but not yet implemented.

---

## Reference: Sync Pipeline

The sync script (`npm run sync`) keeps item data fresh from 5etools:

```
npm run sync           # sync both editions
npm run sync:2014      # sync only 2014
npm run sync:2024      # sync only 2024
```

For each edition: pulls latest 5etools data → auto-classifies → merges into curation file (approved items untouched) → regenerates item-stats JSON → reports changes.

New items are live immediately with default weight=3 and status "ready-for-review." Approved items are never overwritten.

**When to run:** new book released, errata/corrections, or periodically (every few weeks).
