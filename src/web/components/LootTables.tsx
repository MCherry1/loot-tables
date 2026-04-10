import React, {
  useReducer,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { SPELL_TABLES } from '../../data/spells';
import { SUPPLEMENTAL_TABLES } from '../../data/supplemental';
import { CUSTOM_GEMS } from '../../data/gems';
import { CUSTOM_ART } from '../../data/art';
import { weightedPick } from '@engine/index';
import type { CampaignSettings, MITable, SourceSettings } from '@engine/index';
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MI_LETTERS: MITable[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

const SPELL_LEVEL_LABELS = [
  'Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th',
];

const EQUIPMENT_TOP_LEVEL = [
  'Armor', 'Weapons', 'Ammunition', 'Swords', 'Axes', 'Bows',
  'Dragon-Breath', 'All-Dragons', 'Damage-Type', 'Tools',
];

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
  return r.lo === r.hi ? `${r.lo}` : `${r.lo}\u2013${r.hi}`;
}

function randomInRange(r: { lo: number; hi: number }): number {
  if (r.lo === r.hi) return r.lo;
  return r.lo + Math.floor(Math.random() * (r.hi - r.lo + 1));
}

function extractGpLabel(name: string, baseValue?: number): string {
  const m = name.match(/(\d[\d,]*)-gp$/i);
  if (m) return `${Number(m[1]).toLocaleString()} gp`;
  if (baseValue != null) return `${baseValue.toLocaleString()} gp`;
  return name.replace(/-/g, ' ');
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
  | { type: 'SKIP'; sourceSettings: SourceSettings }
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
        const entries =
          getFilteredStepperTable(working.currentTable, action.sourceSettings) ??
          [];
        if (entries.length === 0) break;
        const picked = weightedPick(entries);
        const idx = entries.indexOf(picked);
        const ranges = computeDiceRanges(entries);
        const rolledNumber = randomInRange(ranges[idx]);
        working = commitPick(working, picked, idx, rolledNumber);
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

      <StackedBar entries={entries} highlightIdx={visualHighlight} />

      <div
        className={`entries-container${state.rolling ? ' rolling' : ''}`}
      >
        {entries.map((entry, i) => {
          const ref = extractRef(entry.name);
          const isHighlighted = visualHighlight === i;
          return (
            <div
              key={i}
              className={`entry-row${isHighlighted ? ' highlighted' : ''}`}
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
                {isHighlighted ? ' ✦' : ''}
              </span>
              {entry.source && (
                <span className="entry-source">{entry.source}</span>
              )}
              <span className="entry-percentage">
                {((rawEntries[i]?.weight ?? entry.weight) / totalWeight * 100).toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>

      <div className="action-bar">
        {hasResult && highlightedEntry ? (
          <>
            <button className="btn-continue" onClick={onContinue}>
              {`Continue with ${cleanDisplayName(highlightedEntry.name)} →`}
            </button>
            <button className="btn-reroll" onClick={onReroll}>
              Re-roll
            </button>
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
              <button className="btn-start-over" onClick={onStartOver}>
                {'↺ Start Over'}
              </button>
            )}
          </>
        )}
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
  onRollAgain,
  onDone,
}: {
  result: CompletedResult;
  inResolveMode: boolean;
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

  return (
    <div className="final-result-card">
      <div className="final-result-label">{'✦ Final Result ✦'}</div>
      <div className="final-result-name">{result.name}</div>
      {result.source && (
        <div className="final-result-source">{expandSource(result.source)}</div>
      )}
      <div className="final-result-chain">{chain}</div>
      <div className="final-result-actions">
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

type Section = 'magic' | 'spells' | 'supplemental' | 'gems' | 'art';

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
  const [activeSection, setActiveSection] = React.useState<Section>('magic');
  const [activeLetter, setActiveLetter] = React.useState<MITable>('A');
  const [activeSpellIdx, setActiveSpellIdx] = React.useState(0);
  const [activeEquipIdx, setActiveEquipIdx] = React.useState(0);
  const [activeGemIdx, setActiveGemIdx] = React.useState(0);
  const [activeArtIdx, setActiveArtIdx] = React.useState(0);
  // Ephemeral pick-flash highlight (purely visual; reducer is unaware).
  const [flashIdx, setFlashIdx] = React.useState<number | null>(null);

  const equipmentTables = useMemo(
    () =>
      SUPPLEMENTAL_TABLES.filter((t) =>
        EQUIPMENT_TOP_LEVEL.includes(t.name),
      ),
    [],
  );

  /** Compute the canonical root table name from current section + sub-tab. */
  const currentRootTable = useMemo(() => {
    switch (activeSection) {
      case 'magic':
        return `Magic-Item-Table-${activeLetter}`;
      case 'spells':
        return SPELL_TABLES[activeSpellIdx]?.name ?? 'Spells-Cantrip';
      case 'supplemental':
        return equipmentTables[activeEquipIdx]?.name ?? 'Armor';
      case 'gems':
        return CUSTOM_GEMS[activeGemIdx]?.name ?? 'Gems-1-25-gp';
      case 'art':
        return CUSTOM_ART[activeArtIdx]?.name ?? 'Art-1-25-gp';
    }
  }, [
    activeSection,
    activeLetter,
    activeSpellIdx,
    activeEquipIdx,
    activeGemIdx,
    activeArtIdx,
    equipmentTables,
  ]);

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

  // Encounter-resolve mode: when pendingResolve arrives, force the section
  // to magic + the matching letter, then dispatch SET_ROOT.
  useEffect(() => {
    if (!pendingResolve) return;
    const m = /Magic-Item-Table-([A-I])/.exec(pendingResolve.table);
    if (m) {
      setActiveSection('magic');
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

  // Raw entries (original weights) — used for display (ranges, die badge, %).
  const rawEntries = useMemo<Entry[]>(
    () => getStepperTable(state.currentTable) ?? [],
    [state.currentTable],
  );
  // Filtered entries (effective weights from source priority) — used for
  // probability sampling via weightedPick.
  const currentEntries = useMemo<Entry[]>(
    () =>
      getFilteredStepperTable(state.currentTable, settings.sourceSettings) ??
      [],
    [state.currentTable, settings.sourceSettings],
  );
  // Display dice ranges are always computed from raw (designed) weights.
  const diceRanges = useMemo(
    () => computeDiceRanges(rawEntries),
    [rawEntries],
  );
  const totalWeight = useMemo(
    () => rawEntries.reduce((s, e) => s + e.weight, 0),
    [rawEntries],
  );

  const handleRoll = useCallback(() => {
    if (state.rolling || currentEntries.length === 0) return;
    const picked = weightedPick(currentEntries);
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
  }, [state.rolling, currentEntries, diceRanges]);

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
    dispatch({ type: 'SKIP', sourceSettings: settings.sourceSettings });
  }, [settings.sourceSettings]);

  const handleStartOver = useCallback(() => {
    dispatch({ type: 'START_OVER' });
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
      {/* Section tabs */}
      <div className="section-tabs">
        <button
          className={`section-tab${activeSection === 'magic' ? ' active' : ''}`}
          onClick={() => setActiveSection('magic')}
        >
          Magic Items
        </button>
        <button
          className={`section-tab${activeSection === 'spells' ? ' active' : ''}`}
          onClick={() => setActiveSection('spells')}
        >
          Spells
        </button>
        <button
          className={`section-tab${
            activeSection === 'supplemental' ? ' active' : ''
          }`}
          onClick={() => setActiveSection('supplemental')}
        >
          Equipment
        </button>
        <button
          className={`section-tab${activeSection === 'gems' ? ' active' : ''}`}
          onClick={() => setActiveSection('gems')}
        >
          Gems
        </button>
        <button
          className={`section-tab${activeSection === 'art' ? ' active' : ''}`}
          onClick={() => setActiveSection('art')}
        >
          Art
        </button>
      </div>

      {/* Sub-tabs */}
      {activeSection === 'magic' && (
        <div className="letter-tabs">
          {MI_LETTERS.map((l) => (
            <button
              key={l}
              className={`letter-tab${activeLetter === l ? ' active' : ''}`}
              onClick={() => setActiveLetter(l)}
            >
              {l}
            </button>
          ))}
        </div>
      )}
      {activeSection === 'spells' && (
        <div className="sub-tabs">
          {SPELL_LEVEL_LABELS.map((label, i) => (
            <button
              key={i}
              className={`sub-tab${activeSpellIdx === i ? ' active' : ''}`}
              onClick={() => setActiveSpellIdx(i)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {activeSection === 'supplemental' && (
        <div className="sub-tabs">
          {equipmentTables.map((table, i) => (
            <button
              key={table.name}
              className={`sub-tab${activeEquipIdx === i ? ' active' : ''}`}
              onClick={() => setActiveEquipIdx(i)}
            >
              {table.name.replace(/-/g, ' ')}
            </button>
          ))}
        </div>
      )}
      {activeSection === 'gems' && (
        <div className="sub-tabs">
          {CUSTOM_GEMS.map((table, i) => (
            <button
              key={table.name}
              className={`sub-tab${activeGemIdx === i ? ' active' : ''}`}
              onClick={() => setActiveGemIdx(i)}
            >
              {extractGpLabel(table.name, table.baseValue)}
            </button>
          ))}
        </div>
      )}
      {activeSection === 'art' && (
        <div className="sub-tabs">
          {CUSTOM_ART.map((table, i) => (
            <button
              key={table.name}
              className={`sub-tab${activeArtIdx === i ? ' active' : ''}`}
              onClick={() => setActiveArtIdx(i)}
            >
              {extractGpLabel(table.name, table.baseValue)}
            </button>
          ))}
        </div>
      )}

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
          onRollAgain={handleRollAgain}
          onDone={handleDone}
        />
      ) : (
        currentEntries.length > 0 && (
          <TableCard
            tableName={state.currentTable}
            entries={currentEntries}
            rawEntries={rawEntries}
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
