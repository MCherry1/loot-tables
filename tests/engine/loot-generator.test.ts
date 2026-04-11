import { describe, it, expect } from 'vitest';
import { generateLoot, generateEncounter } from '../../src/engine/loot-generator';
import { DEFAULT_CAMPAIGN_SETTINGS } from '../../src/engine/constants';

const settings = { ...DEFAULT_CAMPAIGN_SETTINGS };

describe('generateLoot', () => {
  it('CR 5, Tier 2, Elite → returns LootResult with coins and positive average', () => {
    const result = generateLoot({ cr: 5, tier: 2, role: 'elite', settings });
    expect(result).toHaveProperty('coins');
    expect(result).toHaveProperty('gems');
    expect(result).toHaveProperty('artObjects');
    expect(result).toHaveProperty('magicItems');
    expect(result).toHaveProperty('mundaneFinds');
    // At least one denomination should have coins
    const totalAvg = result.coins.cp.average / 100 + result.coins.sp.average / 10
      + result.coins.gp.average + result.coins.pp.average * 10;
    expect(totalAvg).toBeGreaterThan(0);
    expect(result.coins).toHaveProperty('cp');
    expect(result.coins).toHaveProperty('sp');
    expect(result.coins).toHaveProperty('gp');
    expect(result.coins).toHaveProperty('pp');
  });
});

describe('generateEncounter', () => {
  it('4 minions + 1 elite + 1 boss → returns 6 creatures', () => {
    const result = generateEncounter({
      cr: 5,
      tier: 2,
      autoTier: false,
      counts: { minion: 4, elite: 1, 'mini-boss': 0, boss: 1, vault: 0 },
      settings,
    });
    expect(result.creatures).toHaveLength(6);
  });

  it('creatures are labeled correctly', () => {
    const result = generateEncounter({
      cr: 5,
      tier: 2,
      autoTier: false,
      counts: { minion: 4, elite: 1, 'mini-boss': 0, boss: 1, vault: 0 },
      settings,
    });

    const minions = result.creatures.filter((c) => c.role === 'minion');
    const elites = result.creatures.filter((c) => c.role === 'elite');
    const bosses = result.creatures.filter((c) => c.role === 'boss');

    expect(minions).toHaveLength(4);
    expect(minions.map((c) => c.index)).toEqual([1, 2, 3, 4]);

    expect(elites).toHaveLength(1);
    expect(elites[0].index).toBe(1);

    expect(bosses).toHaveLength(1);
    expect(bosses[0].index).toBe(1);
  });
});
