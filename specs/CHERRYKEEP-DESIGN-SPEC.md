# CherryKeep Design System — Implementation Spec

**Purpose:** This document specifies every visual and structural change needed to migrate the D&D 5e Loot Generator from the current "DM's Binder" parchment theme to the new "CherryKeep Iron Forge" design system. It is written for Claude Code and must be followed literally.

**Scope:** This affects `src/web/styles/app.css`, `src/web/index.html`, `src/web/App.tsx`, `src/web/components/LootTables.tsx`, `src/web/components/CampaignSettings.tsx`, `src/engine/types.ts`, and `src/engine/constants.ts`. No engine logic changes. No data changes.

---

## 1. Design Philosophy

**"Iron Forge + Cherry"** — A dark-mode-first tool aesthetic: clean dark surfaces, sharp edges, warm cherry-red (#c44258) accent on cool steel. Modern readability with subtle fantasy flavor. Tool-first, beautiful second.

**Key principles:**
- Performance over decoration. Zero texture images. All effects use GPU-accelerated CSS (transform, opacity, box-shadow).
- Every interactive element must meet a 44px minimum touch target (Apple HIG).
- Every interactive element must have a visible `:focus-visible` state for keyboard users.
- Active/selected elements "pop" — they lift up (translateY), scale slightly larger, and gain a drop shadow. Inactive elements rest at their natural size (scale 1.0). The pop is additive from the baseline, never subtractive.
- Cherry red is the brand. It appears on: the ROLL button, the roll result card top-edge, emphasis-tier source chips, the active table pill, rarity-color for Legendary items, and the site name in the nav. Nowhere else. Do not overuse it.
- "CherryKeep" branding is subtle. It appears once in the top nav bar in secondary text color. No logos, no taglines, no splash screens.

---

## 2. Palette Removal

**Delete the following palette systems entirely:**
- The `treasure` palette (the current default parchment theme in `:root`)
- The `stone` palette (`[data-palette='stone']` and `[data-palette='stone'][data-theme='dark']`)
- The `verdant` palette (`[data-palette='verdant']` and `[data-palette='verdant'][data-theme='dark']`)
- The `arcane` palette (`[data-palette='arcane']` and `[data-palette='arcane'][data-theme='dark']`)

**Delete from `src/engine/types.ts`:**
- The `Palette` type. Remove it entirely.
- Remove `palette: Palette` from the `CampaignSettings` type.

**Delete from `src/engine/constants.ts`:**
- Remove `palette: 'treasure'` from `DEFAULT_CAMPAIGN_SETTINGS`.

**Delete from `src/web/App.tsx`:**
- Remove the line `document.documentElement.dataset.palette = settings.palette ?? 'treasure';`
- The `data-palette` attribute is no longer used anywhere.

**Delete from `src/web/components/CampaignSettings.tsx`:**
- Remove the `PALETTE_OPTIONS` array.
- Remove the entire "Palette" UI section (the palette swatches).
- Remove the import of `Palette` from engine types.

**Delete from `src/web/styles/app.css`:**
- Remove the `.palette-swatches` and `.palette-swatch` CSS rules.

**The `ThemePref` type (`'auto' | 'light' | 'dark'`) stays.** The `data-theme` attribute on `<html>` stays. The theme toggle in CampaignSettings stays but is also duplicated into the new top nav bar (see Section 7).

---

## 3. Color Tokens (CSS Custom Properties)

Replace the ENTIRE `:root` and `[data-theme='dark']` blocks with the following. These are the ONLY custom property definitions in the file. There are no palette variants.

```css
/* ═══════════════════════════════════════════════════════════════════
   CherryKeep Design Tokens — "Iron Forge + Cherry"
   Dark is the default. Light overrides via [data-theme='light'].
   ═══════════════════════════════════════════════════════════════════ */

:root {
  /* Background layers (deepest → surface) */
  --ck-bg-deep:      #0c0d10;
  --ck-bg-base:      #121318;
  --ck-bg-raised:    #1a1b22;
  --ck-bg-elevated:  #22232c;
  --ck-bg-hover:     #282936;

  /* Cherry accent spectrum */
  --ck-cherry:       #c44258;
  --ck-cherry-muted: #a33748;
  --ck-cherry-light: #e05a72;
  --ck-cherry-glow:  rgba(196, 66, 88, 0.15);
  --ck-cherry-faint: rgba(196, 66, 88, 0.08);

  /* Ember secondary (warmth, secondary actions) */
  --ck-ember:       #d4844a;
  --ck-ember-faint: rgba(212, 132, 74, 0.10);

  /* D&D rarity colors (tuned for dark backgrounds) */
  --ck-rarity-common:     #9ca0a8;
  --ck-rarity-uncommon:   #4eca7b;
  --ck-rarity-rare:       #4a9ee8;
  --ck-rarity-very-rare:  #a66de8;
  --ck-rarity-legendary:  #e8a84a;

  /* Text hierarchy */
  --ck-text-primary:   #e8e7ed;
  --ck-text-secondary: #9294a0;
  --ck-text-tertiary:  #5c5e6a;
  --ck-text-on-cherry: #ffffff;

  /* Borders & dividers */
  --ck-border:        rgba(255, 255, 255, 0.07);
  --ck-border-subtle: rgba(255, 255, 255, 0.04);
  --ck-border-cherry: rgba(196, 66, 88, 0.25);

  /* Focus ring (keyboard navigation) */
  --ck-focus-ring: rgba(120, 180, 255, 0.7);

  /* Shadows */
  --ck-shadow-card:       0 2px 8px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
  --ck-shadow-button:     0 2px 6px rgba(196, 66, 88, 0.2);
  --ck-shadow-glow:       0 0 20px rgba(196, 66, 88, 0.12);
  --ck-shadow-pop:        0 3px 10px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2);
  --ck-shadow-pop-cherry: 0 3px 10px rgba(196,66,88,0.2), 0 1px 3px rgba(0,0,0,0.3);
  --ck-shadow-inset:      inset 0 1px 3px rgba(0,0,0,0.3);

  /* Transition timing */
  --ck-ease-fast:   0.12s ease;
  --ck-ease-normal: 0.2s ease;
  --ck-ease-pop:    0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

[data-theme='light'] {
  --ck-bg-deep:      #eeeef2;
  --ck-bg-base:      #f5f5f8;
  --ck-bg-raised:    #ffffff;
  --ck-bg-elevated:  #f0f0f4;
  --ck-bg-hover:     #e8e8ee;

  --ck-cherry:       #a83348;
  --ck-cherry-muted: #8e2a3c;
  --ck-cherry-light: #c44258;
  --ck-cherry-glow:  rgba(168, 51, 72, 0.08);
  --ck-cherry-faint: rgba(168, 51, 72, 0.06);

  --ck-ember:       #b86e38;
  --ck-ember-faint: rgba(212, 132, 74, 0.08);

  --ck-rarity-common:     #6b6e76;
  --ck-rarity-uncommon:   #1a8a4a;
  --ck-rarity-rare:       #2a6eb8;
  --ck-rarity-very-rare:  #7a4ab8;
  --ck-rarity-legendary:  #a07820;

  --ck-text-primary:   #1a1b22;
  --ck-text-secondary: #5c5e6a;
  --ck-text-tertiary:  #9294a0;
  --ck-text-on-cherry: #ffffff;

  --ck-border:        rgba(0, 0, 0, 0.08);
  --ck-border-subtle: rgba(0, 0, 0, 0.04);
  --ck-border-cherry: rgba(168, 51, 72, 0.2);

  --ck-focus-ring: rgba(40, 100, 220, 0.6);

  --ck-shadow-card:       0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --ck-shadow-button:     0 1px 4px rgba(168, 51, 72, 0.15);
  --ck-shadow-glow:       0 0 12px rgba(168, 51, 72, 0.06);
  --ck-shadow-pop:        0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  --ck-shadow-pop-cherry: 0 2px 8px rgba(168,51,72,0.12), 0 1px 2px rgba(0,0,0,0.06);
  --ck-shadow-inset:      inset 0 1px 2px rgba(0,0,0,0.06);
}
```

**Migration rule:** Every existing `var(--...)` reference in the CSS must be updated to use the new `--ck-*` tokens. Here is the complete mapping from old tokens to new tokens:

| Old token | New token | Notes |
|-----------|-----------|-------|
| `--bg-start` | `--ck-bg-deep` | |
| `--bg-end` | `--ck-bg-deep` | Use same as deep; no gradient needed |
| `--bg-card` | `--ck-bg-raised` | |
| `--bg-card-soft` | `--ck-bg-raised` | |
| `--bg-raised` | `--ck-bg-elevated` | Note: shifted one layer up |
| `--ink` | `--ck-text-primary` | |
| `--ink-strong` | `--ck-text-primary` | |
| `--ink-muted` | `--ck-text-secondary` | |
| `--ink-faint` | `--ck-text-tertiary` | |
| `--ink-fainter` | `--ck-text-tertiary` | |
| `--ink-inverse` | `--ck-text-on-cherry` | |
| `--border` | `--ck-border` | |
| `--border-soft` | `--ck-border-subtle` | |
| `--border-muted` | `--ck-border` | |
| `--accent` | `--ck-cherry` | |
| `--accent-dark` | `--ck-cherry-muted` | |
| `--accent-darker` | `--ck-cherry-muted` | |
| `--accent-gold` | `--ck-ember` | |
| `--accent-gold-dark` | `--ck-ember` | |
| `--accent-gold-darker` | `--ck-ember` | |
| `--header-start` | `--ck-bg-base` | No gradient headers |
| `--header-end` | `--ck-bg-base` | No gradient headers |
| `--danger` | `#e05a5a` | Hardcode; not tokenized |
| `--shadow` | `--ck-shadow-card` | |
| `--shadow-strong` | `--ck-shadow-card` | |

---

## 4. Typography

### 4.1. Font Loading

**Replace the Google Fonts `<link>` in `src/web/index.html`.** Remove the existing one and add:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Source+Sans+3:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap"
  rel="stylesheet"
/>
```

This loads three font families:
- **Cinzel** (400, 500, 600, 700) — display/headers
- **Crimson Text** (400, 600, 400i) — item names, flavor text (already loaded, keeping it)
- **Source Sans 3** (300, 400, 600, 700, 400i) — UI labels, controls, data

### 4.2. Font Roles

| Role | Font family | CSS value | Used for |
|------|-------------|-----------|----------|
| Display | Cinzel | `'Cinzel', serif` | Site name "CherryKeep", section headers (e.g. "Table A"), table pill labels, roll result card header, ROLL button text, any `<h1>` or `<h2>` equivalent |
| Content | Crimson Text | `'Crimson Text', Georgia, serif` | Item names in tables, item names in roll results, flavor/description text, breadcrumb item names |
| UI | Source Sans 3 | `'Source Sans 3', 'Segoe UI', sans-serif` | Everything else: source chips, priority labels, metadata (source abbreviation, rarity label, weight numbers), control labels, footer text, percentage displays, dice notation, navigation tabs, input fields |

### 4.3. Font Size Scale

Apply these as the base scale. Do NOT use `rem` relative to a non-16px root. Use these literal rem values (they assume default browser 16px root):

| Token name | rem | px equiv | Used for |
|------------|-----|----------|----------|
| `--ck-text-xxl` | 2.25rem | 36px | Hero / roll result item name in large display |
| `--ck-text-xl` | 1.625rem | 26px | Page title (if ever needed) |
| `--ck-text-lg` | 1.25rem | 20px | Section headers, table card titles |
| `--ck-text-md` | 1.0625rem | 17px | Subheadings, table label in control panel ("Table A") |
| `--ck-text-base` | 0.9375rem | 15px | Body text, item names in table rows |
| `--ck-text-sm` | 0.8125rem | 13px | Metadata, source tags, nav tab labels, control labels |
| `--ck-text-xs` | 0.6875rem | 11px | Fine print, column headers, section labels, footer |

Add these as CSS custom properties inside `:root` (alongside the color tokens):

```css
  /* Font families */
  --ck-font-display: 'Cinzel', serif;
  --ck-font-content: 'Crimson Text', Georgia, serif;
  --ck-font-ui:      'Source Sans 3', 'Segoe UI', sans-serif;

  /* Font scale */
  --ck-text-xxl:  2.25rem;
  --ck-text-xl:   1.625rem;
  --ck-text-lg:   1.25rem;
  --ck-text-md:   1.0625rem;
  --ck-text-base: 0.9375rem;
  --ck-text-sm:   0.8125rem;
  --ck-text-xs:   0.6875rem;
```

These do NOT change between light and dark themes. Do NOT add them to `[data-theme='light']`.

### 4.4. Font Migration

Replace every `font-family` declaration in `app.css`:

| Old | New |
|-----|-----|
| `'Crimson Text', Georgia, 'Times New Roman', serif` | `var(--ck-font-content)` |
| `'Crimson Text', Georgia, serif` | `var(--ck-font-content)` |
| `'IBM Plex Mono', monospace` | `var(--ck-font-ui)` |
| `'Cinzel', serif` | `var(--ck-font-display)` |
| `font-family: inherit` | Leave as `inherit` unless the element is one that should be explicitly set per the role table above |

The `body` font-family changes from `'Crimson Text', Georgia, 'Times New Roman', serif` to `var(--ck-font-ui)`. This makes the default font the UI font. Item names and display text explicitly set their own font-family.

---

## 5. Base Styles

Replace the existing `html`, `body`, and reset rules with:

```css
*, *::before, *::after {
  box-sizing: border-box;
}

html {
  background: var(--ck-bg-deep);
}

html, body {
  margin: 0;
  padding: 0;
}

body {
  background: var(--ck-bg-deep);
  color: var(--ck-text-primary);
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-base);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
  transition: background 0.3s ease, color 0.3s ease;
}

