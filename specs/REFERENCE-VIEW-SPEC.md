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

## 8. Admin Mode: Weight Editing & Rebalancing

Admin mode is gated behind the password/auth system (see `AUTH-SPEC.md`). When `adminMode === true`, the Reference tab becomes an editing interface. The primary workflow is adjusting item weights, with automatic rebalancing to maintain standard dice sizes.

### 8.1. Weight Column: Stepper Controls

In admin mode, each weight cell becomes an inline stepper — the current weight value flanked by `−` and `+` buttons:

```
┌───┬─────┬───┐
│ − │  12 │ + │
└───┴─────┴───┘
```

```css
.ref-weight-stepper {
  display: flex;
  align-items: center;
  gap: 0;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--ck-border);
}

.ref-weight-stepper-btn {
  width: 28px;
  min-height: 32px;
  background: var(--ck-bg-elevated);
  border: none;
  color: var(--ck-text-secondary);
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-sm);
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--ck-ease-fast);
}

.ref-weight-stepper-btn:hover {
  background: var(--ck-bg-hover);
  color: var(--ck-text-primary);
}

.ref-weight-stepper-btn:active {
  background: var(--ck-cherry-faint);
}

.ref-weight-value {
  width: 36px;
  background: var(--ck-bg-deep);
  border: none;
  border-left: 1px solid var(--ck-border-subtle);
  border-right: 1px solid var(--ck-border-subtle);
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-sm);
  color: var(--ck-text-primary);
  text-align: center;
  min-height: 32px;
  font-variant-numeric: tabular-nums;
  padding: 0;
}

/* Modified indicator — ember highlight */
.ref-weight-stepper.modified {
  border-color: var(--ck-ember);
}

.ref-weight-stepper.modified .ref-weight-value {
  background: var(--ck-ember-faint);
  color: var(--ck-ember);
  font-weight: 700;
}
```

The value field is also directly editable — the user can click the number and type a value. But the +/− buttons are the primary interaction. The +/− buttons increment/decrement by 1. Minimum weight is 1. There is no maximum.

### 8.2. Tracking Edits

The component tracks three things in state:

```typescript
interface WeightEdits {
  /** Map of tableName → itemName → newWeight */
  edits: Record<string, Record<string, number>>;
  /** Set of tableName → itemName keys that the user manually touched */
  touched: Set<string>;  // keys formatted as "tableName::itemName"
}
```

When a user adjusts a weight via +/−:
1. The new weight is stored in `edits`.
2. The item is added to `touched`.
3. Dice ranges for that table recompute immediately using the edited weights.
4. The row gets the `.modified` class.

Items NOT in `touched` are "untouched" — eligible for auto-rebalancing.

### 8.3. Dice Size Status Bar (per-table)

Each table card in admin mode gets a status bar at the bottom showing the current dice situation:

```
┌──────────────────────────────────────────────────────────────────────┐
│ Total: 23  │  Target: d20 (need −3)  │  ☐ Auto-rebalance  │ [Apply]│
└──────────────────────────────────────────────────────────────────────┘
```

This bar is per-table, not global, because each table has its own dice size.

**Fields in the status bar:**

| Field | Description |
|-------|-------------|
| Total | Current sum of all weights in this table (including edits) |
| Target | The nearest standard die that fits. Computed as `nextDieUp(total)`. If total already matches a standard die, show "✓ d20" in green. |
| Delta | How many weight points need to be added or removed. E.g. "need −3" or "need +1". Hidden when total matches a die. |
| Auto-rebalance | Checkbox. When checked, the Apply button will redistribute the delta across untouched items. |
| Apply | Button. Behavior depends on the checkbox state (see 8.4). |

**Status bar CSS:**

```css
.ref-admin-status {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 14px;
  border-top: 1px solid var(--ck-border);
  background: var(--ck-bg-elevated);
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-xs);
  flex-wrap: wrap;
}

.ref-admin-total {
  font-weight: 600;
  color: var(--ck-text-primary);
  font-variant-numeric: tabular-nums;
}

.ref-admin-target {
  color: var(--ck-text-secondary);
}

.ref-admin-target.fits {
  color: var(--ck-rarity-uncommon);  /* green */
}

.ref-admin-target.needs-change {
  color: var(--ck-ember);
}

.ref-admin-delta {
  font-weight: 600;
  color: var(--ck-ember);
}

.ref-admin-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: var(--ck-text-secondary);
}

.ref-admin-checkbox input[type="checkbox"] {
  accent-color: var(--ck-cherry);
  width: 16px;
  height: 16px;
}

.ref-admin-apply {
  margin-left: auto;
}
```

### 8.4. Apply Button Behavior

The Apply button has two modes depending on the auto-rebalance checkbox:

**Auto-rebalance OFF:**

- If the total weight matches a standard die → Apply is ENABLED (green). Clicking it commits the edits to the draft. The button text shows "Apply (d20 ✓)".
- If the total weight does NOT match a standard die → Apply is DISABLED (grayed out). Show tooltip or inline text: "Total must match a standard die size (d4, d6, d8, d10, d12, d20, d100). Adjust weights manually, or enable auto-rebalance."

**Auto-rebalance ON:**

- Apply is always ENABLED (unless there are no edits). The button text shows "Apply & Rebalance → d20" (where d20 is the target die).
- When clicked, the system:
  1. Computes the target die: `nextDieUp(total)`.
  2. Computes the delta: `target - total`. This can be positive (need to add weight) or negative (need to remove weight).
  3. Identifies all UNTOUCHED items in the table.
  4. Redistributes the delta across untouched items using the largest-remainder method (same algorithm as `snapToStandardDie` in `LootTables.tsx`).
  5. The redistribution logic: scale each untouched item's weight proportionally to fill the target, then use the largest-remainder rounding to ensure integer weights that sum correctly.
  6. All redistributed items are NOT added to `touched` — they remain "auto-adjusted" and get a different visual indicator.

