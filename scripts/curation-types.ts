// ---------------------------------------------------------------------------
// Shared types for the curation pipeline (seed, ingest, merge)
// ---------------------------------------------------------------------------

/** Curation entry for a single magic item. */
export interface CurationEntry {
  /** Which table this item belongs to (A-I). */
  table: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';
  /** Category within that table (e.g. "Potions", "Gear", "Arms-Armor"). */
  category: string;
  /** Weight (integer). Null = not yet assigned, use default. */
  weight: number | null;
  /** Sub-table references this item carries (e.g. ["Swords"]). */
  refs?: string[];
  /** Curation status. */
  status: 'approved' | 'ready-for-review' | 'excluded';
  /** Reason for exclusion. */
  reason?: string;
  /** Optional notes. */
  notes?: string;
}

/**
 * Curation file: keyed by "ItemName|Source" (5etools' unique key format).
 * Items without a source use "ItemName|" as the key.
 */
export type CurationFile = Record<string, CurationEntry>;

/** Category weight entry in the table structure config. */
export interface TableCategoryWeight {
  /** Sub-table name (e.g. "Potions-A"). */
  subtable: string;
  /** Weight on the root table (d100). */
  weight: number;
}

/** Top-level table structure configuration. */
export type TableStructure = Record<string, TableCategoryWeight[]>;
