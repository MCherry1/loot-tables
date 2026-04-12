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

### ~~3D Dice Roller~~ ✅ (basic integration done, tuning needed below)

### 3D Dice Tuning — IMPLEMENT NOW
The dice-box integration works but needs three fixes:

**1. Speed up the roll:**
- Set `gravity: 3` in the DiceBox constructor (currently defaults to 1). Higher gravity = dice settle faster.
- Reduce the post-roll clear timeout from 800ms to 400ms in the `onRollComplete` handler in LootTables.tsx.
- Docs: https://fantasticdice.games/docs/usage/config

**2. Fix dice size and overflow:**
- Reduce `scale` from 6 to 4 in the DiceBox constructor.
- Give the `#dice-overlay` container a fixed max-height (e.g., `max-height: 300px`) instead of scaling with table content. Currently the dice appear tiny on long tables and huge on short ones. The overlay should be a consistent size regardless of content below it.
- Test on mobile — the dice currently bounce off-screen on narrow viewports.

**3. Show the rolled number:**
- `state.rolledNumber` is already captured in the stepper state but never displayed in the UI.
- After a roll completes and the entry is highlighted, show the rolled value somewhere visible — e.g., a small badge next to the dice range like "Rolled: 14" or inside the action bar.
- The value is already available: `state.rolledNumber` in the `HIGHLIGHT` state. Just needs JSX.

### ~~APL Hint Text~~ ✅ (superseded by Party Level redesign below)

### Coin Denomination Breakdown — IMPLEMENT NOW
Currently all coins are converted to gold. A goblin dropping "3 gp" feels wrong — it should be "30 sp" or "2 sp, 14 cp" depending on the tier. The DMG hoard tables use specific denomination mixes per tier, and we should match them.

**Denomination mix constants (from DMG hoard tables):**
```typescript
// Percentage of coin value in each denomination, by tier
const COIN_MIX: Record<Tier, { cp: number; sp: number; gp: number; pp: number }> = {
  1: { cp: 0.11, sp: 0.54, gp: 0.36, pp: 0.00 },  // mostly silver and copper
  2: { cp: 0.00, sp: 0.18, gp: 0.54, pp: 0.27 },  // mostly gold, some silver and platinum
  3: { cp: 0.00, sp: 0.00, gp: 0.44, pp: 0.56 },  // gold and platinum
  4: { cp: 0.00, sp: 0.00, gp: 0.13, pp: 0.87 },  // mostly platinum
};
```

**How it works:**
1. Compute total coin budget in GP (same as now)
2. Split by denomination mix for the current tier
3. Convert each denomination's GP share into actual coins: cp share × 100, sp share × 10, gp share × 1, pp share ÷ 10
4. Generate a dice formula for each non-zero denomination
5. Roll each independently (variance per denomination)

**Example:** CR 1 minion, Tier 1, coin budget = 1.1 gp
- CP share: 1.1 × 0.11 × 100 = 12 cp → dice formula "2d6" (avg 7, close enough)
- SP share: 1.1 × 0.54 × 10 = 5.9 sp → dice formula "1d10" or "1d12"
- GP share: 1.1 × 0.36 = 0.4 gp → below threshold, skip or "0"
- Result: "7 cp, 6 sp" instead of "1 gp"

**Display:** Show each denomination separately: "12 cp, 6 sp, 2 gp" not "2.72 gp"

**Two coin settings checkboxes (both off by default):**

**☐ Convert to Gold (off by default)**
When on, trades up lower denominations to maximize gold:
- Every 100 cp → 1 gp (keep 0-99 cp remainder)
- Every 10 sp → 1 gp (keep 0-9 sp remainder)
- PP stays as PP (worth more than GP)
- Result: single-digit cp, single-digit sp, piles of gp, possibly pp
- Display: "3 cp, 7 sp, 42 gp, 2 pp"

**☐ Split Among Party (off by default)**
When on, divides each denomination by party size:
- Shows: "X cp each (Y remainder), X sp each (Y remainder), X gp each (Y remainder)"
- Uses `settings.partySize` for the divisor
- Remainder is the indivisible portion (party decides who gets it)
- Display format: "42 gp each, 1 gp remainder" or "42 gp each (+1)"

**Engine changes needed:**
- `LootResult.coins` type: change from `{ formula, average, rolled }` to `{ cp, sp, gp, pp }` where each is `{ formula, average, rolled }`
- `COIN_MIX` constant in `constants.ts`
- `gpToDiceFormula` may need a `denominationToDiceFormula` variant that works in cp/sp units
- `EncounterResults.tsx` display: show denomination breakdown instead of flat GP
- Two new boolean settings: `convertToGold`, `splitAmongParty`

### Party Level & Tier Progression UI — IMPLEMENT NOW
Replace the 5-stop APL slider with a cleaner system. The engine changes are done (`types.ts`, `constants.ts`). This task is the UI wiring.

