# Review UI Enhancements — Implementation Spec

## Context

`ReviewUI.tsx` (460 lines) already has: sortable/filterable item table, inline weight editing, keyboard navigation (j/k/arrows, Enter=approve, 1-9=weight), draft persistence in localStorage, JSON export, weight-in-context panel showing siblings and die size, batch approve-all-visible.

This spec adds three features: **source-batch review mode**, **rebalancing proposals**, and **GitHub publish**.

---

## Feature 1: Source-Batch Review Mode

### What It Does

Adds a "Review by Source" view alongside the existing flat table view. When a new book's items are auto-classified, the DM reviews them as a batch — all items from that source together, with per-table context.

### UI Changes

**Add a toggle at the top of the Review UI, next to the filter bar:**

```
[Flat List] [By Source]
```

Default: Flat List (current behavior, unchanged).

**When "By Source" is active:**

1. Group all items by their `source` field.
2. For each source that has at least one `ready-for-review` item, show a collapsible card:

```
┌─────────────────────────────────────────────┐
│ ▶ Fizban's Treasury of Dragons (FTD)        │
│   4 items ready for review · 24 total       │
└─────────────────────────────────────────────┘
```

3. Expanding the card shows its items in a compact table (same columns as the flat list but scoped to this source). Items are grouped by table letter within the card:

```
┌─────────────────────────────────────────────┐
│ ▼ Fizban's Treasury of Dragons (FTD)        │
│   4 items ready for review · 24 total       │
│                                             │
│   Table G (Rare Major):                     │
│     Stirring Dragon Vessel  Misc   w=3  ☐   │
│     Stirring Scaled Ornament Apparel w=3 ☐  │
│                                             │
│   Table I (Legendary Major):                │
│     Ascendant Dragon Vessel Misc   w=3  ☐   │
│     Gold Canary Figurine    Misc   w=3  ☐   │
│                                             │
│   [Approve All 4] [Skip]                    │
└─────────────────────────────────────────────┘
```

4. Each item row has: name, category, weight (editable inline), approve checkbox.
5. "Approve All N" button approves all `ready-for-review` items in this source at once.
6. Sources with 0 items needing review are collapsed and dimmed (but still visible for reference).

**Expand the source filter dropdown** to use the full source name from `expandSource()`. Currently it's a free-text input — change to a dropdown of all sources present in curation, showing full name + count.

### Implementation Notes

- Source grouping: `Object.groupBy` or manual reduce on the `mergedItems` array.
- Use `expandSource()` from `sourcebook-lookup.ts` for display names.
- The weight-in-context panel (existing) should still work — when an item is selected in source view, show its siblings in the right panel.
- Keyboard shortcuts should work within each source card (j/k to move between items, Enter to approve, 1-9 for weight).

### Files to Modify

- `src/web/components/ReviewUI.tsx` — add source-batch view mode
- `src/web/styles/app.css` — add styles for source cards

### Files NOT to Modify

- No engine changes. No data changes. No other components.

---

## Feature 2: Rebalancing Proposals

### What It Does

When new items are added to a sub-table, the total weight changes. If the new total exceeds the current standard die (d4/d6/d8/d10/d12/d20/d100), the system proposes a rebalance.

### How It Works

**Standard dice:** 4, 6, 8, 10, 12, 20, 100.

**When rendering the weight-in-context panel** (the right-side panel that shows siblings), add a section below the sibling list:

```
┌─ Sub-table: Apparel-G ──────────────────────┐
│ Boots of the Winterlands    w=4              │
│ Bracers of Archery          w=4              │
│ Cloak of Elvenkind          w=6              │
│ ★ New: Kagonesti Shroud     w=3   ← NEW     │
│ ... (12 more)                                │
│                                              │
│ Total weight: 53 → 56 (was d100, still d100) │
│ ✓ Fits current die. No rebalancing needed.   │
└──────────────────────────────────────────────┘
```

When the total EXCEEDS the current die:

```
┌─ Sub-table: Shields-H ──────────────────────┐
│ Animated Shield       w=4                    │
│ Sapphire Buckler      w=3                    │
│ Shield of the Uven Rune w=3                  │
│ Spellguard Shield     w=3                    │
│ ★ New: Moonstone Shield  w=3   ← NEW        │
│                                              │
│ Total weight: 13 → 16 (was d12, now exceeds) │
│ ⚠ Exceeds d12. Options:                     │
│   • Expand to d20 (+4 slack to distribute)   │
│   • Reduce: Sapphire Buckler 3→2, Uven 3→2  │
│     [Apply suggestion]                       │
└──────────────────────────────────────────────┘
```

### Rebalance Algorithm

