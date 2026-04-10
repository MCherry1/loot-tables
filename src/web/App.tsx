import React, { useCallback, useEffect, useState } from 'react';
import type {
  CampaignSettings,
  ResolvableEncounterResult,
  ThemePref,
} from '@engine/index';
import { DEFAULT_CAMPAIGN_SETTINGS } from '@engine/index';
import EncounterBuilder from './components/EncounterBuilder';
import VaultHoard from './components/VaultHoard';
import CampaignSettingsPanel from './components/CampaignSettings';
import LootTables from './components/LootTables';
import About from './components/About';
import ReviewUI from './components/ReviewUI';

type Tab = 'tables' | 'encounter' | 'settings' | 'review' | 'about';

export type ResolvedItem = { name: string; source: string };
export type PendingResolve = { itemId: string; table: string };

const SETTINGS_STORAGE_KEY = 'loot-tables:settings:v1';

/** Load settings from localStorage, merged with defaults. */
function loadSettings(): CampaignSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_CAMPAIGN_SETTINGS };
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CAMPAIGN_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<CampaignSettings>;
    return {
      ...DEFAULT_CAMPAIGN_SETTINGS,
      ...parsed,
      roleRatios: {
        ...DEFAULT_CAMPAIGN_SETTINGS.roleRatios,
        ...(parsed.roleRatios ?? {}),
      },
      sourceSettings: { ...(parsed.sourceSettings ?? {}) },
    };
  } catch {
    return { ...DEFAULT_CAMPAIGN_SETTINGS };
  }
}

/** Resolve the effective theme given a preference and the system setting. */
function resolveTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref === 'light' || pref === 'dark') return pref;
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

const App: React.FC = () => {
  const [settings, setSettings] = useState<CampaignSettings>(() =>
    loadSettings(),
  );
  const [activeTab, setActiveTab] = useState<Tab>('tables');
  const [adminMode, setAdminMode] = useState(() => {
    try {
      return localStorage.getItem('loot-tables:admin') === 'true';
    } catch {
      return false;
    }
  });

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

  // Persist settings to localStorage whenever they change.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(settings),
      );
    } catch {
      // Ignore quota/serialization errors — settings just won't persist.
    }
  }, [settings]);

  // Apply theme to <html data-theme="..."> and track system changes for 'auto'.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(settings.theme);
    };
    apply();
    if (settings.theme !== 'auto') return;
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [settings.theme]);

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
        <button
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
        {adminMode && (
          <button
            className={`tab-btn ${activeTab === 'review' ? 'active' : ''}`}
            onClick={() => setActiveTab('review')}
          >
            Review
          </button>
        )}
        <button
          className={`tab-btn ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          About
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'tables' && (
        <LootTables
          settings={settings}
          pendingResolve={pendingResolve}
          onResolveComplete={handleResolveComplete}
          onCancelResolve={handleCancelResolve}
        />
      )}

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
        </>
      )}

      {activeTab === 'settings' && (
        <CampaignSettingsPanel
          settings={settings}
          onChange={setSettings}
          adminMode={adminMode}
          onAdminModeChange={setAdminMode}
        />
      )}

      {activeTab === 'review' && adminMode && <ReviewUI />}

      {activeTab === 'about' && <About />}
    </div>
  );
};

export default App;
