import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MAGIC_ITEMS } from '../../data/magic-items';
import { SPELL_TABLES } from '../../data/spells';
import { SUPPLEMENTAL_TABLES } from '../../data/supplemental';
import { CUSTOM_GEMS } from '../../data/gems';
import { CUSTOM_ART } from '../../data/art';
import { ALL_TABLES, weightedPick } from '@engine/index';
import type { MITable } from '@engine/index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Entry = { name: string; source?: string; weight: number };

/** Tables that should display as subtype dropdowns instead of nested rolls. */
const SUBTYPE_DROPDOWN_TABLES = new Set([
  'Armor', 'Weapons', 'Swords', 'Axes', 'Bows', 'Ranged',
]);

/** Parent tables whose children should show grouped in a dropdown. */
const SUBTYPE_GROUPS: Record<string, string[]> = {
  'Armor': ['Light-Armor', 'Medium-Armor', 'Heavy-Armor'],
  'Weapons': ['Simple-Melee', 'Simple-Ranged', 'Martial-Melee', 'Martial-Ranged'],
  'Ranged': ['Simple-Ranged', 'Martial-Ranged'],
};

/** Regex for detecting subtable refs like [Potions-A]. */
const REF_RE = /\[([A-Za-z][A-Za-z0-9_-]*)\]/;

function extractRef(name: string): string | null {
  const m = REF_RE.exec(name);
  return m ? m[1] : null;
}

/** Strip bracket refs from an entry name for clean display. */
function cleanDisplayName(name: string): string {
  return name.replace(/\[([A-Za-z][A-Za-z0-9_-]*)\]/g, '$1').replace(/-/g, ' ');
}

function isSubtypeTable(tableName: string): boolean {
  return SUBTYPE_DROPDOWN_TABLES.has(tableName);
}

/** Get all terminal items for a subtype table, grouped by sub-category. */
function getSubtypeItems(tableName: string): { group: string; items: Entry[] }[] {
  const groups = SUBTYPE_GROUPS[tableName];
  if (groups) {
    return groups.map((groupName) => {
      const table = ALL_TABLES[groupName];
      return {
        group: groupName.replace(/-/g, ' '),
        items: table ? [...table] : [],
      };
    });
  }
  const table = ALL_TABLES[tableName];
  if (!table) return [];
  return [{ group: tableName, items: [...table] }];
}

// ---------------------------------------------------------------------------
// Dice range computation
// ---------------------------------------------------------------------------

function computeDiceRanges(entries: { weight: number }[]): string[] {
  const ranges: string[] = [];
  let cumulative = 0;
  for (const entry of entries) {
    const lo = cumulative + 1;
    const hi = cumulative + entry.weight;
    ranges.push(lo === hi ? `${lo}` : `${lo}\u2013${hi}`);
    cumulative = hi;
  }
  return ranges;
}

// ---------------------------------------------------------------------------
// Color palette for stacked bar segments
// ---------------------------------------------------------------------------

const SEGMENT_COLORS = [
  '#e94560', '#c9a84c', '#7fccbf', '#a78bfa', '#f97316',
  '#34d399', '#f472b6', '#60a5fa', '#fbbf24', '#6ee7b7',
  '#e879f9', '#fb923c', '#38bdf8', '#f87171', '#4ade80',
  '#c084fc', '#facc15', '#2dd4bf', '#f9a8d4', '#818cf8',
];

function getSegmentColor(index: number): string {
  return SEGMENT_COLORS[index % SEGMENT_COLORS.length];
}

// ---------------------------------------------------------------------------
// Magic Item table letter tabs
// ---------------------------------------------------------------------------

