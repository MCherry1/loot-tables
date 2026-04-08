import React, { useState, useEffect } from 'react';
import type {
  CampaignSettings,
  ItemSegment,
  ResolvableCreatureResult,
  ResolvableEncounterResult,
  ResolvableMagicItem,
} from '@engine/index';
import {
  resolveOneRef,
  resolveAllRefs,
  hasUnresolvedRefs,
  segmentsToString,
} from '@engine/index';

interface Props {
  results: ResolvableEncounterResult;
  settings: CampaignSettings;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Inline component for a single resolvable magic item. */
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

  const nameText = segmentsToString(item.segments);
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

const EncounterResults: React.FC<Props> = ({ results, settings }) => {
  // Own mutable state so step-by-step resolution can update individual items
  const [creatures, setCreatures] = useState<ResolvableCreatureResult[]>(
    results.creatures,
  );

  // Reset when new results come in
  useEffect(() => {
    setCreatures(results.creatures);
  }, [results]);

  const handleItemUpdate = (
    creatureIdx: number,
    itemIdx: number,
    updated: ResolvableMagicItem,
  ) => {
    setCreatures((prev) =>
      prev.map((c, ci) => {
        if (ci !== creatureIdx) return c;
        const newItems = [...c.loot.magicItems];
        newItems[itemIdx] = updated;
        return { ...c, loot: { ...c.loot, magicItems: newItems } };
      }),
    );
  };

  return (
    <div className="results-panel">
      <h3 className="results-title">Results</h3>
      <div className="results-list">
        {creatures.map((creature, ci) => {
          const label = `${capitalize(creature.role)} ${creature.index}`;
          const loot = creature.loot;
          const coinText = `${Math.round(loot.coins.average)} gp`;

          return (
            <div
              className="creature-line"
              key={`${creature.role}-${creature.index}`}
            >
              <span className="creature-label">{label}:</span>{' '}
              <span className="creature-coins">{coinText}</span>
              {/* Gems */}
              {loot.gems.map((gem, i) => (
                <span key={`gem-${i}`}>
                  {', '}
                  <span className="creature-item">
                    {gem.name} ({gem.baseValue} gp)
                  </span>
                </span>
              ))}
              {/* Art */}
              {loot.artObjects.map((art, i) => (
                <span key={`art-${i}`}>
                  {', '}
                  <span className="creature-item">
                    {art.name} ({art.baseValue} gp)
                  </span>
                </span>
              ))}
              {/* Magic Items */}
              {loot.magicItems.map((mi, i) => (
                <span key={`mi-${i}`}>
                  {', '}
                  <ResolvableItem
                    item={mi}
                    onUpdate={(updated) => handleItemUpdate(ci, i, updated)}
                    settings={settings}
                  />
                </span>
              ))}
              {/* Mundane Finds */}
              {settings.showMundane && loot.mundaneFinds.length > 0 && (
                <div className="mundane-finds">
                  {loot.mundaneFinds.map((find, i) => (
                    <span key={i} className="mundane-item">
                      {find}
                      {i < loot.mundaneFinds.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="results-total">
        Total: {Math.round(results.totalCoinsAvg).toLocaleString()} gp +{' '}
        {results.totalItems} item{results.totalItems !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

export default EncounterResults;
