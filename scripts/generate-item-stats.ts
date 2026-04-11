/**
 * Generate item-stats.json from 5etools items.json.
 * 
 * Extracts type, rarity, attunement, and truncated description
 * for use in the admin Review UI's item stats panel.
 *
 * Usage: npx tsx scripts/generate-item-stats.ts [path/to/items.json]
 * Default: 5etools-mirror-3/5etools-2014-src/data/items.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_ITEMS_PATH = resolve(
  __dirname, '..', '5etools-mirror-3', '5etools-2014-src', 'data', 'items.json',
);

const OUTPUT_PATH = resolve(__dirname, '..', 'data', 'item-stats.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip 5etools formatting tags: {@spell fireball} → fireball */
function stripTags(text: string): string {
  return text.replace(/\{@\w+\s+([^|}]+)[^}]*\}/g, '$1');
}

/** Flatten 5etools entries array to plain text, truncated. */
function flattenEntries(entries: unknown[], maxLen = 300): string {
  const parts: string[] = [];

  for (const e of entries) {
    if (typeof e === 'string') {
      parts.push(stripTags(e));
    } else if (e && typeof e === 'object') {
      const obj = e as Record<string, unknown>;
      if (obj.type === 'entries' && Array.isArray(obj.entries)) {
        for (const sub of obj.entries) {
          if (typeof sub === 'string') parts.push(stripTags(sub));
        }
      } else if (obj.type === 'list' && Array.isArray(obj.items)) {
        for (const item of (obj.items as unknown[]).slice(0, 3)) {
          if (typeof item === 'string') parts.push(stripTags(item));
        }
      }
    }
  }

  let text = parts.join(' ');
  if (text.length > maxLen) {
    text = text.slice(0, maxLen).replace(/\s+\S*$/, '') + '...';
  }
  return text;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const itemsPath = process.argv[2] ?? DEFAULT_ITEMS_PATH;

let rawData: { item: Array<Record<string, unknown>> };
try {
  rawData = JSON.parse(readFileSync(itemsPath, 'utf-8'));
} catch (err) {
  console.error(`Failed to read items.json at: ${itemsPath}`);
  console.error('Provide path as argument: npx tsx scripts/generate-item-stats.ts path/to/items.json');
  process.exit(1);
}

const stats: Record<string, { type: string; rarity: string; attune: string; desc: string }> = {};

for (const item of rawData.item) {
  const rarity = String(item.rarity ?? '');
  if (!rarity || ['none', 'unknown', 'unknown (magic)'].includes(rarity)) continue;

  const name = String(item.name ?? '');
  const source = String(item.source ?? '');
  const key = `${name}|${source}`;

  let attune = '';
  if (item.reqAttune) {
    attune = typeof item.reqAttune === 'string' ? item.reqAttune : 'true';
  }

  let desc = '';
  if (Array.isArray(item.entries)) {
    desc = flattenEntries(item.entries);
  }

  stats[key] = {
    type: String(item.type ?? ''),
    rarity,
    attune,
    desc,
  };
}

writeFileSync(OUTPUT_PATH, JSON.stringify(stats, null, 2) + '\n');
console.log(`Generated ${OUTPUT_PATH}`);
console.log(`  Items: ${Object.keys(stats).length}`);
console.log(`  Size: ${(readFileSync(OUTPUT_PATH).length / 1024).toFixed(0)} KB`);
