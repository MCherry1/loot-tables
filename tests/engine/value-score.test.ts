import { describe, it, expect } from 'vitest';
import {
  rollValueScore,
  calculateBuyPrice,
  calculateSalePrice,
} from '../../src/engine/value-score';

describe('rollValueScore', () => {
  it('always returns a value between 2 and 8', () => {
    for (let i = 0; i < 100; i++) {
      const score = rollValueScore();
      expect(score).toBeGreaterThanOrEqual(2);
      expect(score).toBeLessThanOrEqual(8);
    }
  });
});

describe('calculateBuyPrice', () => {
  it('table F, valueScore 6 → 600', () => {
    expect(calculateBuyPrice('F', 6)).toBe(600);
  });

  it('table G, valueScore 5 → 5000', () => {
    expect(calculateBuyPrice('G', 5)).toBe(5000);
  });
});

describe('calculateSalePrice', () => {
  it('table F, valueScore 6 → 300', () => {
    // floor(6/2) × 100 = 3 × 100
    expect(calculateSalePrice('F', 6)).toBe(300);
  });

  it('table G, valueScore 5 → 2000', () => {
    // floor(5/2) × 1000 = 2 × 1000
    expect(calculateSalePrice('G', 5)).toBe(2000);
  });
});
