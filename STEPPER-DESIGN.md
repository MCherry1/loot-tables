# Interactive Table Stepper — Comprehensive Design Spec

## Overview

This document specifies a complete redesign of the Loot Tables tab in the D&D 5e Loot Generator. The new UI replaces flat table views with a **step-by-step interactive table walker**. At every stage of table resolution, the user sees the full table and can either roll randomly or click any entry to choose it manually. Sub-table references pause at each stop. The user walks through the entire resolution chain — from "Magic Item Table G" down to "+2 Longsword" — one table at a time, with full control at every step.

The stepper also integrates with the Encounter Builder: unresolved magic item results in the builder become clickable links that switch to the Loot Tables tab, walk through resolution, and return the final item back to the encounter.

---

## Visual Identity: "The DM's Binder"

### Concept

This isn't a video game loot box or a SaaS dashboard. It's the physical artifact a meticulous DM keeps behind their screen — tabbed, color-coded, pencil-marked. The aesthetic evokes:

- Cream/ivory paper with subtle warm grain. Not white, never white.
- Ink that looks printed but slightly imperfect — like a risograph or old laser printer.
- Tab dividers with handwritten-feeling labels.
- The satisfaction of turning to the right page.

### Color System

**Background:** `#f5ede0` parchment base → `#ede1c9` gradient at bottom. Cards sit on this.

**Ink colors** (text and UI chrome):

| Role | Color | Usage |
|------|-------|-------|
| Primary ink | `#2a1f14` | Body text, entry names, headers. Near-black brown, like old book text. |
| Secondary ink | `#7a6652` | Breadcrumbs, labels, faded margin notes. |
| Tertiary ink | `#a08a6e` | Dice ranges, percentages. Pencil-weight. |
| Faint ink | `#b8a48c` | Separators, lowest-priority annotations. |

**Accents** (the only intentional pops of color):

| Role | Color | Usage |
|------|-------|-------|
| Active/highlight | `#8b5e3c` | Warm sienna. Selected entries, ref-linked names, interactive elements. The DM's favorite pen. |
| Gold | `#c9943a` | Final result card border/glow, "continue" buttons, reward moments. |
| Danger | `#c9553a` | Burnt red. Re-roll, destructive actions. |

**Probability bar segment palette** — muted colored-pencil feel, not neon:
```
#c9553a  #c9943a  #5a9e6f  #7b6fb5  #c97a3a
#3a8a9e  #b55a7b  #5a7bb5  #9e8a3a  #3a9e6f
```

### Typography

| Role | Font | Size | Notes |
|------|------|------|-------|
| Body / entry names | `Crimson Text` | 15px | Serif, warm, booky. The "printed table" font. |
| Headers | `Crimson Text` bold | 17px | Section headers in a binder, not billboards. |
| UI chrome (dice ranges, percentages, badges) | `IBM Plex Mono` | 11px | The "pencil annotation" font. DM's margin notes. |
| Final result item name | `Crimson Text` bold | 22px | The one moment we go big. |

Load via Google Fonts:
```
Crimson Text:wght@400;600;700
IBM Plex Mono:wght@400;500
```

### Dark Mode

The parchment theme is warm but bright. Support a dark mode that respects `prefers-color-scheme: dark` and can also be manually toggled from the Settings tab.

**Dark mode palette — "Torchlit Parchment":**

| Role | Light | Dark |
|------|-------|------|
| Page background | `#f5ede0` → `#ede1c9` | `#1a1410` → `#12100c` |
| Card background | `#faf6ee` | `#211c14` |
| Card header | `#3d2b1f` → `#2a1f14` | `#2a1f14` → `#1a120a` |
| Primary ink | `#2a1f14` | `#e8dcc8` |
| Secondary ink | `#7a6652` | `#a08a6e` |
| Tertiary ink | `#a08a6e` | `#7a6652` |
| Faint ink | `#b8a48c` | `#5a4a3a` |
| Borders / dividers | `#d4c4a8` / `#e8dcc8` | `#3d2b1f` / `#2a1f14` |
| Action bar bg | `#f8f2e6` | `#1a1410` |
| Probability bar empty | `#e8dcc8` | `#2a1f14` |

Accents (sienna, gold, burnt red) stay the same in both themes — they're already warm tones that work on dark backgrounds.

Implement via CSS custom properties on `:root` and `:root[data-theme="dark"]` (or `@media (prefers-color-scheme: dark)` as default, with a manual override stored in localStorage). The Settings tab should have a theme toggle: `Auto` / `Light` / `Dark`.

---

## The Table Card

