# Reference Tables Tab — Implementation Spec

**Purpose:** Add a new "Reference" tab that shows all magic item tables laid out like a book — every item, every subtable, every weight, all visible at once. No dice roller. Users with physical dice look up their roll, click the matching row, and navigate to the subtable result. In admin mode, weights become editable.

**Depends on:** `CHERRYKEEP-DESIGN-SPEC.md` (uses the same design tokens, typography, and component styles).

---

## 1. Concept

### What this is
A **read-only reference view** of the entire loot table system. Think of it as the published pages of a D&D sourcebook, but interactive: you can click a subtable reference and it scrolls you there. Everything is visible. Nothing is hidden behind a stepper.

### What this is NOT
- Not a dice roller. There is no ROLL button on this tab.
- Not a replacement for the existing "Tables" (stepper) tab. Both exist.
- Not a data editor (except in admin mode, where weight editing is exposed).

### User workflows

**Physical dice workflow:**
1. User opens the Reference tab.
2. User selects Table A (or whatever table they need).
3. User rolls physical dice (e.g. d6, matching the die type shown in the table header).
4. User finds the row matching their roll in the dice range column.
5. If that row is a subtable reference (e.g. "[Potions-A]"), user clicks it.
6. Page scrolls to the Potions-A section. User rolls again on the subtable's die.
7. User finds their final item. Done.

**Browse/planning workflow:**
1. User opens the Reference tab.
2. User browses all items across all tables to understand the distribution.
3. User can see weights, sources, and dice ranges at a glance.
4. User can click any subtable reference to jump to it.

**Admin workflow:**
1. User enables admin mode (existing mechanism).
2. On the Reference tab, the weight column becomes editable — each weight is an input field.
3. User adjusts weights. Changes are reflected immediately in the dice ranges.
4. User publishes changes (existing publish mechanism).

---

## 2. Tab Placement

Add a new tab to the nav bar in `App.tsx`. The tab is called **"Reference"**. It appears after "Tables" and before "Loot Drops":

```
CherryKeep     [Tables] [Reference] [Loot Drops] [Settings] ...     [☀ ◐ ☾]
```

In `App.tsx`:
- Add `'reference'` to the `Tab` type union.
- Add the tab button to the nav bar.
- Render `<ReferenceView />` when `activeTab === 'reference'`.

Create a new file: `src/web/components/ReferenceView.tsx`.

---

## 3. Data Sources

The Reference view reads from the same data as the stepper:

```typescript
import { MAGIC_ITEMS } from '@data/magic-items';
import { SUPPLEMENTAL_TABLES } from '@data/supplemental';
import { SPELLS } from '@data/spells';
```

`MAGIC_ITEMS` is a `Record<string, Array<{ name: string; source: string; weight: number }>>`. Keys include both main tables (`Magic-Item-Table-A` through `I`) and subtables (`Potions-A`, `Gear-A`, `Swords`, etc.).

`SUPPLEMENTAL_TABLES` is an array of `{ name: string; entries: Array<{ name: string; source: string; weight: number }> }`.

The component also needs access to `CampaignSettings` (for `sourceSettings` to determine which sources are enabled and their priority levels) and `adminMode` (boolean).

---

## 4. Layout Structure

The Reference view has these sections, top to bottom:

### 4.1. Table Selector (reuse the pill bar)

Reuse the same scrollable pill bar from `LootTables.tsx` (the `.table-pills` component specified in `CHERRYKEEP-DESIGN-SPEC.md` Section 7.3). When a pill is clicked, the page scrolls to that table's section.

Additionally, add a "Supplemental" pill at the end (after "I") that scrolls to the supplemental tables section.

### 4.2. Table Section

For the currently selected table (e.g. Table A), render the following:

