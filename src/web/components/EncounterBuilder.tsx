import React, { useState } from 'react';
import type {
  CampaignSettings,
  EncounterResult,
  Role,
  Tier,
} from '@engine/index';
import { generateEncounter, CR_TO_DEFAULT_TIER } from '@engine/index';
import EncounterResults from './EncounterResults';

const ROLES: Role[] = ['minion', 'elite', 'boss', 'vault'];
const SUB_CRS = [
  { label: '1/8', value: 0.125 },
  { label: '1/4', value: 0.25 },
  { label: '1/2', value: 0.5 },
];

interface Props {
  settings: CampaignSettings;
}

const EncounterBuilder: React.FC<Props> = ({ settings }) => {
  const [cr, setCr] = useState<number>(1);
  const [useSubCr, setUseSubCr] = useState(false);
  const [tier, setTier] = useState<Tier>(1);
  const [autoTier, setAutoTier] = useState(true);
  const [counts, setCounts] = useState<Record<Role, number>>({
    minion: 0,
    elite: 0,
    boss: 0,
    vault: 0,
  });
  const [results, setResults] = useState<EncounterResult | null>(null);

  const effectiveTier: Tier = autoTier
    ? (CR_TO_DEFAULT_TIER[Math.floor(cr)] ?? 1)
    : tier;

  const handleCrChange = (value: number) => {
    setCr(value);
    if (autoTier) {
      setTier(CR_TO_DEFAULT_TIER[Math.floor(value)] ?? 1);
    }
  };

  const adjustCount = (role: Role, delta: number) => {
    setCounts((prev) => ({
      ...prev,
      [role]: Math.max(0, prev[role] + delta),
    }));
  };

  const handleRoll = () => {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total === 0) return;

    const result = generateEncounter({
      cr,
      tier: effectiveTier,
      autoTier,
      counts,
      settings,
    });
    setResults(result);
  };

  return (
    <div className="card">
      <h2 className="card-title">Encounter Builder</h2>

      {/* CR Input */}
      <div className="field-row">
        <label className="field-label">Challenge Rating</label>
        <div className="cr-input-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={useSubCr}
              onChange={(e) => {
                setUseSubCr(e.target.checked);
                if (e.target.checked) {
                  setCr(0.125);
                  handleCrChange(0.125);
                } else {
                  setCr(1);
                  handleCrChange(1);
                }
              }}
            />
            Sub-1 CR
          </label>
          {useSubCr ? (
            <select
              className="cr-select"
              value={cr}
              onChange={(e) => handleCrChange(Number(e.target.value))}
            >
              {SUB_CRS.map((s) => (
                <option key={s.value} value={s.value}>
                  CR {s.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="number"
              className="cr-number"
              min={0}
              max={30}
              step={1}
              value={cr}
              onChange={(e) => handleCrChange(Number(e.target.value))}
            />
          )}
        </div>
      </div>

      {/* Tier Selector */}
      <div className="field-row">
        <label className="field-label">Tier</label>
        <div className="tier-group">
          {([1, 2, 3, 4] as Tier[]).map((t) => (
            <label key={t} className={`tier-radio ${effectiveTier === t ? 'active' : ''}`}>
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

      {/* Role Counts */}
      <div className="field-row">
        <label className="field-label">Creatures</label>
        <div className="roles-grid">
          {ROLES.map((role) => (
            <div key={role} className="role-stepper">
              <span className="role-label">{role}</span>
              <div className="stepper-controls">
                <button
                  className="stepper-btn"
                  onClick={() => adjustCount(role, -1)}
                  disabled={counts[role] === 0}
                >
                  &minus;
                </button>
                <span className="stepper-value">{counts[role]}</span>
                <button
                  className="stepper-btn"
                  onClick={() => adjustCount(role, 1)}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Roll Button */}
      <button className="roll-btn" onClick={handleRoll}>
        Roll Encounter
      </button>

      {/* Results */}
      {results && <EncounterResults results={results} settings={settings} />}
    </div>
  );
};

export default EncounterBuilder;
