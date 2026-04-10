// Hand-written lookups derived from the auto-generated SOURCEBOOKS list.
// Do NOT edit sourcebooks.ts (it's regenerated from the Excel source).

import { SOURCEBOOKS } from './sourcebooks';

export const SOURCEBOOK_BY_ACRONYM: Record<string, string> = Object.fromEntries(
  SOURCEBOOKS.map((s) => [s.acronym, s.name]),
);

/** Expand a sourcebook acronym to its full title, passing through unknowns. */
export function expandSource(acronym: string): string {
  return SOURCEBOOK_BY_ACRONYM[acronym] ?? acronym;
}