**Redistribution algorithm (detailed):**

```typescript
function rebalance(
  entries: Array<{ name: string; weight: number }>,
  touched: Set<string>,
  tableName: string,
  edits: Record<string, number>,
): Record<string, number> {
  // 1. Compute current weights (with edits applied)
  const current = entries.map(e => ({
    name: e.name,
    weight: edits[e.name] ?? e.weight,
    isTouched: touched.has(`${tableName}::${e.name}`),
  }));

  const total = current.reduce((s, e) => s + e.weight, 0);
  const target = nextDieUp(total);
  const delta = target - total;

  if (delta === 0) return edits; // Already fits

  // 2. Sum of untouched weights
  const untouched = current.filter(e => !e.isTouched);
  const untouchedTotal = untouched.reduce((s, e) => s + e.weight, 0);

  if (untouchedTotal === 0) {
    // All items are touched — can't auto-rebalance
    return edits;
  }

  // 3. Scale untouched weights to absorb the delta
  const newUntouchedTotal = untouchedTotal + delta;
  const ratio = newUntouchedTotal / untouchedTotal;

  // 4. Largest-remainder rounding
  const scaled = untouched.map(e => {
    const ideal = e.weight * ratio;
    const floored = Math.max(1, Math.floor(ideal));
    return { name: e.name, floored, remainder: ideal - Math.floor(ideal) };
  });

  let distributed = scaled.reduce((s, e) => s + e.floored, 0);
  const remaining = newUntouchedTotal - distributed;

  // Sort by remainder descending, give +1 to top N
  scaled.sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < remaining && i < scaled.length; i++) {
    scaled[i].floored += 1;
  }

  // 5. Build new edits
  const newEdits = { ...edits };
  for (const s of scaled) {
    newEdits[s.name] = s.floored;
  }
  return newEdits;
}
```

### 8.5. Auto-Adjusted Visual Indicator

Items that were adjusted by auto-rebalance (not manually touched, but weight changed from original) get a different visual treatment than manually edited items:

```css
/* Manually edited — ember */
.ref-weight-stepper.modified {
  border-color: var(--ck-ember);
}

/* Auto-adjusted — subtle blue-gray */
.ref-weight-stepper.auto-adjusted {
  border-color: var(--ck-rarity-rare);  /* blue */
}

.ref-weight-stepper.auto-adjusted .ref-weight-value {
  background: rgba(74, 158, 232, 0.06);
  color: var(--ck-rarity-rare);
}
```

This makes it immediately visible: "I changed these (ember) and the system adjusted these (blue) to make the dice work."

### 8.6. Global Sticky Save Bar

Below all table-level status bars, a global sticky bar appears at the bottom of the viewport when ANY edits exist anywhere:

```
┌──────────────────────────────────────────────────────────────────────┐
│  Table A: 3 edited · Table C: 1 edited     [Discard All] [Publish] │
└──────────────────────────────────────────────────────────────────────┘
```

```css
.ref-admin-global-bar {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--ck-bg-elevated);
  border-top: 1px solid var(--ck-border);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  z-index: 50;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.2);
}

.ref-admin-edit-summary {
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-xs);
  color: var(--ck-text-secondary);
}

.ref-admin-bar-actions {
  display: flex;
  gap: 8px;
}
```

**Buttons:**
- "Discard All" — `btn-ghost` style. Clears all edits across all tables. Confirm with a simple "Are you sure?" inline.
- "Publish" — `btn-primary` (cherry) style. Commits the weight changes to the GitHub repo via the existing PAT/publish mechanism from REVIEW-UI-SPEC. This writes updated weight values into `data/curation.json` (or whichever file the curation system uses), commits, and pushes.

### 8.7. Item Moving (Future)

The ability to move items between subtables (e.g. moving an item from Potions-A to Consumables-B) is a planned future feature. For now, do NOT implement it. Reserve space in the UI by noting that in admin mode, a "⋮" menu icon could appear at the end of each row, but do not implement the menu. This is noted here for future reference only.

### 8.8. State Persistence

Weight edits are stored in `localStorage` under key `loot-tables:ref-weight-edits` so they survive page refreshes. The format is:

```json
{
  "edits": {
    "Potions-A": { "Potion of Healing": 14, "Potion of Climbing": 2 }
  },
  "touched": ["Potions-A::Potion of Healing", "Potions-A::Potion of Climbing"]
}
```

On component mount, load from localStorage. On every edit, save to localStorage. On Publish or Discard, clear localStorage.

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
7. **Admin mode — weight steppers:** +/− buttons appear, click + to increment, − to decrement. Minimum weight is 1.
8. **Admin mode — modified indicator:** manually edited weights show ember highlight. The number updates live.
9. **Admin mode — dice status bar:** each table shows current total, target die, and delta. When total matches a die, shows green ✓.
10. **Admin mode — auto-rebalance OFF:** Apply button is grayed out when total doesn't match a die. Enabled when it does.
11. **Admin mode — auto-rebalance ON:** Apply redistributes delta across untouched items. Auto-adjusted items show blue highlight (distinct from ember for manual edits).
12. **Admin mode — global bar:** shows summary of all edits, Discard All clears everything, Publish commits to repo.
13. **Admin mode — persistence:** refresh the page, edits are still there (localStorage). Publish or Discard clears them.
14. **Mobile:** % column hidden, table scrolls horizontally if needed.
15. **Scroll navigation:** pill clicks and subtable link clicks both scroll smoothly with nav bar offset.
16. **Highlight flash:** navigated-to subtable cards briefly glow cherry on arrival.
