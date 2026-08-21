import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn, Button } from './Primitives';
import { 
  ChevronLeft, ChevronRight, ArrowUpDown, ChevronUp, ChevronDown, 
  Check, Minus, Download, Trash2, UserCheck, Tag, X, Inbox, Search, Filter
} from 'lucide-react';
import { Skeleton } from './Skeleton';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { 
  TableFilterBar, 
  TableFilterState, 
  FilterFieldOption, 
  filterRecordsByTableFilterState 
} from './TableFilterBar';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  sortable?: boolean;
  sortKey?: keyof T;
  filterable?: boolean;
  filterKey?: string;
  className?: string;
  style?: React.CSSProperties;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
}

export interface BulkActionOption {
  label: string;
  value: string;
  color?: string;
}

export interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  pagination?: boolean;
  page?: number;
  onPageChange?: (page: number) => void;
  totalCount?: number;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  headerActions?: React.ReactNode;
  noContainer?: boolean;
  density?: 'compact' | 'standard' | 'spacious';
  
  // Multi-row Selection & Bulk Actions
  enableSelection?: boolean; // Default is true for enterprise utility
  selectedRowIds?: (string | number)[];
  onSelectionChange?: (selectedIds: (string | number)[], selectedItems: T[]) => void;
  bulkActions?: React.ReactNode | ((selectedIds: (string | number)[], selectedItems: T[], clearSelection: () => void) => React.ReactNode);
  onBulkDelete?: (selectedIds: (string | number)[], selectedItems: T[], clearSelection: () => void) => void;
  onBulkAssign?: (selectedIds: (string | number)[], selectedItems: T[], assigneeId: string, clearSelection: () => void) => void;
  onBulkStatusChange?: (selectedIds: (string | number)[], selectedItems: T[], status: string, clearSelection: () => void) => void;
  onExportSelected?: (selectedIds: (string | number)[], selectedItems: T[]) => void;
  assigneeOptions?: { id: string; name: string; avatarUrl?: string; status?: string }[];
  statusOptions?: (string | BulkActionOption)[];
  
  // Toolbar features
  title?: string;
  subtitle?: string;
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  stickyHeader?: boolean;

  // Filter Bar Features
  enableFilters?: boolean;
  filterFields?: FilterFieldOption[];
  filterState?: TableFilterState;
  onFilterChange?: (state: TableFilterState) => void;
  filterScopeId?: string;
  enableSavedViews?: boolean;
  scopeType?: 'MODULE' | 'QUEUE' | 'WORKSPACE';
  scopeId?: string;
  tenantId?: string;
  token?: string;
  currentUserId?: string;
  currentUserName?: string;
}

// Custom Glass Checkbox
const GlassCheckbox: React.FC<{
  checked: boolean;
  indeterminate?: boolean;
  onChange: (e: React.MouseEvent<HTMLButtonElement>) => void;
  ariaLabel?: string;
}> = ({ checked, indeterminate, onChange, ariaLabel }) => {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={ariaLabel || 'Select row'}
      onClick={(e) => {
        e.stopPropagation();
        onChange(e);
      }}
      className={cn(
        "w-4 h-4 rounded-md border flex items-center justify-center transition-all duration-150 cursor-pointer focus:outline-none select-none",
        checked || indeterminate
          ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-500/30 dark:bg-indigo-500 dark:border-indigo-500"
          : "border-zinc-300 dark:border-zinc-700 bg-white/50 dark:bg-zinc-800/50 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-white dark:hover:bg-zinc-800"
      )}
    >
      {checked ? (
        <Check size={11} strokeWidth={3} className="animate-in fade-in zoom-in duration-100" />
      ) : indeterminate ? (
        <Minus size={11} strokeWidth={3} className="animate-in fade-in zoom-in duration-100" />
      ) : null}
    </button>
  );
};

