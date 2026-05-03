import React from 'react';
import { useGlobalList } from '../hooks/useGlobalList';
import { 
  Check, AlertCircle, Info, AlertTriangle, XCircle, 
  Smile, User, Calendar, Clock, MapPin, 
  ChevronRight, ArrowRight, Star, Plus, Trash2,
  ChevronDown, Search, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { RichTextEditor } from './UI/RichTextEditor';
import { SignaturePad } from './UI/SignaturePad';
import { DynamicIcon } from './UI/DynamicIcon';
import { usePlatformLookup } from '../hooks/usePlatformLookup';

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
  onKeyDown
}: any) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [openUp, setOpenUp] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUp(spaceBelow < 280);
    }
  }, [isOpen]);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [localName, setLocalName] = React.useState('');

  const selectedItem = React.useMemo(() => results.find((r: any) => r.id === value), [results, value]);
  
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
        setActiveIndex(prev => (filteredResults.length > 0 ? (prev + 1) % filteredResults.length : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (filteredResults.length > 0 ? (prev - 1 + filteredResults.length) % filteredResults.length : 0));
        break;
      case 'Enter':
        e.preventDefault();
        const item = filteredResults[activeIndex];
        if (item) {
          setLocalName(item.name);
          onChange(item.id, item);
          setIsOpen(false);
          setSearch('');
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
          type="text"
          placeholder={loading ? 'Loading...' : placeholder || `Search ${platformEntity || 'records'}...`}
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
          className={cn(inputClasses, "pl-11 pr-10 cursor-text")}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {loading && <div className="w-3 h-3 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />}
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
              {filteredResults.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">No results found</p>
                </div>
              ) : (
                filteredResults.map((item: any, idx: number) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setLocalName(item.name);
                      onChange(item.id, item);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      "w-full text-left px-4 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between group",
                      (value === item.id || activeIndex === idx)
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                        : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    <span className="truncate">{item.name}</span>
                    {value === item.id && <Check size={14} />}
                    {(value !== item.id && activeIndex === idx) && <ArrowRight size={12} className="translate-x-0 transition-all text-white/50" />}
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
  usersData?: any[];
  lookupData?: Record<string, any[]>;
  readonly?: boolean;
  error?: boolean;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export const FieldInput: React.FC<FieldInputProps> = ({ 
  field, 
  value, 
  onChange, 
  usersData = [], 
  lookupData = {},
  readonly = false,
  error = false,
  onBlur,
  onKeyDown
}) => {
  const { type, label, placeholder, options, min, max, variant, helperText, optionsSource, globalListId, lookupSource, platformEntity } = field;

  // Universal Lookup logic is now handled in LookupInput sub-component

  // Global List logic
  const { list: gList, items: gItems, loading: gLoading } = useGlobalList(optionsSource === 'global_list' ? globalListId : null);

  const resolvedOptions = React.useMemo(() => {
    if (optionsSource === 'global_list') {
      if (gLoading) return ['Loading options...'];
      if (!gList || !gItems) return [];
      const displayColId = gList.columns[0]?.id;
      if (!displayColId) return [];
      return gItems.map(item => String(item.data[displayColId] || '')).filter(Boolean);
    }
    return options || [];
  }, [optionsSource, options, gList, gItems, gLoading]);

  const inputClasses = cn(
    "w-full bg-zinc-50/50 dark:bg-zinc-900/50 border rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none transition-all",
    error 
      ? "border-rose-500 bg-rose-500/5 focus:border-rose-600 ring-4 ring-rose-500/5" 
      : "border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-950",
    readonly && "opacity-50 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900"
  );

  // Layout & Content Components (No Value)
  if (type === 'heading') {
    const Tag = (options?.[0] || 'h2') as keyof JSX.IntrinsicElements;
    const size = options?.[0] === 'h1' ? 'text-2xl' : options?.[0] === 'h2' ? 'text-xl' : 'text-lg';
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
          value={value || ''}
          disabled={readonly}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className={cn(inputClasses, "appearance-none")}
        >
          <option value="">Select...</option>
          {resolvedOptions?.map((opt: string, j: number) => (
            <option key={j} value={opt}>{opt}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
      </div>
    );
  }

  if (type === 'radio') {
    return (
      <div className="space-y-2.5 w-full">
        {resolvedOptions?.map((opt: string, i: number) => (
          <label key={i} className="flex items-center gap-3 cursor-pointer group">
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
              value === opt ? "border-indigo-500" : "border-zinc-200 dark:border-zinc-800"
            )}>
              {value === opt && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
            </div>
            <input 
              type="radio" 
              className="hidden" 
              checked={value === opt} 
              onChange={() => onChange(opt)} 
            />
            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (type === 'checkboxGroup') {
    const currentValues = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-2.5 w-full">
        {resolvedOptions?.map((opt: string, i: number) => (
          <label key={i} className="flex items-center gap-3 cursor-pointer group">
            <div className={cn(
              "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
              currentValues.includes(opt) ? "border-indigo-500 bg-indigo-500 text-white" : "border-zinc-200 dark:border-zinc-800"
            )}>
              {currentValues.includes(opt) && <Check size={12} strokeWidth={4} />}
            </div>
            <input 
              type="checkbox" 
              className="hidden" 
              checked={currentValues.includes(opt)} 
              onChange={(e) => {
                const newValues = e.target.checked 
                  ? [...currentValues, opt]
                  : currentValues.filter(v => v !== opt);
                onChange(newValues);
              }} 
            />
            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (type === 'toggle') {
    return (
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "w-11 h-6 rounded-full transition-all relative flex items-center px-1",
          value ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-800"
        )}
      >
        <div className={cn(
          "w-4 h-4 rounded-full bg-white shadow-sm transition-all",
          value ? "translate-x-5" : "translate-x-0"
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
          value={value || 0}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full accent-indigo-600"
        />
        <div className="flex justify-between text-[10px] font-black text-zinc-400 uppercase tracking-widest">
          <span>{min || 0}</span>
          <span className="text-indigo-500">{value || 0}</span>
          <span>{max || 100}</span>
        </div>
      </div>
    );
  }

  if (type === 'richtext') {
    return <RichTextEditor value={value || ''} onChange={onChange} placeholder={placeholder} />;
  }

  if (type === 'signature_pad') {
    return <SignaturePad value={value || ''} onChange={onChange} />;
  }

  if (type === 'rating') {
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <button 
            key={i} 
            onClick={() => onChange(i)}
            className={cn(
              "p-2 rounded-xl transition-all",
              (value || 0) >= i ? "text-amber-500 bg-amber-500/10" : "text-zinc-300 hover:text-zinc-400 bg-zinc-100 dark:bg-zinc-900"
            )}
          >
            <Star size={20} fill={(value || 0) >= i ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
    );
  }

  if (type === 'colorpicker') {
    return (
      <div className="flex items-center gap-4">
        <input 
          type="color" 
          value={value || '#6366f1'} 
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-12 rounded-2xl border-none p-0 overflow-hidden cursor-pointer bg-transparent"
        />
        <input 
          type="text" 
          value={value || '#6366f1'} 
          onChange={(e) => onChange(e.target.value)}
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

  // Standard Inputs
  if (type === 'date') return <input type="date" value={value || ''} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} onKeyDown={onKeyDown} className={inputClasses} />;
  if (type === 'time') return <input type="time" value={value || ''} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} onKeyDown={onKeyDown} className={inputClasses} />;
  if (type === 'number' || type === 'currency') return (
    <div className="relative w-full">
      {type === 'currency' && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">$</span>}
      <input 
        type="number" 
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)} 
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className={cn(inputClasses, type === 'currency' ? "pl-8 pr-4" : "px-4")} 
      />
    </div>
  );

  if (type === 'longText') return <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} onKeyDown={onKeyDown} className={inputClasses} />;

  // User & Lookup
  if (type === 'user') {
    return (
      <select 
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className={cn(inputClasses, "appearance-none")}
      >
        <option value="">Select User...</option>
        {usersData.map((u: any) => (
          <option key={u.id} value={u.id}>{u.displayName || u.email}</option>
        ))}
      </select>
    );
  }

  if (type === 'lookup') {
    return (
      <LookupInput 
        field={field}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        readonly={readonly}
        inputClasses={inputClasses}
      />
    );
  }

  if (type === 'ai_summary' || type === 'calculation' || type === 'autonumber') {
    return (
      <div className={cn(inputClasses, "bg-zinc-50 dark:bg-zinc-950/50 italic")}>
        {value || (
          type === 'ai_summary' ? 'AI Summary will be generated after saving.' : 
          type === 'calculation' ? 'Value will be calculated after saving.' :
          'Auto-number will be generated after saving.'
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
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={cn(inputClasses, isGoogleMaps && "pl-10")}
          />
          {isGoogleMaps && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[8px] font-black text-indigo-500 uppercase tracking-widest">Nexus</div>
            </div>
          )}
        </div>
        {isGoogleMaps && value && value.length > 3 && (
          <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-2">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Nexus Suggestions</p>
            <button 
              onClick={() => onChange(`${value}, Mock City, MC 12345`)}
              className="w-full text-left p-2 hover:bg-white dark:hover:bg-zinc-950 rounded-lg text-xs transition-colors flex items-center gap-2 group"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span className="flex-1 truncate">{value}, Mock City, MC 12345</span>
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
      type={type === 'email' ? 'email' : type === 'phone' ? 'tel' : type === 'url' ? 'url' : 'text'}
      placeholder={placeholder || `Enter ${(label || 'value').toLowerCase()}...`}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      className={inputClasses}
    />
  );
};

const LookupInput = ({ field, value, onChange, onBlur, onKeyDown, readonly, inputClasses }: any) => {
  const { data: lookupResults, loading: lookupLoading } = usePlatformLookup(field);
  const { lookupSource, connectorId, platformEntity } = field;

  if (lookupSource === 'connector') {
    const isGoogleMaps = connectorId === 'google-maps-lookup';
    return (
      <div className="relative group w-full">
        {isGoogleMaps && <DynamicIcon name="GoogleMaps" size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />}
        <input 
          type="text"
          placeholder={field.placeholder || (isGoogleMaps ? "Search address..." : "Enter lookup value...")}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className={cn(inputClasses, isGoogleMaps && "pl-10")}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <div className="px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[8px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1">
            <Zap size={8} />
            Connector
          </div>
        </div>
      </div>
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
    />
  );
};
