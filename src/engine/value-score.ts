import { BASE_NUMBERS } from './constants';
import { cryptoRandom } from './random';
import type { MITable } from './types';

/**
 * Roll a value score: 2d4 (range 2-8, average 5).
 */
export function rollValueScore(): number {
  const d4a = Math.floor(cryptoRandom() * 4) + 1;
  const d4b = Math.floor(cryptoRandom() * 4) + 1;
  return d4a + d4b;
}

/**
 * Calculate buy price for an item from a given MI table.
 * Formula: valueScore x BASE_NUMBER[table].
 */
export function calculateBuyPrice(table: MITable, valueScore: number): number {
  return valueScore * BASE_NUMBERS[table];
}

/**
 * Calculate sale price for an item from a given MI table.
 * Formula: floor(valueScore / 2) x BASE_NUMBER[table].
 */
export function calculateSalePrice(table: MITable, valueScore: number): number {
  return Math.floor(valueScore / 2) * BASE_NUMBERS[table];
}

/**
 * Generate full pricing for a magic item from a given MI table.
 * Rolls a value score, then calculates buy and sale prices.
 */
export function priceItem(table: MITable): {
  valueScore: number;
  buyPrice: number;
  salePrice: number;
} {
  const valueScore = rollValueScore();
  return {
    valueScore,
    buyPrice: calculateBuyPrice(table, valueScore),
    salePrice: calculateSalePrice(table, valueScore),
  };
}
