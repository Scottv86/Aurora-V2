import React from 'react';
import { cn } from './Primitives';

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
}

export const Table = <T extends { id: string | number }>({
  data,
  columns,
  loading,
  onRowClick,
  emptyMessage = 'No data found'
}: TableProps<T>) => {
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
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-zinc-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
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
    </div>
  );
};
