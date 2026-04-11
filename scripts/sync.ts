#!/usr/bin/env tsx
/**
 * Sync item data from 5etools mirrors.
 *
 * This is the single command to keep your tables fresh when 5etools updates.
 *
 * What it does:
 *   1. Pulls latest data from 5etools git mirrors (2014 and/or 2024)
 *   2. Merges new items into curation files (auto-classified, ready-for-review)
 *   3. Regenerates item-stats JSON files (descriptions for result cards)
 *   4. Reports what changed
 *
 * Existing approved items are NEVER overwritten. Your reviewed weights are law.
 * New items appear in tables immediately with default weight=3 and status
 * "ready-for-review". You can review them in the admin UI at your leisure.
 *
 * Usage:
 *   npx tsx scripts/sync.ts                  # sync both editions
 *   npx tsx scripts/sync.ts --edition 2014   # sync only 2014
 *   npx tsx scripts/sync.ts --edition 2024   # sync only 2024
 *   npx tsx scripts/sync.ts --skip-pull      # skip git pull (use existing data)
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const EDITIONS: Record<string, {
  mirror: string;
  repoUrl: string;
  localPath: string;
  curation: string;
  itemStats: string;
}> = {
  '2014': {
    mirror: '5etools-2014-src',
    repoUrl: 'https://github.com/5etools-mirror-3/5etools-2014-src.git',
    localPath: resolve(ROOT, '5etools-mirror-3', '5etools-2014-src'),
    curation: resolve(ROOT, 'data', 'curation.json'),
    itemStats: resolve(ROOT, 'data', 'item-stats.json'),
  },
  '2024': {
    mirror: '5etools-src',
    repoUrl: 'https://github.com/5etools-mirror-3/5etools-src.git',
    localPath: resolve(ROOT, '5etools-mirror-3', '5etools-src'),
    curation: resolve(ROOT, 'data', 'curation-2024.json'),
    itemStats: resolve(ROOT, 'data', 'item-stats-2024.json'),
  },
};

function run(cmd: string, opts?: { cwd?: string }): string {
  console.log(`  $ ${cmd}`);
  return execSync(cmd, { encoding: 'utf-8', cwd: opts?.cwd, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function countJson(path: string): number {
  if (!existsSync(path)) return 0;
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  return Object.keys(data).length;
}

function syncEdition(edition: string, skipPull: boolean): void {
  const cfg = EDITIONS[edition];
  if (!cfg) {
    console.error(`Unknown edition: ${edition}`);
    return;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Syncing ${edition} edition`);
  console.log(`${'='.repeat(60)}`);

  // Step 1: Ensure 5etools repo exists and pull latest
  const mirrorDir = resolve(ROOT, '5etools-mirror-3');
  if (!existsSync(mirrorDir)) {
    run(`mkdir -p ${mirrorDir}`);
  }

  if (!existsSync(cfg.localPath)) {
    console.log(`\nCloning ${cfg.repoUrl}...`);
    run(`git clone --depth 1 ${cfg.repoUrl}`, { cwd: mirrorDir });
  } else if (!skipPull) {
    console.log(`\nPulling latest ${cfg.mirror}...`);
    try {
      run('git pull --depth 1', { cwd: cfg.localPath });
    } catch (e) {
      console.warn(`  Warning: git pull failed (offline?). Using existing data.`);
    }
  } else {
    console.log(`\nSkipping git pull (--skip-pull)`);
  }

  const itemsJson = resolve(cfg.localPath, 'data', 'items.json');
  if (!existsSync(itemsJson)) {
    console.error(`  Items file not found: ${itemsJson}`);
    console.error('  Is the 5etools mirror cloned correctly?');
    return;
  }

  // Step 2: Count items before
  const beforeCount = countJson(cfg.curation);

  // Step 3: Merge new items into curation
  console.log(`\nMerging new items into ${cfg.curation}...`);
  try {
    const mergeOutput = run(
      `npx tsx scripts/merge-curation.ts --items-json ${itemsJson} --output ${cfg.curation}`,
      { cwd: ROOT },
    );
    console.log(mergeOutput);
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string };
    if (err.stdout) console.log(err.stdout);
    if (err.stderr) console.error(err.stderr);
  }

  const afterCount = countJson(cfg.curation);
  const newItems = afterCount - beforeCount;

  // Step 4: Regenerate item stats
  console.log(`\nRegenerating ${cfg.itemStats}...`);
  try {
    const statsOutput = run(
      `npx tsx scripts/generate-item-stats.ts ${itemsJson} ${cfg.itemStats}`,
      { cwd: ROOT },
    );
    console.log(statsOutput);
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string };
    if (err.stdout) console.log(err.stdout);
    if (err.stderr) console.error(err.stderr);
  }

  // Step 5: Summary
  console.log(`\n${edition} sync complete:`);
  console.log(`  Curation: ${beforeCount} → ${afterCount} items (+${newItems} new)`);
  if (newItems > 0) {
    console.log(`  New items are live with default weight=3, status="ready-for-review"`);
    console.log(`  Review them in the admin UI to confirm weights and table assignments`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const editionIdx = args.indexOf('--edition');
const skipPull = args.includes('--skip-pull');

const editions = editionIdx !== -1 && args[editionIdx + 1]
  ? [args[editionIdx + 1]]
  : ['2014', '2024'];

console.log('5etools Sync Pipeline');
console.log(`Editions: ${editions.join(', ')}`);
console.log(`Skip pull: ${skipPull}`);

for (const edition of editions) {
  syncEdition(edition, skipPull);
}

console.log(`\n${'='.repeat(60)}`);
console.log('Done. Run `npm run build` to rebuild the app.');
console.log('New items will appear in the tables immediately.');
console.log(`${'='.repeat(60)}`);
