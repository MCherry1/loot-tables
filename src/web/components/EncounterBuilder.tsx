import React, { useState, useRef, useEffect } from 'react';
import type {
  CampaignSettings,
  CreatureGroup,
  CreatureRole,
  ResolvableEncounterResult,
  Tier,
} from '@engine/index';
import { generateEncounterV2, ROLE_MULTIPLIER, tierFromLevel, progressionMultiplier } from '@engine/index';
import EncounterResults from './EncounterResults';
import { walkTableChain } from '../lib/stepperResolve';
import type { ResolvedItem } from '../App';

const CREATURE_ROLES: CreatureRole[] = ['minion', 'elite', 'mini-boss', 'boss'];

const ROLE_DISPLAY: Record<CreatureRole, string> = {
  minion: 'Minion',
  elite: 'Elite',
  'mini-boss': 'Mini-boss',
  boss: 'Boss',
};

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
  onSettingsChange: (settings: CampaignSettings) => void;
  results: ResolvableEncounterResult | null;
  onResultsChange: (results: ResolvableEncounterResult | null) => void;
  resolvedItems: Record<string, ResolvedItem>;
  setResolvedItems: React.Dispatch<
    React.SetStateAction<Record<string, ResolvedItem>>
  >;
  onStartResolve: (itemId: string, table: string) => void;
  onNavigateHelp?: () => void;
}

const HELP_CONTENT = [
  {
    title: 'What This Does',
    text: 'Loot Drops assigns treasure to individual creatures based on their Challenge Rating and role. Instead of rolling one hoard after clearing a dungeon, every creature generates its own loot — scaled to CR, role, and party level. Over a full campaign the total matches the DMG\'s expected treasure.',
  },
  {
    title: 'Roles',
    text: 'Each creature has a role that determines its share of treasure. Minions (×0.10) carry pocket change. Elites (×0.30) are worth searching. Mini-bosses (×0.90) have significant treasure. Bosses (×2.70) are the big score. These follow a 3× geometric progression — over a balanced campaign the weighted average is exactly 1.0×.',
  },
  {
    title: 'Tier Progression',
    text: 'Within each tier, treasure scales from 0.70× at the tier\'s start to 1.30× at its end. A level 5 party gets leaner hoards than a level 10 party, even fighting the same CR creatures. This matches how published adventures pace their rewards — more loot comes later in each tier, not at the beginning.',
  },
  {
    title: 'How Loot Budget Works',
    text: 'The DMG expects a known number of hoards per tier (7 for Tier 1, 18 for Tier 2, etc.) and a known XP total to get through each tier. Dividing total treasure by total XP gives a gold-per-XP ratio. Every creature\'s XP value maps to a proportional share of that tier\'s treasure — then the role multiplier scales it up or down.',
  },
  {
    title: 'Resolving Magic Items',
    text: 'Magic items appear as unresolved table references (e.g. "Table G"). Click one to open the Loot Tables stepper where you can roll randomly or choose at each step. Use "Resolve All" to auto-roll everything at once. Tip: roll loot before the fight — you might give the enemy a magic item they can use against the party!',
  },
];

/** Inline help tooltip — hover on desktop, tap-toggle on mobile. */
function HelpTooltip() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  return (
    <div className="help-trigger" ref={ref}>
      <button
        className="help-icon-btn"
        onClick={() => setOpen((v) => !v)}
        title="How Loot Drops works"
        aria-label="Help"
      >
        ?
      </button>
      {open && (
        <div className="help-bubble">
          <button className="help-bubble-close" onClick={() => setOpen(false)} aria-label="Close help">&times;</button>
          {HELP_CONTENT.map((section) => (
            <React.Fragment key={section.title}>
              <h4>{section.title}</h4>
              <p>{section.text}</p>
            </React.Fragment>
          ))}
          <p style={{ marginTop: '0.6rem', fontSize: '0.82rem', opacity: 0.7 }}>
            See the <em>How it Works</em> tab for full details.
          </p>
        </div>
      )}
    </div>
  );
}

