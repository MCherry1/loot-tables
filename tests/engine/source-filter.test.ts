import { describe, it, expect } from 'vitest';
import {
  getEffectiveWeight,
  getFilteredEntries,
  getBookItemCounts,
  getBookDampFactors,
  weightToTier,
  TIER_VALUE,
  PRIORITY_MULTIPLIER,
} from '../../src/engine';

describe('weightToTier', () => {
  it('maps raw weight 1 to low', () => {
    expect(weightToTier(1)).toBe('low');
  });

  it('maps raw weight 2 to mid', () => {
    expect(weightToTier(2)).toBe('mid');
  });

  it('maps raw weights 3 and 4 to high', () => {
    expect(weightToTier(3)).toBe('high');
    expect(weightToTier(4)).toBe('high');
  });

  it('maps weight 5 and up to veryHigh', () => {
    expect(weightToTier(5)).toBe('veryHigh');
    expect(weightToTier(10)).toBe('veryHigh');
    expect(weightToTier(999)).toBe('veryHigh');
  });

  it('maps weight 0 to low (clamped)', () => {
    expect(weightToTier(0)).toBe('low');
  });
});

describe('getEffectiveWeight', () => {
  it('passes through structural entries (empty source) unchanged', () => {
    expect(
      getEffectiveWeight({ name: '[Armor]', source: '', weight: 5 }, {}),
    ).toBe(5);
    // Even when the priority map has entries, empty-source is ignored.
    expect(
      getEffectiveWeight(
        { name: '[Weapons]', source: '', weight: 12 },
        { DMG: 'off' },
      ),
    ).toBe(12);
  });

  it('returns 0 for an "off" source', () => {
    expect(
      getEffectiveWeight(
        { name: 'Longsword +1', source: 'DMG', weight: 1 },
        { DMG: 'off' },
      ),
    ).toBe(0);
  });

  it('applies tierValue × priority × damp at normal priority', () => {
    const damp = getBookDampFactors()['DMG'] ?? 1.0;
    const expected =
      TIER_VALUE.mid * PRIORITY_MULTIPLIER.normal * damp;
    expect(
      getEffectiveWeight(
        { name: 'Test', source: 'DMG', weight: 2 },
        {},
      ),
    ).toBeCloseTo(expected, 8);
  });

  it('honors higher priorities as a multiplier on tier value', () => {
    const normal = getEffectiveWeight(
      { name: 'Test', source: 'DMG', weight: 3 },
      {},
    );
    const emphasis = getEffectiveWeight(
      { name: 'Test', source: 'DMG', weight: 3 },
      { DMG: 'emphasis' },
    );
    // 'emphasis' is 2.0 vs 'normal' 1.0 — ratio is exactly 2.
    expect(emphasis / normal).toBeCloseTo(2, 8);
  });
});

describe('getFilteredEntries', () => {
  const sample = [
    { name: 'A', source: 'DMG', weight: 2 },
    { name: 'B', source: 'XGE', weight: 1 },
    { name: '[Ref]', source: '', weight: 7 },
  ];

  it('returns the entries untouched when sourceSettings is undefined', () => {
    const out = getFilteredEntries(sample);
    expect(out).toHaveLength(3);
    expect(out[0].weight).toBe(2);
    expect(out[1].weight).toBe(1);
    expect(out[2].weight).toBe(7);
  });

  it('drops zero-weight entries when a source is off', () => {
    const out = getFilteredEntries(sample, { DMG: 'off' });
    expect(out).toHaveLength(2);
    expect(out.find((e) => e.name === 'A')).toBeUndefined();
  });

  it('preserves structural refs even when all named sources are off', () => {
    const out = getFilteredEntries(sample, {
      DMG: 'off',
      XGE: 'off',
    });
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('[Ref]');
    expect(out[0].weight).toBe(7);
  });
});

describe('book item counts and damp factors', () => {
  it('reports a nontrivial number of entries for DMG', () => {
    const counts = getBookItemCounts();
    expect(counts.DMG).toBeGreaterThan(50);
  });

  it('damp factor is clamped to [0.4, 1.5]', () => {
    const damps = getBookDampFactors();
    for (const v of Object.values(damps)) {
      expect(v).toBeGreaterThanOrEqual(0.4);
      expect(v).toBeLessThanOrEqual(1.5);
    }
  });
});
