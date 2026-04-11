// Lookup helpers for sourcebook data.

import { SOURCEBOOKS, LEGACY_ACRONYM_MAP } from './sourcebooks';

export const SOURCEBOOK_BY_ACRONYM: Record<string, string> = Object.fromEntries(
  SOURCEBOOKS.map((s) => [s.acronym, s.name]),
);

/** Normalize a legacy abbreviation to the canonical 5etools form. */
export function canonicalAcronym(acronym: string): string {
  return LEGACY_ACRONYM_MAP[acronym] ?? acronym;
}

/** Expand a sourcebook acronym to its full title, passing through unknowns.
 *  Handles both canonical and legacy abbreviations. */
export function expandSource(acronym: string): string {
  const canonical = canonicalAcronym(acronym);
  return SOURCEBOOK_BY_ACRONYM[canonical] ?? SOURCEBOOK_BY_ACRONYM[acronym] ?? acronym;
}
