import React, { useState, useCallback } from 'react';
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

/** Strip bracket refs from an entry name for clean display.
 *  Also strips trailing letter suffixes (-A, -B, etc.) from category names. */
function cleanDisplayName(name: string): string {
  return name
    .replace(/\[([A-Za-z][A-Za-z0-9_-]*)\]/g, '$1')  // strip brackets
    .replace(/-([A-I])$/, '')                            // strip trailing table letter
    .replace(/-/g, ' ');                                 // hyphens to spaces
}

/** Substitute a resolved item name into a template containing [Ref].
 *  E.g. "[Weapons], +1" with resolved "Longsword" -> "Longsword, +1" */
function substituteRef(template: string, resolvedName: string): string {
  return template.replace(REF_RE, resolvedName);
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

function computeDiceRanges(entries: { weight: number }[]): { lo: number; hi: number }[] {
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

/** Pick a random number within a dice range. */
function randomInRange(r: { lo: number; hi: number }): number {
  if (r.lo === r.hi) return r.lo;
  return r.lo + Math.floor(Math.random() * (r.hi - r.lo + 1));
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
// Equipment top-level tables
// ---------------------------------------------------------------------------

const EQUIPMENT_TOP_LEVEL = [
  'Armor', 'Weapons', 'Ammunition', 'Swords', 'Axes', 'Bows',
  'Dragon-Breath', 'All-Dragons', 'Damage-Type', 'Tools',
];

// ---------------------------------------------------------------------------
// Spell level labels
// ---------------------------------------------------------------------------

const SPELL_LEVEL_LABELS = [
  'Cantrip', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th',
];

// ---------------------------------------------------------------------------
// GP label extraction for gems/art
// ---------------------------------------------------------------------------

function extractGpLabel(name: string, baseValue?: number): string {
  // Try to extract from name pattern like "Gems-1-25-gp" -> "25 gp"
  const m = name.match(/(\d[\d,]*)-gp$/i);
  if (m) return `${Number(m[1]).toLocaleString()} gp`;
  if (baseValue != null) return `${baseValue.toLocaleString()} gp`;
  return name.replace(/-/g, ' ');
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
// Roll Result Banner (shown at top, clickable when it has a subtable ref)
// ---------------------------------------------------------------------------

function RollResultBanner({
  displayName,
  source,
  colorIdx,
  rolledNumber,
  isClickable,
  onClick,
}: {
  displayName: string;
  source?: string;
  colorIdx: number;
  rolledNumber: number;
  isClickable: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={`roll-result-banner${isClickable ? ' clickable' : ''}`}
      style={{ borderLeftColor: getSegmentColor(colorIdx) }}
      onClick={isClickable ? onClick : undefined}
    >
      <span className="roll-result-dice">Rolled: {rolledNumber}</span>
      <span className="roll-result-name">{displayName}</span>
      {source && <span className="roll-result-source">({source})</span>}
      {isClickable && <span className="roll-result-drill">&rsaquo;</span>}
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

/** A single table entry row (display-only, not clickable). */
function TableEntryRow({
  entry,
  isHighlighted,
  diceRange,
  colorIdx,
}: {
  entry: Entry;
  isHighlighted: boolean;
  diceRange?: string;
  colorIdx?: number;
}) {
  return (
    <div
      className={`table-entry-row${isHighlighted ? ' highlighted' : ''}`}
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
  steps: { tableName: string; result: string }[];
}) {
  return (
    <div className="resolution-chain">
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="chain-arrow">&rarr;</span>}
          <span className="chain-step">
            <span className="chain-table">{step.tableName.replace(/-/g, ' ')}</span>
            <span className="chain-result">{step.result}</span>
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

// ---------------------------------------------------------------------------
// Unified Table View
// ---------------------------------------------------------------------------

/** Interactive view for any rollable table. Handles magic item tables,
 *  subtables, spells, equipment, gems, art - all with the same UX. */
function TableView({
  title,
  entries,
  baseValue,
  onDrillDown,
  onBack,
}: {
  title: string;
  entries: Entry[];
  baseValue?: number;
  onDrillDown?: (subtableName: string) => void;
  onBack?: () => void;
}) {
  const totalWeight = entries.reduce((s, e) => s + e.weight, 0);
  const diceRanges = computeDiceRanges(entries);
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);
  const [rolledNumber, setRolledNumber] = useState<number | null>(null);
  const [resolutionSteps, setResolutionSteps] = useState<
    { tableName: string; result: string }[]
  >([]);
  const [pendingSubtype, setPendingSubtype] = useState<{
    tableName: string;
    entryTemplate: string;
  } | null>(null);
  const [finalDisplayName, setFinalDisplayName] = useState<string | null>(null);
  const { rolling, triggerRoll } = useDiceAnimation();

  const handleRoll = () => {
    triggerRoll();
    const picked = weightedPick(entries);
    const idx = entries.indexOf(picked);
    const range = diceRanges[idx];
    const num = randomInRange(range);
    setHighlightIdx(idx);
    setRolledNumber(num);
    setResolutionSteps([]);
    setPendingSubtype(null);
    setFinalDisplayName(null);
  };

  /** Handle clicking the result banner to drill into a subtable. */
  const handleBannerClick = () => {
    if (highlightIdx == null) return;
    const entry = entries[highlightIdx];
    const ref = extractRef(entry.name);
    if (!ref) return;

    // If the ref is a subtype table (Armor/Weapons), show dropdown
    if (isSubtypeTable(ref)) {
      setPendingSubtype({ tableName: ref, entryTemplate: entry.name });
      return;
    }

    // Otherwise drill down into the subtable
    if (onDrillDown) {
      onDrillDown(ref);
    }
  };

  /** Handle selecting from equipment dropdown. */
  const handleSubtypeSelect = (item: string) => {
    if (!pendingSubtype) return;
    const composed = substituteRef(pendingSubtype.entryTemplate, item);
    setFinalDisplayName(composed);
    setResolutionSteps((prev) => [
      ...prev,
      { tableName: pendingSubtype.tableName.replace(/-/g, ' '), result: item },
    ]);
    setPendingSubtype(null);
  };

  // Determine what to show in the banner
  const bannerEntry = highlightIdx != null ? entries[highlightIdx] : null;
  const bannerRef = bannerEntry ? extractRef(bannerEntry.name) : null;
  const bannerIsClickable = !!bannerRef && !pendingSubtype && !finalDisplayName;
  const bannerDisplayName = finalDisplayName
    || (bannerEntry ? cleanDisplayName(bannerEntry.name) : '');

  return (
    <div className="mi-table-view">
      <DiceAnimation rolling={rolling} />

      <div className="table-header-bar">
        {onBack && (
          <button className="table-back-btn" onClick={onBack}>
            &larr; Back
          </button>
        )}
        <h3 className="table-view-title">
          {title}
          {baseValue != null && <span className="base-value"> ({baseValue} gp)</span>}
        </h3>
        <button className="table-roll-btn" onClick={handleRoll}>
          Roll d{totalWeight}
        </button>
      </div>

      {/* Roll result at top */}
      {highlightIdx != null && rolledNumber != null && (
        <RollResultBanner
          displayName={bannerDisplayName}
          source={bannerEntry?.source || undefined}
          colorIdx={highlightIdx}
          rolledNumber={rolledNumber}
          isClickable={bannerIsClickable}
          onClick={handleBannerClick}
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
            tableName={pendingSubtype.tableName}
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
            diceRange={formatRange(diceRanges[i])}
            colorIdx={i}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subtable View (wraps TableView with back + recursive drill-down)
// ---------------------------------------------------------------------------

function DrillableTableView({
  name,
  onBack,
}: {
  name: string;
  onBack: () => void;
}) {
  const entries = getSubtableEntries(name) || [];
  const [childSubtable, setChildSubtable] = useState<string | null>(null);

  if (childSubtable) {
    return (
      <DrillableTableView
        key={childSubtable}
        name={childSubtable}
        onBack={() => setChildSubtable(null)}
      />
    );
  }

  return (
    <TableView
      title={name.replace(/-/g, ' ')}
      entries={entries}
      onBack={onBack}
      onDrillDown={setChildSubtable}
    />
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
  const [activeSpellIdx, setActiveSpellIdx] = useState(0);
  const [activeEquipIdx, setActiveEquipIdx] = useState(0);
  const [activeGemIdx, setActiveGemIdx] = useState(0);
  const [activeArtIdx, setActiveArtIdx] = useState(0);

  const currentSubtable = subtableStack[subtableStack.length - 1] || null;

  const pushSubtable = (name: string) => setSubtableStack((s) => [...s, name]);
  const popSubtable = () => setSubtableStack((s) => s.slice(0, -1));

  // Get category subtable refs for the active letter
  const miEntries = getMITableEntries(activeLetter);
  const categorySubtables: string[] = [];
  for (const entry of miEntries) {
    const ref = extractRef(entry.name);
    if (ref && !categorySubtables.includes(ref)) {
      categorySubtables.push(ref);
    }
  }

  // Equipment tables filtered to top-level only
  const equipmentTables = SUPPLEMENTAL_TABLES.filter((t) =>
    EQUIPMENT_TOP_LEVEL.includes(t.name)
  );

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

      {/* ---- Magic Items Section ---- */}
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
                  {cleanDisplayName(`[${cat}]`)}
                </button>
              ))}
            </div>
          )}

          {currentSubtable ? (
            <DrillableTableView
              key={currentSubtable}
              name={currentSubtable}
              onBack={popSubtable}
            />
          ) : (
            <TableView
              key={activeLetter}
              title={`Magic Item Table ${activeLetter}`}
              entries={miEntries}
              onDrillDown={pushSubtable}
            />
          )}
        </>
      )}

      {/* ---- Spells Section ---- */}
      {activeSection === 'spells' && (
        <>
          <div className="sub-tabs">
            {SPELL_LEVEL_LABELS.map((label, i) => (
              <button
                key={i}
                className={`sub-tab ${activeSpellIdx === i ? 'active' : ''}`}
                onClick={() => setActiveSpellIdx(i)}
              >
                {label}
              </button>
            ))}
          </div>
          {SPELL_TABLES[activeSpellIdx] && (
            <TableView
              key={SPELL_TABLES[activeSpellIdx].name}
              title={SPELL_LEVEL_LABELS[activeSpellIdx] === 'Cantrip'
                ? 'Cantrips'
                : `${SPELL_LEVEL_LABELS[activeSpellIdx]} Level Spells`}
              entries={SPELL_TABLES[activeSpellIdx].entries}
            />
          )}
        </>
      )}

      {/* ---- Equipment Section ---- */}
      {activeSection === 'supplemental' && (
        <>
          <div className="sub-tabs">
            {equipmentTables.map((table, i) => (
              <button
                key={table.name}
                className={`sub-tab ${activeEquipIdx === i ? 'active' : ''}`}
                onClick={() => setActiveEquipIdx(i)}
              >
                {table.name.replace(/-/g, ' ')}
              </button>
            ))}
          </div>
          {equipmentTables[activeEquipIdx] && (
            <TableView
              key={equipmentTables[activeEquipIdx].name}
              title={equipmentTables[activeEquipIdx].name.replace(/-/g, ' ')}
              entries={equipmentTables[activeEquipIdx].entries}
            />
          )}
        </>
      )}

      {/* ---- Gems Section ---- */}
      {activeSection === 'gems' && (
        <>
          <div className="sub-tabs">
            {CUSTOM_GEMS.map((table, i) => (
              <button
                key={table.name}
                className={`sub-tab ${activeGemIdx === i ? 'active' : ''}`}
                onClick={() => setActiveGemIdx(i)}
              >
                {extractGpLabel(table.name, table.baseValue)}
              </button>
            ))}
          </div>
          {CUSTOM_GEMS[activeGemIdx] && (
            <TableView
              key={CUSTOM_GEMS[activeGemIdx].name}
              title={`Gems \u2014 ${extractGpLabel(CUSTOM_GEMS[activeGemIdx].name, CUSTOM_GEMS[activeGemIdx].baseValue)}`}
              entries={CUSTOM_GEMS[activeGemIdx].entries}
              baseValue={CUSTOM_GEMS[activeGemIdx].baseValue}
            />
          )}
        </>
      )}

      {/* ---- Art Section ---- */}
      {activeSection === 'art' && (
        <>
          <div className="sub-tabs">
            {CUSTOM_ART.map((table, i) => (
              <button
                key={table.name}
                className={`sub-tab ${activeArtIdx === i ? 'active' : ''}`}
                onClick={() => setActiveArtIdx(i)}
              >
                {extractGpLabel(table.name, table.baseValue)}
              </button>
            ))}
          </div>
          {CUSTOM_ART[activeArtIdx] && (
            <TableView
              key={CUSTOM_ART[activeArtIdx].name}
              title={`Art Objects \u2014 ${extractGpLabel(CUSTOM_ART[activeArtIdx].name, CUSTOM_ART[activeArtIdx].baseValue)}`}
              entries={CUSTOM_ART[activeArtIdx].entries}
              baseValue={CUSTOM_ART[activeArtIdx].baseValue}
            />
          )}
        </>
      )}
    </div>
  );
};

export default LootTables;
