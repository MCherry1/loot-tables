import React, { useCallback, useEffect, useState } from 'react';
import type {
  CampaignSettings,
  ResolvableEncounterResult,
} from '@engine/index';
import { DEFAULT_CAMPAIGN_SETTINGS } from '@engine/index';
import EncounterBuilder from './components/EncounterBuilder';
import VaultHoard from './components/VaultHoard';
import CampaignSettingsPanel from './components/CampaignSettings';
import LootTables from './components/LootTables';

type Tab = 'encounter' | 'tables';

export type ResolvedItem = { name: string; source: string };
export type PendingResolve = { itemId: string; table: string };

const App: React.FC = () => {
  const [settings, setSettings] = useState<CampaignSettings>({
    ...DEFAULT_CAMPAIGN_SETTINGS,
  });
  const [activeTab, setActiveTab] = useState<Tab>('encounter');

  // Encounter state lifted from EncounterBuilder so that resolve-mode handoffs
  // survive tab switches.
  const [encounterResults, setEncounterResults] =
    useState<ResolvableEncounterResult | null>(null);
  const [resolvedItems, setResolvedItems] = useState<
    Record<string, ResolvedItem>
  >({});
  const [pendingResolve, setPendingResolve] = useState<PendingResolve | null>(
    null,
  );

  // When pendingResolve is set (because user clicked an unresolved item in
  // the encounter), force-switch to the Loot Tables tab.
  useEffect(() => {
    if (pendingResolve) setActiveTab('tables');
  }, [pendingResolve]);

  const handleStartResolve = useCallback(
    (itemId: string, table: string) => {
      setPendingResolve({ itemId, table });
    },
    [],
  );

  const handleResolveComplete = useCallback(
    (itemId: string, result: ResolvedItem) => {
      setResolvedItems((prev) => ({ ...prev, [itemId]: result }));
      setPendingResolve(null);
      setActiveTab('encounter');
    },
    [],
  );

  const handleCancelResolve = useCallback(() => {
    setPendingResolve(null);
  }, []);

  // When new encounter results arrive, clear any prior resolved items so the
  // user starts fresh.
  const handleNewResults = useCallback(
    (results: ResolvableEncounterResult | null) => {
      setEncounterResults(results);
      setResolvedItems({});
      setPendingResolve(null);
    },
    [],
  );

  return (
    <div className="app-container">
      <h1 className="app-title">D&amp;D 5e Loot Generator</h1>

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
          <EncounterBuilder
            settings={settings}
            results={encounterResults}
            onResultsChange={handleNewResults}
            resolvedItems={resolvedItems}
            setResolvedItems={setResolvedItems}
            onStartResolve={handleStartResolve}
          />
          <VaultHoard settings={settings} />
          <CampaignSettingsPanel settings={settings} onChange={setSettings} />
        </>
      )}

      {activeTab === 'tables' && (
        <LootTables
          pendingResolve={pendingResolve}
          onResolveComplete={handleResolveComplete}
          onCancelResolve={handleCancelResolve}
        />
      )}
    </div>
  );
};

export default App;
