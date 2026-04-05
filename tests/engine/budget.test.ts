import { describe, it, expect } from 'vitest';
import { calculateBudget } from '../../src/engine/budget';
import { DEFAULT_CAMPAIGN_SETTINGS } from '../../src/engine/constants';

const settings = { ...DEFAULT_CAMPAIGN_SETTINGS };

describe('calculateBudget', () => {
  it('CR 5, Tier 2, Boss → fullBudget ≈ 1045, roleBudget ≈ 627', () => {
    const { fullBudget, roleBudget } = calculateBudget(5, 2, 'boss', settings);
    // 1800 × 0.5806 = 1045.08
    expect(fullBudget).toBeCloseTo(1045.08, 0);
    // 1045.08 × 0.60 = 627.048
    expect(roleBudget).toBeCloseTo(627.05, 0);
  });

  it('CR 5, Tier 2, Elite → roleBudget ≈ 314', () => {
    const { roleBudget } = calculateBudget(5, 2, 'elite', settings);
    // 1045.08 × 0.30 = 313.524
    expect(roleBudget).toBeCloseTo(313.52, 0);
  });

  it('CR 5, Tier 2, Minion → roleBudget ≈ 105', () => {
    const { roleBudget } = calculateBudget(5, 2, 'minion', settings);
    // 1045.08 × 0.10 = 104.508
    expect(roleBudget).toBeCloseTo(104.51, 0);
  });

  it('CR 5, Tier 2, Vault → roleBudget ≈ 1045', () => {
    const { roleBudget } = calculateBudget(5, 2, 'vault', settings);
    expect(roleBudget).toBeCloseTo(1045.08, 0);
  });

  it('CR 0, Tier 1, Minion → very small budget', () => {
    const { roleBudget } = calculateBudget(0, 1, 'minion', settings);
    // 10 × 0.29 × 0.10 = 0.29
    expect(roleBudget).toBeCloseTo(0.29, 2);
    expect(roleBudget).toBeLessThan(1);
  });

  it('CR 30, Tier 4, Vault → very large budget', () => {
    const { roleBudget } = calculateBudget(30, 4, 'vault', settings);
    // 155000 × 8.8814 × 1.00 = 1,376,617
    expect(roleBudget).toBeGreaterThan(1_000_000);
  });

  it('party size 6 → budget is 4/6 of default', () => {
    const settings6 = { ...settings, partySize: 6 };
    const base = calculateBudget(5, 2, 'boss', settings);
    const scaled = calculateBudget(5, 2, 'boss', settings6);
    expect(scaled.fullBudget).toBeCloseTo(base.fullBudget * (4 / 6), 2);
  });

  it('fractional CR 0.125 works', () => {
    const { fullBudget } = calculateBudget(0.125, 1, 'boss', settings);
    // 25 × 0.29 = 7.25
    expect(fullBudget).toBeCloseTo(7.25, 2);
  });

  it('fractional CR 0.25 works', () => {
    const { fullBudget } = calculateBudget(0.25, 1, 'boss', settings);
    // 50 × 0.29 = 14.5
    expect(fullBudget).toBeCloseTo(14.5, 2);
  });

  it('fractional CR 0.5 works', () => {
    const { fullBudget } = calculateBudget(0.5, 1, 'boss', settings);
    // 100 × 0.29 = 29
    expect(fullBudget).toBeCloseTo(29, 2);
  });
});
