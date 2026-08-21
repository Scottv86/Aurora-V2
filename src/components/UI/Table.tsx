import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn, Button } from './Primitives';
import { 
  ChevronLeft, ChevronRight, ArrowUpDown, ChevronUp, ChevronDown, 
  Check, Minus, Download, Trash2, UserCheck, Tag, X, Inbox, Search, Filter,
  BarChart3, Table as TableIcon, Edit3, MoreHorizontal,
  Sparkles, Layers
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

// New Sub-components
import { 
  PersonCell, 
  StatusCell, 
  DateCell, 
  CurrencyCell, 
  CalculatedCell, 
  LineageInfo 
} from './table/TableSemanticCells';
import { SpreadsheetGrid } from './table/SpreadsheetGrid';
import { GroupConfig, GroupHeaderRow, groupDataRecords, getColKey, getRecordValue } from './table/TableGrouping';
import { GroupBySelector } from './table/GroupBySelector';
import { AskAuroraFilter } from './table/AskAuroraFilter';
import { TableChartVisualizer } from './table/TableChartVisualizer';
import { DataLineageModal } from './table/DataLineageModal';

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
  
  // Semantic Intelligence
  type?: 'text' | 'person' | 'status' | 'date' | 'currency' | 'number' | 'calculated';
  currency?: string;
  statusOptions?: (string | { label: string; value: string; color?: string })[];
  lineage?: LineageInfo | ((item: T) => LineageInfo | undefined);
}

export interface BulkActionOption {
  label: string;
  value: string;
  color?: string;
}

