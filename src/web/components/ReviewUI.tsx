import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import curationData from '../../../data/curation.json';
import itemStatsData from '../../../data/item-stats.json';
import { expandSource } from '../../data/sourcebook-lookup';
import {
  publishJsonFile,
  getStoredPat,
  storePat,
  GITHUB_PAT_KEY,
} from '../lib/githubPublish';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CurationEntry {
  table: string;
  category: string;
  weight: number | null;
  refs?: string[];
  status: 'approved' | 'ready-for-review' | 'excluded';
  reason?: string;
  notes?: string;
}

type CurationFile = Record<string, CurationEntry>;

interface ItemRow {
  key: string;
  name: string;
  source: string;
  entry: CurationEntry;
}

type SortField = 'name' | 'source' | 'table' | 'category' | 'weight' | 'status';
type SortDir = 'asc' | 'desc';

// ---------------------------------------------------------------------------
// Item stats type labels (5etools type codes → readable names)
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<string, string> = {
  'M': 'Melee Weapon', 'R': 'Ranged Weapon',
  'S': 'Shield', 'HA': 'Heavy Armor', 'MA': 'Medium Armor', 'LA': 'Light Armor',
  'P': 'Potion', 'SC': 'Scroll', 'WD': 'Wand', 'RD': 'Rod', 'ST': 'Staff',
  'RG': 'Ring', 'A': 'Ammunition', 'SCF': 'Spellcasting Focus',
  'INS': 'Instrument',
};

type ItemStats = Record<string, { type: string; rarity: string; attune: string; desc: string }>;
const itemStats = itemStatsData as ItemStats;

// ---------------------------------------------------------------------------
// Standard dice totals for sub-table display
// ---------------------------------------------------------------------------

const STANDARD_DICE = [4, 6, 8, 10, 12, 20, 100];

function nextDieUp(total: number): number {
  for (const d of STANDARD_DICE) {
    if (d >= total) return d;
  }
  return 100;
}

// ---------------------------------------------------------------------------
// Draft persistence (localStorage)
// ---------------------------------------------------------------------------

const DRAFT_KEY = 'loot-tables:curation-draft';

