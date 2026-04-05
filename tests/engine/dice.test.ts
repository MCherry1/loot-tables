import { describe, it, expect } from 'vitest';
import { gpToDiceFormula, evalDiceFormula } from '../../src/engine/dice';

describe('gpToDiceFormula', () => {
  it('target 0.5 → formula "0", average 0', () => {
    const result = gpToDiceFormula(0.5);
    expect(result.formula).toBe('0');
    expect(result.average).toBe(0);
  });

  it('target 5 → average near 5', () => {
    const result = gpToDiceFormula(5);
    expect(result.average).toBeCloseTo(5, 0);
    expect(result.formula).toMatch(/^\d+d\d+$/);
  });

  it('target 140 → formula with ×100, average in right ballpark', () => {
    const result = gpToDiceFormula(140);
    expect(result.formula).toContain('\u00d7100');
    // Dice granularity means the average won't be exact; verify same order of magnitude
    expect(result.average).toBeGreaterThanOrEqual(100);
    expect(result.average).toBeLessThanOrEqual(500);
  });

  it('target 3500 → formula with ×1000, average near 3500', () => {
    const result = gpToDiceFormula(3500);
    expect(result.formula).toContain('\u00d71000');
    expect(result.average).toBeCloseTo(3500, -2);
  });
});

describe('evalDiceFormula', () => {
  it('"4d6" → result between 4 and 24', () => {
    for (let i = 0; i < 50; i++) {
      const result = evalDiceFormula('4d6');
      expect(result).toBeGreaterThanOrEqual(4);
      expect(result).toBeLessThanOrEqual(24);
    }
  });

  it('"2d6×10" → result between 20 and 120', () => {
    for (let i = 0; i < 50; i++) {
      const result = evalDiceFormula('2d6\u00d710');
      expect(result).toBeGreaterThanOrEqual(20);
      expect(result).toBeLessThanOrEqual(120);
    }
  });

  it('"0" → 0', () => {
    expect(evalDiceFormula('0')).toBe(0);
  });
});
