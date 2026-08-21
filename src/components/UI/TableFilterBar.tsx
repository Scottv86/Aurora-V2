import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, X, Check, Search, Calendar, User, 
  Hash, Type, CheckSquare, Layers, SlidersHorizontal
} from 'lucide-react';
import { cn } from './Primitives';
import { getFieldValue } from '../../lib/utils';

export type FilterFieldType = 
  | 'text' 
  | 'select' 
  | 'status' 
  | 'user' 
  | 'date' 
  | 'number' 
  | 'currency' 
  | 'boolean' 
  | 'tag';

export type FilterOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'contains' 
  | 'not_contains' 
  | 'starts_with' 
  | 'ends_with' 
  | 'in' 
  | 'not_in' 
  | 'gt' 
  | 'lt' 
  | 'gte' 
  | 'lte' 
  | 'between' 
  | 'is_empty' 
  | 'not_empty' 
  | 'date_today' 
  | 'date_yesterday' 
  | 'date_past_7_days' 
  | 'date_past_30_days' 
  | 'date_this_month' 
  | 'date_before' 
  | 'date_after' 
  | 'date_between'
  | 'is_me'
  | 'is_unassigned';

export interface FilterFieldOption {
  id: string;
  label: string;
  type?: FilterFieldType;
  options?: (string | { label: string; value: string; color?: string })[];
  userOptions?: { id: string; name: string; avatarUrl?: string; email?: string }[];
  icon?: React.ReactNode;
}

export interface TableFilterClause {
  id: string;
  fieldId: string;
  operator: FilterOperator;
  value: any;
  valueSecondary?: any; // For 'between' operators
}

export interface TableFilterState {
  matchType: 'and' | 'or';
  clauses: TableFilterClause[];
}

export const getDefaultOperatorForType = (type?: FilterFieldType): FilterOperator => {
  switch (type) {
    case 'select':
    case 'status':
    case 'tag':
      return 'in';
    case 'user':
      return 'in';
    case 'date':
      return 'date_past_7_days';
    case 'number':
    case 'currency':
      return 'gt';
    case 'boolean':
      return 'equals';
    case 'text':
    default:
      return 'contains';
  }
};

export const getOperatorLabel = (operator: FilterOperator): string => {
  switch (operator) {
    case 'equals': return 'is';
    case 'not_equals': return 'is not';
    case 'contains': return 'contains';
    case 'not_contains': return 'does not contain';
    case 'starts_with': return 'starts with';
    case 'ends_with': return 'ends with';
    case 'in': return 'is any of';
    case 'not_in': return 'is none of';
    case 'gt': return '>';
    case 'lt': return '<';
    case 'gte': return '≥';
    case 'lte': return '≤';
    case 'between': return 'is between';
    case 'is_empty': return 'is empty';
    case 'not_empty': return 'is not empty';
    case 'date_today': return 'is today';
    case 'date_yesterday': return 'was yesterday';
    case 'date_past_7_days': return 'is in past 7 days';
    case 'date_past_30_days': return 'is in past 30 days';
    case 'date_this_month': return 'is this month';
    case 'date_before': return 'is before';
    case 'date_after': return 'is after';
    case 'date_between': return 'is between';
    case 'is_me': return 'is @me';
    case 'is_unassigned': return 'is unassigned';
    default: return operator;
  }
};

const getFieldIcon = (type?: FilterFieldType) => {
  switch (type) {
    case 'select':
    case 'status':
    case 'tag':
      return <Layers size={12} className="text-amber-500" />;
    case 'user':
      return <User size={12} className="text-indigo-500" />;
    case 'date':
      return <Calendar size={12} className="text-emerald-500" />;
    case 'number':
    case 'currency':
      return <Hash size={12} className="text-blue-500" />;
    case 'boolean':
      return <CheckSquare size={12} className="text-purple-500" />;
    case 'text':
    default:
      return <Type size={12} className="text-zinc-400" />;
  }
};

