// ---------------------------------------------------------------------------
// Pure helpers shared by the stepper (LootTables) and the encounter
// "Resolve All" batch action. String-based composed-name resolution.
// ---------------------------------------------------------------------------

import {
  ALL_TABLES,
  getTablesForEdition,
  getFilteredEntries,
  weightedPick,
} from '@engine/index';
import type { Edition, SourceSettings } from '@engine/index';
import { CUSTOM_GEMS } from '../../data/gems';
import { CUSTOM_ART } from '../../data/art';

export type Entry = { name: string; source?: string; weight: number };

/** Build the extended stepper lookup from a base table set. */
function buildStepperLookup(base: Record<string, Entry[]>): Record<string, Entry[]> {
  const lookup: Record<string, Entry[]> = { ...base };
  for (const t of CUSTOM_GEMS) lookup[t.name] = t.entries as Entry[];
  for (const t of CUSTOM_ART) lookup[t.name] = t.entries as Entry[];
  return lookup;
}

/**
 * Extended table lookup. Includes everything in `ALL_TABLES` (magic items,
 * spells, supplemental equipment) plus gems and art tables, which the engine
 * does not put in `ALL_TABLES` because the loot generator rolls them via
 * dedicated `rollGem` / `rollArt` paths.
 */
const STEPPER_TABLES: Record<string, Entry[]> = buildStepperLookup(ALL_TABLES);

/** Cached 2024 stepper tables (built on first access). */
let _stepperTables2024: Record<string, Entry[]> | null = null;

/** Get the stepper lookup for a specific edition. */
function getStepperLookup(edition?: Edition): Record<string, Entry[]> {
  if (edition === '2024') {
    if (!_stepperTables2024) {
      _stepperTables2024 = buildStepperLookup(getTablesForEdition('2024'));
    }
    return _stepperTables2024;
  }
  return STEPPER_TABLES;
}

/** Look up a table by name from the extended (stepper-aware) lookup. */
export function getStepperTable(name: string, edition?: Edition): Entry[] | null {
  return getStepperLookup(edition)[name] ?? null;
}

/**
 * Look up a table and apply source-priority filtering. Entries with empty
 * `source` (structural refs like `[Armor]`) pass through unchanged.
 */
export function getFilteredStepperTable(
  name: string,
  sourceSettings: SourceSettings | undefined,
  edition?: Edition,
): Entry[] | null {
  const raw = getStepperLookup(edition)[name];
  if (!raw) return null;
  if (!sourceSettings) return raw;
  // getFilteredEntries expects required `source`; our stepper entries have
  // optional source so normalize to '' before filtering.
  const normalized = raw.map((e) => ({ ...e, source: e.source ?? '' }));
  return getFilteredEntries(normalized, sourceSettings);
}

export type StepRecord = {
  tableName: string;
  pickedEntry: { name: string; source: string; weight: number };
  pickedIdx: number;
  rolledNumber: number;
};

const REF_RE = /\[([A-Za-z][A-Za-z0-9_-]*)\]/;

export function extractRef(name: string): string | null {
  const m = REF_RE.exec(name);
  return m ? m[1] : null;
}

/** Strip bracket refs and trailing letter suffixes from an entry name. */
export function cleanDisplayName(name: string): string {
  return name
    .replace(/\[([A-Za-z][A-Za-z0-9_-]*)\]/g, '$1')
    // Strip the table-letter suffix from sub-table names (e.g. "Potions-A" → "Potions")
    // but preserve it on root table names (e.g. "Magic-Item-Table-A" → "Magic Item Table A")
    .replace(/^(Magic-Item-Table)-([A-I])$/, '$1 $2')
    .replace(/-([A-I])$/, '')
    .replace(/-/g, ' ');
}

/** Replace the FIRST [Ref] in a template with a resolved name. */
export function substituteRef(template: string, resolvedName: string): string {
  return template.replace(REF_RE, resolvedName);
}

export type AppliedPick = {
  composedName: string;
  nextTable: string | null;
  finished: boolean;
};

/**
 * Apply a single pick to a composed name and return the new state.
 *
 *   - composedName starts as the picked entry's name (or substitutes the first
 *     [Ref] in the previous composed name with the picked entry's name).
 *   - We then walk past any unknown refs (substituting their cleaned literal),
 *     looking for the next ref that matches a known table.
 *   - If we find one, the stepper continues. Otherwise the chain is finished.
 */
export function applyPickPure(
  prevComposed: string | null,
  pickedName: string,
): AppliedPick {
  let composed =
    prevComposed == null ? pickedName : substituteRef(prevComposed, pickedName);

  // Walk past unknown refs while scanning for a known table.
  while (true) {
    const ref = extractRef(composed);
    if (!ref) {
      return { composedName: composed, nextTable: null, finished: true };
    }
    if (STEPPER_TABLES[ref]) {
      return { composedName: composed, nextTable: ref, finished: false };
    }
    // Unknown ref → treat as literal text and keep scanning.
    // eslint-disable-next-line no-console
    console.warn(`[stepper] Unknown table ref: ${ref}`);
    composed = substituteRef(composed, cleanDisplayName(ref));
  }
}

/**
 * Auto-resolve a full table chain starting from `rootTable` by repeatedly
 * weighted-picking and applying the result. Used by the stepper SKIP button
 * and by the encounter "Resolve All" button.
 *
 * `sourceSettings` is optional: when provided, entries are filtered by
 * per-book priority before every weightedPick.
 */
export function walkTableChain(
  rootTable: string,
  sourceSettings?: SourceSettings,
): {
  name: string;
  source: string;
  steps: StepRecord[];
} {
  const steps: StepRecord[] = [];
  let currentTable = rootTable;
  let composed: string | null = null;
  let lastSource = '';

  // Hard cap to defend against pathological data.
  for (let i = 0; i < 32; i++) {
    const entries =
      getFilteredStepperTable(currentTable, sourceSettings) ?? [];
    if (entries.length === 0) break;

    const picked = weightedPick(entries);
    const idx = entries.indexOf(picked);
    if (picked.source) lastSource = picked.source;

    steps.push({
      tableName: currentTable,
      pickedEntry: {
        name: picked.name,
        source: picked.source ?? '',
        weight: picked.weight,
      },
      pickedIdx: idx,
      rolledNumber: 0,
    });

    const result = applyPickPure(composed, picked.name);
    composed = result.composedName;
    if (result.finished || result.nextTable == null) {
      return { name: cleanDisplayName(composed), source: lastSource, steps };
    }
    currentTable = result.nextTable;
  }

  return {
    name: cleanDisplayName(composed ?? rootTable),
    source: lastSource,
    steps,
  };
}
