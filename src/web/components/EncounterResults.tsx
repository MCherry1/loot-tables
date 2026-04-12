import React from 'react';
import type {
  CampaignSettings,
  CoinBreakdown,
  ResolvableEncounterResult,
  ResolvableMagicItem,
} from '@engine/index';
import type { ResolvedItem } from '../App';
import { expandSource } from '../../data/sourcebook-lookup';

interface Props {
  results: ResolvableEncounterResult;
  settings: CampaignSettings;
  resolvedItems: Record<string, ResolvedItem>;
  onStartResolve: (itemId: string, table: string) => void;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Format a CoinBreakdown into a human-readable denomination string. */
function formatCoins(coins: CoinBreakdown, convertToGold: boolean, splitAmongParty: boolean, partySize: number): string {
  let { cp, sp, gp, pp } = {
    cp: coins.cp.rolled,
    sp: coins.sp.rolled,
    gp: coins.gp.rolled,
    pp: coins.pp.rolled,
  };

  // Use averages if nothing was rolled
  if (cp === 0 && sp === 0 && gp === 0 && pp === 0) {
    cp = Math.round(coins.cp.average);
    sp = Math.round(coins.sp.average);
    gp = Math.round(coins.gp.average);
    pp = Math.round(coins.pp.average);
  }

  if (cp === 0 && sp === 0 && gp === 0 && pp === 0) return '';

  if (convertToGold) {
    gp += Math.floor(cp / 100);
    cp = cp % 100;
    gp += Math.floor(sp / 10);
    sp = sp % 10;
  }

  const parts: string[] = [];
  if (splitAmongParty && partySize > 1) {
    if (cp > 0) {
      const each = Math.floor(cp / partySize);
      const rem = cp % partySize;
      if (each > 0) parts.push(rem > 0 ? `${each} cp each (+${rem})` : `${each} cp each`);
      else if (rem > 0) parts.push(`${rem} cp remainder`);
    }
    if (sp > 0) {
      const each = Math.floor(sp / partySize);
      const rem = sp % partySize;
      if (each > 0) parts.push(rem > 0 ? `${each} sp each (+${rem})` : `${each} sp each`);
      else if (rem > 0) parts.push(`${rem} sp remainder`);
    }
    if (gp > 0) {
      const each = Math.floor(gp / partySize);
      const rem = gp % partySize;
      if (each > 0) parts.push(rem > 0 ? `${each} gp each (+${rem})` : `${each} gp each`);
      else if (rem > 0) parts.push(`${rem} gp remainder`);
    }
    if (pp > 0) {
      const each = Math.floor(pp / partySize);
      const rem = pp % partySize;
      if (each > 0) parts.push(rem > 0 ? `${each} pp each (+${rem})` : `${each} pp each`);
      else if (rem > 0) parts.push(`${rem} pp remainder`);
    }
  } else {
    if (cp > 0) parts.push(`${cp} cp`);
    if (sp > 0) parts.push(`${sp} sp`);
    if (gp > 0) parts.push(`${gp} gp`);
    if (pp > 0) parts.push(`${pp} pp`);
  }
  return parts.join(', ');
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
        {resolved && resolved.source && `(${expandSource(resolved.source)})`}
        {!resolved && item.source && `(${expandSource(item.source)})`}
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
          const coinText = formatCoins(
            loot.coins,
            settings.convertToGold ?? false,
            settings.splitAmongParty ?? false,
            settings.partySize,
          );

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
                    {gem.description ?? gem.name} ({gem.value} gp)
                  </span>
                </span>
              ))}
              {loot.artObjects.map((art, i) => (
                <span key={`art-${i}`}>
                  {', '}
                  <span className="creature-item">
                    {art.description ?? art.name} ({art.value} gp)
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