// --- Record Evaluator Helper ---
export const evaluateTableFilterClause = (
  record: any, 
  clause: TableFilterClause, 
  _fieldDef?: FilterFieldOption, 
  currentUserId?: string
): boolean => {
  const { fieldId, operator, value, valueSecondary } = clause;
  const rawVal = getFieldValue(record, fieldId);

  const isEmpty = (v: any) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

  if (operator === 'is_empty') return isEmpty(rawVal);
  if (operator === 'not_empty') return !isEmpty(rawVal);

  if (operator === 'is_unassigned') {
    return isEmpty(rawVal);
  }

  if (operator === 'is_me') {
    if (!currentUserId) return true;
    if (typeof rawVal === 'object' && rawVal !== null) {
      return String(rawVal.id || rawVal.userId || rawVal.name || '').toLowerCase() === String(currentUserId).toLowerCase();
    }
    return String(rawVal || '').toLowerCase() === String(currentUserId).toLowerCase();
  }

  // Value normalization
  const normalize = (v: any): string[] => {
    if (v === undefined || v === null) return [];
    if (Array.isArray(v)) return v.map(normalize).flat();
    if (typeof v === 'object') {
      return [v.id, v.value, v.name, v.email, v.label].filter(Boolean).map(x => String(x).toLowerCase());
    }
    return [String(v).toLowerCase()];
  };

  const actuals = normalize(rawVal);

  // Date operators
  if (operator.startsWith('date_')) {
    if (isEmpty(rawVal)) return false;
    const dateVal = new Date(rawVal).getTime();
    if (isNaN(dateVal)) return false;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;

    switch (operator) {
      case 'date_today':
        return dateVal >= startOfToday && dateVal <= endOfToday;
      case 'date_yesterday': {
        const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
        const endOfYesterday = startOfToday - 1;
        return dateVal >= startOfYesterday && dateVal <= endOfYesterday;
      }
      case 'date_past_7_days': {
        const sevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;
        return dateVal >= sevenDaysAgo && dateVal <= endOfToday;
      }
      case 'date_past_30_days': {
        const thirtyDaysAgo = startOfToday - 30 * 24 * 60 * 60 * 1000;
        return dateVal >= thirtyDaysAgo && dateVal <= endOfToday;
      }
      case 'date_this_month': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
        return dateVal >= startOfMonth && dateVal <= endOfMonth;
      }
      case 'date_is':
      case 'date_on':
      case 'date_equals': {
        if (!value) return true;
        const targetDate = new Date(value);
        if (isNaN(targetDate.getTime())) return false;
        try {
          const rowIso = new Date(rawVal).toISOString().split('T')[0];
          const targetIso = targetDate.toISOString().split('T')[0];
          if (rowIso === targetIso) return true;
        } catch (e) {}
        const rowLocal = new Date(rawVal).toLocaleDateString();
        const targetLocal = targetDate.toLocaleDateString();
        return rowLocal === targetLocal;
      }
      case 'date_before': {
        if (!value) return true;
        const target = new Date(value).getTime();
        return dateVal < target;
      }
      case 'date_after': {
        if (!value) return true;
        const target = new Date(value).getTime();
        return dateVal > target;
      }
      case 'date_between': {
        if (!value && !valueSecondary) return true;
        const start = value ? new Date(value).getTime() : 0;
        const end = valueSecondary ? new Date(valueSecondary).getTime() + 24 * 60 * 60 * 1000 - 1 : Infinity;
        return dateVal >= start && dateVal <= end;
      }
    }
  }

  // Numeric operators
  if (['gt', 'lt', 'gte', 'lte', 'between'].includes(operator)) {
    const num = Number(rawVal);
    if (isNaN(num)) return false;
    const target = Number(value);
    switch (operator) {
      case 'gt': return num > target;
      case 'lt': return num < target;
      case 'gte': return num >= target;
      case 'lte': return num <= target;
      case 'between': {
        const min = Number(value);
        const max = Number(valueSecondary);
        return (!isNaN(min) ? num >= min : true) && (!isNaN(max) ? num <= max : true);
      }
    }
  }

  // Multi-select / In operators
  if (operator === 'in') {
    const expected = Array.isArray(value) ? value.map(v => String(v).toLowerCase()) : [String(value).toLowerCase()];
    if (expected.length === 0) return true;
    return actuals.some(a => expected.includes(a));
  }

  if (operator === 'not_in') {
    const expected = Array.isArray(value) ? value.map(v => String(v).toLowerCase()) : [String(value).toLowerCase()];
    if (expected.length === 0) return true;
    return !actuals.some(a => expected.includes(a));
  }

  // String & Equality operators
  const compareStr = String(value || '').toLowerCase();

  // If this is a date field or value is a date, check calendar day match
  if (_fieldDef?.type === 'date' || fieldId.toLowerCase().includes('date') || fieldId.toLowerCase().includes('at')) {
    if (rawVal && value) {
      try {
        const rowDate = new Date(rawVal);
        const targetDate = new Date(value);
        if (!isNaN(rowDate.getTime()) && !isNaN(targetDate.getTime())) {
          const rowIso = rowDate.toISOString().split('T')[0];
          const targetIso = targetDate.toISOString().split('T')[0];
          if (rowIso === targetIso || rowDate.toLocaleDateString() === targetDate.toLocaleDateString()) {
            if (operator === 'is' || operator === 'equals' || operator === 'contains') return true;
            if (operator === 'is_not' || operator === 'not_equals') return false;
          }
        }
      } catch (e) {}
    }
  }

  switch (operator) {
    case 'is':
    case 'equals':
      if (Array.isArray(value)) {
        return value.some(v => actuals.includes(String(v).toLowerCase()));
      }
      return actuals.includes(compareStr) || actuals.some(a => a.toLowerCase() === compareStr);
    case 'is_not':
    case 'not_equals':
      if (Array.isArray(value)) {
        return !value.some(v => actuals.includes(String(v).toLowerCase()));
      }
      return !actuals.includes(compareStr);
    case 'contains':
      if (!compareStr) return true;
      return actuals.some(a => a.includes(compareStr));
    case 'not_contains':
      if (!compareStr) return true;
      return !actuals.some(a => a.includes(compareStr));
    case 'starts_with':
      return actuals.some(a => a.startsWith(compareStr));
    case 'ends_with':
      return actuals.some(a => a.endsWith(compareStr));
    default:
      return true;
  }
};

