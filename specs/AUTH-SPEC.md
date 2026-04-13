# Authentication & Encrypted Descriptions — Implementation Spec

**Purpose:** Gate item descriptions (copyrightable content) behind a client-side password system. The public site shows only non-copyrightable data (item names, sources, rarities, weights, table assignments). Authenticated users see full item descriptions. Admin mode is also gated behind authentication.

**Depends on:** `CHERRYKEEP-DESIGN-SPEC.md` (uses the same design tokens).

---

## 1. Architecture Overview

```
┌───────────────────────────────────────────────────────────────┐
│                     PUBLIC (no auth)                          │
│  Item names · Sources · Rarities · Weights · Dice ranges     │
│  Tables A–I · Subtables · Supplemental · Roll functionality  │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│                   AUTHENTICATED (password)                    │
│  Everything above, PLUS:                                     │
│  Item descriptions · Type · Attunement requirements          │
│  Admin mode toggle (weight editing, publish to repo)         │
└───────────────────────────────────────────────────────────────┘
```

This is a **static site** on GitHub Pages. There is no server, no database, no sessions. Authentication is entirely client-side:

1. Item descriptions are encrypted at build time using AES-256-GCM.
2. The encrypted blob is served as a static file alongside the public data.
3. When the user enters the password, it is used to derive a decryption key via PBKDF2.
4. Descriptions are decrypted in the browser and held in React state/context.
5. Descriptions are NEVER written to localStorage or any persistent storage.
6. On page refresh, the user must re-enter the password (or use session caching — see Section 6).

**Security model:** This is NOT bank-grade security. A determined person could extract the encrypted blob and brute-force the password. The purpose is to demonstrate clear intent to restrict access to copyrightable content, which is a meaningful legal distinction. For a personal game group, this is more than sufficient.

---

## 2. Data Pipeline

### 2.1. Three-Tier Description Access

Not all descriptions require the same access level. The 5etools data includes an `srd` boolean flag on items that are in Wizards of the Coast's System Reference Document. SRD content is published under Creative Commons Attribution 4.0 and can be freely redistributed.

**Tier 1 — Public (no auth):** Item names, sources, rarities, table assignments, weights, dice ranges. Available to everyone. Non-copyrightable factual data.

**Tier 2 — SRD (no auth):** Full descriptions for the ~327 items flagged as SRD in 5etools. Available to everyone. Licensed under CC BY 4.0. Requires attribution: "This work includes material taken from the System Reference Document 5.2 by Wizards of the Coast LLC, licensed under CC BY 4.0."

**Tier 3 — Protected (auth required):** Full descriptions for the remaining ~915 non-SRD items. Encrypted, password-gated.

### 2.2. SRD Flag in Data Pipeline

The `scripts/generate-item-stats.ts` script needs modification. When reading 5etools `items.json`, check each item for the `srd` or `srd52` boolean flag. Add this flag to the output:

```typescript
// In generate-item-stats.ts, when building each item entry:
const isSRD = !!(item.srd || item.srd52);
// Include in output:
{ type, rarity, attune, desc, srd: isSRD }
```

The existing `data/item-stats.json` and `data/item-stats-2024.json` files gain an `srd: boolean` field per item. This requires re-running the generate script against the 5etools source data.

### 2.3. Description Data Source

Item descriptions come from `item-stats.json` and `item-stats-2024.json`. Each entry:

```json
{
  "Bag of Holding|DMG": {
    "type": "Wondrous item",
    "rarity": "uncommon",
    "attune": "",
    "desc": "This bag has an interior space considerably larger than...",
    "srd": true
  }
}
```

### 2.4. Build-Time Splitting & Encryption

Create a new build script: `scripts/encrypt-descriptions.ts`

This script:
1. Reads `item-stats.json` and `item-stats-2024.json`.
2. For each item, checks the `srd` flag.
3. Produces THREE output files:

