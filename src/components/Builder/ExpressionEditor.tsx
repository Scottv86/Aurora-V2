import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  AlertCircle, 
  AlertTriangle, 
  BrainCircuit, 
  Hash, 
  FunctionSquare, 
  ChevronDown, 
  Check 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface ExpressionEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  availableFields: any[];
  height?: string; // e.g. "h-32", "h-24", "h-48"
  compact?: boolean; // If true: hides console, hides line numbers gutter, single line/compact styles
  showConsole?: boolean; // If true, displays the console panel at the bottom
  title?: string;
}

const COMMON_FUNCTIONS = [
  { name: 'IF(cond, true, false)', template: 'IF(, , )', desc: 'Returns value based on condition' },
  { name: 'AND(c1, c2, ...)', template: 'AND(, )', desc: 'Returns true if all conditions are true' },
  { name: 'OR(c1, c2, ...)', template: 'OR(, )', desc: 'Returns true if any condition is true' },
  { name: 'NOT(cond)', template: 'NOT()', desc: 'Negates a condition' },
  { name: 'IS_NULL(val)', template: 'IS_NULL()', desc: 'Checks if value is empty' },
  { name: 'CONCAT(t1, t2, ...)', template: 'CONCAT(, )', desc: 'Join text strings together' },
  { name: 'ROUND(n, d)', template: 'ROUND(, 2)', desc: 'Rounds number to decimal places' },
  { name: 'SUM(collection)', template: 'SUM()', desc: 'Calculates the sum of inputs' },
  { name: 'AVG(collection)', template: 'AVG()', desc: 'Calculates average of inputs' },
  { name: 'COUNT(collection)', template: 'COUNT()', desc: 'Returns number of items in list' },
  { name: 'MAX(collection)', template: 'MAX()', desc: 'Finds highest value in list' },
  { name: 'MIN(collection)', template: 'MIN()', desc: 'Finds lowest value in list' },
  { name: 'JOIN(collection, separator)', template: 'JOIN(, ", ")', desc: 'Join array elements into string' },
  { name: 'LEN(text)', template: 'LEN()', desc: 'Returns length of text string' },
  { name: 'IS_EMPTY(value)', template: 'IS_EMPTY()', desc: 'Checks if field is blank' },
  { name: 'FILTER(collection, condition)', template: 'FILTER(, "$ > 0")', desc: 'Filter list items by condition' },
  { name: 'MAP(collection, transform)', template: 'MAP(, "$ * 1")', desc: 'Transform list elements' },
  { name: 'TODAY()', template: 'TODAY()', desc: 'Returns current date string' },
  { name: 'NOW()', template: 'NOW()', desc: 'Returns current timestamp string' },
  { name: 'DATETIME(y, m, d, h, min, s)', template: 'DATETIME()', desc: 'Create datetime string' },
  { name: 'DIFF_DAYS(d1, d2)', template: 'DIFF_DAYS(, )', desc: 'Difference between dates in days' },
  { name: 'TIMESPAN(unit, d1, d2)', template: 'TIMESPAN("Days", , )', desc: 'Difference between dates' },
  { name: 'ADD_DAYS(date, days)', template: 'ADD_DAYS(, 7)', desc: 'Adds days to a date' },
  { name: 'ADD_TIME(date, span)', template: 'ADD_TIME(, "1y 3m")', desc: 'Adds time span to a date' },
  { name: 'SUB_TIME(date, span)', template: 'SUB_TIME(, "1y 3m")', desc: 'Subtracts time span from date' },
  { name: 'AT(collection, index)', template: 'AT(, 0)', desc: 'Gets element at index' },
  { name: 'INDEX_OF(collection, value)', template: 'INDEX_OF(, )', desc: 'Finds index of element' },
  { name: 'UNIQUE(collection)', template: 'UNIQUE()', desc: 'Removes duplicates from list' },
  { name: 'SORT(collection)', template: 'SORT()', desc: 'Sorts list elements' },
  { name: 'REVERSE(collection)', template: 'REVERSE()', desc: 'Reverses list elements' },
  { name: 'SEARCH(text, query)', template: 'SEARCH(, )', desc: 'Search text case-insensitive' },
  { name: 'FIND(needle, haystack, start)', template: 'FIND(, , 1)', desc: 'Find text position' },
  { name: 'ROW_INDEX(collection, item)', template: 'ROW_INDEX(, )', desc: 'Gets position in list' },
  { name: 'REPLACE(text, search, replace)', template: 'REPLACE(, , )', desc: 'Replaces matching text substring' },
  { name: 'TRIM(text)', template: 'TRIM()', desc: 'Removes whitespace' },
  { name: 'SUBSTR(text, start, length)', template: 'SUBSTR(, 0, 4)', desc: 'Gets substring of text' },
  { name: 'LEFT(text, count)', template: 'LEFT(, 1)', desc: 'Gets first count characters' },
  { name: 'MID(text, start, count)', template: 'MID(, 2, 3)', desc: 'Gets characters from middle' },
  { name: 'RIGHT(text, count)', template: 'RIGHT(, 4)', desc: 'Gets last count characters' },
  { name: 'CEIL(number)', template: 'CEIL()', desc: 'Rounds number up' },
  { name: 'FLOOR(number)', template: 'FLOOR()', desc: 'Rounds number down' },
  { name: 'PERCENT(value, total)', template: 'PERCENT(, 100)', desc: 'Calculate percentage' },
  { name: 'SWITCH(value, c1, r1, c2, r2, def)', template: 'SWITCH(, , , )', desc: 'Multi-case conditional logic' },
  { name: 'COALESCE(v1, v2, ...)', template: 'COALESCE(, )', desc: 'First non-null value' },
  { name: 'EOMONTH(date, months)', template: 'EOMONTH(, 0)', desc: 'End of month calculation' },
  { name: 'WORKDAY(date, days)', template: 'WORKDAY(, 5)', desc: 'Add working days to a date' },
  { name: 'YEAR(date)', template: 'YEAR()', desc: 'Extracts year' },
  { name: 'MONTH(date)', template: 'MONTH()', desc: 'Extracts month' },
  { name: 'DAY(date)', template: 'DAY()', desc: 'Extracts day' },
  { name: 'VLOOKUP(val, list, sCol, rCol)', template: 'VLOOKUP(, "", "", "")', desc: 'Look up value in global list' },
  { name: 'PROPER(text)', template: 'PROPER()', desc: 'Title cases text' }
];