```typescript
function proposeRebalance(siblings: SiblingInfo[], newTotal: number): Proposal | null {
  const currentDie = nextDieUp(newTotal - newItemWeight); // die before adding
  const proposedDie = nextDieUp(newTotal);
  
  if (proposedDie === currentDie) return null; // still fits
  
  // Option A: expand to next die
  const optionExpand = { die: proposedDie, slack: proposedDie - newTotal };
  
  // Option B: steal from heaviest non-new items to fit current die
  const stealTarget = newTotal - currentDie; // how much to steal
  const candidates = siblings
    .filter(s => !s.isNew && s.weight > 1)
    .sort((a, b) => b.weight - a.weight); // heaviest first
  
  const steals: { name: string; from: number; to: number }[] = [];
  let stolen = 0;
  for (const c of candidates) {
    if (stolen >= stealTarget) break;
    const take = Math.min(c.weight - 1, stealTarget - stolen);
    steals.push({ name: c.name, from: c.weight, to: c.weight - take });
    stolen += take;
  }
  
  const optionSteal = stolen >= stealTarget ? steals : null;
  
  return { currentDie, proposedDie, optionExpand, optionSteal };
}
```

### UI for Proposals

- Show proposals in the weight-in-context panel, below the sibling list.
- Green highlight on new items (items with `ready-for-review` status).
- Yellow highlight on items whose weight would change in the steal proposal.
- "Apply suggestion" button applies the steal proposal to the draft.
- If no proposal needed: show "✓ Fits current die" in green.

### Implementation Notes

- This runs entirely in the existing `siblingContext` useMemo — extend it with the proposal calculation.
- `STANDARD_DICE` array already exists in ReviewUI.tsx.
- `nextDieUp()` already exists in ReviewUI.tsx.
- The proposal is display-only until "Apply suggestion" is clicked (which calls `updateDraft` for each affected item).

### Files to Modify

- `src/web/components/ReviewUI.tsx` — extend siblingContext with rebalance proposal, add UI section
- `src/web/styles/app.css` — styles for proposal highlights

---

## Feature 3: GitHub Publish

### What It Does

Adds a "Publish" button to the Review UI that commits the merged curation.json to the GitHub repository using the GitHub API with a Personal Access Token.

### Setup Flow

1. In the Review UI, next to the existing "Export JSON" and "Clear Draft" buttons, add a "Publish to GitHub" button.
2. First time: clicking "Publish" shows a one-time setup modal asking for a GitHub PAT.
3. PAT is stored in localStorage under key `loot-tables:github-pat`.
4. After setup, the button directly publishes.

### Publish Flow

```
1. User clicks "Publish to GitHub"
2. Merge curation data with draft (same logic as Export)
3. Fetch current curation.json from GitHub API to get its SHA:
   GET /repos/MCherry1/loot-tables/contents/data/curation.json
   Headers: Authorization: Bearer {PAT}
4. PUT the updated file:
   PUT /repos/MCherry1/loot-tables/contents/data/curation.json
   Body: {
     message: "Update curation.json via review UI",
     content: base64(mergedJSON),
     sha: currentSHA
   }
5. On success: clear draft, show success toast
6. On 409 conflict: show "File was modified externally. Please refresh and re-apply changes."
7. On auth error: show "PAT expired or invalid. Please update in settings."
```

### UI Elements

**PAT Setup Modal** (shown once, or when PAT is invalid):
```
┌─────────────────────────────────────────────┐
│ GitHub Personal Access Token                 │
│                                             │
│ Create a fine-grained PAT at                │
│ github.com/settings/tokens with:            │
│ • Repository: MCherry1/loot-tables          │
│ • Permissions: Contents (Read & Write)      │
│                                             │
│ [________________________] ← PAT input      │
│                                             │
│ [Save]  [Cancel]                            │
└─────────────────────────────────────────────┘
```

**Publish button states:**
- Default: `[📤 Publish]`
- Publishing: `[⏳ Publishing...]` (disabled)
- Success: `[✓ Published!]` (green, reverts after 3s)
- Error: `[✗ Failed]` (red, with error message below)

**"Manage PAT" link** in the publish section — clicking it re-opens the setup modal.

### Implementation Notes

- Use `fetch()` directly — no npm dependencies.
- GitHub API base: `https://api.github.com`
- Content must be base64-encoded. Use `btoa()` or `TextEncoder` + manual base64.
- The PAT modal is a simple div overlay, NOT a separate component file. Keep it in ReviewUI.tsx.
- Clear the draft after successful publish (same as clearDraft callback).
- Do NOT store the PAT anywhere except localStorage. Do NOT log it.

### Files to Modify

- `src/web/components/ReviewUI.tsx` — add publish button, PAT modal, API calls
- `src/web/styles/app.css` — styles for modal overlay and button states

### Files NOT to Modify

- No engine changes. No other components. No new files.

---

## General Implementation Rules

1. **Do NOT create new component files.** All changes go in ReviewUI.tsx and app.css.
2. **Do NOT add npm dependencies.** Everything uses browser APIs and React.
3. **Keep keyboard shortcuts working.** j/k/arrows/Enter/1-9 must work in both flat and source-batch views.
4. **Draft persistence must survive all changes.** localStorage save/load pattern is already correct — extend it, don't replace it.
5. **The existing flat list view must remain unchanged.** Source-batch is an alternate view, not a replacement.
6. **Mobile must not break.** The Review UI is admin-only but should still render acceptably on a phone screen.