const EncounterBuilder: React.FC<Props> = ({
  settings,
  onSettingsChange,
  results,
  onResultsChange,
  resolvedItems,
  setResolvedItems,
  onStartResolve,
  onNavigateHelp,
}) => {
  const [groups, setGroups] = useState<CreatureGroup[]>([
    { id: nextGroupId(), cr: 1, role: 'minion', count: 1 },
  ]);
  const [manualTier, setManualTier] = useState<Tier>(1);

  const partyLevel = settings.partyLevel ?? 5;
  const autoTier = settings.autoTier ?? true;
  const tierProg = settings.tierProgression ?? true;
  const effectiveTier: Tier = autoTier ? tierFromLevel(partyLevel) : manualTier;
  const multiplier = progressionMultiplier(partyLevel, effectiveTier, tierProg);

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
      <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        Loot Drops
        <HelpTooltip />
        {onNavigateHelp && (
          <button className="help-link" onClick={onNavigateHelp}>
            How to use &rarr;
          </button>
        )}
      </h2>

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

      {/* Party Level */}
      <div className="field-row">
        <label className="field-label">
          Party Level: <span className="mono">{partyLevel}</span>
        </label>
        <div className="level-stepper">
          <button
            className="stepper-btn"
            disabled={partyLevel <= 1}
            onClick={() => onSettingsChange({ ...settings, partyLevel: partyLevel - 1 })}
          >
            &minus;
          </button>
          <input
            type="number"
            className="level-input"
            min={1}
            max={20}
            value={partyLevel}
            onChange={(e) => {
              const v = Math.max(1, Math.min(20, Number(e.target.value) || 1));
              onSettingsChange({ ...settings, partyLevel: v });
            }}
          />
          <button
            className="stepper-btn"
            disabled={partyLevel >= 20}
            onClick={() => onSettingsChange({ ...settings, partyLevel: partyLevel + 1 })}
          >
            +
          </button>
        </div>
      </div>

      {/* Tier Selector */}
      <div className="field-row">
        <label className="field-label">
          Tier{' '}
          <span className="mono">×{multiplier.toFixed(2)}</span>
        </label>
        <div className="tier-group">
          {([1, 2, 3, 4] as Tier[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`tier-btn ${effectiveTier === t ? 'active' : ''} ${autoTier && effectiveTier !== t ? 'faded' : ''}`}
              disabled={autoTier}
              onClick={() => setManualTier(t)}
            >
              {t}
            </button>
          ))}
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={autoTier}
              onChange={(e) => onSettingsChange({ ...settings, autoTier: e.target.checked })}
            />
            Auto
          </label>
        </div>
      </div>

      {/* Role Multipliers */}
      <div className="field-row">
        <label className="field-label">
          <label className="checkbox-label" style={{ fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={settings.useRoles ?? true}
              onChange={(e) => onSettingsChange({ ...settings, useRoles: e.target.checked })}
            />
            Distribute by Role
          </label>
        </label>
      </div>
      <div className={`role-preview ${!(settings.useRoles ?? true) ? 'role-preview-disabled' : ''}`}>
        {CREATURE_ROLES.map((role) => {
          const mult = (settings.useRoles ?? true) ? ROLE_MULTIPLIER[role] : 1.0;
          return (
            <span key={role} className="role-preview-item">
              <span className="role-preview-label">{ROLE_DISPLAY[role]}</span>
              <span className="mono">×{mult.toFixed(2)}</span>
            </span>
          );
        })}
      </div>
      {(settings.useRoles ?? true) && (
        <p className="field-hint" style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>
          Creatures in an organization share wealth unevenly — minions carry pocket change, bosses carry the big score.
          {' '}
          <button className="help-link" onClick={onNavigateHelp} style={{ fontSize: '0.78rem' }}>
            Learn more →
          </button>
        </p>
      )}
      {!(settings.useRoles ?? true) && (
        <p className="field-hint" style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>
          Every creature gets its exact XP-proportional share — no organizational distribution.
        </p>
      )}

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