button {
  font-family: inherit;
}

/* Global focus state — keyboard only */
*:focus {
  outline: none;
}
*:focus-visible {
  outline: 2px solid var(--ck-focus-ring);
  outline-offset: 2px;
  border-radius: 4px;
}
```

**Key changes from current:**
- `background` is a flat color, NOT a `linear-gradient`. No `background-attachment: fixed`.
- Default font is now `--ck-font-ui` (Source Sans 3), not Crimson Text.
- Added `transition` on background/color for smooth theme switching.
- Added global `:focus-visible` rule. This is critical for accessibility.

---

## 6. Layout Architecture

### 6.1. Site-Level Nav (NEW)

**Currently:** The app has `<h1 class="app-title">D&D 5e Loot Generator</h1>` followed by a `.tab-bar` with buttons for each tab (Magic Item Tables, Loot Drops, Settings, Review, About, How it Works, D&Design).

**New:** Replace the `<h1>` and `.tab-bar` with a sticky top nav bar. The nav bar has three sections:

```
┌─────────────────────────────────────────────────────┐
│  CherryKeep          [Tool Tabs]    [☀ ◐ ☾ toggle] │
└─────────────────────────────────────────────────────┘
```

**Left:** "CherryKeep" in `--ck-font-display`, `--ck-text-base` size, `--ck-text-secondary` color, font-weight 500, letter-spacing 0.05em. This is NOT a link. It is just text.

**Center/Right:** The tool tabs. For now there are only two real "tools": the Loot Generator (which includes Magic Item Tables + Loot Drops + Settings tabs internally) and a future Calendar. For the immediate implementation, keep the existing tab structure but restyle it as nav items inside this bar. The tabs that appear in the nav are: "Tables", "Loot Drops", "Settings", "About", "How it Works", "D&Design". The "Review" tab only appears when adminMode is true, same as now.

**Far Right:** A theme toggle (☀ ◐ ☾) — three small buttons in a pill container. This replaces the theme segmented control currently in CampaignSettings.

### 6.2. Changes to App.tsx

Delete the `<h1 className="app-title">` element.

Replace the `.tab-bar` div with a `<nav>` element. The nav has:
- `className="ck-nav"` 
- `aria-label="Site navigation"`
- The CherryKeep text
- The tab buttons (same logic as current, just new classes)
- The theme toggle

The theme toggle calls `setSettings(prev => ({ ...prev, theme: newTheme }))` same as CampaignSettings does.

The tab buttons use class `ck-nav-tab` instead of `tab-btn`. Active state uses class `active` same as before.

**Also update the page `<title>` in `index.html`** from "D&D 5e Loot Generator" to "CherryKeep — D&D 5e Loot Tools".

### 6.3. Nav CSS

```css
/* ═══════════════════════════════════════════
   Top Nav Bar
   ═══════════════════════════════════════════ */
