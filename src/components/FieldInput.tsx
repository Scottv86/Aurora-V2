import React from 'react';
import { 
  Check, Info, AlertTriangle, XCircle, 
  Smile, ArrowRight, Star, Trash2,
  ChevronDown, Search, ArrowRightLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { RichTextEditor } from './UI/RichTextEditor';
import { SignaturePad } from './UI/SignaturePad';
import { DynamicIcon } from './UI/DynamicIcon';
import { usePlatformLookup } from '../hooks/usePlatformLookup';
import { DatePicker } from './UI/DatePicker';
import { TimePicker } from './UI/TimePicker';
import { UserSelector } from './Common/UserSelector';
import { resolveConstraint } from '../services/fieldService';
import { useFormula } from '../hooks/useFormula';
import { usePlatform } from '../hooks/usePlatform';
import { useAuth } from '../hooks/useAuth';
import { API_BASE_URL } from '../config';
import { useParams } from 'react-router-dom';

const SearchableLookup = ({ 
  value, 
  onChange, 
  results, 
  loading, 
  placeholder, 
  inputClasses,
  readonly,
  platformEntity,
  onBlur,
  onKeyDown,
  field
}: any) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [openUp, setOpenUp] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const { tenant } = usePlatform();
  const { session } = useAuth();
  const { moduleId, id } = useParams();
  const activeModuleId = moduleId || id;

  const isConnector = (field?.lookupSource || field?.optionsSource) === 'connector';
  const [connectorResults, setConnectorResults] = React.useState<any[]>([]);
  const [connectorLoading, setConnectorLoading] = React.useState(false);
  const [lastSearchedQuery, setLastSearchedQuery] = React.useState('');

  // Execute connector lookup search
  const executeSearch = React.useCallback(async (query: string) => {
    if (!isConnector || !field.connectorId) return;

    // Check minSearchLength constraint
    const minLen = field.minSearchLength !== undefined ? field.minSearchLength : 1;
    if (query.length < minLen) {
      setConnectorResults([]);
      setLastSearchedQuery(query);
      return;
    }

    setConnectorLoading(true);
    setLastSearchedQuery(query);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const searchParam = field.connectorSearchParam || 'query';

      const res = await fetch(`${API_BASE_URL}/api/nexus-proxy/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify({
          connectorId: field.connectorId,
          moduleId: activeModuleId,
          noReshape: true,
          payload: {
            [searchParam]: query
          }
        })
      });

      if (!res.ok) throw new Error("Connector search failed");
      const json = await res.json();
      const rawData = json.data || json;

      const arrayData = Array.isArray(rawData) ? rawData : (rawData && typeof rawData === 'object' && Object.keys(rawData).length > 0) ? [rawData] : [];

      let mappedResults = arrayData.map((item: any, idx: number) => {
        const rawItem = typeof item === 'object' ? item : { value: item };
        const labelField = field.connectorLabelField || 'name';
        const valueField = field.connectorValueField || 'id';

        return {
          id: String(rawItem[valueField] !== undefined ? rawItem[valueField] : (rawItem.id || rawItem.value || idx)),
          name: String(rawItem[labelField] !== undefined ? rawItem[labelField] : (rawItem.name || rawItem.value || JSON.stringify(rawItem))),
          raw: rawItem
        };
      });

      // Apply maxResults limit if configured
      if (field.maxResults !== undefined && field.maxResults > 0) {
        mappedResults = mappedResults.slice(0, field.maxResults);
      }

      setConnectorResults(mappedResults);
    } catch (err) {
      console.error("Connector lookup search error:", err);
      setConnectorResults([]);
    } finally {
      setConnectorLoading(false);
    }
  }, [isConnector, field?.connectorId, field?.minSearchLength, field?.connectorSearchParam, field?.connectorLabelField, field?.connectorValueField, field?.maxResults, session?.access_token, tenant?.id, activeModuleId]);

  // Debounced search for automatic connector-backed lookups
  React.useEffect(() => {
    if (!isConnector || !field.connectorId || !isOpen || field.searchMode === 'manual') return;

    // Check minSearchLength constraint before scheduling debounce
    const minLen = field.minSearchLength !== undefined ? field.minSearchLength : 1;
    if (search.length < minLen) {
      setConnectorResults([]);
      setLastSearchedQuery(search);
      return;
    }

    const delay = field.debounceDelay !== undefined ? field.debounceDelay : 350;
    const delayDebounceFn = setTimeout(() => {
      executeSearch(search);
    }, delay);

    return () => clearTimeout(delayDebounceFn);
  }, [search, isOpen, isConnector, field?.connectorId, field?.searchMode, field?.minSearchLength, field?.debounceDelay, executeSearch]);

  // Reset lastSearchedQuery when dropdown opens
  React.useEffect(() => {
    if (isOpen) {
      setLastSearchedQuery('');
    }
  }, [isOpen]);

  // Auto-focus when becoming editable
  React.useEffect(() => {
    if (!readonly && inputRef.current) {
      inputRef.current.focus();
    }
  }, [readonly]);

  React.useLayoutEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUp(spaceBelow < 280);
    }
  }, [isOpen]);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [localName, setLocalName] = React.useState('');

  const selectedItem = React.useMemo(() => {
    const found = results.find((r: any) => r.id === value);
    if (found) return found;
    if (value && isConnector) {
      return { id: value, name: value };
    }
    return null;
  }, [results, value, isConnector]);
  
  // Sync local name with selected item when not focused
  React.useEffect(() => {
    if (!isOpen) {
      setLocalName(selectedItem?.name || '');
    }
  }, [selectedItem, isOpen]);

  const filteredResults = React.useMemo(() => {
    if (!search) return results;
    return results.filter((r: any) => (r.name || '').toLowerCase().includes(search.toLowerCase()));
  }, [results, search]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [search]);

  // Override results and loading
  const displayResults = isConnector ? connectorResults : filteredResults;
  const displayLoading = isConnector ? connectorLoading : loading;

  const handleLocalKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      if (onKeyDown) onKeyDown(e);
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => (displayResults.length > 0 ? (prev + 1) % displayResults.length : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (displayResults.length > 0 ? (prev - 1 + displayResults.length) % displayResults.length : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (isConnector && field.searchMode === 'manual' && search !== lastSearchedQuery) {
          executeSearch(search);
        } else {
          const item = displayResults[activeIndex];
          if (item) {
            setLocalName(item.name);
            onChange(item.id, item.raw || item);
            setIsOpen(false);
            setSearch('');
            if (inputRef.current) inputRef.current.blur();
            onBlur?.();
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }

    if (onKeyDown) onKeyDown(e);
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
        <input 
          ref={inputRef}
          type="text"
          placeholder={displayLoading ? 'Loading...' : placeholder || `Search ${platformEntity || 'records'}...`}
          value={isOpen ? search : localName}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => {
            if (readonly) return;
            setIsOpen(true);
            setSearch('');
          }}
          readOnly={readonly}
          onBlur={onBlur}
          onKeyDown={handleLocalKeyDown}
          className={cn(
            inputClasses, 
            "pl-11", 
            isConnector && field.searchMode === 'manual' && isOpen ? "pr-28" : "pr-10", 
            readonly ? "cursor-pointer pointer-events-none" : "cursor-text"
          )}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isConnector && field.searchMode === 'manual' && isOpen && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent input blur before click registers
              }}
              onClick={(e) => {
                e.stopPropagation();
                executeSearch(search);
              }}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm flex items-center gap-1 shrink-0"
            >
              <Search size={10} />
              <span>Search</span>
            </button>
          )}
          {value && !readonly && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onChange(null, null);
                setLocalName('');
                setSearch('');
                setIsOpen(false);
              }}
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <XCircle size={14} />
            </button>
          )}
          {displayLoading && <div className="w-3 h-3 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />}
          <ChevronDown className={cn("text-zinc-400 transition-transform", isOpen && "rotate-180")} size={14} />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && !readonly && (
          <motion.div 
            initial={{ opacity: 0, y: openUp ? -10 : 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: openUp ? -10 : 10, scale: 0.95 }}
            className={cn(
              "absolute z-[100] left-0 right-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-h-64 flex flex-col",
              openUp ? "bottom-full mb-2" : "top-full mt-2"
            )}
          >
            <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {displayResults.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    {field.noResultsMessage || 'No results found'}
                  </p>
                </div>
              ) : (
                displayResults.map((item: any, idx: number) => (
                  <button
                    key={item.id}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent input blur before click registers
                    }}
                    onClick={(e) => {
                      e.stopPropagation(); // Stop bubbling to wrapper
                      setLocalName(item.name);
                      onChange(item.id, item.raw || item);
                      setIsOpen(false);
                      setSearch('');
                      if (inputRef.current) inputRef.current.blur();
                      onBlur?.();
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      "w-full text-left px-4 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between group",
                      value === item.id
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                        : activeIndex === idx
                          ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                          : "text-zinc-600 dark:text-zinc-300"
                    )}
                  >
                    <span className="truncate">{item.name}</span>
                    {value === item.id && <Check size={14} />}
                    {(value !== item.id && activeIndex === idx) && <ArrowRight size={12} className="translate-x-0 transition-all text-zinc-400" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface FieldInputProps {
  field: any;
  value: any;
  onChange: (value: any, metadata?: any) => void;
  readonly?: boolean;
  error?: boolean;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  recordData?: Record<string, any>;
  allFields?: any[];
  lookupData?: any;
  autoFocus?: boolean;
  density?: 'compact' | 'standard' | 'spacious';
  isMouseDownRef?: React.RefObject<boolean>;
  disabled?: boolean;
}

const FieldInputInner: React.FC<FieldInputProps> = ({ 
  field, 
  value, 
  onChange, 
  readonly = false,
  error = false,
  onBlur,
  onKeyDown,
  recordData = {},
  allFields = [],
  autoFocus = false,
  density = 'standard',
  isMouseDownRef,
  disabled = false
}) => {
  const { type, label, placeholder, options, min, max, variant, optionsSource, lookupSource, optionLayout } = field;
  const effectiveSource = lookupSource || optionsSource;

  const getDensityClasses = (d: 'compact' | 'standard' | 'spacious') => {
    switch (d) {
      case 'compact':
        return {
          input: 'h-8 px-2.5 rounded-lg text-[10px]',
          select: 'h-8 px-2 py-0.5 rounded-lg text-[10px]',
          checkbox: 'w-3.5 h-3.5 rounded',
          checkboxIconSize: 10,
          radio: 'w-3.5 h-3.5',
          radioDot: 'w-1.5 h-1.5',
          text: 'text-[10px]',
          switchContainer: 'w-8 h-4.5 rounded-full',
          switchDot: 'w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out',
          switchTranslate: 'translate-x-2.5',
          badge: 'px-1.5 py-0.5 text-[8px]'
        };
      case 'spacious':
        return {
          input: 'h-13 px-5 rounded-2xl text-sm',
          select: 'h-13 px-4 py-2.5 rounded-2xl text-sm',
          checkbox: 'w-5 h-5 rounded-md',
          checkboxIconSize: 14,
          radio: 'w-5 h-5',
          radioDot: 'w-2.5 h-2.5',
          text: 'text-sm',
          switchContainer: 'w-11 h-6.5 rounded-full',
          switchDot: 'w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out',
          switchTranslate: 'translate-x-4',
          badge: 'px-3 py-1.5 text-[11px]'
        };
      case 'standard':
      default:
        return {
          input: 'h-10 px-3.5 rounded-xl text-xs',
          select: 'h-10 px-3 py-1.5 rounded-xl text-xs',
          checkbox: 'w-4 h-4 rounded',
          checkboxIconSize: 12,
          radio: 'w-4 h-4',
          radioDot: 'w-2 h-2',
          text: 'text-xs',
          switchContainer: 'w-9 h-5 rounded-full',
          switchDot: 'w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out',
          switchTranslate: 'translate-x-3',
          badge: 'px-2 py-1 text-[9px]'
        };
    }
  };

  const ds = getDensityClasses(density);

  // Resolve constraints
  const minConstraint = (type === 'date' || type === 'time') ? resolveConstraint(field, 'min', recordData) : undefined;
  const maxConstraint = (type === 'date' || type === 'time') ? resolveConstraint(field, 'max', recordData) : undefined;

  const { data: lookupResults, loading: lookupLoading } = usePlatformLookup(
    (lookupSource || (optionsSource && optionsSource !== 'manual') || type === 'datatable') ? field : null
  );
  const inputRef = React.useRef<any>(null);

  // Auto-focus logic
  React.useEffect(() => {
    if (autoFocus && inputRef.current) {
      if (typeof inputRef.current.focus === 'function') {
        inputRef.current.focus();
      }
    }
  }, [autoFocus]);

  // Auto-focus and open dropdown when select becomes active
  React.useEffect(() => {
    if (!readonly && type === 'select' && inputRef.current) {
      inputRef.current.focus();
      try {
        if (typeof inputRef.current.showPicker === 'function') {
          inputRef.current.showPicker();
        }
      } catch (e: any) {
        if (e?.name !== 'NotAllowedError') {
          console.warn("showPicker is not supported or failed:", e);
        }
      }
    }
  }, [readonly, type]);

  const [localValue, setLocalValue] = React.useState(value);
  const localValueRef = React.useRef(value);
  const [isFocused, setIsFocused] = React.useState(false);
  const lastSentValueRef = React.useRef<any>(null);

  const updateLocalValue = (val: any) => {
    localValueRef.current = val;
    setLocalValue(val);
  };

  const triggerImmediateChange = (val: any, metadata?: any) => {
    updateLocalValue(val);
    lastSentValueRef.current = val;
    onChange(val, metadata);
  };

  const prevValueRef = React.useRef(value);

  // Sync with external value prop when not actively focused/editing
  React.useEffect(() => {
    const valuePropChanged = JSON.stringify(value) !== JSON.stringify(prevValueRef.current);
    prevValueRef.current = value;

    if (!isFocused) {
      // If the incoming value matches what we just sent, we are in sync
      if (JSON.stringify(value) === JSON.stringify(lastSentValueRef.current)) {
        lastSentValueRef.current = null;
      }
      
      // If the external value prop was actively changed/reverted by the parent, force sync
      if (valuePropChanged) {
        lastSentValueRef.current = null;
        updateLocalValue(value);
      } else if (lastSentValueRef.current === null) {
        updateLocalValue(value);
      }
    }
  }, [value, isFocused]);

  const triggerSave = (val: any = localValueRef.current, metadata?: any) => {
    if (JSON.stringify(val) === JSON.stringify(lastSentValueRef.current)) return;
    
    if (JSON.stringify(val) !== JSON.stringify(value)) {
      lastSentValueRef.current = val;
      onChange(val, metadata);
    }
  };

  const handleBlur = (e?: React.FocusEvent) => {
    if (isMouseDownRef?.current) {
      return;
    }
    // If we're clicking inside a group (like radio buttons), don't blur yet
    if (e?.currentTarget && e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    
    triggerSave();
    setIsFocused(false);
    onBlur?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // For textarea, Enter should still allow newlines unless Ctrl/Cmd is pressed
      if (type === 'longText' && !e.ctrlKey && !e.metaKey) return;
      
      e.preventDefault();
      e.stopPropagation();
      triggerSave();
      
      // Force blur to ensure visual lock
      if (inputRef.current) {
        inputRef.current.blur();
      }
      
      onKeyDown?.(e);
    }
    if (e.key === 'Escape') {
      setIsFocused(false);
      onKeyDown?.(e);
    }
  };

  const resolvedOptions = React.useMemo(() => {
    if (lookupSource || (optionsSource && optionsSource !== 'manual')) {
      if (lookupLoading) return [];
      return lookupResults.map(r => r.name);
    }
    return options || [];
  }, [lookupSource, optionsSource, options, lookupResults, lookupLoading]);

  const inputClasses = cn(
    "w-full bg-zinc-50 dark:bg-zinc-950/50 border focus:outline-none transition-all text-zinc-900 dark:text-white",
    ds.input,
    error 
      ? "border-rose-500 bg-rose-500/5 focus:border-rose-600 ring-4 ring-rose-500/5" 
      : "border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-950",
    readonly && "cursor-pointer pointer-events-none"
  );

  // Layout & Content Components (No Value)
  if (type === 'heading') {
    const rawTag = options?.[0] || 'h2';
    const Tag = (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(rawTag) ? rawTag : 'h2') as React.ElementType;
    const size = Tag === 'h1' ? 'text-2xl' : Tag === 'h2' ? 'text-xl' : 'text-lg';
    return <Tag className={cn("font-bold text-zinc-900 dark:text-white tracking-tight", size)}>{label}</Tag>;
  }

  if (type === 'divider') {
    return <div className="h-px w-full bg-zinc-200 dark:border-zinc-800 my-4" />;
  }

  if (type === 'alert') {
    const style = options?.[0] === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600' :
                  options?.[0] === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' :
                  options?.[0] === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' :
                  'bg-indigo-500/10 border-indigo-500/20 text-indigo-600';
    const Icon = options?.[0] === 'error' ? XCircle :
                 options?.[0] === 'warning' ? AlertTriangle :
                 options?.[0] === 'success' ? Check : Info;
    return (
      <div className={cn("p-4 rounded-2xl border flex items-center gap-3", style)}>
        <Icon size={18} />
        <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
      </div>
    );
  }

  if (type === 'html') {
    return <div dangerouslySetInnerHTML={{ __html: label || '' }} />;
  }

  // Action Components
  if (type === 'button') {
    return (
      <button
        type="button"
        className={cn(
          "px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
          variant === 'secondary' ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white" :
          variant === 'outline' ? "border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white" :
          variant === 'danger' ? "bg-rose-500 text-white" :
          "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
        )}
      >
        {label}
      </button>
    );
  }

  // Data Input Components
  if (type === 'select') {
    return (
      <div className="relative w-full">
        <select 
          ref={inputRef}
          value={localValue || ''}
          disabled={readonly}
          onChange={(e) => { 
            const selectedVal = e.target.value;
            setIsFocused(true); 
            const matchedItem = lookupResults?.find((item: any) => String(item.id) === selectedVal || String(item.name) === selectedVal);
            triggerImmediateChange(selectedVal, matchedItem);
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          className={cn(inputClasses, "appearance-none")}
        >
          <option value="" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Select...</option>
          {effectiveSource === 'connector' ? (
            lookupResults?.map((opt: any, j: number) => (
              <option key={j} value={opt.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">{opt.name}</option>
            ))
          ) : (
            resolvedOptions?.map((opt: string, j: number) => (
              <option key={j} value={opt} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">{opt}</option>
            ))
          )}
        </select>
        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
      </div>
    );
  }

  if (type === 'radio') {
    return (
      <div 
        className={cn(
          "w-full outline-none", 
          optionLayout === 'horizontal' ? "flex flex-wrap gap-x-6 gap-y-2" : "grid gap-1 grid-cols-1"
        )} 
        tabIndex={0} 
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
      >
        {effectiveSource === 'connector' ? (
          lookupResults?.map((opt: any, i: number) => (
            <div 
              key={i} 
              className={cn(
                "flex items-center gap-3 cursor-pointer group p-1.5 rounded-xl border-2 transition-all",
                localValue === opt.id 
                  ? "border-transparent" 
                  : "border-transparent hover:border-zinc-100 dark:hover:border-zinc-800",
                disabled && "cursor-not-allowed opacity-60"
              )}
              onClick={(e) => {
                if (disabled) return;
                triggerImmediateChange(opt.id, opt);
                const input = e.currentTarget.querySelector('input');
                if (input) input.focus();
                onBlur?.();
              }}
            >
              <div className={cn(
                ds.radio,
                "rounded-full border-2 flex items-center justify-center transition-all",
                localValue === opt.id ? "border-indigo-500 bg-indigo-500" : "border-zinc-200 dark:border-zinc-800"
              )}>
                {localValue === opt.id && <div className={cn(ds.radioDot, "rounded-full bg-white")} />}
              </div>
              <input 
                type="radio" 
                className="sr-only" 
                checked={localValue === opt.id} 
                disabled={disabled}
                onChange={() => {}} 
              />
              <span className={cn(ds.text, "font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors")}>{opt.name}</span>
            </div>
          ))
        ) : (
          resolvedOptions?.map((opt: string, i: number) => (
            <div 
              key={i} 
              className={cn(
                "flex items-center gap-3 cursor-pointer group p-1.5 rounded-xl border-2 transition-all",
                localValue === opt 
                  ? "border-transparent" 
                  : "border-transparent hover:border-zinc-100 dark:hover:border-zinc-800",
                disabled && "cursor-not-allowed opacity-60"
              )}
              onClick={(e) => {
                if (disabled) return;
                triggerImmediateChange(opt);
                const input = e.currentTarget.querySelector('input');
                if (input) input.focus();
                onBlur?.();
              }}
            >
              <div className={cn(
                ds.radio,
                "rounded-full border-2 flex items-center justify-center transition-all",
                localValue === opt ? "border-indigo-500 bg-indigo-500" : "border-zinc-200 dark:border-zinc-800"
              )}>
                {localValue === opt && <div className={cn(ds.radioDot, "rounded-full bg-white")} />}
              </div>
              <input 
                type="radio" 
                className="sr-only" 
                checked={localValue === opt} 
                disabled={disabled}
                onChange={() => {}} 
              />
              <span className={cn(ds.text, "font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors")}>{opt}</span>
            </div>
          ))
        )}
      </div>
    );
  }

  if (type === 'checkboxGroup' || type === 'tag') {
    const currentValues = Array.isArray(localValue) ? localValue : [];
    return (
      <div 
        className="space-y-2.5 w-full outline-none" 
        tabIndex={0} 
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
      >
        {type === 'tag' && (
          <div className="flex flex-wrap gap-2 p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl mb-4">
            {currentValues.length === 0 ? (
              <span className="text-[10px] text-zinc-400 italic px-2 py-1">No tags selected</span>
            ) : (
              currentValues.map((v, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500 text-white rounded-lg text-[10px] font-bold animate-in zoom-in-95 duration-200">
                  {v}
                  {!readonly && (
                    <button onClick={(e) => { e.stopPropagation(); triggerImmediateChange(currentValues.filter(val => val !== v)); }} className="hover:text-white/80 transition-colors">
                      <XCircle size={12} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
        <div className={cn(
          type === 'tag' ? "grid gap-1 grid-cols-2 md:grid-cols-3" : 
          optionLayout === 'horizontal' ? "flex flex-wrap gap-x-6 gap-y-2" : "grid gap-1 grid-cols-1"
        )}>
          {effectiveSource === 'connector' ? (
            lookupResults?.map((opt: any, i: number) => {
              const optVal = opt.id;
              const isChecked = currentValues.includes(optVal);
              return (
                <div 
                  key={i} 
                  className={cn(
                    "flex items-center gap-3 cursor-pointer group p-1.5 rounded-xl border-2 transition-all",
                    isChecked 
                      ? "border-transparent" 
                      : "border-transparent hover:border-zinc-100 dark:hover:border-zinc-800",
                    disabled && "cursor-not-allowed opacity-60"
                  )}
                  onClick={(e) => {
                    if (disabled) return;
                    const newValues = isChecked
                      ? currentValues.filter(v => v !== optVal)
                      : [...currentValues, optVal];
                    triggerImmediateChange(newValues);
                    const input = e.currentTarget.querySelector('input');
                    if (input) input.focus();
                  }}
                >
                  <div className={cn(
                    ds.checkbox,
                    "border-2 flex items-center justify-center transition-all",
                    isChecked ? "border-indigo-500 bg-indigo-500 text-white" : "border-zinc-200 dark:border-zinc-800"
                  )}>
                    {isChecked && <Check size={ds.checkboxIconSize} strokeWidth={4} />}
                  </div>
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={isChecked} 
                    disabled={disabled}
                    onChange={() => {}} 
                  />
                  <span className={cn(ds.text, "font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors")}>{opt.name}</span>
                </div>
              );
            })
          ) : (
            resolvedOptions?.map((opt: string, i: number) => {
              const isChecked = currentValues.includes(opt);
              return (
                <div 
                  key={i} 
                  className={cn(
                    "flex items-center gap-3 cursor-pointer group p-1.5 rounded-xl border-2 transition-all",
                    isChecked 
                      ? "border-transparent" 
                      : "border-transparent hover:border-zinc-100 dark:hover:border-zinc-800",
                    disabled && "cursor-not-allowed opacity-60"
                  )}
                  onClick={(e) => {
                    if (disabled) return;
                    const newValues = isChecked
                      ? currentValues.filter(v => v !== opt)
                      : [...currentValues, opt];
                    triggerImmediateChange(newValues);
                    const input = e.currentTarget.querySelector('input');
                    if (input) input.focus();
                  }}
                >
                  <div className={cn(
                    ds.checkbox,
                    "border-2 flex items-center justify-center transition-all",
                    isChecked ? "border-indigo-500 bg-indigo-500 text-white" : "border-zinc-200 dark:border-zinc-800"
                  )}>
                    {isChecked && <Check size={ds.checkboxIconSize} strokeWidth={4} />}
                  </div>
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={isChecked} 
                    disabled={disabled}
                    onChange={() => {}} 
                  />
                  <span className={cn(ds.text, "font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors")}>{opt}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  if (type === 'toggle' || type === 'checkbox' || type === 'boolean') {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          const newVal = !localValue;
          setIsFocused(true);
          triggerImmediateChange(newVal);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        className={cn(
          ds.switchContainer,
          "transition-all relative flex items-center px-1",
          localValue ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-800",
          disabled && "opacity-60 cursor-not-allowed"
        )}
      >
        <div className={cn(
          ds.switchDot,
          localValue ? ds.switchTranslate : "translate-x-0"
        )} />
      </button>
    );
  }

  if (type === 'slider') {
    return (
      <div className="space-y-4">
        <input 
          type="range" 
          min={min || 0} 
          max={max || 100} 
          value={localValue || 0}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          onChange={(e) => {
            if (disabled) return;
            triggerImmediateChange(parseInt(e.target.value));
          }}
          className={cn("w-full accent-indigo-600", disabled && "opacity-60 cursor-not-allowed")}
        />
        <div className="flex justify-between text-[10px] font-black text-zinc-400 uppercase tracking-widest">
          <span>{min || 0}</span>
          <span className="text-indigo-500">{localValue || 0}</span>
          <span>{max || 100}</span>
        </div>
      </div>
    );
  }

  if (type === 'richtext') {
    return <RichTextEditor value={localValue || ''} onChange={(val) => { updateLocalValue(val); setIsFocused(true); }} placeholder={placeholder} readonly={readonly} onBlur={handleBlur} />;
  }

  if (type === 'signature_pad') {
    return <SignaturePad value={localValue || ''} onChange={(val) => { updateLocalValue(val); setIsFocused(true); }} onBlur={handleBlur} />;
  }

  if (type === 'rating') {
    return (
      <div 
        className={cn("flex gap-2 outline-none", disabled && "pointer-events-none opacity-60")}
        tabIndex={0}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
      >
        {[1, 2, 3, 4, 5].map(i => (
          <button 
            key={i} 
            type="button"
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              triggerImmediateChange(i);
            }}
            className={cn(
              "p-2 rounded-xl transition-all",
              (localValue || 0) >= i ? "text-amber-500 bg-amber-500/10" : "text-zinc-300 hover:text-zinc-400 bg-zinc-100 dark:bg-zinc-900"
            )}
          >
            <Star size={20} fill={(localValue || 0) >= i ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
    );
  }

  if (type === 'colorpicker') {
    return (
      <div className={cn("flex items-center gap-4", readonly && "pointer-events-none")}>
        <input 
          type="color" 
          value={localValue || '#6366f1'} 
          disabled={readonly}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          onChange={(e) => triggerImmediateChange(e.target.value)}
          className="w-12 h-12 rounded-2xl border-none p-0 overflow-hidden cursor-pointer bg-transparent"
        />
        <input 
          type="text" 
          value={localValue || '#6366f1'} 
          disabled={readonly}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          onChange={(e) => triggerImmediateChange(e.target.value)}
          className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs font-mono uppercase"
        />
      </div>
    );
  }

  if (type === 'progress') {
    return (
      <div className="w-full h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-indigo-600 transition-all" 
          style={{ width: `${((value || 0) - (min || 0)) / ((max || 100) - (min || 0)) * 100}%` }} 
        />
      </div>
    );
  }

  if (type === 'icon') {
    return (
      <div className="p-6 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] flex items-center justify-center">
        <Smile size={48} className="text-zinc-200 dark:text-zinc-800" />
      </div>
    );
  }

  if (type === 'datatable') {
    const activeDensity = field.density || density || 'standard';
    const paddingClass = 
      activeDensity === 'compact' ? 'px-3 py-1.5' : 
      activeDensity === 'spacious' ? 'px-6 py-4' : 
      'px-4 py-3';

    const headerTextSize = 
      activeDensity === 'compact' ? 'text-[9px]' : 
      'text-[10px]';

    const bodyTextSize = 
      activeDensity === 'compact' ? 'text-[11px]' : 
      'text-xs';

    const footerPadding = 
      activeDensity === 'compact' ? 'p-2' : 
      activeDensity === 'spacious' ? 'p-4' : 
      'p-3';

    return (
      <div className="w-full border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className={cn(paddingClass, headerTextSize, "font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap")}>Source Record</th>
                {lookupResults[0] && Object.keys(lookupResults[0]).filter(k => !['id', 'name', '_metadata', 'createdAt', 'updatedAt'].includes(k)).slice(0, 3).map(key => (
                  <th key={key} className={cn(paddingClass, headerTextSize, "font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap")}>{key.replace(/([A-Z])/g, ' $1').trim()}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {lookupLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Fetching Table Data...</p>
                    </div>
                  </td>
                </tr>
              ) : lookupResults.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">No data available</td>
                </tr>
              ) : (
                lookupResults.slice(0, 5).map((row, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                    <td className={cn(paddingClass, bodyTextSize, "font-bold text-indigo-600 dark:text-indigo-400")}>{row.name}</td>
                    {Object.entries(row).filter(([k]) => !['id', 'name', '_metadata', 'createdAt', 'updatedAt'].includes(k)).slice(0, 3).map(([, v], i) => (
                      <td key={i} className={cn(paddingClass, bodyTextSize, "text-zinc-600 dark:text-zinc-400 truncate max-w-[150px]")}>{String(v)}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {lookupResults.length > 5 && (
          <div className={cn(footerPadding, "bg-zinc-50/50 dark:bg-zinc-900/20 border-t border-zinc-200 dark:border-zinc-800 flex justify-center")}>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">+{lookupResults.length - 5} more records</span>
          </div>
        )}
      </div>
    );
  }

  if (type === 'duallist') {
    const currentValues = Array.isArray(localValue) ? localValue : [];
    return (
      <div 
        className={cn("flex gap-4 h-64 outline-none", readonly && "pointer-events-none")} 
        tabIndex={0} 
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
      >
        {/* Available Source */}
        <div className="flex-1 flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 overflow-hidden">
          <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Available</span>
            <span className="text-[9px] font-bold text-zinc-500">{(resolvedOptions as string[]).filter((opt: string) => !currentValues.includes(opt)).length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {(resolvedOptions as string[]).filter((opt: string) => !currentValues.includes(opt)).map((opt: string, i: number) => (
              <button 
                key={i}
                type="button"
                disabled={readonly}
                onClick={() => triggerImmediateChange([...currentValues, opt])}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-indigo-600 flex items-center justify-between group transition-all"
              >
                {opt}
                <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center items-center gap-2">
          <ArrowRightLeft size={16} className="text-zinc-300" />
        </div>

        {/* Selected Target */}
        <div className="flex-1 flex flex-col border border-indigo-500/20 rounded-2xl bg-indigo-500/[0.02] overflow-hidden">
          <div className="px-4 py-2 bg-indigo-500/5 border-b border-indigo-500/10 flex items-center justify-between">
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Selected</span>
            <span className="text-[9px] font-bold text-indigo-500">{currentValues.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {currentValues.map((v, i) => (
              <button 
                key={i}
                type="button"
                disabled={readonly}
                onClick={() => triggerImmediateChange(currentValues.filter(val => val !== v))}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-sm flex items-center justify-between group animate-in slide-in-from-right-2 duration-200"
              >
                {v}
                <Trash2 size={12} className="opacity-60 group-hover:opacity-100 transition-all" />
              </button>
            ))}
            {currentValues.length === 0 && (
              <div className="h-full flex items-center justify-center p-8 text-center">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic leading-relaxed opacity-50">Choose items from the left to add them here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'buttonGroup') {
    return (
      <div 
        className={cn("flex flex-wrap gap-2 outline-none", disabled && "pointer-events-none opacity-60")}
        tabIndex={0}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
      >
        {resolvedOptions?.map((opt: string, i: number) => (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              triggerImmediateChange(opt);
            }}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
              localValue === opt 
                ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:border-zinc-200"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  // Standard Inputs
  if (type === 'date') return <DatePicker value={localValue} onChange={(val) => { updateLocalValue(val); setIsFocused(true); }} readonly={readonly} onBlur={handleBlur} dateFormat={field.dateFormat} excludeWeekends={field.excludeWeekends} min={minConstraint} max={maxConstraint} />;
  if (type === 'time') return <TimePicker value={localValue} onChange={(val) => { updateLocalValue(val); setIsFocused(true); }} readonly={readonly} onBlur={handleBlur} timeFormat={field.timeFormat} minuteStep={field.minuteStep} min={minConstraint} max={maxConstraint} />;
  if (type === 'number' || type === 'currency') return (
    <div className="relative w-full">
      {type === 'currency' && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">$</span>}
      <input 
        ref={inputRef}
        type="number" 
        value={localValue || ''} 
        onChange={(e) => { setIsFocused(true); updateLocalValue(e.target.value); }}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus={autoFocus}
        readOnly={readonly}
        className={cn(inputClasses, "appearance-none", type === 'currency' ? "pl-8 pr-4" : "px-4")} 
      />
    </div>
  );

  if (type === 'longText') return <textarea ref={inputRef} value={localValue || ''} onChange={(e) => { setIsFocused(true); updateLocalValue(e.target.value); }} onFocus={() => setIsFocused(true)} onBlur={handleBlur} onKeyDown={handleKeyDown} autoFocus={autoFocus} readOnly={readonly} className={inputClasses} />;

  if (type === 'user') {
    return (
      <UserSelector 
        value={localValue}
        onChange={(id) => { updateLocalValue(id); setIsFocused(true); triggerSave(id); }}
        placeholder={placeholder || "Select User..."}
        readonly={readonly}
        onBlur={handleBlur}
      />
    );
  }

  if (type === 'lookup') {
    return (
      <LookupInput 
        field={field}
        value={localValue}
        onChange={(val: any, metadata?: any) => { 
          updateLocalValue(val); 
          triggerSave(val, metadata);
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        readonly={readonly}
        inputClasses={inputClasses}
        lookupResults={lookupResults}
        lookupLoading={lookupLoading}
      />
    );
  }

  const formulaPreview = useFormula(type === 'calculation' ? (field.calculationLogic || field.logic || field.expression || '') : '', recordData, allFields);

  if (type === 'ai_summary' || type === 'calculation' || type === 'autonumber') {
    const isErrorOrPlaceholder = !value || value === 'Error' || value === 'Value will be calculated after saving.';
    const rawValue = (type === 'calculation' && isErrorOrPlaceholder && formulaPreview.result !== null && formulaPreview.result !== undefined) ? formulaPreview.result : value;
    
    let displayValue = rawValue;
    if (type === 'calculation' && field.showAsCurrency && rawValue !== null && rawValue !== undefined && !isNaN(Number(rawValue)) && rawValue !== '') {
       const symbol = field.currencySymbol || '$';
       displayValue = `${symbol}${Number(rawValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    return (
      <div className={cn(inputClasses, "flex items-center justify-between")}>
        <span className="truncate">
          {displayValue || (
            type === 'ai_summary' ? 'AI Summary will be generated after saving.' : 
            type === 'calculation' ? (formulaPreview.isFetching ? 'Calculating...' : 'Value will be calculated after saving.') :
            'Auto-number will be generated after saving.'
          )}
        </span>
        {type === 'calculation' && formulaPreview.isFetching && (
          <div className="w-3 h-3 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        )}
      </div>
    );
  }

  if (type === 'connector') {
    const isGoogleMaps = field.connectorId === 'google-maps-lookup';
    
    return (
      <div className="space-y-2 w-full">
        <div className="relative group">
          {isGoogleMaps && <DynamicIcon name="GoogleMaps" size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />}
          <input 
            type="text"
            placeholder={placeholder || (isGoogleMaps ? "Search address..." : "Enter lookup value...")}
            value={localValue || ''}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onChange={(e) => updateLocalValue(e.target.value)}
            className={cn(inputClasses, isGoogleMaps && "pl-10")}
          />
          {isGoogleMaps && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[8px] font-black text-indigo-500 uppercase tracking-widest">Nexus</div>
            </div>
          )}
        </div>
        {isGoogleMaps && localValue && localValue.length > 3 && (
          <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-2">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Nexus Suggestions</p>
            <button 
              onClick={() => {
                const newVal = `${localValue}, Mock City, MC 12345`;
                updateLocalValue(newVal);
                setIsFocused(true);
                // triggerSave(newVal); // Let blur handle it
              }}
              className="w-full text-left p-2 hover:bg-white dark:hover:bg-zinc-950 rounded-lg text-xs transition-colors flex items-center gap-2 group"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span className="flex-1 truncate">{localValue}, Mock City, MC 12345</span>
              <ArrowRight size={12} className="text-zinc-300 group-hover:text-indigo-500 transition-colors" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Default Fallback
  return (
    <input 
      ref={inputRef}
      type={type === 'email' ? 'email' : type === 'phone' ? 'tel' : type === 'url' ? 'url' : 'text'}
      placeholder={placeholder || `Enter ${(label || 'value').toLowerCase()}...`}
      value={localValue || ''}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onChange={(e) => { setIsFocused(true); updateLocalValue(e.target.value); }}
      autoFocus={!readonly}
      readOnly={readonly}
      className={inputClasses}
    />
  );
};

const LookupInput = ({ field, value, onChange, onBlur, onKeyDown, readonly, inputClasses, lookupResults, lookupLoading }: any) => {
  const { lookupSource, platformEntity } = field;

  if (lookupSource === 'connector') {
    return (
      <SearchableLookup
        value={value}
        onChange={onChange}
        results={[]}
        loading={false}
        placeholder={field.placeholder || `Select ${field.label || 'option'}...`}
        inputClasses={inputClasses}
        readonly={readonly}
        platformEntity={platformEntity}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        field={field}
      />
    );
  }

  return (
    <SearchableLookup
      value={value}
      onChange={onChange}
      results={lookupResults || []}
      loading={lookupLoading}
      placeholder={field.placeholder || `Select ${field.label || 'option'}...`}
      inputClasses={inputClasses}
      readonly={readonly}
      platformEntity={platformEntity}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      field={field}
    />
  );
};

export const FieldInput: React.FC<FieldInputProps> = (props) => {
  const isMouseDownRef = React.useRef(false);

  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      setTimeout(() => {
        isMouseDownRef.current = false;
      }, 0);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const { type } = props.field;
  const isLayoutType = ['heading', 'divider', 'alert', 'html', 'button'].includes(type);

  if (isLayoutType) {
    return <FieldInputInner {...props} />;
  }

  const customOnBlur = props.onBlur ? () => {
    if (isMouseDownRef.current) {
      return;
    }
    props.onBlur?.();
  } : undefined;

  const needsPointerEventsNone = ['select', 'date', 'time', 'user', 'lookup', 'connector', 'number', 'currency', 'longText', 'email', 'phone', 'url', 'text'].includes(type) || !type;

  return (
    <div 
      className={cn("w-full", (props.readonly && needsPointerEventsNone) && "pointer-events-none")}
      onMouseDown={() => { isMouseDownRef.current = true; }}
    >
      <FieldInputInner {...props} onBlur={customOnBlur} isMouseDownRef={isMouseDownRef} />
    </div>
  );
};

