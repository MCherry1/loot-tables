import { describe, it, expect } from 'vitest';
import { calculateBudget } from '../../src/engine/budget';
import { DEFAULT_CAMPAIGN_SETTINGS, computeRoleMultipliers } from '../../src/engine/constants';

const settings = { ...DEFAULT_CAMPAIGN_SETTINGS };

// Pre-compute the concentration=3.0 multipliers for use in assertions.
const mults = computeRoleMultipliers(3.0);

describe('calculateBudget', () => {
  it('CR 5, Tier 2, Boss → fullBudget ≈ 1045', () => {
    const { fullBudget, roleBudget } = calculateBudget(5, 2, 'boss', settings);
    // 1800 × 0.5806 = 1045.08
    expect(fullBudget).toBeCloseTo(1045.08, 0);
    // 1045.08 × bossMultiplier (concentration=3)
    expect(roleBudget).toBeCloseTo(1045.08 * mults.boss, 0);
  });

  it('CR 5, Tier 2, Elite → roleBudget uses concentration multiplier', () => {
    const { roleBudget } = calculateBudget(5, 2, 'elite', settings);
    expect(roleBudget).toBeCloseTo(1045.08 * mults.elite, 0);
  });

  it('CR 5, Tier 2, Minion → roleBudget uses concentration multiplier', () => {
    const { roleBudget } = calculateBudget(5, 2, 'minion', settings);
    expect(roleBudget).toBeCloseTo(1045.08 * mults.minion, 0);
  });

  it('CR 5, Tier 2, Mini-boss → roleBudget uses concentration multiplier', () => {
    const { roleBudget } = calculateBudget(5, 2, 'mini-boss', settings);
    expect(roleBudget).toBeCloseTo(1045.08 * mults['mini-boss'], 0);
  });

  it('CR 5, Tier 2, Vault → roleBudget equals fullBudget', () => {
    const { fullBudget, roleBudget } = calculateBudget(5, 2, 'vault', settings);
    expect(roleBudget).toBeCloseTo(fullBudget, 0);
  });

  it('CR 0, Tier 1, Minion → very small budget', () => {
    const { roleBudget } = calculateBudget(0, 1, 'minion', settings);
    // 10 × 0.29 × minionMultiplier
    expect(roleBudget).toBeCloseTo(10 * 0.29 * mults.minion, 2);
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

  it('APL adjustment at 0.7 produces 70% of default budget', () => {
    const low = { ...settings, aplAdjustment: 0.7 };
    const base = calculateBudget(5, 2, 'boss', settings);
    const adjusted = calculateBudget(5, 2, 'boss', low);
    expect(adjusted.fullBudget).toBeCloseTo(base.fullBudget * 0.7, 2);
  });

  it('APL adjustment at 1.3 produces 130% of default budget', () => {
    const high = { ...settings, aplAdjustment: 1.3 };
    const base = calculateBudget(5, 2, 'boss', settings);
    const adjusted = calculateBudget(5, 2, 'boss', high);
    expect(adjusted.fullBudget).toBeCloseTo(base.fullBudget * 1.3, 2);
  });
});
