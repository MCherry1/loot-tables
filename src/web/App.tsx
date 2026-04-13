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
import ReferenceView from './components/ReferenceView';
import About from './components/About';
import HowItWorks from './components/HowItWorks';
import DDesign from './components/DDesign';
import ReviewUI from './components/ReviewUI';

type Tab =
  | 'tables'
  | 'reference'
  | 'encounter'
  | 'settings'
  | 'review'
  | 'about'
  | 'how-it-works'
  | 'ddesign';

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
  // the encounter), force-switch to the Magic Item Tables tab.
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

  const TABS: { id: Tab; label: string }[] = [
    { id: 'tables',       label: 'Tables' },
    { id: 'reference',    label: 'Reference' },
    { id: 'encounter',    label: 'Loot Drops' },
    { id: 'settings',     label: 'Settings' },
    { id: 'about',        label: 'About' },
    { id: 'how-it-works', label: 'How it Works' },
    { id: 'ddesign',      label: 'D\u0026Design' },
  ];

  const themeOptions: { value: ThemePref; glyph: string; label: string }[] = [
    { value: 'light', glyph: '\u2600',  label: 'Light theme' },
    { value: 'auto',  glyph: '\u25D0',  label: 'Auto theme' },
    { value: 'dark',  glyph: '\u263E',  label: 'Dark theme' },
  ];

  return (
    <>
      <nav className="ck-nav" aria-label="Site navigation">
        <span className="ck-nav-brand">CherryKeep</span>
        <div className="ck-nav-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={activeTab === t.id}
              className={`ck-nav-tab${activeTab === t.id ? ' active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
          {adminMode && (
            <button
              role="tab"
              aria-selected={activeTab === 'review'}
              className={`ck-nav-tab${activeTab === 'review' ? ' active' : ''}`}
              onClick={() => setActiveTab('review')}
            >
              Review
            </button>
          )}
        </div>
        <div className="ck-nav-right">
          <div className="ck-theme-toggle" role="group" aria-label="Theme">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-label={opt.label}
                aria-pressed={settings.theme === opt.value}
                className={`ck-theme-btn${settings.theme === opt.value ? ' active' : ''}`}
                onClick={() =>
                  setSettings((prev) => ({ ...prev, theme: opt.value }))
                }
              >
                {opt.glyph}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="app-container">
        {/* Tab Content */}
        {activeTab === 'tables' && (
          <LootTables
            settings={settings}
            pendingResolve={pendingResolve}
            onResolveComplete={handleResolveComplete}
            onCancelResolve={handleCancelResolve}
          />
        )}

        {activeTab === 'reference' && (
          <ReferenceView settings={settings} adminMode={adminMode} />
        )}

        {activeTab === 'encounter' && (
          <>
            <EncounterBuilder
              settings={settings}
              onSettingsChange={setSettings}
              results={encounterResults}
              onResultsChange={handleNewResults}
              resolvedItems={resolvedItems}
              setResolvedItems={setResolvedItems}
              onStartResolve={handleStartResolve}
              onNavigateHelp={() => setActiveTab('how-it-works')}
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

        {activeTab === 'how-it-works' && <HowItWorks />}

        {activeTab === 'ddesign' && <DDesign />}

        <footer className="ck-footer">
          <span>&copy; 2026 CherryKeep</span>
          <span>Fan Content Policy &middot; Not affiliated with Wizards of the Coast</span>
        </footer>
      </div>
    </>
  );
};

export default App;
