import { describe, it, expect } from 'vitest';
import {
  crToDefaultTier,
  HOARD_SPELL_COMPONENT_STEALS,
} from '../../src/engine/constants';

describe('crToDefaultTier', () => {
  it('maps CR to the DMG hoard tiers', () => {
    // Tier 1: CR 0-4
    expect(crToDefaultTier(0)).toBe(1);
    expect(crToDefaultTier(4)).toBe(1);
    // Tier 2: CR 5-10
    expect(crToDefaultTier(5)).toBe(2);
    expect(crToDefaultTier(10)).toBe(2);
    // Tier 3: CR 11-16
    expect(crToDefaultTier(11)).toBe(3);
    expect(crToDefaultTier(16)).toBe(3);
    // Tier 4: CR 17+
    expect(crToDefaultTier(17)).toBe(4);
    expect(crToDefaultTier(30)).toBe(4);
  });

  it('places the previously-buggy boundaries correctly', () => {
    // Before the fix, CR 5 was Tier 1 and CR 16 was Tier 4.
    expect(crToDefaultTier(5)).toBe(2);
    expect(crToDefaultTier(16)).toBe(3);
  });
});

describe('HOARD_SPELL_COMPONENT_STEALS', () => {
  it('has an entry for every tier', () => {
    expect(HOARD_SPELL_COMPONENT_STEALS[1]).toBeDefined();
    expect(HOARD_SPELL_COMPONENT_STEALS[2]).toBeDefined();
    expect(HOARD_SPELL_COMPONENT_STEALS[3]).toBeDefined();
    expect(HOARD_SPELL_COMPONENT_STEALS[4]).toBeDefined();
  });

  it('tier 1 always steals a 100 gp pearl', () => {
    const entry = HOARD_SPELL_COMPONENT_STEALS[1];
    expect(entry.gem).toBe('Pearl');
    expect(entry.value).toBe(100);
    expect(entry.probability).toBe(1.0);
  });

  it('higher tiers are diamonds', () => {
    expect(HOARD_SPELL_COMPONENT_STEALS[2].gem).toBe('Diamond');
    expect(HOARD_SPELL_COMPONENT_STEALS[3].gem).toBe('Diamond');
    expect(HOARD_SPELL_COMPONENT_STEALS[4].gem).toBe('Diamond');
  });

  it('probabilities are in (0, 1]', () => {
    for (const tier of [1, 2, 3, 4] as const) {
      const p = HOARD_SPELL_COMPONENT_STEALS[tier].probability;
      expect(p).toBeGreaterThan(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
});
