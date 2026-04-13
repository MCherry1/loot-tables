// ---------------------------------------------------------------------------
// ReferenceView — Book-style read-only view of every magic item table.
// Admin mode adds inline weight editing + auto-rebalance + GitHub publish.
// Spec: specs/REFERENCE-VIEW-SPEC.md
// ---------------------------------------------------------------------------

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CampaignSettings, MITable } from '@engine/index';
import { MAGIC_ITEMS } from '../../data/magic-items';
import { SUPPLEMENTAL_TABLES } from '../../data/supplemental';
import curationData from '../../../data/curation.json';
import {
  extractRef,
  cleanDisplayName,
  getStepperTable,
  type Entry,
} from '../lib/stepperResolve';
import {
  STANDARD_DICE,
  nextDieUp,
  computeDiceRanges,
  formatRange,
} from '../lib/diceUtils';
import {
  publishJsonFile,
  getStoredPat,
  storePat,
} from '../lib/githubPublish';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReferenceViewProps {
  settings: CampaignSettings;
  adminMode: boolean;
}

/** Pill selector value — A..I for main tables, 'supp' for supplemental. */
type PillValue = MITable | 'supp';

/** localStorage payload for admin weight edits. */
interface WeightEditsPersisted {
  /** Map of "tableName::itemName" to new integer weight. */
  edits: Record<string, number>;
  /** Keys the user manually changed (eligible for ember highlight). */
  touched: string[];
}

interface CurationEntry {
  table?: string;
  category?: string;
  weight?: number | null;
  refs?: string[];
  status?: string;
  reason?: string;
  notes?: string;
}

