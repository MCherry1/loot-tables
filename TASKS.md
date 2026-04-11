# Tasks & Improvements

Tracked design changes and implementation requests for the loot generator.

---

## UI / Layout

### Full-Width Layout
The current centered-card layout creates dead space on either side that serves no purpose. Redesign to use the full viewport width. Remove the center card/tile container. Content should flow naturally edge-to-edge (with reasonable padding). This also fixes the dark mode issue where the outer page background stayed bright parchment while only the center card went dark.

### Dark Mode Contrast
The current dark mode implementation doesn't have enough contrast. Text is too dim against the dark backgrounds. Revisit the dark theme palette — the spec in STEPPER-DESIGN.md has a "Torchlit Parchment" dark palette that should be checked against WCAG contrast ratios. Primary text on dark backgrounds needs to be clearly readable. Accent colors (sienna, gold) should pop more against dark surfaces, not less.

### Dark Mode Full Page
When dark mode is active, the ENTIRE page should be dark — not just the central content area. Background, margins, everything. No bright parchment peeking out at the edges.

---

## Data / Content

### 2014 / 2024 Rules Toggle
Add a toggle (in Settings) to switch between 2014 and 2024 item data. This affects:
- Which version of item stats are shown (behind the admin gate)
- Which items exist (some added/removed between editions)
- Which table assignments apply (some items changed rarity or mechanics between editions)
- Ioun stones specifically were buffed in 2024 and should move back up to their original DMG tables

The toggle switches which upstream 5etools dataset is used: `5etools-2014-src` vs `5etools-src`. Each edition has its own `curation.json` overlay (or a single curation file with per-edition overrides). Default: 2014 for now, since that's what the existing tables are built against.

For 2024: probably keep DMG original table assignments without downgrading items, since 2024 specifically addressed the weak-for-tier problem.

### About Section from Editable Markdown
The About tab should render content from a markdown file in the repository (e.g. `ABOUT.md` in the repo root). This file is human-editable — I write the prose, the build process converts it to HTML for the web page. The AI-generated version is a starting point but I need to rewrite it in my own voice for other DMs to read.

Implementation: the build/extract script reads `ABOUT.md` and either injects it into a data file that the React component imports, or the component fetches it at runtime. Either way, editing `ABOUT.md` and rebuilding is the workflow.

---

## Table Assignment Pipeline

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

## Future Design Explorations

### Class-Gated Categories Beyond Spellcaster
The Spellcaster category successfully uses class-specific sub-tables (Wizard, Sorcerer, Bard) to balance class representation. This pattern could extend to other categories:

**Armor — proficiency gating:** Light armor (rogues, bards, warlocks), medium armor (druids, rangers, clerics), heavy armor (fighters, paladins). The sub-tables already exist (`[Light-Armor]`, `[Medium-Armor]`, `[Heavy-Armor]`). A DM could say "my druid boss needs armor" and start at medium armor specifically.

**Weapons — style gating rather than class gating:** "I want a rogue weapon" is less natural than "I want a finesse weapon" or "I want a ranged weapon." The existing sub-tables (Simple-Melee, Martial-Melee, Martial-Ranged, Swords, Axes, Bows) already serve this. Class-gating weapons would require duplicating generic variants (`+1 [Weapons]`) behind multiple gates, since a longsword isn't exclusive to any class.

**The generic variant duplication problem:** Items like `+1 [Weapons]` resolve through sub-table refs. If the same `[Martial-Melee]` table needs to be reachable from both a general Arms category AND a class-specific gate, the tree becomes a DAG (multiple parents, same child). The engine supports this since `ALL_TABLES` is a flat lookup — but the editorial work of deciding which weapon sub-tables belong behind which class gates is substantial.

**Recommendation:** Worth exploring for armor (natural proficiency tiers). Defer weapons until there's a clear DM use case that the existing style-based sub-tables don't serve.

### Admin UI GitHub Integration
Implement the draft + publish workflow for the admin/review UI:
- All edits save to localStorage immediately (draft layer)
- "Publish" button commits merged `curation.json` to repo via GitHub API
- One-time PAT setup in admin settings (stored in localStorage)
- SHA-based conflict detection with auto-merge on publish
- "Export" fallback button for manual download + commit
- Clear draft after successful publish
