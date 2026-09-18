import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Download, Table as TableIcon, LayoutGrid, Columns,
  ChevronLeft, ChevronRight, ExternalLink,
  Loader2, ArrowUp, ArrowDown, ArrowUpDown, X, Maximize2,
  CheckSquare, Square, MinusSquare, Sparkles,
  Bookmark, Plus, Check, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../UI/Primitives';
import { SearchFilterBar } from './SearchFilterBar';
import { SavedSearchEntity } from '../../types/searchBuilder';
import { QueryColumnConfig } from '../../types/queryBuilder';
import { executeSearch, fetchSavedSearch } from '../../services/searchService';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { RecordDetailView } from '../../pages/Record/RecordDetailView';
import { extractWorkflowStatusesFromModules } from '../../utils/workflowStatusExtractor';
import { API_BASE_URL } from '../../config';

const DEFAULT_COLUMNS: QueryColumnConfig[] = [
  { name: 'title', label: 'Record / Title', type: 'link', visible: true },
  { name: 'module_name', label: 'Source Module', type: 'badge', visible: true },
  { name: 'status', label: 'Status', type: 'badge', visible: true },
  { name: 'assignee_name', label: 'Allocated To', type: 'avatar', visible: true },
  { name: 'files', label: 'Files', type: 'number', visible: true },
  { name: 'created_at', label: 'Created', type: 'date', visible: true }
];

export interface SearchRendererProps {
  searchId?: string;
  initialSearch?: SavedSearchEntity | null;
  displayMode?: 'full' | 'compact' | 'search_bar_only' | 'results_only';
  presetParameters?: Record<string, any>;
  lockedParameters?: string[];
  layout?: 'table' | 'cards' | 'split';
  title?: string;
  className?: string;
  onRecordClick?: (record: any) => void;
  showKpis?: boolean;
  allowExport?: boolean;
}

interface SearchPreset {
  id: string;
  name: string;
  parameters: Record<string, any>;
  keyword?: string;
}

