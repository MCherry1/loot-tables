#!/usr/bin/env tsx
/**
 * Build-time encryption for item descriptions.
 *
 * Reads `data/item-stats.json` and `data/item-stats-2024.json` (generated
 * by `npm run sync`), splits each item into three tiers, and emits four
 * files under `public/data/`:
 *
 *   1. item-public.json            — non-copyrightable metadata for every
 *                                    item (type, rarity, attune, srd).
 *                                    No descriptions. Served to everyone.
 *
 *   2. item-srd-descriptions.json  — descriptions for items flagged as
 *                                    SRD (`srd: true`). Plaintext. Served
 *                                    to everyone under CC BY 4.0.
 *
 *   3. item-protected.enc          — AES-256-GCM ciphertext of the
 *                                    non-SRD descriptions map. Decryption
 *                                    requires the password provided via
 *                                    the CHERRYKEEP_PASSWORD env var.
 *
 *   4. item-protected.meta.json    — { salt, iv } (both base64) needed by
 *                                    the browser to derive the AES key.
 *
 * If the input data doesn't yet have the `srd` field (i.e. item-stats.json
 * was generated before the `generate-item-stats.ts` change that adds it),
 * every item with a description is treated as non-SRD and lands in the
 * protected tier. The SRD file is emitted as `{}`. This lets the auth
 * system ship and function today; once the user re-runs `npm run sync`
 * locally, the three-tier split activates automatically.
 *
 * Usage:
 *   CHERRYKEEP_PASSWORD=<password> npx tsx scripts/encrypt-descriptions.ts
 *
 * Env vars:
 *   CHERRYKEEP_PASSWORD  required; user-chosen password
 *
 * Output is committed to the repo. The encrypted blob is useless without
 * the password, so checking it in is safe.
 */

import * as crypto from 'crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// PBKDF2 + AES-GCM parameters. These MUST match src/web/lib/decrypt.ts.
const SALT_BYTES = 32;
const IV_BYTES = 12;
const KEY_ITERATIONS = 100_000;
const KEY_LENGTH = 32; // 256-bit key for AES-256
const HASH_ALGO = 'sha256';

type ItemStatsEntry = {
  type?: string;
  rarity?: string;
  attune?: string;
  desc?: string;
  srd?: boolean;
};

type ItemStatsMap = Record<string, ItemStatsEntry>;
type ItemPublicEntry = {
  type: string;
  rarity: string;
  attune: string;
  srd: boolean;
};
type ItemPublicMap = Record<string, ItemPublicEntry>;
type DescMap = Record<string, { desc: string }>;

function encryptJson(
  plaintext: string,
  password: string,
): { ciphertext: string; salt: string; iv: string } {
  const salt = crypto.randomBytes(SALT_BYTES);
  const iv = crypto.randomBytes(IV_BYTES);
  const key = crypto.pbkdf2Sync(
    password,
    salt,
    KEY_ITERATIONS,
    KEY_LENGTH,
    HASH_ALGO,
  );

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Web Crypto's AES-GCM expects ciphertext + tag concatenated in that
  // order. Node's createCipheriv keeps them separate, so join them here.
  return {
    ciphertext: Buffer.concat([encrypted, tag]).toString('base64'),
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
  };
}

function loadStats(path: string): ItemStatsMap {
  try {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as ItemStatsMap;
  } catch (err) {
    console.warn(
      `  ! could not read ${path}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return {};
  }
}

function splitEdition(stats: ItemStatsMap): {
  publicData: ItemPublicMap;
  srdDescs: DescMap;
  protectedDescs: DescMap;
} {
  const publicData: ItemPublicMap = {};
  const srdDescs: DescMap = {};
  const protectedDescs: DescMap = {};

  for (const [key, value] of Object.entries(stats)) {
    const isSrd = !!value.srd;
    publicData[key] = {
      type: value.type ?? '',
      rarity: value.rarity ?? '',
      attune: value.attune ?? '',
      srd: isSrd,
    };

    const desc = value.desc ?? '';
    if (!desc) continue;
    if (isSrd) {
      srdDescs[key] = { desc };
    } else {
      protectedDescs[key] = { desc };
    }
  }

  return { publicData, srdDescs, protectedDescs };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const password = process.env.CHERRYKEEP_PASSWORD;
if (!password) {
  console.error(
    'ERROR: CHERRYKEEP_PASSWORD env var is required.\n' +
      '       Example: CHERRYKEEP_PASSWORD=mysecret npx tsx scripts/encrypt-descriptions.ts',
  );
  process.exit(1);
}

console.log('Reading item-stats files...');
const stats2014 = loadStats(resolve(ROOT, 'data', 'item-stats.json'));
const stats2024 = loadStats(resolve(ROOT, 'data', 'item-stats-2024.json'));

console.log(
  `  2014: ${Object.keys(stats2014).length} items | 2024: ${
    Object.keys(stats2024).length
  } items`,
);

const split2014 = splitEdition(stats2014);
const split2024 = splitEdition(stats2024);

// Merge both editions into a single set of output files. Where both
// editions describe the same item, 2024 wins (it's the newer printing).
const publicData: ItemPublicMap = {
  ...split2014.publicData,
  ...split2024.publicData,
};
const srdDescs: DescMap = {
  ...split2014.srdDescs,
  ...split2024.srdDescs,
};
const protectedDescs: DescMap = {
  ...split2014.protectedDescs,
  ...split2024.protectedDescs,
};

console.log(
  `Split: public=${Object.keys(publicData).length} · srd=${
    Object.keys(srdDescs).length
  } · protected=${Object.keys(protectedDescs).length}`,
);

// Output directory
const outDir = resolve(ROOT, 'public', 'data');
mkdirSync(outDir, { recursive: true });

// 1. Public metadata (unencrypted, no descriptions)
writeFileSync(
  resolve(outDir, 'item-public.json'),
  JSON.stringify(publicData),
);
console.log('  wrote public/data/item-public.json');

// 2. SRD descriptions (unencrypted, CC BY 4.0)
writeFileSync(
  resolve(outDir, 'item-srd-descriptions.json'),
  JSON.stringify(srdDescs),
);
console.log('  wrote public/data/item-srd-descriptions.json');

// 3. Encrypted protected descriptions
const { ciphertext, salt, iv } = encryptJson(
  JSON.stringify(protectedDescs),
  password,
);
writeFileSync(resolve(outDir, 'item-protected.enc'), ciphertext);
writeFileSync(
  resolve(outDir, 'item-protected.meta.json'),
  JSON.stringify({ salt, iv }),
);
console.log('  wrote public/data/item-protected.enc');
console.log('  wrote public/data/item-protected.meta.json');

console.log('\nDone.');
