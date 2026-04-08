import { MAGIC_ITEMS } from '../data/magic-items';
import { SPELL_TABLES } from '../data/spells';
import { SUPPLEMENTAL_TABLES } from '../data/supplemental';
import { CUSTOM_GEMS } from '../data/gems';
import { CUSTOM_ART } from '../data/art';
import { cryptoRandom } from './random';
import type { MITable, TreasureItem, ItemSegment, ResolvableMagicItem } from './types';

type MIEntry = { name: string; source: string; weight: number };

/** Merge all table sources (magic items, spells, supplemental) into one lookup. */
function buildTableLookup(): Record<string, MIEntry[]> {
  const lookup = { ...(MAGIC_ITEMS as Record<string, MIEntry[]>) };
  for (const table of [...SPELL_TABLES, ...SUPPLEMENTAL_TABLES]) {
    lookup[table.name] = table.entries;
  }
  return lookup;
}

/** Unified lookup containing all rollable tables. */
export const ALL_TABLES = buildTableLookup();

/** Maximum recursion depth when resolving nested table references. */
const MAX_DEPTH = 5;

/** Regex matching a subtable reference like "[Potions-A]". */
const SUBTABLE_REF_RE = /\[([A-Za-z][A-Za-z0-9_-]*)\]/;

/**
 * Pick a random entry from a weighted table.
 * Entries must each have a numeric `weight` property.
 * Returns the selected entry.
 */
export function weightedPick<T extends { weight: number }>(entries: readonly T[]): T {
  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  let roll = cryptoRandom() * totalWeight;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  // Fallback (should not happen with valid weights).
  return entries[entries.length - 1];
}

/**
 * Resolve a magic item entry that may contain subtable references.
 * Recursively follows "[[ Nt[TableName] ]]" patterns up to MAX_DEPTH.
 */
function resolveEntry(
  entry: { name: string; source: string; weight: number },
  depth: number,
): { name: string; source: string } {
  if (depth >= MAX_DEPTH) return { name: entry.name, source: entry.source };

  const match = SUBTABLE_REF_RE.exec(entry.name);
  if (!match) return { name: entry.name, source: entry.source };

  const tableName = match[1];
  const subtable = ALL_TABLES[tableName];
  if (!subtable || subtable.length === 0) {
    return { name: entry.name, source: entry.source };
  }

  const picked = weightedPick(subtable);
  return resolveEntry(picked, depth + 1);
}

/**
 * Roll on a magic item table (A-I).
 *
 * 1. Looks up "Magic-Item-Table-{letter}" in MAGIC_ITEMS.
 * 2. Does a weighted pick.
 * 3. If the result references a subtable, recursively resolves it.
 * 4. Returns the final item name and source.
 */
export function rollMagicItem(table: MITable): { name: string; source: string } {
  const key = `Magic-Item-Table-${table}`;
  const entries = ALL_TABLES[key];
  if (!entries || entries.length === 0) {
    throw new Error(`Unknown magic item table: ${key}`);
  }

  const picked = weightedPick(entries);
  return resolveEntry(picked, 0);
}

/**
 * Roll on a gem table by name (e.g. "Gems-3-125-gp").
 * Looks up in CUSTOM_GEMS, does a weighted pick, returns the gem as a TreasureItem.
 */
export function rollGem(tableName: string): TreasureItem {
  const table = CUSTOM_GEMS.find((t) => t.name === tableName);
  if (!table) {
    throw new Error(`Unknown gem table: ${tableName}`);
  }

  const picked = weightedPick(table.entries);
  return { name: picked.name, baseValue: table.baseValue, tableName: table.name };
}

/**
 * Roll on an art table by name (e.g. "Art-2-500-gp").
 * Looks up in CUSTOM_ART, does a weighted pick, returns the art object as a TreasureItem.
 */