This is the core UI element. It appears at every step of every resolution. Same component whether you're on Magic Item Table A or the Martial Melee weapons list.

### Layout

```
┌─────────────────────────────────────────┐
│ ▌ Dark header: Table Name          d26  │
├─────────────────────────────────────────┤
│ ████████████░░░░░░██████░░░████████████ │  ← probability bar
├─────────────────────────────────────────┤
│  1–6  ● Apparel                  23.1%  │
│  7–10 ● Armor               DMG 15.4%  │
│ 11–16 ● Arms                DMG 23.1%  │
│ 17–20 ● Jewelry             DMG 15.4%  │
│ 21–23 ● Miscellaneous       DMG 11.5%  │
│ 24–26 ● Spellcaster         DMG  7.7%  │
├─────────────────────────────────────────┤
│  [🎲 Roll d26]              [Skip ▸▸]  │
└─────────────────────────────────────────┘
```

### Header Bar

- Background: linear-gradient `#3d2b1f` → `#2a1f14`
- Table name: left-aligned, cream `#f5ede0`, `Crimson Text` bold 17px
- Dice badge: right-aligned, `IBM Plex Mono` 12px, `#c9b896` text on `rgba(201,184,150,0.15)` background, 4px border-radius
- Padding: 14px 16px
- **Display name cleaning:** strip `[brackets]`, strip trailing `-A` through `-I` suffixes, replace hyphens with spaces. `Martial-Melee` → `Martial Melee`. `Figurine-of-Wondrous-Power-G` → `Figurine of Wondrous Power`. **Exception: the root Magic Item Tables keep their letter.** `Magic-Item-Table-G` → `Magic Item Table G` (not just `Magic Item Table`). This letter is essential — it tells the user which table they started from and should remain visible in the header and breadcrumb at all times.

### Probability Bar

- Height: 6px, no border-radius. It's a printed chart bar, not a pill.
- Colored segments proportional to entry weights. Use the segment color palette above.
- Background (empty space fill): `#e8dcc8`
- When a roll result is highlighted, all non-selected segments fade to `opacity: 0.2` with a `300ms` CSS transition.

### Entry Rows

Each row is a flex container. Padding: `9px 16px`. No visible dividers between rows — whitespace is sufficient.

**Layout, left to right:**

1. **Dice range** — `IBM Plex Mono` 11px, `#a08a6e`, right-aligned, `min-width: 40px`. Format: `1–6` or just `4` if a single number.
2. **Color dot** — 8px circle matching the segment color in the probability bar. `flex-shrink: 0`.
3. **Entry name** — `Crimson Text` 15px, `flex: 1`.
   - **Entries with sub-table references** (the name contains `[Ref]`): display in sienna `#8b5e3c`, `font-weight: 600`. This signals "this goes deeper" at a glance, no icon needed.
   - **Terminal entries** (no refs): display in primary ink `#2a1f14`, normal weight.
4. **Source badge** — if present (e.g. `DMG`, `XGE`): italic, `#a08a6e`, `IBM Plex Mono` 11px.
5. **Percentage** — `IBM Plex Mono` 11px, `#b8a48c`, right-aligned, `min-width: 36px`.

**Hover state:** Entire row gets `background: rgba(139,94,60,0.06)`. `cursor: pointer`. All entries are always clickable.

**Highlighted state** (after a roll lands on this entry): `background: rgba(139,94,60,0.1)`, `border-left: 3px solid #8b5e3c` (other rows have `3px solid transparent` to maintain alignment). Entry name goes `font-weight: 700`. A `✦` character appears after the name.

### Action Bar

Below the entry list. `border-top: 1px solid #e8dcc8`, `background: #f8f2e6`, padding `12px 16px`. Flex row with gap.

**State 1 — Nothing rolled yet:**

- **Roll button** (primary): `flex: 1`. Label: `🎲 Roll d{N}`. Background: `linear-gradient(180deg, #8b5e3c 0%, #6b4530 100%)`. Color: `#f5ede0`. Border: `1px solid #5a3a25`. Border-radius: `6px`. `box-shadow: 0 2px 6px rgba(42,31,20,0.15)`. `font-weight: 700`, `letter-spacing: 0.02em`. Hover: `translateY(-1px)` + deeper shadow. Active: flatten back.
- **Skip button** (secondary): Label: `Skip ▸▸`. Color: `#8b5e3c`. Background: `rgba(139,94,60,0.08)`. Border: `1px solid #d4c4a8`. Border-radius: `6px`.
- **Start Over button** (tertiary, only visible when NOT on the root table): Label: `↺ Start Over`. Color: `#c9553a`. Background: `none`. Border: `none`. Sits at the far right of the action bar. Resets the stepper to the root table — clears steps, breadcrumb, context bar, highlight. Does NOT clear result history.

