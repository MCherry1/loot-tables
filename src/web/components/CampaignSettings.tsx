import React, { useMemo, useState } from 'react';
import type {
  CampaignSettings,
  CreatureRole,
  Edition,
  Palette,
  SourcePriority,
  SourceSettings,
  ThemePref,
  Tier,
} from '@engine/index';
import {
  SOURCE_GROUPS,
  SOURCE_GROUP_LABELS,
  ROLE_MULTIPLIER,
  getBookItemCounts,
  getBookDampFactors,
  tierFromLevel,
  progressionMultiplier,
} from '@engine/index';
import { SOURCEBOOK_BY_ACRONYM } from '../../data/sourcebook-lookup';

const RICHNESS_STOPS = [0.5, 0.75, 1.0, 1.25, 1.5];
const RICHNESS_LABELS = ['Scarce', 'Low', 'Standard', 'High', 'Abundant'];

const CREATURE_ROLES: CreatureRole[] = ['minion', 'elite', 'mini-boss', 'boss'];
const ROLE_DISPLAY: Record<CreatureRole, string> = {
  minion: 'Minion',
  elite: 'Elite',
  'mini-boss': 'Mini-boss',
  boss: 'Boss',
};

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

const PALETTE_OPTIONS: { value: Palette; label: string; swatch: string }[] = [
  { value: 'treasure', label: 'Treasure', swatch: '#c9943a' },
  { value: 'stone',    label: 'Stone',    swatch: '#607080' },
  { value: 'verdant',  label: 'Verdant',  swatch: '#4a7a3a' },
  { value: 'arcane',   label: 'Arcane',   swatch: '#6a3a9a' },
];

const DICE_COLORS: { label: string; color: string; pip?: string }[] = [
  { label: 'Ivory',       color: '#f5ede0', pip: '#2a1f14' },
  { label: 'Obsidian',    color: '#1a1a22', pip: '#e0e0e8' },
  { label: 'Ruby',        color: '#a82020', pip: '#f8d8d0' },
  { label: 'Sapphire',    color: '#2040a0', pip: '#d0d8f8' },
  { label: 'Emerald',     color: '#1a6a30', pip: '#d0f0d8' },
  { label: 'Amethyst',    color: '#6a30a0', pip: '#e8d0f8' },
  { label: 'Gold',        color: '#c9943a', pip: '#1a1208' },
  { label: 'Silver',      color: '#a8b0b8', pip: '#1a1a22' },
  { label: 'Copper',      color: '#b06830', pip: '#f8e8d0' },
  { label: 'Frost',       color: '#d0e8f8', pip: '#1a3050' },
  { label: 'Crimson & Gold', color: '#8a1818', pip: '#f0c848' },
  { label: 'Midnight',    color: '#101840', pip: '#90a8e0' },
];