export const filterRecordsByTableFilterState = <T extends Record<string, any>>(
  records: T[],
  filterState?: TableFilterState,
  fieldDefs?: FilterFieldOption[],
  currentUserId?: string
): T[] => {
  if (!filterState || !filterState.clauses || filterState.clauses.length === 0) {
    return records;
  }

  const fieldMap = new Map((fieldDefs || []).map(f => [f.id, f]));

  return records.filter(record => {
    if (filterState.matchType === 'or') {
      return filterState.clauses.some(clause => 
        evaluateTableFilterClause(record, clause, fieldMap.get(clause.fieldId), currentUserId)
      );
    } else {
      return filterState.clauses.every(clause => 
        evaluateTableFilterClause(record, clause, fieldMap.get(clause.fieldId), currentUserId)
      );
    }
  });
};

// --- Clause Editor Popover Component ---
interface ClausePopoverProps {
  clause: TableFilterClause;
  fieldDef: FilterFieldOption;
  onUpdate: (updated: Partial<TableFilterClause>) => void;
  onDelete: () => void;
  onClose: () => void;
  triggerRect: DOMRect | null;
  currentUserName?: string;
}

const ClausePopover: React.FC<ClausePopoverProps> = ({
  clause,
  fieldDef,
  onUpdate,
  onDelete,
  onClose,
  triggerRect,
  currentUserName: _currentUserName = 'Me'
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [searchOption, setSearchOption] = useState('');

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [onClose]);

  if (!triggerRect) return null;

  const style: React.CSSProperties = {
    position: 'fixed',
    top: Math.min(triggerRect.bottom + 6, window.innerHeight - 340),
    left: Math.min(Math.max(12, triggerRect.left), window.innerWidth - 320),
    zIndex: 9999
  };

  const fieldType = fieldDef.type || 'text';

  // Available operators based on type
  const operatorsForType: FilterOperator[] = useMemo(() => {
    switch (fieldType) {
      case 'select':
      case 'status':
      case 'tag':
        return ['in', 'not_in', 'is_empty', 'not_empty'];
      case 'user':
        return ['is_me', 'is_unassigned', 'in', 'not_in'];
      case 'date':
        return [
          'date_today', 'date_yesterday', 'date_past_7_days', 'date_past_30_days', 
          'date_this_month', 'date_before', 'date_after', 'date_between', 'is_empty', 'not_empty'
        ];
      case 'number':
      case 'currency':
        return ['gt', 'lt', 'gte', 'lte', 'equals', 'not_equals', 'between', 'is_empty', 'not_empty'];
      case 'boolean':
        return ['equals', 'not_equals'];
      case 'text':
      default:
        return ['contains', 'not_contains', 'equals', 'not_equals', 'starts_with', 'ends_with', 'is_empty', 'not_empty'];
    }
  }, [fieldType]);

  // Options list for Select / Status / Tag / User
  const normalizedOptions = useMemo(() => {
    if (fieldType === 'user' && fieldDef.userOptions) {
      return fieldDef.userOptions.map(u => ({ label: u.name, value: u.id, avatarUrl: u.avatarUrl }));
    }
    return (fieldDef.options || []).map(opt => {
      if (typeof opt === 'string') return { label: opt, value: opt };
      return opt;
    });
  }, [fieldDef, fieldType]);

  const filteredOptions = useMemo(() => {
    if (!searchOption.trim()) return normalizedOptions;
    const q = searchOption.toLowerCase();
    return normalizedOptions.filter(o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [normalizedOptions, searchOption]);

  const isMultiSelectValue = ['in', 'not_in'].includes(clause.operator);
  const currentArrayVal = Array.isArray(clause.value) ? clause.value : (clause.value ? [clause.value] : []);

  const toggleArrayOption = (optVal: string) => {
    const next = currentArrayVal.includes(optVal)
      ? currentArrayVal.filter(v => v !== optVal)
      : [...currentArrayVal, optVal];
    onUpdate({ value: next });
  };

  return createPortal(
    <div 
      ref={popoverRef}
      style={style}
      className="w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-3.5 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150 text-xs"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-800 pb-2">
        <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100">
          {getFieldIcon(fieldType)}
          <span>{fieldDef.label}</span>
        </div>
        <button 
          onClick={onDelete}
          className="text-red-500 hover:text-red-600 dark:hover:text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
          title="Remove Filter"
        >
          <X size={13} />
        </button>
      </div>

      {/* Operator Selector */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1 block">
          Operator
        </label>
        <select
          value={clause.operator}
          onChange={(e) => {
            const nextOp = e.target.value as FilterOperator;
            onUpdate({ 
              operator: nextOp, 
              value: ['is_empty', 'not_empty', 'date_today', 'date_yesterday', 'date_past_7_days', 'date_past_30_days', 'date_this_month', 'is_me', 'is_unassigned'].includes(nextOp) 
                ? null 
                : clause.value 
            });
          }}
          className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
        >
          {operatorsForType.map(op => (
            <option key={op} value={op}>{getOperatorLabel(op)}</option>
          ))}
        </select>
      </div>

      {/* Value Input by Field Type & Operator */}
      {!['is_empty', 'not_empty', 'date_today', 'date_yesterday', 'date_past_7_days', 'date_past_30_days', 'date_this_month', 'is_me', 'is_unassigned'].includes(clause.operator) && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Value
          </label>

          {/* Select / Status / Tag / User Multi-Picker */}
          {isMultiSelectValue ? (
            <div className="flex flex-col gap-1.5">
              {normalizedOptions.length > 5 && (
                <div className="relative">
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search options..."
                    value={searchOption}
                    onChange={(e) => setSearchOption(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-7 pr-2 py-1 text-[11px] text-zinc-800 dark:text-zinc-200 focus:outline-none"
                  />
                </div>
              )}
              <div className="max-h-40 overflow-y-auto custom-scrollbar flex flex-col gap-0.5 border border-zinc-150 dark:border-zinc-800 rounded-xl p-1 bg-zinc-50/50 dark:bg-zinc-900/50">
                {filteredOptions.map((opt: any) => {
                  const isChecked = currentArrayVal.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleArrayOption(opt.value)}
                      className={cn(
                        "flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors",
                        isChecked 
                          ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium" 
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {opt.avatarUrl && (
                          <img src={opt.avatarUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
                        )}
                        {opt.color && (
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                        )}
                        <span className="truncate">{opt.label}</span>
                      </div>
                      {isChecked && <Check size={12} className="shrink-0 text-indigo-600 dark:text-indigo-400" />}
                    </button>
                  );
                })}
                {filteredOptions.length === 0 && (
                  <p className="text-center text-[10px] text-zinc-400 py-3">No options found</p>
                )}
              </div>
            </div>
          ) : clause.operator === 'between' || clause.operator === 'date_between' ? (
            <div className="grid grid-cols-2 gap-2">
              <input
                type={clause.operator === 'date_between' ? 'date' : 'number'}
                value={clause.value || ''}
                onChange={(e) => onUpdate({ value: e.target.value })}
                placeholder="From"
                className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
              />
              <input
                type={clause.operator === 'date_between' ? 'date' : 'number'}
                value={clause.valueSecondary || ''}
                onChange={(e) => onUpdate({ valueSecondary: e.target.value })}
                placeholder="To"
                className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          ) : ['date_before', 'date_after'].includes(clause.operator) ? (
            <input
              type="date"
              value={clause.value || ''}
              onChange={(e) => onUpdate({ value: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
          ) : ['number', 'currency'].includes(fieldType) ? (
            <input
              type="number"
              value={clause.value ?? ''}
              onChange={(e) => onUpdate({ value: e.target.value })}
              placeholder="Enter number..."
              className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
          ) : (
            <input
              type="text"
              value={clause.value ?? ''}
              onChange={(e) => onUpdate({ value: e.target.value })}
              placeholder="Enter text..."
              className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
          )}
        </div>
      )}

      {/* Done Button */}
      <button
        type="button"
        onClick={onClose}
        className="w-full mt-1 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-colors shadow-xs"
      >
        Apply
      </button>
    </div>,
    document.body
  );
};

// --- Add Filter Popover ---
interface AddFilterMenuProps {
  fields: FilterFieldOption[];
  onSelectField: (field: FilterFieldOption) => void;
  onClose: () => void;
  triggerRect: DOMRect | null;
}

const AddFilterMenu: React.FC<AddFilterMenuProps> = ({
  fields,
  onSelectField,
  onClose,
  triggerRect
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [onClose]);

  if (!triggerRect) return null;

  const style: React.CSSProperties = {
    position: 'fixed',
    top: Math.min(triggerRect.bottom + 6, window.innerHeight - 300),
    left: Math.min(Math.max(12, triggerRect.left), window.innerWidth - 260),
    zIndex: 9999
  };

  const filtered = fields.filter(f => 
    f.label.toLowerCase().includes(search.toLowerCase()) || 
    f.id.toLowerCase().includes(search.toLowerCase())
  );

  return createPortal(
    <div
      ref={menuRef}
      style={style}
      className="w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-2 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150 text-xs"
    >
      <div className="relative px-1 pt-1">
        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          autoFocus
          placeholder="Search fields to filter..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-7 pr-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="max-h-56 overflow-y-auto custom-scrollbar flex flex-col gap-0.5 mt-1">
        {filtered.map(field => (
          <button
            key={field.id}
            type="button"
            onClick={() => {
              onSelectField(field);
              onClose();
            }}
            className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            {field.icon || getFieldIcon(field.type)}
            <span className="font-medium truncate flex-1">{field.label}</span>
            <span className="text-[10px] text-zinc-400 font-mono uppercase">{field.type || 'text'}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-[10px] text-zinc-400 py-3">No matching fields</p>
        )}
      </div>
    </div>,
    document.body
  );
};

// --- Active Filter Pill ---
const FilterPill: React.FC<{
  clause: TableFilterClause;
  fieldDef?: FilterFieldOption;
  onUpdate?: (updated: Partial<TableFilterClause>) => void;
  onDelete: () => void;
  isActiveEditing: boolean;
  onOpenEdit: (rect: DOMRect) => void;
}> = ({ clause, fieldDef, onUpdate: _onUpdate, onDelete, isActiveEditing, onOpenEdit }) => {
  const pillRef = useRef<HTMLButtonElement>(null);

  const valueDisplay = useMemo(() => {
    if (['is_empty', 'not_empty', 'date_today', 'date_yesterday', 'date_past_7_days', 'date_past_30_days', 'date_this_month', 'is_me', 'is_unassigned'].includes(clause.operator)) {
      return null;
    }
    if (clause.operator === 'between' || clause.operator === 'date_between') {
      return `${clause.value || '...'} - ${clause.valueSecondary || '...'}`;
    }

    const resolveItemLabel = (val: any) => {
      if (val === undefined || val === null || val === '') return '...';
      if (val === '__me__') return 'Current User';
      if (val === '__unassigned__') return 'Unassigned';
      if (fieldDef?.type === 'user' || fieldDef?.userOptions) {
        const matchUser = (fieldDef?.userOptions || []).find((u: any) => 
          u.id === val || u.cuid === val || u.memberId === val || u.userId === val
        );
        if (matchUser) return matchUser.name || (matchUser as any).user?.name || matchUser.email || val;
      }
      const match = fieldDef?.options?.find(o => (typeof o === 'string' ? o : o.value) === val);
      if (match) return typeof match === 'object' ? match.label : match;
      return String(val);
    };

    if (Array.isArray(clause.value)) {
      if (clause.value.length === 0) return 'None';
      if (clause.value.length === 1) {
        return resolveItemLabel(clause.value[0]);
      }
      if (clause.value.length <= 2) {
        return clause.value.map(resolveItemLabel).join(', ');
      }
      return `${clause.value.length} selected`;
    }
    return resolveItemLabel(clause.value);
  }, [clause, fieldDef]);

  const handleClick = () => {
    if (pillRef.current) {
      onOpenEdit(pillRef.current.getBoundingClientRect());
    }
  };

  return (
    <div className="inline-flex items-center rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs overflow-hidden text-xs">
      <button
        ref={pillRef}
        type="button"
        onClick={handleClick}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/50 transition-colors select-none",
          isActiveEditing && "ring-1 ring-indigo-500 bg-indigo-100/80 dark:bg-indigo-900/70"
        )}
      >
        <span className="font-semibold">{fieldDef?.label || clause.fieldId}</span>
        <span className="text-[11px] text-indigo-600 dark:text-indigo-400 opacity-80">{getOperatorLabel(clause.operator)}</span>
        {valueDisplay && (
          <span className="font-bold bg-white/60 dark:bg-black/30 px-1.5 py-0.5 rounded-md text-[11px] max-w-[120px] truncate">
            {valueDisplay}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="px-1.5 py-1 text-indigo-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
        title="Remove filter"
      >
        <X size={12} />
      </button>
    </div>
  );
};

import { SavedViewsSelector } from './SavedViewsSelector';

// --- Main TableFilterBar Component ---
export interface TableFilterBarProps {
  fields: FilterFieldOption[];
  filterState?: TableFilterState;
  onChange: (nextState: TableFilterState) => void;
  className?: string;
  totalFilteredRecords?: number;
  totalRecords?: number;
  currentUserName?: string;
  currentUserId?: string;
  targetFieldToOpen?: string | null;
  onClearTargetFieldToOpen?: () => void;
  enableSavedViews?: boolean;
  scopeType?: 'MODULE' | 'QUEUE' | 'WORKSPACE';
  scopeId?: string;
  tenantId?: string;
  token?: string;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export const TableFilterBar: React.FC<TableFilterBarProps> = ({
  fields,
  filterState = { matchType: 'and', clauses: [] },
  onChange,
  className,
  totalFilteredRecords: _totalFilteredRecords,
  totalRecords: _totalRecords,
  currentUserName,
  currentUserId,
  targetFieldToOpen,
  onClearTargetFieldToOpen,
  enableSavedViews,
  scopeType,
  scopeId,
  tenantId,
  token,
  leftSlot,
  rightSlot
}) => {
  const [addMenuRect, setAddMenuRect] = useState<DOMRect | null>(null);
  const [activeEditingClauseId, setActiveEditingClauseId] = useState<string | null>(null);
  const [clausePopoverRect, setClausePopoverRect] = useState<DOMRect | null>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  const fieldMap = useMemo(() => new Map(fields.map(f => [f.id, f])), [fields]);

  // Handle external request to open a field filter (e.g. from column header)
  useEffect(() => {
    if (!targetFieldToOpen) return;
    
    // Check if clause already exists for this field
    const existing = filterState.clauses.find(c => c.fieldId === targetFieldToOpen);
    if (existing) {
      setActiveEditingClauseId(existing.id);
      if (addBtnRef.current) {
        setClausePopoverRect(addBtnRef.current.getBoundingClientRect());
      }
    } else {
      // Add new clause for this field
      const fieldDef = fieldMap.get(targetFieldToOpen);
      if (fieldDef) {
        const newClause: TableFilterClause = {
          id: Math.random().toString(36).substring(2, 9),
          fieldId: fieldDef.id,
          operator: getDefaultOperatorForType(fieldDef.type),
          value: null
        };
        onChange({
          ...filterState,
          clauses: [...filterState.clauses, newClause]
        });
        setActiveEditingClauseId(newClause.id);
        if (addBtnRef.current) {
          setClausePopoverRect(addBtnRef.current.getBoundingClientRect());
        }
      }
    }

    if (onClearTargetFieldToOpen) onClearTargetFieldToOpen();
  }, [targetFieldToOpen, filterState, fieldMap, onChange, onClearTargetFieldToOpen]);

  const handleAddClause = (field: FilterFieldOption) => {
    const newClause: TableFilterClause = {
      id: Math.random().toString(36).substring(2, 9),
      fieldId: field.id,
      operator: getDefaultOperatorForType(field.type),
      value: null
    };
    onChange({
      ...filterState,
      clauses: [...filterState.clauses, newClause]
    });
    // Immediately open editor for the new clause
    setActiveEditingClauseId(newClause.id);
    if (addBtnRef.current) {
      setClausePopoverRect(addBtnRef.current.getBoundingClientRect());
    }
  };

  const handleUpdateClause = (clauseId: string, updated: Partial<TableFilterClause>) => {
    onChange({
      ...filterState,
      clauses: filterState.clauses.map(c => c.id === clauseId ? { ...c, ...updated } : c)
    });
  };

  const handleDeleteClause = (clauseId: string) => {
    onChange({
      ...filterState,
      clauses: filterState.clauses.filter(c => c.id !== clauseId)
    });
    if (activeEditingClauseId === clauseId) {
      setActiveEditingClauseId(null);
      setClausePopoverRect(null);
    }
  };

  const handleClearAll = () => {
    onChange({
      ...filterState,
      clauses: []
    });
    setActiveEditingClauseId(null);
    setClausePopoverRect(null);
  };

  const toggleMatchType = () => {
    onChange({
      ...filterState,
      matchType: filterState.matchType === 'and' ? 'or' : 'and'
    });
  };

  const activeEditingClause = filterState.clauses.find(c => c.id === activeEditingClauseId);
  const activeEditingFieldDef = activeEditingClause ? fieldMap.get(activeEditingClause.fieldId) : undefined;

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2.5 py-2 px-3 sm:px-4 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800 min-h-[44px]", className)}>
      {/* Left side items: Title/LeftSlot + Saved Views + Filter + Pills */}
      <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
        {leftSlot}

        {/* Saved Views Selector */}
        {enableSavedViews && scopeId && (
          <div className="flex items-center gap-2">
            <SavedViewsSelector
              fields={fields}
              scopeType={scopeType || 'MODULE'}
              scopeId={scopeId}
              tenantId={tenantId}
              token={token}
              currentUserId={currentUserId}
              activeFilterState={filterState}
              onApplyView={(_view, newFilterState) => {
                onChange(newFilterState);
              }}
            />
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 shrink-0" />
          </div>
        )}

        {/* Active Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <AnimatePresence mode="popLayout">
            {filterState.clauses.map(clause => (
              <motion.div
                key={clause.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
              >
                <FilterPill
                  clause={clause}
                  fieldDef={fieldMap.get(clause.fieldId)}
                  onUpdate={(updated) => handleUpdateClause(clause.id, updated)}
                  onDelete={() => handleDeleteClause(clause.id)}
                  isActiveEditing={activeEditingClauseId === clause.id}
                  onOpenEdit={(rect) => {
                    setActiveEditingClauseId(clause.id);
                    setClausePopoverRect(rect);
                  }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* "+ Filter" Button */}
        <button
          ref={addBtnRef}
          type="button"
          onClick={() => {
            if (addBtnRef.current) {
              setAddMenuRect(addBtnRef.current.getBoundingClientRect());
            }
          }}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-500 bg-white/50 dark:bg-zinc-800/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-300 text-xs font-medium transition-all shadow-2xs cursor-pointer"
        >
          <SlidersHorizontal size={12} className="text-zinc-400" />
          <span>Filter</span>
          {filterState.clauses.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-bold ml-0.5">
              {filterState.clauses.length}
            </span>
          )}
        </button>

        {/* Match Condition (AND / OR) if multiple clauses */}
        {filterState.clauses.length > 1 && (
          <button
            type="button"
            onClick={toggleMatchType}
            className="px-2 py-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-800 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
            title="Click to toggle between matching ALL or ANY conditions"
          >
            Match: <span className="text-indigo-600 dark:text-indigo-400">{filterState.matchType.toUpperCase()}</span>
          </button>
        )}

        {/* Clear All Button */}
        {filterState.clauses.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Right side items: Search + Charts + Edit Mode + Focus + HeaderActions */}
      {rightSlot && (
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {rightSlot}
        </div>
      )}

      {/* Add Filter Menu Popover */}
      {addMenuRect && (
        <AddFilterMenu
          fields={fields}
          onSelectField={handleAddClause}
          onClose={() => setAddMenuRect(null)}
          triggerRect={addMenuRect}
        />
      )}

      {/* Active Clause Editor Popover */}
      {activeEditingClause && activeEditingFieldDef && clausePopoverRect && (
        <ClausePopover
          clause={activeEditingClause}
          fieldDef={activeEditingFieldDef}
          onUpdate={(updated) => handleUpdateClause(activeEditingClause.id, updated)}
          onDelete={() => handleDeleteClause(activeEditingClause.id)}
          onClose={() => {
            setActiveEditingClauseId(null);
            setClausePopoverRect(null);
          }}
          triggerRect={clausePopoverRect}
          currentUserName={currentUserName}
        />
      )}
    </div>
  );
};
