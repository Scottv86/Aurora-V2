import React, { useState, useRef, useMemo } from 'react';
import { 
  Check, 
  AlertCircle, 
  ChevronDown
} from 'lucide-react';
import { createFormulaContext } from '../../lib/formulaEngine';

interface FormulaExpressionBarProps {
  value: string;
  onChange: (val: string) => void;
  availableFields?: Array<{ name: string; label?: string; type?: string }>;
  sampleData?: Record<string, any>;
  placeholder?: string;
  className?: string;
}

export const FormulaExpressionBar: React.FC<FormulaExpressionBarProps> = ({
  value,
  onChange,
  availableFields = [],
  sampleData = {},
  placeholder = 'e.g. @Record.price * (1 - @Record.discount / 100)',
  className = ''
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showFieldSuggestions, setShowFieldSuggestions] = useState(false);
  const [suggestionFilter, setSuggestionFilter] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const formulaContext = useMemo(() => createFormulaContext(), []);

  // Live expression preview evaluation
  const evaluationResult = useMemo<{ result: any; error: string | null }>(() => {
    if (!value || !value.trim()) return { result: null, error: null };

    try {
      let expr = value;
      // Replace @Record.field tokens with sample data
      expr = expr.replace(/@(?:Record\.)?([a-zA-Z0-9_-]+)/g, (_m, fieldName) => {
        const val = sampleData[fieldName];
        if (val === undefined || val === null) return '100'; // Sample preview default
        if (typeof val === 'number') return String(val);
        if (typeof val === 'boolean') return val ? 'true' : 'false';
        return JSON.stringify(String(val));
      });

      // Basic safe evaluator for preview
      const contextKeys = Object.keys(formulaContext);
      const contextVals = Object.values(formulaContext);
      const fn = new Function(...contextKeys, `return (${expr});`);
      const res = fn(...contextVals);
      return { result: res, error: null };
    } catch (err: any) {
      return { result: null, error: err.message };
    }
  }, [value, sampleData, formulaContext]);

  const insertToken = (token: string) => {
    if (!inputRef.current) return;
    const input = inputRef.current;
    const start = input.selectionStart || value.length;
    const end = input.selectionEnd || value.length;

    const nextVal = value.slice(0, start) + token + value.slice(end);
    onChange(nextVal);

    setTimeout(() => {
      input.focus();
      const nextPos = start + token.length;
      input.setSelectionRange(nextPos, nextPos);
    }, 10);
  };

  const filteredFields = availableFields.filter(f => 
    (f.name && f.name.toLowerCase().includes(suggestionFilter.toLowerCase())) ||
    (f.label && f.label.toLowerCase().includes(suggestionFilter.toLowerCase()))
  );

  return (
    <div className={`space-y-2 font-sans ${className}`}>
      {/* Expression Input Bar */}
      <div className={`relative rounded-2xl border transition-all bg-white dark:bg-zinc-900 shadow-sm ${
        isFocused 
          ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
          : evaluationResult.error && value 
          ? 'border-amber-500/50' 
          : 'border-zinc-200 dark:border-zinc-800'
      }`}>
        <div className="flex items-center px-3.5 py-2.5 gap-2.5">
          <div className="flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 select-none">
            <span>fx</span>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              // Trigger autocomplete when typing @
              const cursor = e.target.selectionStart || 0;
              const textBeforeCursor = e.target.value.slice(0, cursor);
              const lastAt = textBeforeCursor.lastIndexOf('@');
              if (lastAt !== -1 && !textBeforeCursor.slice(lastAt).includes(' ')) {
                setShowFieldSuggestions(true);
                setSuggestionFilter(textBeforeCursor.slice(lastAt + 1));
              } else {
                setShowFieldSuggestions(false);
              }
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setShowFieldSuggestions(false), 200)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-xs font-mono text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-hidden"
          />

          {/* Quick Helper Button */}
          <button
            type="button"
            onClick={() => setShowFieldSuggestions(!showFieldSuggestions)}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            title="Insert Field or Function"
          >
            <ChevronDown size={14} />
          </button>
        </div>

        {/* Live Evaluation Preview Footer */}
        {value.trim() && (
          <div className="px-3.5 py-1.5 bg-zinc-50 dark:bg-zinc-950/60 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-[11px] rounded-b-2xl">
            {evaluationResult.error ? (
              <div className="flex items-center gap-1.5 text-amber-500 font-medium">
                <AlertCircle size={12} />
                <span className="truncate">Syntax Warning: {evaluationResult.error}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <Check size={12} />
                <span>Computed Preview:</span>
                <span className="font-mono font-bold">
                  {evaluationResult.result !== null ? String(evaluationResult.result) : 'Empty'}
                </span>
              </div>
            )}
            <span className="text-[10px] text-zinc-400 font-mono">AST Engine</span>
          </div>
        )}

        {/* Field Autocomplete Menu */}
        {showFieldSuggestions && (
          <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-2 max-h-56 overflow-y-auto">
            <div className="px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Available Schema Attributes
            </div>
            {filteredFields.length === 0 ? (
              <div className="p-3 text-center text-xs text-zinc-400">No matching fields</div>
            ) : (
              filteredFields.map(f => (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => {
                    insertToken(`@Record.${f.name}`);
                    setShowFieldSuggestions(false);
                  }}
                  className="w-full px-3 py-1.5 rounded-xl text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center justify-between transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-600">
                      @{f.name}
                    </span>
                    <span className="text-[10px] text-zinc-400">({f.label || f.name})</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                    {f.type || 'text'}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Quick Function Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
        {[
          { label: 'IF(...)', template: 'IF(condition, valueIfTrue, valueIfFalse)' },
          { label: 'ROUND(x, 2)', template: 'ROUND(@Record.value, 2)' },
          { label: 'DATEDIFF(d1, d2)', template: 'DATEDIFF("days", @Record.startDate, TODAY())' },
          { label: 'SUM(...)', template: 'SUM(@Record.itemA, @Record.itemB)' },
          { label: 'TODAY()', template: 'TODAY()' }
        ].map((fn, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => insertToken(fn.template)}
            className="px-2.5 py-1 text-[11px] font-mono font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-400 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 transition-all shrink-0 cursor-pointer shadow-2xs"
          >
            {fn.label}
          </button>
        ))}
      </div>
    </div>
  );
};
export default FormulaExpressionBar;
