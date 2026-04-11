# Curation Overlay & Item Stats — Implementation Spec

## Problem

The Review UI can edit item weights and publish to curation.json, but the live app reads from magic-items.ts (generated from Excel). Curation edits never reach the tables.

## Solution: Runtime Weight Overlay

When the app starts, overlay curation.json weights onto the table data. The DM's reviewed weights are law.

### How It Works

**In `roller.ts`, after building `ALL_TABLES`:**

```typescript
import curationData from '../../data/curation.json';

function buildTableLookup(): Record<string, MIEntry[]> {
  const lookup = { ...(MAGIC_ITEMS as Record<string, MIEntry[]>) };
  for (const table of [...SPELL_TABLES, ...SUPPLEMENTAL_TABLES]) {
    lookup[table.name] = table.entries;
  }

  // Apply curation weight overrides
  const curation = curationData as Record<string, { weight?: number | null; status?: string }>;
  for (const [tableName, entries] of Object.entries(lookup)) {
    lookup[tableName] = entries.map((entry) => {
      const key = `${entry.name}|${entry.source}`;
      const override = curation[key];
      if (override?.weight != null && override.status === 'approved') {
        return { ...entry, weight: override.weight };
      }
      return entry;
    });
  }

  return lookup;
}
```

**Rules:**
- Only `status: "approved"` overrides apply. Items still `"ready-for-review"` keep their original weights.
- `weight: null` or missing means "use original weight" (no override).
- The curation.json is already imported by ReviewUI.tsx, so adding this import doesn't increase bundle size.

### Files to Modify

- `src/engine/roller.ts` — import curation.json, apply overrides in `buildTableLookup()`
- No other files change. `STEPPER_TABLES` in `stepperResolve.ts` inherits from `ALL_TABLES` automatically.

### Edition-Aware Loading (future)

When the 2024 pipeline is built, `buildTableLookup()` needs to pick the right curation file:

```typescript
// roller.ts will need the edition setting passed in or read globally
import curation2014 from '../../data/curation.json';
import curation2024 from '../../data/curation-2024.json';

const curation = edition === '2024' ? curation2024 : curation2014;
```

Similarly, `LootTables.tsx` picks the right item-stats file:

```typescript
import stats2014 from '../../../data/item-stats.json';
import stats2024 from '../../../data/item-stats-2024.json';

const itemStats = settings.edition === '2024' ? stats2024 : stats2014;
```

Both files are static imports — Vite tree-shakes unused code but both editions ship in the bundle. If bundle size becomes a concern, switch to dynamic `import()` for the non-default edition.

---

## Item Stats Panel in Review UI

### What It Does

When the admin selects an item in the Review UI, show its D&D stats: type, rarity, attunement requirement, and a truncated description. This lets the DM judge quality and make informed weight decisions without leaving the app.

### Data Source

Generate a lightweight `data/item-stats.json` at build time from the 5etools items.json:

```json
{
  "Flame Tongue|DMG": {
    "type": "M",
    "rarity": "rare",
    "attune": "True",
    "desc": "You can use a bonus action to speak this magic sword's command word, causing flames to erupt from the blade. These flames shed bright light in a 40-foot radius..."
  }
}
```

**Generation script:** `scripts/generate-item-stats.ts`

```typescript
// Read 5etools items.json
// For each magic item (has rarity, not "none"):
//   Extract: type, rarity, reqAttune, first 300 chars of entries text
// Write to data/item-stats.json
// Size: ~377 KB raw, ~94 KB gzipped
```

**Entries text extraction:**
- `entries` is an array of strings and objects
- Flatten: if string, use directly; if object with `entries`, recurse
- Strip 5etools formatting tags: `{@spell fireball}` → `fireball`, `{@item longsword|PHB}` → `longsword`
- Truncate to 300 characters
- Simple regex: `text.replace(/\{@\w+\s+([^|}]+)[^}]*\}/g, '$1')`