**State 2 — A roll result is highlighted:**

- **Continue button** (primary): `flex: 1`. Label: `Continue with {cleaned name} →`. Background: `linear-gradient(180deg, #c9943a 0%, #a07830 100%)`. Color: `#2a1f14`. Border: `1px solid #8a6828`. Gold indicates forward progress.
- **Re-roll button** (secondary): Label: `Re-roll`. Same ghost style as Skip.

### Long Tables

Some sub-tables have 20–40 entries. Let them be long. No collapsing, no virtual scroll, no compact mode. The DM's binder has long pages sometimes. The probability bar and dice ranges do the work of making long tables scannable.

---

## Interactions

### Manual Pick (clicking an entry row)

1. User clicks any row.
2. The row flashes the highlighted state for ~150ms.
3. The stepper advances immediately — no confirmation needed. Manual picks are deliberate.
4. If the entry contains sub-table references, the next table appears (page-turn transition, see below).
5. If the entry is terminal, the final result card appears.

This should feel decisive. You pointed at the chart and said "that one."

### Random Roll (clicking the Roll button)

1. User clicks "🎲 Roll dN."
2. Button goes disabled.
3. **Scan animation** plays: a semi-transparent highlight bar (`#8b5e3c` at 20% opacity) sweeps down through the entry list over ~400ms. This is a CSS keyframe on a pseudo-element covering the entries container, translating from top to bottom. It should feel like a finger running down a chart. Not flashy, but satisfying.
4. The animation stops and the winning entry highlights (background fade-in over 200ms, `✦` appears).
5. The probability bar dims non-winners (300ms transition).
6. The action bar switches to "Continue with {name} →" / "Re-roll."
7. The user must click Continue to advance, or Re-roll to try again.

The pause after rolling is intentional — it creates the "ooh, what did I get?" moment. The DM announces the roll, the players react, then play continues.

**Fallback:** If the scan animation proves too complex to implement well, substitute a 400ms delay with a subtle pulse/flash on the card border, then reveal the winner. The pause-before-advance pattern is the important part, not the specific animation.

### Skip to End

1. User clicks "Skip ▸▸."
2. All remaining tables are resolved instantly using `weightedPick` in a loop.
3. The full step history is populated.
4. The final result card appears immediately.
5. The resolution chain in the final card shows every stop that was auto-rolled.

### Table Transitions (Page Turn)

When advancing from one table to the next, the outgoing card and the incoming card should transition with a **page-turn feel**:

- The current card exits to the left (translate + slight opacity fade, ~250ms ease-in-out).
- The new card enters from the right (translate + opacity fade-in, ~250ms ease-in-out).
- There should be a slight overlap in timing so it feels like a smooth page flip, not a hard cut.

CSS approach: use a wrapper with `overflow: hidden`. Outgoing card gets `transform: translateX(-100%); opacity: 0` as its end state. Incoming card starts at `transform: translateX(30%); opacity: 0` and transitions to `transform: translateX(0); opacity: 1`. Stagger the start by ~50ms.

If the page-turn is too janky in practice, fall back to a simple crossfade (300ms).

---

## Breadcrumb Trail

Sits above the table card. Shows the full resolution path.

```
Magic Item Table G  ›  Arms  ›  Weapons  ›  Martial Melee
```

- `Crimson Text` 13px.
- Completed steps: `#8b5e3c`, underlined (`text-underline-offset: 2px`), clickable.
- Separator: `›` in `#b8a48c`, 6px gap on each side.
- Current table: `#2a1f14`, `font-weight: 700`, not underlined, not clickable.
- `margin-bottom: 16px`. Wraps naturally on narrow screens.

**Clicking a breadcrumb** resets the stepper back to the root table (full reset). This is the v1 behavior — reconstructing composed names mid-chain is complex. The breadcrumb still communicates where you are even if navigation is root-only.

---

## Context Bar ("What You're Building")

This element appears above the table card (below the breadcrumb) whenever the user is resolving sub-tables for a parent result. It shows the item being assembled and what's left to determine.

**When it appears:** After the first pick from the root table produces an entry with sub-table references. It does NOT appear on the root table itself — only during sub-table resolution.

**Layout:**

```
┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐
╎  Flame Tongue ( ▢ sword type )                 ╎
└╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘
```

