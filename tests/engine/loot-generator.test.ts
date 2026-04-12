import { describe, it, expect } from 'vitest';
import {
  generateLoot,
  generateEncounter,
  generateVaultLootResolvable,
} from '../../src/engine/loot-generator';
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

describe('hoard spell-component steals (vault)', () => {
  it('tier 1 vault always includes a 100 gp Pearl', () => {
    // Probability is 1.0 — should hit every time.
    for (let i = 0; i < 10; i++) {
      const loot = generateVaultLootResolvable(
        { tier: 1, size: 'standard', settings },
        true,
      );
      const pearl = loot.gems.find((g) => g.name === 'Pearl' && g.value === 100);
      expect(pearl).toBeDefined();
    }
  });

  it('tier 4 vault includes 5000 gp Diamonds at roughly 1/7 probability', () => {
    let diamondHits = 0;
    const runs = 400;
    for (let i = 0; i < runs; i++) {
      const loot = generateVaultLootResolvable(
        { tier: 4, size: 'standard', settings },
        true,
      );
      if (loot.gems.some((g) => g.name === 'Diamond' && g.value === 5000 && g.tableName === 'hoard-steal')) {
        diamondHits++;
      }
    }
    // Expected ~57 hits (400/7). Allow a generous band for flakiness.
    expect(diamondHits).toBeGreaterThan(20);
    expect(diamondHits).toBeLessThan(100);
  });

  it('non-vault generateLoot never produces a hoard-steal gem', () => {
    for (let i = 0; i < 50; i++) {
      const loot = generateLoot({ cr: 3, tier: 1, role: 'boss', settings });
      expect(loot.gems.every((g) => g.tableName !== 'hoard-steal')).toBe(true);
    }
  });
});
