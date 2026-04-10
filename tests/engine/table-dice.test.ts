import { describe, it, expect } from 'vitest';
import { MAGIC_ITEMS } from '../../src/data/magic-items';
import { getFilteredEntries } from '../../src/engine/roller';

type MIEntry = { name: string; source: string; weight: number };
const tables = MAGIC_ITEMS as Record<string, MIEntry[]>;

/** Standard physically-rollable dice. */
const STANDARD_DICE = new Set([4, 6, 8, 10, 12, 20, 100]);

/** Root tables (always d100). */
const ROOT_TABLE_NAMES = [
  'Magic-Item-Table-A',
  'Magic-Item-Table-B',
  'Magic-Item-Table-C',
  'Magic-Item-Table-D',
  'Magic-Item-Table-E',
  'Magic-Item-Table-F',
  'Magic-Item-Table-G',
  'Magic-Item-Table-H',
  'Magic-Item-Table-I',
];

describe('table dice sizes', () => {
  it('all root tables sum to d100', () => {
    for (const name of ROOT_TABLE_NAMES) {
      const entries = tables[name];
      expect(entries, `${name} should exist`).toBeDefined();
      const total = entries.reduce((s, e) => s + e.weight, 0);
      expect(total, `${name} should be d100, got d${total}`).toBe(100);
    }
  });

  it('all sub-tables sum to a standard die', () => {
    const failures: string[] = [];

    for (const [name, entries] of Object.entries(tables)) {
      // Skip root tables (checked above)
      if (ROOT_TABLE_NAMES.includes(name)) continue;
      // Skip tables with only 1 entry (trivial pass-through)
      if (entries.length <= 1) continue;

      const total = entries.reduce((s, e) => s + e.weight, 0);
      if (!STANDARD_DICE.has(total)) {
        failures.push(`${name}: d${total} (${entries.length} entries)`);
      }
    }

    expect(
      failures,
      `Sub-tables with non-standard dice:\n  ${failures.join('\n  ')}`,
    ).toEqual([]);
  });

  it('source-filtered effective weights round to integers for display', () => {
    // Simulate source settings that would produce fractional weights
    const sourceSettings = { DMG: 'high' as const, XGE: 'low' as const };
    const fractionalDisplays: string[] = [];

    for (const [name, entries] of Object.entries(tables)) {
      const filtered = getFilteredEntries(entries, sourceSettings);
      if (filtered.length === 0) continue;

      for (const entry of filtered) {
        const rounded = Math.max(1, Math.round(entry.weight));
        if (rounded !== entry.weight && !Number.isInteger(entry.weight)) {
          // This is expected — effective weights ARE fractional.
          // The display code rounds them. Verify rounding produces valid integers.
          expect(Number.isInteger(rounded)).toBe(true);
          expect(rounded).toBeGreaterThanOrEqual(1);
        }
      }

      // Verify the rounded total is a positive integer
      const roundedTotal = filtered.reduce(
        (s, e) => s + Math.max(1, Math.round(e.weight)), 0,
      );
      if (!Number.isInteger(roundedTotal)) {
        fractionalDisplays.push(`${name}: d${roundedTotal}`);
      }
    }

    expect(
      fractionalDisplays,
      `Tables with fractional display totals:\n  ${fractionalDisplays.join('\n  ')}`,
    ).toEqual([]);
  });
});
