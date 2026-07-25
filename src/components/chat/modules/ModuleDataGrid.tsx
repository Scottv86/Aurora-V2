import React, { useState } from 'react';
import { Table, Search, ArrowUpDown, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export interface ColumnDef {
  key: string;
  label: string;
  sortable?: boolean;
}

export interface ModuleDataGridProps {
  title?: string;
  columns: ColumnDef[];
  rows: Record<string, any>[];
  pageSize?: number;
}

export const ModuleDataGrid: React.FC<ModuleDataGridProps> = ({
  title = 'Module Record Query',
  columns,
  rows,
  pageSize = 5
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter
  const filteredRows = rows.filter((row) =>
    Object.values(row).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Sort
  const sortedRows = [...filteredRows].sort((a, b) => {
    if (!sortKey) return 0;
    const valA = a[sortKey];
    const valB = b[sortKey];
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedRows.length / pageSize) || 1;
  const paginatedRows = sortedRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const exportCSV = () => {
    if (!rows || rows.length === 0) return;
    const headers = columns.map((c) => c.label).join(',');
    const csvRows = rows.map((r) =>
      columns.map((c) => `"${r[c.key] ?? ''}"`).join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...csvRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported grid dataset to CSV');
  };

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/90 shadow-lg backdrop-blur-md">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <Table className="h-4 w-4 text-emerald-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">{title}</h4>
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400 font-mono">
            {rows.length} record{rows.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-36 rounded-md border border-slate-700 bg-slate-950 pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            <Download className="h-3.5 w-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && toggleSort(col.key)}
                  className={`px-4 py-2.5 font-semibold ${
                    col.sortable !== false ? 'cursor-pointer hover:text-slate-200 select-none' : ''
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span>{col.label}</span>
                    {col.sortable !== false && <ArrowUpDown className="h-3 w-3 text-slate-600" />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans text-slate-300">
            {paginatedRows.length > 0 ? (
              paginatedRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-2.5 whitespace-nowrap">
                      {String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-slate-500 italic">
                  No matching module records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-800 px-4 py-2 text-xs text-slate-400 bg-slate-950/50">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="rounded p-1 text-slate-400 disabled:opacity-40 hover:bg-slate-800 hover:text-slate-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="rounded p-1 text-slate-400 disabled:opacity-40 hover:bg-slate-800 hover:text-slate-200"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