### UI Changes in ReviewUI.tsx

**Below the existing weight-in-context panel (right side), add an "Item Stats" section:**

```
┌─ Item Stats ────────────────────────────────┐
│ Flame Tongue                                │
│ Type: Melee Weapon  Rarity: Rare            │
│ Attunement: Yes                             │
│                                             │
│ You can use a bonus action to speak this    │
│ magic sword's command word, causing flames  │
│ to erupt from the blade. These flames shed  │
│ bright light in a 40-foot radius...         │
└─────────────────────────────────────────────┘
```

**Type display mapping** (5etools type codes to readable names):
```typescript
const TYPE_LABELS: Record<string, string> = {
  'M': 'Melee Weapon', 'R': 'Ranged Weapon',
  'S': 'Shield', 'HA': 'Heavy Armor', 'MA': 'Medium Armor', 'LA': 'Light Armor',
  'P': 'Potion', 'SC': 'Scroll', 'WD': 'Wand', 'RD': 'Rod', 'ST': 'Staff',
  'RG': 'Ring', 'A': 'Ammunition', 'SCF': 'Spellcasting Focus',
  'INS': 'Instrument',
};
```

**Implementation notes:**
- Import `item-stats.json` the same way `curation.json` is imported (static import, tree-shaken by Vite).
- The stats panel only renders when an item is selected AND stats exist for that key.
- Stats panel is below the weight-in-context panel, NOT replacing it.
- On mobile, the stats panel collapses to a single-line summary: "Rare Melee Weapon, attunement required"

### Files to Create

- `scripts/generate-item-stats.ts` — extracts stats from 5etools items.json
- `data/item-stats.json` — generated output (gitignored? or committed for convenience)

### Files to Modify

- `src/web/components/ReviewUI.tsx` — import item-stats.json, render stats panel
- `src/web/styles/app.css` — styles for stats panel

---

## Integer Rounding on Source Toggle

### Problem

Sub-tables are designed with raw integer weights that sum to a standard die (d4/d6/d8/d10/d12/d20/d100). When a source is toggled off, items are removed and the total no longer matches a standard die.

Currently the system shows non-standard dice ("d16") which works digitally but isn't a physical die.

### Solution: Snap Up with Proportional Redistribution

When rendering dice ranges for a filtered sub-table, snap the total UP to the next standard die and redistribute the slack proportionally.

**Algorithm:**

```typescript
function snapToStandardDie(
  entries: { name: string; weight: number }[],
): { name: string; weight: number }[] {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  const target = nextDieUp(total); // from STANDARD_DICE
  if (target === total) return entries; // already fits

  const slack = target - total;
  
  // Distribute slack proportionally, rounding to integers
  const scaled = entries.map((e) => ({
    ...e,
    idealWeight: e.weight * (target / total),
  }));
  
  // Round and fix: use largest-remainder method for fair integer rounding
  const floored = scaled.map((e) => ({
    ...e,
    weight: Math.max(1, Math.floor(e.idealWeight)),
    remainder: e.idealWeight - Math.floor(e.idealWeight),
  }));
  
  let currentTotal = floored.reduce((s, e) => s + e.weight, 0);
  const deficit = target - currentTotal;
  
  // Give +1 to the items with the largest fractional remainders
  const byRemainder = floored
    .map((e, i) => ({ i, remainder: e.remainder }))
    .sort((a, b) => b.remainder - a.remainder);
  
  for (let j = 0; j < deficit; j++) {
    floored[byRemainder[j].i].weight += 1;
  }
  
  return floored.map(({ name, weight }) => ({ name, weight }));
}
```

