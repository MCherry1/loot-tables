import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
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
import LoginModal from './components/LoginModal';
import {
  AuthContext,
  AUTH_STORAGE_KEY,
  ADMIN_STORAGE_KEY,
  type AuthState,
  type ItemPublicMap,
  type MergedItemStats,
} from './lib/authContext';
import { decryptDescriptions, type DescriptionMap } from './lib/decrypt';

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

  // ---- Auth + description data state ------------------------------------
  const [publicData, setPublicData] = useState<ItemPublicMap | null>(null);
  const [srdDescriptions, setSrdDescriptions] =
    useState<DescriptionMap | null>(null);
  const [protectedDescriptions, setProtectedDescriptions] =
    useState<DescriptionMap | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [adminModeRaw, setAdminModeRaw] = useState(() => {
    try {
      return localStorage.getItem(ADMIN_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  // Admin mode is only effective when authenticated (spec §7.1).
  const adminMode = authenticated && adminModeRaw;
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [authDropdownOpen, setAuthDropdownOpen] = useState(false);

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

  // Load public + SRD description files on mount. Attempt auto-login if
  // a password is already stashed in localStorage.
  useEffect(() => {
    const base = import.meta.env.BASE_URL || '/';
    let cancelled = false;

    (async () => {
      setLoadingData(true);
      try {
        const [publicRes, srdRes] = await Promise.all([
          fetch(`${base}data/item-public.json`),
          fetch(`${base}data/item-srd-descriptions.json`),
        ]);
        if (!cancelled && publicRes.ok) {
          setPublicData((await publicRes.json()) as ItemPublicMap);
        }
        if (!cancelled && srdRes.ok) {
          setSrdDescriptions((await srdRes.json()) as DescriptionMap);
        }
      } catch {
        // Missing files are acceptable in dev — auth features just won't
        // populate until encrypt has been run.
      }

      // Auto-login if a password is persisted.
      try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const decrypted = await decryptDescriptions(stored);
          if (!cancelled && decrypted) {
            setProtectedDescriptions(decrypted);
            setAuthenticated(true);
          } else if (!cancelled) {
            // Stored password no longer works — clear it so the user
            // gets prompted fresh on the next unlock attempt.
            localStorage.removeItem(AUTH_STORAGE_KEY);
          }
        }
      } catch {
        /* ignore storage errors */
      }

      if (!cancelled) setLoadingData(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // When pendingResolve is set (because user clicked an unresolved item in
  // the encounter), force-switch to the Magic Item Tables tab.
  useEffect(() => {
    if (pendingResolve) setActiveTab('tables');
  }, [pendingResolve]);

  // If admin is disabled (e.g. user logs out while on the Review tab),
  // bounce back to Tables.
  useEffect(() => {
    if (activeTab === 'review' && !adminMode) setActiveTab('tables');
  }, [activeTab, adminMode]);

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

  // ---- Auth actions ------------------------------------------------------
  const login = useCallback(async (password: string): Promise<boolean> => {
    const decrypted = await decryptDescriptions(password);
    if (!decrypted) return false;
    setProtectedDescriptions(decrypted);
    setAuthenticated(true);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, password);
    } catch {
      /* ignore */
    }
    return true;
  }, []);

  const logout = useCallback(() => {
    setProtectedDescriptions(null);
    setAuthenticated(false);
    setAdminModeRaw(false);
    setAuthDropdownOpen(false);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.setItem(ADMIN_STORAGE_KEY, 'false');
    } catch {
      /* ignore */
    }
  }, []);

  const setAdminMode = useCallback(
    (v: boolean) => {
      // Admin mode requires auth (spec §7.1). Silently refuse when
      // unauthenticated so the surface can't get into an invalid state.
      if (v && !authenticated) return;
      setAdminModeRaw(v);
      try {
        localStorage.setItem(ADMIN_STORAGE_KEY, String(v));
      } catch {
        /* ignore */
      }
    },
    [authenticated],
  );

  const getItemStats = useCallback(
    (key: string): MergedItemStats | null => {
      if (!publicData) return null;
      const pub = publicData[key];
      if (!pub) return null;
      const srdDesc = srdDescriptions?.[key]?.desc ?? '';
      const protDesc = protectedDescriptions?.[key]?.desc ?? '';
      // Prefer protected desc (newer) when authenticated, fall back to SRD.
      const desc = protDesc || srdDesc;
      return {
        type: pub.type,
        rarity: pub.rarity,
        attune: pub.attune,
        srd: pub.srd,
        desc,
      };
    },
    [publicData, srdDescriptions, protectedDescriptions],
  );

  const authState: AuthState = useMemo(
    () => ({
      authenticated,
      loadingData,
      publicData,
      srdDescriptions,
      protectedDescriptions,
      adminMode,
      login,
      logout,
      setAdminMode,
      getItemStats,
    }),
    [
      authenticated,
      loadingData,
      publicData,
      srdDescriptions,
      protectedDescriptions,
      adminMode,
      login,
      logout,
      setAdminMode,
      getItemStats,
    ],
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
    <AuthContext.Provider value={authState}>
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
          <div className="ck-nav-auth">
            <button
              type="button"
              className={`ck-nav-lock${
                authenticated ? ' authenticated' : ''
              }`}
              aria-label={authenticated ? 'Account menu' : 'Unlock'}
              aria-expanded={authenticated ? authDropdownOpen : undefined}
              onClick={() => {
                if (authenticated) {
                  setAuthDropdownOpen((v) => !v);
                } else {
                  setLoginModalOpen(true);
                }
              }}
            >
              <span aria-hidden="true">
                {authenticated ? '\uD83D\uDD13' : '\uD83D\uDD12'}
              </span>
              {adminMode && <span className="ck-admin-badge">Admin</span>}
            </button>
            {authenticated && authDropdownOpen && (
              <div
                className="ck-nav-auth-dropdown"
                role="menu"
                onMouseLeave={() => setAuthDropdownOpen(false)}
              >
                <label className="ck-nav-auth-item">
                  <input
                    type="checkbox"
                    checked={adminMode}
                    onChange={(e) => setAdminMode(e.target.checked)}
                  />
                  Admin mode
                </label>
                <button
                  type="button"
                  className="ck-nav-auth-item ck-nav-auth-button"
                  onClick={() => {
                    logout();
                    setAuthDropdownOpen(false);
                  }}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
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

      {loginModalOpen && (
        <LoginModal onClose={() => setLoginModalOpen(false)} />
      )}
    </AuthContext.Provider>
  );
};

export default App;
