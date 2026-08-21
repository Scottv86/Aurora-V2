import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Layers, Check, ChevronDown, X, Hash } from 'lucide-react';
import { cn } from '../Primitives';
import { Column } from '../Table';
import { GroupConfig, getColKey } from './TableGrouping';

export interface GroupBySelectorProps<T> {
  columns: Column<T>[];
  activeGroupConfig: GroupConfig | null;
  onChange: (config: GroupConfig | null) => void;
  className?: string;
}

export function GroupBySelector<T>({
  columns,
  activeGroupConfig,
  onChange,
  className
}: GroupBySelectorProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Available valid columns
  const validColumns = columns.filter(
    c => c.header && c.header.toLowerCase() !== 'actions' && c.header.toLowerCase() !== 'select' && c.header !== ''
  );

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const triggerRect = triggerRef.current?.getBoundingClientRect();

  const handleSelect = (fieldKey: string | null, label?: string) => {
    if (!fieldKey) {
      onChange(null);
    } else {
      onChange({ fieldKey, label });
    }
    setIsOpen(false);
  };

  const activeLabel = activeGroupConfig 
    ? (activeGroupConfig.label || columns.find(c => getColKey(c) === activeGroupConfig.fieldKey)?.header || activeGroupConfig.fieldKey)
    : 'None';

  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs select-none cursor-pointer",
          activeGroupConfig
            ? "bg-white dark:bg-zinc-800/90 border-indigo-300 dark:border-indigo-700/60 text-indigo-700 dark:text-indigo-300 font-bold"
            : "bg-white/80 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700"
        )}
      >
        <Layers size={13} className={activeGroupConfig ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400"} />
        <span className="max-w-[130px] truncate">
          Group: {activeLabel}
        </span>
        <ChevronDown size={12} className="text-zinc-400 opacity-80 shrink-0" />
      </button>

      {/* Portal Dropdown Menu */}
      {isOpen && triggerRect && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: Math.min(triggerRect.bottom + 6, window.innerHeight - 300),
            left: Math.min(Math.max(12, triggerRect.left), window.innerWidth - 240),
            zIndex: 99999
          }}
          className="w-60 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5 text-xs animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 mb-1">
            Group Records By
          </div>

          <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
            {/* None Option */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={cn(
                "flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors cursor-pointer",
                !activeGroupConfig
                  ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              )}
            >
              <span>None (No Grouping)</span>
              {!activeGroupConfig && <Check size={13} className="text-indigo-600 dark:text-indigo-400" />}
            </button>

            {/* Column Options */}
            {validColumns.map((col, idx) => {
              const k = getColKey(col);
              const isSelected = activeGroupConfig?.fieldKey === k;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelect(k, col.header)}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors cursor-pointer",
                    isSelected
                      ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                  )}
                >
                  <span className="truncate">{col.header}</span>
                  {isSelected && <Check size={13} className="text-indigo-600 dark:text-indigo-400 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