**New settings (already in CampaignSettings type):**
- `partyLevel: number` (1-20, default 5) — number input with up/down arrows, or click to type
- `autoTier: boolean` (default true) — "Use party level to determine tier" checkbox
- `tierProgression: boolean` (default true) — "Natural Progression" vs "Flat" toggle

**Party Level input:**
- Number input, 1-20
- Up/down arrow buttons (increment/decrement)
- Can click and type directly
- Shows in both CampaignSettings and EncounterBuilder

**Tier buttons (1 / 2 / 3 / 4):**
- Active tier has a **pop effect**: ~10% larger, subtle drop shadow, clearly "raised" from the surface
- When `autoTier` is true (default):
  - Tier is determined by `tierFromLevel(partyLevel)` — buttons are NOT clickable
  - Non-active tiers are **faded** (reduced opacity, ~40-50%) so they look non-interactive
  - Active tier is popped and full contrast
- When `autoTier` is false:
  - All tier buttons are **full contrast** (not faded) and clickable
  - Active tier has the same pop effect
  - Clicking a different tier selects it

**"Use party level to determine tier" checkbox:**
- Positioned next to the tier buttons
- Default: checked
- When unchecked, tier buttons become clickable, lose the fading

**Tier Progression toggle:**
- Two options: "Natural Progression" (default) and "Flat"
- **Natural Progression:** multiplier scales linearly within the tier based on party level
  - `multiplier = 0.70 + ((level - tier_start) / (tier_end - tier_start)) × 0.60`
  - Level 5 in Tier 2: ×0.70 | Level 8: ×1.06 | Level 10: ×1.30
- **Flat:** multiplier is always ×1.00 regardless of level
- When `autoTier` is off and level is outside the selected tier:
  - Clamp to tier boundary (level 6 in Tier 1 → treated as level 4 → ×1.30)
  - Level 10 in Tier 3 → treated as level 11 → ×0.70

**Display:** Show the computed multiplier somewhere visible (e.g., "×1.06" next to the progression toggle) so the DM can see exactly what's happening.

**Engine integration:**
- `progressionMultiplier(level, tier, tierProgression)` is already in `constants.ts`
- `tierFromLevel(level)` is already in `constants.ts`
- The budget calc in `budget.ts` uses `settings.aplAdjustment` — compute this from `progressionMultiplier()` before passing to the engine, OR update `budget.ts` to read the new fields directly
- The old `aplAdjustment` field is kept for backward compatibility with stored localStorage settings — if `partyLevel` exists in stored settings, use the new system; if only `aplAdjustment` exists (old settings), use that as-is

**Remove:** The old 5-stop APL slider and its labels (`×0.70 Fresh` through `×1.30 Veteran`). The APL_STOPS and APL_LABELS constants in EncounterBuilder.tsx and CampaignSettings.tsx can be deleted.

---

## Public Launch (DEFERRED — implement when explicitly asked)

The following items are planned but not active tasks. Implement only when the user explicitly requests it.

### Two-Deployment Strategy
One codebase, two builds. No code duplication. A `VITE_PUBLIC_BUILD` environment variable controls which version is built.

**The user flow:**

1. Visitor lands on the **public site** (e.g., `loot-tables.com`). This is the full app — tables, encounter builder, settings, source priorities — everything works. But no item descriptions. The "Show Item Details" toggle is hidden or says "Available in personal version."

2. Somewhere in the app (probably Settings tab or a small link in the header), there's a **"Personal Login"** button.

3. Clicking "Personal Login" takes you to a **password page** — a simple form that says "Enter your access code." The password is `ebmontgomeryward` (all lowercase, no spaces).

4. Correct password → stores a flag in localStorage → redirects to the **personal site** (e.g., `loot-tables.com/personal/` or a subdomain like `personal.loot-tables.com` — a different URL where the full-featured build is deployed).

5. The **personal site** looks identical but:
   - Has a small banner or badge at the top (e.g., "✦ Full Edition" or "Personal Edition — Item Descriptions Enabled")
   - "Show Item Details" toggle works and shows descriptions
   - Admin Review UI is available
   - The URL is not linked anywhere public, not indexed by search engines

6. Subsequent visits: if the localStorage flag exists, the "Personal Login" button could say "Go to Personal Edition →" and skip the password prompt.

**Why this is copyright-safe:**
- The public site never loads, serves, or contains item descriptions. They're not in the JavaScript bundle.
- The personal site lives at a separate URL that is not linked from any public page (only reachable via the password redirect).
- `robots.txt` blocks search engine indexing on both sites.
- The copyrighted text is genuinely not distributed — you have to know the password to reach the page where it exists.
- Password: `ebmontgomeryward`

