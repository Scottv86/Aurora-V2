import React, { useState, useEffect } from 'react';
import { cn, Button } from './Primitives';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
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
}

export const Table = <T extends { id: string | number }>({
  data,
  columns,
  loading,
  onRowClick,
  emptyMessage = 'No data found',
  pagination = true,
  pageSize = 10
}: TableProps<T>) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when data changes (search/filter applied)
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  
  const paginatedData = pagination 
    ? data.slice(startIndex, endIndex) 
    : data;

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50/50 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={cn('px-6 py-4', col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-zinc-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    'group transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && totalItems > 0 && (
        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/30 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/30">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
            Showing <span className="text-zinc-900 dark:text-zinc-100">{startIndex + 1}</span> to <span className="text-zinc-900 dark:text-zinc-100">{endIndex}</span> of <span className="text-zinc-900 dark:text-zinc-100">{totalItems}</span> results
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="secondary" 
              size="sm" 
              className="h-8 w-8 p-0 rounded-lg"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              <ChevronLeft size={16} />
            </Button>
            
            <div className="flex items-center gap-1 mx-2">
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const pageNum = i + 1; // Simplistic page logic for now
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      'h-8 w-8 rounded-lg text-xs font-bold transition-all',
                      currentPage === pageNum 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                        : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800'
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
              className="h-8 w-8 p-0 rounded-lg"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