- Border: `1px dashed #c9b896`, `border-radius: 6px`
- Background: `rgba(139,94,60,0.04)`
- Padding: `10px 14px`, `margin-bottom: 12px`
- Resolved parts of the name: primary ink `#2a1f14`, `Crimson Text` 15px
- Unresolved parts: rendered as **inline ref chips** — `#8b5e3c` text on `rgba(139,94,60,0.1)` background, `3px` horizontal padding, `2px` border-radius, `Crimson Text` 14px. These look like small inline badges/tags.
- The chip text should be the cleaned sub-table name (e.g. `sword type`, `damage type`, `weapon type`) rather than the raw ref name.

**Progression example:** Picking "+2 [Weapons]" from Arms shows: `+2 ▢ weapon type`. Then picking `[Martial-Melee]` from Weapons updates it to: `+2 ▢ martial melee weapon`. Then picking "Longsword" completes it and triggers the final result.

---

## Result History

Below the stepper, a running log of completed rolls accumulates. This persists across section tab switches and only clears on page refresh (or via a manual "Clear" action).

### Layout

```
─── Results ────────────────────────────

  ✦ +2 Longsword                  DMG
    Table G › Arms › Weapons › Martial Melee
    
  ✦ Cloak of Displacement         DMG
    Table G › Apparel

  ✦ Ring of Protection             DMG
    Table G › Jewelry
```

- Section header: `Crimson Text` 13px bold, `#7a6652`, with a thin horizontal rule (`1px solid #d4c4a8`).
- Each result: item name in `Crimson Text` 15px bold, source in italic `#a08a6e`. Below it, the resolution chain in `IBM Plex Mono` 11px, `#a08a6e`.
- Results stack newest-on-top.
- Subtle separator between results: `1px solid #e8dcc8` or just generous padding.
- A small "Clear" link at the top-right of the results section header. Style: `IBM Plex Mono` 11px, `#c9553a` (burnt red), no border, no background, underline on hover. Clicking clears all results with no confirmation prompt.

---

## Final Result Card

The payoff moment when resolution is complete. Should feel like uncovering treasure.

### Layout

```
┌─────────────────────────────────────────┐
│                                         │
│            ✦ FINAL RESULT ✦             │
│                                         │
│          +2 Longsword                   │
│              DMG                        │
│                                         │
│  Table G: Arms → Weapons: Martial       │
│  Melee → Longsword                      │
│                                         │
│          [ Roll Again ]                 │
│                                         │
└─────────────────────────────────────────┘
```

- Background: `linear-gradient(135deg, #1a120a 0%, #2a1f14 40%, #3d2b1f 100%)` — deep dark, like opening a chest in torchlight.
- Border: `2px solid #c9943a` (gold).
- Box shadow: `0 0 24px rgba(201,148,58,0.15), 0 4px 16px rgba(42,31,20,0.2)` — subtle gold glow.
- Border-radius: `10px`. Padding: `20px`. Margin: `16px`.
- All text centered, cream `#f5ede0`.

**Contents, top to bottom:**

1. `✦ FINAL RESULT ✦` — `IBM Plex Mono` 11px, uppercase, `#c9943a`, `letter-spacing: 0.12em`.
2. Item name — `Crimson Text` 22px bold, `#f5ede0`.
3. Source — 13px italic, `#c9b896`.
4. Resolution chain — `IBM Plex Mono` 12px, `#a08a6e`. Format: `Table G: Arms → Weapons: Martial Melee → Longsword`. Table names in `#c9b896`, picked results in `#f5ede0`.
5. "Roll Again" button — `linear-gradient(180deg, #c9943a 0%, #a07830 100%)`, color `#3d2b1f`, `font-weight: 600`, `6px` border-radius, `box-shadow: 0 2px 8px rgba(42,31,20,0.2)`. Centered, `margin-top: 16px`.

**Animations:**

- **Entrance:** fade-in + scale from `0.96` → `1.0` over 300ms ease-out.
- **Gold glow pulse:** after entrance completes, `box-shadow` oscillates between `0 0 12px rgba(201,148,58,0.15)` and `0 0 24px rgba(201,148,58,0.35)` on a `2s ease-in-out infinite` loop. Subtle. Not a rave.

**After the final card appears**, the result is also added to the result history log below.

---

## Top-Level Navigation

### Tab Structure

The app has **five top-level tabs**: **Loot Tables**, **Encounter Builder**, **Settings**, **About**.

The current "Campaign Settings" panel embedded within the Encounter Builder becomes the standalone **Settings** tab. The current section sub-navigation (Magic Items / Spells / Equipment / Gems / Art) moves inside the **Loot Tables** tab.

```
[ Loot Tables ]  [ Encounter Builder ]  [ Settings ]  [ About ]
```

### Loot Tables Tab