**Implementation (same codebase, two builds):**
```bash
# Public build (no descriptions, no admin)
VITE_PUBLIC_BUILD=true npm run build
# Deploy to: main GitHub Pages URL

# Personal build (full features)
npm run build
# Deploy to: /personal/ subdirectory or separate branch
```

**What `VITE_PUBLIC_BUILD=true` does:**
- Excludes `item-stats.json` and `item-stats-2024.json` from the bundle
- Hides "Show Item Details" toggle (or replaces with "Available in Personal Edition")
- Hides admin Review UI tab
- Adds "Personal Login" button linking to the password landing page

**What the personal build includes (normal build, no flag):**
- Item descriptions bundled
- "Show Item Details" works
- Admin UI available
- Small "✦ Full Edition" badge in the header
- Same everything else — same tables, same weights, same settings

**The password landing page:**
- A standalone HTML file (not part of the React app)
- Simple centered form: "Enter your access code"
- Checks password client-side (`ebmontgomeryward`)
- On success: stores flag in localStorage, redirects to personal site URL
- On failure: "Incorrect code" message
- Deployed at a known path on the public site (e.g., `/login`)

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

---

## Bug Fixes

### CR-to-Tier Boundary Mismatch (constants.ts)

**File:** `src/engine/constants.ts` — `crToDefaultTier()` and `TIER_RANGES`

**Problem:** The `crToDefaultTier()` function puts CR 5 in Tier 1 and CR 16 in Tier 4. The DMG hoard boundaries (and `TIER_RANGES` for player levels) put CR 5 in Tier 2 and CR 16 in Tier 3. This means auto-tier selection gives the wrong hoard tier for CR 5 creatures and CR 16 creatures.

**Current (wrong):**
```typescript
export function crToDefaultTier(cr: number): Tier {
  if (cr <= 5) return 1;   // CR 5 → Tier 1 (should be Tier 2)
  if (cr <= 10) return 2;
  if (cr <= 15) return 3;  // CR 16 → Tier 4 (should be Tier 3)
  return 4;
}
```

**Correct:**
```typescript
export function crToDefaultTier(cr: number): Tier {
  if (cr <= 4) return 1;   // CR 0-4 → Tier 1
  if (cr <= 10) return 2;  // CR 5-10 → Tier 2
  if (cr <= 16) return 3;  // CR 11-16 → Tier 3
  return 4;                // CR 17+ → Tier 4
}
```

This aligns with `TIER_RANGES` (levels 1–4, 5–10, 11–16, 17–20) and the DMG hoard tiers (CR 0–4, 5–10, 11–16, 17+).

---

## Gem & Art Object System

See `GEM-SYSTEM-SPEC.md` for the full design specification. Summary of implementation tasks:

### Gem System Implementation
1. Update `src/data/gems.ts` — replace old 8-tier system (non-DMG-aligned base values) with DMG-aligned 8-tier ×5/×2 progression (face values: 10, 50, 100, 500, 1000, 5000, 10000, 50000 gp)
2. Expand gem roster from 19 to ~33 gems with per-tier weight matrix
3. Fix value scoring in `src/engine/roller.ts` — change from `baseValue * (score / 5)` to `(faceValue / 5) * score` where score = 2d4
4. Add quality labels (Cloudy/Flawed/Standard/Fine/Flawless) derived from 2d4 score
5. Add jitter function for values ≥ 100 gp
6. Flag organic gems (Pearl, Black Pearl, Jet, Amber, Coral) as not improvable

### Art Object Value Scoring
1. Apply value scoring to DMG art tables: `base = faceValue / 5`, `value = base × 2d4`
2. Add jitter for values ≥ 100 gp
3. Display as description + final value only (no tier label, no quality label)

### Hoard Spell Component Steals
1. Add steal entries to each hoard tier — exact value, specific gem, no variance
2. Hoard 1 (CR 0–4): 100 gp Pearl (Identify), ~15–20% chance
3. Hoard 2 (CR 5–10): 300 gp Diamond (Revivify) ~15%, 500 gp Diamond (Raise Dead) ~8%
4. Hoard 3 (CR 11–16): 5,000 gp mixed gem dust (Sequester), ~10%
5. Hoard 4 (CR 17+): 25,000 gp Diamond (True Resurrection), ~5%
6. Reduce coin dice proportionally to offset expected steal value

### Crafting System Integration (Future — Needs Discussion)
Crafting tab design for the web app. Key topics to resolve:
- Gemcutter improving value scores (VS increase → gem value increase proportionally toward gem's max)
- Artisan tools creating art objects
- 2× base value raw materials + 2× base value specific materials cost structure
- Magic item crafting (cold damage sword needing a special cold flower, etc.)
- Cap system: skill check + fame/reputation gating progression to higher tiers
- User mentioned a complete Roll20 crafting system to upload as reference
- How value score decouples "current worth" from "potential" enables the improvement mechanic
