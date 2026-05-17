import React, { useState, useEffect, useMemo } from 'react';
import { cn, Button } from './Primitives';
import { ChevronLeft, ChevronRight, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { Skeleton } from './Skeleton';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  sortable?: boolean;
  sortKey?: keyof T;
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  pagination?: boolean;
  pageSize?: number;
  className?: string;
  headerActions?: React.ReactNode;
  noContainer?: boolean;
}

export function Table<T extends { id: string | number }>({
  data,
  columns,
  loading,
  onRowClick,
  emptyMessage = 'No data found',
  pagination = true,
  pageSize = 10,
  className,
  headerActions,
  noContainer = false
}: TableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: keyof T; direction: 'asc' | 'desc' } | null>(null);

  // Reset to page 1 when data changes (search/filter applied)
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length, sortConfig]);

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

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  
  const paginatedData = pagination 
    ? sortedData.slice(startIndex, endIndex) 
    : sortedData;

  const content = (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="border-b border-white/10 bg-white/5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-white/5 dark:text-zinc-400">
            <tr>
              {columns.map((col, idx) => {
                const isSortable = col.sortable && (col.sortKey || typeof col.accessor === 'string');
                const sortKey = col.sortKey || (typeof col.accessor === 'string' ? col.accessor as keyof T : null);
                const isSorted = sortConfig?.key === sortKey;

                return (
                  <th 
                    key={idx} 
                    className={cn(
                      'px-6 py-4 transition-colors',
                      isSortable && 'cursor-pointer hover:bg-white/10 dark:hover:bg-white/5 select-none',
                      col.className
                    )}
                    onClick={() => isSortable && handleSort(col)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{col.header}</span>
                      {isSortable && (
                        <div className="flex flex-col opacity-50">
                          {isSorted ? (
                            sortConfig.direction === 'asc' ? <ChevronUp size={12} className="text-blue-500 opacity-100" /> : <ChevronDown size={12} className="text-blue-500 opacity-100" />
                          ) : (
                            <ArrowUpDown size={12} />
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
              {headerActions && (
                <th className="px-6 py-4 text-right">
                  {headerActions}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 dark:divide-zinc-800">
            {loading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <tr key={i}>
                  {columns.map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <Skeleton variant="text" className="w-full opacity-50" />
                    </td>
                  ))}
                  {headerActions && <td className="px-6 py-4" />}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (headerActions ? 1 : 0)} className="px-6 py-12 text-center text-zinc-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    'group transition-colors hover:bg-white/20 dark:hover:bg-white/5',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((col, idx) => (
                    <td key={idx} className={cn('px-6 py-4 text-zinc-700 dark:text-zinc-300', col.className)}>
                      {typeof col.accessor === 'function'
                        ? col.accessor(item)
                        : (item[col.accessor] as React.ReactNode)}
                    </td>
                  ))}
                  {headerActions && <td className="px-6 py-4" />}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && totalItems > 0 && (
        <div className="flex items-center justify-between border-t border-white/10 px-6 py-4 dark:border-zinc-800">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
            Showing <span className="text-zinc-900 dark:text-zinc-100">{startIndex + 1}</span> to <span className="text-zinc-900 dark:text-zinc-100">{endIndex}</span> of <span className="text-zinc-900 dark:text-zinc-100">{totalItems}</span> results
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="secondary" 
              size="sm" 
              className="h-8 w-8 p-0 rounded-lg bg-white/10 border-white/10"
              disabled={currentPage === 1}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPage(prev => Math.max(1, prev - 1));
              }}
            >
              <ChevronLeft size={16} />
            </Button>
            
            <div className="flex items-center gap-1 mx-2">
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPage(pageNum);
                    }}
                    className={cn(
                      'h-8 w-8 rounded-lg text-xs font-bold transition-all',
                      currentPage === pageNum 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                        : 'text-zinc-500 hover:bg-white/20 dark:hover:bg-white/10'
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && <span className="text-zinc-400 px-1">...</span>}
            </div>

            <Button 
              variant="secondary" 
              size="sm" 
              className="h-8 w-8 p-0 rounded-lg bg-white/10 border-white/10"
              disabled={currentPage === totalPages}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPage(prev => Math.min(totalPages, prev + 1));
              }}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </>
  );

  if (noContainer) return content;

  return (
    <div className={cn(
      "relative w-full overflow-hidden rounded-[2rem] border border-white/20 bg-white/40 backdrop-blur-xl shadow-xl dark:border-zinc-800 dark:bg-zinc-900/40 dark:backdrop-blur-xl",
      className
    )}>
      {content}
    </div>
  );
}
