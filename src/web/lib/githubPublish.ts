/**
 * Shared GitHub publish utility. Extracted from ReviewUI.tsx so that
 * ReferenceView (admin weight editing) and any future editor UIs can
 * share the same PAT + REST API plumbing.
 *
 * Strategy: two-step fetch against the GitHub Contents API v3.
 *   1. GET the current file to read its SHA.
 *   2. PUT the new content with that SHA + base64-encoded body.
 *
 * The PAT is stored in localStorage under 'loot-tables:github-pat'.
 * This module intentionally does not own the PAT modal UI — callers
 * handle prompting, error display, and success toasts.
 */

const REPO_OWNER = 'MCherry1';
const REPO_NAME = 'loot-tables';
const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents`;

export const GITHUB_PAT_KEY = 'loot-tables:github-pat';

export type CurationFilePath = 'data/curation.json' | 'data/curation-2024.json';

export interface PublishSuccess {
  ok: true;
}

export interface PublishFailure {
  ok: false;
  /** High-level failure kind so callers can decide how to react. */
  kind: 'auth' | 'conflict' | 'network' | 'http';
  /** User-facing message. */
  error: string;
  /** HTTP status if available. */
  status?: number;
}

export type PublishResult = PublishSuccess | PublishFailure;

/** Read the stored PAT, or null if not set / inaccessible. */
export function getStoredPat(): string | null {
  try {
    return localStorage.getItem(GITHUB_PAT_KEY);
  } catch {
    return null;
  }
}

/** Persist a PAT to localStorage. Silent failure if storage is unavailable. */
export function storePat(pat: string): void {
  try {
    localStorage.setItem(GITHUB_PAT_KEY, pat);
  } catch {
    /* ignore */
  }
}

/** Remove the stored PAT (used on explicit sign-out or refresh). */
export function clearStoredPat(): void {
  try {
    localStorage.removeItem(GITHUB_PAT_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Commit a JSON file update to the repo via GitHub's Contents API.
 *
 * @param pat            GitHub Personal Access Token (classic or fine-grained
 *                       with Contents: write on this repo).
 * @param path           Repo-relative path of the file to update.
 * @param content        Any JSON-serializable value — will be pretty-printed
 *                       with 2-space indent before encoding.
 * @param commitMessage  Human-readable commit message.
 */
export async function publishJsonFile(
  pat: string,
  path: CurationFilePath,
  content: unknown,
  commitMessage: string,
): Promise<PublishResult> {
  const url = `${API_BASE}/${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${pat}`,
    Accept: 'application/vnd.github.v3+json',
  };

  try {
    // Step 1 — fetch current SHA.
    const getRes = await fetch(url, { headers });
    if (getRes.status === 401 || getRes.status === 403) {
      return {
        ok: false,
        kind: 'auth',
        error: 'PAT expired or invalid. Please update.',
        status: getRes.status,
      };
    }
    if (!getRes.ok) {
      return {
        ok: false,
        kind: 'http',
        error: `Failed to load current file (HTTP ${getRes.status}).`,
        status: getRes.status,
      };
    }
    const getData = (await getRes.json()) as { sha?: string };
    const sha = getData.sha;
    if (!sha) {
      return {
        ok: false,
        kind: 'http',
        error: 'GitHub response missing SHA — unable to update.',
      };
    }

    // Step 2 — PUT updated content.
    const jsonContent = JSON.stringify(content, null, 2);
    const encoded = btoa(unescape(encodeURIComponent(jsonContent)));
    const putRes = await fetch(url, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: commitMessage,
        content: encoded,
        sha,
      }),
    });

    if (putRes.status === 409) {
      return {
        ok: false,
        kind: 'conflict',
        error: 'Conflict: file was modified externally. Refresh and re-apply.',
        status: 409,
      };
    }
    if (putRes.status === 401 || putRes.status === 403) {
      return {
        ok: false,
        kind: 'auth',
        error: 'PAT expired or invalid. Please update.',
        status: putRes.status,
      };
    }
    if (!putRes.ok) {
      const err = (await putRes.json().catch(() => ({}))) as { message?: string };
      return {
        ok: false,
        kind: 'http',
        error: err.message || `HTTP ${putRes.status}`,
        status: putRes.status,
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      kind: 'network',
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}