Contains section sub-tabs: **Magic Items**, **Spells**, **Equipment**, **Gems**, **Art**.

**Every section is a full stepper entry point.** The same stepper component, breadcrumb, context bar, and result history are used everywhere. The only difference is which root table the sub-tabs point to.

- **Magic Items** — the most common entry point. Tables A–I often resolve through multiple sub-tables (Arms → Weapons → Martial Melee → Longsword), giving the full multi-step experience.
- **Equipment** — has real depth. Weapons → Martial Melee → Longsword is a multi-step chain. Armor → Heavy Armor → Plate is too. These work identically to magic item sub-table resolution.
- **Spells** — individual spell level tables are typically flat (one roll, done). The stepper handles this naturally: pick or roll, terminal result, final card. No special-casing needed.
- **Gems / Art** — also typically flat (one roll per GP-tier table). Same treatment: the stepper works, the chain is just short.

The stepper gracefully handles both deep chains (4+ steps) and shallow ones (1 step). A single roll on the 50 gp gem table still gets the full table card, probability bar, roll/pick interaction, and final result card — it just resolves in one step. This is fine. Consistency matters more than optimizing for short tables.

### Section Sub-Tabs (within Loot Tables)

- **Magic Items:** `A` `B` `C` `D` `E` `F` `G` `H` `I` — letter tabs.
- **Spells:** `Cantrip` `1st` `2nd` `3rd` `4th` `5th` `6th` `7th` `8th` `9th` — level tabs.
- **Equipment:** `Armor` `Weapons` `Ammunition` `Swords` `Axes` `Bows` etc. — type tabs.
- **Gems:** GP value tiers (e.g. `10 gp` `50 gp` `100 gp` etc.).
- **Art:** GP value tiers.

Selecting any sub-tab resets the stepper with that table as the root. Breadcrumb clears. Context bar clears. The table card shows the selected table, ready to roll or browse.

### Settings Tab

This replaces the "Campaign Settings" panel currently embedded in the Encounter Builder. It becomes a standalone top-level tab. Three sections:

#### General Settings (existing, moved here)
- **Party Size** (1–8, default 4)
- **Magic Richness** slider (0.5x–1.5x, default 1.0x, labels: Scarce / Low / Standard / High / Abundant)
- **Show Values** toggle
- **Show Sale Price** toggle
- **Show Mundane Finds** toggle
- **Theme** toggle: `Auto` / `Light` / `Dark`

#### Sources

A source priority system that controls which sourcebooks appear and how heavily they're weighted. This system was designed in a prior conversation and uses a **hybrid multiplier dampened by book size** so that large books (DMG, 300+ items) don't overwhelm small ones.

**Priority levels per source** (five levels, not a simple on/off):

| Priority | Book Multiplier | Description |
|----------|----------------|-------------|
| **Off** | 0 | All items from this source excluded entirely. |
| **Low** | ×0.5 | De-emphasized. Items appear but are less likely. |
| **Normal** | ×1.0 | Default. Standard weighting. |
| **High** | ×1.5 | Boosted. Items appear more often. |
| **Emphasis** | ×2.0 | Strongly boosted. Use for campaign-specific sources. |

**Dampening factor** (prevents large books from dominating):

```
dampFactor = clamp(√(20 / bookItemCount), 0.4, 1.5)
```

DMG with ~300 items gets dampened to ×0.4 per item. A small book like Candlekeep Mysteries with ~8 items gets ×1.5 per item. Net effect: DMG still has the largest total presence because of volume, but setting a small book to Emphasis actually makes its items competitive.

**Named item tiers** (mapped from existing weights in the Excel data):

| Tier | Value | Description |
|------|-------|-------------|
| Low | 1.5 | Niche or situational items |
| Mid | 3.5 | Standard items |
| High | 5.5 | Popular/iconic items |
| Very High | 9.0 | Signature items, campaign staples |

**Effective weight formula:**

```
effectiveWeight = tierValue × bookMultiplier × dampFactor
```

This is computed per-item at roll time. When a source is toggled off, all its items get effectiveWeight = 0. When emphasis changes, all probabilities, dice types, and distribution charts update live.

**Source grouping for batch controls:** Sources are organized into collapsible groups for easier management. Each group has batch buttons to set all sources in the group at once:

| Group | Sources |
|-------|---------|
| Core Supplements | DMG, XGE, TCE, FTD, BGG, BMT |
| Settings | ERLW, ExE, EGW, TDCS, MOT, GGR, SCC, AAG |
| Adventures | ToD, WDH, WDMM, IWD, WBtW, TYP, SKT, PotA, LMoP, PaB, GoS, ToA, CM, CotN, OotA |