type CurationFile = Record<string, CurationEntry>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MI_LETTERS: MITable[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

const TABLE_SUBTITLES: Record<MITable, string> = {
  A: 'Minor \u00B7 Common',
  B: 'Minor \u00B7 Uncommon',
  C: 'Minor \u00B7 Rare',
  D: 'Minor \u00B7 V.Rare',
  E: 'Minor \u00B7 Legendary',
  F: 'Major \u00B7 Uncommon',
  G: 'Major \u00B7 Rare',
  H: 'Major \u00B7 V.Rare',
  I: 'Major \u00B7 Legendary',
};

const EDITS_KEY = 'loot-tables:ref-weight-edits';

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/** Spec §5 — weight desc, source alpha (empty last), name alpha. */
function refSort(a: Entry, b: Entry): number {
  if (b.weight !== a.weight) return b.weight - a.weight;
  const srcA = a.source || '\uffff';
  const srcB = b.source || '\uffff';
  if (srcA !== srcB) return srcA.localeCompare(srcB);
  return a.name.localeCompare(b.name);
}

/** Format a compose-key for state maps: "Potions-A::Potion of Healing". */
function keyFor(tableName: string, itemName: string): string {
  return `${tableName}::${itemName}`;
}

/** Given a table's entries, return the ordered list of direct child subtables. */
function findChildSubtables(entries: Entry[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const e of entries) {
    const ref = extractRef(e.name);
    if (ref && getStepperTable(ref) && !seen.has(ref)) {
      seen.add(ref);
      order.push(ref);
    }
  }
  return order;
}

/**
 * Walk every subtable reachable from `rootName` in depth-first order,
 * returning them in render order. Guards against cycles via `visited`.
 */
function collectDescendants(rootName: string, visited: Set<string>): string[] {
  if (visited.has(rootName)) return [];
  visited.add(rootName);
  const entries = getStepperTable(rootName) ?? [];
  const children = findChildSubtables(entries);
  const out: string[] = [];
  for (const child of children) {
    if (visited.has(child)) continue;
    out.push(child);
    out.push(...collectDescendants(child, visited));
  }
  return out;
}

/**
 * Load persisted weight edits from localStorage. Returns empty state on
 * any parse failure.
 */
function loadEdits(): WeightEditsPersisted {
  try {
    const raw = localStorage.getItem(EDITS_KEY);
    if (!raw) return { edits: {}, touched: [] };
    const parsed = JSON.parse(raw) as Partial<WeightEditsPersisted>;
    return {
      edits: parsed.edits ?? {},
      touched: parsed.touched ?? [],
    };
  } catch {
    return { edits: {}, touched: [] };
  }
}

/** Save edits to localStorage. Silent on failure. */
function saveEdits(edits: Record<string, number>, touched: Set<string>): void {
  try {
    const payload: WeightEditsPersisted = {
      edits,
      touched: Array.from(touched),
    };
    localStorage.setItem(EDITS_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

/**
 * Spec §8.4 — largest-remainder rebalance.
 * Scales untouched items' weights to absorb the delta so total = target die.
 * Returns the new edit map (including pre-existing manually touched edits)
 * and the set of keys that were auto-adjusted by this pass.
 */
function rebalanceTable(
  tableName: string,
  rawEntries: Entry[],
  currentEdits: Record<string, number>,
  touched: Set<string>,
): { newEdits: Record<string, number>; autoAdjusted: Set<string> } {
  const effective = rawEntries.map((e) => ({
    name: e.name,
    weight: currentEdits[keyFor(tableName, e.name)] ?? e.weight,
    isTouched: touched.has(keyFor(tableName, e.name)),
  }));

  const total = effective.reduce((s, e) => s + e.weight, 0);
  const target = nextDieUp(total);
  const delta = target - total;
  const autoAdjusted = new Set<string>();
  if (delta === 0) return { newEdits: currentEdits, autoAdjusted };

  const untouched = effective.filter((e) => !e.isTouched && e.weight > 0);
  const untouchedTotal = untouched.reduce((s, e) => s + e.weight, 0);
  if (untouchedTotal === 0) return { newEdits: currentEdits, autoAdjusted };

  const newUntouchedTotal = untouchedTotal + delta;
  // Protect against negative delta pushing weights below 1. If we'd have to
  // drive items to 0, clip the delta to the max we can absorb.
  const ratio = newUntouchedTotal / untouchedTotal;

  const scaled = untouched.map((e) => {
    const ideal = Math.max(1, e.weight * ratio);
    const floored = Math.max(1, Math.floor(ideal));
    return { name: e.name, floored, remainder: ideal - Math.floor(ideal) };
  });

  let distributed = scaled.reduce((s, e) => s + e.floored, 0);
  const remaining = newUntouchedTotal - distributed;

  // Largest-remainder rounding: sort by remainder descending, +1 to top N.
  const byRemainder = [...scaled].sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; i < remaining && i < byRemainder.length; i++) {
    byRemainder[i].floored += 1;
  }

  const newEdits = { ...currentEdits };
  for (const s of scaled) {
    const key = keyFor(tableName, s.name);
    newEdits[key] = s.floored;
    autoAdjusted.add(key);
  }
  return { newEdits, autoAdjusted };
}

// ---------------------------------------------------------------------------
// Row rendering helpers
// ---------------------------------------------------------------------------

function RefRow({
  entry,
  tableName,
  diceRange,
  totalWeight,
  isSubtableRef,
  isSourceDisabled,
  adminMode,
  effectiveWeight,
  isTouched,
  isAutoAdjusted,
  onScrollTo,
  onWeightChange,
}: {
  entry: Entry;
  tableName: string;
  diceRange: { lo: number; hi: number };
  totalWeight: number;
  isSubtableRef: boolean;
  isSourceDisabled: boolean;
  adminMode: boolean;
  effectiveWeight: number;
  isTouched: boolean;
  isAutoAdjusted: boolean;
  onScrollTo: (targetTableName: string) => void;
  onWeightChange: (newWeight: number) => void;
}) {
  const isCursed = effectiveWeight === 0;
  const pct =
    totalWeight > 0
      ? `${((effectiveWeight / totalWeight) * 100).toFixed(1)}%`
      : '\u2013';

  const refTarget = extractRef(entry.name);

  const cls = [
    'ref-row',
    isSourceDisabled ? 'source-disabled' : '',
    isCursed ? 'cursed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls}>
      <span className="ref-range">{formatRange(diceRange)}</span>
      {isSubtableRef && refTarget ? (
        <button
          type="button"
          className="ref-subtable-link"
          onClick={() => onScrollTo(refTarget)}
        >
          &#9656; {cleanDisplayName(entry.name)}
        </button>
      ) : (
        <span className="ref-item-name">
          {cleanDisplayName(entry.name)}
          {isCursed && <span className="cursed-tag">Cursed</span>}
        </span>
      )}
      <span className="ref-source">{entry.source || ''}</span>
      {adminMode ? (
        <RefWeightStepper
          value={effectiveWeight}
          touched={isTouched}
          autoAdjusted={isAutoAdjusted}
          onChange={onWeightChange}
        />
      ) : (
        <span className="ref-weight">{effectiveWeight}</span>
      )}
      <span className="ref-pct">{pct}</span>
    </div>
  );
}

function RefWeightStepper({
  value,
  touched,
  autoAdjusted,
  onChange,
}: {
  value: number;
  touched: boolean;
  autoAdjusted: boolean;
  onChange: (newValue: number) => void;
}) {
  const [localValue, setLocalValue] = useState(String(value));
  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 1) onChange(n);
    else setLocalValue(String(value));
  };

  const cls = [
    'ref-weight-stepper',
    touched ? 'modified' : '',
    !touched && autoAdjusted ? 'auto-adjusted' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={cls}>
      <button
        type="button"
        className="ref-weight-stepper-btn"
        aria-label="Decrease weight"
        onClick={() => value > 1 && onChange(value - 1)}
        disabled={value <= 1}
      >
        &minus;
      </button>
      <input
        className="ref-weight-value"
        type="text"
        inputMode="numeric"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value.replace(/[^0-9]/g, ''))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
      />
      <button
        type="button"
        className="ref-weight-stepper-btn"
        aria-label="Increase weight"
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const ReferenceView: React.FC<ReferenceViewProps> = ({
  settings,
  adminMode,
}) => {
  const [activePill, setActivePill] = useState<PillValue>('A');

  // Admin edit state (persisted to localStorage).
  const initial = useMemo(() => loadEdits(), []);
  const [edits, setEdits] = useState<Record<string, number>>(initial.edits);
  const [touched, setTouched] = useState<Set<string>>(
    () => new Set(initial.touched),
  );
  /**
   * Per-table "auto-rebalance after every manual change" flag.
   * Also drives the Apply button label in the status bar.
   */
  const [autoRebalance, setAutoRebalance] = useState<Record<string, boolean>>(
    {},
  );
  /** Keys that were adjusted by the last rebalance pass, for the blue border. */
  const [autoAdjusted, setAutoAdjusted] = useState<Set<string>>(new Set());

  // Publish state.
  const [patModalOpen, setPatModalOpen] = useState(false);
  const [patInput, setPatInput] = useState('');
  const [publishState, setPublishState] = useState<
    'idle' | 'publishing' | 'success' | 'error'
  >('idle');
  const [publishError, setPublishError] = useState<string | null>(null);
  const publishTimerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (publishTimerRef.current != null)
        window.clearTimeout(publishTimerRef.current);
    };
  }, []);

  // Persist edits whenever they change.
  useEffect(() => {
    saveEdits(edits, touched);
  }, [edits, touched]);

  // ---- Helpers closed over state ----

  const getEffective = useCallback(
    (tableName: string, entry: Entry): number => {
      const k = keyFor(tableName, entry.name);
      return edits[k] ?? entry.weight;
    },
    [edits],
  );

  const handleScrollTo = useCallback((targetTableName: string) => {
    // Try main-tables namespace first, then supplemental.
    const ids = [`ref-${targetTableName}`, `ref-supp-${targetTableName}`];
    let el: HTMLElement | null = null;
    for (const id of ids) {
      el = document.getElementById(id);
      if (el) break;
    }
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('ref-highlight');
    window.setTimeout(() => el!.classList.remove('ref-highlight'), 1500);
  }, []);

  const updateWeight = useCallback(
    (tableName: string, itemName: string, newWeight: number) => {
      const key = keyFor(tableName, itemName);
      setEdits((prev) => ({ ...prev, [key]: newWeight }));
      setTouched((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      // When a key is manually touched, drop it from the auto-adjusted set so
      // the UI doesn't double-highlight.
      setAutoAdjusted((prev) => {
        if (!prev.has(key)) return prev;
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    },
    [],
  );

  const handleApply = useCallback(
    (tableName: string, enabled: boolean) => {
      const rawEntries = getStepperTable(tableName) ?? [];
      if (!enabled) {
        // "Apply (d? ✓)" — no-op beyond persisting current state. Edits are
        // already saved via the useEffect above. Just flash a success state.
        setPublishState('idle');
        return;
      }
      const { newEdits, autoAdjusted: newAuto } = rebalanceTable(
        tableName,
        rawEntries,
        edits,
        touched,
      );
      setEdits(newEdits);
      setAutoAdjusted((prev) => {
        const next = new Set(prev);
        for (const k of newAuto) next.add(k);
        return next;
      });
    },
    [edits, touched],
  );

  const handleDiscardAll = useCallback(() => {
    if (
      !window.confirm(
        'Discard all reference-view weight edits? This cannot be undone.',
      )
    ) {
      return;
    }
    setEdits({});
    setTouched(new Set());
    setAutoAdjusted(new Set());
    try {
      localStorage.removeItem(EDITS_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const handlePublish = useCallback(async () => {
    const pat = getStoredPat();
    if (!pat) {
      setPatModalOpen(true);
      return;
    }
    setPublishState('publishing');
    setPublishError(null);

    // Build updated curation.json by applying every edit.
    const merged: CurationFile = JSON.parse(JSON.stringify(curationData));
    for (const [key, newWeight] of Object.entries(edits)) {
      const [tableName, itemName] = key.split('::');
      const entries = getStepperTable(tableName) ?? [];
      const entry = entries.find((e) => e.name === itemName);
      if (!entry) continue;
      const curationKey = `${itemName}|${entry.source ?? ''}`;
      const existing = merged[curationKey] ?? {};
      merged[curationKey] = {
        ...existing,
        weight: newWeight,
        status: existing.status ?? 'approved',
      };
    }

    const result = await publishJsonFile(
      pat,
      'data/curation.json',
      merged,
      'Reference view: adjust weights',
    );

    if (!result.ok) {
      setPublishState('error');
      setPublishError(result.error);
      if (result.kind === 'auth') setPatModalOpen(true);
      return;
    }

    setPublishState('success');
    setEdits({});
    setTouched(new Set());
    setAutoAdjusted(new Set());
    try {
      localStorage.removeItem(EDITS_KEY);
    } catch {
      /* ignore */
    }
    publishTimerRef.current = window.setTimeout(() => {
      publishTimerRef.current = null;
      setPublishState('idle');
    }, 3000);
  }, [edits]);

  // ---- Derived render data for the active pill ----

  const renderBlocks = useMemo<
    { id: string; tableName: string; isMain: boolean; depth: number }[]
  >(() => {
    if (activePill === 'supp') {
      return SUPPLEMENTAL_TABLES.map((t) => ({
        id: `ref-supp-${t.name}`,
        tableName: t.name,
        isMain: false,
        depth: 0,
      }));
    }
    const rootName = `Magic-Item-Table-${activePill}`;
    const visited = new Set<string>();
    const descendants = collectDescendants(rootName, visited);
    return [
      {
        id: `ref-${rootName}`,
        tableName: rootName,
        isMain: true,
        depth: 0,
      },
      ...descendants.map((name) => ({
        id: `ref-${name}`,
        tableName: name,
        isMain: false,
        depth: 1,
      })),
    ];
  }, [activePill]);

  // ---- Admin summary ----

  const hasAnyEdits = Object.keys(edits).length > 0;
  const editSummary = useMemo(() => {
    const byTable = new Map<string, number>();
    for (const key of Object.keys(edits)) {
      const [tableName] = key.split('::');
      byTable.set(tableName, (byTable.get(tableName) ?? 0) + 1);
    }
    return Array.from(byTable.entries())
      .map(([name, count]) => `${cleanDisplayName(name)}: ${count} edited`)
      .join(' \u00B7 ');
  }, [edits]);

  return (
    <div className="reference-view">
      {/* Pill selector (A..I + Supplemental) */}
      <div className="table-pills">
        <div className="table-pills-fade" />
        <div
          className="table-pills-scroll"
          role="tablist"
          aria-label="Reference table selection"
        >
          {MI_LETTERS.map((l) => (
            <button
              key={l}
              role="tab"
              aria-selected={activePill === l}
              className={`table-pill${activePill === l ? ' active' : ''}`}
              onClick={() => setActivePill(l)}
            >
              <span>{l}</span>
              <span className="table-pill-sub">{TABLE_SUBTITLES[l]}</span>
            </button>
          ))}
          <button
            role="tab"
            aria-selected={activePill === 'supp'}
            className={`table-pill${activePill === 'supp' ? ' active' : ''}`}
            onClick={() => setActivePill('supp')}
          >
            <span>Supp</span>
            <span className="table-pill-sub">Shared tables</span>
          </button>
        </div>
      </div>

      {/* Table + subtable cards */}
      <div
        className={`ref-section${
          activePill === 'supp' ? '' : ' ref-subtable-group'
        }`}
      >
        {renderBlocks.map((block) => (
          <RefTableCard
            key={block.id}
            id={block.id}
            tableName={block.tableName}
            isMain={block.isMain}
            settings={settings}
            adminMode={adminMode}
            edits={edits}
            touched={touched}
            autoAdjusted={autoAdjusted}
            autoRebalance={autoRebalance[block.tableName] ?? false}
            onToggleAutoRebalance={(v) =>
              setAutoRebalance((prev) => ({ ...prev, [block.tableName]: v }))
            }
            onWeightChange={(itemName, w) =>
              updateWeight(block.tableName, itemName, w)
            }
            onScrollTo={handleScrollTo}
            onApply={(enabled) => handleApply(block.tableName, enabled)}
            getEffective={(e) => getEffective(block.tableName, e)}
          />
        ))}
      </div>

      {/* Global sticky save bar (admin mode only, when edits exist) */}
      {adminMode && hasAnyEdits && (
        <div className="ref-admin-global-bar">
          <span className="ref-admin-edit-summary">
            {editSummary}
            {publishState === 'error' && publishError && (
              <span className="ref-admin-publish-error">
                {' '}
                &middot; {publishError}
              </span>
            )}
            {publishState === 'success' && (
              <span className="ref-admin-publish-success">
                {' '}
                &middot; Published &#10003;
              </span>
            )}
          </span>
          <div className="ref-admin-bar-actions">
            <button
              type="button"
              className="btn-ghost"
              onClick={handleDiscardAll}
              disabled={publishState === 'publishing'}
            >
              Discard All
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handlePublish}
              disabled={publishState === 'publishing'}
            >
              {publishState === 'publishing' ? 'Publishing\u2026' : 'Publish'}
            </button>
          </div>
        </div>
      )}

      {/* PAT modal */}
      {patModalOpen && (
        <div
          className="pat-modal-backdrop"
          onClick={() => setPatModalOpen(false)}
        >
          <div className="pat-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="pat-modal-title">GitHub Personal Access Token</h3>
            <p className="pat-modal-desc">
              Publishing requires a classic PAT with <code>repo</code> scope
              (or a fine-grained PAT with Contents: Write on this repo). The
              token is stored in your browser only — never sent anywhere but
              the GitHub API.
            </p>
            <input
              type="password"
              className="pat-modal-input"
              placeholder="ghp_..."
              value={patInput}
              onChange={(e) => setPatInput(e.target.value)}
              autoFocus
            />
            <div className="pat-modal-actions">
              <button
                className="btn-ghost"
                onClick={() => {
                  setPatModalOpen(false);
                  setPatInput('');
                }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                disabled={patInput.trim().length === 0}
                onClick={() => {
                  storePat(patInput.trim());
                  setPatInput('');
                  setPatModalOpen(false);
                  // Retry publish immediately with the newly stored PAT.
                  void handlePublish();
                }}
              >
                Save &amp; Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Table card (main table or subtable)
// ---------------------------------------------------------------------------

function RefTableCard({
  id,
  tableName,
  isMain,
  settings,
  adminMode,
  edits,
  touched,
  autoAdjusted,
  autoRebalance,
  onToggleAutoRebalance,
  onWeightChange,
  onScrollTo,
  onApply,
  getEffective,
}: {
  id: string;
  tableName: string;
  isMain: boolean;
  settings: CampaignSettings;
  adminMode: boolean;
  edits: Record<string, number>;
  touched: Set<string>;
  autoAdjusted: Set<string>;
  autoRebalance: boolean;
  onToggleAutoRebalance: (v: boolean) => void;
  onWeightChange: (itemName: string, newWeight: number) => void;
  onScrollTo: (targetTableName: string) => void;
  onApply: (autoRebalance: boolean) => void;
  getEffective: (entry: Entry) => number;
}) {
  // Raw entries from the stepper lookup (covers MAGIC_ITEMS + SUPPLEMENTAL).
  const rawEntries: Entry[] = getStepperTable(tableName) ?? [];

  // Apply edits to weights, then sort per spec §5.
  const sorted = useMemo(() => {
    return [...rawEntries]
      .map((e) => ({ ...e, weight: getEffective(e) }))
      .sort(refSort);
  }, [rawEntries, getEffective]);

  const diceRanges = useMemo(() => computeDiceRanges(sorted), [sorted]);
  const totalWeight = useMemo(
    () => sorted.reduce((s, e) => s + e.weight, 0),
    [sorted],
  );
  const target = nextDieUp(totalWeight);
  const delta = target - totalWeight;
  const fits = STANDARD_DICE.includes(totalWeight);

  const displayTitle = useMemo(() => {
    // "Magic-Item-Table-A" → "TABLE A". "Potions-A" → "POTIONS".
    const mainMatch = tableName.match(/^Magic-Item-Table-([A-I])$/);
    if (mainMatch) return `TABLE ${mainMatch[1]}`;
    return cleanDisplayName(tableName).toUpperCase();
  }, [tableName]);

  const subtitle = useMemo(() => {
    const mainMatch = tableName.match(/^Magic-Item-Table-([A-I])$/);
    if (mainMatch) return TABLE_SUBTITLES[mainMatch[1] as MITable];
    return null;
  }, [tableName]);

  return (
    <div className="ref-table-card" id={id}>
      <div className="ref-table-header">
        <span>
          <span className={`ref-table-name${isMain ? ' main' : ''}`}>
            {displayTitle}
          </span>
          {subtitle && <span className="ref-table-subtitle"> &mdash; {subtitle}</span>}
        </span>
        <span className="ref-table-die">d{target}</span>
      </div>

      <div className="ref-col-header">
        <span>Range</span>
        <span>{isMain ? 'Category' : 'Item'}</span>
        <span>Source</span>
        <span className="ref-col-header-right">Weight</span>
        <span className="ref-col-header-right">%</span>
      </div>

      <div className="ref-rows">
        {sorted.map((entry, i) => {
          const isRef =
            extractRef(entry.name) != null &&
            getStepperTable(extractRef(entry.name) as string) != null;
          const srcDisabled =
            !!entry.source && settings.sourceSettings[entry.source] === 'off';
          const k = keyFor(tableName, entry.name);
          return (
            <RefRow
              key={`${entry.name}|${entry.source}|${i}`}
              entry={entry}
              tableName={tableName}
              diceRange={diceRanges[i]}
              totalWeight={totalWeight}
              isSubtableRef={isRef}
              isSourceDisabled={srcDisabled}
              adminMode={adminMode}
              effectiveWeight={entry.weight}
              isTouched={touched.has(k)}
              isAutoAdjusted={autoAdjusted.has(k)}
              onScrollTo={onScrollTo}
              onWeightChange={(w) => onWeightChange(entry.name, w)}
            />
          );
        })}
      </div>

      {adminMode && (
        <div className="ref-admin-status">
          <span className="ref-admin-total">Total: {totalWeight}</span>
          <span
            className={`ref-admin-target${
              fits ? ' fits' : ' needs-change'
            }`}
          >
            Target: d{target}
            {fits ? ' \u2713' : ''}
          </span>
          {!fits && (
            <span className="ref-admin-delta">
              need {delta > 0 ? `+${delta}` : delta}
            </span>
          )}
          <label className="ref-admin-checkbox">
            <input
              type="checkbox"
              checked={autoRebalance}
              onChange={(e) => onToggleAutoRebalance(e.target.checked)}
            />
            Auto-rebalance
          </label>
          <button
            type="button"
            className="btn-secondary ref-admin-apply"
            disabled={!autoRebalance && !fits}
            onClick={() => onApply(autoRebalance)}
          >
            {autoRebalance
              ? `Apply & Rebalance \u2192 d${target}`
              : fits
                ? `Apply (d${totalWeight} \u2713)`
                : 'Adjust weights'}
          </button>
        </div>
      )}
    </div>
  );
}

export default ReferenceView;
