import React from 'react';
import type {
  CampaignSettings,
  ResolvableEncounterResult,
  ResolvableMagicItem,
} from '@engine/index';
import type { ResolvedItem } from '../App';

interface Props {
  results: ResolvableEncounterResult;
  settings: CampaignSettings;
  resolvedItems: Record<string, ResolvedItem>;
  onStartResolve: (itemId: string, table: string) => void;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Inline component for a single magic item — either an unresolved button
 *  that opens the stepper, or a static resolved name. */
function MagicItemSlot({
  item,
  itemId,
  resolved,
  onStartResolve,
  settings,
}: {
  item: ResolvableMagicItem;
  itemId: string;
  resolved: ResolvedItem | undefined;
  onStartResolve: (itemId: string, table: string) => void;
  settings: CampaignSettings;
}) {
  const tableKey = `Magic-Item-Table-${item.table}`;

  return (
    <span className="resolvable-item">
      {resolved ? (
        <span className="resolved-name">{resolved.name}</span>
      ) : (
        <button
          className="unresolved-link"
          onClick={() => onStartResolve(itemId, tableKey)}
          title={`Resolve via Magic Item Table ${item.table}`}
        >
          {`Magic Item — Table ${item.table} →`}
        </button>
      )}{' '}
      <span className="item-meta">
        {resolved && resolved.source && `(${resolved.source})`}
        {!resolved && item.source && `(${item.source})`}
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

const EncounterResults: React.FC<Props> = ({
  results,
  settings,
  resolvedItems,
  onStartResolve,
}) => {
  return (
    <div className="results-panel">
      <h3 className="results-title">Results</h3>
      <div className="results-list">
        {results.creatures.map((creature, ci) => {
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
              {loot.gems.map((gem, i) => (
                <span key={`gem-${i}`}>
                  {', '}
                  <span className="creature-item">
                    {gem.name} ({gem.baseValue} gp)
                  </span>
                </span>
              ))}
              {loot.artObjects.map((art, i) => (
                <span key={`art-${i}`}>
                  {', '}
                  <span className="creature-item">
                    {art.name} ({art.baseValue} gp)
                  </span>
                </span>
              ))}
              {loot.magicItems.map((mi, i) => {
                const itemId = `mi-${ci}-${i}`;
                return (
                  <span key={`mi-${i}`}>
                    {', '}
                    <MagicItemSlot
                      item={mi}
                      itemId={itemId}
                      resolved={resolvedItems[itemId]}
                      onStartResolve={onStartResolve}
                      settings={settings}
                    />
                  </span>
                );
              })}
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
