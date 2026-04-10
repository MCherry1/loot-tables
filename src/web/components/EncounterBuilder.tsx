import React, { useState } from 'react';
import type {
  CampaignSettings,
  CreatureGroup,
  CreatureRole,
  ResolvableEncounterResult,
  Tier,
} from '@engine/index';
import { generateEncounterV2, crToDefaultTier } from '@engine/index';
import EncounterResults from './EncounterResults';
import { walkTableChain } from '../lib/stepperResolve';
import type { ResolvedItem } from '../App';

const CREATURE_ROLES: CreatureRole[] = ['minion', 'elite', 'boss'];

export const ALL_CRS: { label: string; value: number }[] = [
  { label: '0', value: 0 },
  { label: '1/8', value: 0.125 },
  { label: '1/4', value: 0.25 },
  { label: '1/2', value: 0.5 },
  ...Array.from({ length: 30 }, (_, i) => ({
    label: String(i + 1),
    value: i + 1,
  })),
];

/** CR selector with +/- stepper buttons flanking the dropdown. */
export function CrSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (cr: number) => void;
}) {
  const idx = ALL_CRS.findIndex((c) => c.value === value);

  return (
    <div className="cr-stepper">
      <button
        className="cr-stepper-btn"
        disabled={idx <= 0}
        onClick={() => onChange(ALL_CRS[idx - 1].value)}
        title="Previous CR"
      >
        &minus;
      </button>
      <select
        className="group-select cr-select"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {ALL_CRS.map((c) => (
          <option key={c.value} value={c.value}>
            CR {c.label}
          </option>
        ))}
      </select>
      <button
        className="cr-stepper-btn"
        disabled={idx >= ALL_CRS.length - 1}
        onClick={() => onChange(ALL_CRS[idx + 1].value)}
        title="Next CR"
      >
        +
      </button>
    </div>
  );
}

let _groupId = 0;
function nextGroupId(): string {
  return `grp-${++_groupId}`;
}

interface Props {
  settings: CampaignSettings;
  results: ResolvableEncounterResult | null;
  onResultsChange: (results: ResolvableEncounterResult | null) => void;
  resolvedItems: Record<string, ResolvedItem>;
  setResolvedItems: React.Dispatch<
    React.SetStateAction<Record<string, ResolvedItem>>
  >;
  onStartResolve: (itemId: string, table: string) => void;
}

const EncounterBuilder: React.FC<Props> = ({
  settings,
  results,
  onResultsChange,
  resolvedItems,
  setResolvedItems,
  onStartResolve,
}) => {
  const [groups, setGroups] = useState<CreatureGroup[]>([
    { id: nextGroupId(), cr: 1, role: 'minion', count: 1 },
  ]);
  const [tier, setTier] = useState<Tier>(1);
  const [autoTier, setAutoTier] = useState(false);

  // Derive tier from highest CR across all creature groups
  const allCrs = groups.map((g) => g.cr);
  const maxCr = allCrs.length > 0 ? Math.max(...allCrs) : 0;
  const effectiveTier: Tier = autoTier ? crToDefaultTier(maxCr) : tier;

  const updateGroup = (id: string, updates: Partial<CreatureGroup>) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    );
  };

  const removeGroup = (id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  };

  const addGroup = () => {
    setGroups((prev) => [
      ...prev,
      { id: nextGroupId(), cr: 1, role: 'minion', count: 1 },
    ]);
  };

  const handleRoll = () => {
    const totalCreatures = groups.reduce((sum, g) => sum + g.count, 0);
    if (totalCreatures === 0) return;

    // Always produce unresolved magic items; they become clickable links that
    // open the stepper. Pass `false` to skip auto-resolution.
    const result = generateEncounterV2(
      {
        groups,
        vaultCount: 0,
        vaultSize: 'standard',
        tier: effectiveTier,
        autoTier,
        settings,
      },
      false,
    );
    onResultsChange(result);
  };

  /** Auto-roll every still-unresolved magic item using weightedPick loops. */
  const handleResolveAll = () => {
    if (!results) return;
    const next: Record<string, ResolvedItem> = { ...resolvedItems };
    results.creatures.forEach((c, ci) => {
      c.loot.magicItems.forEach((mi, ii) => {
        const id = `mi-${ci}-${ii}`;
        if (next[id]) return;
        const rootTable = `Magic-Item-Table-${mi.table}`;
        const walked = walkTableChain(rootTable, settings.sourceSettings);
        next[id] = { name: walked.name, source: walked.source || mi.source };
      });
    });
    setResolvedItems(next);
  };

  const hasUnresolved = results
    ? results.creatures.some((c, ci) =>
        c.loot.magicItems.some((_, ii) => !resolvedItems[`mi-${ci}-${ii}`]),
      )
    : false;

  return (
    <div className="card">
      <h2 className="card-title">Encounter Builder</h2>

      {/* Creature Groups */}
      <div className="field-row">
        <label className="field-label">Creatures</label>
        <div className="creature-groups">
          {groups.map((group) => (
            <div key={group.id} className="creature-group-row">
              <select
                className="group-select role-select"
                value={group.role}
                onChange={(e) =>
                  updateGroup(group.id, { role: e.target.value as CreatureRole })
                }
              >
                {CREATURE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <CrSelector
                value={group.cr}
                onChange={(cr) => updateGroup(group.id, { cr })}
              />

              <div className="group-count">
                <button
                  className="stepper-btn"
                  onClick={() =>
                    updateGroup(group.id, {
                      count: Math.max(1, group.count - 1),
                    })
                  }
                  disabled={group.count <= 1}
                >
                  &minus;
                </button>
                <span className="stepper-value">{group.count}</span>
                <button
                  className="stepper-btn"
                  onClick={() =>
                    updateGroup(group.id, { count: group.count + 1 })
                  }
                >
                  +
                </button>
              </div>

              {groups.length > 1 && (
                <button
                  className="remove-group-btn"
                  onClick={() => removeGroup(group.id)}
                  title="Remove group"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
          <button className="add-group-btn" onClick={addGroup}>
            + Add Creature
          </button>
        </div>
      </div>

      {/* Tier Selector */}
      <div className="field-row">
        <label className="field-label">Tier</label>
        <div className="tier-group">
          {([1, 2, 3, 4] as Tier[]).map((t) => (
            <label
              key={t}
              className={`tier-radio ${effectiveTier === t ? 'active' : ''}`}
            >
              <input
                type="radio"
                name="tier"
                value={t}
                checked={effectiveTier === t}
                disabled={autoTier}
                onChange={() => setTier(t)}
              />
              {t}
            </label>
          ))}
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={autoTier}
              onChange={(e) => setAutoTier(e.target.checked)}
            />
            Auto
          </label>
        </div>
      </div>

      {/* Roll Button */}
      <button className="roll-btn" onClick={handleRoll}>
        Roll Encounter
      </button>

      {/* Results */}
      {results && (
        <>
          <EncounterResults
            results={results}
            settings={settings}
            resolvedItems={resolvedItems}
            onStartResolve={onStartResolve}
          />
          {hasUnresolved && (
            <button
              className="resolve-all-btn"
              onClick={handleResolveAll}
              title="Auto-roll every remaining magic item"
            >
              Resolve All
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default EncounterBuilder;
