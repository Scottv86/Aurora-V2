import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface FieldInputProps {
  field: any;
  value: any;
  onChange: (value: any) => void;
  usersData?: any[];
  lookupData?: Record<string, any[]>;
}

export const FieldInput: React.FC<FieldInputProps> = ({ field, value, onChange, usersData = [], lookupData = {} }) => {
  if (field.type === 'select') {
    return (
      <select 
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
      >
        <option value="">Select...</option>
        {field.options?.map((opt: string, j: number) => (
          <option key={j} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (field.type === 'date') {
    return (
      <input 
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
      />
    );
  }

  if (field.type === 'time') {
    return (
      <input 
        type="time"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
      />
    );
  }

  if (field.type === 'color') {
    return (
      <div className="flex items-center gap-3">
        <input 
          type="color"
          value={value || '#6366f1'}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 cursor-pointer p-0.5"
        />
        <input 
          type="text"
          value={value || '#6366f1'}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>
    );
  }

  if (field.type === 'file' || field.type === 'signature') {
    return (
      <div className="relative">
        <input 
          type="file"
          accept={field.type === 'signature' ? "image/*" : undefined}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onloadend = () => {
                onChange(reader.result as string);
              };
              reader.readAsDataURL(file);
            }
          }}
          className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-500/10 file:text-indigo-600 dark:text-indigo-400 hover:file:bg-indigo-500/20 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        {value && (
          <div className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Check size={10} /> File attached
          </div>
        )}
      </div>
    );
  }

  if (field.type === 'user') {
    return (
      <select 
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
      >
        <option value="">Select User...</option>
        {usersData.map((u: any) => (
          <option key={u.id} value={u.id}>{u.displayName || u.email}</option>
        ))}
      </select>
    );
  }

  if (field.type === 'lookup' && field.targetModuleId) {
    return (
      <select 
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
      >
        <option value="">Select Record...</option>
        {lookupData[field.targetModuleId]?.map((r: any) => (
          <option key={r.id} value={r.id}>{r.name || r.title || r.id}</option>
        ))}
      </select>
    );
  }

  if (field.type === 'ai_summary' || field.type === 'calculation') {
    return (
      <div className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-500 italic">
        {field.type === 'ai_summary' ? 'AI Summary will be generated after saving.' : 'Value will be calculated after saving.'}
      </div>
    );
  }

  if (field.type === 'number' || field.type === 'currency') {
    return (
      <div className="relative">
        {field.type === 'currency' && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">{field.currencySymbol || '$'}</span>
        )}
        <input 
          type="number"
          placeholder={field.placeholder}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors",
            field.type === 'currency' ? "pl-7 pr-3" : "px-3"
          )}
        />
      </div>
    );
  }

  if (field.type === 'longText') {
    return (
      <textarea 
        placeholder={field.placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors min-h-[80px]"
      />
    );
  }

  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input 
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-white dark:focus:ring-offset-zinc-900"
        />
        <span className="text-xs text-zinc-600 dark:text-zinc-400">Yes</span>
      </label>
    );
  }

  // Default to text input (including email, phone, url)
  return (
    <input 
      type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'url' ? 'url' : 'text'}
      placeholder={field.placeholder}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
    />
  );
};
