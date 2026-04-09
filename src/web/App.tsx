import React, { useState } from 'react';
import type { CampaignSettings } from '@engine/index';
import { DEFAULT_CAMPAIGN_SETTINGS } from '@engine/index';
import EncounterBuilder from './components/EncounterBuilder';
import VaultHoard from './components/VaultHoard';
import CampaignSettingsPanel from './components/CampaignSettings';
import LootTables from './components/LootTables';

type Tab = 'encounter' | 'tables';

const App: React.FC = () => {
  const [settings, setSettings] = useState<CampaignSettings>({
    ...DEFAULT_CAMPAIGN_SETTINGS,
  });
  const [activeTab, setActiveTab] = useState<Tab>('tables');

  return (
    <div className="app-container">
      <h1 className="app-title">D&D 5e Loot Generator</h1>

      {/* Tab Navigation */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'tables' ? 'active' : ''}`}
          onClick={() => setActiveTab('tables')}
        >
          Loot Tables
        </button>
        <button
          className={`tab-btn ${activeTab === 'encounter' ? 'active' : ''}`}
          onClick={() => setActiveTab('encounter')}
        >
          Encounter Builder
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'encounter' && (
        <>
          <EncounterBuilder settings={settings} />
          <VaultHoard settings={settings} />
          <CampaignSettingsPanel settings={settings} onChange={setSettings} />
        </>
      )}

      {activeTab === 'tables' && <LootTables />}
    </div>
  );
};

export default App;