Each group header has priority buttons (Off / Low / Normal / High / Emphasis) that apply to all sources in that group. Individual sources can still be overridden within a group.

**Per-source row display:**
- Source acronym (colored) + full book name
- Item count (e.g. "37×")
- Dampening factor (shown if formula view is expanded)
- Priority selector: five small buttons, active one highlighted

**Show Formula toggle:** A small button that reveals/hides the formula explanation and per-item dampening factors. Hidden by default to keep the UI clean.

**Default state:** All sources enabled, all set to Normal. Eberron sources (ERLW, ExE) specifically default to Normal — the table data as written already has Eberron over-represented in raw entry count, so Normal weighting with dampening is the correct baseline. DMs who want more Eberron can set those sources to High or Emphasis.

**Implementation:** Source filtering and effective weight calculation should be applied at roll time, not by mutating the data. When building the effective entry list for any table, compute `effectiveWeight` for each item based on its source's priority and dampening factor, and exclude items where effectiveWeight = 0. Entries with empty source strings (`""`) are always included with their raw weight — these are structural entries (sub-table refs like `[Armor]`) not actual items.

**Note on source acronym expansion:** Throughout the rest of the UI (final result cards, result history, encounter builder results), display the **full source name** rather than the acronym. Use `SOURCEBOOKS` as the lookup. If an acronym isn't found in `SOURCEBOOKS` (there are a few in the data like `KGV`, `DL`, `SDW` that aren't in the list), display the acronym as-is.

#### Role Ratios (existing, moved here)
The existing role ratio adjustments (Minion / Elite / Boss / Vault percentages).

### About Tab

A static page explaining how the system works. Content should be derived from `DESIGN.md` in the repo root, rendered as readable prose. Sections:

1. **What This Is** — brief intro: a unified loot generation system for D&D 5e that replaces DMG hoard tables with per-creature probability.
2. **How the Math Works** — explain the budget calculation: CR → XP → GP budget via tier-specific GP/XP ratios. Show the GP/XP table. Explain role percentages (Minion 10%, Elite 30%, Boss 60%, Vault 100%).
3. **Category Breakdown** — explain how the budget splits across coins, gems, art, and magic items using DMG-derived tier percentages.
4. **Magic Item Tables** — explain the A–I table structure, Minor vs Major, rarity tiers, and the Value Score pricing system.
5. **DMG Balance Verification** — explain that at default settings, a tier's worth of encounters produces treasure matching DMG expected values.

Style this page with the same parchment/binder aesthetic. Use `Crimson Text` for body text. Keep it readable — generous line height (1.7), max-width ~650px, no dense tables unless necessary. This is a reference document, not a wall of stats.

### Encounter Builder Tab

Same as current, with these changes:

- **Remove the Campaign Settings panel** (moved to Settings tab).
- **Auto Tier checkbox is unchecked by default.** The tier selector is visible and active. The user must explicitly opt into auto-detection.
- Magic item results are unresolved clickable links (see Encounter Builder Integration section below).

---

## Encounter Builder Integration

### The Problem

The Encounter Builder generates loot results that include magic items specified as table references (e.g. "Roll on Magic Item Table G"). Currently these are auto-resolved. The new design makes them **interactive**: each unresolved magic item is a link the user can step through manually.

### Flow

1. **Encounter Builder generates results.** Magic item results appear as unresolved entries showing the table letter: `Magic Item — Table G`, `Magic Item — Table A`, etc.
2. **Each unresolved item is a clickable button/link** styled distinctly (sienna text, underline, or a small "resolve →" affordance).
3. **Clicking an unresolved item:**
   - Switches the active tab to **Loot Tables**.
   - Sets the stepper to the appropriate root table (e.g. Magic Item Table G).
   - The stepper is now in **encounter-resolve mode** (visually identical, but the system knows to return the result).
4. **User walks through resolution** (roll or pick at each step) or hits Skip to auto-resolve.
5. **When the final result card appears,** it includes a **"Done — Return to Encounter"** button (in addition to "Roll Again").
6. **Clicking "Done"** switches back to the Encounter Builder tab. The previously unresolved item now shows the final resolved name (e.g. "+2 Longsword, DMG").
7. **Auto-return:** If the chain resolves (the final card appears), and the user doesn't interact for ~3 seconds, consider a gentle prompt but do NOT auto-navigate. Let the user admire their loot.

### Resolve All

The Encounter Builder should also have a **"Resolve All"** button that auto-rolls every unresolved magic item at once using `weightedPick` loops. Results populate instantly without stepping through. For DMs who just want to prep quickly.

