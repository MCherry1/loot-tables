import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import curationData from '../../../data/curation.json';

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

  // Filter
  const filtered = useMemo(() => {
    return mergedItems.filter((item) => {
      if (filterStatus !== 'all' && item.entry.status !== filterStatus) return false;
      if (filterTable !== 'all' && item.entry.table !== filterTable) return false;
      if (filterCategory !== 'all' && item.entry.category !== filterCategory) return false;
      if (filterSource && !item.source.toLowerCase().includes(filterSource.toLowerCase())) return false;
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

  // Weight-in-context for the selected item
  const selectedItem = sorted[selectedIdx] ?? null;
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
      }))
      .sort((a, b) => b.weight - a.weight);
    const totalWeight = siblings.reduce((sum, s) => sum + s.weight, 0);
    const die = nextDieUp(totalWeight);
    return { siblings, totalWeight, die, table, category };
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

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingWeight) return; // Don't capture while editing

      switch (e.key) {
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          setSelectedIdx((prev) => Math.min(prev + 1, sorted.length - 1));
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
  }, [sorted.length, selectedItem, editingWeight, approveItem, setWeight]);

  // Keep selection in view
  useEffect(() => {
    if (selectedIdx >= sorted.length) {
      setSelectedIdx(Math.max(0, sorted.length - 1));
    }
  }, [sorted.length, selectedIdx]);

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

      {/* Filters */}
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
        <input
          type="text"
          className="review-search review-search-small"
          placeholder="Source..."
          value={filterSource}
          onChange={(e) => { setFilterSource(e.target.value); setSelectedIdx(0); }}
        />
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
            <button className="review-batch-btn review-batch-danger" onClick={clearDraft}>
              Clear draft
            </button>
          </>
        )}
      </div>

      <div className="review-layout">
        {/* Item table */}
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
              {siblingContext.siblings.map((s) => (
                <li
                  key={s.key}
                  className={[
                    s.isSelected ? 'review-context-selected' : '',
                    s.isDraft ? 'review-context-draft' : '',
                  ].join(' ')}
                >
                  <span className="review-context-weight">{s.weight}</span>
                  <span className="review-context-name">{s.name}</span>
                </li>
              ))}
            </ul>
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
    </div>
  );
};

export default ReviewUI;
