import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Link2, 
  Key, 
  ExternalLink, 
  X, 
  Loader2, 
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { API_BASE_URL } from '../../config';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

export interface ReferencingRecordPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  targetTable: string;
  targetColumn?: string;
  value: string | number;
  anchorRect: DOMRect | null;
  onOpenTable: (targetTable: string, targetColumn: string, value: string | number) => void;
}

interface ColumnMeta {
  name: string;
  type: string;
  isPrimary?: boolean;
  foreignKey?: { targetTable: string; targetColumn: string };
}

export const ReferencingRecordPopover: React.FC<ReferencingRecordPopoverProps> = ({
  isOpen,
  onClose,
  targetTable,
  targetColumn = 'id',
  value,
  anchorRect,
  onOpenTable
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<any | null>(null);
  const [columns, setColumns] = useState<ColumnMeta[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Fetch referencing record
  useEffect(() => {
    if (!isOpen || !targetTable || value === undefined || value === null) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setRecord(null);

    const fetchRecord = async () => {
      try {
        const { data: sessData } = await supabase.auth.getSession();
        const activeToken = sessData?.session?.access_token || localStorage.getItem('aurora_token') || 'dev-token';

        const params = new URLSearchParams({
          table: targetTable,
          column: targetColumn,
          value: String(value)
        });

        const res = await fetch(`${API_BASE_URL}/api/query-explorer/referenced-record?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${activeToken}`,
            'x-tenant-id': sessData?.session?.user?.user_metadata?.tenant_id || 't1'
          }
        });

        const data = await res.json();
        if (!isMounted) return;

        if (res.ok && data.success) {
          setRecord(data.record);
          if (Array.isArray(data.columns) && data.columns.length > 0) {
            setColumns(data.columns);
          } else if (data.record) {
            // Synthesize columns from row keys if metadata not provided
            setColumns(Object.keys(data.record).map(k => ({
              name: k,
              type: typeof data.record[k] === 'number' ? 'int' : 'text',
              isPrimary: k.toLowerCase() === 'id',
              foreignKey: k.toLowerCase().endsWith('_id') ? { targetTable: k.replace(/_id$/i, 's'), targetColumn: 'id' } : undefined
            })));
          }
        } else {
          setError(data.error || 'Failed to load referencing record.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Network error fetching record.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRecord();

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetTable, targetColumn, value]);

  // Click outside to dismiss
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !anchorRect) return null;

  // Calculate position with viewport boundary clamping
  const popoverWidth = Math.min(560, window.innerWidth - 32);
  let left = anchorRect.left;
  if (left + popoverWidth > window.innerWidth - 16) {
    left = window.innerWidth - popoverWidth - 16;
  }
  if (left < 16) left = 16;

  // Determine top vs bottom orientation
  const estimatedHeight = 240;
  let top = anchorRect.bottom + 6;
  if (top + estimatedHeight > window.innerHeight - 16 && anchorRect.top > estimatedHeight + 16) {
    top = anchorRect.top - estimatedHeight - 6;
  }

  const handleCopyValue = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const displayColumns = columns.length > 0 
    ? columns 
    : (record ? Object.keys(record).map(k => ({ name: k, type: 'text', isPrimary: k === 'id' })) : []);

  return createPortal(
    <div 
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        width: `${popoverWidth}px`,
        zIndex: 9999
      }}
      className="bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl overflow-hidden font-mono text-xs text-zinc-300 animate-in fade-in zoom-in-95 duration-150 select-text"
    >
      {/* 1. Popover Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-900/80 border-b border-zinc-800/80">
        <div className="flex items-center gap-2 overflow-hidden pr-2">
          <Link2 size={13} className="text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold text-zinc-200 truncate">
            Referencing record from <span className="text-emerald-400 font-bold">public.{targetTable}</span>:
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors shrink-0"
          title="Close (Esc)"
        >
          <X size={14} />
        </button>
      </div>

      {/* 2. Content Pane */}
      <div className="p-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2.5 text-zinc-400">
            <Loader2 size={18} className="animate-spin text-emerald-400" />
            <span className="text-xs text-zinc-400">Fetching referencing record...</span>
          </div>
        ) : error ? (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2.5">
            <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold">Unable to load referencing record</p>
              <p className="text-rose-400/80 mt-0.5 text-[11px]">{error}</p>
            </div>
          </div>
        ) : !record ? (
          <div className="py-6 text-center text-zinc-500 text-xs">
            No referencing record found in <span className="font-semibold text-zinc-400">{targetTable}</span> where <span className="font-semibold text-zinc-400">{targetColumn}</span> = <span className="text-zinc-300">"{value}"</span>.
          </div>
        ) : (
          <div className="border border-zinc-800/90 rounded-lg overflow-hidden bg-zinc-900/40">
            <div className="overflow-x-auto max-h-56">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-950/70 border-b border-zinc-800 text-zinc-400 font-semibold select-none">
                    {displayColumns.map(col => (
                      <th 
                        key={`col-head-${col.name}`}
                        className="px-3 py-2 border-r border-zinc-800/80 whitespace-nowrap text-[11px]"
                      >
                        <div className="flex items-center gap-1.5">
                          {col.isPrimary ? (
                            <Key size={10} className="text-yellow-500 shrink-0" title="Primary Key" />
                          ) : col.foreignKey ? (
                            <Link2 size={10} className="text-emerald-400 shrink-0" title={`Foreign Key -> ${col.foreignKey.targetTable}`} />
                          ) : null}
                          <span className="text-zinc-200">{col.name}</span>
                          <span className="text-zinc-500 text-[10px] font-normal">{col.type}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-zinc-800/30">
                    {displayColumns.map(col => {
                      const val = record[col.name];
                      const isNull = val === null || val === undefined;
                      let displayStr = '';
                      if (isNull) {
                        displayStr = 'null';
                      } else if (typeof val === 'object') {
                        displayStr = JSON.stringify(val);
                      } else {
                        displayStr = String(val);
                      }

                      return (
                        <td 
                          key={`col-val-${col.name}`}
                          className={cn(
                            "px-3 py-2 border-r border-zinc-850/80 whitespace-nowrap text-zinc-300 max-w-xs truncate group/td relative",
                            isNull && "text-zinc-600 italic font-sans"
                          )}
                          title={displayStr}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="truncate">{displayStr}</span>
                            {!isNull && (
                              <button
                                onClick={() => handleCopyValue(displayStr, col.name)}
                                className="opacity-0 group-hover/td:opacity-100 p-0.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-opacity"
                                title="Copy Value"
                              >
                                {copiedKey === col.name ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 3. Popover Footer */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-950 border-t border-zinc-850/80">
        <span className="text-[10px] text-zinc-500">
          {targetColumn}: <span className="text-zinc-400 font-semibold">{String(value)}</span>
        </span>

        <button
          onClick={() => {
            onOpenTable(targetTable, targetColumn, value);
            onClose();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-sans text-xs font-medium border border-zinc-700 transition-colors shadow-sm cursor-pointer"
        >
          <span>Open table</span>
          <ExternalLink size={12} className="text-zinc-400" />
        </button>
      </div>
    </div>,
    document.body
  );
};
