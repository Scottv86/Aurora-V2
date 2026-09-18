import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, Download, Table as TableIcon, LayoutGrid, Columns,
  ChevronLeft, ChevronRight, FileText, User, ExternalLink,
  Layers, Loader2
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
  onRecordClick
}) => {
  const { tenant } = usePlatform();
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
  const [sortKey] = useState<string>('created_at');
  const [sortDirection] = useState<'asc' | 'desc'>('desc');

  const [results, setResults] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'split'>(
    propLayout || searchDef?.searchConfig?.defaultLayout || 'table'
  );
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

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

  // Auto-run search when parameters or keyword change
  useEffect(() => {
    const timer = setTimeout(() => {
      runSearch(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [parameters, keyword, sortKey, sortDirection]);

  // Parameter Change Handler
  const handleParameterChange = (key: string, value: any) => {
    if (lockedParameters.includes(key)) return;
    setParameters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Reset Filters Handler
  const handleResetFilters = () => {
    const reset: Record<string, any> = {};
    // keep locked parameters
    lockedParameters.forEach(lp => {
      if (presetParameters[lp] !== undefined) reset[lp] = presetParameters[lp];
    });
    setKeyword('');
    setParameters(reset);
  };

  // Export to CSV with dynamic columns
  const handleExportCSV = () => {
    if (!results.length) {
      toast.info('No results to export');
      return;
    }
    const headers = activeColumns.map(c => `"${(c.label || c.name).replace(/"/g, '""')}"`);
    const rows = results.map(r => 
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
    a.download = `${(searchDef?.name || 'search_results').toLowerCase().replace(/\s+/g, '_')}.csv`;
    a.click();
    toast.success(`Exported ${results.length} records`);
  };

  // Handle Record Row Click
  const handleRowClick = (record: any) => {
    setSelectedRecord(record);
    if (onRecordClick) {
      onRecordClick(record);
    } else {
      // Default: navigate or open drawer
      navigate(`/workspace/module/${record.module_id}/record/${record.id}`);
    }
  };

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
          <div className="font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
            {val || row.title || row.id}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono">{row.id}</div>
        </div>
      );
    }

    if (col.name === 'module_name') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold">
          <Layers size={11} className="text-indigo-500" />
          <span>{row.module_name || row.module_id}</span>
        </span>
      );
    }

    if (col.name === 'status' || col.type === 'badge') {
      if (val === undefined || val === null || val === '') return <span className="text-zinc-300 dark:text-zinc-600">—</span>;
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {String(val)}
        </span>
      );
    }

    if (col.name === 'assignee_name' || col.type === 'avatar') {
      const name = val || row.assignee_name || 'Unassigned';
      return (
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold flex items-center justify-center uppercase">
            {String(name).charAt(0)}
          </div>
          <span className="text-zinc-700 dark:text-zinc-300 font-medium truncate">{name}</span>
        </div>
      );
    }

    if (col.name === 'files') {
      const fileCount = Array.isArray(val) ? val.length : (Array.isArray(row.files) ? row.files.length : Number(val) || 0);
      if (fileCount > 0) {
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md">
            <FileText size={11} />
            <span>{fileCount}</span>
          </span>
        );
      }
      return <span className="text-zinc-300 dark:text-zinc-600 text-[10px]">—</span>;
    }

    if (col.type === 'date') {
      if (!val) return <span className="text-zinc-300 dark:text-zinc-600">—</span>;
      const d = new Date(val);
      return <span className="text-zinc-500 text-[11px]">{isNaN(d.getTime()) ? String(val) : d.toLocaleDateString()}</span>;
    }

    if (col.type === 'currency') {
      if (val === undefined || val === null || val === '') return <span className="text-zinc-300 dark:text-zinc-600">—</span>;
      const num = Number(val);
      return <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{isNaN(num) ? String(val) : `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>;
    }

    if (col.type === 'number') {
      if (val === undefined || val === null || val === '') return <span className="text-zinc-300 dark:text-zinc-600">—</span>;
      const num = Number(val);
      return <span className="font-mono text-zinc-700 dark:text-zinc-300">{isNaN(num) ? String(val) : num.toLocaleString()}</span>;
    }

    if (col.type === 'boolean') {
      const isTrue = val === true || val === 'true';
      const isFalse = val === false || val === 'false';
      if (!isTrue && !isFalse) return <span className="text-zinc-300 dark:text-zinc-600">—</span>;
      return (
        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold", isTrue ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800")}>
          {isTrue ? 'Yes' : 'No'}
        </span>
      );
    }

    if (val === undefined || val === null || val === '') {
      return <span className="text-zinc-300 dark:text-zinc-600">—</span>;
    }

    return <span className="text-zinc-800 dark:text-zinc-200 truncate max-w-[200px] inline-block">{String(val)}</span>;
  };

  return (
    <div className={cn("flex flex-col h-full space-y-4", className)}>
      {/* Header & Filter Bar (unless results_only) */}
      {displayMode !== 'results_only' && (
        <div className="space-y-3">
          {title && (
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Search size={16} />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{title}</h3>
                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold px-2 py-0.5 rounded-full">
                  {totalCount} results
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

                <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />

                <button
                  onClick={handleExportCSV}
                  disabled={!results.length}
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg transition-colors"
                  title="Export to CSV"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
          )}

          <SearchFilterBar
            searchDef={effectiveSearchDef}
            activeParameters={parameters}
            keyword={keyword}
            onKeywordChange={setKeyword}
            onParameterChange={handleParameterChange}
            onResetFilters={handleResetFilters}
            onExecuteSearch={() => runSearch(1)}
            isSearching={isSearching}
          />
        </div>
      )}

      {/* Results View Container */}
      {displayMode !== 'search_bar_only' && (
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
          {searchError && (
            <div className="p-3 mx-4 my-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
              {searchError}
            </div>
          )}
          {/* Main Results Split Screen */}
          <div className="flex-1 flex overflow-hidden">
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
                /* Card Layout */
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {results.map(r => (
                    <div
                      key={r.id}
                      onClick={() => handleRowClick(r)}
                      className="p-4 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl hover:border-indigo-300 dark:hover:border-indigo-800 cursor-pointer transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                          {r.module_name}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                          {r.status}
                        </span>
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-zinc-900 dark:text-white line-clamp-1">{r.title}</h5>
                        <p className="text-[10px] text-zinc-400 mt-0.5">ID: {r.id}</p>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                        <div className="flex items-center gap-1.5">
                          <User size={12} className="text-zinc-400" />
                          <span>{r.assignee_name}</span>
                        </div>
                        {Array.isArray(r.files) && r.files.length > 0 && (
                          <div className="flex items-center gap-1 text-indigo-600 font-semibold">
                            <FileText size={12} />
                            <span>{r.files.length} files</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Table Layout */
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/80 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      {activeColumns.map(col => (
                        <th key={col.name} className="px-4 py-3 whitespace-nowrap">
                          {col.label || col.name}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                    {results.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => handleRowClick(row)}
                        className={cn(
                          "hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors",
                          selectedRecord?.id === row.id && "bg-indigo-50/50 dark:bg-indigo-950/30"
                        )}
                      >
                        {activeColumns.map(col => (
                          <td key={col.name} className="px-4 py-3">
                            {renderCellValue(col, row)}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(row);
                            }}
                            className="p-1 text-zinc-400 hover:text-indigo-600 transition-colors"
                            title="Open Record"
                          >
                            <ExternalLink size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
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
                    onClick={() => navigate(`/workspace/module/${selectedRecord.module_id}/record/${selectedRecord.id}`)}
                    className="gap-1.5 text-xs"
                  >
                    <span>Open Detail</span>
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
                    <h6 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Record Fields</h6>
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
    </div>
  );
};
