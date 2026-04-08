import React, { useState, useRef, useEffect } from 'react';
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
type TableData = { name: string; entries: Entry[] };

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

/** Regex for detecting subtable refs. */
const REF_RE = /\[\[\s*\d*t\[([^\]]+)\]\s*\]\]/;

function extractRef(name: string): string | null {
  const m = REF_RE.exec(name);
  return m ? m[1] : null;
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
  // Flat table (Swords, Axes, Bows) - single group
  const table = ALL_TABLES[tableName];
  if (!table) return [];
  return [{ group: tableName, items: [...table] }];
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

/** Get the subtable entries for a category like "Potions-A", "Spells-A", etc. */
function getSubtableEntries(name: string): Entry[] | null {
  const table = ALL_TABLES[name];
  return table ? [...table] : null;
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

/** Weight bar visualization. */
function WeightBar({ weight, maxWeight }: { weight: number; maxWeight: number }) {
  const pct = maxWeight > 0 ? (weight / maxWeight) * 100 : 0;
  return (
    <div className="weight-bar-bg">
      <div className="weight-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

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

/** A single table entry row with highlight animation support. */
function TableEntryRow({
  entry,
  maxWeight,
  isHighlighted,
  isClickable,
  onClick,
}: {
  entry: Entry;
  maxWeight: number;
  isHighlighted: boolean;
  isClickable: boolean;
  onClick?: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHighlighted && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isHighlighted]);

  return (
    <div
      ref={rowRef}
      className={`table-entry-row${isHighlighted ? ' highlighted' : ''}${isClickable ? ' clickable' : ''}`}
      onClick={isClickable ? onClick : undefined}
    >
      <span className="entry-name">{entry.name}</span>
      {entry.source && <span className="entry-source">({entry.source})</span>}
      <span className="entry-weight">{entry.weight}</span>
      <WeightBar weight={entry.weight} maxWeight={maxWeight} />
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
            <span className="chain-result">{step.result}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

/** Interactive view of a single magic item table (A-I). */
function MITableView({ letter }: { letter: MITable }) {
  const entries = getMITableEntries(letter);
  const maxWeight = Math.max(...entries.map((e) => e.weight), 1);
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);
  const [resolutionSteps, setResolutionSteps] = useState<
    { tableName: string; result: string; isSubtype?: boolean; subtypeTable?: string }[]
  >([]);
  const [pendingSubtype, setPendingSubtype] = useState<string | null>(null);

  const handleRoll = () => {
    const picked = weightedPick(entries);
    const idx = entries.indexOf(picked);
    setHighlightIdx(idx);
    setResolutionSteps([]);
    setPendingSubtype(null);
  };

  const handleEntryClick = (entry: Entry) => {
    // Check if entry has a subtable reference
    const ref = extractRef(entry.name);
    if (!ref) return; // Terminal entry, nothing to resolve

    // Check if this resolves to a subtype (dropdown)
    if (isSubtypeTable(ref)) {
      setPendingSubtype(ref);
      setResolutionSteps((prev) => [
        ...prev,
        { tableName: `Table ${letter}`, result: entry.name, isSubtype: true, subtypeTable: ref },
      ]);
      return;
    }

    // Roll on the subtable
    const subtable = getSubtableEntries(ref);
    if (!subtable || subtable.length === 0) return;

    const picked = weightedPick(subtable);
    setResolutionSteps((prev) => [
      ...prev,
      { tableName: ref, result: picked.name },
    ]);

    // Check if the resolved entry itself has more refs
    const nextRef = extractRef(picked.name);
    if (nextRef) {
      if (isSubtypeTable(nextRef)) {
        setPendingSubtype(nextRef);
      } else {
        // Auto-resolve next level
        const nextTable = getSubtableEntries(nextRef);
        if (nextTable && nextTable.length > 0) {
          const nextPicked = weightedPick(nextTable);
          setResolutionSteps((prev) => [
            ...prev,
            { tableName: nextRef, result: nextPicked.name },
          ]);
          // Continue checking...
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
      <div className="table-header-bar">
        <h3 className="table-view-title">Magic Item Table {letter}</h3>
        <button className="table-roll-btn" onClick={handleRoll}>
          Roll
        </button>
      </div>

      <div className="table-entries">
        {entries.map((entry, i) => (
          <TableEntryRow
            key={i}
            entry={entry}
            maxWeight={maxWeight}
            isHighlighted={highlightIdx === i}
            isClickable={highlightIdx === i && !!extractRef(entry.name)}
            onClick={() => handleEntryClick(entry)}
          />
        ))}
      </div>

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
  const maxWeight = Math.max(...entries.map((e) => e.weight), 1);
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);
  const [resolutionSteps, setResolutionSteps] = useState<
    { tableName: string; result: string; isSubtype?: boolean; subtypeTable?: string }[]
  >([]);
  const [pendingSubtype, setPendingSubtype] = useState<string | null>(null);

  const handleRoll = () => {
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
      <div className="table-header-bar">
        <button className="table-back-btn" onClick={onBack}>
          &larr; Back
        </button>
        <h3 className="table-view-title">{name.replace(/-/g, ' ')}</h3>
        <button className="table-roll-btn" onClick={handleRoll}>
          Roll
        </button>
      </div>

      <div className="table-entries">
        {entries.map((entry, i) => (
          <TableEntryRow
            key={i}
            entry={entry}
            maxWeight={maxWeight}
            isHighlighted={highlightIdx === i}
            isClickable={highlightIdx === i && !!extractRef(entry.name)}
            onClick={() => handleEntryClick(entry)}
          />
        ))}
      </div>

      {resolutionSteps.length > 0 && (
        <ResolutionChain steps={resolutionSteps} />
      )}

      {pendingSubtype && (
        <div className="subtype-section">
          <SubtypeDropdown
            tableName={pendingSubtype}
            onSelect={handleSubtypeSelect}
          />
        </div>
      )}
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
  const maxWeight = Math.max(...entries.map((e) => e.weight), 1);
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);

  const handleRoll = () => {
    const picked = weightedPick(entries);
    setHighlightIdx(entries.indexOf(picked));
  };

  return (
    <div className="mi-table-view">
      <div className="table-header-bar">
        <h3 className="table-view-title">
          {name.replace(/-/g, ' ')}
          {baseValue != null && <span className="base-value"> ({baseValue} gp)</span>}
        </h3>
        <button className="table-roll-btn" onClick={handleRoll}>
          Roll
        </button>
      </div>
      <div className="table-entries">
        {entries.map((entry, i) => (
          <TableEntryRow
            key={i}
            entry={entry}
            maxWeight={maxWeight}
            isHighlighted={highlightIdx === i}
            isClickable={false}
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

  // When viewing a magic item table, the user can click into subtables
  const currentSubtable = subtableStack[subtableStack.length - 1] || null;

  const pushSubtable = (name: string) => setSubtableStack((s) => [...s, name]);
  const popSubtable = () => setSubtableStack((s) => s.slice(0, -1));

  // Build list of category subtables for the current letter
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
          {/* Letter sub-tabs */}
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

          {/* Category quick-nav */}
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

          {/* Table view */}
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

      {/* Spells Section */}
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

      {/* Equipment (Supplemental) Section */}
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

      {/* Gems Section */}
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

      {/* Art Section */}
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