### Out-of-Order Resolution

Users can resolve items in any order. If there are three unresolved items (Table A, Table G, Table C), clicking any one starts resolution for just that item. The others remain unresolved until individually clicked or batch-resolved.

### Shared State

The Encounter Builder and Loot Tables tabs need to share state for this flow. Options:

- **Simplest:** Lift the encounter result state up to `App.tsx`. Pass a callback `onResolveItem(itemIndex, resolvedResult)` down. The Loot Tables tab receives a `pendingResolve: { table: MITable, returnCallback: (result) => void } | null` prop.
- **Alternative:** Use React context or a lightweight store (zustand-style, but no new deps — a simple context + reducer is fine).

The Loot Tables tab should work identically whether entered via direct tab click (standalone browsing) or via encounter-resolve mode. The only difference in resolve mode: the final result card shows the "Done — Return to Encounter" button and the result is passed back via callback.

---

## State Model

### Stepper State

```typescript
interface StepperState {
  /** The starting table (e.g. "Magic-Item-Table-G") */
  rootTable: string;

  /** Completed resolution steps — the breadcrumb trail */
  steps: StepRecord[];

  /** The table currently being displayed */
  currentTable: string;

  /** The evolving item name. Null while on the root table.
   *  Contains [Ref] markers for unresolved sub-tables. */
  composedName: string | null;

  /** Index of the highlighted entry after a roll (null = nothing rolled yet) */
  highlightIdx: number | null;

  /** Whether a roll animation is in progress */
  rolling: boolean;

  /** Whether resolution is complete */
  finished: boolean;

  /** Most recent source book from any step that had one */
  lastSource: string;

  /** Session result history (newest first) */
  resultHistory: CompletedResult[];

  /** If non-null, we're in encounter-resolve mode */
  resolveCallback: ((result: { name: string; source: string }) => void) | null;
}

interface StepRecord {
  tableName: string;
  pickedEntry: { name: string; source: string; weight: number };
  pickedIdx: number;
  rolledNumber: number;
}

interface CompletedResult {
  name: string;
  source: string;
  steps: StepRecord[];
  timestamp: number;
}
```

### Composed Name Resolution Algorithm

```
after each pick:
  if composedName is null:
    composedName = entry.name
  else:
    composedName = composedName.replace(FIRST_REF_REGEX, entry.name)

  refs = findAllRefs(composedName)
  if refs.length > 0 AND ALL_TABLES[refs[0]] exists:
    currentTable = refs[0]
    → stepper continues (show next table)
  else if refs.length > 0 AND ALL_TABLES[refs[0]] does NOT exist:
    → treat ref as literal text, log console.warn
    → check for more refs, continue or finish
  else:
    → finished = true
    → clean the composed name for display
    → add to result history
    → if resolveCallback, enable "Done — Return to Encounter" button
```

---

## Edge Cases

1. **Multiple refs in one entry:** `"Armor of Resistance ([Damage-Type])"` — after pick, composed name contains `[Damage-Type]`. Stepper shows the Damage Type table next. After picking "Fire," composed becomes `"Armor of Resistance (Fire)"` — terminal.

2. **Nested ref chains:** `[Arms-G]` → `"+2 [Weapons]"` → `"[Martial-Melee]"` → `"Longsword"` — three hops. The context bar shows the item building at each stage.

3. **Missing table:** If a `[Ref]` name isn't found in `ALL_TABLES`, treat the cleaned ref name as literal text. `console.warn` the missing table. Continue checking for remaining refs.

4. **Direct terminal from root:** Some root table entries are plain items with no refs (e.g. "Mace of Disruption"). Picking one → immediate final result card, no sub-tables.

