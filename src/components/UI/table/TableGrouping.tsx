import React from 'react';
import { ChevronRight, ChevronDown, Layers, Calculator, Hash } from 'lucide-react';
import { cn } from '../Primitives';
import { Column } from '../Table';

export type AggregateType = 'count' | 'sum' | 'avg' | 'min' | 'max';

export interface GroupConfig {
  fieldKey: string;
  label?: string;
  aggregates?: {
    fieldKey: string;
    type: AggregateType;
  }[];
}

export interface GroupSummary<T> {
  groupValue: string;
  items: T[];
  count: number;
  aggregates: Record<string, number | string>;
}

export function getColKey<T>(col: Column<T>): string {
  if (col.filterKey) return String(col.filterKey);
  if (col.sortKey) return String(col.sortKey);
  if (typeof col.accessor === 'string') return String(col.accessor);
  return String(col.header).toLowerCase().replace(/[^a-z0-9]/g, '_');
}

export function getRecordValue(item: any, fieldKey: string): any {
  if (!item) return '';
  if (item[fieldKey] !== undefined && item[fieldKey] !== null) return item[fieldKey];
  if (item.data && typeof item.data === 'object' && item.data[fieldKey] !== undefined && item.data[fieldKey] !== null) {
    return item.data[fieldKey];
  }
  if (item.customFields && typeof item.customFields === 'object' && item.customFields[fieldKey] !== undefined) {
    return item.customFields[fieldKey];
  }
  return '';
}

/**
 * Resolves raw IDs (like User ID / Member ID / Option value) into user-friendly names
 */
export function resolveRecordDisplayValue(
  rawVal: any,
  fieldKey: string,
  assigneeOptions?: any[],
  filterFields?: any[]
): string {
  if (rawVal === undefined || rawVal === null || rawVal === '') {
    return 'Unassigned';
  }

  // 1. If it's already an object with name or label
  if (typeof rawVal === 'object') {
    if (rawVal.name) return String(rawVal.name);
    if (rawVal.label) return String(rawVal.label);
    if (rawVal.title) return String(rawVal.title);
    if (Array.isArray(rawVal)) {
      return rawVal.length > 0 ? resolveRecordDisplayValue(rawVal[0], fieldKey, assigneeOptions, filterFields) : 'Unassigned';
    }
  }

  const valStr = String(rawVal);

  // 2. Check assignee / member options
  if (assigneeOptions && assigneeOptions.length > 0) {
    const match = assigneeOptions.find(
      (m: any) =>
        m.id === valStr ||
        m.cuid === valStr ||
        m.memberId === valStr ||
        m.userId === valStr
    );
    if (match) {
      return match.name || match.user?.name || match.email || valStr;
    }
  }

  // 3. Check filterFields userOptions and select options
  if (filterFields && filterFields.length > 0) {
    for (const f of filterFields) {
      if (f.id === fieldKey || f.key === fieldKey || fieldKey.toLowerCase().includes(f.id.toLowerCase())) {
        if (f.userOptions) {
          const userMatch = f.userOptions.find(
            (u: any) => u.id === valStr || u.cuid === valStr || u.memberId === valStr || u.userId === valStr
          );
          if (userMatch) return userMatch.name || userMatch.user?.name || userMatch.email || valStr;
        }
        if (f.options) {
          const optMatch = f.options.find(
            (o: any) => (typeof o === 'string' ? o === valStr : o.value === valStr)
          );
          if (optMatch) return typeof optMatch === 'object' ? optMatch.label : optMatch;
        }
      }
    }
  }

  return valStr;
}

/**
 * Utility to group records and compute aggregates
 */
export function groupDataRecords<T>(
  data: T[],
  groupConfig: GroupConfig,
  columns: Column<T>[],
  assigneeOptions?: any[],
  filterFields?: any[]
): GroupSummary<T>[] {
  const groupsMap = new Map<string, T[]>();

  data.forEach((item: any) => {
    const rawVal = getRecordValue(item, groupConfig.fieldKey);
    const keyStr = resolveRecordDisplayValue(rawVal, groupConfig.fieldKey, assigneeOptions, filterFields);

    if (!groupsMap.has(keyStr)) {
      groupsMap.set(keyStr, []);
    }
    groupsMap.get(keyStr)!.push(item);
  });

  const summaries: GroupSummary<T>[] = [];

  groupsMap.forEach((items, groupValue) => {
    const aggregates: Record<string, number | string> = {};

    if (groupConfig.aggregates && groupConfig.aggregates.length > 0) {
      groupConfig.aggregates.forEach(({ fieldKey, type }) => {
        const values = items
          .map((it: any) => {
            const v = getRecordValue(it, fieldKey);
            return typeof v === 'number' ? v : parseFloat(String(v || '').replace(/[^0-9.-]+/g, ''));
          })
          .filter((n) => !isNaN(n));

        if (type === 'count') {
          aggregates[`${fieldKey}_${type}`] = items.length;
        } else if (values.length === 0) {
          aggregates[`${fieldKey}_${type}`] = 0;
        } else if (type === 'sum') {
          const sum = values.reduce((a, b) => a + b, 0);
          aggregates[`${fieldKey}_${type}`] = sum;
        } else if (type === 'avg') {
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          aggregates[`${fieldKey}_${type}`] = Math.round(avg * 100) / 100;
        } else if (type === 'min') {
          aggregates[`${fieldKey}_${type}`] = Math.min(...values);
        } else if (type === 'max') {
          aggregates[`${fieldKey}_${type}`] = Math.max(...values);
        }
      });
    }

    summaries.push({
      groupValue,
      items,
      count: items.length,
      aggregates
    });
  });

  // Sort groups by record count descending
  return summaries.sort((a, b) => b.count - a.count);
}

/**
 * Group Header Row Component
 */
export const GroupHeaderRow: React.FC<{
  groupValue: string;
  count: number;
  isCollapsed: boolean;
  onToggle: () => void;
  colSpan: number;
  groupConfig: GroupConfig;
  aggregates?: Record<string, number | string>;
}> = ({
  groupValue,
  count,
  isCollapsed,
  onToggle,
  colSpan,
  groupConfig,
  aggregates = {}
}) => {
  return (
    <tr 
      onClick={onToggle}
      className="bg-zinc-100/90 dark:bg-zinc-800/80 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 cursor-pointer select-none transition-colors border-y border-zinc-200 dark:border-zinc-700 font-medium text-xs text-zinc-900 dark:text-zinc-100"
    >
      <td colSpan={colSpan} className="py-2.5 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-0.5 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-500 dark:text-zinc-400">
                {groupConfig.label || groupConfig.fieldKey}:
              </span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 shadow-sm">
                {groupValue}
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-200/60 dark:bg-zinc-700/60 px-2 py-0.5 rounded-full font-mono font-medium">
                {count} {count === 1 ? 'record' : 'records'}
              </span>
            </div>
          </div>

          {/* Aggregates Breakdown */}
          {Object.keys(aggregates).length > 0 && (
            <div className="flex items-center gap-3 text-[11px]">
              {Object.entries(aggregates).map(([key, val]) => {
                const [field, aggType] = key.split('_');
                return (
                  <div key={key} className="flex items-center gap-1 bg-white/70 dark:bg-zinc-900/70 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                    <span className="text-zinc-400 uppercase text-[9px] font-bold">{aggType}:</span>
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                      {typeof val === 'number' ? val.toLocaleString() : val}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};