.ck-nav {
  background: var(--ck-bg-base);
  border-bottom: 1px solid var(--ck-border);
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.ck-nav-brand {
  font-family: var(--ck-font-display);
  font-size: var(--ck-text-base);
  color: var(--ck-text-secondary);
  font-weight: 500;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}

.ck-nav-tabs {
  display: flex;
  gap: 0;
  height: 100%;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.ck-nav-tabs::-webkit-scrollbar {
  display: none;
}

.ck-nav-tab {
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-sm);
  font-weight: 400;
  color: var(--ck-text-tertiary);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 0 14px;
  cursor: pointer;
  transition: color var(--ck-ease-fast), border-color var(--ck-ease-fast);
  height: 100%;
  display: flex;
  align-items: center;
  min-width: 44px;  /* touch target */
  white-space: nowrap;
}

.ck-nav-tab:hover {
  color: var(--ck-text-primary);
}

.ck-nav-tab.active {
  color: var(--ck-cherry);
  font-weight: 700;
  border-bottom-color: var(--ck-cherry);
}

.ck-nav-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.ck-nav-divider {
  width: 1px;
  height: 20px;
  background: var(--ck-border);
}

/* Theme Toggle */
.ck-theme-toggle {
  display: flex;
  gap: 1px;
  background: var(--ck-bg-deep);
  border-radius: 6px;
  padding: 2px;
}

.ck-theme-btn {
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-sm);
  min-height: 32px;
  min-width: 36px;
  padding: 0 8px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  transition: all var(--ck-ease-pop);
  background: transparent;
  color: var(--ck-text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.ck-theme-btn.active {
  background: var(--ck-bg-elevated);
  color: var(--ck-text-primary);
  transform: translateY(-1px);
  box-shadow: var(--ck-shadow-pop);
}

/* Mobile: hide brand text below 480px, show just the icon/initial */
@media (max-width: 480px) {
  .ck-nav {
    padding: 0 10px;
  }
  .ck-nav-tab {
    padding: 0 10px;
    font-size: var(--ck-text-xs);
  }
}
```

### 6.4. App Container

Replace the `.app-container` rule:

```css
.app-container {
  max-width: 880px;
  margin: 0 auto;
  padding: 16px 16px 64px;
}
```

Remove the centered `text-align` behavior. Content is left-aligned by default.

---

## 7. Component Specifications

### 7.1. Cards

Replace `.card` rules:

```css
.card {
  background: var(--ck-bg-raised);
  border: 1px solid var(--ck-border);
  border-radius: 10px;
  padding: 1.25rem;
  margin-bottom: 1rem;
  box-shadow: var(--ck-shadow-card);
}
```

Remove the `[data-theme='dark'] .card` override — no longer needed since tokens handle it.

### 7.2. Card Titles

```css
.card-title {
  font-family: var(--ck-font-display);
  font-size: var(--ck-text-lg);
  font-weight: 600;
  color: var(--ck-text-primary);
  letter-spacing: 0.03em;
  margin: 0 0 0.75rem;
}
```

### 7.3. Table Letter Selector (A–I)

**Replace the current `.letter-tabs` / `.letter-tab` system with scrollable pills.**

The current implementation renders 9 square buttons in a wrapping flex row. Replace with a horizontal scrolling pill bar where each pill shows the letter AND the rarity tier subtitle.

**CSS:**

```css
/* ═══════════════════════════════════════════
   Table Selector — Scrollable Pills
   ═══════════════════════════════════════════ */
.table-pills {
  position: relative;
}

.table-pills-fade {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 32px;
  background: linear-gradient(90deg, transparent, var(--ck-bg-deep));
  pointer-events: none;
  z-index: 2;
}

.table-pills-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 6px 32px 6px 6px;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.table-pills-scroll::-webkit-scrollbar {
  display: none;
}

.table-pill {
  font-family: var(--ck-font-display);
  font-size: 0.75rem;
  font-weight: 400;
  letter-spacing: 0.04em;
  white-space: nowrap;
  min-height: 44px;
  padding: 0 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--ck-ease-pop);
  background: transparent;
  color: var(--ck-text-tertiary);
  transform: translateY(0) scale(1.0);
}

.table-pill:hover {
  background: var(--ck-bg-elevated);
  color: var(--ck-text-secondary);
}

.table-pill.active {
  font-weight: 600;
  background: var(--ck-bg-raised);
  color: var(--ck-cherry);
  border-color: var(--ck-border-cherry);
  transform: translateY(-1px) scale(1.05);
  box-shadow: var(--ck-shadow-pop-cherry);
}

.table-pill-sub {
  font-family: var(--ck-font-ui);
  font-size: 0.5625rem;
  font-weight: 400;
  letter-spacing: 0.02em;
  color: var(--ck-text-tertiary);
  opacity: 0.7;
}

.table-pill.active .table-pill-sub {
  color: var(--ck-text-secondary);
  opacity: 1;
}
```

**JSX changes in `LootTables.tsx`:**

Replace the current letter tabs JSX block:

```tsx
// OLD:
<div className="letter-tabs">
  {MI_LETTERS.map((l) => (
    <button key={l} className={`letter-tab${activeLetter === l ? ' active' : ''}`} ...>
      {l}
    </button>
  ))}
</div>
```

With:

```tsx
// NEW:
const TABLE_SUBTITLES: Record<MITable, string> = {
  A: 'Minor · Common',
  B: 'Minor · Uncommon',
  C: 'Minor · Rare',
  D: 'Minor · V.Rare',
  E: 'Minor · Legendary',
  F: 'Major · Uncommon',
  G: 'Major · Rare',
  H: 'Major · V.Rare',
  I: 'Major · Legendary',
};

// In the JSX:
<div className="table-pills">
  <div className="table-pills-fade" />
  <div className="table-pills-scroll" role="tablist" aria-label="Loot table selection">
    {MI_LETTERS.map((l) => (
      <button
        key={l}
        role="tab"
        aria-selected={activeLetter === l}
        className={`table-pill${activeLetter === l ? ' active' : ''}`}
        onClick={() => {
          if (l === activeLetter) {
            setFlashIdx(null);
            dispatch({ type: 'SET_ROOT', rootTable: `Magic-Item-Table-${l}` });
          } else {
            setActiveLetter(l);
          }
        }}
      >
        <span>{l}</span>
        <span className="table-pill-sub">{TABLE_SUBTITLES[l]}</span>
      </button>
    ))}
  </div>
</div>
```

### 7.4. Source Chips

The existing source rows (`.source-row`) in CampaignSettings need the pop/emphasis treatment. For the LootTables component's inline source display (if any), use chip-style elements.

```css
/* Source chip (used in inline displays) */
.source-chip {
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-xs);
  font-weight: 500;
  min-height: 44px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--ck-ease-pop);
  background: transparent;
  border: 1px solid var(--ck-border-subtle);
  color: var(--ck-text-tertiary);
  opacity: 0.55;
  transform: translateY(0) scale(1.0);
}

