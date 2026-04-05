import { MAGIC_ITEMS } from '../data/magic-items';
import { CUSTOM_GEMS } from '../data/gems';
import { CUSTOM_ART } from '../data/art';
import type { MITable, TreasureItem } from './types';

type MIEntry = { name: string; source: string; weight: number };
const MI = MAGIC_ITEMS as Record<string, MIEntry[]>;

/** Maximum recursion depth when resolving nested table references. */
const MAX_DEPTH = 5;

/** Regex matching a subtable reference like "[[ 1t[Potions-A] ]]". */
const SUBTABLE_REF_RE = /\[\[\s*(\d*)t\[([^\]]+)\]\s*\]\]/;

/**
 * Pick a random entry from a weighted table.
 * Entries must each have a numeric `weight` property.
 * Returns the selected entry.
 */
export function weightedPick<T extends { weight: number }>(entries: readonly T[]): T {
  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
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

  const tableName = match[2];
  const subtable = MI[tableName];
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
  const entries = MI[key];
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
