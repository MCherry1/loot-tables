/**
 * Generate curation-2024.json by running auto-classify against 5etools 2024 items.
 *
 * Unlike the 2014 pipeline (seeded from hand-curated magic-items.ts), the 2024
 * pipeline trusts auto-classification entirely — all items are marked "approved".
 *
 * Usage: npx tsx scripts/seed-curation-2024.ts [path/to/items.json]
 * Default: 5etools-src/data/items.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { classify } from './auto-classify';
import type { CurationFile } from './curation-types';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_ITEMS_PATH = resolve(
  __dirname, '..', '5etools-src', 'data', 'items.json',
);
const OUTPUT_PATH = resolve(__dirname, '..', 'data', 'curation-2024.json');

const itemsPath = process.argv[2] ?? DEFAULT_ITEMS_PATH;

let rawData: { item: Array<Record<string, unknown>> };
try {
  rawData = JSON.parse(readFileSync(itemsPath, 'utf-8'));
} catch {
  console.error(`Failed to read items.json at: ${itemsPath}`);
  process.exit(1);
}

const curation: CurationFile = {};
let classified = 0;
let skipped = 0;
let excluded = 0;

for (const item of rawData.item) {
  const result = classify(item as Parameters<typeof classify>[0]);

  if (result.classified) {
    const name = String(item.name ?? '');
    const source = String(item.source ?? '');
    const key = `${name}|${source}`;

    // For 2024, mark everything as approved (auto-classify is trusted)
    const entry = { ...result.entry, status: 'approved' as const };

    // Use default weight of 3 for items without one
    if (entry.weight == null) entry.weight = 3;

    curation[key] = entry;

    if (entry.status === 'excluded') excluded++;
    else classified++;
  } else {
    skipped++;
  }
}

writeFileSync(OUTPUT_PATH, JSON.stringify(curation, null, 2) + '\n');
console.log(`Generated ${OUTPUT_PATH}`);
console.log(`  Classified: ${classified}`);
console.log(`  Excluded: ${excluded}`);
console.log(`  Skipped: ${skipped}`);
console.log(`  Total entries: ${Object.keys(curation).length}`);

// Summary by table
const byTable: Record<string, number> = {};
for (const entry of Object.values(curation)) {
  if (entry.status !== 'excluded') {
    byTable[entry.table] = (byTable[entry.table] || 0) + 1;
  }
}
for (const [letter, n] of Object.entries(byTable).sort()) {
  console.log(`  Table ${letter}: ${n}`);
}