export function Table<T extends { id: string | number }>({
  data = [],
  columns = [],
  loading = false,
  onRowClick,
  emptyMessage = 'No data found',
  emptyIcon,
  pagination = true,
  page: controlledPage,
  onPageChange,
  totalCount,
  pageSize: initialPageSize = 10,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className,
  headerActions,
  noContainer = false,
  density = 'standard',
  
  // Selection
  enableSelection = true,
  selectedRowIds: controlledSelectedIds,
  onSelectionChange,
  bulkActions,
  onBulkDelete,
  onBulkAssign,
  onBulkStatusChange,
  onExportSelected,
  assigneeOptions = [],
  statusOptions = [],
  
  // Filter Bar
  enableFilters = false,
  filterFields,
  filterState: controlledFilterState,
  onFilterChange,
  filterScopeId,
  enableSavedViews = false,
  scopeType,
  scopeId,
  tenantId,
  token,
  currentUserId,
  currentUserName,

  // Toolbar
  title,
  subtitle,
  searchable = false,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  stickyHeader = true
}: TableProps<T>) {
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(initialPageSize);
  const [sortConfig, setSortConfig] = useState<{ key: keyof T; direction: 'asc' | 'desc' } | null>(null);
  const [internalSearch, setInternalSearch] = useState('');
  
  // Filter Bar State
  const [internalFilterState, setInternalFilterState] = useState<TableFilterState>({ matchType: 'and', clauses: [] });
  const [targetFieldToOpen, setTargetFieldToOpen] = useState<string | null>(null);

  // Reset internal filter state when filterScopeId changes (e.g. navigation between modules/queues)
  const prevScopeRef = useRef(filterScopeId);
  useEffect(() => {
    if (filterScopeId !== prevScopeRef.current) {
      prevScopeRef.current = filterScopeId;
      if (!onFilterChange) {
        setInternalFilterState({ matchType: 'and', clauses: [] });
      }
    }
  }, [filterScopeId, onFilterChange]);

  const activeFilterState = controlledFilterState !== undefined ? controlledFilterState : internalFilterState;
  const handleFilterChange = (next: TableFilterState) => {
    if (onFilterChange) {
      onFilterChange(next);
    } else {
      setInternalFilterState(next);
    }
  };

  const computedFilterFields: FilterFieldOption[] = useMemo(() => {
    if (filterFields && filterFields.length > 0) return filterFields;
    return columns
      .filter(col => col.filterable !== false && (col.filterKey || typeof col.accessor === 'string'))
      .map(col => {
        const id = col.filterKey || (typeof col.accessor === 'string' ? col.accessor : col.header);
        return {
          id: String(id),
          label: col.header,
          type: 'text' as const
        };
      });
  }, [filterFields, columns]);

  // Prune any clauses that don't belong to the current fields schema
  useEffect(() => {
    if (controlledFilterState !== undefined || computedFilterFields.length === 0) return;
    setInternalFilterState(prev => {
      const validFieldIds = new Set(computedFilterFields.map(f => f.id));
      const validClauses = prev.clauses.filter(c => validFieldIds.has(c.fieldId));
      if (validClauses.length !== prev.clauses.length) {
        return {
          ...prev,
          clauses: validClauses
        };
      }
      return prev;
    });
  }, [computedFilterFields, controlledFilterState]);

  const isControlledPage = controlledPage !== undefined;
  const currentPage = isControlledPage ? controlledPage : internalPage;
  const setCurrentPage = (p: number | ((prev: number) => number)) => {
    const nextPage = typeof p === 'function' ? p(currentPage) : p;
    if (isControlledPage && onPageChange) {
      onPageChange(nextPage);
    } else {
      setInternalPage(nextPage);
    }
  };

  const isControlledPageSize = onPageSizeChange !== undefined;
  const currentPageSize = isControlledPageSize && initialPageSize ? initialPageSize : internalPageSize;

  const prevInitialPageSizeRef = useRef(initialPageSize);
  useEffect(() => {
    if (initialPageSize !== undefined && initialPageSize !== prevInitialPageSizeRef.current) {
      prevInitialPageSizeRef.current = initialPageSize;
      setInternalPageSize(initialPageSize);
    }
  }, [initialPageSize]);

  const handlePageSizeChange = (newSize: number) => {
    setInternalPageSize(newSize);
    if (isControlledPageSize && onPageSizeChange) {
      onPageSizeChange(newSize);
    }
    setCurrentPage(1);
  };
  
  // Local selection state if not controlled
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string | number>>(new Set());
  const lastSelectedIdxRef = useRef<number | null>(null);

  // Active bulk popover states
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');

  const isControlled = controlledSelectedIds !== undefined;
  const selectedSet = useMemo(() => {
    return isControlled ? new Set(controlledSelectedIds) : internalSelectedIds;
  }, [isControlled, controlledSelectedIds, internalSelectedIds]);

  const activeSearch = searchValue !== undefined ? searchValue : internalSearch;
  const handleSearchChange = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setInternalSearch(val);
    }
  };

  // Reset to page 1 when sort, search, or pageSize changes (if uncontrolled)
  useEffect(() => {
    if (!isControlledPage) {
      setInternalPage(1);
    }
  }, [sortConfig, activeSearch, currentPageSize, isControlledPage, activeFilterState]);

  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return;
    const key = column.sortKey || (typeof column.accessor === 'string' ? column.accessor as keyof T : null);
    if (!key) return;

    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Client-side search if onSearchChange is not passed
  const searchedData = useMemo(() => {
    if (!searchable || onSearchChange || !activeSearch.trim()) return data;
    const s = activeSearch.toLowerCase().trim();
    return data.filter((item: any) => {
      return Object.values(item).some(val => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'object') {
          return Object.values(val).some(nested => nested && String(nested).toLowerCase().includes(s));
        }
        return String(val).toLowerCase().includes(s);
      });
    });
  }, [data, searchable, onSearchChange, activeSearch]);

  // Client-side table filter clauses
  const filteredData = useMemo(() => {
    if (!enableFilters && !controlledFilterState && (!filterFields || filterFields.length === 0) && activeFilterState.clauses.length === 0) {
      return searchedData;
    }
    return filterRecordsByTableFilterState(searchedData, activeFilterState, computedFilterFields, currentUserId);
  }, [searchedData, enableFilters, controlledFilterState, filterFields, activeFilterState, computedFilterFields, currentUserId]);

  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortConfig]);

  const isServerSidePaginated = totalCount !== undefined;
  const totalItems = isServerSidePaginated ? totalCount : sortedData.length;
  const totalPages = Math.ceil(totalItems / currentPageSize) || 1;
  const startIndex = (currentPage - 1) * currentPageSize;
  const endIndex = Math.min(startIndex + (isServerSidePaginated ? data.length : currentPageSize), totalItems);

  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    if (isServerSidePaginated) {
      return sortedData;
    }
    return sortedData.slice(startIndex, startIndex + currentPageSize);
  }, [sortedData, pagination, isServerSidePaginated, startIndex, currentPageSize]);

  // Generate sliding window of pages around currentPage
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  }, [totalPages, currentPage]);

  const normalizedPageSizeOptions = useMemo(() => {
    const opts = pageSizeOptions || [10, 25, 50, 100];
    if (currentPageSize && !opts.includes(currentPageSize)) {
      return [...opts, currentPageSize].sort((a, b) => a - b);
    }
    return opts;
  }, [pageSizeOptions, currentPageSize]);

  // Selection helpers
  const updateSelection = useCallback((newSet: Set<string | number>) => {
    if (!isControlled) {
      setInternalSelectedIds(newSet);
    }
    if (onSelectionChange) {
      const selectedIdsArray = Array.from(newSet);
      const selectedItems = data.filter(item => newSet.has(item.id));
      onSelectionChange(selectedIdsArray, selectedItems);
    }
  }, [isControlled, onSelectionChange, data]);

  const clearSelection = useCallback(() => {
    updateSelection(new Set());
    lastSelectedIdxRef.current = null;
  }, [updateSelection]);

  const toggleRow = (item: T, index: number, shiftKey: boolean) => {
    const newSet = new Set(selectedSet);
    const id = item.id;

    if (shiftKey && lastSelectedIdxRef.current !== null && paginatedData.length > 0) {
      const start = Math.min(lastSelectedIdxRef.current, index);
      const end = Math.max(lastSelectedIdxRef.current, index);
      const shouldSelect = !selectedSet.has(id);

      for (let i = start; i <= end; i++) {
        const rowItem = paginatedData[i];
        if (rowItem) {
          if (shouldSelect) newSet.add(rowItem.id);
          else newSet.delete(rowItem.id);
        }
      }
    } else {
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
    }

    lastSelectedIdxRef.current = index;
    updateSelection(newSet);
  };

  const isPageFullySelected = paginatedData.length > 0 && paginatedData.every(item => selectedSet.has(item.id));
  const isPagePartiallySelected = paginatedData.some(item => selectedSet.has(item.id)) && !isPageFullySelected;

  const toggleSelectAllPage = () => {
    const newSet = new Set(selectedSet);
    if (isPageFullySelected) {
      paginatedData.forEach(item => newSet.delete(item.id));
    } else {
      paginatedData.forEach(item => newSet.add(item.id));
    }
    updateSelection(newSet);
  };

  // Selected items objects for bulk actions
  const selectedItems = useMemo(() => {
    return data.filter(item => selectedSet.has(item.id));
  }, [data, selectedSet]);

  const selectedCount = selectedSet.size;

  // Built-in Default CSV Export
  const handleDefaultExport = () => {
    if (onExportSelected) {
      onExportSelected(Array.from(selectedSet), selectedItems);
      return;
    }
    if (selectedItems.length === 0) return;

    // Generate CSV from columns or keys
    const headers = columns.map(c => c.header).join(',');
    const rows = selectedItems.map(item => {
      return columns.map(col => {
        let val: any = typeof col.accessor === 'function' ? '' : (item as any)[col.accessor];
        if (val === undefined || val === null) {
          val = (item as any).data?.[col.accessor as string] ?? '';
        }
        if (typeof val === 'object') val = JSON.stringify(val);
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${(title || 'records').toLowerCase().replace(/\s+/g, '_')}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${selectedItems.length} selected record(s) to CSV`);
  };

  // Density classes
  const paddingClass = 
    density === 'compact' ? 'px-3.5 py-1.5' : 
    density === 'spacious' ? 'px-6 py-4' : 
    'px-4 py-2';

  const headerTextSize = 'text-[10px]';

  const bodyTextSize = 
    density === 'compact' ? 'text-[11px]' : 
    density === 'spacious' ? 'text-sm' :
    'text-xs';

  const checkboxPaddingClass = 
    density === 'compact' ? 'py-1.5' :
    density === 'spacious' ? 'py-4' :
    'py-2';

  const customPaddingClass = columns.find(col => col.className && (col.className.includes('px-') || col.className.includes('py-')))?.className;
  const actionsPadding = customPaddingClass 
    ? customPaddingClass.split(' ').filter(c => c.startsWith('px-') || c.startsWith('py-') || c.includes('px-') || c.includes('py-')).join(' ') 
    : paddingClass;

  const content = (
    <div className="flex flex-col w-full h-full min-h-0 relative">
      {/* Optional Toolbar */}
      {(title || subtitle || searchable || headerActions) && (
        <div className="p-4 border-b border-zinc-200/50 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/40 dark:bg-zinc-900/20 shrink-0">
          <div className="flex items-center gap-2.5">
            {title && (
              <div>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
                  {title}
                  {totalItems > 0 ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 lowercase">
                      {totalItems} records
                    </span>
                  ) : loading ? (
                    <Skeleton variant="rounded" className="w-14 h-3.5 rounded" />
                  ) : null}
                </h3>
                {subtitle && (
                  <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">{subtitle}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {searchable && (
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={activeSearch}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-indigo-500 transition-all shadow-xs"
                />
              </div>
            )}
            {headerActions}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      {(enableFilters || (filterFields && filterFields.length > 0) || activeFilterState.clauses.length > 0) && (
        <TableFilterBar
          fields={computedFilterFields}
          filterState={activeFilterState}
          onChange={handleFilterChange}
          enableSavedViews={enableSavedViews}
          scopeType={scopeType}
          scopeId={scopeId || filterScopeId}
          tenantId={tenantId}
          token={token}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          targetFieldToOpen={targetFieldToOpen}
          onClearTargetFieldToOpen={() => setTargetFieldToOpen(null)}
          totalFilteredRecords={sortedData.length}
          totalRecords={data.length}
        />
      )}

      {/* Main Table Scroll Container */}
      <div className="overflow-auto custom-scrollbar flex-1 min-h-0 relative">
        <table className={cn("w-full text-left border-separate border-spacing-0", bodyTextSize)}>
          <thead className={cn(
            "bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500",
            stickyHeader && "sticky top-0 z-20",
            headerTextSize
          )}>
            <tr>
              {/* Checkbox Column */}
              {enableSelection && (
                <th className={cn("w-12 py-2 text-center transition-colors relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-zinc-200/50 dark:after:bg-zinc-800/50 after:pointer-events-none", noContainer ? "pl-6 pr-2" : "px-3", stickyHeader && "sticky top-0")}>
                  <div className="flex items-center justify-center">
                    <GlassCheckbox
                      checked={isPageFullySelected}
                      indeterminate={isPagePartiallySelected}
                      onChange={toggleSelectAllPage}
                      ariaLabel="Select all visible rows"
                    />
                  </div>
                </th>
              )}

              {columns.map((col, idx) => {
                const isSortable = col.sortable && (col.sortKey || typeof col.accessor === 'string');
                const sortKey = col.sortKey || (typeof col.accessor === 'string' ? col.accessor as keyof T : null);
                const isSorted = sortConfig?.key === sortKey;
                const hasCustomPadding = col.className && (col.className.includes('px-') || col.className.includes('py-'));
                const isFirstCol = idx === 0 && !enableSelection;
                const isLastCol = idx === columns.length - 1 && !headerActions;
                const headerCustomClass = col.className 
                  ? col.className.split(' ').filter(c => !c.startsWith('text-') && !c.startsWith('leading-') && !c.startsWith('font-')).join(' ') 
                  : '';

                const colFilterKey = col.filterKey || (typeof col.accessor === 'string' ? String(col.accessor) : null);
                const matchingFilterField = colFilterKey ? computedFilterFields.find(f => f.id === colFilterKey || f.label.toLowerCase() === col.header.toLowerCase()) : null;
                const isFilterActiveOnCol = matchingFilterField ? activeFilterState.clauses.some(c => c.fieldId === matchingFilterField.id) : false;

                return (
                  <th 
                    key={idx} 
                    className={cn(
                      !hasCustomPadding && paddingClass,
                      isFirstCol && noContainer && !hasCustomPadding && "pl-6",
                      isLastCol && noContainer && !hasCustomPadding && "pr-6",
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                      'transition-colors text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 select-none group relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-zinc-200/50 dark:after:bg-zinc-800/50 after:pointer-events-none',
                      isSortable && 'cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-200',
                      headerCustomClass
                    )}
                    style={{ width: col.width, ...col.style }}
                    onClick={() => isSortable && handleSort(col)}
                  >
                    <div className={cn(
                      "flex items-center gap-1.5",
                      col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'
                    )}>
                      <span>{col.header}</span>
                      
                      {/* Sort Icon */}
                      {isSortable && (
                        <div className="flex items-center opacity-40 group-hover:opacity-100 transition-opacity">
                          {isSorted ? (
                            sortConfig.direction === 'asc' ? (
                              <ChevronUp size={11} className="text-indigo-500 opacity-100" />
                            ) : (
                              <ChevronDown size={11} className="text-indigo-500 opacity-100" />
                            )
                          ) : (
                            <ArrowUpDown size={10} className="text-zinc-400" />
                          )}
                        </div>
                      )}

                      {/* Column Filter Icon Button */}
                      {matchingFilterField && col.filterable !== false && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTargetFieldToOpen(matchingFilterField.id);
                          }}
                          className={cn(
                            "p-0.5 rounded transition-all",
                            isFilterActiveOnCol 
                              ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 opacity-100" 
                              : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 opacity-0 group-hover:opacity-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800"
                          )}
                          title={`Filter by ${col.header}`}
                        >
                          <Filter size={10} className={isFilterActiveOnCol ? "fill-indigo-600 dark:fill-indigo-400" : ""} />
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}

              {headerActions && !title && (
                <th className={cn(actionsPadding, "text-right relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-zinc-200/50 dark:after:bg-zinc-800/50 after:pointer-events-none")}>
                  {headerActions}
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: currentPageSize }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {enableSelection && (
                    <td className={cn("w-12 text-center border-b border-zinc-200/50 dark:border-zinc-800/50", checkboxPaddingClass, noContainer ? "pl-6 pr-2" : "px-3")}>
                      <Skeleton variant="rounded" className="w-4 h-4 rounded-md mx-auto" />
                    </td>
                  )}
                  {columns.map((col, j) => {
                    const hasCustomPadding = col.className && (col.className.includes('px-') || col.className.includes('py-'));
                    const isFirstCol = j === 0 && !enableSelection;
                    const isLastCol = j === columns.length - 1 && !headerActions;
                    const colKey = String(col.filterKey || col.sortKey || col.accessor || col.header || '').toLowerCase();
                    
                    const isStatus = colKey.includes('status') || colKey.includes('state') || colKey.includes('priority') || colKey.includes('stage') || colKey.includes('phase') || colKey.includes('badge');
                    const isUser = colKey.includes('assignee') || colKey.includes('user') || colKey.includes('owner') || colKey.includes('member') || colKey.includes('author') || colKey.includes('assigned');
                    const isId = colKey.includes('id') || colKey.includes('sku') || colKey.includes('code') || colKey.includes('ref') || colKey === '#' || colKey.includes('ticket');
                    const isDate = colKey.includes('date') || colKey.includes('created') || colKey.includes('updated') || colKey.includes('due') || colKey.includes('time') || colKey.includes('timestamp');
                    const isAction = colKey.includes('action') || colKey.includes('menu') || colKey.includes('more');
                    const widths = ['w-3/4', 'w-1/2', 'w-2/3', 'w-4/5', 'w-3/5'];
                    const chosenWidth = col.width ? 'w-full' : widths[(i + j) % widths.length];

                    return (
                      <td 
                        key={j} 
                        className={cn(
                          !hasCustomPadding && paddingClass,
                          isFirstCol && noContainer && !hasCustomPadding && "pl-6",
                          isLastCol && noContainer && !hasCustomPadding && "pr-6",
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                          "border-b border-zinc-200/50 dark:border-zinc-800/50",
                          col.className
                        )}
                      >
                        <div className={cn(
                          "flex items-center",
                          col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'
                        )}>
                          {isStatus ? (
                            <Skeleton variant="rounded" className="h-5 w-16 sm:w-20 rounded-full" />
                          ) : isUser ? (
                            <div className="flex items-center gap-2">
                              <Skeleton variant="circular" className="w-5 h-5 shrink-0" />
                              <Skeleton variant="text" className="w-20 h-3 hidden sm:block" />
                            </div>
                          ) : isId ? (
                            <Skeleton variant="text" className="w-12 h-3 font-mono" />
                          ) : isDate ? (
                            <Skeleton variant="text" className="w-20 sm:w-24 h-3" />
                          ) : isAction ? (
                            <Skeleton variant="rounded" className="w-7 h-7 rounded-lg" />
                          ) : (
                            <Skeleton variant="text" className={cn(chosenWidth, "h-3 opacity-60")} />
                          )}
                        </div>
                      </td>
                    );
                  })}
                  {headerActions && !title && <td className={cn(actionsPadding, "border-b border-zinc-200/50 dark:border-zinc-800/50")} />}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length + (enableSelection ? 1 : 0) + (headerActions && !title ? 1 : 0)} 
                  className="py-16 text-center"
                >
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                      {emptyIcon || <Inbox size={24} />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{emptyMessage}</p>
                      {activeSearch && (
                        <p className="text-xs text-zinc-400 mt-0.5">Try adjusting your search query</p>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((item, rowIdx) => {
                const rowId = item.id;
                const isSelected = selectedSet.has(rowId);

                return (
                  <tr 
                    key={String(rowId)} 
                    onClick={() => onRowClick?.(item)}
                    className={cn(
                      'group transition-colors duration-100',
                      isSelected
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/30'
                        : 'hover:bg-zinc-50/80 dark:hover:bg-white/[0.02]',
                      onRowClick && 'cursor-pointer'
                    )}
                  >
                    {/* Checkbox Cell */}
                    {enableSelection && (
                      <td 
                        className={cn("w-12 text-center align-middle border-b border-zinc-200/50 dark:border-zinc-800/50", checkboxPaddingClass, noContainer ? "pl-6 pr-2" : "px-3")}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center">
                          <GlassCheckbox
                            checked={isSelected}
                            onChange={(e) => toggleRow(item, rowIdx, e.shiftKey)}
                          />
                        </div>
                      </td>
                    )}

                    {columns.map((col, idx) => {
                      const hasCustomPadding = col.className && (col.className.includes('px-') || col.className.includes('py-'));
                      const isFirstCol = idx === 0 && !enableSelection;
                      const isLastCol = idx === columns.length - 1 && !headerActions;
                      return (
                        <td 
                          key={idx} 
                          className={cn(
                            !hasCustomPadding && paddingClass,
                            isFirstCol && noContainer && !hasCustomPadding && "pl-6",
                            isLastCol && noContainer && !hasCustomPadding && "pr-6",
                            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                            'text-zinc-700 dark:text-zinc-300 align-middle border-b border-zinc-200/50 dark:border-zinc-800/50', 
                            col.className
                          )} 
                          style={{ width: col.width, ...col.style }}
                        >
                          {typeof col.accessor === 'function'
                            ? col.accessor(item)
                            : (item[col.accessor] as React.ReactNode)}
                        </td>
                      );
                    })}

                    {headerActions && !title && <td className={cn(actionsPadding, "border-b border-zinc-200/50 dark:border-zinc-800/50")} />}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Floating Glass Bulk Action Bar */}
      <AnimatePresence>
        {enableSelection && selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="sticky bottom-4 left-0 right-0 z-30 mx-auto w-fit max-w-[95%] sm:max-w-xl"
          >
            <div className="flex items-center gap-2 p-1.5 px-3 rounded-xl bg-zinc-950/95 dark:bg-zinc-900/95 text-zinc-200 backdrop-blur-xl border border-zinc-800 shadow-2xl shadow-black/60">
              
              {/* Selected Count & Dismiss */}
              <div className="flex items-center gap-1.5 pr-2.5 border-r border-zinc-800">
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-md bg-zinc-800 text-zinc-200 text-[11px] font-semibold">
                  {selectedCount}
                </span>
                <span className="text-xs font-medium text-zinc-300 hidden sm:inline">Selected</span>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="p-1 text-zinc-400 hover:text-zinc-200 rounded-md hover:bg-zinc-800 transition-colors"
                  title="Deselect all"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Bulk Action Buttons */}
              <div className="flex items-center gap-1">
                {/* Bulk Assign */}
                {onBulkAssign && assigneeOptions.length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAssignMenu(!showAssignMenu);
                        setShowStatusMenu(false);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors"
                    >
                      <UserCheck size={13} className="text-zinc-400" />
                      <span>Assign</span>
                    </button>

                    {showAssignMenu && (
                      <div className="absolute bottom-full mb-2 left-0 w-56 p-1.5 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50">
                        <input
                          type="text"
                          placeholder="Search member..."
                          value={assignSearch}
                          onChange={(e) => setAssignSearch(e.target.value)}
                          className="w-full px-2.5 py-1.5 mb-1 text-xs bg-zinc-800/80 border border-zinc-700/60 rounded-lg text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-500"
                        />
                        <div className="max-h-40 overflow-y-auto custom-scrollbar">
                          {assigneeOptions
                            .filter(m => m.name.toLowerCase().includes(assignSearch.toLowerCase()))
                            .map((member) => (
                              <button
                                key={member.id}
                                type="button"
                                onClick={() => {
                                  onBulkAssign(Array.from(selectedSet), selectedItems, member.id, clearSelection);
                                  setShowAssignMenu(false);
                                }}
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                              >
                                {member.avatarUrl ? (
                                  <img src={member.avatarUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full bg-zinc-700 text-[9px] font-medium text-zinc-300 flex items-center justify-center">
                                    {member.name.charAt(0)}
                                  </div>
                                )}
                                <span className="truncate">{member.name}</span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Bulk Status */}
                {onBulkStatusChange && statusOptions.length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setShowStatusMenu(!showStatusMenu);
                        setShowAssignMenu(false);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors"
                    >
                      <Tag size={13} className="text-zinc-400" />
                      <span>Status</span>
                    </button>

                    {showStatusMenu && (
                      <div className="absolute bottom-full mb-2 left-0 w-44 p-1.5 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50">
                        {statusOptions.map((opt, i) => {
                          const label = typeof opt === 'string' ? opt : opt.label;
                          const value = typeof opt === 'string' ? opt : opt.value;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                onBulkStatusChange(Array.from(selectedSet), selectedItems, value, clearSelection);
                                setShowStatusMenu(false);
                              }}
                              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                              <span className="truncate">{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* CSV Export */}
                <button
                  type="button"
                  onClick={handleDefaultExport}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors"
                  title="Export selected as CSV"
                >
                  <Download size={13} className="text-zinc-400" />
                  <span className="hidden sm:inline">Export</span>
                </button>

                {/* Custom Action Slot */}
                {typeof bulkActions === 'function' 
                  ? bulkActions(Array.from(selectedSet), selectedItems, clearSelection)
                  : bulkActions}

                {/* Bulk Delete */}
                {onBulkDelete && (
                  <button
                    type="button"
                    onClick={() => setShowBulkDeleteModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-0.5 cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination & Footer Bar */}
      {pagination && (
        totalItems > 0 ? (
          <div className="h-12 flex flex-col sm:flex-row items-center justify-between border-t border-zinc-200 dark:border-zinc-800 px-6 gap-3 bg-white/30 dark:bg-zinc-900/30 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                Showing <span className="text-zinc-900 dark:text-zinc-100">{startIndex + 1}</span> to <span className="text-zinc-900 dark:text-zinc-100">{endIndex}</span> of <span className="text-zinc-900 dark:text-zinc-100">{totalItems}</span> records
              </div>

              {/* Page Size Selector */}
              {normalizedPageSizeOptions.length > 1 && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Per page:</span>
                  <select
                    value={currentPageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="bg-white/80 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 rounded-lg px-2 py-0.5 text-xs text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
                  >
                    {normalizedPageSizeOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button 
                variant="secondary" 
                size="sm" 
                className="h-7 w-7 p-0 rounded-lg bg-white dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100"
                disabled={currentPage === 1}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPage(prev => Math.max(1, prev - 1));
                }}
              >
                <ChevronLeft size={14} />
              </Button>
              
              <div className="flex items-center gap-1 mx-1.5">
                {pageNumbers.map((p, idx) => {
                  if (typeof p === 'string') {
                    return <span key={`ellipsis-${idx}`} className="text-zinc-400 px-1 text-xs select-none">...</span>;
                  }
                  const pageNum = p as number;
                  return (
                    <button
                      key={pageNum}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentPage(pageNum);
                      }}
                      className={cn(
                        'h-7 min-w-[28px] px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                        currentPage === pageNum 
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30' 
                          : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5'
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <Button 
                variant="secondary" 
                size="sm" 
                className="h-7 w-7 p-0 rounded-lg bg-white dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100"
                disabled={currentPage === totalPages}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentPage(prev => Math.min(totalPages, prev + 1));
                }}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        ) : loading ? (
          <div className="h-12 flex flex-col sm:flex-row items-center justify-between border-t border-zinc-200/50 dark:border-zinc-800/50 px-6 gap-3 bg-white/30 dark:bg-zinc-900/30 backdrop-blur-md shrink-0 animate-pulse">
            <div className="flex items-center gap-3">
              <Skeleton variant="text" className="w-36 h-3" />
              <Skeleton variant="rounded" className="w-16 h-6 rounded-lg hidden sm:block" />
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton variant="rounded" className="w-7 h-7 rounded-lg" />
              <Skeleton variant="rounded" className="w-7 h-7 rounded-lg" />
              <Skeleton variant="rounded" className="w-7 h-7 rounded-lg" />
              <Skeleton variant="rounded" className="w-7 h-7 rounded-lg" />
            </div>
          </div>
        ) : null
      )}

      {/* Premium Aurora Bulk Delete Confirmation Dialog */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showBulkDeleteModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowBulkDeleteModal(false)}
                className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-[440px] max-w-[95vw] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl p-10 space-y-8"
              >
                <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-500 mx-auto">
                  <Trash2 size={32} />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                    Move {selectedSet.size} {selectedSet.size === 1 ? 'record' : 'records'} to Recycling Bin?
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                    Are you sure you want to delete {selectedSet.size} selected {selectedSet.size === 1 ? 'entry' : 'entries'}? These will be moved to the Recycling Bin and can be restored at any time.
                  </p>
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setShowBulkDeleteModal(false)}
                    className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl font-bold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      if (onBulkDelete) {
                        onBulkDelete(Array.from(selectedSet), selectedItems, clearSelection);
                      }
                      setShowBulkDeleteModal(false);
                    }}
                    className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition-all shadow-xl shadow-rose-500/20 cursor-pointer"
                  >
                    Move to Recycling Bin
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );

  if (noContainer) return content;

  return (
    <div className={cn(
      "relative w-full h-full flex flex-col min-h-0 overflow-hidden rounded-2xl border border-zinc-200/60 bg-white/60 backdrop-blur-xl shadow-sm dark:border-white/5 dark:bg-zinc-900/35 dark:backdrop-blur-xl",
      className
    )}>
      {content}
    </div>
  );
}

