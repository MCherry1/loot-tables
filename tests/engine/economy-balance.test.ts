import { describe, it, expect } from 'vitest';
import { calculateBudget } from '../../src/engine/budget';
import { DEFAULT_CAMPAIGN_SETTINGS, computeRoleMultipliers } from '../../src/engine/constants';

const settings = { ...DEFAULT_CAMPAIGN_SETTINGS };
const mults = computeRoleMultipliers(3.0);

describe('economy balance', () => {
  it('CR 4, Tier 1, Boss → roleBudget uses concentration multiplier', () => {
    const { fullBudget, roleBudget } = calculateBudget(4, 1, 'boss', settings);
    // 1100 × 0.29 = 319 (fullBudget)
    expect(fullBudget).toBeCloseTo(319, 0);
    expect(roleBudget).toBeCloseTo(319 * mults.boss, 0);
  });

  it('CR 4, Tier 2, Elite → roleBudget uses concentration multiplier', () => {
    const { fullBudget, roleBudget } = calculateBudget(4, 2, 'elite', settings);
    // 1100 × 0.5806 = 638.66
    expect(fullBudget).toBeCloseTo(638.66, 0);
    expect(roleBudget).toBeCloseTo(638.66 * mults.elite, 0);
  });

  it('boss multiplier is much larger than elite at default concentration', () => {
    // With concentration=3: boss is ~9× elite (c³/c = c² = 9)
    expect(mults.boss / mults.elite).toBeCloseTo(9, 1);
  });

  it('fixed multipliers ignore concentration parameter', () => {
    const flat = computeRoleMultipliers(1.5);
    const steep = computeRoleMultipliers(5.0);
    // computeRoleMultipliers is deprecated; always returns fixed 3× steps
    expect(flat.boss / flat.minion).toBeCloseTo(27, 1);
    expect(steep.boss / steep.minion).toBeCloseTo(27, 1);
  });

  it('role multipliers follow 3× progression', () => {
    // Fixed multipliers: minion=0.10, elite=0.30, mini-boss=0.90, boss=2.70
    expect(mults.elite / mults.minion).toBeCloseTo(3, 1);
    expect(mults['mini-boss'] / mults.elite).toBeCloseTo(3, 1);
    expect(mults.boss / mults['mini-boss']).toBeCloseTo(3, 1);
  });
});