const checkFieldExists = (label: string, fields: any[]): boolean => {
  const cleanLabel = label.toLowerCase().trim();
  return fields.some(f => 
    (f.name && f.name.toLowerCase().trim() === cleanLabel) ||
    (f.id && f.id.toLowerCase().trim() === cleanLabel) ||
    (f.label && f.label.toLowerCase().trim() === cleanLabel)
  );
};

export const ExpressionEditor: React.FC<ExpressionEditorProps> = ({
  value,
  onChange,
  placeholder = "Enter expression...",
  availableFields,
  height = "h-32",
  compact = false,
  showConsole = false,
  title
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<{ label: string; value: string; type: 'variable' | 'function'; description?: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [suggestionPos, setSuggestionPos] = useState({ top: 0, left: 0 });
  const [suggestionTrigger, setSuggestionTrigger] = useState<{ type: 'variable' | 'function'; index: number } | null>(null);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true);

  // 1. Validator function
  const validation = useMemo(() => {
    const errors: { message: string, line?: number }[] = [];
    const warnings: string[] = [];
    const suggestionsList: string[] = [];
    const brokenTokens = new Set<string>();

    const getLineNumber = (index: number) => {
      return value.substring(0, index).split('\n').length;
    };

    if (!value.trim()) {
      return { errors, warnings, suggestions: suggestionsList, brokenTokens };
    }

    // Parentheses Balance
    const openParen = (value.match(/\(/g) || []).length;
    const closeParen = (value.match(/\)/g) || []).length;
    if (openParen !== closeParen) {
      errors.push({ message: `Unmatched parentheses: ${openParen} open vs ${closeParen} closed.` });
    }

    // Variable Curly Braces Balance
    const openBrace = (value.match(/\{/g) || []).length;
    const closeBrace = (value.match(/\}/g) || []).length;
    if (openBrace !== closeBrace) {
      errors.push({ message: "Invalid variable syntax: Check for missing or unmatched curly brackets { }." });
    }

    // Variable Integrity check
    const cleanValue = value.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, match => ' '.repeat(match.length));
    const varRegex = /\{([^{}]+)\}/g;
    let varMatch;
    while ((varMatch = varRegex.exec(cleanValue)) !== null) {
      const tag = varMatch[0];
      const label = varMatch[1];
      const line = getLineNumber(varMatch.index);
      
      if (!checkFieldExists(label, availableFields)) {
        errors.push({ message: `Missing Variable: "{${label}}" does not exist in this module layout.`, line });
        brokenTokens.add(tag);
      }
    }

    // Function validation
    const funcRegex = /([A-Z_]+)\(/g;
    let funcMatch;
    while ((funcMatch = funcRegex.exec(cleanValue)) !== null) {
      const funcName = funcMatch[1];
      const line = getLineNumber(funcMatch.index);
      const funcDef = COMMON_FUNCTIONS.find(f => f.name.split('(')[0] === funcName);
      
      if (!funcDef) {
        errors.push({ message: `Unknown Function: "${funcName}"`, line });
        brokenTokens.add(funcName);
      }
    }

    // Detect bare equal sign vs double equal
    if (value.includes('=') && !value.includes('==') && !value.includes('!=') && !value.includes('>=') && !value.includes('<=') && !value.includes('=>') && !value.includes('=<')) {
      warnings.push("Detected '=' instead of '=='. In formulas, use '==' for equality testing.");
    }

    return { errors, warnings, suggestions: suggestionsList, brokenTokens };
  }, [value, availableFields]);

  // Suggestions triggers
  const updateSuggestions = (type: 'variable' | 'function' | 'universal', query: string) => {
    const q = query.toLowerCase();
    let matches: any[] = [];
    
    const availableVariables = availableFields.map(f => {
      const hasSlug = !!f.name;
      return {
        label: f.name || f.label || f.id,
        value: hasSlug ? `{${f.name}}` : `{{${f.id}}}`,
        type: 'variable' as const,
        description: `${f.label || f.name} (${(f.type || 'text').toUpperCase()})`
      };
    });

    const availableFunctions = COMMON_FUNCTIONS.map(f => ({
      label: f.name.split('(')[0],
      value: f.template,
      type: 'function' as const,
      description: f.desc || ''
    }));

    if (type === 'variable') {
      matches = availableVariables.filter(v => v.label.toLowerCase().includes(q));
    } else if (type === 'function') {
      matches = availableFunctions.filter(f => f.label.toLowerCase().includes(q));
    } else {
      const vMatches = availableVariables.filter(v => v.label.toLowerCase().includes(q));
      const fMatches = availableFunctions.filter(f => f.label.toLowerCase().includes(q));
      matches = [...vMatches, ...fMatches];
    }
    
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
    setSelectedIndex(0);
  };

  const updateSuggestionPos = (index: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const mirror = document.createElement('div');
    const style = window.getComputedStyle(textarea);
    
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
    mirror.style.width = style.width;
    mirror.style.padding = style.padding;
    mirror.style.lineHeight = style.lineHeight;
    mirror.style.fontSize = style.fontSize;
    mirror.style.fontFamily = style.fontFamily;
    mirror.style.fontWeight = style.fontWeight;
    mirror.style.letterSpacing = style.letterSpacing;
    mirror.style.textTransform = style.textTransform;
    mirror.style.border = style.border;
    
    textarea.parentElement?.appendChild(mirror);
    
    const textBefore = textarea.value.substring(0, index);
    const span = document.createElement('span');
    span.textContent = textBefore;
    mirror.appendChild(span);
    
    const caret = document.createElement('span');
    caret.textContent = '|';
    mirror.appendChild(caret);
    
    const rect = caret.getBoundingClientRect();
    const textareaRect = textarea.getBoundingClientRect();
    textarea.parentElement?.removeChild(mirror);

    setSuggestionPos({
      top: rect.top - textareaRect.top + textarea.scrollTop + (compact ? 16 : 20),
      left: rect.left - textareaRect.left + textarea.scrollLeft
    });
  };

  const applySuggestion = (suggestion: any) => {
    const textarea = textareaRef.current;
    if (!textarea || !suggestionTrigger) return;

    const val = textarea.value;
    const start = suggestionTrigger.index;
    const end = textarea.selectionStart;

    const insertVal = suggestion.value;
    const newVal = val.substring(0, start) + insertVal + val.substring(end);
    onChange(newVal);

    setShowSuggestions(false);
    setSuggestionTrigger(null);

    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursor = start + insertVal.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 0);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const cursorIndex = e.target.selectionStart;
    onChange(newVal);

    // IntelliSense Triggering
    const lastChar = newVal[cursorIndex - 1];
    const textBeforeCursor = newVal.substring(0, cursorIndex);
    const words = textBeforeCursor.split(/[\s+\-*/%(),]/);
    const lastWord = words[words.length - 1];

    if (lastChar === '{') {
      setSuggestionTrigger({ type: 'variable', index: cursorIndex - 1 });
      updateSuggestions('variable', '');
      setTimeout(() => updateSuggestionPos(cursorIndex), 0);
    } else if (suggestionTrigger?.type === 'variable') {
      const match = textBeforeCursor.substring(suggestionTrigger.index + 1);
      if (match.includes('}') || match.includes('\n')) {
        setShowSuggestions(false);
        setSuggestionTrigger(null);
      } else {
        updateSuggestions('variable', match);
        setTimeout(() => updateSuggestionPos(suggestionTrigger.index + 1), 0);
      }
    } else if (/^[A-Za-z]$/.test(lastChar) && (words.length === 1 || /[\s+\-*/%(),]/.test(newVal[cursorIndex - 2]))) {
      setSuggestionTrigger({ type: 'function', index: cursorIndex - lastWord.length });
      updateSuggestions('universal', lastWord);
      setTimeout(() => updateSuggestionPos(cursorIndex - lastWord.length), 0);
    } else if (suggestionTrigger?.type === 'function') {
      if (/[\s+\-*/%(),]/.test(lastChar) || lastChar === undefined) {
        setShowSuggestions(false);
        setSuggestionTrigger(null);
      } else {
        updateSuggestions('universal', lastWord);
        setTimeout(() => updateSuggestionPos(suggestionTrigger.index), 0);
      }
    } else {
      setShowSuggestions(false);
      setSuggestionTrigger(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applySuggestion(suggestions[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        setSuggestionTrigger(null);
        return;
      }
    }
  };

  // Close suggestions on click away
  useEffect(() => {
    const clickAway = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setSuggestionTrigger(null);
      }
    };
    document.addEventListener('mousedown', clickAway);
    return () => document.removeEventListener('mousedown', clickAway);
  }, []);

  return (
    <div className="flex flex-col w-full relative text-left">
      {title && (
        <div className="flex justify-between items-center px-1 mb-1.5">
          <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{title}</label>
          {!compact && (
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-zinc-400 dark:text-zinc-500 italic">Auto-validating</span>
            </div>
          )}
        </div>
      )}

      {/* Editor Main container */}
      <div className={cn(
        "flex bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all overflow-hidden relative shadow-inner",
        compact ? "rounded-xl h-16" : cn("rounded-2xl", height)
      )}>
        {/* Line Numbers Gutter */}
        {!compact && (
          <div className="w-10 bg-zinc-100/50 dark:bg-zinc-900/20 border-r border-zinc-200 dark:border-zinc-800 flex flex-col pt-4 text-right pr-2.5 select-none pointer-events-none overflow-hidden">
            {value.split('\n').map((_, i) => (
              <div key={i} className="text-[9px] font-mono leading-[20px] text-zinc-300 dark:text-zinc-650 h-[20px]">
                {i + 1}
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 relative overflow-hidden">
          {/* Highlighting Overlay */}
          <div 
            aria-hidden="true"
            className={cn(
              "absolute inset-0 font-mono pointer-events-none whitespace-pre overflow-x-auto overflow-y-auto custom-scrollbar",
              compact ? "p-3 text-[11px] leading-[18px]" : "p-4 text-xs leading-[20px]"
            )}
            style={{ color: 'transparent' }}
          >
            {value.split(/(\/\*[\s\S]*?\*\/|\/\/.*|\{[^{}]+\}|[A-Z_]+(?=\()|[()\[\],]|"[^"]*"|'[^']*'|\b\d+(?:\.\d+)?\b|[+\-*/%=<>!&|]+|\b[a-zA-Z_][a-zA-Z0-9_]*\b)/g).map((part, i) => {
              let colorClass = "text-zinc-500 dark:text-zinc-600"; // Default punctuation / syntax
              
              if (/^\{[^}]+\}$/.test(part)) {
                const inner = part.slice(1, -1);
                const exists = checkFieldExists(inner, availableFields);
                if (!exists) {
                  return <span key={i} className="text-rose-600 dark:text-rose-400 font-bold border-b border-rose-500 border-dashed bg-rose-500/10">{part}</span>;
                }
                colorClass = "text-indigo-600 dark:text-indigo-400 font-bold";
              } else if (/^[A-Z_]+$/.test(part)) {
                colorClass = "text-emerald-600 dark:text-emerald-400 font-bold";
              } else if (/^[()\[\],]$/.test(part)) {
                colorClass = "text-emerald-600 dark:text-emerald-400 font-bold";
              } else if (/^\d+(?:\.\d+)?$/.test(part)) {
                colorClass = "text-amber-600 dark:text-amber-450";
              } else if (/^'[^']*'$/.test(part) || /^"[^"]*"$/.test(part)) {
                colorClass = "text-rose-600 dark:text-rose-455";
              } else if (/^[+\-*/%=<>!&|]+$/.test(part)) {
                colorClass = "text-zinc-900 dark:text-zinc-200 font-bold";
              } else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(part)) {
                colorClass = "text-zinc-900 dark:text-zinc-100";
              }

              const isBroken = validation.brokenTokens.has(part);
              const squiggleClass = isBroken ? "border-b border-rose-500 border-dashed bg-rose-500/10" : "";

              return <span key={i} className={cn(colorClass, squiggleClass)}>{part}</span>;
            })}
          </div>

          {/* Actual Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onScroll={(e) => {
              const overlay = e.currentTarget.previousElementSibling;
              const gutter = e.currentTarget.parentElement?.previousElementSibling;
              if (overlay) {
                overlay.scrollTop = e.currentTarget.scrollTop;
                overlay.scrollLeft = e.currentTarget.scrollLeft;
              }
              if (gutter) {
                gutter.scrollTop = e.currentTarget.scrollTop;
              }
              if (showSuggestions) setShowSuggestions(false);
            }}
            placeholder={placeholder}
            spellCheck={false}
            className={cn(
              "absolute inset-0 w-full h-full bg-transparent font-mono text-transparent caret-zinc-900 dark:caret-white placeholder:text-zinc-300 dark:placeholder:text-zinc-700 focus:outline-none resize-none whitespace-pre overflow-x-auto overflow-y-auto custom-scrollbar",
              compact ? "p-3 text-[11px] leading-[18px]" : "p-4 text-xs leading-[20px]"
            )}
          />

          {/* IntelliSense Dropdown */}
          <AnimatePresence>
            {showSuggestions && (
              <motion.div 
                ref={suggestionsRef}
                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{ top: suggestionPos.top, left: suggestionPos.left }}
                className="absolute z-[1000] w-72 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
              >
                <div className="p-1 space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applySuggestion(s)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all",
                        idx === selectedIndex 
                          ? "bg-indigo-650 text-white shadow-sm" 
                          : "text-zinc-650 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded flex items-center justify-center shrink-0 text-xs",
                        idx === selectedIndex ? "bg-white/20 text-white" : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500"
                      )}>
                        {s.type === 'variable' ? <Hash size={12} /> : <FunctionSquare size={12} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-[10px] font-bold truncate">
                            {s.label}
                          </p>
                          <span className={cn(
                            "text-[6px] font-bold uppercase tracking-widest px-1 rounded border shrink-0",
                            idx === selectedIndex 
                              ? "bg-white/20 border-white/30 text-white" 
                              : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400"
                          )}>
                            {s.type === 'variable' ? 'VAR' : 'FUNC'}
                          </span>
                        </div>
                        {s.description && (
                          <p className={cn("text-[8px] truncate", idx === selectedIndex ? "text-white/60" : "text-zinc-450")}>
                            {s.description}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Error / Problems Console */}
      {showConsole && !compact && (
        <div className="mt-2 bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col relative overflow-hidden">
          <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 flex items-center justify-between">
            <button 
              type="button"
              onClick={() => setIsConsoleExpanded(!isConsoleExpanded)}
              className="flex items-center gap-2 hover:opacity-75 transition-opacity"
            >
              <BrainCircuit size={12} className="text-indigo-500" />
              <span className="text-[9px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">Error Console</span>
              <ChevronDown size={10} className={cn("text-zinc-400 transition-transform", !isConsoleExpanded && "-rotate-90")} />
            </button>
            <div className="flex gap-3">
              <div className="flex items-center gap-1">
                <div className={cn("w-1.5 h-1.5 rounded-full", validation.errors.length ? "bg-rose-500" : "bg-emerald-500")} />
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">{validation.errors.length} Errors</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={cn("w-1.5 h-1.5 rounded-full", validation.warnings.length ? "bg-amber-500" : "bg-zinc-300")} />
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">{validation.warnings.length} Warnings</span>
              </div>
            </div>
          </div>
          
          <AnimatePresence>
            {isConsoleExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="max-h-32 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-white/50 dark:bg-zinc-950/20"
              >
                {validation.errors.length === 0 && validation.warnings.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-4 text-center space-y-1.5 opacity-60">
                    <Check className="text-emerald-500" size={14} />
                    <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider leading-none">Expression is valid</p>
                  </div>
                )}

                {validation.errors.map((err, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                    <AlertCircle size={12} className="text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-medium text-rose-600 dark:text-rose-400 leading-tight">{err.message}</p>
                      {err.line && <span className="text-[7.5px] font-mono text-rose-500/60 uppercase">Line {err.line}</span>}
                    </div>
                  </div>
                ))}

                {validation.warnings.map((warn, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                    <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-medium text-amber-600 dark:text-amber-450 leading-tight">{warn}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
