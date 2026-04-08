import React, { useState } from 'react';
import type {
  CampaignSettings,
  ResolvableLootResult,
  Tier,
} from '@engine/index';
import { generateLootResolvable, crToDefaultTier } from '@engine/index';
import {
  resolveOneRef,
  resolveAllRefs,
  hasUnresolvedRefs,
  segmentsToString,
} from '@engine/index';
import type { ResolvableMagicItem } from '@engine/index';
import { CrSelector } from './EncounterBuilder';

interface Props {
  settings: CampaignSettings;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ResolvableItem({
  item,
  onUpdate,
  settings,
}: {
  item: ResolvableMagicItem;
  onUpdate: (updated: ResolvableMagicItem) => void;
  settings: CampaignSettings;
}) {
  const handleResolveRef = (refId: string) => {
    const result = resolveOneRef(item.segments, refId);
    const newSegments = result.segments;
    const newSource = result.source || item.source;
    onUpdate({
      ...item,
      segments: newSegments,
      source: newSource,
      isFullyResolved: !hasUnresolvedRefs(newSegments),
    });
  };

  const handleResolveAll = () => {
    const result = resolveAllRefs(item.segments);
    onUpdate({
      ...item,
      segments: result.segments,
      source: result.source || item.source,
      isFullyResolved: true,
    });
  };

  const hasRefs = !item.isFullyResolved;

  return (
    <span className="resolvable-item">
      {item.segments.map((seg, i) =>
        seg.type === 'text' ? (
          <span key={i} className="creature-item">
            {seg.value}
          </span>
        ) : (
          <button
            key={seg.id}
            className="ref-btn"
            onClick={() => handleResolveRef(seg.id)}
            title={`Roll on ${seg.tableName}`}
          >
            {seg.tableName}
          </button>
        ),
      )}
      {hasRefs && (
        <button
          className="resolve-all-btn"
          onClick={handleResolveAll}
          title="Resolve all remaining"
        >
          resolve all
        </button>
      )}
      {' '}
      <span className="item-meta">
        [{item.table}]
        {item.source && ` (${item.source})`}
        {settings.showValues && item.buyPrice != null && (
          <> Value: {item.buyPrice.toLocaleString()} gp</>
        )}
        {settings.showSalePrice && item.salePrice != null && (
          <> | Sale: {item.salePrice.toLocaleString()} gp</>
        )}
      </span>
    </span>
  );
}

const VaultHoard: React.FC<Props> = ({ settings }) => {
  const [cr, setCr] = useState<number>(5);
  const [tier, setTier] = useState<Tier>(1);
  const [autoTier, setAutoTier] = useState(true);
  const [stepByStep, setStepByStep] = useState(false);
  const [result, setResult] = useState<ResolvableLootResult | null>(null);

  const effectiveTier: Tier = autoTier ? crToDefaultTier(cr) : tier;

  const handleRoll = () => {
    const loot = generateLootResolvable(
      { cr, tier: effectiveTier, role: 'vault', settings },
      !stepByStep,
    );
    setResult(loot);
  };

  const handleItemUpdate = (itemIdx: number, updated: ResolvableMagicItem) => {
    if (!result) return;
    setResult((prev) => {
      if (!prev) return prev;
      const newItems = [...prev.magicItems];
      newItems[itemIdx] = updated;
      return { ...prev, magicItems: newItems };
    });
  };

  return (
    <div className="card">
      <h2 className="card-title">Vault Hoard</h2>

      {/* CR Selector */}
      <div className="field-row">
        <label className="field-label">Challenge Rating</label>
        <CrSelector value={cr} onChange={setCr} />
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
                name="vault-tier"
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

      {/* Resolution Mode */}
      <div className="field-row">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={stepByStep}
            onChange={(e) => setStepByStep(e.target.checked)}
          />
          Resolve step-by-step
        </label>
      </div>

      {/* Roll Button */}
      <button className="roll-btn" onClick={handleRoll}>
        Roll Hoard
      </button>

      {/* Results */}
      {result && (
        <div className="results-panel">
          <h3 className="results-title">Hoard Contents</h3>
          <div className="creature-line">
            <span className="creature-coins">
              {Math.round(result.coins.average)} gp
            </span>
            {result.gems.map((gem, i) => (
              <span key={`gem-${i}`}>
                {', '}
                <span className="creature-item">
                  {gem.name} ({gem.baseValue} gp)
                </span>
              </span>
            ))}
            {result.artObjects.map((art, i) => (
              <span key={`art-${i}`}>
                {', '}
                <span className="creature-item">
                  {art.name} ({art.baseValue} gp)
                </span>
              </span>
            ))}
            {result.magicItems.map((mi, i) => (
              <span key={`mi-${i}`}>
                {', '}
                <ResolvableItem
                  item={mi}
                  onUpdate={(updated) => handleItemUpdate(i, updated)}
                  settings={settings}
                />
              </span>
            ))}
          </div>
          {settings.showMundane && result.mundaneFinds.length > 0 && (
            <div className="mundane-finds">
              {result.mundaneFinds.map((find, i) => (
                <span key={i} className="mundane-item">{find}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VaultHoard;