**Why largest-remainder method:** Standard proportional rounding (round each independently) can over- or under-shoot the target. The largest-remainder method (also called Hamilton's method) is the fairest way to apportion integers: floor everything, then give +1 to the items that lost the most from flooring. It's the same algorithm used for parliamentary seat allocation.

**Where to apply:** In `LootTables.tsx`, when computing `rawEntries` for display. If source settings are active and items have been filtered, run `snapToStandardDie()` on the remaining entries before computing dice ranges.

**Important:** This only affects DISPLAY (dice ranges, die badge). The actual probability calculation via `weightedPick` continues to use the effective weights from the priority formula — those don't need to be integers.

### Distortion Budget

Snapping up produces less distortion than snapping down:
- d16 → d20: max distortion 3.8 percentage points
- d16 → d12: max distortion 6.2 percentage points

For most sub-tables (10-30 items), distortion is under 2pp — well within the noise of any physical die roll.

### Files to Modify

- `src/web/components/LootTables.tsx` — add `snapToStandardDie()`, apply to rawEntries when source filtering is active

---

## 3D Dice Integration (Future)

### Overview

Replace the current CSS roll animation with a physics-based 3D die that tumbles and lands on the result. Two options evaluated:

### Option A: dddice (recommended)

**What:** Commercial 3D dice SDK with free tier. TypeScript, npm package, canvas-based renderer.

**Integration:**
```typescript
import { ThreeDDice, parseRollEquation } from 'dddice-js';

// In LootTables.tsx, initialize once:
const dddice = new ThreeDDice(canvasRef.current, API_KEY);
dddice.start();

// On roll:
const { dice } = parseRollEquation(`1d${totalWeight}`, 'dddice-standard');
const roll = await dddice.roll(dice);
const result = roll.total_value; // integer result
// Map result to entry via dice ranges
```

**Pros:** Polished rendering, custom themes (D&D aesthetic), multiplayer sync (could share rolls with players), active development.

**Cons:** Requires free API key. External dependency. ~200KB additional JS.

**API key storage:** Same pattern as GitHub PAT — stored in localStorage, setup modal in Settings.

### Option B: dice-box (self-hosted alternative)

**What:** Open-source 3D dice (`3d-dice/dice-box` on GitHub). No API key, fully self-hosted.

**Pros:** No external dependency. Free forever. Smaller.

**Cons:** Less polished visuals. Less active development. Fewer customization options.

### Integration Points

1. **Canvas element:** Add a `<canvas>` overlay to the stepper table card. When rolling, the canvas becomes visible and the 3D die animates. When landed, the canvas fades and the entry highlights.

2. **Result mapping:** The 3D die returns an integer (1-N). Map it to the entry whose dice range contains that number. This is the same logic `randomInRange` already uses.

3. **Fallback:** If 3D dice are disabled (no API key, or user preference), fall back to the current CSS animation. Add a toggle in Settings: "Enable 3D dice."

4. **Die types:** The 3D renderer supports d4/d6/d8/d10/d12/d20/d100. This is another reason why the integer rounding (Feature 3 above) matters — we need a physical die to render.

### Implementation Scope

- Add to Settings: "3D Dice" toggle + API key input (for dddice) or just toggle (for dice-box)
- Modify `LootTables.tsx`: canvas element, roll handler, result mapping
- ~50 lines of integration code + canvas styling

### Recommendation

Start with **dice-box** (no external dependency, simpler). If the aesthetic isn't good enough, switch to dddice later. The integration points are the same — only the initialization and roll call differ.

### Files to Modify

- `src/web/components/LootTables.tsx` — canvas, roll handler
- `src/web/components/CampaignSettings.tsx` — 3D dice toggle
- `src/web/styles/app.css` — canvas overlay styles
- `package.json` — add `dddice-js` or `@3d-dice/dice-box` dependency

---

## Implementation Order

1. **Curation overlay** (roller.ts) — 10 lines, immediate impact, unblocks the admin workflow
2. **Item stats generation** (new script) — enables informed weight decisions
3. **Item stats panel** (ReviewUI.tsx) — display in admin UI
4. **Integer rounding** (LootTables.tsx) — enables physical dice compatibility
5. **3D dice** — polish, do last
