import { describe, it, expect } from 'vitest';
import { calculateBudget } from '../../src/engine/budget';
import { DEFAULT_CAMPAIGN_SETTINGS, GP_PER_XP, ROLE_MULTIPLIER } from '../../src/engine/constants';

// Use flat progression so budget tests verify role math in isolation.
const settings = { ...DEFAULT_CAMPAIGN_SETTINGS, tierProgression: false };
const mults = { ...ROLE_MULTIPLIER, vault: 1.0 } as Record<string, number>;

describe('economy balance', () => {
  it('CR 4, Tier 1, Boss → roleBudget uses role multiplier', () => {
    const { fullBudget, roleBudget } = calculateBudget(4, 1, 'boss', settings);
    // 1100 × GP_PER_XP[1]
    const expected = 1100 * GP_PER_XP[1];
    expect(fullBudget).toBeCloseTo(expected, 0);
    expect(roleBudget).toBeCloseTo(expected * mults.boss, 0);
  });

  it('CR 4, Tier 2, Elite → roleBudget uses role multiplier', () => {
    const { fullBudget, roleBudget } = calculateBudget(4, 2, 'elite', settings);
    // 1100 × GP_PER_XP[2]
    const expected = 1100 * GP_PER_XP[2];
    expect(fullBudget).toBeCloseTo(expected, 0);
    expect(roleBudget).toBeCloseTo(expected * mults.elite, 0);
  });

  it('boss multiplier is much larger than elite', () => {
    // Multipliers: boss=1.75, elite=0.50 → ratio 3.5×
    expect(mults.boss / mults.elite).toBeCloseTo(3.5, 1);
  });

  it('role multipliers have mini-boss at exactly fair share', () => {
    // Regression-optimized: minion=0.15, elite=0.50, mini-boss=1.00, boss=1.75
    expect(mults.minion).toBeCloseTo(0.15, 2);
    expect(mults.elite).toBeCloseTo(0.50, 2);
    expect(mults['mini-boss']).toBeCloseTo(1.00, 2);
    expect(mults.boss).toBeCloseTo(1.75, 2);
  });

  it('useRoles=false gives flat multiplier', () => {
    const flatSettings = { ...settings, useRoles: false };
    const { fullBudget, roleBudget } = calculateBudget(4, 1, 'minion', flatSettings);
    expect(roleBudget).toBeCloseTo(fullBudget, 0);
  });
});
