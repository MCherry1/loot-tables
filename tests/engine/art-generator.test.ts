import { describe, it, expect } from 'vitest';
import {
  generateArtBudget,
  generateArtDescriptor,
} from '../../src/engine/art-generator';
import { ART_CATEGORIES, DMG_NAMED_ART } from '../../src/data/art-definitions';

describe('ART_CATEGORIES', () => {
  it('contains all 10 categories from the spec', () => {
    expect(ART_CATEGORIES).toHaveLength(10);
  });

  it('Jewelry has the widest range and weight 8', () => {
    const jewelry = ART_CATEGORIES.find((c) => c.name === 'Jewelry')!;
    expect(jewelry.weight).toBe(8);
    expect(jewelry.min).toBe(5);
    expect(jewelry.max).toBe(50000);
  });

  it('every category has materials, forms, and details', () => {
    for (const cat of ART_CATEGORIES) {
      expect(cat.materials.length).toBeGreaterThan(0);
      expect(cat.forms.length).toBeGreaterThan(0);
      expect(cat.details.length).toBeGreaterThan(0);
      expect(cat.artisanTool).toBeTruthy();
    }
  });
});

describe('DMG_NAMED_ART', () => {
  it('contains at least 30 named items across categories', () => {
    expect(DMG_NAMED_ART.length).toBeGreaterThanOrEqual(30);
  });

  it('every named item references a real category', () => {
    const names = new Set(ART_CATEGORIES.map((c) => c.name));
    for (const d of DMG_NAMED_ART) {
      expect(names.has(d.category)).toBe(true);
    }
  });
});

describe('generateArtDescriptor', () => {
  const jewelry = ART_CATEGORIES.find((c) => c.name === 'Jewelry')!;

  it('returns a non-empty description', () => {
    for (let i = 0; i < 50; i++) {
      const d = generateArtDescriptor(jewelry, 250);
      expect(d.description).toBeTruthy();
      expect(d.description.length).toBeGreaterThan(3);
    }
  });

  it('may occasionally yield a DMG named item', () => {
    // Run many samples at a DMG-matching value; some should be named.
    let named = 0;
    for (let i = 0; i < 500; i++) {
      const d = generateArtDescriptor(jewelry, 250);
      if (d.dmgNamed) named++;
    }
    // Probability is 10%, restricted to items matching the value band.
    // Over 500 rolls we should see at least a handful.
    expect(named).toBeGreaterThan(5);
  });
});

describe('generateArtBudget', () => {
  it('exhausts the budget nearly completely', () => {
    for (const budget of [40, 560, 2500, 3712]) {
      const art = generateArtBudget(budget);
      const total = art.reduce((s, a) => s + a.value, 0);
      expect(total).toBeLessThanOrEqual(budget);
      // Leftover up to ~15 gp acceptable (binning drift + minimum-value floor).
      expect(budget - total).toBeLessThan(15);
    }
  });

  it('every art item has name, value, description, category, and artisanTool', () => {
    const art = generateArtBudget(1000);
    expect(art.length).toBeGreaterThan(0);
    for (const a of art) {
      expect(a.name).toBeTruthy();
      expect(a.value).toBeGreaterThan(0);
      expect(a.description).toBeTruthy();
      expect(a.category).toBeTruthy();
      expect(a.artisanTool).toBeTruthy();
      expect(a.tableName).toBe('art-budget');
    }
  });

  it('returns [] for zero budget', () => {
    expect(generateArtBudget(0)).toEqual([]);
  });
});