function loadDraft(): Record<string, Partial<CurationEntry>> {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveDraft(draft: Record<string, Partial<CurationEntry>>): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Ignore quota errors
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ReviewUI: React.FC = () => {
  const [curation] = useState<CurationFile>(() => curationData as unknown as CurationFile);
  const [draft, setDraft] = useState<Record<string, Partial<CurationEntry>>>(() => loadDraft());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTable, setFilterTable] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [editingWeight, setEditingWeight] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'flat' | 'source'>('flat');
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());

  const tableRef = useRef<HTMLDivElement>(null);

  // Persist draft changes
  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  // Merge curation with draft overrides
  const mergedItems = useMemo((): ItemRow[] => {
    return Object.entries(curation).map(([key, entry]) => {
      const parts = key.split('|');
      const name = parts[0];
      const source = parts[1] || '';
      const merged = draft[key] ? { ...entry, ...draft[key] } : entry;
      return { key, name, source, entry: merged as CurationEntry };
    });
  }, [curation, draft]);

  // Available categories and tables for filters
  const allTables = useMemo(() => {
    const tables = new Set(mergedItems.map((i) => i.entry.table));
    return [...tables].sort();
  }, [mergedItems]);

  const allCategories = useMemo(() => {
    const cats = new Set(mergedItems.map((i) => i.entry.category));
    return [...cats].sort();
  }, [mergedItems]);

  const allSources = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of mergedItems) {
      if (item.source) counts[item.source] = (counts[item.source] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([acronym, count]) => ({ acronym, fullName: expandSource(acronym), count }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [mergedItems]);

  // Filter
  const filtered = useMemo(() => {
    return mergedItems.filter((item) => {
      if (filterStatus !== 'all' && item.entry.status !== filterStatus) return false;
      if (filterTable !== 'all' && item.entry.table !== filterTable) return false;
      if (filterCategory !== 'all' && item.entry.category !== filterCategory) return false;
      if (filterSource && item.source !== filterSource) return false;
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [mergedItems, filterStatus, filterTable, filterCategory, filterSource, searchQuery]);

  // Sort
  const sorted = useMemo(() => {
    const compare = (a: ItemRow, b: ItemRow): number => {
      let va: string | number, vb: string | number;
      switch (sortField) {
        case 'name': va = a.name; vb = b.name; break;
        case 'source': va = a.source; vb = b.source; break;
        case 'table': va = a.entry.table; vb = b.entry.table; break;
        case 'category': va = a.entry.category; vb = b.entry.category; break;
        case 'weight': va = a.entry.weight ?? 0; vb = b.entry.weight ?? 0; break;
        case 'status': va = a.entry.status; vb = b.entry.status; break;
        default: va = a.name; vb = b.name;
      }
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
    };
    return [...filtered].sort(compare);
  }, [filtered, sortField, sortDir]);

  // Source-batch grouping: group sorted items by source, sub-grouped by table
  type SourceGroup = {
    source: string;
    fullName: string;
    items: ItemRow[];
    reviewCount: number;
    totalCount: number;
    byTable: { table: string; items: ItemRow[] }[];
  };

  const sourceGroups = useMemo((): SourceGroup[] => {
    const grouped: Record<string, ItemRow[]> = {};
    for (const item of sorted) {
      const src = item.source || 'Unknown';
      (grouped[src] ??= []).push(item);
    }
    return Object.entries(grouped)
      .map(([source, items]) => {
        const byTableMap: Record<string, ItemRow[]> = {};
        for (const item of items) {
          (byTableMap[item.entry.table] ??= []).push(item);
        }
        const byTable = Object.entries(byTableMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([table, tableItems]) => ({ table, items: tableItems }));
        return {
          source,
          fullName: expandSource(source),
          items,
          reviewCount: items.filter((i) => i.entry.status === 'ready-for-review').length,
          totalCount: items.length,
          byTable,
        };
      })
      .sort((a, b) => b.reviewCount - a.reviewCount || a.fullName.localeCompare(b.fullName));
  }, [sorted]);

  // In source view, the visible items are only from expanded sources (in order)
  const sourceViewItems = useMemo((): ItemRow[] => {
    if (viewMode !== 'source') return [];
    const items: ItemRow[] = [];
    for (const group of sourceGroups) {
      if (expandedSources.has(group.source)) {
        items.push(...group.items);
      }
    }
    return items;
  }, [viewMode, sourceGroups, expandedSources]);

  // Unified visible items list for keyboard navigation and selection
  const visibleItems = viewMode === 'flat' ? sorted : sourceViewItems;
  const selectedItem = visibleItems[selectedIdx] ?? null;
  type RebalanceProposal = {
    currentDie: number;
    proposedDie: number;
    optionExpand: { die: number; slack: number };
    optionSteal: { name: string; from: number; to: number }[] | null;
  };

  const siblingContext = useMemo(() => {
    if (!selectedItem) return null;
    const { table, category } = selectedItem.entry;
    const siblings = mergedItems
      .filter((i) => i.entry.table === table && i.entry.category === category)
      .map((i) => ({
        key: i.key,
        name: i.name,
        weight: i.entry.weight ?? 3,
        isSelected: i.key === selectedItem.key,
        isDraft: !!draft[i.key],
        isNew: i.entry.status === 'ready-for-review',
      }))
      .sort((a, b) => b.weight - a.weight);
    const totalWeight = siblings.reduce((sum, s) => sum + s.weight, 0);
    const die = nextDieUp(totalWeight);

    // Rebalancing proposal: detect if new items push past current die
    let proposal: RebalanceProposal | null = null;
    const newWeight = siblings.filter((s) => s.isNew).reduce((sum, s) => sum + s.weight, 0);
    if (newWeight > 0) {
      const oldTotal = totalWeight - newWeight;
      const oldDie = nextDieUp(oldTotal);
      if (die > oldDie) {
        // Total exceeds old die — propose expand or steal
        const optionExpand = { die, slack: die - totalWeight };
        const stealTarget = totalWeight - oldDie;
        const candidates = siblings
          .filter((s) => !s.isNew && s.weight > 1)
          .sort((a, b) => b.weight - a.weight);
        const steals: { name: string; from: number; to: number }[] = [];
        let stolen = 0;
        for (const c of candidates) {
          if (stolen >= stealTarget) break;
          const take = Math.min(c.weight - 1, stealTarget - stolen);
          steals.push({ name: c.name, from: c.weight, to: c.weight - take });
          stolen += take;
        }
        proposal = {
          currentDie: oldDie,
          proposedDie: die,
          optionExpand,
          optionSteal: stolen >= stealTarget ? steals : null,
        };
      }
    }

    return { siblings, totalWeight, die, table, category, proposal };
  }, [selectedItem, mergedItems, draft]);

  // Draft mutation helpers
  const updateDraft = useCallback((key: string, patch: Partial<CurationEntry>) => {
    setDraft((prev) => ({ ...prev, [key]: { ...(prev[key] ?? {}), ...patch } }));
  }, []);

  const approveItem = useCallback((key: string) => {
    updateDraft(key, { status: 'approved' });
  }, [updateDraft]);

  const setWeight = useCallback((key: string, weight: number) => {
    updateDraft(key, { weight: Math.max(1, Math.min(99, weight)) });
  }, [updateDraft]);

  // Batch operations
  const approveAllVisible = useCallback(() => {
    const next = { ...draft };
    for (const item of sorted) {
      if (item.entry.status !== 'approved') {
        next[item.key] = { ...(next[item.key] ?? {}), status: 'approved' };
      }
    }
    setDraft(next);
  }, [draft, sorted]);

  const applyStealProposal = useCallback((steals: { name: string; from: number; to: number }[]) => {
    if (!siblingContext) return;
    for (const steal of steals) {
      const sibling = siblingContext.siblings.find((s) => s.name === steal.name);
      if (sibling) {
        updateDraft(sibling.key, { weight: steal.to });
      }
    }
  }, [siblingContext, updateDraft]);

  const approveSourceItems = useCallback((items: ItemRow[]) => {
    const next = { ...draft };
    for (const item of items) {
      if (item.entry.status !== 'approved') {
        next[item.key] = { ...(next[item.key] ?? {}), status: 'approved' };
      }
    }
    setDraft(next);
  }, [draft]);

  const toggleSourceExpanded = useCallback((source: string) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return next;
    });
    setSelectedIdx(0);
  }, []);

  const draftCount = Object.keys(draft).length;

  const clearDraft = useCallback(() => {
    setDraft({});
    localStorage.removeItem(DRAFT_KEY);
  }, []);

  const exportDraft = useCallback(() => {
    const merged: CurationFile = {};
    for (const [key, entry] of Object.entries(curation)) {
      merged[key] = draft[key] ? { ...entry, ...draft[key] } as CurationEntry : entry;
    }
    const blob = new Blob([JSON.stringify(merged, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'curation.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [curation, draft]);

  // GitHub publish (PAT storage + network live in src/web/lib/githubPublish.ts)
  const PAT_KEY = GITHUB_PAT_KEY;
  const [showPatModal, setShowPatModal] = useState(false);
  const [patInput, setPatInput] = useState('');
  const [publishState, setPublishState] = useState<'idle' | 'publishing' | 'success' | 'error'>('idle');
  const [publishError, setPublishError] = useState<string | null>(null);
  const publishTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (publishTimerRef.current != null) window.clearTimeout(publishTimerRef.current);
    };
  }, []);

  const publishToGitHub = useCallback(async () => {
    const pat = getStoredPat();
    if (!pat) { setShowPatModal(true); return; }

    setPublishState('publishing');
    setPublishError(null);

    // Merge curation + draft.
    const merged: CurationFile = {};
    for (const [key, entry] of Object.entries(curation)) {
      merged[key] = draft[key] ? { ...entry, ...draft[key] } as CurationEntry : entry;
    }

    const result = await publishJsonFile(
      pat,
      'data/curation.json',
      merged,
      'Update curation.json via review UI',
    );

    if (!result.ok) {
      setPublishState('error');
      setPublishError(result.error);
      if (result.kind === 'auth') setShowPatModal(true);
      return;
    }

    // Success
    setPublishState('success');
    setDraft({});
    localStorage.removeItem(DRAFT_KEY);
    publishTimerRef.current = window.setTimeout(() => {
      publishTimerRef.current = null;
      setPublishState('idle');
    }, 3000);
  }, [curation, draft]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingWeight) return; // Don't capture while editing
      const maxIdx = visibleItems.length - 1;

      switch (e.key) {
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          setSelectedIdx((prev) => Math.min(prev + 1, maxIdx));
          break;
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          setSelectedIdx((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedItem) approveItem(selectedItem.key);
          break;
        case '1': case '2': case '3': case '4': case '5':
        case '6': case '7': case '8': case '9':
          e.preventDefault();
          if (selectedItem) setWeight(selectedItem.key, Number(e.key));
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visibleItems.length, selectedItem, editingWeight, approveItem, setWeight]);

  // Keep selection in view
  useEffect(() => {
    if (selectedIdx >= visibleItems.length) {
      setSelectedIdx(Math.max(0, visibleItems.length - 1));
    }
  }, [visibleItems.length, selectedIdx]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortIndicator = (field: SortField) =>
    sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  return (
    <div className="review-ui">
      <div className="review-header">
        <h2 className="card-title">Item Review</h2>
        <div className="review-stats">
          <span>{sorted.length} items shown</span>
          {draftCount > 0 && (
            <span className="draft-badge">{draftCount} unsaved changes</span>
          )}
        </div>
      </div>

      {/* View mode toggle + Filters */}
      <div className="review-view-toggle">
        <button
          className={`review-toggle-btn${viewMode === 'flat' ? ' active' : ''}`}
          onClick={() => { setViewMode('flat'); setSelectedIdx(0); }}
        >
          Flat List
        </button>
        <button
          className={`review-toggle-btn${viewMode === 'source' ? ' active' : ''}`}
          onClick={() => { setViewMode('source'); setSelectedIdx(0); }}
        >
          By Source
        </button>
      </div>
      <div className="review-filters">
        <input
          type="text"
          className="review-search"
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setSelectedIdx(0); }}
        />
        <select
          className="review-filter-select"
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setSelectedIdx(0); }}
        >
          <option value="all">All statuses</option>
          <option value="approved">Approved</option>
          <option value="ready-for-review">Ready for review</option>
          <option value="excluded">Excluded</option>
        </select>
        <select
          className="review-filter-select"
          value={filterTable}
          onChange={(e) => { setFilterTable(e.target.value); setSelectedIdx(0); }}
        >
          <option value="all">All tables</option>
          {allTables.map((t) => (
            <option key={t} value={t}>Table {t}</option>
          ))}
        </select>
        <select
          className="review-filter-select"
          value={filterCategory}
          onChange={(e) => { setFilterCategory(e.target.value); setSelectedIdx(0); }}
        >
          <option value="all">All categories</option>
          {allCategories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className="review-filter-select"
          value={filterSource}
          onChange={(e) => { setFilterSource(e.target.value); setSelectedIdx(0); }}
        >
          <option value="">All sources</option>
          {allSources.map((s) => (
            <option key={s.acronym} value={s.acronym}>
              {s.fullName} ({s.count})
            </option>
          ))}
        </select>
      </div>

      {/* Batch operations */}
      <div className="review-batch">
        <button className="review-batch-btn" onClick={approveAllVisible}>
          Approve all visible ({sorted.filter((i) => i.entry.status !== 'approved').length})
        </button>
        {draftCount > 0 && (
          <>
            <button className="review-batch-btn" onClick={exportDraft}>
              Export curation.json
            </button>
            <button
              className={`review-batch-btn review-publish-btn${
                publishState === 'success' ? ' publish-success' :
                publishState === 'error' ? ' publish-error' : ''
              }`}
              onClick={publishToGitHub}
              disabled={publishState === 'publishing'}
            >
              {publishState === 'publishing' ? 'Publishing...' :
               publishState === 'success' ? 'Published!' :
               publishState === 'error' ? 'Failed' :
               'Publish to GitHub'}
            </button>
            <button className="review-batch-btn review-batch-danger" onClick={clearDraft}>
              Clear draft
            </button>
          </>
        )}
        <button
          className="review-batch-btn review-manage-pat"
          onClick={() => { setPatInput(getStoredPat() ? '********' : ''); setShowPatModal(true); }}
        >
          Manage PAT
        </button>
        {publishError && <span className="review-publish-error">{publishError}</span>}
      </div>

      <div className="review-layout">
        {/* Main content area: flat table or source-batch view */}
        {viewMode === 'flat' ? (
          <div className="review-table-wrap" ref={tableRef}>
            <table className="review-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort('name')}>Name{sortIndicator('name')}</th>
                  <th onClick={() => toggleSort('source')}>Source{sortIndicator('source')}</th>
                  <th onClick={() => toggleSort('table')}>Table{sortIndicator('table')}</th>
                  <th onClick={() => toggleSort('category')}>Category{sortIndicator('category')}</th>
                  <th onClick={() => toggleSort('weight')}>W{sortIndicator('weight')}</th>
                  <th onClick={() => toggleSort('status')}>Status{sortIndicator('status')}</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((item, idx) => {
                  const isDrafted = !!draft[item.key];
                  return (
                    <tr
                      key={item.key}
                      className={[
                        idx === selectedIdx ? 'review-row-selected' : '',
                        isDrafted ? 'review-row-draft' : '',
                        item.entry.status === 'excluded' ? 'review-row-excluded' : '',
                      ].join(' ')}
                      onClick={() => setSelectedIdx(idx)}
                    >
                      <td className="review-cell-name">{item.name}</td>
                      <td className="review-cell-source">{item.source}</td>
                      <td>{item.entry.table}</td>
                      <td>{item.entry.category}</td>
                      <td>
                        {editingWeight === item.key ? (
                          <input
                            type="number"
                            className="review-weight-input"
                            min={1}
                            max={99}
                            defaultValue={item.entry.weight ?? 3}
                            autoFocus
                            onBlur={(e) => {
                              setWeight(item.key, Number(e.target.value) || 3);
                              setEditingWeight(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setWeight(item.key, Number((e.target as HTMLInputElement).value) || 3);
                                setEditingWeight(null);
                              }
                              if (e.key === 'Escape') setEditingWeight(null);
                            }}
                          />
                        ) : (
                          <span
                            className="review-weight-display"
                            onClick={(e) => { e.stopPropagation(); setEditingWeight(item.key); }}
                          >
                            {item.entry.weight ?? '—'}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`review-status review-status-${item.entry.status}`}>
                          {item.entry.status === 'approved' ? '✓' :
                           item.entry.status === 'excluded' ? '✗' : '?'}
                        </span>
                      </td>
                      <td>
                        {item.entry.status !== 'approved' && (
                          <button
                            className="review-approve-btn"
                            onClick={(e) => { e.stopPropagation(); approveItem(item.key); }}
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="review-source-view" ref={tableRef}>
            {sourceGroups.map((group) => {
              const isExpanded = expandedSources.has(group.source);
              const hasReview = group.reviewCount > 0;
              return (
                <div
                  key={group.source}
                  className={`source-card${!hasReview ? ' source-card-dim' : ''}`}
                >
                  <div
                    className="source-card-header"
                    onClick={() => toggleSourceExpanded(group.source)}
                  >
                    <span className="source-card-arrow">{isExpanded ? '\u25BC' : '\u25B6'}</span>
                    <span className="source-card-name">{group.fullName} ({group.source})</span>
                    <span className="source-card-counts">
                      {hasReview && (
                        <span className="source-card-review-count">{group.reviewCount} to review</span>
                      )}
                      {' '}{group.totalCount} total
                    </span>
                  </div>
                  {isExpanded && (
                    <div className="source-card-body">
                      {group.byTable.map((tableGroup) => (
                        <div key={tableGroup.table} className="source-table-group">
                          <div className="source-table-label">Table {tableGroup.table}:</div>
                          {tableGroup.items.map((item) => {
                            const flatIdx = sourceViewItems.indexOf(item);
                            const isDrafted = !!draft[item.key];
                            return (
                              <div
                                key={item.key}
                                className={[
                                  'source-item-row',
                                  flatIdx === selectedIdx ? 'review-row-selected' : '',
                                  isDrafted ? 'review-row-draft' : '',
                                  item.entry.status === 'excluded' ? 'review-row-excluded' : '',
                                ].join(' ')}
                                onClick={() => setSelectedIdx(flatIdx)}
                              >
                                <span className="source-item-name">{item.name}</span>
                                <span className="source-item-category">{item.entry.category}</span>
                                <span
                                  className="review-weight-display"
                                  onClick={(e) => { e.stopPropagation(); setEditingWeight(item.key); }}
                                >
                                  w={editingWeight === item.key ? (
                                    <input
                                      type="number"
                                      className="review-weight-input"
                                      min={1}
                                      max={99}
                                      defaultValue={item.entry.weight ?? 3}
                                      autoFocus
                                      onBlur={(ev) => {
                                        setWeight(item.key, Number(ev.target.value) || 3);
                                        setEditingWeight(null);
                                      }}
                                      onKeyDown={(ev) => {
                                        if (ev.key === 'Enter') {
                                          setWeight(item.key, Number((ev.target as HTMLInputElement).value) || 3);
                                          setEditingWeight(null);
                                        }
                                        if (ev.key === 'Escape') setEditingWeight(null);
                                      }}
                                    />
                                  ) : (item.entry.weight ?? '—')}
                                </span>
                                <span className={`review-status review-status-${item.entry.status}`}>
                                  {item.entry.status === 'approved' ? '✓' :
                                   item.entry.status === 'excluded' ? '✗' : '?'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                      {group.reviewCount > 0 && (
                        <div className="source-card-actions">
                          <button
                            className="review-batch-btn"
                            onClick={() => approveSourceItems(group.items)}
                          >
                            Approve All {group.reviewCount}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Right-side panels */}
        {selectedItem && (
          <div className="review-right-panels">
            {/* Weight-in-context panel */}
            {siblingContext && (
              <div className="review-context">
                <h3 className="review-context-title">
                  Table {siblingContext.table} &mdash; {siblingContext.category}
                </h3>
                <p className="review-context-die">
                  Total weight: {siblingContext.totalWeight} &rarr; d{siblingContext.die}
                </p>
                <ul className="review-context-list">
                  {siblingContext.siblings.map((s) => {
                    const stealInfo = siblingContext.proposal?.optionSteal?.find((st) => st.name === s.name);
                    return (
                      <li
                        key={s.key}
                        className={[
                          s.isSelected ? 'review-context-selected' : '',
                          s.isDraft ? 'review-context-draft' : '',
                          s.isNew ? 'review-context-new' : '',
                          stealInfo ? 'review-context-steal' : '',
                        ].join(' ')}
                      >
                        <span className="review-context-weight">{s.weight}</span>
                        <span className="review-context-name">
                          {s.name}
                          {s.isNew && <span className="review-new-badge">NEW</span>}
                          {stealInfo && <span className="review-steal-badge">{stealInfo.from}&rarr;{stealInfo.to}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {/* Rebalancing proposal */}
                {siblingContext.proposal ? (
                  <div className="review-proposal">
                    <div className="review-proposal-warn">
                      Exceeds d{siblingContext.proposal.currentDie}. Options:
                    </div>
                    <div className="review-proposal-option">
                      Expand to d{siblingContext.proposal.proposedDie} (+{siblingContext.proposal.optionExpand.slack} slack)
                    </div>
                    {siblingContext.proposal.optionSteal && (
                      <>
                        <div className="review-proposal-option">
                          Reduce: {siblingContext.proposal.optionSteal.map(
                            (s) => `${s.name} ${s.from}\u2192${s.to}`
                          ).join(', ')}
                        </div>
                        <button
                          className="review-batch-btn review-proposal-apply"
                          onClick={() => applyStealProposal(siblingContext.proposal!.optionSteal!)}
                        >
                          Apply suggestion
                        </button>
                      </>
                    )}
                  </div>
                ) : siblingContext.siblings.some((s) => s.isNew) ? (
                  <div className="review-proposal-ok">
                    Fits current die. No rebalancing needed.
                  </div>
                ) : null}
              </div>
            )}

            {/* Item stats panel */}
            {itemStats[selectedItem.key] && (() => {
              const stats = itemStats[selectedItem.key];
              const typeLabel = TYPE_LABELS[stats.type] || stats.type || 'Wondrous Item';
              const attune = stats.attune === 'true' || stats.attune === 'True'
                ? 'Yes'
                : stats.attune || 'No';
              const mobileSummary = `${stats.rarity} ${typeLabel}${attune !== 'No' ? ', attunement required' : ''}`;
              return (
                <div className="review-stats-panel">
                  <span className="review-stats-mobile-summary">{mobileSummary}</span>
                  <div className="review-stats-full">
                    <h3 className="review-stats-title">Item Stats</h3>
                    <div className="review-stats-meta">
                      <span className="review-stats-type">{typeLabel}</span>
                      <span className="review-stats-rarity">{stats.rarity}</span>
                    </div>
                    <div className="review-stats-attune">
                      Attunement: {attune}
                    </div>
                    {stats.desc && (
                      <p className="review-stats-desc">{stats.desc}</p>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Keyboard hints */}
      <div className="review-hints">
        <span>↑↓ navigate</span>
        <span>Enter approve</span>
        <span>1-9 set weight</span>
        <span>Click weight to edit</span>
      </div>

      {/* PAT setup modal */}
      {showPatModal && (
        <div className="pat-modal-overlay" onClick={() => setShowPatModal(false)}>
          <div className="pat-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="pat-modal-title">GitHub Personal Access Token</h3>
            <p className="pat-modal-desc">
              Create a fine-grained PAT at github.com/settings/tokens with:
            </p>
            <ul className="pat-modal-list">
              <li>Repository: MCherry1/loot-tables</li>
              <li>Permissions: Contents (Read &amp; Write)</li>
            </ul>
            <input
              type="password"
              className="pat-modal-input"
              placeholder="ghp_..."
              value={patInput}
              onChange={(e) => setPatInput(e.target.value)}
              onFocus={() => { if (patInput === '********') setPatInput(''); }}
            />
            <div className="pat-modal-actions">
              <button
                className="review-batch-btn"
                onClick={() => {
                  if (patInput && patInput !== '********') {
                    storePat(patInput);
                  }
                  setShowPatModal(false);
                  setPatInput('');
                }}
              >
                Save
              </button>
              <button
                className="review-batch-btn"
                onClick={() => { setShowPatModal(false); setPatInput(''); }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewUI;
