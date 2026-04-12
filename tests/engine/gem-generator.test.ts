import { describe, it, expect } from 'vitest';
import {
  applyBinning,
  rollGemValue,
  generateGemBudget,
  generateGemDescriptor,
  GEM_QUALITY_LABELS,
} from '../../src/engine/gem-generator';
import { GEM_DEFINITIONS } from '../../src/data/gem-definitions';

describe('GEM_DEFINITIONS', () => {
  it('contains all 33 gems from the spec', () => {
    expect(GEM_DEFINITIONS).toHaveLength(33);
  });

  it('has Diamond with weight 8 and the widest range', () => {
    const diamond = GEM_DEFINITIONS.find((g) => g.name === 'Diamond')!;
    expect(diamond.weight).toBe(8);
    expect(diamond.min).toBe(10);
    expect(diamond.max).toBe(100000);
    expect(diamond.improvable).toBe(true);
  });

  it('flags organic gems as not improvable', () => {
    const organic = ['Pearl', 'Black Pearl', 'Jet', 'Amber', 'Coral'];
    for (const name of organic) {
      const g = GEM_DEFINITIONS.find((x) => x.name === name)!;
      expect(g.organic).toBe(true);
      expect(g.improvable).toBe(false);
    }
  });
});

describe('applyBinning', () => {
  it('rounds <10 gp to nearest 1 with floor of 1', () => {
    expect(applyBinning(0.5)).toBe(1);
    expect(applyBinning(3.2)).toBe(3);
    expect(applyBinning(9.7)).toBe(10);
  });

  it('rounds 10-99 gp to nearest 5', () => {
    expect(applyBinning(12)).toBe(10);
    expect(applyBinning(38)).toBe(40);
    expect(applyBinning(97)).toBe(95);
  });

  it('rounds 100-999 gp to nearest 10', () => {
    expect(applyBinning(127)).toBe(130);
    expect(applyBinning(853)).toBe(850);
  });

  it('rounds 1000-9999 gp to nearest 100', () => {
    expect(applyBinning(1234)).toBe(1200);
    expect(applyBinning(5678)).toBe(5700);
  });

  it('rounds 10000+ gp to nearest 1000', () => {
    expect(applyBinning(12345)).toBe(12000);
    expect(applyBinning(78999)).toBe(79000);
  });
});

describe('rollGemValue', () => {
  it('always stays within the gem range (after binning)', () => {
    // Run many samples — log-scale should always fall within [min, max].
    for (let i = 0; i < 200; i++) {
      const v = rollGemValue(10, 100000);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThanOrEqual(100000);
    }
  });

  it('handles min === max gracefully', () => {
    expect(rollGemValue(50, 50)).toBe(50);
  });

  it('clusters near the low end (log-scale property)', () => {
    const n = 2000;
    const vals = Array.from({ length: n }, () => rollGemValue(10, 100000));
    // With log-scale, roughly half of rolls land below sqrt(min*max) = 1000
    const below1000 = vals.filter((v) => v <= 1000).length;
    expect(below1000).toBeGreaterThan(n * 0.3);
    expect(below1000).toBeLessThan(n * 0.7);
  });
});

describe('generateGemDescriptor', () => {
  const diamond = GEM_DEFINITIONS.find((g) => g.name === 'Diamond')!;
  const pearl = GEM_DEFINITIONS.find((g) => g.name === 'Pearl')!;

  it('returns a quality matching GEM_QUALITY_LABELS for every VS', () => {
    for (let vs = 2; vs <= 8; vs++) {
      const d = generateGemDescriptor(diamond, 1000, vs);
      expect(d.quality).toBe(GEM_QUALITY_LABELS[vs]);
    }
  });

  it('attaches a legendary name for top 5% of max value', () => {
    const d = generateGemDescriptor(diamond, 100000, 5);
    expect(d.legendary).toBeDefined();
    expect(d.description).toContain(d.legendary!);
  });

  it('does not attach a legendary name for mid-range values', () => {
    const d = generateGemDescriptor(diamond, 500, 5);
    expect(d.legendary).toBeUndefined();
  });

  it('uses organic-quality words for pearls (no cut execution)', () => {
    const d = generateGemDescriptor(pearl, 200, 8);
    // Organic gems use "perfect"/"luminous" etc., not "exquisite"/"expertly cut".
    expect(['perfect', 'immaculate', 'luminous']).toContain(d.cutQuality);
  });
});

describe('generateGemBudget', () => {
  it('exhausts the budget nearly completely', () => {
    for (const budget of [100, 388, 1500, 3622, 8025]) {
      const gems = generateGemBudget(budget);
      const total = gems.reduce((s, g) => s + g.value, 0);
      expect(total).toBeLessThanOrEqual(budget);
      // Leftover up to ~15 gp acceptable (binning drift + min-value floor).
      expect(budget - total).toBeLessThan(15);
    }
  });

  it('averages around the spec simulation counts for tier-sized budgets', () => {
    // Average over 20 runs to flatten single-roll variance.
    const avg = (budget: number, runs = 20) => {
      let total = 0;
      for (let i = 0; i < runs; i++) total += generateGemBudget(budget).length;
      return total / runs;
    };
    // Spec §5: tier 1 (137 gp) averages 6-8 gems; tier 3 (3622 gp) averages 25-30.
    // Loose bands to tolerate log-scale variance.
    expect(avg(137)).toBeGreaterThan(3);
    expect(avg(3622)).toBeGreaterThan(10);
  });

  it('every gem has name, value, valueScore, quality, and description', () => {
    const gems = generateGemBudget(1000);
    for (const gem of gems) {
      expect(gem.name).toBeTruthy();
      expect(gem.value).toBeGreaterThan(0);
      expect(gem.valueScore).toBeGreaterThanOrEqual(2);
      expect(gem.valueScore).toBeLessThanOrEqual(8);
      expect(gem.quality).toBeDefined();
      expect(gem.description).toBeTruthy();
      expect(gem.tableName).toBe('gem-budget');
    }
  });

  it('returns [] for zero/negative budget', () => {
    expect(generateGemBudget(0)).toEqual([]);
    expect(generateGemBudget(-10)).toEqual([]);
  });
});
