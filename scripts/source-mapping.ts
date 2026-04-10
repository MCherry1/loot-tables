// ---------------------------------------------------------------------------
// Source abbreviation alignment between our tables and 5etools.
// ---------------------------------------------------------------------------

/** Maps our abbreviation → 5etools abbreviation (and vice versa). */
export const SOURCE_MAP: Record<string, string> = {
  // Ours → 5etools
  KGV: 'KftGV',
  IDRotF: 'IdRotF',
  DIA: 'BGDIA',
  IWD: 'IdRotF',
  // 5etools → Ours
  KftGV: 'KGV',
  IdRotF: 'IDRotF',
  BGDIA: 'DIA',
};

/**
 * Normalize a source abbreviation to our internal format.
 * Unknown abbreviations are returned as-is.
 */
export function normalizeSource(src: string): string {
  // If it maps to our format, use that; otherwise keep as-is.
  return SOURCE_MAP[src] ?? src;
}
