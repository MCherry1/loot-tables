/**
 * Generate item-stats.json from 5etools items.json.
 * 
 * Extracts type, rarity, attunement, and truncated description
 * for use in the admin Review UI's item stats panel.
 *
 * Usage: npx tsx scripts/generate-item-stats.ts [path/to/items.json] [output-path]
 * Default input: 5etools-mirror-3/5etools-2014-src/data/items.json
 * Default output: data/item-stats.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_ITEMS_PATH = resolve(
  __dirname, '..', '5etools-mirror-3', '5etools-2014-src', 'data', 'items.json',
);

const DEFAULT_OUTPUT_PATH = resolve(__dirname, '..', 'data', 'item-stats.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip 5etools formatting tags: {@spell fireball} → fireball */
function stripTags(text: string): string {
  return text.replace(/\{@\w+\s+([^|}]+)[^}]*\}/g, '$1');
}

/** Flatten 5etools entries array to plain text. */
function flattenEntries(entries: unknown[]): string {
  const parts: string[] = [];

  for (const e of entries) {
    if (typeof e === 'string') {
      parts.push(stripTags(e));
    } else if (e && typeof e === 'object') {
      const obj = e as Record<string, unknown>;
      if (obj.type === 'entries' && Array.isArray(obj.entries)) {
        for (const sub of obj.entries) {
          if (typeof sub === 'string') {
            parts.push(stripTags(sub));
          } else if (sub && typeof sub === 'object') {
            const subObj = sub as Record<string, unknown>;
            if (subObj.type === 'list' && Array.isArray(subObj.items)) {
              for (const item of subObj.items as unknown[]) {
                if (typeof item === 'string') {
                  parts.push('• ' + stripTags(item));
                } else if (item && typeof item === 'object') {
                  const li = item as Record<string, unknown>;
                  if (li.type === 'item' && li.name) {
                    parts.push('• ' + stripTags(String(li.name)) + ': ' + stripTags(String(li.entry ?? '')));
                  }
                }
              }
            }
          }
        }
      } else if (obj.type === 'list' && Array.isArray(obj.items)) {
        for (const item of obj.items as unknown[]) {
          if (typeof item === 'string') {
            parts.push('• ' + stripTags(item));
          } else if (item && typeof item === 'object') {
            const li = item as Record<string, unknown>;
            if (li.type === 'item' && li.name) {
              parts.push('• ' + stripTags(String(li.name)) + ': ' + stripTags(String(li.entry ?? '')));
            }
          }
        }
      }
    }
  }

  return parts.join('\n\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const itemsPath = process.argv[2] ?? DEFAULT_ITEMS_PATH;
const OUTPUT_PATH = process.argv[3]
  ? resolve(process.argv[3])
  : DEFAULT_OUTPUT_PATH;
const variantsPath = resolve(dirname(itemsPath), 'magicvariants.json');

let rawData: { item: Array<Record<string, unknown>>; itemGroup?: Array<Record<string, unknown>> };
try {
  rawData = JSON.parse(readFileSync(itemsPath, 'utf-8'));
} catch (err) {
  console.error(`Failed to read items.json at: ${itemsPath}`);
  console.error('Provide path as argument: npx tsx scripts/generate-item-stats.ts path/to/items.json');
  process.exit(1);
}

const stats: Record<string, { type: string; rarity: string; attune: string; desc: string }> = {};

// 1. Regular items from items.json
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

  stats[key] = { type: String(item.type ?? ''), rarity, attune, desc };
}

// 2. Magic variants from magicvariants.json (Flame Tongue, Frost Brand, etc.)
try {
  const mvData = JSON.parse(readFileSync(variantsPath, 'utf-8')) as {
    magicvariant: Array<Record<string, unknown>>;
  };
  let variantCount = 0;
  for (const v of mvData.magicvariant) {
    const inherits = (v.inherits ?? {}) as Record<string, unknown>;
    const name = String(v.name ?? '');
    const source = String(inherits.source ?? v.source ?? '');
    if (!name || !source) continue;
    const key = `${name}|${source}`;
    if (stats[key]) continue;

    let attune = '';
    const req = inherits.reqAttune ?? v.reqAttune;
    if (req) attune = typeof req === 'string' ? req : 'true';

    const entries = (inherits.entries ?? v.entries ?? []) as unknown[];
    const desc = entries.length > 0 ? flattenEntries(entries) : '';
    const rarity = String(inherits.rarity ?? v.rarity ?? '');

    if (desc) {
      stats[key] = { type: String(inherits.type ?? ''), rarity, attune, desc };
      variantCount++;
    }
  }
  console.log(`  Magic variants added: ${variantCount}`);
} catch {
  console.log('  No magicvariants.json found (skipped)');
}

// 3. Item groups from items.json (Absorbing Tattoo, etc.)
let groupCount = 0;
for (const g of rawData.itemGroup ?? []) {
  const rarity = String(g.rarity ?? '');
  if (!rarity || ['none', 'unknown'].includes(rarity)) continue;
  const key = `${g.name}|${g.source}`;
  if (stats[key]) continue;

  let attune = '';
  if (g.reqAttune) attune = typeof g.reqAttune === 'string' ? g.reqAttune : 'true';

  const desc = Array.isArray(g.entries) ? flattenEntries(g.entries) : '';
  if (desc) {
    stats[key] = { type: String(g.type ?? ''), rarity, attune, desc };
    groupCount++;
  }
}
console.log(`  Item groups added: ${groupCount}`);

writeFileSync(OUTPUT_PATH, JSON.stringify(stats, null, 2) + '\n');
console.log(`Generated ${OUTPUT_PATH}`);
console.log(`  Items: ${Object.keys(stats).length}`);
console.log(`  Size: ${(readFileSync(OUTPUT_PATH).length / 1024).toFixed(0)} KB`);