**`public/data/item-public.json`** — Non-copyrightable metadata for ALL items:
```json
{
  "Bag of Holding|DMG": { "type": "Wondrous item", "rarity": "uncommon", "attune": "", "srd": true },
  "Cloak of Many Fashions|XGE": { "type": "Wondrous item", "rarity": "common", "attune": "", "srd": false }
}
```
Note: `desc` field is NOT included here. The `srd` flag IS included (it's a fact, not creative content).

**`public/data/item-srd-descriptions.json`** — Descriptions for SRD items only (publicly accessible):
```json
{
  "Bag of Holding|DMG": { "desc": "This bag has an interior space..." }
}
```
This file is served unencrypted. Anyone can read it. It contains only SRD-licensed content.

**`public/data/item-protected.enc`** + **`public/data/item-protected.meta.json`** — Encrypted descriptions for non-SRD items:
The encrypted blob contains:
```json
{
  "Cloak of Many Fashions|XGE": { "desc": "While wearing this cloak..." }
}
```
Encrypted using AES-256-GCM with PBKDF2-derived key, same as before.

### 2.5. Build-Time Encryption (encrypt-descriptions.ts)

```typescript
import * as crypto from 'crypto';
import * as fs from 'fs';

const PASSWORD = process.env.CHERRYKEEP_PASSWORD;
if (!PASSWORD) throw new Error('CHERRYKEEP_PASSWORD env var required');

const SALT_BYTES = 32;
const IV_BYTES = 12;
const KEY_ITERATIONS = 100_000;
const KEY_LENGTH = 32;

function encrypt(plaintext: string, password: string) {
  const salt = crypto.randomBytes(SALT_BYTES);
  const iv = crypto.randomBytes(IV_BYTES);
  const key = crypto.pbkdf2Sync(password, salt, KEY_ITERATIONS, KEY_LENGTH, 'sha256');

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: Buffer.concat([encrypted, tag]).toString('base64'),
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
  };
}

function processEdition(inputPath: string, prefix: string) {
  const stats = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const publicData: Record<string, any> = {};
  const srdDescs: Record<string, { desc: string }> = {};
  const protectedDescs: Record<string, { desc: string }> = {};

  for (const [key, value] of Object.entries(stats)) {
    const v = value as any;
    publicData[key] = { type: v.type || '', rarity: v.rarity || '', attune: v.attune || '', srd: !!v.srd };

    if (v.srd && v.desc) {
      srdDescs[key] = { desc: v.desc };
    } else if (v.desc) {
      protectedDescs[key] = { desc: v.desc };
    }
  }

  return { publicData, srdDescs, protectedDescs };
}

// Process both editions
const r2014 = processEdition('data/item-stats.json', '2014');
const r2024 = processEdition('data/item-stats-2024.json', '2024');

// Merge
const publicData = { ...r2014.publicData, ...r2024.publicData };
const srdDescs = { ...r2014.srdDescs, ...r2024.srdDescs };
const protectedDescs = { ...r2014.protectedDescs, ...r2024.protectedDescs };

// Write public metadata
fs.mkdirSync('public/data', { recursive: true });
fs.writeFileSync('public/data/item-public.json', JSON.stringify(publicData));
console.log(`Public metadata: ${Object.keys(publicData).length} items`);

// Write SRD descriptions (unencrypted, publicly accessible)
fs.writeFileSync('public/data/item-srd-descriptions.json', JSON.stringify(srdDescs));
console.log(`SRD descriptions: ${Object.keys(srdDescs).length} items (public, CC BY 4.0)`);

// Encrypt non-SRD descriptions
const { ciphertext, salt, iv } = encrypt(JSON.stringify(protectedDescs), PASSWORD);
fs.writeFileSync('public/data/item-protected.enc', ciphertext);
fs.writeFileSync('public/data/item-protected.meta.json', JSON.stringify({ salt, iv }));
console.log(`Protected descriptions: ${Object.keys(protectedDescs).length} items (encrypted)`);
```

### 2.6. Build Integration

Add npm scripts to `package.json`:

```json
{
  "scripts": {
    "encrypt": "CHERRYKEEP_PASSWORD=$CKPASS tsx scripts/encrypt-descriptions.ts",
    "build": "npm run encrypt && vite build"
  }
}
```

The password is provided via environment variable at build time and NEVER committed to the repo.

---

## 3. Client-Side Decryption

### 3.1. Web Crypto API

The browser decrypts using the Web Crypto API (available in all modern browsers, works on GitHub Pages):

```typescript
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
}

async function decryptDescriptions(
  password: string,
): Promise<Record<string, { desc: string }> | null> {
  try {
    // Fetch the encrypted blob and metadata
    const [encRes, metaRes] = await Promise.all([
      fetch(`${import.meta.env.BASE_URL}data/item-protected.enc`),
      fetch(`${import.meta.env.BASE_URL}data/item-protected.meta.json`),
    ]);

    const ciphertextB64 = await encRes.text();
    const meta = await metaRes.json();

    const salt = Uint8Array.from(atob(meta.salt), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(meta.iv), c => c.charCodeAt(0));
    const ciphertextRaw = Uint8Array.from(atob(ciphertextB64), c => c.charCodeAt(0));

    // AES-GCM: last 16 bytes are the auth tag
    // Web Crypto expects ciphertext + tag concatenated
    const key = await deriveKey(password, salt);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertextRaw,
    );

    const text = new TextDecoder().decode(decrypted);
    return JSON.parse(text);
  } catch {
    // Wrong password → auth tag mismatch → decryption fails
    return null;
  }
}
```

### 3.2. Auth Context

Create an auth context that holds the decryption state:

```typescript
// src/web/lib/authContext.ts

import { createContext, useContext } from 'react';

export interface AuthState {
  /** Whether the user has successfully authenticated */
  authenticated: boolean;
  /** Decrypted item descriptions, or null if not authenticated */
  descriptions: Record<string, { desc: string }> | null;
  /** Admin mode enabled */
  adminMode: boolean;
}

export const AuthContext = createContext<AuthState>({
  authenticated: false,
  descriptions: null,
  adminMode: false,
});

export const useAuth = () => useContext(AuthContext);
```

This context is provided at the `App` level. All components that need descriptions read from it.

---

## 4. Login UI

### 4.1. Login Trigger

In the nav bar, add a small, understated lock icon button on the far right (before the theme toggle):

```
CherryKeep     [Tables] [Reference] [Loot Drops] [Settings]     [🔒] [☀ ◐ ☾]
```

- When NOT authenticated: shows a small 🔒 icon in `--ck-text-tertiary` color. No label, no tooltip, no indication of what it does. It is deliberately inconspicuous. Clicking opens the login modal.
- When authenticated: the icon changes to 🔓 in `--ck-cherry` color. Clicking shows a small dropdown with "Admin Mode" toggle and "Log Out" option. No "descriptions unlocked" messaging.

The lock icon does NOT say "Login", does NOT say "Unlock descriptions", does NOT hint at what features are behind it. It is just a lock. People who know what it's for will use it. Everyone else will ignore it.

### 4.2. Login Modal

A centered overlay modal. Minimal, bare-bones, no explanation of what it unlocks:

```
┌──────────────────────────────────────────┐
│                                          │
│          🔒                              │
│                                          │
│    ┌────────────────────────────┐        │
│    │ ●●●●●●●●                  │        │
│    └────────────────────────────┘        │
│                                          │
│    [Cancel]              [Enter]         │
│                                          │
└──────────────────────────────────────────┘
```

No title text. No explanation. No "Enter password to unlock descriptions." Just the lock icon, a password field, and two buttons. If you know what this is, you know. If you don't, the Cancel button is right there.

```css
.auth-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  animation: ck-fade-in 0.2s ease;
}

.auth-modal {
  background: var(--ck-bg-raised);
  border: 1px solid var(--ck-border);
  border-radius: 14px;
  padding: 32px 28px;
  max-width: 360px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  text-align: center;
}

.auth-lock-icon {
  font-size: 2rem;
  margin-bottom: 12px;
}

.auth-modal-title {
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-sm);
  color: var(--ck-text-secondary);
  line-height: 1.5;
  margin-bottom: 20px;
}

.auth-password-input {
  width: 100%;
  background: var(--ck-bg-deep);
  border: 1px solid var(--ck-border);
  border-radius: 8px;
  padding: 12px 16px;
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-base);
  color: var(--ck-text-primary);
  min-height: 44px;
  margin-bottom: 16px;
  text-align: center;
  letter-spacing: 0.1em;
}

.auth-password-input:focus-visible {
  border-color: var(--ck-cherry);
  outline: none;
}

.auth-password-input.error {
  border-color: #e05a5a;
  animation: auth-shake 0.3s ease;
}

@keyframes auth-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}

.auth-modal-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.auth-modal-hint {
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-xs);
  color: var(--ck-text-tertiary);
  margin-top: 16px;
}
```

### 4.3. Login Flow

1. User clicks the lock icon.
2. Modal opens with password field focused.
3. User types password and clicks "Unlock" (or presses Enter).
4. Button shows a loading state: "Unlocking..." (PBKDF2 takes ~200ms; `decryptDescriptions` is async).
5. If decryption succeeds (returns non-null): close modal, update auth context, show success toast "Descriptions unlocked", lock icon changes to unlocked.
6. If decryption fails (returns null): shake the input, show "Incorrect password" in red below the input. Do NOT close the modal. Let user try again.

### 4.4. Logout

From the unlocked dropdown menu, "Log Out":
1. Clears descriptions from React state.
2. Sets `authenticated` to false and `adminMode` to false.
3. Does NOT clear localStorage (weight edits persist independently).
4. Lock icon returns to locked state.

---

## 5. Description Display

### 5.1. Where Descriptions Appear

When authenticated, item descriptions appear in:

1. **The existing stepper's FinalResultCard** — below the item name, show description text.
2. **The Reference view** — when a leaf item row is clicked/tapped, expand an inline detail panel below the row showing the description.
3. **Result History** — if item details are enabled in settings.

### 5.2. Inline Detail Panel (Reference View)

In the Reference view, clicking a leaf item row expands a detail panel below it:

```
│ 1–12  │ Potion of Healing     │ DMG    │ 12     │ 60.0%            │
├───────┴───────────────────────┴────────┴────────┴───────────────────┤
│  Wondrous item · Common · No attunement required                   │
│                                                                     │
│  You regain 2d4 + 2 hit points when you drink this potion. The     │
│  potion's red liquid glimmers when agitated.                        │
│                                                                     │
│  Source: Dungeon Master's Guide, p. 187                            │
├─────────────────────────────────────────────────────────────────────┤
```

Only ONE detail panel is open at a time. Clicking another row closes the previous one and opens the new one. Clicking the same row again closes it.

```css
.ref-detail-panel {
  grid-column: 1 / -1;  /* span full width of the grid */
  padding: 12px 16px;
  background: var(--ck-bg-elevated);
  border-top: 1px solid var(--ck-border-subtle);
  border-bottom: 1px solid var(--ck-border);
  animation: ck-fade-in 0.2s ease;
}

.ref-detail-meta {
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-xs);
  color: var(--ck-text-tertiary);
  margin-bottom: 8px;
}

.ref-detail-desc {
  font-family: var(--ck-font-content);
  font-size: var(--ck-text-base);
  color: var(--ck-text-primary);
  line-height: 1.6;
  margin-bottom: 8px;
}

.ref-detail-source {
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-xs);
  color: var(--ck-text-tertiary);
  font-style: italic;
}
```

### 5.3. When NOT Authenticated

If a user clicks an item row and is NOT authenticated, the behavior depends on the item's SRD status:

**SRD item (srd: true):** Show the full description from `item-srd-descriptions.json`. No lock prompt. The description is publicly available. Add a small "SRD" badge or note: "Source: System Reference Document (CC BY 4.0)".

**Non-SRD item (srd: false):** Show ONLY the source name prominently — e.g. "Xanathar's Guide to Everything" in `--ck-text-secondary` color. No lock icon. No "unlock" prompt. No indication whatsoever that a description exists or could be unlocked. The source name IS the content for unauthenticated users. This is intentional — we do not want to advertise that descriptions are available behind a password.

When authenticated, the description appears below the source name seamlessly, as if it was always there.

```css
.ref-detail-srd-badge {
  font-family: var(--ck-font-ui);
  font-size: 0.5625rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ck-rarity-uncommon);
  background: rgba(78, 202, 123, 0.08);
  border: 1px solid rgba(78, 202, 123, 0.2);
  border-radius: 3px;
  padding: 1px 5px;
  margin-left: 6px;
}

/* Non-SRD items when unauthenticated: just show source prominently */
.ref-detail-source-only {
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-sm);
  color: var(--ck-text-secondary);
  font-style: italic;
  padding: 4px 0;
}
```

---

## 6. Persistent Login

Once a user enters the correct password, they should never have to enter it again on that browser.

**Implementation:**
- After successful decryption, store the password in `localStorage` under key `ck-auth` (NOT `sessionStorage` — this persists permanently).
- On page load, check `localStorage` for the key. If present, automatically attempt decryption in the background. Show a brief loading state if needed.
- The user stays logged in across page refreshes, browser restarts, and device reboots.
- "Log Out" from the nav dropdown clears the `localStorage` key and resets auth state.

**No checkbox needed.** Permanent persistence is the default and only behavior. This is a personal tool for a small group — convenience trumps security theater. The password protects against casual visitors, not determined attackers.

---

## 7. Admin Mode

### 7.1. Relationship to Auth

Admin mode requires authentication. It is a sub-state of being authenticated.

**When NOT authenticated:** The Admin section in CampaignSettings does not exist. It is not grayed out. It is not hidden with CSS. The entire `<section>` is not rendered. There is zero indication that admin mode exists. The Review tab also does not appear in the nav.

**When authenticated:** The Admin section appears in CampaignSettings with a checkbox: "Enable Admin Mode." The Review tab appears in the nav. The Reference tab shows weight editing controls when admin mode is checked.

### 7.2. Admin-Only Features

| Feature | Requires Auth | Requires Admin |
|---------|--------------|----------------|
| View item descriptions | ✓ | |
| View item type/attunement | | (public data) |
| Edit weights | ✓ | ✓ |
| Publish to GitHub | ✓ | ✓ |
| Review UI tab | ✓ | ✓ |

### 7.3. Admin Visual Indicator

When admin mode is active, add a small cherry dot or "ADMIN" badge next to the lock icon in the nav bar:

```css
.ck-admin-badge {
  font-family: var(--ck-font-ui);
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ck-cherry);
  background: var(--ck-cherry-faint);
  border: 1px solid var(--ck-border-cherry);
  border-radius: 3px;
  padding: 1px 5px;
  margin-left: 4px;
}
```

---

## 8. File Structure

### New Files

```
scripts/encrypt-descriptions.ts    — Build-time encryption script
src/web/lib/authContext.ts         — Auth context + types
src/web/lib/decrypt.ts             — Client-side decryption logic
src/web/components/LoginModal.tsx   — Login modal component
```

### Modified Files

```
src/web/App.tsx                    — Add AuthContext.Provider, login state, lock icon
src/web/index.html                 — No changes needed
src/web/styles/app.css             — Add auth-related CSS (Section 4, 5, 7)
src/web/components/LootTables.tsx  — Read descriptions from auth context for FinalResultCard
src/web/components/ReferenceView.tsx — Read descriptions for detail panels, check auth for admin
package.json                       — Add encrypt script
```

### Generated Files (in public/data/, gitignored or committed)

```
public/data/item-public.json       — Non-copyrightable item metadata
public/data/item-protected.enc     — Encrypted descriptions blob
public/data/item-protected.meta.json — Salt + IV for decryption
```

**Decision: commit or gitignore the encrypted files?**

Recommended: COMMIT them. They are encrypted and useless without the password. Committing them means the GitHub Pages build doesn't need to run the encryption script — the static files are already there. You only re-run the encryption script when the description data changes (e.g. when a new book drops and you update item-stats.json).

---

## 9. Migration from Current Auth

The current codebase has a simple `adminMode` boolean stored in `localStorage`. This needs to be migrated:

1. Keep the `localStorage` flag for backwards compatibility during development.
2. But gate it behind authentication: even if `localStorage` says admin=true, only show admin features if the user is also authenticated.
3. The login modal replaces the current "Enable Admin Mode" toggle in CampaignSettings. Remove the toggle from Settings. Admin mode is now controlled exclusively through the nav bar's auth dropdown.

---

## 10. Verification

After implementation, verify:

1. **Public site loads without errors** when no password is entered. All tables, names, sources, weights, dice ranges display correctly.
2. **No descriptions visible** anywhere on the public site — not in the DOM, not in network requests (except the encrypted blob).
3. **Login modal opens** when lock icon is clicked. Password field is focused.
4. **Wrong password** shakes the input and shows error text. Modal stays open.
5. **Correct password** decrypts descriptions. Modal closes. Lock icon changes to unlocked. Toast confirms.
6. **Descriptions appear** in the Reference view detail panels and the stepper's FinalResultCard.
7. **"Remember for session"** checkbox works — refresh the page, descriptions are still available. Close the tab and reopen, they're gone.
8. **Admin mode** is only available when authenticated. Weight editing controls appear in Reference view.
9. **Log out** clears descriptions from memory. Lock icon returns to locked. Admin mode disabled.
10. **Build script** correctly encrypts descriptions. The encrypted blob is a valid base64 string. The meta file contains salt and IV.
11. **Mobile:** login modal renders correctly on small screens. Lock icon is tappable (44px target).
