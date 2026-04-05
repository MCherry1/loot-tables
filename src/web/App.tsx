import React, { useState } from 'react';
import type { CampaignSettings } from '@engine/index';
import { DEFAULT_CAMPAIGN_SETTINGS } from '@engine/index';
import EncounterBuilder from './components/EncounterBuilder';
import CampaignSettingsPanel from './components/CampaignSettings';

const App: React.FC = () => {
  const [settings, setSettings] = useState<CampaignSettings>({
    ...DEFAULT_CAMPAIGN_SETTINGS,
  });

  return (
    <div className="app-container">
      <h1 className="app-title">D&D 5e Loot Generator</h1>
      <EncounterBuilder settings={settings} />
      <CampaignSettingsPanel settings={settings} onChange={setSettings} />
    </div>
  );
};

export default App;
