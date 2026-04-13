import React, {
  useReducer,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useState,
} from 'react';
import { weightedPick } from '@engine/index';
import type { CampaignSettings, Edition, MITable, SourceSettings } from '@engine/index';
import {
  applyPickPure,
  cleanDisplayName,
  extractRef,
  getFilteredStepperTable,
  getStepperTable,
  type Entry,
  type StepRecord,
} from '../lib/stepperResolve';
import { expandSource } from '../../data/sourcebook-lookup';
import itemStatsData from '../../../data/item-stats.json';
import itemStatsData2024 from '../../../data/item-stats-2024.json';

type ItemStatsMap = Record<string, { type: string; rarity: string; attune: string; desc: string }>;
const itemStats2014 = itemStatsData as ItemStatsMap;
const itemStats2024Map = itemStatsData2024 as ItemStatsMap;

/** Build a normalized lookup: lowercase name with punctuation stripped → original key. */
function buildNormalizedIndex(stats: ItemStatsMap): Map<string, string> {
  const index = new Map<string, string>();
  for (const key of Object.keys(stats)) {
    const normalized = key.toLowerCase().replace(/[(),*]/g, '').replace(/\s+/g, ' ').replace(/\s*\|\s*/g, '|').trim();
    index.set(normalized, key);
  }
  return index;
}

const normalizedIndex2014 = buildNormalizedIndex(itemStats2014);
const normalizedIndex2024 = buildNormalizedIndex(itemStats2024Map);

/** Strip sub-table refs from an item name: "Flame Tongue [Swords]" → "Flame Tongue" */
function stripRefs(name: string): string {
  return name.replace(/\s*\[[^\]]+\]/g, '').trim();
}

/**
 * Look up item stats for a completed result.
 * Tries: direct key, normalized key, then each step's entry name.
 */