```
┌──────────────────────────────────────────────────────────────────────┐
│ TABLE A — Minor · Common                                    d6     │
│ (section header, uses --ck-font-display)                           │
├──────────────────────────────────────────────────────────────────────┤
│ Range │ Category              │ Source │ Weight │ % Chance          │
├───────┼───────────────────────┼────────┼────────┼───────────────────┤
│ 1–2   │ ▸ Potions-A           │        │ 40     │ 33.3%            │
│ 3     │ ▸ Gear-A              │        │ 20     │ 16.7%            │
│ 4     │ ▸ Spell-Scrolls-A     │        │ 10     │ 8.3%             │
│ 5     │ ▸ Arms-Armor-A        │        │ 10     │ 8.3%             │
│ 6     │ ▸ Spellcaster-A       │        │ 10     │ 8.3%             │
│ 7     │ ▸ Trinkets-A          │        │ 10     │ 8.3%             │
└──────────────────────────────────────────────────────────────────────┘
```

**Then, immediately below the main table**, render each subtable that the main table references, as its own card:

```
┌──────────────────────────────────────────────────────────────────────┐
│ POTIONS-A                                                   d20    │
│ (subtable header, slightly smaller than main table header)         │
├──────────────────────────────────────────────────────────────────────┤
│ Range │ Item                  │ Source │ Weight │ % Chance          │
├───────┼───────────────────────┼────────┼────────┼───────────────────┤
│ 1–12  │ Potion of Healing     │ DMG    │ 12     │ 60.0%            │
│ 13–15 │ Potion of Climbing    │ DMG    │ 3      │ 15.0%            │
│ 16–17 │ Potion of Comprehens… │ WDMM   │ 2      │ 10.0%            │
│ 18–19 │ Potion of Watchful R… │ WDMM   │ 2      │ 10.0%            │
│ 20    │ Potion of Greater He… │ DMG    │ 1      │ 5.0%             │
└──────────────────────────────────────────────────────────────────────┘
```

If a subtable entry itself references another subtable (e.g. `Cast-Off-Armor` → `[Light-Armor]`), that entry is clickable and scrolls to the referenced table within the same page.

### 4.3. Subtable Rendering Order

For each main table (A–I), find every subtable it references (direct children only). Render those subtables immediately after the main table card, in the same order they appear in the main table (which is weight-descending after sorting — see Section 5).

Then, for each of those subtables, find any subtables THEY reference. Render those as nested sub-sections (same visual treatment, slightly indented or with a connecting line). Continue recursively until all leaf items are shown.

### 4.4. Supplemental Tables Section

After all main table sections, render a "Supplemental Tables" section with a section header. This section contains all tables from `SUPPLEMENTAL_TABLES`, each as its own card. These are the shared tables (Armor, Weapons, Swords, etc.) that are referenced by multiple subtables across different main tables.

### 4.5. Section IDs for Scroll Navigation

Every table and subtable card gets an `id` attribute for scroll targeting:

- Main tables: `id="ref-Magic-Item-Table-A"` through `id="ref-Magic-Item-Table-I"`
- Subtables: `id="ref-Potions-A"`, `id="ref-Gear-A"`, etc.
- Supplemental: `id="ref-supp-Armor"`, `id="ref-supp-Swords"`, etc.

When a subtable reference is clicked, use `document.getElementById(targetId).scrollIntoView({ behavior: 'smooth', block: 'start' })`.

---

## 5. Sorting

All tables (main and sub) are sorted with this comparator:

1. **Weight descending** (highest weight first).
2. **Source alphabetical ascending** (tiebreaker). Empty source sorts last.
3. **Item name alphabetical ascending** (tiebreaker).

```typescript
function refSort(a: Entry, b: Entry): number {
  // Weight descending
  if (b.weight !== a.weight) return b.weight - a.weight;
  // Source ascending (empty last)
  const srcA = a.source || '\uffff';
  const srcB = b.source || '\uffff';
  if (srcA !== srcB) return srcA.localeCompare(srcB);
  // Name ascending
  return a.name.localeCompare(b.name);
}
```

