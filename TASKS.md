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

### 2024 Edition Pipeline — IMPLEMENT NOW
The 2024 toggle is wired but the data behind it is just the 2014 data repackaged. This needs to be real.

**Step 1: Get the 2024 5etools data**
Clone the 2024 5etools mirror into the repo (gitignored):
```bash
cd 5etools-mirror-3  # or create this directory
git clone --depth 1 https://github.com/5etools-mirror-3/5etools-src.git
```
This gives us `5etools-mirror-3/5etools-src/data/items.json` with 2024 item data (different descriptions, revised mechanics, new items, changed rarities).

Add `5etools-mirror-3/5etools-src/` to `.gitignore` if not already there.

**Step 2: Generate 2024 item stats**
```bash
npx tsx scripts/generate-item-stats.ts 5etools-mirror-3/5etools-src/data/items.json
```
Move the output to `data/item-stats-2024.json` (the script currently writes to `data/item-stats.json` — either add an `--output` flag or rename after generation).

**Step 3: Generate 2024 curation**
Run auto-classify against 2024 items and seed a fresh curation file:
```bash
npx tsx scripts/merge-curation.ts --items-json 5etools-mirror-3/5etools-src/data/items.json --output data/curation-2024.json
```
If merge-curation doesn't support `--output`, extend it. The 2024 curation should be a separate file from the 2014 one. All items start as `ready-for-review` (auto-classify is trusted for table/category but weights need balancing). Set default weight=3 for all new items.

**Step 4: Balance 2024 sub-table weights**
After seeding, sub-table totals won't match standard dice. Write a one-time balancing script (or extend seed-curation) that:
1. Groups items by table + category (same as sub-tables in magic-items.ts)
2. For each sub-table, scales weights proportionally to the nearest standard die (d4/d6/d8/d10/d12/d20/d100) using the largest-remainder method
3. Marks balanced items as `approved`

**Step 5: Verify the toggle works end-to-end**
- Switch to 2024 in Settings
- Roll on Table G — items should come from the 2024 pool
- Result card descriptions should show 2024 text (will differ from 2014 for revised items)
- Switch back to 2014 — everything returns to the hand-curated tables

**Key constraint:** The 2014 pipeline must not be affected. Separate curation files, separate item-stats files. The toggle in `roller.ts` and `LootTables.tsx` already switches between them — just make sure the 2024 files contain real data.

**Files already updated:**
- `scripts/generate-item-stats.ts` — already accepts output path as argv[3]
- `scripts/merge-curation.ts` — `--output` flag added for writing to a different curation file
- `scripts/sync.ts` — orchestrates the full pipeline (pull, merge, regenerate) per edition
- `.gitignore` — 5etools directories already ignored

**Files to modify:**
- `data/item-stats-2024.json` — regenerate from real 2024 5etools data
- `data/curation-2024.json` — regenerate from auto-classify against 2024 items, then balance

**Quick start:** After cloning the 2024 5etools mirror, just run:
```bash
npm run sync:2024
```

### ~~About Section from Editable Markdown~~ ✅
~~The About tab should render content from a markdown file in the repository.~~ Done — About.tsx renders from ABOUT.md. Edit ABOUT.md and rebuild.

---

## Sync Pipeline

### How It Works

The sync script (`npm run sync`) keeps item data fresh from 5etools:

```
npm run sync           # sync both editions
npm run sync:2014      # sync only 2014
npm run sync:2024      # sync only 2024
```

For each edition it:
1. Pulls latest data from the 5etools git mirror
2. Runs auto-classify on all items
3. Merges new items into the edition's curation file (existing approved items untouched)
4. Regenerates item-stats JSON (descriptions for result cards)
5. Reports what changed

**New items are live immediately** with default weight=3 and status "ready-for-review". They appear in tables and can be rolled on. The DM reviews them later in the admin UI to confirm weights and assignments.

**Approved items are never overwritten.** Your reviewed weights are law. If 5etools changes an item's rarity or description, the stats file updates but your curation weight stays.

### When to Run