.source-chip:hover {
  transform: translateY(0) scale(1.01);
}

.source-chip.on {
  font-weight: 700;
  background: var(--ck-bg-elevated);
  border-color: var(--ck-border);
  color: var(--ck-text-primary);
  opacity: 1;
  transform: translateY(-1px) scale(1.04);
  box-shadow: var(--ck-shadow-pop);
}

.source-chip.on.emphasis {
  background: var(--ck-cherry-faint);
  border-color: var(--ck-border-cherry);
  color: var(--ck-cherry);
  box-shadow: var(--ck-shadow-pop-cherry);
}
```

### 7.5. Buttons

**Primary button (ROLL, etc.):**

```css
.btn-primary {
  background: linear-gradient(180deg, var(--ck-cherry), var(--ck-cherry-muted));
  color: var(--ck-text-on-cherry);
  border: 1px solid var(--ck-border-cherry);
  border-radius: 8px;
  min-height: 44px;
  padding: 0 24px;
  font-family: var(--ck-font-display);
  font-size: var(--ck-text-sm);
  font-weight: 600;
  letter-spacing: 0.06em;
  cursor: pointer;
  box-shadow: var(--ck-shadow-button);
  transition: all 0.15s ease;
}

.btn-primary:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
  filter: brightness(0.95);
}
```

Apply the `btn-primary` class to the existing `.btn-roll` button. Keep `.btn-roll` as an alias if needed, but its styles should match `btn-primary`.

**Secondary button:**

```css
.btn-secondary {
  background: var(--ck-bg-elevated);
  color: var(--ck-text-secondary);
  border: 1px solid var(--ck-border);
  border-radius: 8px;
  min-height: 44px;
  padding: 0 16px;
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--ck-ease-fast);
}

