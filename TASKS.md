# Tasks & Improvements

Tracked design changes and implementation requests for the loot generator.

---

## UI / Layout

### ~~Full-Width Layout~~ ✅
~~The current centered-card layout creates dead space on either side.~~ Done — `.app-container` uses full viewport width with padding, no max-width constraint. About page intentionally keeps `max-width: 48rem` for prose readability.

### ~~Dark Mode Contrast~~ ✅
~~The current dark mode implementation doesn't have enough contrast.~~ Done — dark theme uses CSS custom properties with proper contrast levels. Variables cascade through `--ink`, `--ink-strong`, `--ink-muted` for text hierarchy.

### ~~Dark Mode Full Page~~ ✅
~~When dark mode is active, the ENTIRE page should be dark.~~ Done — `html` and `body` both use `--bg-start`/`--bg-end` CSS variables that switch in `[data-theme='dark']`.

---

## Data / Content

### ~~2014 / 2024 Rules Toggle~~ ✅ (UI)
~~Add a toggle (in Settings) to switch between 2014 and 2024 item data.~~ UI toggle implemented in CampaignSettings. Data switching to be wired when 2024 dataset is available.

For 2024: probably keep DMG original table assignments without downgrading items, since 2024 specifically addressed the weak-for-tier problem.

### ~~About Section from Editable Markdown~~ ✅
~~The About tab should render content from a markdown file in the repository.~~ Done — About.tsx renders from ABOUT.md. Edit ABOUT.md and rebuild.

---

## Table Assignment Pipeline

### ~~Curation Pipeline~~ ✅
Done — `data/curation.json` (743 approved items), `scripts/auto-classify.ts` (priority-ordered rules), `scripts/seed-curation.ts`, `scripts/merge-curation.ts`, `scripts/source-mapping.ts`.

### ~~Admin Review UI~~ ✅ (base)
Done — `ReviewUI.tsx` (460 lines) with sortable/filterable item table, inline weight editing, keyboard navigation, admin-gated.

### New Item Status Flow
```
New item detected in 5etools sync
         ↓
  Auto-classified (table + category assigned)
         ↓
  Added to tables with default weight
  Status: "ready for review"
         ↓
  Item is live and rollable immediately
         ↓
  Human reviews in admin UI → confirms or adjusts
  Status: "approved"
```

"Ready for review" is NOT a blocker. Items appear in tables and work. The flag just means the human hasn't personally confirmed the assignment yet.

### Weight Assignment Is Manual (But System-Assisted)
New items get a **default weight** when auto-classified (probably 3). But the actual weight tuning — fitting the sub-table to a standard die (d4/d6/d8/d10/d12/d20/d100 only), stealing probability from existing items, bumping interesting items up — is a human step done in the review UI.

The system should **propose** rebalancing, not just dump items in. When new items are added:
- Calculate if the sub-table total still fits the current die
- If not, propose: expand to next die, steal weight from dominant/least-interesting items, or split into sub-table
- Show the proposal as a highlighted diff: green for new items, yellow for changed weights (old → new)
- One-click accept, or manual tweaks

### Review Batching by Source
Reviews are grouped by source book, not accumulated into one ever-growing queue. A new book with 4 items = one review batch. Each review is scoped, bounded, and actionable. Items from one book may land on different tables — the batch still groups them together, with per-table rebalancing proposals.

### Review UI Must Be Fast
If the review experience is clunky, it won't get done. Design priorities:
- One-click approve for items that look right
- Inline editing (no modal dialogs, no separate pages)
- Keyboard shortcuts (arrow keys to navigate, number keys for weight, Enter to approve)
- Filter by status, source, rarity, table, category
- Show sub-table context: siblings, current die, proposed die after changes
- Sort by weight within sub-tables (to see weight tiers and decide what to steal from)
- Batch operations: "approve all from this book", "set all unreviewed in this sub-table to weight 2"
- Item description/stats visible (behind admin gate) so I can judge quality

---

## Cleanup / Integration

### Source Mapping Alignment
`scripts/source-mapping.ts` still uses old bidirectional mapping. Should import from `src/data/sourcebooks.ts` `LEGACY_ACRONYM_MAP` and normalize TO 5etools abbreviations (not FROM). All internal data should use 5etools canonical abbreviations; legacy abbreviations only exist for importing from old hand-curated tables.

### Auto-Classifier Rule Sync
`scripts/auto-classify.ts` may need minor updates to match latest methodology spec:
- Spellcaster-attuned wands → Spellcaster (Wands sub-table), not Misc
- Generic "by a spellcaster" attunement → Spellcaster category
- Oils/philters: `type: P` always → Potions (no split to Consumables on minor tables)
- Verify all priority-ordered rules match TABLE-ASSIGNMENT-METHODOLOGY.md

---

## Future Design Explorations

### Class-Gated Categories Beyond Spellcaster
The Spellcaster category successfully uses class-specific sub-tables (Wizard, Sorcerer, Bard) to balance class representation. This pattern could extend to other categories:

**Armor — proficiency gating:** Light armor (rogues, bards, warlocks), medium armor (druids, rangers, clerics), heavy armor (fighters, paladins). The sub-tables already exist (`[Light-Armor]`, `[Medium-Armor]`, `[Heavy-Armor]`). A DM could say "my druid boss needs armor" and start at medium armor specifically.

**Weapons — style gating rather than class gating:** "I want a rogue weapon" is less natural than "I want a finesse weapon" or "I want a ranged weapon." The existing sub-tables (Simple-Melee, Martial-Melee, Martial-Ranged, Swords, Axes, Bows) already serve this.

**Recommendation:** Worth exploring for armor (natural proficiency tiers). Defer weapons until there's a clear DM use case that the existing style-based sub-tables don't serve.

### Admin UI GitHub Integration
Implement the draft + publish workflow for the admin/review UI:
- All edits save to localStorage immediately (draft layer)
- "Publish" button commits merged `curation.json` to repo via GitHub API
- One-time PAT setup in admin settings (stored in localStorage)
- SHA-based conflict detection with auto-merge on publish
- "Export" fallback button for manual download + commit
- Clear draft after successful publish

### Review UI Enhancements
- Rebalancing proposals (highlighted diffs showing weight changes when new items added)
- Weight-in-context panel showing sub-table siblings and die size
- Source-batched review mode (review all items from one book at once)
