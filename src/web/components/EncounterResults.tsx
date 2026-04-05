import React from 'react';
import type { CampaignSettings, CreatureResult, MagicItemResult } from '@engine/index';
import type { EncounterResult } from '@engine/index';

interface Props {
  results: EncounterResult;
  settings: CampaignSettings;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatMagicItem(item: MagicItemResult, settings: CampaignSettings): string {
  let text = `${item.name} [${item.table}] (${item.source})`;
  if (settings.showValues && item.buyPrice != null) {
    text += ` Value: ${item.buyPrice.toLocaleString()} gp`;
  }
  if (settings.showSalePrice && item.salePrice != null) {
    text += ` | Sale: ${item.salePrice.toLocaleString()} gp`;
  }
  return text;
}

function formatCreatureLine(creature: CreatureResult, settings: CampaignSettings): React.ReactNode {
  const label = `${capitalize(creature.role)} ${creature.index}`;
  const loot = creature.loot;
  const coinText = `${Math.round(loot.coins.average)} gp`;

  const itemParts: string[] = [];
  for (const gem of loot.gems) {
    itemParts.push(`${gem.name} (${gem.baseValue} gp)`);
  }
  for (const art of loot.artObjects) {
    itemParts.push(`${art.name} (${art.baseValue} gp)`);
  }
  for (const mi of loot.magicItems) {
    itemParts.push(formatMagicItem(mi, settings));
  }

  const mundaneParts: string[] = settings.showMundane ? loot.mundaneFinds : [];

  return (
    <div className="creature-line" key={`${creature.role}-${creature.index}`}>
      <span className="creature-label">{label}:</span>{' '}
      <span className="creature-coins">{coinText}</span>
      {itemParts.length > 0 && (
        <>
          {', '}
          {itemParts.map((part, i) => (
            <span key={i} className="creature-item">
              {part}
              {i < itemParts.length - 1 ? ', ' : ''}
            </span>
          ))}
        </>
      )}
      {mundaneParts.length > 0 && (
        <div className="mundane-finds">
          {mundaneParts.map((find, i) => (
            <span key={i} className="mundane-item">{find}{i < mundaneParts.length - 1 ? ', ' : ''}</span>
          ))}
        </div>
      )}
    </div>
  );
}

const EncounterResults: React.FC<Props> = ({ results, settings }) => {
  return (
    <div className="results-panel">
      <h3 className="results-title">Results</h3>
      <div className="results-list">
        {results.creatures.map((creature) =>
          formatCreatureLine(creature, settings),
        )}
      </div>
      <div className="results-total">
        Total: {Math.round(results.totalCoinsAvg).toLocaleString()} gp + {results.totalItems} item{results.totalItems !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

export default EncounterResults;