.btn-secondary:hover {
  background: var(--ck-bg-hover);
  transform: translateY(-1px);
}
```

**Ghost button:**

```css
.btn-ghost {
  background: transparent;
  color: var(--ck-text-tertiary);
  border: 1px solid var(--ck-border-subtle);
  border-radius: 8px;
  min-height: 44px;
  padding: 0 16px;
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-sm);
  font-weight: 400;
  cursor: pointer;
  transition: all var(--ck-ease-fast);
}

.btn-ghost:hover {
  border-color: var(--ck-border);
  color: var(--ck-text-secondary);
}
```

### 7.6. Priority Selector (Segmented Control)

Replace `.segmented-control` / `.segmented-btn`:

```css
.segmented-control {
  display: flex;
  gap: 2px;
  background: var(--ck-bg-deep);
  border-radius: 8px;
  padding: 3px;
  border: none;
  overflow: visible;  /* allow pop shadow to show */
}

.segmented-btn {
  font-family: var(--ck-font-ui);
  font-size: 0.75rem;
  font-weight: 400;
  min-height: 38px;
  padding: 0 12px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all var(--ck-ease-pop);
  background: transparent;
  color: var(--ck-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transform: translateY(0);
}

.segmented-btn:last-child {
  border-right: none;
}

.segmented-btn:hover {
  color: var(--ck-text-secondary);
}

.segmented-btn.active {
  font-weight: 700;
  background: var(--ck-bg-elevated);
  color: var(--ck-text-primary);
  transform: translateY(-1px);
  box-shadow: var(--ck-shadow-pop);
}

/* Special case: if the active value is the "emphasis" or highest level, use cherry */
.segmented-btn.active.emphasis {
  background: var(--ck-cherry);
  color: var(--ck-text-on-cherry);
  box-shadow: var(--ck-shadow-pop-cherry);
}
```

### 7.7. Item Table Rows

The `.entry-row` in table cards:

```css
.entry-row {
  display: grid;
  min-height: 44px;
  padding: 0 14px;
  align-items: center;
  background: transparent;
  border-bottom: 1px solid var(--ck-border-subtle);
  transition: background 0.15s ease;
  cursor: default;
}

.entry-row:nth-child(even) {
  background: rgba(255, 255, 255, 0.012);
}

[data-theme='light'] .entry-row:nth-child(even) {
  background: rgba(0, 0, 0, 0.015);
}

.entry-row:hover {
  background: var(--ck-bg-hover);
}

.entry-row:last-child {
  border-bottom: none;
}
```

Item names within entry rows use `--ck-font-content` (Crimson Text). All other columns (source, rarity, weight, dice range) use `--ck-font-ui`.

### 7.8. Rarity Colors

Wherever rarity is displayed, use the `--ck-rarity-*` tokens. The existing rarity color classes should map:

```css
.rarity-common    { color: var(--ck-rarity-common); }
.rarity-uncommon  { color: var(--ck-rarity-uncommon); }
.rarity-rare      { color: var(--ck-rarity-rare); }
.rarity-very-rare { color: var(--ck-rarity-very-rare); }
.rarity-legendary { color: var(--ck-rarity-legendary); }
```

If rarity classes don't currently exist, add them. If rarity is set via inline styles in the TSX, keep that approach but use the CSS variable values.

### 7.9. Table Card Container

```css
.table-card {
  background: var(--ck-bg-raised);
  border: 1px solid var(--ck-border);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: var(--ck-shadow-card);
}

.table-card-header {
  padding: 10px 14px;
  border-bottom: 1px solid var(--ck-border);
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-xs);
  font-weight: 600;
  color: var(--ck-text-tertiary);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
```

### 7.10. Roll Result Card

The final result display should have the cherry top-edge treatment:

```css
.result-card {
  background: var(--ck-bg-raised);
  border: 1px solid var(--ck-border-cherry);
  border-radius: 10px;
  padding: 14px 18px;
  position: relative;
  overflow: hidden;
  box-shadow: var(--ck-shadow-glow);
  animation: ck-fade-in 0.3s ease;
}

.result-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--ck-cherry), transparent 60%);
}