Apply this sort to every table before computing dice ranges. The dice ranges are computed AFTER sorting, so the highest-weighted item gets the lowest dice numbers (e.g. range 1–12).

---

## 6. Columns

### 6.1. Standard Columns (always visible)

| Column | Width | Font | Content |
|--------|-------|------|---------|
| Range | 56px fixed | `--ck-font-ui`, `--ck-text-xs` | Dice range, e.g. "1–12" or "13" |
| Item / Category | flex: 1 | `--ck-font-content`, `--ck-text-base` for leaf items; `--ck-font-ui` for subtable refs | Item name or subtable reference. Subtable refs are clickable links. |
| Source | 56px fixed | `--ck-font-ui`, `--ck-text-xs`, `--ck-text-tertiary` | Source abbreviation (DMG, XGtE, etc.). Empty for subtable refs and supplemental items. |
| Weight | 52px fixed | `--ck-font-ui`, `--ck-text-sm` | Integer weight value. Right-aligned. In admin mode, this becomes an `<input>`. |
| % | 56px fixed | `--ck-font-ui`, `--ck-text-xs`, `--ck-text-tertiary` | Percentage chance, computed as `(weight / totalWeight * 100).toFixed(1) + '%'`. |

### 6.2. Mobile Columns (max-width: 560px)

On mobile, hide the % column. The Range column shrinks to 48px. The Weight column shrinks to 44px.

### 6.3. Table Header Row

The header row for each table shows the table name and die type:

```
TABLE A — Minor · Common                                          d6
```

- Left side: Table name in `--ck-font-display`, `--ck-text-lg`, `--ck-cherry` color.
- Right side: Die type (e.g. "d6", "d20", "d100") in `--ck-font-ui`, `--ck-text-sm`, `--ck-text-tertiary`.

The die type is computed from the total weight: use `nextDieUp(totalWeight)` and format as `d${die}`. Reuse the `STANDARD_DICE` and `nextDieUp` functions from `LootTables.tsx` — extract them to a shared utility if they aren't already.

### 6.4. Column Header Row

Below the table header, a column header row with uppercase labels:

```css
.ref-col-header {
  display: grid;
  grid-template-columns: 56px 1fr 56px 52px 56px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--ck-border);
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-xs);
  font-weight: 600;
  color: var(--ck-text-tertiary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
```

---

## 7. Row Rendering

### 7.1. Identifying Row Types

Each entry has a `name` field. The entry type is determined by the name format:

- **Subtable reference:** Name matches pattern `[SomeTable]` (starts with `[`, ends with `]`). These are clickable. Strip the brackets for display. Prepend a `▸` arrow character.
- **Inline subtable reference:** Name contains `([SomeTable])` within it, like `"Spell Scroll ([Spells-Level-1])"`. The part in `([...])` is a sub-reference. Display the full name, but make the bracketed part clickable.
- **Leaf item:** Name does not match either pattern. This is a final item name.

### 7.2. Row CSS

```css
.ref-row {
  display: grid;
  grid-template-columns: 56px 1fr 56px 52px 56px;
  min-height: 44px;
  padding: 0 14px;
  align-items: center;
  border-bottom: 1px solid var(--ck-border-subtle);
  transition: background 0.15s ease;
  cursor: default;
}

.ref-row:nth-child(even) {
  background: var(--ck-border-subtle);
}

.ref-row:hover {
  background: var(--ck-bg-hover);
}

.ref-row:last-child {
  border-bottom: none;
}

/* Clickable subtable reference */
.ref-subtable-link {
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-base);
  font-weight: 600;
  color: var(--ck-cherry);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
  transition: color var(--ck-ease-fast);
}

.ref-subtable-link:hover {
  color: var(--ck-cherry-light);
  text-decoration: underline;
}

/* Leaf item name */
.ref-item-name {
  font-family: var(--ck-font-content);
  font-size: var(--ck-text-base);
  color: var(--ck-text-primary);
}

/* Dice range column */
.ref-range {
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-xs);
  color: var(--ck-text-secondary);
  font-variant-numeric: tabular-nums;
}

/* Source column */
.ref-source {
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-xs);
  color: var(--ck-text-tertiary);
}

/* Weight column */
.ref-weight {
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-sm);
  color: var(--ck-text-secondary);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* Percentage column */
.ref-pct {
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-xs);
  color: var(--ck-text-tertiary);
  text-align: right;
  font-variant-numeric: tabular-nums;
}
```

