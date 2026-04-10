import { describe, it, expect } from 'vitest';
import { classify, type FiveToolsItem } from '../../scripts/auto-classify';

function item(overrides: Partial<FiveToolsItem>): FiveToolsItem {
  return { name: 'Test Item', source: 'DMG', ...overrides };
}

describe('auto-classify', () => {
  describe('Rule 2: Common → Table A', () => {
    it('common potion → Table A, Potions', () => {
      const result = classify(item({ name: 'Potion of Climbing', rarity: 'common', type: 'P' }));
      expect(result.classified).toBe(true);
      if (result.classified) {
        expect(result.entry.table).toBe('A');
        expect(result.entry.category).toBe('Potions');
      }
    });

    it('common item without special type → Table A, Trinkets', () => {
      const result = classify(item({ name: 'Cloak of Billowing', rarity: 'common' }));
      expect(result.classified).toBe(true);
      if (result.classified) {
        expect(result.entry.table).toBe('A');
        expect(result.entry.category).toBe('Trinkets');
      }
    });

    it('common weapon → Table A, Arms-Armor', () => {
      const result = classify(item({ name: 'Moon-Touched Sword', rarity: 'common', type: 'M' }));
      expect(result.classified).toBe(true);
      if (result.classified) {
        expect(result.entry.table).toBe('A');
        expect(result.entry.category).toBe('Arms-Armor');
      }
    });
  });

  describe('Rule 3: Exclusions', () => {
    it('cursed item → excluded', () => {
      const result = classify(item({ rarity: 'rare', curse: true }));
      expect(result.classified).toBe(true);
      if (result.classified) {
        expect(result.entry.status).toBe('excluded');
        expect(result.entry.reason).toBe('cursed');
      }
    });

    it('artifact → excluded', () => {
      const result = classify(item({ rarity: 'artifact' }));
      expect(result.classified).toBe(true);
      if (result.classified) {
        expect(result.entry.status).toBe('excluded');
        expect(result.entry.reason).toBe('artifact');
      }
    });

    it('varies rarity → not classified', () => {
      const result = classify(item({ rarity: 'varies' }));
      expect(result.classified).toBe(false);
    });
  });

  describe('Rule 4+5: Rarity → table, minor vs major', () => {
    it('uncommon attunement item → Table F (major)', () => {
      const result = classify(item({ rarity: 'uncommon', reqAttune: true }));
      expect(result.classified).toBe(true);
      if (result.classified) {
        expect(result.entry.table).toBe('F');
      }
    });

    it('uncommon non-attunement item → Table B (minor)', () => {
      const result = classify(item({ name: 'Potion of Growth', rarity: 'uncommon', type: 'P' }));
      expect(result.classified).toBe(true);
      if (result.classified) {
        expect(result.entry.table).toBe('B');
      }
    });

    it('rare attunement item → Table G', () => {
      const result = classify(item({ rarity: 'rare', reqAttune: true }));
      expect(result.classified).toBe(true);
      if (result.classified) {
        expect(result.entry.table).toBe('G');
      }
    });

    it('very rare non-attunement with bonusAc → Table H (major)', () => {
      const result = classify(item({ rarity: 'very rare', bonusAc: '+2' }));
      expect(result.classified).toBe(true);
      if (result.classified) {
        expect(result.entry.table).toBe('H');
      }
    });

    it('legendary non-potion → always major (Table I)', () => {
      const result = classify(item({ name: 'Vorpal Sword', rarity: 'legendary', type: 'M' }));
      expect(result.classified).toBe(true);
      if (result.classified) {
        expect(result.entry.table).toBe('I');
      }
    });
  });

  describe('Rule 6: Category assignment', () => {
    it('spellcaster attunement → Spellcaster category', () => {
      const result = classify(item({
        name: 'Staff of Power',
        rarity: 'very rare',
        reqAttune: true,
        reqAttuneTags: [{ class: 'Sorcerer' }, { class: 'Warlock' }, { class: 'Wizard' }],
      }));
      expect(result.classified).toBe(true);
      if (result.classified) {
        expect(result.entry.category).toBe('Spellcaster');
      }
    });

    it('"staff of" → Spellcaster', () => {
      const result = classify(item({
        name: 'Staff of Fire',
        rarity: 'very rare',
        reqAttune: true,
      }));
      expect(result.classified).toBe(true);
      if (result.classified) {
        expect(result.entry.category).toBe('Spellcaster');
      }
    });

    it('ring → Jewelry', () => {
      const result = classify(item({
        name: 'Ring of Protection',
        rarity: 'rare',
        type: 'RG|DMG',
        reqAttune: true,
      }));
      expect(result.classified).toBe(true);
      if (result.classified) {
        expect(result.entry.category).toBe('Jewelry');
      }
    });

    it('weapon type M → Arms', () => {
      const result = classify(item({
        name: 'Flame Tongue Longsword',
        rarity: 'rare',
        type: 'M',
        reqAttune: true,
      }));
      expect(result.classified).toBe(true);
      if (result.classified) {
        expect(result.entry.category).toBe('Arms');
      }
    });

    it('boots keyword → Apparel', () => {
      const result = classify(item({
        name: 'Boots of Speed',
        rarity: 'rare',
        reqAttune: true,
      }));
      expect(result.classified).toBe(true);
      if (result.classified) {
        expect(result.entry.category).toBe('Apparel');
      }
    });

    it('wand type → Misc', () => {
      const result = classify(item({
        name: 'Wand of Fear',
        rarity: 'rare',
        type: 'WD|DMG',
        reqAttune: true,
      }));
      expect(result.classified).toBe(true);
      if (result.classified) {
        expect(result.entry.category).toBe('Misc');
      }
    });

    it('amulet keyword → Jewelry', () => {
      const result = classify(item({
        name: 'Amulet of Health',
        rarity: 'rare',
        reqAttune: true,
      }));
      expect(result.classified).toBe(true);
      if (result.classified) {
        expect(result.entry.category).toBe('Jewelry');
      }
    });
  });

  describe('Rule 1: DMG lootTables override', () => {
    it('explicit DMG table assignment wins', () => {
      const result = classify(item({
        name: 'Potion of Healing',
        rarity: 'uncommon',
        type: 'P',
        lootTables: ['Magic Item Table B'],
      }));
      expect(result.classified).toBe(true);
      if (result.classified) {
        expect(result.entry.table).toBe('B');
      }
    });
  });

  describe('status', () => {
    it('new items get ready-for-review status', () => {
      const result = classify(item({ rarity: 'uncommon' }));
      expect(result.classified).toBe(true);
      if (result.classified) {
        expect(result.entry.status).toBe('ready-for-review');
        expect(result.entry.weight).toBe(3);
      }
    });
  });
});
