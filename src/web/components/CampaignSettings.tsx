import React, { useMemo, useState } from 'react';
import type {
  CampaignSettings,
  Role,
  SourcePriority,
  SourceSettings,
  ThemePref,
} from '@engine/index';
import {
  SOURCE_GROUPS,
  SOURCE_GROUP_LABELS,
  getBookItemCounts,
  getBookDampFactors,
} from '@engine/index';
import { SOURCEBOOK_BY_ACRONYM } from '../../data/sourcebook-lookup';

const RICHNESS_STOPS = [0.5, 0.75, 1.0, 1.25, 1.5];
const RICHNESS_LABELS = ['Scarce', 'Low', 'Standard', 'High', 'Abundant'];

const PRIORITY_ORDER: SourcePriority[] = [
  'off',
  'low',
  'normal',
  'high',
  'emphasis',
];
const PRIORITY_LABELS: Record<SourcePriority, string> = {
  off: 'Off',
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  emphasis: 'Emphasis',
};

const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

interface Props {
  settings: CampaignSettings;
  onChange: (settings: CampaignSettings) => void;
}

/** Read the current priority for a source, defaulting to 'normal'. */
function getPriority(
  settings: SourceSettings,
  acronym: string,
): SourcePriority {
  return settings[acronym] ?? 'normal';
}

/** Apply a priority to many acronyms at once, mutating a fresh copy. */
function setPriorities(
  settings: SourceSettings,
  acronyms: readonly string[],
  priority: SourcePriority,
): SourceSettings {
  const next = { ...settings };
  for (const a of acronyms) next[a] = priority;
  return next;
}

interface SourceRowProps {
  acronym: string;
  name: string;
  count: number;
  damp: number;
  showFormula: boolean;
  priority: SourcePriority;
  onPriorityChange: (p: SourcePriority) => void;
}

const SourceRow: React.FC<SourceRowProps> = ({
  acronym,
  name,
  count,
  damp,
  showFormula,
  priority,
  onPriorityChange,
}) => (
  <div className="source-row">
    <div className="source-row-info">
      <span className="source-acronym">{acronym}</span>
      <span className="source-name">{name}</span>
      <span className="source-count">{count}×</span>
      {showFormula && (
        <span className="source-damp">damp ×{damp.toFixed(2)}</span>
      )}
    </div>
    <div className="priority-selector">
      {PRIORITY_ORDER.map((p) => (
        <button
          key={p}
          type="button"
          className={`priority-btn ${priority === p ? 'active' : ''}`}
          onClick={() => onPriorityChange(p)}
        >
          {PRIORITY_LABELS[p]}
        </button>
      ))}
    </div>
  </div>
);

interface SourceGroupProps {
  label: string;
  acronyms: readonly string[];
  settings: SourceSettings;
  counts: Record<string, number>;
  damps: Record<string, number>;
  showFormula: boolean;
  onChange: (next: SourceSettings) => void;
}

