/**
 * Auth context — central state for login + admin mode + description data.
 *
 * Shape:
 *   - `publicData` is always loaded on mount from public/data/item-public.json
 *     (non-copyrightable: type, rarity, attune, srd flag).
 *   - `srdDescriptions` is always loaded from public/data/item-srd-descriptions.json
 *     (CC BY 4.0 content — no auth needed).
 *   - `protectedDescriptions` is populated only after a successful login;
 *     fetched + decrypted via decryptDescriptions() from decrypt.ts.
 *   - `adminMode` is a sub-state of `authenticated` — it can only be true
 *     when the user is logged in.
 *
 * The password is persisted in localStorage under `ck-auth` so the user
 * never has to re-enter it on the same browser (spec §6). Logging out
 * clears it.
 *
 * `getItemStats(key)` is the single lookup entry point for every
 * component that wants item metadata or a description. It merges public
 * data + SRD descriptions + (if authenticated) protected descriptions.
 */

import { createContext, useContext } from 'react';
import type { DescriptionMap } from './decrypt';

export interface ItemPublicEntry {
  type: string;
  rarity: string;
  attune: string;
  srd: boolean;
}

export type ItemPublicMap = Record<string, ItemPublicEntry>;

/** Full stats with an optional description — matches the legacy shape the
 *  stepper's `lookupItemStats` emits, with `desc` possibly absent. */
export interface MergedItemStats {
  type: string;
  rarity: string;
  attune: string;
  desc: string;
  srd: boolean;
}

export interface AuthState {
  /** True after a successful decrypt of the protected blob. */
  authenticated: boolean;
  /** True while the initial fetch of public/srd files is in flight. */
  loadingData: boolean;
  /** Non-copyrightable metadata for every item. Loaded eagerly. */
  publicData: ItemPublicMap | null;
  /** Plaintext descriptions for SRD items. Loaded eagerly. */
  srdDescriptions: DescriptionMap | null;
  /** Decrypted descriptions for non-SRD items. Only when `authenticated`. */
  protectedDescriptions: DescriptionMap | null;
  /** Admin mode. Gated behind `authenticated`. */
  adminMode: boolean;

  /** Attempt login with a password. Returns true on success. */
  login: (password: string) => Promise<boolean>;
  /** Clear auth state and the persisted password. */
  logout: () => void;
  /** Set admin mode (no-op when not authenticated). */
  setAdminMode: (v: boolean) => void;
  /**
   * Merged lookup for a single item. Returns null if the item isn't in
   * the public metadata. `desc` is `''` when no description is available
   * at the current auth level (public-only view of a non-SRD item).
   */
  getItemStats: (key: string) => MergedItemStats | null;
}

const noopAsync = async () => false;
const noop = () => {
  /* no-op default */
};

export const AuthContext = createContext<AuthState>({
  authenticated: false,
  loadingData: true,
  publicData: null,
  srdDescriptions: null,
  protectedDescriptions: null,
  adminMode: false,
  login: noopAsync,
  logout: noop,
  setAdminMode: noop,
  getItemStats: () => null,
});

/** Hook for any component that needs auth state or description lookups. */
export function useAuth(): AuthState {
  return useContext(AuthContext);
}

/** localStorage key for the persisted password (spec §6). */
export const AUTH_STORAGE_KEY = 'ck-auth';

/** localStorage key for the legacy admin-mode flag (kept for backwards compat). */
export const ADMIN_STORAGE_KEY = 'loot-tables:admin';
