// ---------------------------------------------------------------------------
// Merge auto-classified items into curation.json.
//
// Reads the existing curation.json and a set of auto-classified items,
// merges them (existing approved entries win), and writes the result.
//
// Usage: tsx scripts/merge-curation.ts [--items-json path/to/items.json]
//
// If --items-json is not provided, only validates the existing curation.json.
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { CurationEntry, CurationFile } from './curation-types';
import { classify, type FiveToolsItem } from './auto-classify';
import { toCanonical, toLegacy } from './source-mapping';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CURATION_PATH = resolve(__dirname, '..', 'data', 'curation.json');

/** Resolved at startup from --output flag or default. */
let CURATION_PATH = DEFAULT_CURATION_PATH;

function loadCuration(): CurationFile {
  if (!existsSync(CURATION_PATH)) {
    // If output file doesn't exist yet, start with empty curation
    console.log(`No existing curation at ${CURATION_PATH} — starting fresh`);
    return {};
  }
  return JSON.parse(readFileSync(CURATION_PATH, 'utf-8')) as CurationFile;
}

function saveCuration(curation: CurationFile): void {
  writeFileSync(CURATION_PATH, JSON.stringify(curation, null, 2) + '\n');
}

/**
 * Merge auto-classified items from a 5etools items.json export.
 *
 * - Items already in curation with status "approved" are never overwritten.
 * - Items already in curation with status "ready-for-review" keep their
 *   existing classification (won't be re-classified).
 * - New items not in curation get auto-classified and added as "ready-for-review".
 */
function mergeItems(curation: CurationFile, items: FiveToolsItem[]): {
  added: number;
  skippedApproved: number;
  skippedExisting: number;
  excluded: number;
  failed: number;
} {
  let added = 0;
  let skippedApproved = 0;
  let skippedExisting = 0;
  let excluded = 0;
  let failed = 0;

  for (const rawItem of items) {
    // 5etools items arrive with canonical abbreviations.
    // Curation keys may use legacy abbreviations (from original Excel seed).
    // Try both when looking up existing entries.
    const canonicalKey = `${rawItem.name}|${rawItem.source}`;
    const legacyKey = `${rawItem.name}|${toLegacy(rawItem.source)}`;
    const item = rawItem; // source stays canonical

    // Skip if already in curation (check both key forms)
    const existing = curation[canonicalKey] ?? curation[legacyKey];
    if (existing) {
      if (existing.status === 'approved') {
        skippedApproved++;
      } else {
        skippedExisting++;
      }
      continue;
    }

    // Auto-classify
    const result = classify(item, curation);

    if (!result.classified) {
      console.warn(`  SKIP: ${canonicalKey} — ${result.reason}`);
      failed++;
      continue;
    }

    if (result.entry.status === 'excluded') {
      excluded++;
    } else {
      added++;
    }

    curation[canonicalKey] = result.entry;
  }

  return { added, skippedApproved, skippedExisting, excluded, failed };
}

function main(): void {
  const args = process.argv.slice(2);
  const itemsJsonIdx = args.indexOf('--items-json');
  const outputIdx = args.indexOf('--output');

  // Set output path before loading
  if (outputIdx !== -1 && args[outputIdx + 1]) {
    CURATION_PATH = resolve(args[outputIdx + 1]);
  }

  const curation = loadCuration();
  const existingCount = Object.keys(curation).length;
  console.log(`Loaded ${existingCount} existing entries from ${CURATION_PATH}`);

  if (itemsJsonIdx === -1 || !args[itemsJsonIdx + 1]) {
    // Validation only mode
    const byStatus: Record<string, number> = {};
    const byTable: Record<string, number> = {};
    for (const entry of Object.values(curation)) {
      byStatus[entry.status] = (byStatus[entry.status] || 0) + 1;
      byTable[entry.table] = (byTable[entry.table] || 0) + 1;
    }
    console.log('\nStatus breakdown:');
    for (const [status, count] of Object.entries(byStatus).sort()) {
      console.log(`  ${status}: ${count}`);
    }
    console.log('\nTable breakdown:');
    for (const [table, count] of Object.entries(byTable).sort()) {
      console.log(`  Table ${table}: ${count}`);
    }
    console.log('\nNo --items-json provided. Pass 5etools items.json to merge new items.');
    return;
  }

  const itemsPath = resolve(args[itemsJsonIdx + 1]);
  if (!existsSync(itemsPath)) {
    console.error(`Items file not found: ${itemsPath}`);
    process.exit(1);
  }

  console.log(`Reading items from ${itemsPath}...`);
  const rawData = JSON.parse(readFileSync(itemsPath, 'utf-8'));

  // 5etools items.json has { item: [...] } or is a flat array
  const items: FiveToolsItem[] = Array.isArray(rawData)
    ? rawData
    : (rawData.item ?? rawData.items ?? []);

  console.log(`Found ${items.length} items to process`);

  const stats = mergeItems(curation, items);

  console.log(`\nMerge results:`);
  console.log(`  New items added (ready-for-review): ${stats.added}`);
  console.log(`  Skipped (already approved): ${stats.skippedApproved}`);
  console.log(`  Skipped (already in curation): ${stats.skippedExisting}`);
  console.log(`  Excluded (cursed/artifact): ${stats.excluded}`);
  console.log(`  Failed to classify: ${stats.failed}`);

  saveCuration(curation);
  const newCount = Object.keys(curation).length;
  console.log(`\nSaved ${newCount} total entries to curation.json (+${newCount - existingCount} new)`);
}

main();