const MI_LETTERS: MITable[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

function getMITableEntries(letter: MITable): Entry[] {
  const key = `Magic-Item-Table-${letter}`;
  const table = (MAGIC_ITEMS as Record<string, Entry[]>)[key];
  return table || [];
}

function getSubtableEntries(name: string): Entry[] | null {
  const table = ALL_TABLES[name];
  return table ? [...table] : null;
}

// ---------------------------------------------------------------------------
// Dice Animation Component
// ---------------------------------------------------------------------------

function DiceAnimation({ rolling }: { rolling: boolean }) {
  if (!rolling) return null;
  return (
    <div className="dice-overlay">
      <div className="dice-bounce">
        <div className="dice-face">
          <span className="dice-dot dot-1" />
          <span className="dice-dot dot-2" />
          <span className="dice-dot dot-3" />
          <span className="dice-dot dot-4" />
          <span className="dice-dot dot-5" />
          <span className="dice-dot dot-6" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stacked Probability Bar
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
    <div className="stacked-bar">
      {entries.map((entry, i) => {
        const pct = (entry.weight / totalWeight) * 100;
        const isActive = highlightIdx === i;
        return (
          <div
            key={i}
            className={`stacked-segment${isActive ? ' active' : ''}`}
            style={{
              width: `${pct}%`,
              backgroundColor: getSegmentColor(i),
              opacity: highlightIdx != null && !isActive ? 0.3 : 1,
            }}
            title={`${Math.round(pct)}%`}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Roll Result Banner (shown at top)
// ---------------------------------------------------------------------------

function RollResultBanner({
  entry,
  colorIdx,
  diceRange,
}: {
  entry: Entry;
  colorIdx: number;
  diceRange: string;
}) {
  return (
    <div
      className="roll-result-banner"
      style={{ borderLeftColor: getSegmentColor(colorIdx) }}
    >
      <span className="roll-result-dice">{diceRange}</span>
      <span className="roll-result-name">{cleanDisplayName(entry.name)}</span>
      {entry.source && <span className="roll-result-source">({entry.source})</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

/** Subtype dropdown for Armor/Weapons when resolving an entry. */
function SubtypeDropdown({
  tableName,
  onSelect,
}: {
  tableName: string;
  onSelect: (item: string) => void;
}) {
  const groups = getSubtypeItems(tableName);
  const [value, setValue] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (v) {
      setValue(v);
      onSelect(v);
    }
  };

  return (
    <select
      className="subtype-dropdown"
      value={value}
      onChange={handleChange}
    >
      <option value="">-- Select {tableName.replace(/-/g, ' ')} --</option>
      {groups.map((g) => (
        <optgroup key={g.group} label={g.group}>
          {g.items.map((item, i) => (
            <option key={`${g.group}-${i}`} value={item.name}>
              {item.name}
              {item.source ? ` (${item.source})` : ''}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

/** A single table entry row. */
function TableEntryRow({
  entry,
  isHighlighted,
  isClickable,
  diceRange,
  colorIdx,
  onClick,
}: {
  entry: Entry;
  isHighlighted: boolean;
  isClickable: boolean;
  diceRange?: string;
  colorIdx?: number;
  onClick?: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={rowRef}
      className={`table-entry-row${isHighlighted ? ' highlighted' : ''}${isClickable ? ' clickable' : ''}`}
      onClick={isClickable ? onClick : undefined}
    >
      {diceRange && <span className="entry-dice-range">{diceRange}</span>}
      <span
        className="entry-color-dot"
        style={{ backgroundColor: getSegmentColor(colorIdx ?? 0) }}
      />
      <span className="entry-name">{cleanDisplayName(entry.name)}</span>
      {entry.source && <span className="entry-source">({entry.source})</span>}
    </div>
  );
}

/** Resolution chain: shows the step-by-step resolution path. */
function ResolutionChain({
  steps,
}: {
  steps: { tableName: string; result: string; isSubtype?: boolean; subtypeTable?: string }[];
}) {
  return (
    <div className="resolution-chain">
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="chain-arrow">&rarr;</span>}
          <span className="chain-step">
            <span className="chain-table">{step.tableName}</span>
            <span className="chain-result">{cleanDisplayName(step.result)}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

/** Custom hook for dice roll animation timing. */
function useDiceAnimation() {
  const [rolling, setRolling] = useState(false);

  const triggerRoll = useCallback(() => {
    setRolling(true);
    setTimeout(() => setRolling(false), 800);
  }, []);

  return { rolling, triggerRoll };
}

/** Interactive view of a single magic item table (A-I). */
function MITableView({ letter }: { letter: MITable }) {
  const entries = getMITableEntries(letter);
  const totalWeight = entries.reduce((s, e) => s + e.weight, 0);
  const diceRanges = computeDiceRanges(entries);
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);
  const [resolutionSteps, setResolutionSteps] = useState<
    { tableName: string; result: string; isSubtype?: boolean; subtypeTable?: string }[]
  >([]);
  const [pendingSubtype, setPendingSubtype] = useState<string | null>(null);
  const { rolling, triggerRoll } = useDiceAnimation();

  const handleRoll = () => {
    triggerRoll();
    const picked = weightedPick(entries);
    const idx = entries.indexOf(picked);
    setHighlightIdx(idx);
    setResolutionSteps([]);
    setPendingSubtype(null);
  };

  const handleEntryClick = (entry: Entry) => {
    const ref = extractRef(entry.name);
    if (!ref) return;

    if (isSubtypeTable(ref)) {
      setPendingSubtype(ref);
      setResolutionSteps((prev) => [
        ...prev,
        { tableName: `Table ${letter}`, result: entry.name, isSubtype: true, subtypeTable: ref },
      ]);
      return;
    }

    const subtable = getSubtableEntries(ref);
    if (!subtable || subtable.length === 0) return;

    const picked = weightedPick(subtable);
    setResolutionSteps((prev) => [
      ...prev,
      { tableName: ref, result: picked.name },
    ]);

    const nextRef = extractRef(picked.name);
    if (nextRef) {
      if (isSubtypeTable(nextRef)) {
        setPendingSubtype(nextRef);
      } else {
        const nextTable = getSubtableEntries(nextRef);
        if (nextTable && nextTable.length > 0) {
          const nextPicked = weightedPick(nextTable);
          setResolutionSteps((prev) => [
            ...prev,
            { tableName: nextRef, result: nextPicked.name },
          ]);
          const thirdRef = extractRef(nextPicked.name);
          if (thirdRef && isSubtypeTable(thirdRef)) {
            setPendingSubtype(thirdRef);
          }
        }
      }
    }
  };

  const handleSubtypeSelect = (item: string) => {
    setPendingSubtype(null);
    setResolutionSteps((prev) => [
      ...prev,
      { tableName: pendingSubtype || 'Subtype', result: item },
    ]);
  };

  return (
    <div className="mi-table-view">
      <DiceAnimation rolling={rolling} />

      <div className="table-header-bar">
        <h3 className="table-view-title">
          Magic Item Table {letter}
          <span className="table-die-label">d{totalWeight}</span>
        </h3>
        <button className="table-roll-btn" onClick={handleRoll}>
          Roll
        </button>
      </div>

      {/* Roll result at top */}
      {highlightIdx != null && (
        <RollResultBanner
          entry={entries[highlightIdx]}
          colorIdx={highlightIdx}
          diceRange={diceRanges[highlightIdx]}
        />
      )}

      {/* Resolution chain */}
      {resolutionSteps.length > 0 && (
        <ResolutionChain steps={resolutionSteps} />
      )}

      {/* Subtype dropdown */}
      {pendingSubtype && (
        <div className="subtype-section">
          <SubtypeDropdown
            tableName={pendingSubtype}
            onSelect={handleSubtypeSelect}
          />
        </div>
      )}

      {/* Stacked probability bar */}
      <StackedBar entries={entries} highlightIdx={highlightIdx} />

      <div className="table-entries">
        {entries.map((entry, i) => (
          <TableEntryRow
            key={i}
            entry={entry}
            isHighlighted={highlightIdx === i}
            isClickable={highlightIdx === i && !!extractRef(entry.name)}
            diceRange={diceRanges[i]}
            colorIdx={i}
            onClick={() => handleEntryClick(entry)}
          />
        ))}
      </div>
    </div>
  );
}

/** View for a subtable (Potions-A, Spells-A, etc.) accessible by clicking in. */
function SubtableView({
  name,
  onBack,
}: {
  name: string;
  onBack: () => void;
}) {
  const entries = getSubtableEntries(name) || [];
  const totalWeight = entries.reduce((s, e) => s + e.weight, 0);
  const diceRanges = computeDiceRanges(entries);
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);
  const [resolutionSteps, setResolutionSteps] = useState<
    { tableName: string; result: string; isSubtype?: boolean; subtypeTable?: string }[]
  >([]);
  const [pendingSubtype, setPendingSubtype] = useState<string | null>(null);
  const { rolling, triggerRoll } = useDiceAnimation();

  const handleRoll = () => {
    triggerRoll();
    const picked = weightedPick(entries);
    const idx = entries.indexOf(picked);
    setHighlightIdx(idx);
    setResolutionSteps([]);
    setPendingSubtype(null);
  };

  const handleEntryClick = (entry: Entry) => {
    const ref = extractRef(entry.name);
    if (!ref) return;

    if (isSubtypeTable(ref)) {
      setPendingSubtype(ref);
      setResolutionSteps((prev) => [
        ...prev,
        { tableName: name, result: entry.name, isSubtype: true, subtypeTable: ref },
      ]);
      return;
    }

    const subtable = getSubtableEntries(ref);
    if (!subtable || subtable.length === 0) return;

    const picked = weightedPick(subtable);
    setResolutionSteps((prev) => [
      ...prev,
      { tableName: ref, result: picked.name },
    ]);

    const nextRef = extractRef(picked.name);
    if (nextRef && isSubtypeTable(nextRef)) {
      setPendingSubtype(nextRef);
    }
  };

  const handleSubtypeSelect = (item: string) => {
    setPendingSubtype(null);
    setResolutionSteps((prev) => [
      ...prev,
      { tableName: pendingSubtype || 'Subtype', result: item },
    ]);
  };

  return (
    <div className="mi-table-view">
      <DiceAnimation rolling={rolling} />

      <div className="table-header-bar">
        <button className="table-back-btn" onClick={onBack}>
          &larr; Back
        </button>
        <h3 className="table-view-title">
          {name.replace(/-/g, ' ')}
          <span className="table-die-label">d{totalWeight}</span>
        </h3>
        <button className="table-roll-btn" onClick={handleRoll}>
          Roll
        </button>
      </div>

      {/* Roll result at top */}
      {highlightIdx != null && (
        <RollResultBanner
          entry={entries[highlightIdx]}
          colorIdx={highlightIdx}
          diceRange={diceRanges[highlightIdx]}
        />
      )}

      {/* Resolution chain */}
      {resolutionSteps.length > 0 && (
        <ResolutionChain steps={resolutionSteps} />
      )}

      {/* Subtype dropdown */}
      {pendingSubtype && (
        <div className="subtype-section">
          <SubtypeDropdown
            tableName={pendingSubtype}
            onSelect={handleSubtypeSelect}
          />
        </div>
      )}

      {/* Stacked probability bar */}
      <StackedBar entries={entries} highlightIdx={highlightIdx} />

      <div className="table-entries">
        {entries.map((entry, i) => (
          <TableEntryRow
            key={i}
            entry={entry}
            isHighlighted={highlightIdx === i}
            isClickable={highlightIdx === i && !!extractRef(entry.name)}
            diceRange={diceRanges[i]}
            colorIdx={i}
            onClick={() => handleEntryClick(entry)}
          />
        ))}
      </div>
    </div>
  );
}

/** Simple rollable table view for gems/art. */
function SimpleTableView({
  name,
  entries,
  baseValue,
}: {
  name: string;
  entries: { name: string; weight: number }[];
  baseValue?: number;
}) {
  const totalWeight = entries.reduce((s, e) => s + e.weight, 0);
  const diceRanges = computeDiceRanges(entries);
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);
  const { rolling, triggerRoll } = useDiceAnimation();

  const handleRoll = () => {
    triggerRoll();
    const picked = weightedPick(entries);
    setHighlightIdx(entries.indexOf(picked));
  };

  return (
    <div className="mi-table-view">
      <DiceAnimation rolling={rolling} />

      <div className="table-header-bar">
        <h3 className="table-view-title">
          {name.replace(/-/g, ' ')}
          {baseValue != null && <span className="base-value"> ({baseValue} gp)</span>}
          <span className="table-die-label">d{totalWeight}</span>
        </h3>
        <button className="table-roll-btn" onClick={handleRoll}>
          Roll
        </button>
      </div>

      {/* Roll result at top */}
      {highlightIdx != null && (
        <RollResultBanner
          entry={entries[highlightIdx]}
          colorIdx={highlightIdx}
          diceRange={diceRanges[highlightIdx]}
        />
      )}

      {/* Stacked probability bar */}
      <StackedBar entries={entries} highlightIdx={highlightIdx} />

      <div className="table-entries">
        {entries.map((entry, i) => (
          <TableEntryRow
            key={i}
            entry={entry}
            isHighlighted={highlightIdx === i}
            isClickable={false}
            diceRange={diceRanges[i]}
            colorIdx={i}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main LootTables component
// ---------------------------------------------------------------------------

type Section = 'magic' | 'spells' | 'supplemental' | 'gems' | 'art';

const LootTables: React.FC = () => {
  const [activeLetter, setActiveLetter] = useState<MITable>('A');
  const [subtableStack, setSubtableStack] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState<Section>('magic');

  const currentSubtable = subtableStack[subtableStack.length - 1] || null;

  const pushSubtable = (name: string) => setSubtableStack((s) => [...s, name]);
  const popSubtable = () => setSubtableStack((s) => s.slice(0, -1));

  const miEntries = getMITableEntries(activeLetter);
  const categorySubtables: string[] = [];
  for (const entry of miEntries) {
    const ref = extractRef(entry.name);
    if (ref && !categorySubtables.includes(ref)) {
      categorySubtables.push(ref);
    }
  }

  return (
    <div className="card loot-tables-card">
      {/* Section tabs */}
      <div className="section-tabs">
        <button
          className={`section-tab ${activeSection === 'magic' ? 'active' : ''}`}
          onClick={() => { setActiveSection('magic'); setSubtableStack([]); }}
        >
          Magic Items
        </button>
        <button
          className={`section-tab ${activeSection === 'spells' ? 'active' : ''}`}
          onClick={() => setActiveSection('spells')}
        >
          Spells
        </button>
        <button
          className={`section-tab ${activeSection === 'supplemental' ? 'active' : ''}`}
          onClick={() => setActiveSection('supplemental')}
        >
          Equipment
        </button>
        <button
          className={`section-tab ${activeSection === 'gems' ? 'active' : ''}`}
          onClick={() => setActiveSection('gems')}
        >
          Gems
        </button>
        <button
          className={`section-tab ${activeSection === 'art' ? 'active' : ''}`}
          onClick={() => setActiveSection('art')}
        >
          Art
        </button>
      </div>

      {/* Magic Items Section */}
      {activeSection === 'magic' && (
        <>
          <div className="letter-tabs">
            {MI_LETTERS.map((l) => (
              <button
                key={l}
                className={`letter-tab ${activeLetter === l && !currentSubtable ? 'active' : ''}`}
                onClick={() => {
                  setActiveLetter(l);
                  setSubtableStack([]);
                }}
              >
                {l}
              </button>
            ))}
          </div>

          {!currentSubtable && categorySubtables.length > 0 && (
            <div className="category-nav">
              {categorySubtables.map((cat) => (
                <button
                  key={cat}
                  className="category-btn"
                  onClick={() => pushSubtable(cat)}
                >
                  {cat.replace(/-/g, ' ')}
                </button>
              ))}
            </div>
          )}

          {currentSubtable ? (
            <SubtableView
              key={currentSubtable}
              name={currentSubtable}
              onBack={popSubtable}
            />
          ) : (
            <MITableView key={activeLetter} letter={activeLetter} />
          )}
        </>
      )}

      {activeSection === 'spells' && (
        <div className="spells-section">
          {SPELL_TABLES.map((table) => (
            <SimpleTableView
              key={table.name}
              name={table.name}
              entries={table.entries}
            />
          ))}
        </div>
      )}

      {activeSection === 'supplemental' && (
        <div className="supplemental-section">
          {SUPPLEMENTAL_TABLES.map((table) => (
            <SimpleTableView
              key={table.name}
              name={table.name}
              entries={table.entries}
            />
          ))}
        </div>
      )}

      {activeSection === 'gems' && (
        <div className="gems-section">
          {CUSTOM_GEMS.map((table) => (
            <SimpleTableView
              key={table.name}
              name={table.name}
              entries={table.entries}
              baseValue={table.baseValue}
            />
          ))}
        </div>
      )}

      {activeSection === 'art' && (
        <div className="art-section">
          {CUSTOM_ART.map((table) => (
            <SimpleTableView
              key={table.name}
              name={table.name}
              entries={table.entries}
              baseValue={table.baseValue}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default LootTables;
