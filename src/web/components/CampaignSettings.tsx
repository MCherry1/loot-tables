import React, { useState } from 'react';
import type { CampaignSettings } from '@engine/index';

const RICHNESS_STOPS = [0.5, 0.75, 1.0, 1.25, 1.5];
const RICHNESS_LABELS = ['Scarce', 'Low', 'Standard', 'High', 'Abundant'];

interface Props {
  settings: CampaignSettings;
  onChange: (settings: CampaignSettings) => void;
}

const CampaignSettingsPanel: React.FC<Props> = ({ settings, onChange }) => {
  const [open, setOpen] = useState(false);

  const update = (patch: Partial<CampaignSettings>) => {
    onChange({ ...settings, ...patch });
  };

  const richnessIndex = RICHNESS_STOPS.indexOf(settings.magicRichness);
  const currentRichnessLabel =
    richnessIndex >= 0 ? RICHNESS_LABELS[richnessIndex] : 'Standard';

  return (
    <div className="card settings-card">
      <button
        className="collapsible-header"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <h2 className="card-title" style={{ margin: 0 }}>
          Campaign Settings
        </h2>
        <span className={`chevron ${open ? 'open' : ''}`}>&#9660;</span>
      </button>

      <div className={`collapsible-body ${open ? 'expanded' : ''}`}>
        <div className="settings-content">
          {/* Party Size */}
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

          {/* Magic Richness */}
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
                update({ magicRichness: RICHNESS_STOPS[Number(e.target.value)] })
              }
            />
            <div className="slider-labels">
              {RICHNESS_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>

          {/* Checkboxes */}
          <div className="field-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.showValues}
                onChange={(e) => {
                  const showValues = e.target.checked;
                  update({
                    showValues,
                    showSalePrice: showValues ? settings.showSalePrice : false,
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
      </div>
    </div>
  );
};

export default CampaignSettingsPanel;
