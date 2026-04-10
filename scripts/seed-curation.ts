// ---------------------------------------------------------------------------
// Seed curation.json from the existing magic-items.ts table data.
//
// Walks each table (A-I) and its sub-tables, extracting terminal items
// into CurationEntry records with status "approved".
// ---------------------------------------------------------------------------

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { CurationEntry, CurationFile } from './curation-types';

// Import the compiled table data.
import { MAGIC_ITEMS } from '../src/data/magic-items';

const __dirname = dirname(fileURLToPath(import.meta.url));

type MIEntry = { name: string; source: string; weight: number };
type Tables = Record<string, MIEntry[]>;

const tables = MAGIC_ITEMS as Tables;

// Root table names → table letter
const ROOT_TABLES: Record<string, string> = {
  'Magic-Item-Table-A': 'A',
  'Magic-Item-Table-B': 'B',
  'Magic-Item-Table-C': 'C',
  'Magic-Item-Table-D': 'D',
  'Magic-Item-Table-E': 'E',
  'Magic-Item-Table-F': 'F',
  'Magic-Item-Table-G': 'G',
  'Magic-Item-Table-H': 'H',
  'Magic-Item-Table-I': 'I',
};

/** Extract [Ref] names from an item name. */
const REF_RE = /\[([A-Za-z][A-Za-z0-9_-]*)\]/g;

function extractRefs(name: string): string[] {
  const refs: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = REF_RE.exec(name)) !== null) {
    refs.push(m[1]);
  }
  return refs;
}

/** Strip the table-letter suffix from a category name (e.g. "Potions-A" → "Potions"). */
function cleanCategory(categorySubtable: string, tableLetter: string): string {
  const suffix = `-${tableLetter}`;
  if (categorySubtable.endsWith(suffix)) {
    return categorySubtable.slice(0, -suffix.length);
  }
  return categorySubtable;
}

/** Check if an entry is a structural reference to a sub-table (empty source, name is [Ref]). */
function isStructuralRef(entry: MIEntry): boolean {
  return entry.source === '' && entry.name.startsWith('[') && entry.name.endsWith(']');
}

/** Extract the sub-table name from a structural ref like "[Potions-A]". */
function getRefTable(entry: MIEntry): string | null {
  if (!isStructuralRef(entry)) return null;
  const m = /^\[([A-Za-z][A-Za-z0-9_-]*)\]$/.exec(entry.name);
  return m ? m[1] : null;
}

/**
 * Recursively walk a sub-table, collecting terminal items.
 * Terminal items are those with a non-empty source, or items whose [Ref]
 * targets don't exist as table keys (they're resolution refs like [Swords]).
 */
function collectItems(
  subtableName: string,
  tableLetter: string,
  category: string,
  curation: CurationFile,
  visited: Set<string>,
): void {
  if (visited.has(subtableName)) return;
  visited.add(subtableName);

  const entries = tables[subtableName];
  if (!entries) return;

  for (const entry of entries) {
    const refTable = getRefTable(entry);

    if (refTable && tables[refTable]) {
      // This is a structural ref to another sub-table — recurse.
      // The child sub-table inherits the same category.
      collectItems(refTable, tableLetter, category, curation, visited);
    } else {
      // Terminal item: has a source, or is a composed name with unresolvable refs.
      // Items with empty source but containing refs like "[Weapons]" are terminal
      // entries that resolve at roll time.
      const source = entry.source || '';
      const key = `${entry.name}|${source}`;

      // Skip if already seen (can happen with shared sub-tables).
      if (curation[key]) continue;

      const refs = extractRefs(entry.name);

      const curationEntry: CurationEntry = {
        table: tableLetter as CurationEntry['table'],
        category,
        weight: entry.weight,
        status: 'approved',
      };

      if (refs.length > 0) {
        curationEntry.refs = refs;
      }

      curation[key] = curationEntry;
    }
  }
}

function main(): void {
  const curation: CurationFile = {};

  for (const [rootName, letter] of Object.entries(ROOT_TABLES)) {
    const rootEntries = tables[rootName];
    if (!rootEntries) {
      console.warn(`Root table ${rootName} not found in data`);
      continue;
    }

    for (const entry of rootEntries) {
      const refTable = getRefTable(entry);

      if (refTable && tables[refTable]) {
        // Category sub-table: derive category name from the sub-table name.
        const category = cleanCategory(refTable, letter);
        const visited = new Set<string>();
        collectItems(refTable, letter, category, curation, visited);
      } else {
        // Direct terminal item on the root table (rare — e.g. Bag of Holding on Original-DMG-A).
        const source = entry.source || '';
        const key = `${entry.name}|${source}`;

        if (!curation[key]) {
          const refs = extractRefs(entry.name);
          const curationEntry: CurationEntry = {
            table: letter as CurationEntry['table'],
            category: 'Root',
            weight: entry.weight,
            status: 'approved',
          };
          if (refs.length > 0) curationEntry.refs = refs;
          curation[key] = curationEntry;
        }
      }
    }
  }

  const count = Object.keys(curation).length;
  const outPath = resolve(__dirname, '..', 'data', 'curation.json');
  writeFileSync(outPath, JSON.stringify(curation, null, 2) + '\n');
  console.log(`Seeded ${count} items to ${outPath}`);

  // Summary by table
  const byTable: Record<string, number> = {};
  for (const entry of Object.values(curation)) {
    byTable[entry.table] = (byTable[entry.table] || 0) + 1;
  }
  for (const [letter, n] of Object.entries(byTable).sort()) {
    console.log(`  Table ${letter}: ${n} items`);
  }
}

main();