function lookupItemStats(
  result: CompletedResult,
  stats: ItemStatsMap,
  normalizedIndex: Map<string, string>,
): { type: string; rarity: string; attune: string; desc: string } | null {
  // Helper: try a key directly, then normalized
  const tryKey = (name: string, source: string): typeof stats[string] | null => {
    const key = `${name}|${source}`;
    if (stats[key]) return stats[key];
    const norm = key.toLowerCase().replace(/[(),*]/g, '').replace(/\s+/g, ' ').replace(/\s*\|\s*/g, '|').trim();
    const mapped = normalizedIndex.get(norm);
    if (mapped && stats[mapped]) return stats[mapped];
    return null;
  };

  // Helper: try a name against multiple sources
  const tryAnySrc = (name: string): typeof stats[string] | null => {
    // Try specified source first, then common sources
    const sources = [result.source, 'DMG', 'XGE', 'TCE', 'ERLW', 'FTD', 'TftYP', 'CM', 'BGG', 'KftGV', 'MOT', 'EGW', 'BMT', 'IDRotF'];
    for (const src of sources) {
      const found = tryKey(name, src);
      if (found) return found;
    }
    return null;
  };

  // 1. Try final composed name — direct match
  const direct = tryKey(result.name, result.source);
  if (direct) return direct;

  // 2. Try parentheses → comma format: "Foo (Bar)" → "Foo, Bar"
  const parenMatch = result.name.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (parenMatch) {
    const variant = parenMatch[2];
    // Strip embedded dice formulas from variant: "[[34-1d20-1]] cards" → "cards"
    const cleanVariant = variant.replace(/\[\[[^\]]+\]\]\s*/g, '').trim();
    if (cleanVariant) {
      const commaResult = tryAnySrc(`${parenMatch[1]}, ${cleanVariant}`);
      if (commaResult) return commaResult;
    }
    // Also try the base name without variant: "Deck of Illusions"
    const baseResult = tryAnySrc(parenMatch[1].trim());
    if (baseResult) return baseResult;
  }

  // 3. Try stripping embedded dice formulas from the full name
  const diceStripped = result.name.replace(/\[\[[^\]]+\]\]\s*/g, '').trim();
  if (diceStripped !== result.name) {
    const diceResult = tryAnySrc(diceStripped);
    if (diceResult) return diceResult;
  }

  // 4. Try each step's picked entry (stripped of sub-table refs)
  for (const step of result.steps) {
    const stripped = stripRefs(step.pickedEntry.name);
    if (stripped) {
      const stepResult = tryAnySrc(stripped);
      if (stepResult) return stepResult;

      // Also try parens→comma on step entries
      const stepParen = stripped.match(/^(.+?)\s*\(([^)]+)\)$/);
      if (stepParen) {
        const stepComma = tryAnySrc(`${stepParen[1]}, ${stepParen[2]}`);
        if (stepComma) return stepComma;
        // Try base name
        const stepBase = tryAnySrc(stepParen[1].trim());
        if (stepBase) return stepBase;
      }
    }
  }

  // 5. Try "Foo of Bar" → "Foo, Bar" (e.g. "Ioun Stone of Agility" → "Ioun Stone, Agility")
  const ofMatch = result.name.match(/^(.+?)\s+of\s+(.+)$/);
  if (ofMatch) {
    const commaOfResult = tryAnySrc(`${ofMatch[1]}, ${ofMatch[2]}`);
    if (commaOfResult) return commaOfResult;
  }

  // 6. Try "Foo, +N" → "+N Foo" (e.g. "Wand of the War Mage, +1" → "+1 Wand of the War Mage")
  const plusMatch = result.name.match(/^(.+),\s*(\+\d+)$/);
  if (plusMatch) {
    const prefixResult = tryAnySrc(`${plusMatch[2]} ${plusMatch[1]}`);
    if (prefixResult) return prefixResult;

    // 6b. For resolved sub-table items like "Longsword, +1", the specific
    // "+1 Longsword" won't exist — fall back to generic "+N Weapon/Armor/etc."
    const bonus = plusMatch[2];
    const genericTypes = ['Weapon', 'Armor', 'Shield', 'Ammunition'];
    for (const generic of genericTypes) {
      const genericResult = tryAnySrc(`${bonus} ${generic}`);
      if (genericResult) return genericResult;
    }
  }

  // 7. Try the result name against any source (source mismatch fallback)
  if (result.source) {
    const anyResult = tryAnySrc(result.name);
    if (anyResult) return anyResult;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MI_LETTERS: MITable[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

/** Rarity-tier subtitles shown under each letter in the scrollable pill bar. */
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

/** Muted colored-pencil palette per STEPPER-DESIGN.md. */
const SEGMENT_COLORS = [
  '#c9553a', '#c9943a', '#5a9e6f', '#7b6fb5', '#c97a3a',
  '#3a8a9e', '#b55a7b', '#5a7bb5', '#9e8a3a', '#3a9e6f',
];

function getSegmentColor(index: number): string {
  return SEGMENT_COLORS[index % SEGMENT_COLORS.length];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute display dice ranges from entry weights.
 * Always called with raw (integer) weights — source filtering is only
 * used for probability sampling, not for display.
 */
function computeDiceRanges(
  entries: { weight: number }[],
): { lo: number; hi: number }[] {
  const ranges: { lo: number; hi: number }[] = [];
  let cumulative = 0;
  for (const entry of entries) {
    const lo = cumulative + 1;
    const hi = cumulative + entry.weight;
    ranges.push({ lo, hi });
    cumulative = hi;
  }
  return ranges;
}

function formatRange(r: { lo: number; hi: number }): string {
  // Empty range (hi < lo) indicates a weight-0 cursed entry: show en-dash.
  if (r.hi < r.lo) return '\u2013';
  return r.lo === r.hi ? `${r.lo}` : `${r.lo}\u2013${r.hi}`;
}

function randomInRange(r: { lo: number; hi: number }): number {
  // Empty range: cursed entry manually picked. Report its cumulative slot.
  if (r.hi < r.lo) return r.lo;
  if (r.lo === r.hi) return r.lo;
  return r.lo + Math.floor(Math.random() * (r.hi - r.lo + 1));
}

// ---------------------------------------------------------------------------
// Integer rounding for standard-die display
// ---------------------------------------------------------------------------

const STANDARD_DICE = [4, 6, 8, 10, 12, 20, 100];

function nextDieUp(total: number): number {
  for (const d of STANDARD_DICE) {
    if (d >= total) return d;
  }
  return 100;
}

/**
 * Snap entry weights up to the next standard die using the
 * largest-remainder method (Hamilton's method) for fair integer rounding.
 *
 * Weight-0 entries (cursed items) pass through unchanged — they don't
 * contribute to the die total and remain non-rollable.
 */
function snapToStandardDie(
  entries: Entry[],
): Entry[] {
  if (entries.length === 0) return entries;
  const total = entries.reduce((s, e) => s + e.weight, 0);
  const target = nextDieUp(total);
  if (target === total) return entries;

  const ratio = target / total;
  const scaled = entries.map((e) => {
    if (e.weight === 0) {
      return { entry: e, floored: 0, remainder: 0, cursed: true };
    }
    const ideal = e.weight * ratio;
    const floored = Math.max(1, Math.floor(ideal));
    return { entry: e, floored, remainder: ideal - Math.floor(ideal), cursed: false };
  });

  let currentTotal = scaled.reduce((s, e) => s + e.floored, 0);
  const deficit = target - currentTotal;

  const byRemainder = scaled
    .map((e, i) => ({ i, remainder: e.remainder, cursed: e.cursed }))
    .filter((e) => !e.cursed)
    .sort((a, b) => b.remainder - a.remainder);

  for (let j = 0; j < deficit && j < byRemainder.length; j++) {
    scaled[byRemainder[j].i].floored += 1;
  }

  return scaled.map((e) => ({ ...e.entry, weight: e.floored }));
}

/**
 * Stable sort that moves weight-0 (cursed) entries to the bottom while
 * preserving original relative order within each group.
 */
function cursedToBottom(entries: Entry[]): Entry[] {
  const weighted: Entry[] = [];
  const cursed: Entry[] = [];
  for (const e of entries) {
    if (e.weight === 0) cursed.push(e);
    else weighted.push(e);
  }
  return cursed.length === 0 ? entries : [...weighted, ...cursed];
}

// ---------------------------------------------------------------------------
// Stepper state + reducer
// ---------------------------------------------------------------------------

type CompletedResult = {
  name: string;
  source: string;
  steps: StepRecord[];
  timestamp: number;
};

type StepperState = {
  rootTable: string;
  currentTable: string;
  steps: StepRecord[];
  composedName: string | null;
  highlightIdx: number | null;
  rolledNumber: number | null;
  rolling: boolean;
  finished: boolean;
  lastSource: string;
  resultHistory: CompletedResult[];
};

type StepperAction =
  | { type: 'SET_ROOT'; rootTable: string }
  | { type: 'HIGHLIGHT'; idx: number; rolledNumber: number }
  | { type: 'ROLL_START' }
  | { type: 'ADVANCE'; entries: Entry[] }
  | { type: 'COMMIT_PICK'; entry: Entry; idx: number; rolledNumber: number }
  | { type: 'SKIP'; sourceSettings: SourceSettings; edition?: Edition }
  | { type: 'STEP_BACK' }
  | { type: 'START_OVER' }
  | { type: 'CLEAR_HISTORY' };

function makeInitialState(rootTable: string): StepperState {
  return {
    rootTable,
    currentTable: rootTable,
    steps: [],
    composedName: null,
    highlightIdx: null,
    rolledNumber: null,
    rolling: false,
    finished: false,
    lastSource: '',
    resultHistory: [],
  };
}

/** Commit a single pick to the state. Pure. */
function commitPick(
  state: StepperState,
  entry: Entry,
  idx: number,
  rolledNumber: number,
): StepperState {
  const stepRecord: StepRecord = {
    tableName: state.currentTable,
    pickedEntry: {
      name: entry.name,
      source: entry.source ?? '',
      weight: entry.weight,
    },
    pickedIdx: idx,
    rolledNumber,
  };
  const newSteps = [...state.steps, stepRecord];
  const lastSource = entry.source || state.lastSource;

  const result = applyPickPure(state.composedName, entry.name);

  if (!result.finished && result.nextTable) {
    return {
      ...state,
      steps: newSteps,
      composedName: result.composedName,
      currentTable: result.nextTable,
      highlightIdx: null,
      rolledNumber: null,
      rolling: false,
      finished: false,
      lastSource,
    };
  }

  // Terminal — finished.
  const finalName = cleanDisplayName(result.composedName);
  const completed: CompletedResult = {
    name: finalName,
    source: lastSource,
    steps: newSteps,
    timestamp: Date.now(),
  };
  return {
    ...state,
    steps: newSteps,
    composedName: result.composedName,
    highlightIdx: null,
    rolledNumber: null,
    rolling: false,
    finished: true,
    lastSource,
    resultHistory: [completed, ...state.resultHistory],
  };
}

function stepperReducer(
  state: StepperState,
  action: StepperAction,
): StepperState {
  switch (action.type) {
    case 'SET_ROOT': {
      if (
        action.rootTable === state.rootTable &&
        state.steps.length === 0 &&
        !state.finished &&
        state.highlightIdx == null
      ) {
        return state; // already at clean root, no-op
      }
      return {
        ...makeInitialState(action.rootTable),
        resultHistory: state.resultHistory,
      };
    }

    case 'HIGHLIGHT':
      return {
        ...state,
        highlightIdx: action.idx,
        rolledNumber: action.rolledNumber,
        rolling: false,
      };

    case 'ROLL_START':
      return {
        ...state,
        rolling: true,
        highlightIdx: null,
        rolledNumber: null,
      };

    case 'ADVANCE': {
      if (state.highlightIdx == null) return state;
      const entry = action.entries[state.highlightIdx];
      if (!entry) return state;
      return commitPick(
        state,
        entry,
        state.highlightIdx,
        state.rolledNumber ?? 0,
      );
    }

    case 'COMMIT_PICK':
      return commitPick(state, action.entry, action.idx, action.rolledNumber);

    case 'SKIP': {
      // Auto-resolve from the current state until finished.
      let working = state;
      // Hard cap.
      for (let i = 0; i < 32; i++) {
        if (working.finished) break;
        const entries = cursedToBottom(
          getFilteredStepperTable(working.currentTable, action.sourceSettings, action.edition) ??
          [],
        );
        if (entries.length === 0) break;
        // Cursed (weight-0) entries never resolve via auto-skip.
        const rollable = entries.filter((e) => e.weight > 0);
        if (rollable.length === 0) break;
        const picked = weightedPick(rollable);
        const idx = entries.indexOf(picked);
        const ranges = computeDiceRanges(entries);
        const rolledNumber = randomInRange(ranges[idx]);
        working = commitPick(working, picked, idx, rolledNumber);
      }
      return working;
    }

    case 'STEP_BACK': {
      if (state.steps.length === 0) return state;
      // Replay all steps except the last one from scratch
      const prevSteps = state.steps.slice(0, -1);
      let working: StepperState = {
        ...makeInitialState(state.rootTable),
        resultHistory: state.resultHistory,
      };
      for (const step of prevSteps) {
        working = commitPick(
          working,
          step.pickedEntry as Entry,
          step.pickedIdx,
          step.rolledNumber,
        );
      }
      return working;
    }

    case 'START_OVER':
      return {
        ...makeInitialState(state.rootTable),
        resultHistory: state.resultHistory,
      };

    case 'CLEAR_HISTORY':
      return { ...state, resultHistory: [] };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// StackedBar (probability bar)
// ---------------------------------------------------------------------------

function StackedBar({
  entries,
  highlightIdx,
}: {
  entries: { weight: number }[];
  highlightIdx: number | null;
}) {
  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  if (totalWeight === 0) return null;

  return (
    <div
      className={`probability-bar${
        highlightIdx != null ? ' dimmed' : ''
      }`}
    >
      {entries.map((entry, i) => {
        const pct = (entry.weight / totalWeight) * 100;
        const isActive = highlightIdx === i;
        return (
          <div
            key={i}
            className={`probability-segment${isActive ? ' winner' : ''}`}
            style={{
              width: `${pct}%`,
              backgroundColor: getSegmentColor(i),
            }}
            title={`${Math.round(pct)}%`}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table Card
// ---------------------------------------------------------------------------

function TableCard({
  tableName,
  entries,
  rawEntries,
  diceRanges,
  totalWeight,
  state,
  flashIdx,
  onPick,
  onRoll,
  onReroll,
  onContinue,
  onSkip,
  onStartOver,
  onStepBack,
}: {
  tableName: string;
  entries: Entry[];
  rawEntries: Entry[];
  diceRanges: { lo: number; hi: number }[];
  totalWeight: number;
  state: StepperState;
  flashIdx: number | null;
  onPick: (entry: Entry, idx: number) => void;
  onRoll: () => void;
  onReroll: () => void;
  onContinue: () => void;
  onSkip: () => void;
  onStartOver: () => void;
  onStepBack: () => void;
}) {
  const cleanedTitle = cleanDisplayName(tableName);
  const showStartOver = state.steps.length > 0;
  // Visual highlight: prefer the rolled-result highlight, fall back to the
  // ephemeral pick-flash that the parent component manages.
  const visualHighlight = state.highlightIdx ?? flashIdx;
  // Action bar / Continue button only react to a real rolled result, never
  // to the pick-flash (manual picks advance immediately).
  const hasResult = state.highlightIdx != null && !state.rolling;
  const highlightedEntry =
    state.highlightIdx != null ? entries[state.highlightIdx] : null;

  return (
    <div className="table-card" key={tableName}>
      <div className="table-card-header">
        <span className="table-card-title">{cleanedTitle}</span>
        <span className="dice-badge">d{totalWeight}</span>
      </div>

      <StackedBar entries={rawEntries} highlightIdx={visualHighlight} />

      <div className="action-bar">
        {hasResult && highlightedEntry ? (
          <>
            {state.rolledNumber != null && (
              <span className="rolled-badge">Rolled: {state.rolledNumber}</span>
            )}
            <button className="btn-continue" onClick={onContinue}>
              {`Continue with ${cleanDisplayName(highlightedEntry.name)} →`}
            </button>
            <button className="btn-reroll" onClick={onReroll}>
              Re-roll
            </button>
            {showStartOver && (
              <button className="btn-step-back" onClick={onStepBack}>
                {'← Back'}
              </button>
            )}
            {showStartOver && (
              <button className="btn-start-over" onClick={onStartOver}>
                {'↺ Start Over'}
              </button>
            )}
          </>
        ) : (
          <>
            <button
              className="btn-roll"
              onClick={onRoll}
              disabled={state.rolling}
            >
              {`🎲 Roll d${totalWeight}`}
            </button>
            <button className="btn-skip" onClick={onSkip}>
              {'Skip ▸▸'}
            </button>
            {showStartOver && (
              <button className="btn-step-back" onClick={onStepBack}>
                {'← Back'}
              </button>
            )}
            {showStartOver && (
              <button className="btn-start-over" onClick={onStartOver}>
                {'↺ Start Over'}
              </button>
            )}
          </>
        )}
      </div>

      <div
        className={`entries-container${state.rolling ? ' rolling' : ''}`}
      >
        {entries.map((entry, i) => {
          const ref = extractRef(entry.name);
          const isHighlighted = visualHighlight === i;
          const isCursed = entry.weight === 0;
          const displayWeight = rawEntries[i]?.weight ?? entry.weight;
          return (
            <div
              key={i}
              className={`entry-row${isHighlighted ? ' highlighted' : ''}${isCursed ? ' cursed' : ''}`}
              onClick={() => onPick(entry, i)}
            >
              <span className="entry-dice-range">
                {formatRange(diceRanges[i])}
              </span>
              <span
                className="entry-color-dot"
                style={{ backgroundColor: getSegmentColor(i) }}
              />
              <span
                className={`entry-name${ref ? ' has-ref' : ''}`}
              >
                {cleanDisplayName(entry.name)}
                {isCursed && <span className="cursed-tag">Cursed</span>}
                {isHighlighted ? ' ✦' : ''}
              </span>
              {entry.source && (
                <span className="entry-source">{entry.source}</span>
              )}
              <span className="entry-percentage">
                {totalWeight > 0
                  ? `${((displayWeight / totalWeight) * 100).toFixed(1)}%`
                  : '–'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Breadcrumb
// ---------------------------------------------------------------------------

function Breadcrumb({
  steps,
  currentTable,
  onJumpToRoot,
}: {
  steps: StepRecord[];
  currentTable: string;
  onJumpToRoot: () => void;
}) {
  // crumbs = each step's table (in order), plus the current table at the end.
  // The first step's tableName equals the rootTable, so we don't need to
  // pass it separately.
  const crumbs: { label: string; isCurrent: boolean }[] = [];
  for (const step of steps) {
    crumbs.push({
      label: cleanDisplayName(step.tableName),
      isCurrent: false,
    });
  }
  crumbs.push({
    label: cleanDisplayName(currentTable),
    isCurrent: true,
  });

  return (
    <nav className="breadcrumb" aria-label="Resolution path">
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="breadcrumb-sep">›</span>}
          {c.isCurrent ? (
            <span className="breadcrumb-step current">{c.label}</span>
          ) : (
            <button
              className="breadcrumb-step"
              onClick={onJumpToRoot}
              title="Jump back to the root table"
            >
              {c.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Context Bar ("What you're building")
// ---------------------------------------------------------------------------

const COMPOSED_REF_GLOBAL = /\[([A-Za-z][A-Za-z0-9_-]*)\]/g;

function ContextBar({ composedName }: { composedName: string }) {
  // Tokenize the composed string into text and ref-chip nodes.
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  COMPOSED_REF_GLOBAL.lastIndex = 0;
  while ((match = COMPOSED_REF_GLOBAL.exec(composedName)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(composedName.slice(lastIndex, match.index));
    }
    nodes.push(
      <span className="ref-chip" key={`chip-${match.index}`}>
        {cleanDisplayName(match[1]).toLowerCase()}
      </span>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < composedName.length) {
    nodes.push(composedName.slice(lastIndex));
  }

  return (
    <div className="context-bar">
      {nodes.map((n, i) => (
        <React.Fragment key={i}>{n}</React.Fragment>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Final Result Card
// ---------------------------------------------------------------------------

function FinalResultCard({
  result,
  inResolveMode,
  showItemDetails,
  itemStatsMap,
  normalizedIndex,
  onStepBack,
  onRollAgain,
  onDone,
}: {
  result: CompletedResult;
  inResolveMode: boolean;
  showItemDetails: boolean;
  itemStatsMap: ItemStatsMap;
  normalizedIndex: Map<string, string>;
  onStepBack: () => void;
  onRollAgain: () => void;
  onDone: () => void;
}) {
  const chain = result.steps
    .map((s, i) => {
      const tableLabel = cleanDisplayName(s.tableName);
      const pickLabel = cleanDisplayName(s.pickedEntry.name);
      const sep = i < result.steps.length - 1 ? ' → ' : '';
      return `${tableLabel}: ${pickLabel}${sep}`;
    })
    .join('');

  const stats = showItemDetails ? lookupItemStats(result, itemStatsMap, normalizedIndex) : null;
  // A result is cursed iff any step in its resolution chain picked a weight-0 entry.
  const isCursed = result.steps.some((s) => s.pickedEntry.weight === 0);

  return (
    <div className="final-result-card">
      <div className="final-result-label">{'✦ Final Result ✦'}</div>
      <div className="final-result-name">
        {result.name}
        {isCursed && <span className="cursed-tag">Cursed Item</span>}
      </div>
      {result.source && (
        <div className="final-result-source">{expandSource(result.source)}</div>
      )}
      {stats && (
        <div className="final-result-details">
          <div className="final-result-meta">
            <span className="result-rarity">{stats.rarity}</span>
            {stats.attune && stats.attune !== 'No' && (
              <span className="result-attune">
                Attunement{stats.attune !== 'true' && stats.attune !== 'True' ? `: ${stats.attune}` : ''}
              </span>
            )}
          </div>
          {stats.desc && (
            <div className="final-result-desc">
              {stats.desc.split('\n\n').map((para, pi) => (
                <div key={pi} className="desc-paragraph">
                  {para.split('\n').map((line, li) => (
                    <p key={li}>{line}</p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="final-result-chain">{chain}</div>
      <div className="final-result-actions">
        <button className="btn-step-back" onClick={onStepBack}>
          {'← Back'}
        </button>
        <button className="btn-roll-again" onClick={onRollAgain}>
          Roll Again
        </button>
        {inResolveMode && (
          <button className="btn-done" onClick={onDone}>
            {'Done — Return to Encounter'}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result History
// ---------------------------------------------------------------------------

function ResultHistory({
  results,
  onClear,
}: {
  results: CompletedResult[];
  onClear: () => void;
}) {
  if (results.length === 0) {
    return (
      <div className="result-history">
        <div className="result-history-header">
          <span>Results</span>
        </div>
        <div className="result-history-empty">
          No rolls yet. Roll a table to start your binder.
        </div>
      </div>
    );
  }

  return (
    <div className="result-history">
      <div className="result-history-header">
        <span>Results</span>
        <button className="btn-clear-history" onClick={onClear}>
          Clear
        </button>
      </div>
      <ul className="result-history-list">
        {results.map((r) => (
          <li className="result-entry" key={r.timestamp}>
            <div className="result-entry-name">
              <span className="result-entry-mark">✦</span> {r.name}
              {r.source && (
                <span className="result-entry-source">
                  {expandSource(r.source)}
                </span>
              )}
            </div>
            <div className="result-entry-chain">
              {r.steps
                .map((s) => cleanDisplayName(s.tableName))
                .join(' › ')}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main LootTables component
// ---------------------------------------------------------------------------

// No section tabs — this component only shows Magic Item Tables A–I.

export interface LootTablesProps {
  settings: CampaignSettings;
  pendingResolve?: { itemId: string; table: string } | null;
  onResolveComplete?: (
    itemId: string,
    result: { name: string; source: string },
  ) => void;
  onCancelResolve?: () => void;
}

const LootTables: React.FC<LootTablesProps> = ({
  settings,
  pendingResolve,
  onResolveComplete,
}) => {
  const [activeLetter, setActiveLetter] = React.useState<MITable>('A');
  // Ephemeral pick-flash highlight (purely visual; reducer is unaware).
  const [flashIdx, setFlashIdx] = React.useState<number | null>(null);

  /** Root table name from current letter tab. */
  const currentRootTable = useMemo(
    () => `Magic-Item-Table-${activeLetter}`,
    [activeLetter],
  );

  const [state, dispatch] = useReducer(
    stepperReducer,
    `Magic-Item-Table-${activeLetter}`,
    makeInitialState,
  );

  // Reset stepper whenever the user changes section/sub-tab.
  // (Only fires when currentRootTable string actually changes.)
  const lastRootRef = useRef(state.rootTable);
  useEffect(() => {
    if (currentRootTable !== lastRootRef.current) {
      lastRootRef.current = currentRootTable;
      setFlashIdx(null);
      dispatch({ type: 'SET_ROOT', rootTable: currentRootTable });
    }
  }, [currentRootTable]);

  // Encounter-resolve mode: when pendingResolve arrives, force the matching
  // letter tab, then dispatch SET_ROOT.
  useEffect(() => {
    if (!pendingResolve) return;
    const m = /Magic-Item-Table-([A-I])/.exec(pendingResolve.table);
    if (m) {
      setActiveLetter(m[1] as MITable);
    }
    lastRootRef.current = pendingResolve.table;
    dispatch({ type: 'SET_ROOT', rootTable: pendingResolve.table });
  }, [pendingResolve]);

  // ---- Action handlers ----

  // Track timeouts so they can be cleared on unmount / state change.
  const rollTimerRef = useRef<number | null>(null);
  const pickTimerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (rollTimerRef.current != null) {
        window.clearTimeout(rollTimerRef.current);
      }
      if (pickTimerRef.current != null) {
        window.clearTimeout(pickTimerRef.current);
      }
    };
  }, []);

  // ---- 3D Dice (dice-box) ----
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const diceBoxRef = useRef<any>(null);
  const diceBoxInitRef = useRef(false);
  const [showDiceOverlay, setShowDiceOverlay] = useState(false);

  useEffect(() => {
    if (!settings.dice3d || diceBoxInitRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const mod = await import('@3d-dice/dice-box');
        const DiceBox = mod.default;
        const basePath = import.meta.env.BASE_URL || '/loot-tables/';
        const box = new DiceBox({
          container: '#dice-overlay',
          assetPath: `${basePath}assets/dice-box/`,
          scale: 16,
          gravity: 6,
          theme: 'default',
          themeColor: settings.diceColor ?? '#f5ede0',
          offscreen: true,
        });
        await box.init();
        if (!cancelled) {
          diceBoxRef.current = box;
          diceBoxInitRef.current = true;
        }
      } catch (err) {
        console.warn('[dice-box] Failed to initialize 3D dice:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [settings.dice3d]);

  // Update dice color when setting changes
  useEffect(() => {
    if (diceBoxRef.current && settings.diceColor) {
      try {
        diceBoxRef.current.updateConfig({ themeColor: settings.diceColor });
      } catch {
        // dice-box may not support updateConfig in all versions
      }
    }
  }, [settings.diceColor]);

  const edition = settings.edition ?? '2014';
  const currentItemStats = edition === '2024' ? itemStats2024Map : itemStats2014;
  const currentNormalizedIndex = edition === '2024' ? normalizedIndex2024 : normalizedIndex2014;

  // Raw entries (original weights) — full table before source filtering.
  // Weight-0 cursed items are sorted to the bottom.
  const rawEntries = useMemo<Entry[]>(
    () => cursedToBottom(getStepperTable(state.currentTable, edition) ?? []),
    [state.currentTable, edition],
  );
  // Filtered entries (effective weights from source priority) — used for
  // probability sampling via weightedPick. Same cursed-bottom ordering as
  // rawEntries so indexes line up across render and roll paths.
  const currentEntries = useMemo<Entry[]>(
    () =>
      cursedToBottom(
        getFilteredStepperTable(state.currentTable, settings.sourceSettings, edition) ??
          [],
      ),
    [state.currentTable, settings.sourceSettings, edition],
  );
  // Display entries: snap weights to next standard die for clean dice ranges.
  // Curation overrides or source filtering can produce non-standard totals.
  // Snap to next standard die for clean dice ranges.
  const displayEntries = useMemo<Entry[]>(() => {
    if (currentEntries.length === rawEntries.length) {
      // No source filtering — use raw weights but snap if needed
      const total = rawEntries.reduce((s, e) => s + e.weight, 0);
      const target = nextDieUp(total);
      if (total === target) return rawEntries;
      return snapToStandardDie(rawEntries);
    }
    // Source filtering active — filter then snap
    const survivorKeys = new Set(
      currentEntries.map((e) => `${e.name}|${e.source ?? ''}`),
    );
    const filtered = rawEntries.filter(
      (e) => !e.source || survivorKeys.has(`${e.name}|${e.source ?? ''}`),
    );
    return snapToStandardDie(filtered);
  }, [rawEntries, currentEntries]);
  // Display dice ranges and total use snapped display weights.
  const diceRanges = useMemo(
    () => computeDiceRanges(displayEntries),
    [displayEntries],
  );
  const totalWeight = useMemo(
    () => displayEntries.reduce((s, e) => s + e.weight, 0),
    [displayEntries],
  );

  const handleRoll = useCallback(() => {
    if (state.rolling || currentEntries.length === 0) return;
    // Cursed (weight-0) entries are never rolled — only picked manually.
    const rollable = currentEntries.filter((e) => e.weight > 0);
    if (rollable.length === 0) return;

    // 3D dice path: roll a physical die and map the result to an entry
    if (settings.dice3d && diceBoxRef.current && STANDARD_DICE.includes(totalWeight)) {
      dispatch({ type: 'ROLL_START' });
      setShowDiceOverlay(true);
      const box = diceBoxRef.current;
      box.onRollComplete = (results: { value: number }[]) => {
        const rolledNumber = results[0]?.value ?? 1;
        // Map rolled number to entry via dice ranges
        let hitIdx = 0;
        for (let i = 0; i < diceRanges.length; i++) {
          if (rolledNumber >= diceRanges[i].lo && rolledNumber <= diceRanges[i].hi) {
            hitIdx = i;
            break;
          }
        }
        rollTimerRef.current = window.setTimeout(() => {
          rollTimerRef.current = null;
          setShowDiceOverlay(false);
          box.clear();
          dispatch({ type: 'HIGHLIGHT', idx: hitIdx, rolledNumber });
        }, 400);
      };
      box.roll(`1d${totalWeight}`);
      return;
    }

    // Fallback: CSS animation path
    const picked = weightedPick(rollable);
    const idx = currentEntries.indexOf(picked);
    const rolledNumber = randomInRange(diceRanges[idx]);
    dispatch({ type: 'ROLL_START' });
    if (rollTimerRef.current != null) {
      window.clearTimeout(rollTimerRef.current);
    }
    rollTimerRef.current = window.setTimeout(() => {
      rollTimerRef.current = null;
      dispatch({ type: 'HIGHLIGHT', idx, rolledNumber });
    }, 400);
  }, [state.rolling, currentEntries, diceRanges, settings.dice3d, totalWeight]);

  const handlePick = useCallback(
    (entry: Entry, idx: number) => {
      if (state.rolling) return;
      const rolledNumber = randomInRange(diceRanges[idx]);
      // Visual flash only — no reducer state change yet.
      setFlashIdx(idx);
      if (pickTimerRef.current != null) {
        window.clearTimeout(pickTimerRef.current);
      }
      pickTimerRef.current = window.setTimeout(() => {
        pickTimerRef.current = null;
        setFlashIdx(null);
        dispatch({ type: 'COMMIT_PICK', entry, idx, rolledNumber });
      }, 150);
    },
    [state.rolling, diceRanges],
  );

  const handleContinue = useCallback(() => {
    dispatch({ type: 'ADVANCE', entries: currentEntries });
  }, [currentEntries]);

  const handleReroll = useCallback(() => {
    handleRoll();
  }, [handleRoll]);

  const handleSkip = useCallback(() => {
    dispatch({ type: 'SKIP', sourceSettings: settings.sourceSettings, edition });
  }, [settings.sourceSettings]);

  const handleStartOver = useCallback(() => {
    dispatch({ type: 'START_OVER' });
  }, []);

  const handleStepBack = useCallback(() => {
    dispatch({ type: 'STEP_BACK' });
  }, []);

  const handleClearHistory = useCallback(() => {
    dispatch({ type: 'CLEAR_HISTORY' });
  }, []);

  const handleRollAgain = useCallback(() => {
    dispatch({ type: 'START_OVER' });
  }, []);

  const handleDone = useCallback(() => {
    if (!pendingResolve || !onResolveComplete) return;
    const latest = state.resultHistory[0];
    if (!latest) return;
    onResolveComplete(pendingResolve.itemId, {
      name: latest.name,
      source: latest.source,
    });
  }, [pendingResolve, onResolveComplete, state.resultHistory]);

  // ---- Render helpers ----

  const inResolveMode = !!pendingResolve;
  const showContextBar =
    state.composedName != null && !state.finished && state.steps.length > 0;
  const showBreadcrumb = state.steps.length > 0 && !state.finished;
  const finalResult = state.finished ? state.resultHistory[0] : null;

  return (
    <div className="card loot-tables-card">
      {/* 3D dice overlay */}
      <div
        id="dice-overlay"
        className={`dice-overlay${showDiceOverlay ? ' visible' : ''}`}
      />
      {/* Table letter pills (A–I, scrollable) */}
      <div className="table-pills">
        <div className="table-pills-fade" />
        <div
          className="table-pills-scroll"
          role="tablist"
          aria-label="Loot table selection"
        >
          {MI_LETTERS.map((l) => (
            <button
              key={l}
              role="tab"
              aria-selected={activeLetter === l}
              className={`table-pill${activeLetter === l ? ' active' : ''}`}
              onClick={() => {
                if (l === activeLetter) {
                  // Already on this letter — reset stepper to root table
                  setFlashIdx(null);
                  dispatch({ type: 'SET_ROOT', rootTable: `Magic-Item-Table-${l}` });
                } else {
                  setActiveLetter(l);
                }
              }}
            >
              <span>{l}</span>
              <span className="table-pill-sub">{TABLE_SUBTITLES[l]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Breadcrumb + Context Bar */}
      {showBreadcrumb && (
        <Breadcrumb
          steps={state.steps}
          currentTable={state.currentTable}
          onJumpToRoot={handleStartOver}
        />
      )}
      {showContextBar && state.composedName != null && (
        <ContextBar composedName={state.composedName} />
      )}

      {/* Stepper body: either a TableCard or the Final Result */}
      {finalResult ? (
        <FinalResultCard
          result={finalResult}
          inResolveMode={inResolveMode}
          showItemDetails={settings.showItemDetails ?? false}
          itemStatsMap={currentItemStats}
          normalizedIndex={currentNormalizedIndex}
          onStepBack={handleStepBack}
          onRollAgain={handleRollAgain}
          onDone={handleDone}
        />
      ) : (
        currentEntries.length > 0 && (
          <TableCard
            tableName={state.currentTable}
            entries={currentEntries}
            rawEntries={displayEntries}
            diceRanges={diceRanges}
            totalWeight={totalWeight}
            state={state}
            flashIdx={flashIdx}
            onPick={handlePick}
            onRoll={handleRoll}
            onReroll={handleReroll}
            onContinue={handleContinue}
            onSkip={handleSkip}
            onStartOver={handleStartOver}
            onStepBack={handleStepBack}
          />
        )
      )}

      {/* Result History */}
      <ResultHistory
        results={state.resultHistory}
        onClear={handleClearHistory}
      />
    </div>
  );
};

export default LootTables;