- **New book released:** Run sync after 5etools adds the book's items. New items auto-classify into tables.
- **Errata/corrections:** Run sync to pick up updated descriptions and stats. Existing table assignments unchanged.
- **Periodically:** Run sync every few weeks to catch any additions.

### Future: GitHub Action (automated)

A GitHub Action could run sync on a schedule (weekly) or when the 5etools mirror pushes updates. It would:
1. Pull latest 5etools data
2. Run `npm run sync`
3. If new items were added, create a PR with the updated curation and item-stats files
4. The PR shows exactly which items were added and to which tables
5. Merge the PR to deploy

This is not implemented yet but the sync script is designed to support it — it's non-destructive and reports what changed.

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

### ~~Source Mapping Alignment~~ ✅
Done — `source-mapping.ts` rewritten to use `LEGACY_ACRONYM_MAP`. `toCanonical()` normalizes to 5etools. Roller.ts canonicalizes at data boundary.

### ~~Auto-Classifier Rule Sync~~ ✅
Done — added `spellcasting: true` tag check, artificer to SPELLCASTER_CLASSES, generic spellcaster attunement detection.

### ~~Source Canonicalization~~ ✅
Done — `roller.ts` canonicalizes legacy abbreviations at startup. "Other" source group eliminated.

---

## UI Tasks

### ~~"How it Works" and "D&Design" Tabs~~ ✅
~~Wire two additional info tabs alongside About.~~ Done — `HowItWorks.tsx` renders `HOW-IT-WORKS.md`, `DDesign.tsx` renders `DDESIGN.md`. Shared `markdownToHtml.ts` utility supports headings, tables, code blocks, and lists.

### ~~3D Dice Roller~~ ✅
~~Dice-box integration exists but may still need browser testing.~~ Done — assets in place, initialization guarded with try/catch, graceful fallback to CSS animation when dice-box fails or total weight isn't a standard die.

### ~~APL Hint Text~~ ✅
~~Add a field-hint below the APL slider.~~ Done — hint text added in both CampaignSettings and EncounterBuilder.

---

## Public Launch (DEFERRED — implement when explicitly asked)

The following items are planned but not active tasks. Implement only when the user explicitly requests it.

### Two-Deployment Strategy
Two separate GitHub Pages deployments from the same repo:

**Personal deploy** (full features):
- Item descriptions baked in (item-stats.json bundled)
- Admin Review UI available
- Accessed via a landing page with password gate
- Password: `ebmontgomeryward` (all lowercase, no spaces — EB Montgomery Ward character name)
- Landing page checks password client-side, stores in localStorage, redirects to the app
- The app URL is not linked anywhere public, not indexed by search engines
- `robots.txt` with `Disallow: /` (already in place)
- This is where mom rolls on tables — no setup needed beyond entering the password once

**Public deploy** (copyright-safe):
- No item descriptions (item-stats.json excluded from bundle)
- No admin UI
- "Show Item Details" toggle prompts user to provide their own 5etools data
- Table structure, weights, economy system all included (original work, not copyrighted)
- Licensed under CC BY 4.0 (content/system) + MIT (code)

**Implementation:**
- `VITE_PUBLIC_BUILD=true` environment variable controls which build
- Two GitHub Pages sites (e.g., main branch → public, deploy branch → personal)
- Or: custom domain for personal, github.io for public
- Landing page is a simple HTML file with password input + redirect

### Custom Domain
GitHub Pages + custom domain (~$12/year). Steps:
1. Buy domain from Namecheap/Cloudflare
2. Add `CNAME` file to repo
3. Configure DNS → GitHub Pages
4. HTTPS automatic

### License
- CC BY 4.0 for table system, weights, economy math (original creative work)
- MIT for code (TypeScript, React components)

### First-Time Tutorial
Lightweight overlay on first visit for new DMs. Dismissable, localStorage flag.

### URL-Shareable Source Configs
Share source settings via URL params: `?sources=DMG,XGE&priority=ERLW:emphasis`

### PWA / Offline Support
Service worker cache for table use without WiFi. Web app manifest for mobile.

### Future Design Explorations

#### Class-Gated Categories Beyond Spellcaster
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