### 7.3. Subtable Card CSS

Each subtable renders as a card:

```css
.ref-table-card {
  background: var(--ck-bg-raised);
  border: 1px solid var(--ck-border);
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 12px;
  box-shadow: var(--ck-shadow-card);
}

.ref-table-header {
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px solid var(--ck-border);
}

.ref-table-name {
  font-family: var(--ck-font-display);
  font-size: var(--ck-text-md);
  font-weight: 600;
  color: var(--ck-text-primary);
  letter-spacing: 0.03em;
}

/* Main tables get cherry color for their name */
.ref-table-name.main {
  font-size: var(--ck-text-lg);
  color: var(--ck-cherry);
}

.ref-table-die {
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-sm);
  color: var(--ck-text-tertiary);
}
```

### 7.4. Nesting Indicator

When a subtable is rendered as a child of a main table, add a subtle left-border indicator to show the relationship:

```css
.ref-subtable-group {
  margin-left: 0;
  padding-left: 0;
  border-left: 2px solid var(--ck-border-cherry);
  margin-bottom: 16px;
}
```

Each main table section is wrapped in a container. The main table card comes first, then a `.ref-subtable-group` div containing all its child subtable cards.

### 7.5. "Back to top" link

At the bottom of each subtable card, if the subtable was navigated to via a click (or always, for convenience), show a small link:

```
↑ Back to Table A
```

This scrolls back to the parent main table. Use `--ck-font-ui`, `--ck-text-xs`, `--ck-text-tertiary`, clickable.

---

## 8. Admin Mode: Weight Editing

When `adminMode === true`, the following changes apply to the Reference tab:

### 8.1. Weight Column Becomes Editable

Replace the static weight number with an `<input>`:

```css
.ref-weight-input {
  width: 44px;
  background: var(--ck-bg-deep);
  border: 1px solid var(--ck-border);
  border-radius: 4px;
  padding: 4px 6px;
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-sm);
  color: var(--ck-text-primary);
  text-align: right;
  min-height: 32px;
  font-variant-numeric: tabular-nums;
}

.ref-weight-input:focus-visible {
  border-color: var(--ck-cherry);
  outline: none;
}

.ref-weight-input.modified {
  border-color: var(--ck-ember);
  background: var(--ck-ember-faint);
}
```

### 8.2. Modified Indicator

When a weight has been changed from its original value, the input gets the `.modified` class (ember border + faint background). This makes it immediately obvious which weights have been edited.

### 8.3. Save/Discard Controls

When any weights have been modified, show a sticky bar at the bottom of the Reference tab:

```
┌──────────────────────────────────────────────────────────────────────┐
│  12 weights modified              [Discard Changes]  [Save Draft]   │
└──────────────────────────────────────────────────────────────────────┘
```

