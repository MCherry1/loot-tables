// ---------------------------------------------------------------------------
// Source abbreviation alignment between legacy tables and 5etools.
//
// All internal data uses 5etools canonical abbreviations (IDRotF, KftGV, etc).
// Legacy abbreviations (IWD, KGV, etc) only exist in the hand-curated Excel
// tables and are converted during import.
// ---------------------------------------------------------------------------

import { LEGACY_ACRONYM_MAP } from '../src/data/sourcebooks';

/**
 * Convert a legacy source abbreviation to the canonical 5etools form.
 * Unknown abbreviations pass through unchanged — they may already be canonical.
 */
export function toCanonical(src: string): string {
  return LEGACY_ACRONYM_MAP[src] ?? src;
}

/**
 * Build a reverse map: 5etools canonical → legacy abbreviation.
 * Only needed when displaying items alongside the original Excel data.
 */
export const CANONICAL_TO_LEGACY: Record<string, string> = Object.fromEntries(
  Object.entries(LEGACY_ACRONYM_MAP).map(([legacy, canonical]) => [canonical, legacy]),
);

/**
 * Convert a canonical 5etools abbreviation back to the legacy form.
 * Returns the canonical form if no legacy mapping exists.
 */
export function toLegacy(src: string): string {
  return CANONICAL_TO_LEGACY[src] ?? src;
}