.result-card .result-label {
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-xs);
  color: var(--ck-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
}

.result-card .result-name {
  font-family: var(--ck-font-content);
  font-size: 1.375rem;
  color: var(--ck-cherry);
  margin-bottom: 2px;
}

.result-card .result-meta {
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-sm);
  color: var(--ck-text-secondary);
}

@keyframes ck-fade-in {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

Apply the `result-card` class to the existing final result display. If the current component uses different class names, add `result-card` as an additional class or rename.

### 7.11. Inputs & Selects

```css
.ck-input,
.ck-select {
  background: var(--ck-bg-deep);
  border: 1px solid var(--ck-border);
  border-radius: 6px;
  padding: 9px 14px;
  min-height: 44px;
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-sm);
  color: var(--ck-text-primary);
  box-shadow: var(--ck-shadow-inset);
  transition: border-color var(--ck-ease-fast);
}

.ck-input:focus-visible,
.ck-select:focus-visible {
  border-color: var(--ck-cherry);
  outline: none;
}

.ck-input::placeholder {
  color: var(--ck-text-tertiary);
}
```

### 7.12. Section Labels

For small uppercase labels above groups of controls (like "Sources", "Selected Source Priority"):

```css
.section-label {
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-xs);
  font-weight: 600;
  color: var(--ck-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 8px;
}
```

---

## 8. Footer

Add a footer at the bottom of `.app-container`:

```html
<footer class="ck-footer">
  <span>© 2026 CherryKeep</span>
  <span>Fan Content Policy · Not affiliated with Wizards of the Coast</span>
</footer>
```

```css
.ck-footer {
  border-top: 1px solid var(--ck-border-subtle);
  padding-top: 16px;
  margin-top: 32px;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  font-family: var(--ck-font-ui);
  font-size: var(--ck-text-xs);
  color: var(--ck-text-tertiary);
}
```

**Legal context for the footer text:**
- "© 2026 CherryKeep" — This asserts copyright over the tool code and design (which the user owns). No registration needed.
- "Fan Content Policy" — This refers to Wizards of the Coast's Fan Content Policy which permits fan-made tools that reference D&D content as long as they are non-commercial and include this attribution. The current tool qualifies.
- "Not affiliated with Wizards of the Coast" — Required disclaimer.

---

## 9. Responsive Breakpoints

### Mobile (max-width: 560px)

```css
@media (max-width: 560px) {
  .app-container {
    padding: 12px 10px 80px; /* extra bottom padding for thumb reach */
  }

  .ck-nav-tab {
    padding: 0 10px;
    font-size: var(--ck-text-xs);
  }

  .entry-row {
    padding: 0 10px;
    min-height: 44px;
  }

  /* Hide percentage column on small screens */
  .entry-percentage {
    display: none;
  }

  .action-bar {
    flex-wrap: wrap;
  }

  .btn-primary,
  .btn-secondary {
    flex-basis: 100%;
  }
}
```

### The table pills scroll naturally on mobile — no changes needed for the `.table-pills` component on small screens; the horizontal scroll + fade hint handles it.

---

## 10. Specific Migration Checklist

This is an ordered list of every file change. Do them in this order.

### Step 1: `src/engine/types.ts`
- Delete the `Palette` type entirely.
- Remove `palette: Palette;` from `CampaignSettings`.
- Keep `ThemePref` unchanged.

### Step 2: `src/engine/constants.ts`
- Remove `palette: 'treasure',` from `DEFAULT_CAMPAIGN_SETTINGS`.

### Step 3: `src/web/index.html`
- Replace the Google Fonts `<link>` tag as specified in Section 4.1.
- Change `<title>` to "CherryKeep — D&D 5e Loot Tools".

### Step 4: `src/web/styles/app.css`
- Delete ALL palette blocks (`:root`, `[data-theme='dark']`, `[data-palette='stone']`, etc.) — lines 1 through ~235.
- Replace with the new `:root` and `[data-theme='light']` blocks from Section 3.
- Update the base styles (`html`, `body`, `*`, `button`) per Section 5.
- Add the global `:focus-visible` rule from Section 5.
- Replace `.app-container` per Section 6.4.
- Delete `.app-title` (no longer used).
- Delete the old `.tab-bar` and `.tab-btn` rules.
- Add new `.ck-nav`, `.ck-nav-tab`, `.ck-theme-toggle`, `.ck-theme-btn` rules per Section 6.3.
- Replace `.card` per Section 7.1.
- Delete `[data-theme='dark'] .card` override.
- Replace `.card-title` per Section 7.2.
- Delete `.letter-tabs` and `.letter-tab` rules.
- Add `.table-pills`, `.table-pill`, etc. per Section 7.3.
- Add `.source-chip` rules per Section 7.4.
- Add `.btn-primary`, `.btn-secondary`, `.btn-ghost` per Section 7.5.
- Replace `.segmented-control` and `.segmented-btn` per Section 7.6.
- Update `.entry-row` per Section 7.7.
- Add rarity color classes per Section 7.8.
- Update `.table-card` per Section 7.9.
- Add `.result-card` per Section 7.10.
- Add `.ck-input` / `.ck-select` per Section 7.11.
- Add `.section-label` per Section 7.12.
- Add `.ck-footer` per Section 8.
- Update responsive breakpoints per Section 9.
- **Then:** Do a find-and-replace across the ENTIRE file for every remaining `var(--old-token)` reference using the mapping table in Section 3. Every `var(--bg-card)` becomes `var(--ck-bg-raised)`, every `var(--ink)` becomes `var(--ck-text-primary)`, etc.
- **Then:** Do a find-and-replace for every `font-family` declaration using the mapping in Section 4.4.
- **Then:** Delete the `.palette-swatches` and `.palette-swatch` rules (and `.dice-swatch` if desired).
- Delete any `[data-palette='...']` selectors that may remain anywhere in the file.

### Step 5: `src/web/App.tsx`
- Delete `<h1 className="app-title">`.
- Replace the `.tab-bar` div with the new `<nav className="ck-nav">` structure per Section 6.2.
- Remove `document.documentElement.dataset.palette = ...` from the useEffect.
- Add the theme toggle (☀ ◐ ☾) in the nav bar. The toggle renders three buttons with classes `ck-theme-btn` and sets `settings.theme` to `'light'`, `'auto'`, or `'dark'`.
- Add the footer per Section 8 at the bottom of the return, after the tab content.

### Step 6: `src/web/components/LootTables.tsx`
- Add the `TABLE_SUBTITLES` constant.
- Replace the letter tabs JSX with the new table pills JSX per Section 7.3.

### Step 7: `src/web/components/CampaignSettings.tsx`
- Remove the `Palette` import.
- Delete `PALETTE_OPTIONS`.
- Delete the entire palette swatches UI section.
- The theme selector can remain here as a secondary location (the nav bar toggle is the primary one), OR it can be removed since the nav bar now handles it. Either is acceptable. If kept, restyle it with the new `.segmented-control` / `.segmented-btn` classes.

---

## 11. Things NOT to Change

- **Engine logic** — no changes to dice rolling, weighting, stepper, or any `src/engine/` files other than types.ts and constants.ts.
- **Data files** — no changes to JSON, curation, or item-stats files.
- **ReviewUI.tsx** — leave as-is for now. It will inherit the CSS variable changes automatically.
- **EncounterBuilder.tsx / VaultHoard.tsx** — leave structure as-is. They will inherit the CSS variable changes.
- **Build config** — no changes to vite.config.ts, tsconfig.json, package.json.
- **The `data-theme` attribute system** — keep it. It still works. The only change is that `data-palette` is removed.
- **The `resolveTheme()` function in App.tsx** — keep it unchanged.

---

## 12. Verification

After implementation, verify:

1. **Dark mode (default):** Page background is `#0c0d10`. Card backgrounds are `#1a1b22`. Text is `#e8e7ed`. Cherry accent (`#c44258`) appears on the ROLL button and active nav tab.
2. **Light mode:** Page background is `#eeeef2`. Card backgrounds are `#ffffff`. Text is `#1a1b22`. Cherry darkens to `#a83348`.
3. **Auto mode:** Follows `prefers-color-scheme`. Toggle between system light/dark to verify.
4. **Theme toggle:** The ☀ ◐ ☾ toggle in the nav bar switches modes. Active button pops up.
5. **Table pills:** A–I pills scroll horizontally. Active pill shows cherry color and lifts up. Each pill has a subtitle (e.g., "Minor · Common").
6. **Touch targets:** Use browser DevTools to verify every button, chip, and pill has at least 44px height.
7. **Focus states:** Tab through the entire page with keyboard. Every interactive element shows a blue focus ring.
8. **Fonts:** Cinzel on headers/site name. Crimson Text on item names. Source Sans 3 on everything else. No IBM Plex Mono anywhere.
9. **No palette selector:** The palette swatches are gone from CampaignSettings.
10. **Footer:** "© 2026 CherryKeep" and "Fan Content Policy · Not affiliated with Wizards of the Coast" at the bottom of every page.