- "Save Draft" saves to the existing draft mechanism (same as ReviewUI's draft).
- "Discard Changes" resets all weights to their original values.
- The bar uses `position: sticky; bottom: 0;` with `--ck-bg-elevated` background.

### 8.4. State Management

Weight edits are stored in component-local state as a map: `Record<string, Record<string, number>>` where the outer key is the table name (e.g. "Potions-A") and the inner key is the item name, and the value is the new weight.

When rendering, if an edit exists for an item, use the edited weight. Otherwise use the original weight. Dice ranges recompute dynamically when weights change.

The save mechanism should integrate with the existing curation/draft system. The exact integration depends on how the ReviewUI draft works — the Reference tab should call the same `updateDraft` or equivalent function.

---

## 9. Scroll Behavior

### 9.1. Pill Navigation

When a table pill (A–I or Supplemental) is clicked, scroll the corresponding main table section into view:

```typescript
const el = document.getElementById(`ref-Magic-Item-Table-${letter}`);
if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
```

Add a small scroll offset (e.g. 60px) to account for the sticky nav bar.

### 9.2. Subtable Link Navigation

When a subtable reference link is clicked:

```typescript
function handleSubtableClick(tableName: string) {
  // First try in MAGIC_ITEMS
  let targetId = `ref-${tableName}`;
  let el = document.getElementById(targetId);
  // If not found, try supplemental
  if (!el) {
    targetId = `ref-supp-${tableName}`;
    el = document.getElementById(targetId);
  }
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Optional: briefly highlight the target card
    el.classList.add('ref-highlight');
    setTimeout(() => el.classList.remove('ref-highlight'), 1500);
  }
}
```

### 9.3. Highlight on Navigation

When a subtable card is scrolled to via a link click, briefly highlight it:

```css
.ref-highlight {
  animation: ref-flash 1.5s ease;
}

@keyframes ref-flash {
  0%   { box-shadow: 0 0 0 2px var(--ck-cherry), var(--ck-shadow-glow); }
  100% { box-shadow: var(--ck-shadow-card); }
}
```

---

## 10. Source Filtering Interaction

The Reference tab respects the same source filtering settings as the stepper. If a source is disabled in CampaignSettings, items from that source are either:

**Option A (recommended):** Shown but visually dimmed — reduced opacity (0.4), strikethrough on the item name. The weight is shown but grayed out. This way the user can see the full picture even with sources disabled.

**Option B:** Hidden entirely, with weights and dice ranges recalculated.

Use Option A. The reference view is about showing everything. The dimming makes it clear what's active vs inactive without hiding data.

```css
.ref-row.source-disabled {
  opacity: 0.4;
}

.ref-row.source-disabled .ref-item-name {
  text-decoration: line-through;
}
```

---

## 11. Performance Considerations

The full dataset is approximately 95 tables × ~10-30 entries each = roughly 1000-2000 rows total. This is well within React's rendering capability without virtualization. However:

- Do NOT render all 9 main tables simultaneously on first load. Only render the currently-selected main table and its subtables. The pill selector controls which table section is visible.
- Supplemental tables render only when the "Supplemental" pill is selected.
- Use `useMemo` for sorted entries and computed dice ranges per table.

---

## 12. File Structure

Create one new file:

```
src/web/components/ReferenceView.tsx
```

This component receives the following props:

```typescript
interface ReferenceViewProps {
  settings: CampaignSettings;
  adminMode: boolean;
}
```

No new CSS file — all styles go in `app.css` under a new section header:

```css
/* =========================================================================
   Reference Tables — Book View
   ========================================================================= */
```

---

## 13. Verification

After implementation, verify:

1. **All 9 main tables render correctly** with sorted entries, dice ranges, and weights.
2. **Subtable references are clickable** and scroll to the correct subtable card.
3. **Supplemental tables render** in their own section.
4. **Sorting is correct:** weight descending → source alphabetical → name alphabetical.
5. **Die type is correct** in each table header (e.g. Table A shows d6 if total weight maps to a d6).
6. **Source-disabled items are dimmed** but still visible.
7. **Admin mode:** weight inputs appear, modified weights show ember highlight, dice ranges recalculate live.
8. **Mobile:** % column hidden, table scrolls horizontally if needed.
9. **Scroll navigation:** pill clicks and subtable link clicks both scroll smoothly with nav bar offset.
10. **Highlight flash:** navigated-to subtable cards briefly glow cherry on arrival.
