import { describe, it, expect } from 'vitest';
import { calculateBudget } from '../../src/engine/budget';
import { DEFAULT_CAMPAIGN_SETTINGS } from '../../src/engine/constants';

const settings = { ...DEFAULT_CAMPAIGN_SETTINGS };

describe('economy balance', () => {
  it('CR 4, Tier 1, Boss → roleBudget ≈ 191 gp', () => {
    const { roleBudget } = calculateBudget(4, 1, 'boss', settings);
    // 1100 × 0.29 × 0.60 = 191.4
    expect(roleBudget).toBeCloseTo(191.4, 0);
  });

  it('CR 4, Tier 2, Elite → roleBudget ≈ 192 gp', () => {
    const { roleBudget } = calculateBudget(4, 2, 'elite', settings);
    // 1100 × 0.5806 × 0.30 = 191.598
    expect(roleBudget).toBeCloseTo(191.6, 0);
  });

  it('Tier 1 Boss and Tier 2 Elite at CR 4 are within 5% of each other', () => {
    const boss = calculateBudget(4, 1, 'boss', settings).roleBudget;
    const elite = calculateBudget(4, 2, 'elite', settings).roleBudget;
    const ratio = boss / elite;
    expect(ratio).toBeGreaterThan(0.95);
    expect(ratio).toBeLessThan(1.05);
  });
});