export interface TableRowAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (item: T) => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
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

  // NEW: Opt-in Spreadsheet Edit Mode (Mode, not default)
  enableSpreadsheetMode?: boolean;
  isEditMode?: boolean;
  onEditModeChange?: (isEdit: boolean) => void;
  onSaveBatch?: (records: Partial<T>[]) => Promise<void> | void;

  // NEW: Grouping & Aggregations
  enableGrouping?: boolean;
  groupConfig?: GroupConfig | null;
  onGroupChange?: (group: GroupConfig | null) => void;

  // NEW: Multi-Modal Layouts & View Modes
  enableChartToggle?: boolean;
  viewMode?: 'table' | 'chart';
  onViewModeChange?: (mode: 'table' | 'chart') => void;

  // NEW: Ask Aurora Natural Language
  enableAskAurora?: boolean;

  // NEW: Row Actions & Command Palette
  rowActions?: (item: T) => TableRowAction<T>[];
  renderRowActions?: (item: T) => React.ReactNode;

  // NEW: Data Lineage & Calculation Explanation
  enableLineage?: boolean;
  onExplainLineage?: (lineage: LineageInfo, item: T, col: Column<T>) => void;
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
  stickyHeader = true,

  // New Features
  enableSpreadsheetMode = false,
  isEditMode: controlledEditMode,
  onEditModeChange,
  onSaveBatch,

  enableGrouping = true,
  groupConfig: controlledGroupConfig,
  onGroupChange,

  enableChartToggle = true,
  viewMode: controlledViewMode,
  onViewModeChange,

  enableAskAurora = true,
  rowActions,
  renderRowActions,
  enableLineage = true,
  onExplainLineage
}: TableProps<T>) {
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(initialPageSize);
  const [sortConfig, setSortConfig] = useState<{ key: keyof T; direction: 'asc' | 'desc' } | null>(null);
  const [internalSearch, setInternalSearch] = useState('');
  
  // View Modes & Modes
  const [internalEditMode, setInternalEditMode] = useState(false);
  const isEditMode = controlledEditMode !== undefined ? controlledEditMode : internalEditMode;
  const setEditMode = (mode: boolean) => {
    if (onEditModeChange) onEditModeChange(mode);
    else setInternalEditMode(mode);
  };

  const [internalViewMode, setInternalViewMode] = useState<'table' | 'chart'>('table');
  const activeViewMode = controlledViewMode !== undefined ? controlledViewMode : internalViewMode;
  const setViewMode = (mode: 'table' | 'chart') => {
    if (onViewModeChange) onViewModeChange(mode);
    else setInternalViewMode(mode);
  };

  // Grouping State
  const [internalGroupConfig, setInternalGroupConfig] = useState<GroupConfig | null>(null);
  const activeGroupConfig = controlledGroupConfig !== undefined ? controlledGroupConfig : internalGroupConfig;
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Lineage Modal State
  const [lineageModalState, setLineageModalState] = useState<{
    isOpen: boolean;
    lineage: LineageInfo | null;
    recordId?: string | number;
    fieldName?: string;
  }>({ isOpen: false, lineage: null });

  // Row Action Open State
  const [activeRowActionMenuId, setActiveRowActionMenuId] = useState<string | number | null>(null);

  // Filter Bar State
  const [internalFilterState, setInternalFilterState] = useState<TableFilterState>({ matchType: 'and', clauses: [] });
  const [targetFieldToOpen, setTargetFieldToOpen] = useState<string | null>(null);

  // Reset internal filter state when filterScopeId changes
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
          type: (col.type === 'person' ? 'user' : col.type === 'status' ? 'select' : col.type || 'text') as any
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
  const handlePageSizeChange = (newPageSize: number) => {
    if (isControlledPageSize && onPageSizeChange) {
      onPageSizeChange(newPageSize);
    } else {
      setInternalPageSize(newPageSize);
      setInternalPage(1);
    }
  };

  const isControlledSearch = searchValue !== undefined;
  const activeSearch = isControlledSearch ? searchValue : internalSearch;
  const handleSearchChange = (query: string) => {
    if (isControlledSearch && onSearchChange) {
      onSearchChange(query);
    } else {
      setInternalSearch(query);
      setCurrentPage(1);
    }
  };

  // Multi-selection state
  const isControlledSelection = controlledSelectedIds !== undefined;
  const [internalSelectedIds, setInternalSelectedIds] = useState<(string | number)[]>([]);
  const selectedIds = isControlledSelection ? controlledSelectedIds : internalSelectedIds;

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const [lastSelectedIdx, setLastSelectedIdx] = useState<number | null>(null);

  // Bulk Action Menus
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Client-side search & filter
  const filteredData = useMemo(() => {
    let result = [...data];

    if (activeSearch && !isControlledSearch) {
      const q = activeSearch.toLowerCase();
      result = result.filter(item => {
        return Object.entries(item).some(([key, val]) => {
          if (val === null || val === undefined) return false;
          if (typeof val === 'object') {
            return JSON.stringify(val).toLowerCase().includes(q);
          }
          return String(val).toLowerCase().includes(q);
        });
      });
    }

    if (activeFilterState && activeFilterState.clauses.length > 0 && !onFilterChange) {
      result = filterRecordsByTableFilterState(result, activeFilterState);
    }

    return result;
  }, [data, activeSearch, isControlledSearch, activeFilterState, onFilterChange]);

  // Client-side Sort
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = getRecordValue(a, String(sortConfig.key));
      const bVal = getRecordValue(b, String(sortConfig.key));
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined || aVal === '') return 1;
      if (bVal === null || bVal === undefined || bVal === '') return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortConfig.direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [filteredData, sortConfig]);

  // Grouping computation
  const groupedData = useMemo(() => {
    if (!activeGroupConfig) return null;
    return groupDataRecords(sortedData, activeGroupConfig, columns, assigneeOptions, computedFilterFields);
  }, [sortedData, activeGroupConfig, columns, assigneeOptions, computedFilterFields]);

  // Client-side pagination
  const totalItems = totalCount !== undefined ? totalCount : sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / currentPageSize));

  const paginatedData = useMemo(() => {
    if (!pagination || totalCount !== undefined) {
      return sortedData;
    }
    const start = (currentPage - 1) * currentPageSize;
    return sortedData.slice(start, start + currentPageSize);
  }, [sortedData, pagination, totalCount, currentPage, currentPageSize]);

  // Selection helpers
  const selectedItems = useMemo(() => {
    return data.filter(d => selectedSet.has(d.id));
  }, [data, selectedSet]);

  const updateSelection = useCallback((nextIds: (string | number)[]) => {
    if (isControlledSelection && onSelectionChange) {
      const nextItems = data.filter(d => nextIds.includes(d.id));
      onSelectionChange(nextIds, nextItems);
    } else {
      setInternalSelectedIds(nextIds);
      if (onSelectionChange) {
        const nextItems = data.filter(d => nextIds.includes(d.id));
        onSelectionChange(nextIds, nextItems);
      }
    }
  }, [isControlledSelection, onSelectionChange, data]);

  const clearSelection = useCallback(() => {
    updateSelection([]);
  }, [updateSelection]);

  const toggleRow = useCallback((item: T, index: number, isShiftKey: boolean) => {
    const id = item.id;
    let next: (string | number)[];

    if (isShiftKey && lastSelectedIdx !== null && lastSelectedIdx !== index) {
      const start = Math.min(lastSelectedIdx, index);
      const end = Math.max(lastSelectedIdx, index);
      const rangeIds = paginatedData.slice(start, end + 1).map(r => r.id);
      const newSet = new Set(selectedIds);
      rangeIds.forEach(rId => newSet.add(rId));
      next = Array.from(newSet);
    } else {
      if (selectedSet.has(id)) {
        next = selectedIds.filter(x => x !== id);
      } else {
        next = [...selectedIds, id];
      }
      setLastSelectedIdx(index);
    }

    updateSelection(next);
  }, [lastSelectedIdx, paginatedData, selectedIds, selectedSet, updateSelection]);

  const isPageFullySelected = useMemo(() => {
    if (paginatedData.length === 0) return false;
    return paginatedData.every(r => selectedSet.has(r.id));
  }, [paginatedData, selectedSet]);

  const isPagePartiallySelected = useMemo(() => {
    if (isPageFullySelected) return false;
    return paginatedData.some(r => selectedSet.has(r.id));
  }, [paginatedData, selectedSet, isPageFullySelected]);

  const toggleSelectAllPage = useCallback(() => {
    if (isPageFullySelected) {
      const pageIds = new Set(paginatedData.map(r => r.id));
      const next = selectedIds.filter(id => !pageIds.has(id));
      updateSelection(next);
    } else {
      const newSet = new Set(selectedIds);
      paginatedData.forEach(r => newSet.add(r.id));
      updateSelection(Array.from(newSet));
    }
  }, [isPageFullySelected, paginatedData, selectedIds, updateSelection]);

  const handleSort = (col: Column<T>) => {
    const sortKey = col.sortKey || (typeof col.accessor === 'string' ? col.accessor as keyof T : null);
    if (!sortKey) return;

    setSortConfig(prev => {
      if (prev?.key === sortKey) {
        if (prev.direction === 'asc') return { key: sortKey, direction: 'desc' };
        return null;
      }
      return { key: sortKey, direction: 'asc' };
    });
  };

  const handleDefaultExport = () => {
    if (onExportSelected) {
      onExportSelected(Array.from(selectedSet), selectedItems);
      return;
    }
    const itemsToExport = selectedItems.length > 0 ? selectedItems : paginatedData;
    if (itemsToExport.length === 0) {
      toast.error('No records available to export');
      return;
    }

    const headers = columns.map(c => c.header).join(',');
    const rows = itemsToExport.map(item => {
      return columns.map(col => {
        let val = typeof col.accessor === 'string' ? (item as any)[col.accessor] : '';
        if (typeof val === 'string') val = `"${val.replace(/"/g, '""')}"`;
        return val ?? '';
      }).join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aurora_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${itemsToExport.length} record(s) to CSV`);
  };

  // Density styles
  const paddingClass = density === 'compact' ? 'px-3 py-1.5' : density === 'spacious' ? 'px-6 py-4' : 'px-4 py-2.5';
  const checkboxPaddingClass = density === 'compact' ? 'py-1.5' : density === 'spacious' ? 'py-4' : 'py-2.5';
  const actionsPadding = density === 'compact' ? 'px-3 py-1.5' : density === 'spacious' ? 'px-6 py-4' : 'px-4 py-2.5';
  const headerTextSize = density === 'compact' ? 'text-[10px]' : 'text-xs';
  const bodyTextSize = density === 'compact' ? 'text-xs' : 'text-sm';

  // Pagination bounds
  const startIndex = (currentPage - 1) * currentPageSize;
  const endIndex = Math.min(startIndex + currentPageSize, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();
  const normalizedPageSizeOptions = pageSizeOptions && pageSizeOptions.length > 0 ? pageSizeOptions : [10, 25, 50, 100];
  const selectedCount = selectedSet.size;

  // Render Cell Content with Semantic Intelligence
  const renderCellContent = (item: T, col: Column<T>) => {
    // If accessor is a function, execute it
    if (typeof col.accessor === 'function') {
      return col.accessor(item);
    }

    const rawVal = (item as any)[col.accessor];

    // Check semantic column type
    const colType = col.type || (() => {
      const key = String(col.accessor).toLowerCase();
      if (key.includes('status') || key.includes('state')) return 'status';
      if (key.includes('assignee') || key.includes('user') || key.includes('owner') || key.includes('member')) return 'person';
      if (key.includes('date') || key.includes('due') || key.includes('createdat') || key.includes('updatedat')) return 'date';
      if (key.includes('price') || key.includes('amount') || key.includes('cost') || key.includes('revenue') || key.includes('salary') || key.includes('fee')) return 'currency';
      return 'text';
    })();

    if (colType === 'person') {
      const memberObj = assigneeOptions.find(m => m.id === rawVal || m.name === rawVal);
      const personData = memberObj || (typeof rawVal === 'object' ? rawVal : { name: String(rawVal || '') });
      return <PersonCell person={personData} />;
    }

    if (colType === 'status') {
      const opts = col.statusOptions || statusOptions;
      return (
        <StatusCell 
          value={String(rawVal ?? '')} 
          options={opts}
          canTransition={true}
          onStatusChange={(newStatus) => {
            if (onBulkStatusChange) {
              onBulkStatusChange([item.id], [item], newStatus, () => {});
            }
          }}
        />
      );
    }

    if (colType === 'date') {
      return <DateCell value={rawVal} includeTime={String(col.accessor).toLowerCase().includes('at')} />;
    }

    if (colType === 'currency') {
      return <CurrencyCell amount={rawVal} currency={col.currency || 'USD'} />;
    }

    if (colType === 'calculated' || col.lineage) {
      const lin = typeof col.lineage === 'function' ? col.lineage(item) : col.lineage;
      return (
        <CalculatedCell 
          value={rawVal} 
          lineage={lin}
          onExplain={(l) => {
            if (onExplainLineage) onExplainLineage(l, item, col);
            setLineageModalState({
              isOpen: true,
              lineage: l,
              recordId: item.id,
              fieldName: col.header
            });
          }}
        />
      );
    }

    return rawVal === null || rawVal === undefined ? '' : String(rawVal);
  };

  const content = (
    <div className="flex flex-col h-full w-full min-h-0 relative">
      
      {/* Unified Single-Row Workbench Toolbar & Filter Bar */}
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
        leftSlot={
          <div className="flex items-center gap-2.5 flex-wrap">
            {title && (
              <div className="flex items-center gap-2 mr-1">
                <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 truncate">
                  <span>{title}</span>
                  {totalCount !== undefined && (
                    <span className="text-[11px] font-normal text-zinc-400 font-mono">({totalCount})</span>
                  )}
                </h3>
                {subtitle && <p className="text-[10px] text-zinc-400 hidden lg:inline truncate">· {subtitle}</p>}
              </div>
            )}

            {/* Group By Selector matching Views and Filters styling */}
            {enableGrouping && (
              <GroupBySelector
                columns={columns}
                activeGroupConfig={activeGroupConfig}
                onChange={(newConfig) => {
                  if (onGroupChange) onGroupChange(newConfig);
                  else setInternalGroupConfig(newConfig);
                }}
              />
            )}
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Ask Aurora AI Natural Language Query */}
            {enableAskAurora && (
              <AskAuroraFilter 
                fields={computedFilterFields} 
                data={sortedData && sortedData.length > 0 ? sortedData : (data || [])}
                assigneeOptions={assigneeOptions}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                onApplyFilters={handleFilterChange}
                onViewModeChange={setViewMode}
              />
            )}

            {searchable && (
              <div className="relative w-36 sm:w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={12} />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={activeSearch}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-lg pl-7 pr-2.5 py-1 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-indigo-500 transition-all shadow-2xs"
                />
              </div>
            )}

            {/* Multi-modal View Switcher (Table | Chart) */}
            {enableChartToggle && (
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={cn(
                    "p-1 rounded text-xs font-medium transition-all cursor-pointer",
                    activeViewMode === 'table' ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                  title="Table Grid View"
                >
                  <TableIcon size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('chart')}
                  className={cn(
                    "p-1 rounded text-xs font-medium transition-all cursor-pointer",
                    activeViewMode === 'chart' ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                  title="Instant Chart Visualizer"
                >
                  <BarChart3 size={13} />
                </button>
              </div>
            )}

            {/* Opt-In Spreadsheet Edit Mode Toggle */}
            {(enableSpreadsheetMode || onSaveBatch) && activeViewMode === 'table' && (
              <Button
                variant={isEditMode ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setEditMode(!isEditMode)}
                className={cn(
                  "h-7 text-xs font-semibold gap-1.5 transition-all px-2.5",
                  isEditMode ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600 shadow-sm shadow-amber-500/20" : "text-zinc-700 dark:text-zinc-300"
                )}
                title="Toggle Excel-style keyboard navigation and multi-cell edit mode"
              >
                <Edit3 size={12} />
                <span>{isEditMode ? 'Exit Edit' : 'Edit Mode'}</span>
              </Button>
            )}

            {headerActions}
          </div>
        }
      />

      {/* VIEW MODE 1: SPREADSHEET EDIT MODE (OPT-IN ONLY) */}
      {isEditMode && activeViewMode === 'table' ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <SpreadsheetGrid
            data={sortedData}
            columns={columns}
            onSaveBatch={async (records) => {
              if (onSaveBatch) await onSaveBatch(records);
            }}
            onExitEditMode={() => setEditMode(false)}
          />
        </div>
      ) : activeViewMode === 'chart' ? (
        /* VIEW MODE 2: INSTANT CHART VISUALIZER */
        <div className="flex-1 min-h-0 overflow-hidden">
          <TableChartVisualizer
            data={sortedData}
            columns={columns}
            groupByField={activeGroupConfig?.fieldKey}
            assigneeOptions={assigneeOptions}
            filterFields={computedFilterFields}
          />
        </div>
      ) : (
        /* VIEW MODE 3: STANDARD HIGH-SPEED READ & TRIAGE GRID (DEFAULT) */
        <div className="overflow-auto custom-scrollbar flex-1 min-h-0 relative">
          <table className={cn("w-full text-left border-separate border-spacing-0", bodyTextSize)}>
            <thead className={cn(
              "bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500",
              stickyHeader && "sticky top-0 z-20",
              headerTextSize
            )}>
              <tr>
                {/* Selection Checkbox */}
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
                  const isLastCol = idx === columns.length - 1 && !headerActions && !rowActions;

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
                        isSortable && 'cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-200'
                      )}
                      style={{ width: col.width, ...col.style }}
                      onClick={() => isSortable && handleSort(col)}
                    >
                      <div className={cn(
                        "flex items-center gap-1.5",
                        col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'
                      )}>
                        <span>{col.header}</span>
                        {isSortable && (
                          <div className="flex items-center opacity-40 group-hover:opacity-100 transition-opacity">
                            {isSorted ? (
                              sortConfig.direction === 'asc' ? <ChevronUp size={11} className="text-indigo-500" /> : <ChevronDown size={11} className="text-indigo-500" />
                            ) : (
                              <ArrowUpDown size={10} className="text-zinc-400" />
                            )}
                          </div>
                        )}
                        {matchingFilterField && col.filterable !== false && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTargetFieldToOpen(matchingFilterField.id);
                            }}
                            className={cn(
                              "p-0.5 rounded transition-all",
                              isFilterActiveOnCol ? "text-indigo-600 opacity-100" : "text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800"
                            )}
                          >
                            <Filter size={10} className={isFilterActiveOnCol ? "fill-indigo-600" : ""} />
                          </button>
                        )}
                      </div>
                    </th>
                  );
                })}

                {/* Contextual Row Action Column */}
                {(rowActions || renderRowActions) && (
                  <th className="w-12 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-400 py-2 relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-zinc-200/50 dark:after:bg-zinc-800/50 after:pointer-events-none">
                    Actions
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
                    {columns.map((col, j) => (
                      <td key={j} className={cn("border-b border-zinc-200/50 dark:border-zinc-800/50", paddingClass)}>
                        <Skeleton variant="text" className="w-24 h-3 opacity-60" />
                      </td>
                    ))}
                    {(rowActions || renderRowActions) && <td className="border-b border-zinc-200/50 dark:border-zinc-800/50" />}
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td 
                    colSpan={columns.length + (enableSelection ? 1 : 0) + (rowActions || renderRowActions ? 1 : 0)} 
                    className="py-16 text-center"
                  >
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                        {emptyIcon || <Inbox size={24} />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{emptyMessage}</p>
                        {activeSearch && <p className="text-xs text-zinc-400 mt-0.5">Try adjusting your search</p>}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : groupedData ? (
                /* GROUPED RENDERING */
                groupedData.map((group, gIdx) => {
                  const isCollapsed = collapsedGroups.has(group.groupValue);
                  const colSpanTotal = columns.length + (enableSelection ? 1 : 0) + (rowActions || renderRowActions ? 1 : 0);

                  return (
                    <React.Fragment key={`group_${gIdx}`}>
                      <GroupHeaderRow
                        groupValue={group.groupValue}
                        count={group.count}
                        isCollapsed={isCollapsed}
                        onToggle={() => {
                          setCollapsedGroups(prev => {
                            const next = new Set(prev);
                            if (next.has(group.groupValue)) next.delete(group.groupValue);
                            else next.add(group.groupValue);
                            return next;
                          });
                        }}
                        colSpan={colSpanTotal}
                        groupConfig={activeGroupConfig!}
                        aggregates={group.aggregates}
                      />
                      {!isCollapsed && group.items.map((item, rowIdx) => {
                        const rowId = item.id;
                        const isSelected = selectedSet.has(rowId);

                        return (
                          <tr 
                            key={String(rowId)} 
                            onClick={() => onRowClick?.(item)}
                            className={cn(
                              'group transition-colors duration-100',
                              isSelected ? 'bg-indigo-50/70 dark:bg-indigo-950/30' : 'hover:bg-zinc-50/80 dark:hover:bg-white/[0.02]',
                              onRowClick && 'cursor-pointer'
                            )}
                          >
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

                            {columns.map((col, idx) => (
                              <td 
                                key={idx} 
                                className={cn(
                                  paddingClass,
                                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                                  'text-zinc-700 dark:text-zinc-300 align-middle border-b border-zinc-200/50 dark:border-zinc-800/50', 
                                  col.className
                                )} 
                                style={{ width: col.width, ...col.style }}
                              >
                                {renderCellContent(item, col)}
                              </td>
                            ))}

                            {(rowActions || renderRowActions) && (
                              <td 
                                className="w-12 text-center align-middle border-b border-zinc-200/50 dark:border-zinc-800/50"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {renderRowActions ? (
                                  renderRowActions(item)
                                ) : rowActions ? (
                                  <div className="relative inline-block text-left">
                                    <button
                                      type="button"
                                      onClick={() => setActiveRowActionMenuId(activeRowActionMenuId === item.id ? null : item.id)}
                                      className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    >
                                      <MoreHorizontal size={14} />
                                    </button>
                                    {activeRowActionMenuId === item.id && (
                                      <>
                                        <div className="fixed inset-0 z-40" onClick={() => setActiveRowActionMenuId(null)} />
                                        <div className="absolute right-0 top-full mt-1 z-50 w-44 p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-100 text-xs">
                                          {rowActions(item).map((act, aIdx) => (
                                            <button
                                              key={aIdx}
                                              disabled={act.disabled}
                                              onClick={() => {
                                                setActiveRowActionMenuId(null);
                                                act.onClick(item);
                                              }}
                                              className={cn(
                                                "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors",
                                                act.variant === 'danger' 
                                                  ? "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40" 
                                                  : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                              )}
                                            >
                                              {act.icon}
                                              <span className="truncate">{act.label}</span>
                                            </button>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ) : null}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              ) : (
                /* STANDARD FLAT RENDERING */
                paginatedData.map((item, rowIdx) => {
                  const rowId = item.id;
                  const isSelected = selectedSet.has(rowId);

                  return (
                    <tr 
                      key={String(rowId)} 
                      onClick={() => onRowClick?.(item)}
                      className={cn(
                        'group transition-colors duration-100',
                        isSelected ? 'bg-indigo-50/70 dark:bg-indigo-950/30' : 'hover:bg-zinc-50/80 dark:hover:bg-white/[0.02]',
                        onRowClick && 'cursor-pointer'
                      )}
                    >
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

                      {columns.map((col, idx) => (
                        <td 
                          key={idx} 
                          className={cn(
                            paddingClass,
                            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                            'text-zinc-700 dark:text-zinc-300 align-middle border-b border-zinc-200/50 dark:border-zinc-800/50', 
                            col.className
                          )} 
                          style={{ width: col.width, ...col.style }}
                        >
                          {renderCellContent(item, col)}
                        </td>
                      ))}

                      {(rowActions || renderRowActions) && (
                        <td 
                          className="w-12 text-center align-middle border-b border-zinc-200/50 dark:border-zinc-800/50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {renderRowActions ? (
                            renderRowActions(item)
                          ) : rowActions ? (
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                onClick={() => setActiveRowActionMenuId(activeRowActionMenuId === item.id ? null : item.id)}
                                className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              >
                                <MoreHorizontal size={14} />
                              </button>
                              {activeRowActionMenuId === item.id && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setActiveRowActionMenuId(null)} />
                                  <div className="absolute right-0 top-full mt-1 z-50 w-44 p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-100 text-xs">
                                    {rowActions(item).map((act, aIdx) => (
                                      <button
                                        key={aIdx}
                                        disabled={act.disabled}
                                        onClick={() => {
                                          setActiveRowActionMenuId(null);
                                          act.onClick(item);
                                        }}
                                        className={cn(
                                          "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors",
                                          act.variant === 'danger' 
                                            ? "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40" 
                                            : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                        )}
                                      >
                                        {act.icon}
                                        <span className="truncate">{act.label}</span>
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          ) : null}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

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

              <div className="flex items-center gap-1">
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
                      <div className="absolute bottom-full mb-2 left-0 w-48 p-1.5 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50">
                        {assigneeOptions.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              onBulkAssign(Array.from(selectedSet), selectedItems, user.id, clearSelection);
                              setShowAssignMenu(false);
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                            <span className="truncate">{user.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

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

                <button
                  type="button"
                  onClick={handleDefaultExport}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors"
                  title="Export selected as CSV"
                >
                  <Download size={13} className="text-zinc-400" />
                  <span className="hidden sm:inline">Export</span>
                </button>

                {typeof bulkActions === 'function' 
                  ? bulkActions(Array.from(selectedSet), selectedItems, clearSelection)
                  : bulkActions}

                {onBulkDelete && (
                  <button
                    type="button"
                    onClick={() => setShowBulkDeleteModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-0.5"
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
      {pagination && activeViewMode === 'table' && (
        totalItems > 0 ? (
          <div className="h-12 flex flex-col sm:flex-row items-center justify-between border-t border-zinc-200 dark:border-zinc-800 px-6 gap-3 bg-white/30 dark:bg-zinc-900/30 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                Showing <span className="text-zinc-900 dark:text-zinc-100">{startIndex + 1}</span> to <span className="text-zinc-900 dark:text-zinc-100">{endIndex}</span> of <span className="text-zinc-900 dark:text-zinc-100">{totalItems}</span> records
              </div>

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
        ) : null
      )}

      {/* Data Lineage Modal */}
      <DataLineageModal
        isOpen={lineageModalState.isOpen}
        onClose={() => setLineageModalState(prev => ({ ...prev, isOpen: false }))}
        lineage={lineageModalState.lineage}
        recordId={lineageModalState.recordId}
        fieldName={lineageModalState.fieldName}
      />

      {/* Bulk Delete Modal */}
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
