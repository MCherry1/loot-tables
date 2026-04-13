import { describe, it, expect } from 'vitest';
import { calculateBudget } from '../../src/engine/budget';
import { DEFAULT_CAMPAIGN_SETTINGS, GP_PER_XP, ROLE_MULTIPLIER } from '../../src/engine/constants';

// Use flat progression (×1.00) so tests verify budget math in isolation.
const settings = { ...DEFAULT_CAMPAIGN_SETTINGS, tierProgression: false };

// Role multipliers for use in assertions (add vault = 1.0 for completeness).
const mults = { ...ROLE_MULTIPLIER, vault: 1.0 } as Record<string, number>;

describe('calculateBudget', () => {
  it('CR 5, Tier 2, Boss → fullBudget ≈ XP × GP_PER_XP', () => {
    const { fullBudget, roleBudget } = calculateBudget(5, 2, 'boss', settings);
    // 1800 × GP_PER_XP[2]
    const expected = 1800 * GP_PER_XP[2];
    expect(fullBudget).toBeCloseTo(expected, 0);
    expect(roleBudget).toBeCloseTo(expected * mults.boss, 0);
  });

  it('CR 5, Tier 2, Elite → roleBudget uses role multiplier', () => {
    const { roleBudget } = calculateBudget(5, 2, 'elite', settings);
    const expected = 1800 * GP_PER_XP[2];
    expect(roleBudget).toBeCloseTo(expected * mults.elite, 0);
  });

  it('CR 5, Tier 2, Minion → roleBudget uses role multiplier', () => {
    const { roleBudget } = calculateBudget(5, 2, 'minion', settings);
    const expected = 1800 * GP_PER_XP[2];
    expect(roleBudget).toBeCloseTo(expected * mults.minion, 0);
  });

  it('CR 5, Tier 2, Mini-boss → roleBudget uses role multiplier', () => {
    const { roleBudget } = calculateBudget(5, 2, 'mini-boss', settings);
    const expected = 1800 * GP_PER_XP[2];
    expect(roleBudget).toBeCloseTo(expected * mults['mini-boss'], 0);
  });

  it('CR 5, Tier 2, Vault → roleBudget equals fullBudget', () => {
    const { fullBudget, roleBudget } = calculateBudget(5, 2, 'vault', settings);
    expect(roleBudget).toBeCloseTo(fullBudget, 0);
  });

  it('CR 0, Tier 1, Minion → very small budget', () => {
    const { roleBudget } = calculateBudget(0, 1, 'minion', settings);
    // 10 × GP_PER_XP[1] × minionMultiplier
    expect(roleBudget).toBeCloseTo(10 * GP_PER_XP[1] * mults.minion, 2);
    expect(roleBudget).toBeLessThan(1);
  });

  it('CR 30, Tier 4, Vault → very large budget', () => {
    const { roleBudget } = calculateBudget(30, 4, 'vault', settings);
    // 155000 × GP_PER_XP[4] ≈ 886K
    expect(roleBudget).toBeGreaterThan(800_000);
  });

  it('party size 6 → budget is 4/6 of default', () => {
    const settings6 = { ...settings, partySize: 6 };
    const base = calculateBudget(5, 2, 'boss', settings);
    const scaled = calculateBudget(5, 2, 'boss', settings6);
    expect(scaled.fullBudget).toBeCloseTo(base.fullBudget * (4 / 6), 2);
  });

  it('fractional CR 0.125 works', () => {
    const { fullBudget } = calculateBudget(0.125, 1, 'boss', settings);
    // 25 × GP_PER_XP[1]
    expect(fullBudget).toBeCloseTo(25 * GP_PER_XP[1], 2);
  });

  it('fractional CR 0.25 works', () => {
    const { fullBudget } = calculateBudget(0.25, 1, 'boss', settings);
    // 50 × GP_PER_XP[1]
    expect(fullBudget).toBeCloseTo(50 * GP_PER_XP[1], 2);
  });

  it('fractional CR 0.5 works', () => {
    const { fullBudget } = calculateBudget(0.5, 1, 'boss', settings);
    // 100 × GP_PER_XP[1]
    expect(fullBudget).toBeCloseTo(100 * GP_PER_XP[1], 2);
  });

  it('progression multiplier scales budget within tier', () => {
    // Level 5 at start of Tier 2: ×0.70
    const low = { ...settings, partyLevel: 5, tierProgression: true };
    // Level 10 at end of Tier 2: ×1.30
    const high = { ...settings, partyLevel: 10, tierProgression: true };
    const baseBudget = calculateBudget(5, 2, 'boss', settings);
    const lowBudget = calculateBudget(5, 2, 'boss', low);
    const highBudget = calculateBudget(5, 2, 'boss', high);
    expect(lowBudget.fullBudget).toBeCloseTo(baseBudget.fullBudget * 0.7, 2);
    expect(highBudget.fullBudget).toBeCloseTo(baseBudget.fullBudget * 1.3, 2);
  });

  it('flat progression always returns ×1.00 budget', () => {
    const flat5 = { ...settings, partyLevel: 5, tierProgression: false };
    const flat10 = { ...settings, partyLevel: 10, tierProgression: false };
    const b5 = calculateBudget(5, 2, 'boss', flat5);
    const b10 = calculateBudget(5, 2, 'boss', flat10);
    expect(b5.fullBudget).toBeCloseTo(b10.fullBudget, 2);
  });
});