export const SearchRenderer: React.FC<SearchRendererProps> = ({
  searchId,
  initialSearch,
  displayMode = 'full',
  presetParameters = {},
  lockedParameters = [],
  layout: propLayout,
  title,
  className,
  onRecordClick,
  showKpis = true,
  allowExport = true
}) => {
  const { tenant, modules } = usePlatform();
  const { session } = useAuth();
  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || localStorage.getItem('aurora_token') || 'dev-token';
  const tenantId = tenant?.id || 't1';
  const navigate = useNavigate();

  // Search definition state
  const [searchDef, setSearchDef] = useState<SavedSearchEntity | null>(initialSearch || null);
  const [loadingDef, setLoadingDef] = useState(!initialSearch && !!searchId);

  // Search execution state
  const [keyword, setKeyword] = useState('');
  const [parameters, setParameters] = useState<Record<string, any>>(() => ({
    ...presetParameters
  }));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(searchDef?.searchConfig?.pageSize || 25);
  const [sortKey, setSortKey] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [results, setResults] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'split'>(
    propLayout || searchDef?.searchConfig?.defaultLayout || 'table'
  );
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [drawerRecord, setDrawerRecord] = useState<any | null>(null);

  // Multi-row selection state
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkTargetStatus, setBulkTargetStatus] = useState('');

  // Personal Presets state
  const presetsStorageKey = useMemo(() => {
    return `aurora_search_presets_${searchDef?.id || searchId || 'default'}`;
  }, [searchDef?.id, searchId]);

  const [presets, setPresets] = useState<SearchPreset[]>(() => {
    try {
      const stored = localStorage.getItem(presetsStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Save presets to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(presetsStorageKey, JSON.stringify(presets));
    } catch (e) {
      console.error('Failed to store search presets:', e);
    }
  }, [presets, presetsStorageKey]);

  // Active columns configuration
  const activeColumns: QueryColumnConfig[] = useMemo(() => {
    const raw = (searchDef?.columnsConfig || []).filter(c => c.visible !== false);
    return raw.length > 0 ? raw : DEFAULT_COLUMNS;
  }, [searchDef?.columnsConfig]);

  // Load search definition if searchId is given
  useEffect(() => {
    if (searchId && (!searchDef || searchDef.id !== searchId)) {
      setLoadingDef(true);
      fetchSavedSearch(searchId, tenantId, token)
        .then((def) => {
          setSearchDef(def);
          if (def.searchConfig?.pageSize) setPageSize(def.searchConfig.pageSize);
          if (def.searchConfig?.defaultLayout && !propLayout) setViewMode(def.searchConfig.defaultLayout);
          
          // Seed default parameter values
          const initialParams: Record<string, any> = { ...presetParameters };
          (def.searchConfig?.exposedControls || []).forEach(ctrl => {
            if (ctrl.defaultValue !== undefined && initialParams[ctrl.parameterName] === undefined) {
              initialParams[ctrl.parameterName] = ctrl.defaultValue;
            }
          });
          setParameters(initialParams);
        })
        .catch(err => {
          console.error('Failed to load search definition:', err);
          setSearchError('Failed to load search configuration');
        })
        .finally(() => setLoadingDef(false));
    }
  }, [searchId, tenantId, token]);

  // Execute Search
  const runSearch = useCallback(async (customPage = page) => {
    setIsSearching(true);
    setSearchError(null);

    try {
      const payload = {
        searchId: searchDef?.id || searchId,
        targetModuleIds: searchDef?.targetModuleIds || [],
        parameters,
        keyword,
        page: customPage,
        pageSize,
        sortKey,
        sortDirection
      };

      const res = await executeSearch(payload, tenantId, token);
      setResults(res.rows || []);
      setTotalCount(res.totalCount || 0);
      setPage(res.page || customPage);
    } catch (err: any) {
      console.error('Search error:', err);
      setSearchError(err.message || 'Execution failed');
      toast.error('Search failed to return results');
    } finally {
      setIsSearching(false);
    }
  }, [searchDef, searchId, parameters, keyword, page, pageSize, sortKey, sortDirection, tenantId, token]);

  // Auto-run search when parameters, keyword, or sorting change
  useEffect(() => {
    const timer = setTimeout(() => {
      runSearch(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [parameters, keyword, sortKey, sortDirection]);

  // Locked parameters combining prop and searchDef exposedControls with isLocked: true
  const effectiveLockedParams = useMemo(() => {
    const fromProps = new Set(lockedParameters || []);
    (searchDef?.searchConfig?.exposedControls || []).forEach(ctrl => {
      if (ctrl.isLocked) fromProps.add(ctrl.parameterName);
    });
    return Array.from(fromProps);
  }, [lockedParameters, searchDef]);

  // Parameter Change Handler
  const handleParameterChange = (key: string, value: any) => {
    if (effectiveLockedParams.includes(key)) return;
    setActivePresetId(null);
    setParameters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Reset Filters Handler
  const handleResetFilters = () => {
    const reset: Record<string, any> = {};
    lockedParameters.forEach(lp => {
      if (presetParameters[lp] !== undefined) reset[lp] = presetParameters[lp];
    });
    setKeyword('');
    setActivePresetId(null);
    setParameters(reset);
  };

  // Sorting Handler
  const handleSortColumn = (colName: string) => {
    if (sortKey === colName) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(colName);
      setSortDirection('asc');
    }
  };

  // Selection Handlers
  const isAllVisibleSelected = useMemo(() => {
    if (!results.length) return false;
    return results.every(r => selectedRowIds.has(r.id));
  }, [results, selectedRowIds]);

  const handleToggleSelectAll = () => {
    if (isAllVisibleSelected) {
      setSelectedRowIds(prev => {
        const copy = new Set(prev);
        results.forEach(r => copy.delete(r.id));
        return copy;
      });
    } else {
      setSelectedRowIds(prev => {
        const copy = new Set(prev);
        results.forEach(r => copy.add(r.id));
        return copy;
      });
    }
  };

  const handleToggleSelectRow = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedRowIds(prev => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  };

  // Export CSV (Full or Selected)
  const handleExportCSV = (onlySelected = false) => {
    const dataset = onlySelected 
      ? results.filter(r => selectedRowIds.has(r.id))
      : results;

    if (!dataset.length) {
      toast.info('No results to export');
      return;
    }
    const headers = activeColumns.map(c => `"${(c.label || c.name).replace(/"/g, '""')}"`);
    const rows = dataset.map(r => 
      activeColumns.map(c => {
        const raw = r[c.name] !== undefined ? r[c.name] : r.data?.[c.name];
        if (raw === undefined || raw === null) return '""';
        if (Array.isArray(raw)) return `"${raw.length} items"`;
        return `"${String(raw).replace(/"/g, '""')}"`;
      })
    );

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(searchDef?.name || 'search_results').toLowerCase().replace(/\s+/g, '_')}${onlySelected ? '_selected' : ''}.csv`;
    a.click();
    toast.success(`Exported ${dataset.length} records`);
  };

  // Bulk Status Update Handler
  const handleBulkUpdateStatus = async () => {
    if (!selectedRowIds.size || !bulkTargetStatus) {
      toast.error('Please select a target status');
      return;
    }
    setIsBulkUpdating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/searches/bulk-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          recordIds: Array.from(selectedRowIds),
          updates: { status: bulkTargetStatus }
        })
      });
      if (!res.ok) throw new Error('Bulk update failed');
      toast.success(`Updated status of ${selectedRowIds.size} records to "${bulkTargetStatus}"`);
      setSelectedRowIds(new Set());
      setIsBulkStatusModalOpen(false);
      setBulkTargetStatus('');
      runSearch(page);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update records');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Record Click: Opens Slide-over Drawer
  const handleRowClick = (record: any) => {
    setSelectedRecord(record);
    if (onRecordClick) {
      onRecordClick(record);
    } else {
      setDrawerRecord(record);
    }
  };

  // Personal Presets handlers
  const handleApplyPreset = (preset: SearchPreset) => {
    setActivePresetId(preset.id);
    setParameters(preset.parameters || {});
    if (preset.keyword !== undefined) setKeyword(preset.keyword);
    toast.success(`Loaded preset "${preset.name}"`);
  };

  const handleSaveCurrentPreset = () => {
    if (!newPresetName.trim()) {
      toast.error('Please enter a preset name');
      return;
    }
    const newPreset: SearchPreset = {
      id: `preset_${Date.now()}`,
      name: newPresetName.trim(),
      parameters: { ...parameters },
      keyword
    };
    setPresets(prev => [...prev, newPreset]);
    setActivePresetId(newPreset.id);
    setNewPresetName('');
    setIsSavingPreset(false);
    toast.success(`Preset "${newPreset.name}" saved`);
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPresets(prev => prev.filter(p => p.id !== id));
    if (activePresetId === id) setActivePresetId(null);
    toast.info('Preset removed');
  };

  // Available workflow statuses across scoped modules
  const availableStatuses = useMemo(() => {
    return extractWorkflowStatusesFromModules(modules || [], searchDef?.targetModuleIds || []);
  }, [modules, searchDef?.targetModuleIds]);

  // Analytics KPI aggregates
  const kpiMetrics = useMemo(() => {
    const numericSums: Record<string, { label: string; sum: number; isCurrency: boolean }> = {};
    
    activeColumns.forEach(col => {
      if (col.type === 'currency' || col.type === 'number') {
        numericSums[col.name] = {
          label: col.label || col.name,
          sum: 0,
          isCurrency: col.type === 'currency'
        };
      }
    });

    const moduleCounts: Record<string, number> = {};
    results.forEach(row => {
      const mod = row.module_name || 'Other';
      moduleCounts[mod] = (moduleCounts[mod] || 0) + 1;

      Object.keys(numericSums).forEach(colName => {
        const raw = row[colName] !== undefined ? row[colName] : row.data?.[colName];
        const parsed = parseFloat(String(raw).replace(/[^0-9.-]+/g, ''));
        if (!isNaN(parsed)) {
          numericSums[colName].sum += parsed;
        }
      });
    });

    return {
      moduleCounts,
      numericSums
    };
  }, [results, activeColumns]);

  if (loadingDef) {
    return (
      <div className="flex items-center justify-center p-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
        <Loader2 size={24} className="animate-spin text-indigo-600" />
        <span className="ml-3 text-xs text-zinc-500 font-medium">Loading search view...</span>
      </div>
    );
  }

  const effectiveSearchDef = searchDef || {
    id: 'generic-search',
    tenantId,
    name: title || 'Universal Search',
    slug: 'universal-search',
    isSearchEnabled: true,
    scopeType: 'MULTI_MODULE',
    targetModuleIds: [],
    sql: '',
    parameters: [],
    columnsConfig: [],
    searchConfig: {
      defaultLayout: 'table',
      pageSize: 25,
      allowExport: true,
      allowPersonalPresets: true,
      enableInstantSearch: true,
      exposedControls: []
    },
    status: 'PUBLISHED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as SavedSearchEntity;

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Dynamic Column Cell Value Renderer
  const renderCellValue = (col: QueryColumnConfig, row: any) => {
    const val = row[col.name] !== undefined ? row[col.name] : row.data?.[col.name];

    if (col.name === 'title' || col.type === 'link') {
      return (
        <div>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400">
            {String(val ?? row.id)}
          </span>
          <div className="text-[10px] text-zinc-400 font-mono">
            {row.id.substring(0, 10)}...
          </div>
        </div>
      );
    }

    if (col.type === 'badge' || col.name === 'status' || col.name === 'module_name') {
      return (
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold",
          col.name === 'status'
            ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40"
            : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40"
        )}>
          {String(val ?? '—')}
        </span>
      );
    }

    if (col.type === 'avatar' || col.name === 'assignee_name') {
      return (
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-300 shrink-0">
            {String(val || 'U').charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate">
            {String(val || 'Unassigned')}
          </span>
        </div>
      );
    }

    if (col.type === 'date' || col.name === 'created_at' || col.name === 'updated_at') {
      return (
        <span className="text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
          {val ? new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
        </span>
      );
    }

    if (col.type === 'currency') {
      const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
      return (
        <span className="font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
          {!isNaN(num) ? `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : (val ?? '—')}
        </span>
      );
    }

    if (col.type === 'number' || col.name === 'files') {
      const num = parseFloat(String(val));
      return (
        <span className="font-mono text-zinc-600 dark:text-zinc-400">
          {!isNaN(num) ? num.toLocaleString() : (val ?? '—')}
        </span>
      );
    }

    if (col.type === 'boolean') {
      const isTrue = val === true || val === 'true' || val === 1 || val === '1';
      return (
        <span className={cn(
          "inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold",
          isTrue ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        )}>
          {isTrue ? 'Yes' : 'No'}
        </span>
      );
    }

    return (
      <span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[200px] block">
        {val !== undefined && val !== null ? String(val) : '—'}
      </span>
    );
  };

  return (
    <div className={cn("flex flex-col h-full space-y-4 font-sans", className)}>
      {/* Top Search Controls Bar */}
      {displayMode !== 'results_only' && (
        <div className="space-y-3">
          {/* Header Title & Presentation Layout Switcher */}
          {title && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{title}</h3>
                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold px-2 py-0.5 rounded-full">
                  {totalCount} records
                </span>
              </div>

              {/* View Layout Toggles & Export */}
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('table')}
                  className={cn("p-1.5 rounded-lg transition-all", viewMode === 'table' ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-xs" : "text-zinc-400")}
                  title="Table View"
                >
                  <TableIcon size={14} />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={cn("p-1.5 rounded-lg transition-all", viewMode === 'cards' ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-xs" : "text-zinc-400")}
                  title="Card View"
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={cn("p-1.5 rounded-lg transition-all", viewMode === 'split' ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-xs" : "text-zinc-400")}
                  title="Split Preview"
                >
                  <Columns size={14} />
                </button>

                {allowExport && (
                  <>
                    <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />
                    <button
                      onClick={() => handleExportCSV(false)}
                      disabled={!results.length}
                      className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg transition-colors"
                      title="Export to CSV"
                    >
                      <Download size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Personal Presets Tab Bar */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar pb-1">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setActivePresetId(null);
                  handleResetFilters();
                }}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-xl border transition-all shrink-0 flex items-center gap-1.5",
                  activePresetId === null
                    ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                )}
              >
                <span>All Records</span>
              </button>

              {presets.map(preset => (
                <div
                  key={preset.id}
                  onClick={() => handleApplyPreset(preset)}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-xl border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer group",
                    activePresetId === preset.id
                      ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300"
                  )}
                >
                  <Bookmark size={11} className={activePresetId === preset.id ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400"} />
                  <span>{preset.name}</span>
                  <button
                    type="button"
                    onClick={(e) => handleDeletePreset(preset.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-500 transition-opacity ml-0.5"
                    title="Delete preset"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}

              {isSavingPreset ? (
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="Preset name..."
                    autoFocus
                    className="px-2 py-1 text-xs bg-white dark:bg-zinc-900 border border-indigo-500 rounded-lg focus:outline-none text-zinc-900 dark:text-zinc-100"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveCurrentPreset();
                      if (e.key === 'Escape') setIsSavingPreset(false);
                    }}
                  />
                  <button
                    onClick={handleSaveCurrentPreset}
                    className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg"
                    title="Save"
                  >
                    <Check size={13} />
                  </button>
                  <button
                    onClick={() => setIsSavingPreset(false)}
                    className="p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                    title="Cancel"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSavingPreset(true)}
                  className="px-2.5 py-1 text-[11px] font-medium text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl transition-colors shrink-0 flex items-center gap-1 border border-dashed border-zinc-200 dark:border-zinc-800"
                  title="Save current filters as a personal preset"
                >
                  <Plus size={11} />
                  <span>Save Preset</span>
                </button>
              )}
            </div>

            <button
              onClick={() => runSearch(page)}
              disabled={isSearching}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg transition-colors shrink-0"
              title="Refresh results"
            >
              <RefreshCw size={13} className={isSearching ? "animate-spin text-indigo-600" : ""} />
            </button>
          </div>

          {/* Interactive Filter Bar */}
          <SearchFilterBar
            searchDef={effectiveSearchDef}
            activeParameters={parameters}
            keyword={keyword}
            onKeywordChange={setKeyword}
            onParameterChange={handleParameterChange}
            onResetFilters={handleResetFilters}
            onExecuteSearch={() => runSearch(1)}
            isSearching={isSearching}
            lockedParameters={effectiveLockedParams}
          />

          {/* KPI & Summary Bar */}
          {showKpis && results.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
              <div className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-xs">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Matches</div>
                <div className="text-base font-bold text-zinc-900 dark:text-white mt-0.5">{totalCount.toLocaleString()}</div>
              </div>

              {/* Dynamic Currency / Numeric Total */}
              {Object.entries(kpiMetrics.numericSums).slice(0, 2).map(([key, metric]) => (
                <div key={key} className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-xs">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider truncate">Sum: {metric.label}</div>
                  <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                    {metric.isCurrency 
                      ? `$${metric.sum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : metric.sum.toLocaleString()}
                  </div>
                </div>
              ))}

              {/* Module distribution pills */}
              <div className="col-span-2 p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl shadow-xs flex items-center justify-between">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Federated Sources</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {Object.entries(kpiMetrics.moduleCounts).map(([mod, count]) => (
                    <span key={mod} className="text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md text-zinc-700 dark:text-zinc-300">
                      {mod}: <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">{count}</strong>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results View Container */}
      {displayMode !== 'search_bar_only' && (
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs relative">
          {searchError && (
            <div className="p-3 mx-4 my-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
              {searchError}
            </div>
          )}

          {/* Main Results Split Screen */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Table / Card List */}
            <div className={cn("flex-1 overflow-y-auto custom-scrollbar", viewMode === 'split' && selectedRecord ? "w-1/2 border-r border-zinc-200 dark:border-zinc-800" : "w-full")}>
              {isSearching ? (
                <div className="flex flex-col items-center justify-center p-16 space-y-3">
                  <Loader2 size={24} className="animate-spin text-indigo-600" />
                  <p className="text-xs text-zinc-500 font-medium">Filtering records across custom modules...</p>
                </div>
              ) : results.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 space-y-3 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                    <Search size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">No Matching Records</h4>
                  <p className="text-xs text-zinc-400 max-w-sm">
                    No files or records matched your active search criteria. Try adjusting your status, date range, or assignee filters.
                  </p>
                </div>
              ) : viewMode === 'cards' ? (
                /* Card Layout: Dynamically bound to active result columns */
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {results.map(r => {
                    const isSelected = selectedRowIds.has(r.id);
                    return (
                      <div
                        key={r.id}
                        onClick={() => handleRowClick(r)}
                        className={cn(
                          "p-4 rounded-2xl border cursor-pointer transition-all space-y-3 relative group",
                          isSelected
                            ? "bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-xs"
                            : "bg-zinc-50/60 dark:bg-zinc-950/40 border-zinc-200/80 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-800"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => handleToggleSelectRow(r.id, e)}
                              className="text-zinc-400 hover:text-indigo-600 transition-colors"
                            >
                              {isSelected ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                            </button>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                              {r.module_name}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                            {r.status}
                          </span>
                        </div>

                        <div>
                          <h5 className="text-xs font-bold text-zinc-900 dark:text-white line-clamp-1">{r.title}</h5>
                          <p className="text-[10px] text-zinc-400 mt-0.5">ID: {r.id}</p>
                        </div>

                        {/* Top 3 Result Columns Display */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-xs">
                          {activeColumns
                            .filter(col => !['title', 'module_name', 'status', 'id'].includes(col.name))
                            .slice(0, 4)
                            .map(col => (
                              <div key={col.name} className="truncate">
                                <span className="text-[9px] text-zinc-400 uppercase font-semibold block">{col.label || col.name}</span>
                                <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate mt-0.5">
                                  {renderCellValue(col, r)}
                                </div>
                              </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                          <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold group-hover:underline">
                            Inspect details <ExternalLink size={11} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Table Layout with Click-to-Sort & Row Selection */
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/90 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
                      {/* Select All Checkbox */}
                      <th className="px-3 py-3 w-8 text-center">
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          className="text-zinc-400 hover:text-indigo-600 transition-colors"
                          title={isAllVisibleSelected ? "Deselect All" : "Select All"}
                        >
                          {isAllVisibleSelected ? (
                            <CheckSquare size={15} className="text-indigo-600" />
                          ) : selectedRowIds.size > 0 ? (
                            <MinusSquare size={15} className="text-indigo-600" />
                          ) : (
                            <Square size={15} />
                          )}
                        </button>
                      </th>

                      {activeColumns.map(col => {
                        const isSorted = sortKey === col.name;
                        return (
                          <th 
                            key={col.name} 
                            onClick={() => handleSortColumn(col.name)}
                            className="px-4 py-3 whitespace-nowrap cursor-pointer hover:bg-zinc-100/60 dark:hover:bg-zinc-850/60 transition-colors select-none group"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>{col.label || col.name}</span>
                              {isSorted ? (
                                sortDirection === 'asc' ? (
                                  <ArrowUp size={12} className="text-indigo-600 dark:text-indigo-400" />
                                ) : (
                                  <ArrowDown size={12} className="text-indigo-600 dark:text-indigo-400" />
                                )
                              ) : (
                                <ArrowUpDown size={11} className="text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                              )}
                            </div>
                          </th>
                        );
                      })}
                      <th className="px-4 py-3 text-right whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                    {results.map((row) => {
                      const isSelected = selectedRowIds.has(row.id);
                      return (
                        <tr
                          key={row.id}
                          onClick={() => handleRowClick(row)}
                          className={cn(
                            "hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors",
                            isSelected && "bg-indigo-50/50 dark:bg-indigo-950/30",
                            selectedRecord?.id === row.id && !isSelected && "bg-zinc-100/60 dark:bg-zinc-800/60"
                          )}
                        >
                          <td className="px-3 py-3 w-8 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => handleToggleSelectRow(row.id, e)}
                              className="text-zinc-400 hover:text-indigo-600 transition-colors"
                            >
                              {isSelected ? <CheckSquare size={15} className="text-indigo-600" /> : <Square size={15} />}
                            </button>
                          </td>

                          {activeColumns.map(col => (
                            <td key={col.name} className="px-4 py-3">
                              {renderCellValue(col, row)}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleRowClick(row)}
                              className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
                              title="Inspect Record"
                            >
                              <ExternalLink size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Split View Detail Panel */}
            {viewMode === 'split' && selectedRecord && (
              <div className="w-1/2 p-5 bg-zinc-50/50 dark:bg-zinc-950/50 overflow-y-auto custom-scrollbar space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      {selectedRecord.module_name} Record
                    </span>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">{selectedRecord.title}</h4>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate(`/workspace/modules/${selectedRecord.module_id}/records/${selectedRecord.id}`)}
                    className="gap-1.5 text-xs"
                  >
                    <span>Full View</span>
                    <ExternalLink size={12} />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">Status</span>
                    <p className="font-semibold text-zinc-900 dark:text-white mt-1">{selectedRecord.status}</p>
                  </div>
                  <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">Assignee</span>
                    <p className="font-semibold text-zinc-900 dark:text-white mt-1">{selectedRecord.assignee_name}</p>
                  </div>
                </div>

                {/* Custom Fields in Data */}
                {selectedRecord.data && typeof selectedRecord.data === 'object' && (
                  <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
                    <h6 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Record Attributes</h6>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(selectedRecord.data)
                        .filter(([k]) => !['title', 'name', 'assigneeId'].includes(k))
                        .map(([k, v]) => (
                          <div key={k} className="p-2 bg-zinc-50 dark:bg-zinc-950 rounded-lg">
                            <span className="text-[10px] text-zinc-400 font-mono capitalize">{k.replace(/_/g, ' ')}</span>
                            <p className="text-zinc-800 dark:text-zinc-200 font-medium truncate mt-0.5">{String(v ?? '—')}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Floating Sticky Bulk Actions Bar */}
          <AnimatePresence>
            {selectedRowIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 bg-zinc-900/95 dark:bg-zinc-850/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-xl border border-zinc-700/80 flex items-center gap-3"
              >
                <div className="text-xs font-semibold">
                  <span className="text-indigo-400 font-bold">{selectedRowIds.size}</span> records selected
                </div>

                <div className="w-[1px] h-4 bg-zinc-700" />

                <button
                  onClick={() => handleExportCSV(true)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  <Download size={12} />
                  <span>Export Selected</span>
                </button>

                <button
                  onClick={() => setIsBulkStatusModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <Sparkles size={12} />
                  <span>Update Status</span>
                </button>

                <button
                  onClick={() => setSelectedRowIds(new Set())}
                  className="p-1 text-zinc-400 hover:text-white rounded-md transition-colors"
                  title="Clear Selection"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Pagination Bar */}
          <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950/80 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 shrink-0">
            <span className="text-[11px]">
              Showing <span className="font-semibold text-zinc-900 dark:text-white">{results.length}</span> of <span className="font-semibold text-zinc-900 dark:text-white">{totalCount}</span> records
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => runSearch(page - 1)}
                disabled={page <= 1 || isSearching}
                className="p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-white disabled:opacity-40"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-[11px] font-medium px-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => runSearch(page + 1)}
                disabled={page >= totalPages || isSearching}
                className="p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-white disabled:opacity-40"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Record Inspection Drawer (Portal) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {drawerRecord && (
            <div className="fixed inset-0 z-[10000] flex justify-end">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDrawerRecord(null)}
                className="fixed inset-0 bg-black/40 backdrop-blur-xs"
              />

              {/* Drawer Container */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                className="relative w-full max-w-3xl h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col z-10 overflow-hidden"
              >
                {/* Drawer Top Header */}
                <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-950/80 shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 uppercase">
                      {drawerRecord.module_name}
                    </span>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate max-w-md">
                      {drawerRecord.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/workspace/modules/${drawerRecord.module_id}/records/${drawerRecord.id}`)}
                      className="gap-1.5 text-xs"
                      title="Open full page"
                    >
                      <span>Full Page</span>
                      <Maximize2 size={12} />
                    </Button>
                    <button
                      type="button"
                      onClick={() => setDrawerRecord(null)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Close drawer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Drawer Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <RecordDetailView
                    key={`search_drawer_${drawerRecord.id}`}
                    isModal={true}
                    recordIdProp={drawerRecord.id}
                    moduleIdProp={drawerRecord.module_id}
                    onClose={() => setDrawerRecord(null)}
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Bulk Status Update Modal */}
      {typeof document !== 'undefined' && isBulkStatusModalOpen && createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setIsBulkStatusModalOpen(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-4 z-10">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Bulk Update Status
            </h3>
            <p className="text-xs text-zinc-500">
              Apply a new workflow status across all <strong className="text-indigo-600">{selectedRowIds.size}</strong> selected records.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Target Workflow Status</label>
              <select
                value={bulkTargetStatus}
                onChange={(e) => setBulkTargetStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
              >
                <option value="">Select status...</option>
                {availableStatuses.map(st => (
                  <option key={st.value} value={st.value}>{st.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsBulkStatusModalOpen(false)}
                disabled={isBulkUpdating}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleBulkUpdateStatus}
                disabled={!bulkTargetStatus || isBulkUpdating}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                {isBulkUpdating ? 'Updating...' : `Update ${selectedRowIds.size} Records`}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
