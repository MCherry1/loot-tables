import { describe, it, expect } from 'vitest';
import {
  rollGem,
  rollArt,
  applyJitter,
  GEM_QUALITY_LABELS,
  ORGANIC_GEMS,
} from '../../src/engine/roller';
import { CUSTOM_GEMS } from '../../src/data/gems';
import { CUSTOM_ART } from '../../src/data/art';

// Find a gem table that actually contains a given gem so we don't hit
// weight=0 entries in older tables.
function tableContaining(gem: string): string {
  const table = CUSTOM_GEMS.find((t) => t.entries.some((e) => e.name === gem));
  if (!table) throw new Error(`No gem table contains ${gem}`);
  return table.name;
}

describe('rollGem', () => {
  const table = CUSTOM_GEMS[2].name; // mid-tier, has variety

  it('returns a valueScore in 2-8', () => {
    for (let i = 0; i < 200; i++) {
      const gem = rollGem(table);
      expect(gem.valueScore).toBeGreaterThanOrEqual(2);
      expect(gem.valueScore).toBeLessThanOrEqual(8);
    }
  });

  it('returns a quality label matching the VS mapping', () => {
    for (let i = 0; i < 200; i++) {
      const gem = rollGem(table);
      expect(gem.quality).toBe(GEM_QUALITY_LABELS[gem.valueScore!]);
    }
  });

  it('flags Pearl as not improvable', () => {
    const pearlTable = tableContaining('Pearl');
    // Pearl appears alongside other gems, so loop until we hit one.
    let sawPearl = false;
    for (let i = 0; i < 500 && !sawPearl; i++) {
      const gem = rollGem(pearlTable);
      if (gem.name === 'Pearl') {
        expect(gem.improvable).toBe(false);
        sawPearl = true;
      }
    }
    expect(sawPearl).toBe(true);
  });

  it('flags Diamond as improvable', () => {
    const diamondTable = tableContaining('Diamond');
    let sawDiamond = false;
    for (let i = 0; i < 500 && !sawDiamond; i++) {
      const gem = rollGem(diamondTable);
      if (gem.name === 'Diamond') {
        expect(gem.improvable).toBe(true);
        sawDiamond = true;
      }
    }
    expect(sawDiamond).toBe(true);
  });

  it('throws on unknown table', () => {
    expect(() => rollGem('not-a-real-table')).toThrow();
  });
});

describe('rollArt', () => {
  const table = CUSTOM_ART[0].name;

  it('returns a valueScore in 2-8 with no quality or improvable fields', () => {
    for (let i = 0; i < 100; i++) {
      const art = rollArt(table);
      expect(art.valueScore).toBeGreaterThanOrEqual(2);
      expect(art.valueScore).toBeLessThanOrEqual(8);
      expect(art.quality).toBeUndefined();
      expect(art.improvable).toBeUndefined();
    }
  });
});

describe('applyJitter', () => {
  it('passes values below 100 through unchanged', () => {
    for (const v of [0, 1, 25, 50, 99]) {
      expect(applyJitter(v)).toBe(v);
    }
  });

  it('keeps values >=100 within +/-10%', () => {
    for (let i = 0; i < 500; i++) {
      const v = 1000;
      const jittered = applyJitter(v);
      expect(jittered).toBeGreaterThanOrEqual(Math.round(v * 0.9));
      expect(jittered).toBeLessThanOrEqual(Math.round(v * 1.1));
    }
  });

  it('produces variety (not always the same value)', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 100; i++) {
      seen.add(applyJitter(500));
    }
    // 500 with +/-10% jitter on continuous random should hit at least 5 unique values
    expect(seen.size).toBeGreaterThan(5);
  });
});

describe('ORGANIC_GEMS', () => {
  it('contains the five spec gems', () => {
    expect(ORGANIC_GEMS.has('Pearl')).toBe(true);
    expect(ORGANIC_GEMS.has('Black Pearl')).toBe(true);
    expect(ORGANIC_GEMS.has('Jet')).toBe(true);
    expect(ORGANIC_GEMS.has('Amber')).toBe(true);
    expect(ORGANIC_GEMS.has('Coral')).toBe(true);
  });

  it('does not contain mineral gems', () => {
    expect(ORGANIC_GEMS.has('Diamond')).toBe(false);
    expect(ORGANIC_GEMS.has('Ruby')).toBe(false);
  });
});
