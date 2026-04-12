# D&D 5e Loot Generator

A per-creature treasure system for D&D 5e that replaces the DMG's hoard tables with individually-scaled loot drops. Every creature killed has a chance of dropping coins, gems, art objects, or magic items — proportional to its Challenge Rating, Tier of Play, and role in the encounter.

Over a full campaign the total treasure matches what the DMG expects. But instead of rolling once on a giant hoard table after a dungeon, the rewards arrive creature by creature in a rhythm the players can feel at the table.

**[Live App](https://mcherry1.github.io/loot-tables/)** · Built with React + TypeScript · Deployed on GitHub Pages

---

The app has three info tabs, each available as a standalone markdown file in this repo:

- **[About](ABOUT.md)** — What this is and why it exists
- **[Design](DESIGN.md)** — Design philosophy: item table categories, monster loot, gems, art objects
- **[How to Use](HOWTO.md)** — Practical guide for DMs: rolling, choosing, encounter building, settings

Technical specs (formulas, algorithms, data models) are in the **[specs/](specs/)** folder.

---

## Development

```bash
npm install
npm run dev        # Vite dev server
npm run build      # Production build
```

### Data Pipeline

```
Excel tables → extract-data.ts → magic-items.ts (base data)
5etools JSON → auto-classify.ts → curation.json (weight overrides)
5etools JSON → generate-item-stats.ts → item-stats.json (descriptions)
```

### Key Files

| Path | Purpose |
|------|---------|
| `src/engine/budget.ts` | Budget calculation and role multipliers |
| `src/engine/roller.ts` | Table lookup, source filtering, weighted picks |
| `src/engine/loot-generator.ts` | Orchestrates coin/gem/art/magic-item generation |
| `src/data/magic-items.ts` | All magic item table data |
| `data/curation.json` | Admin weight overrides (source of truth) |
| `data/item-stats.json` | Item descriptions for result cards |
| `scripts/auto-classify.ts` | Heuristic classifier for new items |
