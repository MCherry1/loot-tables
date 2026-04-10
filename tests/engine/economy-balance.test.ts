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

  it('flat concentration (1.5) produces much smaller boss/minion spread', () => {
    const flat = computeRoleMultipliers(1.5);
    const steep = computeRoleMultipliers(5.0);
    // Flat: boss/minion ratio should be c³ = 3.375
    expect(flat.boss / flat.minion).toBeCloseTo(1.5 ** 3, 1);
    // Steep: boss/minion ratio should be c³ = 125
    expect(steep.boss / steep.minion).toBeCloseTo(5 ** 3, 0);
  });

  it('weighted average of multipliers is approximately 1.0', () => {
    const xpSplit = { minion: 0.50, elite: 0.30, 'mini-boss': 0.12, boss: 0.08 };
    const wavg =
      mults.minion * xpSplit.minion +
      mults.elite * xpSplit.elite +
      mults['mini-boss'] * xpSplit['mini-boss'] +
      mults.boss * xpSplit.boss;
    expect(wavg).toBeCloseTo(1.0, 5);
  });
});
