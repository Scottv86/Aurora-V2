import React from 'react';
import { 
  Check, AlertCircle, Info, AlertTriangle, XCircle, 
  Smile, User, Calendar, Clock, MapPin, 
  ChevronRight, ArrowRight, Star, Plus, Trash2,
  ChevronDown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { RichTextEditor } from './UI/RichTextEditor';
import { SignaturePad } from './UI/SignaturePad';

interface FieldInputProps {
  field: any;
  value: any;
  onChange: (value: any) => void;
  usersData?: any[];
  lookupData?: Record<string, any[]>;
  readonly?: boolean;
  error?: boolean;
}

export const FieldInput: React.FC<FieldInputProps> = ({ 
  field, 
  value, 
  onChange, 
  usersData = [], 
  lookupData = {},
  readonly = false,
  error = false
}) => {
  const { type, label, placeholder, options, min, max, variant, helperText } = field;

  const inputClasses = cn(
    "w-full bg-white dark:bg-zinc-950 border rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none transition-all",
    error 
      ? "border-rose-500 bg-rose-500/5 focus:border-rose-600 ring-4 ring-rose-500/5" 
      : "border-zinc-200 dark:border-zinc-800 focus:border-indigo-500",
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
      <div className="relative">
        <select 
          value={value || ''}
          disabled={readonly}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
        >
          <option value="">Select...</option>
          {options?.map((opt: string, j: number) => (
            <option key={j} value={opt}>{opt}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
      </div>
    );
  }

  if (type === 'radio') {
    return (
      <div className="space-y-2.5">
        {options?.map((opt: string, i: number) => (
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
      <div className="space-y-2.5">
        {options?.map((opt: string, i: number) => (
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
  if (type === 'date') return <input type="date" value={value || ''} onChange={(e) => onChange(e.target.value)} className={inputClasses} />;
  if (type === 'time') return <input type="time" value={value || ''} onChange={(e) => onChange(e.target.value)} className={inputClasses} />;
  if (type === 'number' || type === 'currency') return (
    <div className="relative">
      {type === 'currency' && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">$</span>}
      <input 
        type="number" 
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)} 
        className={cn(inputClasses, type === 'currency' ? "pl-8 pr-4" : "px-4")} 
      />
    </div>
  );

  if (type === 'longText') return <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} className={inputClasses} />;

  // User & Lookup
  if (type === 'user') {
    return (
      <select 
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={inputClasses}
      >
        <option value="">Select User...</option>
        {usersData.map((u: any) => (
          <option key={u.id} value={u.id}>{u.displayName || u.email}</option>
        ))}
      </select>
    );
  }

  if (type === 'lookup' && field.targetModuleId) {
    return (
      <select 
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={inputClasses}
      >
        <option value="">Select Record...</option>
        {lookupData[field.targetModuleId]?.map((r: any) => (
          <option key={r.id} value={r.id}>{r.name || r.title || r.id}</option>
        ))}
      </select>
    );
  }

  if (type === 'ai_summary' || type === 'calculation') {
    return (
      <div className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-500 italic">
        {type === 'ai_summary' ? 'AI Summary will be generated after saving.' : 'Value will be calculated after saving.'}
      </div>
    );
  }

  // Default Fallback
  return (
    <input 
      type={type === 'email' ? 'email' : type === 'phone' ? 'tel' : type === 'url' ? 'url' : 'text'}
      placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={inputClasses}
    />
  );
};