export function rollArt(tableName: string): TreasureItem {
  const table = CUSTOM_ART.find((t) => t.name === tableName);
  if (!table) {
    throw new Error(`Unknown art table: ${tableName}`);
  }

  const picked = weightedPick(table.entries);
  return { name: picked.name, baseValue: table.baseValue, tableName: table.name };
}

// ---------------------------------------------------------------------------
// V2: Segment-based resolution (step-by-step)
// ---------------------------------------------------------------------------

/** Global regex for splitting text into segments. */
const SUBTABLE_REF_GLOBAL = /\[([A-Za-z][A-Za-z0-9_-]*)\]/g;

let _segId = 0;
function nextSegId(): string {
  return `seg-${++_segId}`;
}

/**
 * Parse a text string into segments of plain text and unresolved table refs.
 * e.g. "[[ 1t[Armor] ]] of [[ 1t[Damage-Type] ]] Resistance"
 * -> [{ref:'Armor'}, {text:' of '}, {ref:'Damage-Type'}, {text:' Resistance'}]
 */
export function parseSegments(text: string): ItemSegment[] {
  const segments: ItemSegment[] = [];
  let lastIndex = 0;

  SUBTABLE_REF_GLOBAL.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SUBTABLE_REF_GLOBAL.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'ref', tableName: match[1], id: nextSegId() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}

/** Check whether a segments array has any remaining unresolved refs. */
export function hasUnresolvedRefs(segments: ItemSegment[]): boolean {
  return segments.some((s) => s.type === 'ref');
}

/** Flatten segments to a plain text string. */
export function segmentsToString(segments: ItemSegment[]): string {
  return segments
    .map((s) => (s.type === 'text' ? s.value : s.tableName))
    .join('');
}

/**
 * Resolve a single ref segment by ID.
 * Rolls on the named table, parses the result into new segments,
 * and splices them in place of the ref. Returns the updated array.
 */
export function resolveOneRef(segments: ItemSegment[], refId: string): { segments: ItemSegment[]; source: string } {
  const idx = segments.findIndex((s) => s.type === 'ref' && s.id === refId);
  if (idx === -1) return { segments, source: '' };

  const ref = segments[idx] as { type: 'ref'; tableName: string; id: string };
  const subtable = ALL_TABLES[ref.tableName];
  if (!subtable || subtable.length === 0) {
    // Can't resolve - replace ref with its table name as plain text
    const result = [...segments];
    result[idx] = { type: 'text', value: ref.tableName };
    return { segments: result, source: '' };
  }

  const picked = weightedPick(subtable);
  const newSegments = parseSegments(picked.name);

  const result = [...segments.slice(0, idx), ...newSegments, ...segments.slice(idx + 1)];
  return { segments: result, source: picked.source };
}

/**
 * Resolve ALL remaining refs in a segments array.
 * Iterates until no refs remain (with MAX_DEPTH guard).
 */
export function resolveAllRefs(segments: ItemSegment[]): { segments: ItemSegment[]; source: string } {
  let current = segments;
  let lastSource = '';

  for (let depth = 0; depth < MAX_DEPTH * 10; depth++) {
    const ref = current.find((s) => s.type === 'ref');
    if (!ref || ref.type !== 'ref') break;

    const result = resolveOneRef(current, ref.id);
    current = result.segments;
    if (result.source) lastSource = result.source;
  }

  return { segments: current, source: lastSource };
}

/**
 * Roll on a magic item table and return a ResolvableMagicItem.
 * The first-level roll is done, and segments are parsed but NOT recursively resolved.
 */
export function rollMagicItemResolvable(table: MITable): ResolvableMagicItem {
  const key = `Magic-Item-Table-${table}`;
  const entries = ALL_TABLES[key];
  if (!entries || entries.length === 0) {
    throw new Error(`Unknown magic item table: ${key}`);
  }

  const picked = weightedPick(entries);
  const segments = parseSegments(picked.name);

  return {
    segments,
    source: picked.source,
    table,
    isFullyResolved: !hasUnresolvedRefs(segments),
  };
}
