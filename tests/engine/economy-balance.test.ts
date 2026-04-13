import { describe, it, expect } from 'vitest';
import { calculateBudget } from '../../src/engine/budget';
import { DEFAULT_CAMPAIGN_SETTINGS, computeRoleMultipliers } from '../../src/engine/constants';

// Use flat progression so budget tests verify role math in isolation.
const settings = { ...DEFAULT_CAMPAIGN_SETTINGS, tierProgression: false };
const mults = computeRoleMultipliers(3.0);

describe('economy balance', () => {
  it('CR 4, Tier 1, Boss → roleBudget uses role multiplier', () => {
    const { fullBudget, roleBudget } = calculateBudget(4, 1, 'boss', settings);
    // 1100 × 0.29 = 319 (fullBudget)
    expect(fullBudget).toBeCloseTo(319, 0);
    expect(roleBudget).toBeCloseTo(319 * mults.boss, 0);
  });

  it('CR 4, Tier 2, Elite → roleBudget uses role multiplier', () => {
    const { fullBudget, roleBudget } = calculateBudget(4, 2, 'elite', settings);
    // 1100 × 0.5806 = 638.66
    expect(fullBudget).toBeCloseTo(638.66, 0);
    expect(roleBudget).toBeCloseTo(638.66 * mults.elite, 0);
  });

  it('boss multiplier is much larger than elite', () => {
    // New multipliers: boss=1.75, elite=0.50 → ratio 3.5×
    expect(mults.boss / mults.elite).toBeCloseTo(3.5, 1);
  });

  it('deprecated computeRoleMultipliers ignores concentration parameter', () => {
    const flat = computeRoleMultipliers(1.5);
    const steep = computeRoleMultipliers(5.0);
    // Always returns same values: boss/minion = 1.75/0.15 ≈ 11.67
    expect(flat.boss / flat.minion).toBeCloseTo(11.67, 0);
    expect(steep.boss / steep.minion).toBeCloseTo(11.67, 0);
  });

  it('role multipliers have mini-boss at exactly fair share', () => {
    // Regression-optimized: minion=0.15, elite=0.50, mini-boss=1.00, boss=1.75
    expect(mults.minion).toBeCloseTo(0.15, 2);
    expect(mults.elite).toBeCloseTo(0.50, 2);
    expect(mults['mini-boss']).toBeCloseTo(1.00, 2);
    expect(mults.boss).toBeCloseTo(1.75, 2);
    // Mini-boss is exactly 1.0 (fair share)
    expect(mults['mini-boss']).toBeCloseTo(1.0, 2);
  });

  it('useRoles=false gives flat multiplier', () => {
    const flatSettings = { ...settings, useRoles: false };
    const { fullBudget, roleBudget } = calculateBudget(4, 1, 'minion', flatSettings);
    expect(roleBudget).toBeCloseTo(fullBudget, 0);
  });
});