const SourceGroup: React.FC<SourceGroupProps> = ({
  label,
  acronyms,
  settings,
  counts,
  damps,
  showFormula,
  onChange,
}) => {
  const [open, setOpen] = useState(true);
  // Only render rows for acronyms we actually have data for.
  const visible = acronyms.filter((a) => (counts[a] ?? 0) > 0);
  if (visible.length === 0) return null;

  const applyAll = (p: SourcePriority) => {
    onChange(setPriorities(settings, visible, p));
  };

  return (
    <div className="source-group">
      <div className="source-group-header">
        <button
          type="button"
          className="source-group-toggle"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          <span className={`chevron ${open ? 'open' : ''}`}>&#9660;</span>
          {label}
        </button>
        <div className="source-group-batch">
          {PRIORITY_ORDER.map((p) => (
            <button
              key={p}
              type="button"
              className="priority-btn batch"
              onClick={() => applyAll(p)}
            >
              {PRIORITY_LABELS[p]}
            </button>
          ))}
        </div>
      </div>
      {open && (
        <div className="source-group-body">
          {visible.map((acronym) => (
            <SourceRow
              key={acronym}
              acronym={acronym}
              name={SOURCEBOOK_BY_ACRONYM[acronym] ?? acronym}
              count={counts[acronym] ?? 0}
              damp={damps[acronym] ?? 1.0}
              showFormula={showFormula}
              priority={getPriority(settings, acronym)}
              onPriorityChange={(p) =>
                onChange({ ...settings, [acronym]: p })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CampaignSettingsPanel: React.FC<Props> = ({ settings, onChange }) => {
  const [showFormula, setShowFormula] = useState(false);

  const update = (patch: Partial<CampaignSettings>) => {
    onChange({ ...settings, ...patch });
  };

  const richnessIndex = RICHNESS_STOPS.indexOf(settings.magicRichness);
  const currentRichnessLabel =
    richnessIndex >= 0 ? RICHNESS_LABELS[richnessIndex] : 'Standard';

  const counts = useMemo(() => getBookItemCounts(), []);
  const damps = useMemo(() => getBookDampFactors(), []);

  // Acronyms that appear in the data but aren't in any named group.
  const otherAcronyms = useMemo(() => {
    const grouped = new Set<string>([
      ...SOURCE_GROUPS.core,
      ...SOURCE_GROUPS.settings,
      ...SOURCE_GROUPS.adventures,
    ]);
    return Object.keys(counts)
      .filter((a) => !grouped.has(a))
      .sort();
  }, [counts]);

  const updateSources = (next: SourceSettings) => {
    update({ sourceSettings: next });
  };

  const updateRoleRatio = (role: Role, pct: number) => {
    update({
      roleRatios: { ...settings.roleRatios, [role]: pct / 100 },
    });
  };

  return (
    <div className="settings-page">
      {/* -------- General -------- */}
      <section className="card settings-section">
        <h2 className="card-title">General</h2>
        <div className="settings-content">
          <div className="field-row">
            <label className="field-label">
              Theme:{' '}
              <span className="mono">
                {THEME_OPTIONS.find((t) => t.value === settings.theme)?.label}
              </span>
            </label>
            <div className="segmented-control">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`segmented-btn ${
                    settings.theme === opt.value ? 'active' : ''
                  }`}
                  onClick={() => update({ theme: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field-row">
            <label className="field-label">
              Party Size: <span className="mono">{settings.partySize}</span>
            </label>
            <input
              type="range"
              className="slider"
              min={1}
              max={8}
              step={1}
              value={settings.partySize}
              onChange={(e) => update({ partySize: Number(e.target.value) })}
            />
          </div>

          <div className="field-row">
            <label className="field-label">
              Magic Richness:{' '}
              <span className="mono">{currentRichnessLabel}</span>
            </label>
            <input
              type="range"
              className="slider"
              min={0}
              max={4}
              step={1}
              value={richnessIndex >= 0 ? richnessIndex : 2}
              onChange={(e) =>
                update({
                  magicRichness: RICHNESS_STOPS[Number(e.target.value)],
                })
              }
            />
            <div className="slider-labels">
              {RICHNESS_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>

          <div className="field-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.showValues}
                onChange={(e) => {
                  const showValues = e.target.checked;
                  update({
                    showValues,
                    showSalePrice: showValues
                      ? settings.showSalePrice
                      : false,
                  });
                }}
              />
              Show Values
            </label>
          </div>

          <div className="field-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.showSalePrice}
                disabled={!settings.showValues}
                onChange={(e) => update({ showSalePrice: e.target.checked })}
              />
              Show Sale Price
            </label>
          </div>

          <div className="field-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.showMundane}
                onChange={(e) => update({ showMundane: e.target.checked })}
              />
              Show Mundane Finds
            </label>
          </div>
        </div>
      </section>

      {/* -------- Sources -------- */}
      <section className="card settings-section">
        <div className="settings-section-header">
          <h2 className="card-title">Sources</h2>
          <button
            type="button"
            className="formula-toggle"
            onClick={() => setShowFormula(!showFormula)}
          >
            {showFormula ? 'Hide Formula' : 'Show Formula'}
          </button>
        </div>
        {showFormula && (
          <p className="formula-explain">
            <code>
              effective = tierValue × bookMultiplier ×
              clamp(√(20/count), 0.4, 1.5)
            </code>
            <br />
            Large books are dampened so small books stay competitive.
          </p>
        )}
        <div className="sources-list">
          <SourceGroup
            label={SOURCE_GROUP_LABELS.core}
            acronyms={SOURCE_GROUPS.core}
            settings={settings.sourceSettings}
            counts={counts}
            damps={damps}
            showFormula={showFormula}
            onChange={updateSources}
          />
          <SourceGroup
            label={SOURCE_GROUP_LABELS.settings}
            acronyms={SOURCE_GROUPS.settings}
            settings={settings.sourceSettings}
            counts={counts}
            damps={damps}
            showFormula={showFormula}
            onChange={updateSources}
          />
          <SourceGroup
            label={SOURCE_GROUP_LABELS.adventures}
            acronyms={SOURCE_GROUPS.adventures}
            settings={settings.sourceSettings}
            counts={counts}
            damps={damps}
            showFormula={showFormula}
            onChange={updateSources}
          />
          {otherAcronyms.length > 0 && (
            <SourceGroup
              label="Other"
              acronyms={otherAcronyms}
              settings={settings.sourceSettings}
              counts={counts}
              damps={damps}
              showFormula={showFormula}
              onChange={updateSources}
            />
          )}
        </div>
      </section>

      {/* -------- Role Ratios -------- */}
      <section className="card settings-section">
        <h2 className="card-title">Role Ratios</h2>
        <p className="field-hint">
          Fraction of each creature&apos;s budget that becomes loot.
        </p>
        <div className="role-ratios-grid">
          {(['minion', 'elite', 'boss', 'vault'] as Role[]).map((role) => (
            <div key={role} className="role-ratio-row">
              <label className="field-label">
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </label>
              <div className="role-ratio-input">
                <input
                  type="number"
                  className="role-ratio-number"
                  min={0}
                  max={200}
                  step={5}
                  value={Math.round(settings.roleRatios[role] * 100)}
                  onChange={(e) =>
                    updateRoleRatio(role, Number(e.target.value))
                  }
                />
                <span className="mono">%</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default CampaignSettingsPanel;
