import React, { useMemo } from 'react';
import { Eye } from 'lucide-react';
import { cn } from '../../../lib/utils';

import { FieldMetaInfo } from './JsonViewerModal';

interface JsonCellRendererProps {
  value: any;
  columnName: string;
  rowIndex: number;
  fieldDictionary?: Record<string, FieldMetaInfo>;
  onInspect: (colName: string, val: any, rowIdx: number) => void;
}

export const JsonCellRenderer: React.FC<JsonCellRendererProps> = ({
  value,
  columnName,
  rowIndex,
  fieldDictionary,
  onInspect
}) => {
  const parsed = useMemo(() => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') return value;
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return null;
  }, [value]);

  if (parsed === null) {
    if (value === null) return <span className="text-zinc-600 italic">null</span>;
    return <span>{String(value)}</span>;
  }

  const isArray = Array.isArray(parsed);
  const keys = isArray ? [] : Object.keys(parsed);
  const count = isArray ? parsed.length : keys.length;

  // Build brief snippet (e.g. "{ Postal Code: '51515', ... }")
  const previewSnippet = useMemo(() => {
    if (isArray) {
      if (parsed.length === 0) return '[]';
      return `[ ${parsed.slice(0, 2).map(x => typeof x === 'object' ? '{...}' : String(x)).join(', ')}${parsed.length > 2 ? ', ...' : ''} ]`;
    }
    if (keys.length === 0) return '{}';
    const pairs = keys.slice(0, 2).map(k => {
      const meta = fieldDictionary?.[k];
      const displayKey = meta?.label || meta?.name || k;
      const v = parsed[k];
      const vStr = v === null ? 'null' : typeof v === 'object' ? '{...}' : String(v);
      return `${displayKey}: ${vStr.length > 14 ? vStr.slice(0, 12) + '..' : vStr}`;
    });
    return `{ ${pairs.join(', ')}${keys.length > 2 ? ', ...' : ''} }`;
  }, [parsed, isArray, keys, fieldDictionary]);

  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        onInspect(columnName, parsed, rowIndex);
      }}
      className={cn(
        "inline-flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs font-mono transition-all group cursor-pointer select-none",
        "bg-zinc-900/90 hover:bg-zinc-800/90 border-zinc-800 hover:border-indigo-500/50 text-zinc-300 hover:text-white shadow-xs"
      )}
      title="Click to inspect JSON blob"
    >
      <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400">
        <span className="font-mono text-[12px]">{isArray ? '[' : '{'}</span>
        <span>{count} {isArray ? (count === 1 ? 'item' : 'items') : (count === 1 ? 'prop' : 'props')}</span>
        <span className="font-mono text-[12px]">{isArray ? ']' : '}'}</span>
      </div>

      <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 truncate max-w-[180px]">
        {previewSnippet}
      </span>

      <Eye size={12} className="opacity-40 group-hover:opacity-100 text-indigo-400 shrink-0 ml-0.5 transition-opacity" />
    </div>
  );
};