5. **Encounter-resolve mode with Roll Again:** If the user clicks "Roll Again" instead of "Done — Return to Encounter," the stepper resets for another roll on the same table. The previous result still went to result history. When they eventually click Done, the most recent result is what gets returned.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/web/components/LootTables.tsx` | Major rewrite. Replace `TableView`, `DrillableTableView`, `SubtypeDropdown`, `RollResultBanner`, `ResolutionChain` with the stepper. Remove `SUBTYPE_DROPDOWN_TABLES`, `SUBTYPE_GROUPS`, `isSubtypeTable`, `getSubtypeItems`, `SubtypeDropdown`, `DiceAnimation`. Keep: section sub-tabs, letter tabs, `StackedBar`, `computeDiceRanges`, `formatRange`, `cleanDisplayName`, `extractRef`, `getSegmentColor`, `SEGMENT_COLORS` (update values to match this spec's palette). This component is now nested inside the Loot Tables top-level tab, not a top-level tab itself. |
| `src/web/styles/app.css` | Restyle table card, entry rows, header bar, action bar to match spec. Add: breadcrumb styles, context bar (`.context-bar`, `.ref-chip`), final result card (`.final-result-card`), result history section, page-turn transition keyframes, scan-sweep roll animation, gold glow pulse, final card entrance animation. Add full dark mode theme via CSS custom properties on `:root` and `:root[data-theme="dark"]`. |
| `src/web/App.tsx` | Restructure top-level tabs to: Loot Tables, Encounter Builder, Settings, About. Lift encounter result state and settings state up to App level. Add `pendingResolve` state and pass it to `LootTables`. Wire tab switching so encounter-resolve triggers Loot Tables tab. Manage theme (dark/light/auto) from App level. |
| `src/web/components/EncounterBuilder.tsx` | Remove embedded Campaign Settings panel (moved to Settings tab). Change magic item results from auto-resolved to unresolved clickable links. Add "Resolve All" button. Accept callback for resolved results. **Set auto-tier checkbox to unchecked by default.** |
| `src/web/components/CampaignSettings.tsx` | Refactor into the **Settings tab**. Add **Sources section** with the full priority system: source groups (Core Supplements, Settings, Adventures) with batch priority buttons, per-source priority selector (Off/Low/Normal/High/Emphasis), item counts, dampening factor display, and a "Show Formula" toggle. Add **Theme toggle** (Auto/Light/Dark). Keep existing settings (party size, magic richness, show values, show sale price, show mundane, role ratios). |
| `src/web/components/About.tsx` | **New file.** Static content page explaining system math, derived from `DESIGN.md`. Sections: What This Is, How the Math Works, Category Breakdown, Magic Item Tables, DMG Balance Verification. Styled with parchment aesthetic, `Crimson Text`, generous line height, max-width ~650px. |
| `src/engine/roller.ts` | Add `getEffectiveWeight(entry, sourceSettings)` function implementing the formula: `tierValue × bookMultiplier × clamp(√(20/bookItemCount), 0.4, 1.5)`. Add `getFilteredEntries(tableName, sourceSettings)` that computes effective weights for all entries, excludes zero-weight entries, and returns the filtered list. Empty-source structural entries (sub-table refs) pass through with raw weight. |
| `src/engine/types.ts` | Add source settings types: `SourcePriority = 'off' \| 'low' \| 'normal' \| 'high' \| 'emphasis'`. `SourceSettings = Record<string, SourcePriority>`. `ItemTier = 'low' \| 'mid' \| 'high' \| 'vhigh'`. Add `sourceSettings: SourceSettings` to `CampaignSettings`. |

## Files NOT to Modify

| File | Reason |
|------|--------|
| `src/data/*` | Auto-generated from Excel. No changes. |
| `src/web/components/VaultHoard.tsx` | Separate vault feature. No changes. |

## No New Dependencies

Everything in this spec is achievable with React, CSS, and the existing engine. No animation libraries. No state management libraries. No new npm packages.

---

## CSS Reference: Key Animations

### Scan Sweep (roll animation)

```css
@keyframes scan-sweep {
  0%   { transform: translateY(-100%); opacity: 0; }
  10%  { opacity: 0.2; }
  90%  { opacity: 0.2; }
  100% { transform: translateY(100%); opacity: 0; }
}

.entries-container {
  position: relative;
  overflow: hidden;
}

.entries-container.rolling::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: linear-gradient(180deg, transparent, rgba(139,94,60,0.2), transparent);
  animation: scan-sweep 400ms ease-out forwards;
  pointer-events: none;
}
```

### Page Turn Transition

```css
@keyframes page-exit {
  from { transform: translateX(0); opacity: 1; }
  to   { transform: translateX(-40px); opacity: 0; }
}

@keyframes page-enter {
  from { transform: translateX(30px); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}

.table-card-exit {
  animation: page-exit 250ms ease-in-out forwards;
}

.table-card-enter {
  animation: page-enter 250ms ease-in-out forwards;
  animation-delay: 50ms;
}
```

### Gold Glow Pulse

```css
@keyframes gold-glow {
  0%, 100% { box-shadow: 0 0 12px rgba(201,148,58,0.15), 0 4px 16px rgba(42,31,20,0.2); }
  50%      { box-shadow: 0 0 24px rgba(201,148,58,0.35), 0 4px 16px rgba(42,31,20,0.2); }
}

.final-result-card {
  animation: card-entrance 300ms ease-out, gold-glow 2s ease-in-out 300ms infinite;
}

@keyframes card-entrance {
  from { transform: scale(0.96); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}
```