interface Props {
  settings: CampaignSettings;
  onChange: (settings: CampaignSettings) => void;
  adminMode?: boolean;
  onAdminModeChange?: (enabled: boolean) => void;
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

const CampaignSettingsPanel: React.FC<Props> = ({ settings, onChange, adminMode, onAdminModeChange }) => {
  const [showFormula, setShowFormula] = useState(false);
  const [manualTier, setManualTier] = useState<Tier>(1);

  const update = (patch: Partial<CampaignSettings>) => {
    onChange({ ...settings, ...patch });
  };

  const partyLevel = settings.partyLevel ?? 5;
  const autoTier = settings.autoTier ?? true;
  const tierProg = settings.tierProgression ?? true;
  const effectiveTier: Tier = autoTier ? tierFromLevel(partyLevel) : manualTier;
  const multiplier = progressionMultiplier(partyLevel, effectiveTier, tierProg);

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
      ...SOURCE_GROUPS.digital,
      ...SOURCE_GROUPS.thirdparty,
    ]);
    return Object.keys(counts)
      .filter((a) => !grouped.has(a))
      .sort();
  }, [counts]);

  const updateSources = (next: SourceSettings) => {
    update({ sourceSettings: next });
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
              Palette:{' '}
              <span className="mono">
                {PALETTE_OPTIONS.find((p) => p.value === (settings.palette ?? 'treasure'))?.label}
              </span>
            </label>
            <div className="palette-swatches">
              {PALETTE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`palette-swatch ${
                    (settings.palette ?? 'treasure') === opt.value ? 'active' : ''
                  }`}
                  style={{ backgroundColor: opt.swatch }}
                  onClick={() => update({ palette: opt.value })}
                  title={opt.label}
                  aria-label={`${opt.label} palette`}
                />
              ))}
            </div>
          </div>

          <div className="field-row">
            <label className="field-label">
              Dice:{' '}
              <span className="mono">
                {DICE_COLORS.find((d) => d.color === (settings.diceColor ?? '#f5ede0'))?.label ?? 'Ivory'}
              </span>
            </label>
            <div className="dice-color-swatches">
              {DICE_COLORS.map((dc) => (
                <button
                  key={dc.color}
                  type="button"
                  className={`dice-swatch ${
                    (settings.diceColor ?? '#f5ede0') === dc.color ? 'active' : ''
                  }`}
                  style={{ backgroundColor: dc.color, borderColor: dc.pip }}
                  onClick={() => update({ diceColor: dc.color })}
                  title={dc.label}
                  aria-label={`${dc.label} dice`}
                />
              ))}
            </div>
          </div>

          <div className="field-row">
            <label className="field-label">
              Edition:{' '}
              <span className="mono">{settings.edition ?? '2014'}</span>
            </label>
            <div className="segmented-control">
              {(['2014', '2024'] as Edition[]).map((ed) => (
                <button
                  key={ed}
                  type="button"
                  className={`segmented-btn ${
                    (settings.edition ?? '2014') === ed ? 'active' : ''
                  }`}
                  onClick={() => update({ edition: ed })}
                >
                  {ed}
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
            <label className="field-label">
              Party Level: <span className="mono">{partyLevel}</span>
            </label>
            <div className="level-stepper">
              <button
                className="stepper-btn"
                disabled={partyLevel <= 1}
                onClick={() => update({ partyLevel: partyLevel - 1 })}
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
                  update({ partyLevel: v });
                }}
              />
              <button
                className="stepper-btn"
                disabled={partyLevel >= 20}
                onClick={() => update({ partyLevel: partyLevel + 1 })}
              >
                +
              </button>
            </div>
          </div>

          <div className="field-row">
            <label className="field-label">Tier</label>
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
                  onChange={(e) => update({ autoTier: e.target.checked })}
                />
                Use party level to determine tier
              </label>
            </div>
          </div>

          <div className="field-row">
            <label className="field-label">
              Tier Progression:{' '}
              <span className="mono">×{multiplier.toFixed(2)}</span>
            </label>
            <div className="segmented-control">
              <button
                type="button"
                className={`segmented-btn ${tierProg ? 'active' : ''}`}
                onClick={() => update({ tierProgression: true })}
              >
                Natural Progression
              </button>
              <button
                type="button"
                className={`segmented-btn ${!tierProg ? 'active' : ''}`}
                onClick={() => update({ tierProgression: false })}
              >
                Flat
              </button>
            </div>
            <p className="field-hint">
              Natural Progression scales treasure within the tier (×0.70 at start → ×1.30 at end). Flat is always ×1.00.
            </p>
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

          <div className="field-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.convertToGold ?? false}
                onChange={(e) => update({ convertToGold: e.target.checked })}
              />
              Convert to Gold
            </label>
            <p className="field-hint">
              Trade up lower denominations to maximize gold pieces.
            </p>
          </div>

          <div className="field-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.splitAmongParty ?? false}
                onChange={(e) => update({ splitAmongParty: e.target.checked })}
              />
              Split Among Party
            </label>
            <p className="field-hint">
              Divide coins evenly among party members, showing remainder.
            </p>
          </div>

          <div className="field-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.showItemDetails ?? false}
                onChange={(e) => update({ showItemDetails: e.target.checked })}
              />
              Show Item Details
            </label>
          </div>

          <div className="field-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.dice3d ?? false}
                onChange={(e) => update({ dice3d: e.target.checked })}
              />
              Enable 3D Dice
            </label>
            <p className="field-hint">
              Physics-based 3D dice animation when rolling on tables.
            </p>
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
          <SourceGroup
            label={SOURCE_GROUP_LABELS.digital}
            acronyms={SOURCE_GROUPS.digital}
            settings={settings.sourceSettings}
            counts={counts}
            damps={damps}
            showFormula={showFormula}
            onChange={updateSources}
          />
          <SourceGroup
            label={SOURCE_GROUP_LABELS.thirdparty}
            acronyms={SOURCE_GROUPS.thirdparty}
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

      {/* -------- Role Multipliers -------- */}
      <section className="card settings-section">
        <h2 className="card-title">Role Multipliers</h2>
        <p className="field-hint">
          Fixed ~3× geometric steps. Over a balanced campaign (25% XP per role),
          total wealth distributed equals total XP budget.
        </p>
        <div className="role-ratios-grid">
          {CREATURE_ROLES.map((role) => {
            const mult = ROLE_MULTIPLIER[role];
            return (
              <div key={role} className="role-ratio-row">
                <label className="field-label">{ROLE_DISPLAY[role]}</label>
                <div className="role-ratio-input">
                  <span className="mono">×{mult.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* -------- Admin -------- */}
      <section className="card settings-section">
        <h2 className="card-title">Admin</h2>
        <div className="settings-content">
          <div className="field-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={adminMode ?? false}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  try {
                    localStorage.setItem('loot-tables:admin', String(enabled));
                  } catch { /* ignore */ }
                  onAdminModeChange?.(enabled);
                }}
              />
              Enable Admin Mode
            </label>
            <p className="field-hint">
              Shows the Review tab for curating item assignments and weights.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CampaignSettingsPanel;
