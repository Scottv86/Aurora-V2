import React, { useState } from 'react';
import { 
  User, Mail, ExternalLink, Calendar, Clock, AlertTriangle, 
  HelpCircle, ChevronDown, Check, ArrowUpRight, ShieldCheck, Sparkles 
} from 'lucide-react';
import { cn } from '../Primitives';

// ==========================================
// 1. PERSON / USER SEMANTIC CELL
// ==========================================
export interface PersonData {
  id?: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
  status?: 'online' | 'busy' | 'away' | 'offline';
}

export const PersonCell: React.FC<{
  person?: PersonData | string;
  onContact?: (email: string) => void;
  className?: string;
}> = ({ person, onContact, className }) => {
  const [showPopover, setShowPopover] = useState(false);

  if (!person) {
    return <span className="text-zinc-400 dark:text-zinc-500 italic text-xs">Unassigned</span>;
  }

  const p: PersonData = typeof person === 'string' ? { name: person, email: person.includes('@') ? person : undefined } : person;
  const initials = (p.name || p.email || '?')
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const presenceColor = {
    online: 'bg-emerald-500 ring-white dark:ring-zinc-900',
    busy: 'bg-rose-500 ring-white dark:ring-zinc-900',
    away: 'bg-amber-500 ring-white dark:ring-zinc-900',
    offline: 'bg-zinc-400 ring-white dark:ring-zinc-900',
  }[p.status || 'online'];

  return (
    <div 
      className={cn("relative inline-flex items-center gap-2 max-w-full group", className)}
      onMouseEnter={() => setShowPopover(true)}
      onMouseLeave={() => setShowPopover(false)}
    >
      <div className="relative flex-shrink-0">
        {p.avatarUrl ? (
          <img 
            src={p.avatarUrl} 
            alt={p.name || 'User'} 
            className="w-6 h-6 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-700" 
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold flex items-center justify-center ring-1 ring-indigo-200 dark:ring-indigo-800">
            {initials}
          </div>
        )}
        <span className={cn("absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2", presenceColor)} />
      </div>

      <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
        {p.name || p.email || 'Unknown User'}
      </span>

      {/* Mini Profile Popover */}
      {showPopover && (
        <div className="absolute left-0 bottom-full mb-2 z-50 w-56 p-3 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 text-left animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="relative">
              {p.avatarUrl ? (
                <img src={p.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 font-semibold flex items-center justify-center text-xs">
                  {initials}
                </div>
              )}
              <span className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2", presenceColor)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{p.name || 'User'}</p>
              {p.role && <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{p.role}</p>}
            </div>
          </div>
          {p.email && (
            <p className="text-[11px] text-zinc-600 dark:text-zinc-300 truncate mb-2 flex items-center gap-1.5">
              <Mail size={12} className="text-zinc-400 flex-shrink-0" />
              {p.email}
            </p>
          )}
          {p.email && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onContact) onContact(p.email!);
                else window.open(`mailto:${p.email}`);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1 px-2 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition-colors"
            >
              <Mail size={11} /> Send Email
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 2. STATUS & WORKFLOW CELL
// ==========================================
export interface StatusConfig {
  label: string;
  value: string;
  color?: string; // hex or tailwind class
  allowedTransitions?: string[];
}

export const StatusCell: React.FC<{
  value?: string;
  options?: (string | StatusConfig)[];
  canTransition?: boolean;
  onStatusChange?: (newStatus: string) => void;
  className?: string;
}> = ({ value, options = [], canTransition = false, onStatusChange, className }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!value) {
    return <span className="text-zinc-400 text-xs">—</span>;
  }

  const rawVal = String(value);
  const normalizedVal = rawVal.toLowerCase();

  // Determine badge styling based on standard semantics or custom options
  const getBadgeStyle = (statusStr: string) => {
    const s = statusStr.toLowerCase();
    if (s.includes('done') || s.includes('approved') || s.includes('completed') || s.includes('success') || s.includes('active')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';
    }
    if (s.includes('progress') || s.includes('review') || s.includes('pending') || s.includes('running')) {
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
    }
    if (s.includes('reject') || s.includes('error') || s.includes('failed') || s.includes('cancelled') || s.includes('blocked')) {
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60';
    }
    if (s.includes('draft') || s.includes('todo') || s.includes('new') || s.includes('backlog')) {
      return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';
    }
    return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60';
  };

  const badgeClasses = getBadgeStyle(rawVal);

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        type="button"
        disabled={!canTransition || options.length === 0}
        onClick={(e) => {
          if (!canTransition || options.length === 0) return;
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all select-none",
          badgeClasses,
          canTransition && options.length > 0 && "hover:shadow-sm cursor-pointer active:scale-95"
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
        <span>{rawVal}</span>
        {canTransition && options.length > 0 && (
          <ChevronDown size={12} className="opacity-60 -mr-0.5" />
        )}
      </button>

      {/* Transition Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
          <div className="absolute left-0 top-full mt-1.5 z-50 w-44 p-1 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
              Transition Status
            </div>
            {options.map((opt) => {
              const optVal = typeof opt === 'string' ? opt : opt.value;
              const optLabel = typeof opt === 'string' ? opt : opt.label;
              const isSelected = optVal.toLowerCase() === normalizedVal;

              return (
                <button
                  key={optVal}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    if (onStatusChange && optVal !== rawVal) {
                      onStatusChange(optVal);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left",
                    isSelected 
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold"
                      : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/70"
                  )}
                >
                  <span className="truncate">{optLabel}</span>
                  {isSelected && <Check size={12} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

// ==========================================
// 3. DATE & TIME SEMANTIC CELL
// ==========================================
export const DateCell: React.FC<{
  value?: string | number | Date | null;
  includeTime?: boolean;
  overdueThresholdDays?: number;
  className?: string;
}> = ({ value, includeTime = false, overdueThresholdDays, className }) => {
  if (!value) return <span className="text-zinc-400 text-xs">—</span>;

  const dateObj = new Date(value);
  if (isNaN(dateObj.getTime())) return <span className="text-zinc-400 text-xs">{String(value)}</span>;

  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const isPast = diffMs < 0;

  // Relative label
  let relativeText = '';
  if (Math.abs(diffDays) === 0) {
    relativeText = 'Today';
  } else if (diffDays === 1) {
    relativeText = 'Tomorrow';
  } else if (diffDays === -1) {
    relativeText = 'Yesterday';
  } else if (Math.abs(diffDays) < 30) {
    relativeText = isPast ? `${Math.abs(diffDays)}d ago` : `in ${diffDays}d`;
  } else {
    relativeText = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const isOverdue = isPast && Math.abs(diffDays) > (overdueThresholdDays ?? 0);

  const formattedFull = dateObj.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {})
  });

  return (
    <div 
      className={cn("inline-flex items-center gap-1.5 text-xs", className)} 
      title={formattedFull}
    >
      <Calendar size={13} className={isOverdue ? "text-rose-500 flex-shrink-0" : "text-zinc-400 dark:text-zinc-500 flex-shrink-0"} />
      <span className={cn(
        "font-medium",
        isOverdue ? "text-rose-600 dark:text-rose-400 font-semibold" : "text-zinc-700 dark:text-zinc-300"
      )}>
        {relativeText}
      </span>
      {isOverdue && (
        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
          Overdue
        </span>
      )}
    </div>
  );
};

// ==========================================
// 4. CURRENCY & NUMBER SEMANTIC CELL
// ==========================================
export const CurrencyCell: React.FC<{
  amount?: number | string | null;
  currency?: string;
  locale?: string;
  showTrend?: boolean;
  className?: string;
}> = ({ amount, currency = 'USD', locale = 'en-US', showTrend = false, className }) => {
  if (amount === undefined || amount === null || amount === '') {
    return <span className="text-zinc-400 text-xs">—</span>;
  }

  const num = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/[^0-9.-]+/g, ''));
  if (isNaN(num)) return <span className="text-zinc-500 text-xs">{String(amount)}</span>;

  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 2
  }).format(num);

  return (
    <div className={cn("inline-flex items-center gap-1 font-mono text-xs", className)}>
      <span className={cn(
        "font-semibold",
        num < 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-900 dark:text-zinc-100"
      )}>
        {formatted}
      </span>
    </div>
  );
};

// ==========================================
// 5. CALCULATED & LINEAGE SEMANTIC CELL
// ==========================================
export interface LineageInfo {
  formulaName?: string;
  baseAmount?: number | string;
  adjustments?: { name: string; value: string | number }[];
  ruleName?: string;
  ruleVersion?: string;
  evaluatedAt?: string;
  expression?: string;
}

export const CalculatedCell: React.FC<{
  value: React.ReactNode;
  lineage?: LineageInfo;
  onExplain?: (lineage: LineageInfo) => void;
  className?: string;
}> = ({ value, lineage, onExplain, className }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div 
      className={cn("relative inline-flex items-center gap-1.5 group", className)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 underline decoration-dotted decoration-indigo-400/60 underline-offset-2">
        {value}
      </span>

      {lineage && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onExplain) onExplain(lineage);
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-all cursor-pointer"
          title="Explain this calculation"
        >
          <Sparkles size={12} />
        </button>
      )}

      {/* Mini Lineage Hover Card */}
      {showTooltip && lineage && (
        <div className="absolute left-0 bottom-full mb-1.5 z-50 w-64 p-2.5 bg-zinc-900 text-white rounded-xl shadow-2xl border border-zinc-800 text-left text-xs animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 mb-2">
            <span className="font-semibold text-[11px] text-indigo-400 flex items-center gap-1">
              <Sparkles size={11} /> {lineage.formulaName || 'Calculated Field'}
            </span>
            {lineage.ruleVersion && (
              <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">
                {lineage.ruleVersion}
              </span>
            )}
          </div>
          {lineage.expression && (
            <code className="block bg-zinc-950 px-2 py-1 rounded text-[10px] text-zinc-300 font-mono mb-2 border border-zinc-800">
              {lineage.expression}
            </code>
          )}
          {lineage.adjustments && lineage.adjustments.length > 0 && (
            <div className="space-y-1 mb-2 text-[11px] text-zinc-300">
              {lineage.adjustments.map((adj, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-zinc-400">{adj.name}:</span>
                  <span className="font-mono font-medium">{adj.value}</span>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onExplain) onExplain(lineage);
            }}
            className="w-full text-center text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 mt-1 pt-1 border-t border-zinc-800 flex items-center justify-center gap-1 cursor-pointer"
          >
            Full Calculation Trace <ArrowUpRight size={10} />
          </button>
        </div>
      )}
    </div>
  );
};
