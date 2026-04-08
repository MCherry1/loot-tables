import React, { useState } from 'react';
import type {
  CampaignSettings,
  ResolvableLootResult,
  Tier,
  VaultSize,
} from '@engine/index';
import { generateVaultLootResolvable, VAULT_BUDGET_PER_TIER, VAULT_SIZE_MULTIPLIER } from '@engine/index';
import {
  resolveOneRef,
  resolveAllRefs,
  hasUnresolvedRefs,
} from '@engine/index';
import type { ResolvableMagicItem } from '@engine/index';

interface Props {
  settings: CampaignSettings;
}

/** DMG reference info per tier. */
const DMG_HOARD_INFO: Record<Tier, { levels: string; hoards: number; avgValue: number; totalValue: number; dmgPages: string }> = {
  1: { levels: '1\u20135', hoards: 7, avgValue: 1077, totalValue: 7540, dmgPages: 'p.137' },
  2: { levels: '5\u201310', hoards: 18, avgValue: 7419, totalValue: 133544, dmgPages: 'p.137\u2013138' },
  3: { levels: '10\u201316', hoards: 12, avgValue: 105922, totalValue: 1271070, dmgPages: 'p.138\u2013139' },
  4: { levels: '16\u201320', hoards: 8, avgValue: 710512, totalValue: 5684100, dmgPages: 'p.139' },
};

const VAULT_SIZES: VaultSize[] = ['minor', 'standard', 'major'];

const VAULT_SIZE_LABELS: Record<VaultSize, string> = {
  minor: 'Minor (0.5x)',
  standard: 'Standard (1x)',
  major: 'Major (2x)',
};

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
  const [tier, setTier] = useState<Tier>(1);
  const [vaultSize, setVaultSize] = useState<VaultSize>('standard');
  const [stepByStep, setStepByStep] = useState(false);
  const [result, setResult] = useState<ResolvableLootResult | null>(null);

  const info = DMG_HOARD_INFO[tier];
  const budget = VAULT_BUDGET_PER_TIER[tier] * VAULT_SIZE_MULTIPLIER[vaultSize];

  const handleRoll = () => {
    const loot = generateVaultLootResolvable(
      { tier, size: vaultSize, settings },
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

      {/* Tier Selector */}
      <div className="field-row">
        <label className="field-label">Tier</label>
        <div className="tier-group">
          {([1, 2, 3, 4] as Tier[]).map((t) => (
            <label
              key={t}
              className={`tier-radio ${tier === t ? 'active' : ''}`}
            >
              <input
                type="radio"
                name="vault-tier"
                value={t}
                checked={tier === t}
                onChange={() => setTier(t)}
              />
              {t}
            </label>
          ))}
        </div>
      </div>

      {/* DMG Reference Info */}
      <div className="vault-dmg-info">
        <span className="vault-dmg-ref">DMG {info.dmgPages}</span>
        <span className="vault-dmg-detail">
          Levels {info.levels} &middot; {info.hoards} hoards &middot; ~{info.avgValue.toLocaleString()} gp avg
        </span>
        <span className="vault-dmg-total">
          Tier total: ~{info.totalValue.toLocaleString()} gp
        </span>
      </div>

      {/* Vault Size */}
      <div className="field-row">
        <label className="field-label">Vault Size</label>
        <div className="tier-group">
          {VAULT_SIZES.map((s) => (
            <label
              key={s}
              className={`tier-radio ${vaultSize === s ? 'active' : ''}`}
            >
              <input
                type="radio"
                name="vault-size"
                value={s}
                checked={vaultSize === s}
                onChange={() => setVaultSize(s)}
              />
              {VAULT_SIZE_LABELS[s]}
            </label>
          ))}
        </div>
        <div className="vault-budget-label">
          Budget: ~{Math.round(budget).toLocaleString()} gp
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
