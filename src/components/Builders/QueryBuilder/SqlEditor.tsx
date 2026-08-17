import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Database, 
  Layers, 
  Key, 
  Sliders, 
  Zap, 
  Code, 
  Sparkles,
  Columns as ColumnsIcon
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { QueryParameter } from '../../../types/queryBuilder';

export interface SqlEditorProps {
  value: string;
  onChange: (val: string) => void;
  parameters?: QueryParameter[];
  tables?: Array<{ name: string; displayName?: string; columns: Array<{ name: string; type: string; isPrimary?: boolean }> }>;
  customModules?: Array<{ name: string; displayName?: string; columns: Array<{ name: string; type: string }> }>;
  onRun?: () => void;
  height?: string;
  className?: string;
}

interface SuggestionItem {
  label: string;
  insertText: string;
  kind: 'keyword' | 'function' | 'table' | 'module' | 'column' | 'parameter';
  detail?: string;
  documentation?: string;
}

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 
  'FULL JOIN', 'CROSS JOIN', 'ON', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 
  'OFFSET', 'WITH', 'AS', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'ILIKE', 'IS', 
  'NULL', 'TRUE', 'FALSE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'UNION', 
  'ALL', 'DISTINCT', 'BETWEEN', 'EXISTS', 'ASC', 'DESC', 'OVER', 'PARTITION BY'
];

const SQL_FUNCTIONS = [
  { name: 'COUNT', detail: 'COUNT(expression)' },
  { name: 'SUM', detail: 'SUM(expression)' },
  { name: 'AVG', detail: 'AVG(expression)' },
  { name: 'MIN', detail: 'MIN(expression)' },
  { name: 'MAX', detail: 'MAX(expression)' },
  { name: 'COALESCE', detail: 'COALESCE(val1, val2, ...)' },
  { name: 'ROUND', detail: 'ROUND(number, decimals)' },
  { name: 'NOW', detail: 'NOW()' },
  { name: 'DATE_TRUNC', detail: 'DATE_TRUNC(\'day\', timestamp)' },
  { name: 'CONCAT', detail: 'CONCAT(str1, str2, ...)' },
  { name: 'LOWER', detail: 'LOWER(string)' },
  { name: 'UPPER', detail: 'UPPER(string)' },
  { name: 'LENGTH', detail: 'LENGTH(string)' },
  { name: 'NULLIF', detail: 'NULLIF(val1, val2)' },
  { name: 'CAST', detail: 'CAST(expression AS type)' },
  { name: 'ROW_NUMBER', detail: 'ROW_NUMBER() OVER (...)' }
];

export const SqlEditor: React.FC<SqlEditorProps> = ({
  value,
  onChange,
  parameters = [],
  tables = [],
  customModules = [],
  onRun,
  className
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const suggestionsBoxRef = useRef<HTMLDivElement>(null);

  const [cursorPos, setCursorPos] = useState<number>(0);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [suggestionCoords, setSuggestionCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [currentWordRange, setCurrentWordRange] = useState<{ start: number; end: number; word: string }>({ start: 0, end: 0, word: '' });

  // Compute Line Numbers
  const lineNumbers = useMemo(() => {
    const lines = value.split('\n').length;
    return Array.from({ length: Math.max(lines, 1) }, (_, i) => i + 1);
  }, [value]);

  // Sync scroll
  const handleScroll = () => {
    if (textareaRef.current && overlayRef.current && gutterRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Build Comprehensive Suggestion Catalog
  const allSuggestions = useMemo<SuggestionItem[]>(() => {
    const list: SuggestionItem[] = [];

    // 1. Parameters
    parameters.forEach(p => {
      list.push({
        label: `:${p.name}`,
        insertText: `:${p.name}`,
        kind: 'parameter',
        detail: `Parameter (${p.type})`,
        documentation: p.description || p.label
      });
    });

    // 2. Physical Tables & Columns
    tables.forEach(t => {
      list.push({
        label: t.name,
        insertText: t.name,
        kind: 'table',
        detail: 'System Table',
        documentation: `System table with ${t.columns.length} columns.`
      });

      t.columns.forEach(c => {
        list.push({
          label: c.name,
          insertText: c.name,
          kind: 'column',
          detail: `${t.name}.${c.name} (${c.type})`,
          documentation: c.isPrimary ? 'Primary Key' : undefined
        });
      });
    });

    // 3. Custom Modules & Fields
    customModules.forEach(m => {
      const displayName = m.displayName || m.name;
      list.push({
        label: displayName,
        insertText: `"${displayName}"`,
        kind: 'module',
        detail: 'Custom Module',
        documentation: `Custom module with ${m.columns.length} fields.`
      });

      m.columns.forEach(c => {
        list.push({
          label: c.name,
          insertText: c.name,
          kind: 'column',
          detail: `Module Field (${c.type})`
        });
      });
    });

    // 4. SQL Functions
    SQL_FUNCTIONS.forEach(f => {
      list.push({
        label: f.name,
        insertText: `${f.name}()`,
        kind: 'function',
        detail: f.detail,
        documentation: 'Built-in SQL function'
      });
    });

    // 5. SQL Keywords
    SQL_KEYWORDS.forEach(kw => {
      list.push({
        label: kw,
        insertText: kw,
        kind: 'keyword',
        detail: 'Keyword'
      });
    });

    return list;
  }, [parameters, tables, customModules]);

  // Compute cursor coordinate approximation for autocomplete popup
  const computeCursorCoordinates = useCallback((pos: number) => {
    if (!textareaRef.current) return { top: 40, left: 60 };
    const textBefore = value.substring(0, pos);
    const lines = textBefore.split('\n');
    const lineIndex = lines.length - 1;
    const charIndex = lines[lineIndex].length;

    const lineHeight = 24; // 24px per line in leading-6
    const charWidth = 7.4;  // Approximate monospace char width in text-xs

    const scrollTop = textareaRef.current.scrollTop;
    const scrollLeft = textareaRef.current.scrollLeft;

    const top = Math.min(
      Math.max(30, (lineIndex + 1) * lineHeight - scrollTop + 12),
      textareaRef.current.clientHeight - 180
    );
    const left = Math.min(
      Math.max(50, charIndex * charWidth - scrollLeft + 52),
      textareaRef.current.clientWidth - 280
    );

    return { top, left };
  }, [value]);

  // Update suggestions when user types
  const evaluateSuggestionsAtCursor = useCallback((text: string, pos: number) => {
    const textBefore = text.substring(0, pos);
    
    // Find active token at cursor
    const match = textBefore.match(/(?::|[a-zA-Z0-9_"]*)$/);
    if (!match || match[0].length === 0) {
      setShowSuggestions(false);
      return;
    }

    const token = match[0];
    const start = pos - token.length;
    setCurrentWordRange({ start, end: pos, word: token });

    const isParamTrigger = token.startsWith(':');
    const searchToken = isParamTrigger ? token.substring(1).toLowerCase() : token.toLowerCase();

    let matched: SuggestionItem[] = [];

    if (isParamTrigger) {
      matched = allSuggestions.filter(s => s.kind === 'parameter' && s.label.toLowerCase().includes(token.toLowerCase()));
    } else {
      matched = allSuggestions.filter(s => {
        const itemLabel = s.label.toLowerCase();
        return itemLabel.startsWith(searchToken) || itemLabel.includes(searchToken);
      }).slice(0, 12);
    }

    if (matched.length > 0) {
      setSuggestions(matched);
      setSelectedIndex(0);
      setSuggestionCoords(computeCursorCoordinates(pos));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [allSuggestions, computeCursorCoordinates]);

  // Handle Text Changes
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextVal = e.target.value;
    const pos = e.target.selectionStart;
    onChange(nextVal);
    setCursorPos(pos);
    evaluateSuggestionsAtCursor(nextVal, pos);
  };

  // Insert Chosen Suggestion
  const applySuggestion = (suggestion: SuggestionItem) => {
    if (!textareaRef.current) return;
    const before = value.substring(0, currentWordRange.start);
    const after = value.substring(currentWordRange.end);
    
    let textToInsert = suggestion.insertText;
    const nextValue = before + textToInsert + after;
    onChange(nextValue);
    setShowSuggestions(false);

    const nextCursorPos = currentWordRange.start + textToInsert.length;
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(nextCursorPos, nextCursorPos);
      }
    }, 0);
  };

  // Keyboard Shortcuts (Arrow navigation in suggestions, Enter / Tab to select, Run Query)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Run Query Shortcut (Cmd+Enter or Ctrl+Enter)
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (onRun) onRun();
      return;
    }

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
        return;
      }
    }

    // Tab indentation support
    if (e.key === 'Tab' && !showSuggestions) {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const next = value.substring(0, start) + '  ' + value.substring(end);
      onChange(next);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(start + 2, start + 2);
        }
      }, 0);
    }
  };

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickAway = (e: MouseEvent) => {
      if (suggestionsBoxRef.current && !suggestionsBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickAway);
    return () => document.removeEventListener('mousedown', handleClickAway);
  }, []);

  // Syntax Token Highlighter Renderer
  const renderHighlightedCode = useMemo(() => {
    // Regular expression matching comments, strings, parameter tokens, numbers, keywords, and identifiers
    const tokenRegex = /(\/\*[\s\S]*?\*\/|--.*|'[^']*'|"[^"]*"|:[a-zA-Z0-9_]+|\b\d+(?:\.\d+)?\b|[(),;]|<=|>=|!=|<>|[=+\-*/%<>]|\b[a-zA-Z_][a-zA-Z0-9_]*\b)/g;
    
    const parts = value.split(tokenRegex);
    const kwSet = new Set(SQL_KEYWORDS);
    const funcSet = new Set(SQL_FUNCTIONS.map(f => f.name));
    const tableSet = new Set(tables.map(t => t.name.toLowerCase()));
    const moduleSet = new Set(customModules.map(m => (m.displayName || m.name).toLowerCase()));

    return parts.map((token, i) => {
      if (!token) return null;

      // 1. Comments
      if (token.startsWith('--') || token.startsWith('/*')) {
        return <span key={i} className="text-zinc-500 italic font-mono">{token}</span>;
      }

      // 2. Strings
      if (token.startsWith("'") && token.endsWith("'")) {
        return <span key={i} className="text-emerald-400 font-mono font-medium">{token}</span>;
      }

      // 3. Double-quoted identifiers (Custom modules)
      if (token.startsWith('"') && token.endsWith('"')) {
        return <span key={i} className="text-purple-300 font-mono font-semibold">{token}</span>;
      }

      // 4. Dynamic Parameters (:param_name)
      if (token.startsWith(':')) {
        return (
          <span key={i} className="text-amber-400 font-mono font-bold bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/30 shadow-xs">
            {token}
          </span>
        );
      }

      // 5. Numbers
      if (/^\d+(?:\.\d+)?$/.test(token)) {
        return <span key={i} className="text-cyan-400 font-mono">{token}</span>;
      }

      // 6. Keywords
      const upperToken = token.toUpperCase();
      if (kwSet.has(upperToken)) {
        return <span key={i} className="text-indigo-400 dark:text-indigo-300 font-mono font-bold">{token}</span>;
      }

      // 7. SQL Functions
      if (funcSet.has(upperToken)) {
        return <span key={i} className="text-pink-400 font-mono font-semibold">{token}</span>;
      }

      // 8. Known Tables / Custom Modules
      const lowerToken = token.toLowerCase();
      if (tableSet.has(lowerToken)) {
        return <span key={i} className="text-sky-300 font-mono font-semibold underline decoration-sky-500/30">{token}</span>;
      }
      if (moduleSet.has(lowerToken)) {
        return <span key={i} className="text-purple-300 font-mono font-semibold">{token}</span>;
      }

      // 9. Punctuation & Operators
      if (/^[(),;=+\-*/%<>]$/.test(token) || token === '!=' || token === '<=' || token === '>=' || token === '<>') {
        return <span key={i} className="text-zinc-400 font-mono font-bold">{token}</span>;
      }

      // 10. Default Identifiers
      return <span key={i} className="text-zinc-200 font-mono">{token}</span>;
    });
  }, [value, tables, customModules]);

  return (
    <div className={cn("relative flex-1 flex flex-col w-full h-full bg-zinc-950 overflow-hidden font-mono text-xs select-text", className)}>
      <div className="flex-1 relative flex overflow-hidden">
        {/* Line Numbers Gutter */}
        <div
          ref={gutterRef}
          className="w-12 bg-zinc-950/90 border-r border-zinc-800/80 text-zinc-600 select-none py-3 text-right pr-3 font-mono overflow-hidden shrink-0 pointer-events-none"
        >
          {lineNumbers.map(n => (
            <div key={n} className="leading-6 text-[11px]">{n}</div>
          ))}
        </div>

        {/* Editor Main Content Area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Syntax Highlighting Color Layer */}
          <div
            ref={overlayRef}
            aria-hidden="true"
            className="absolute inset-0 p-3 leading-6 font-mono text-xs whitespace-pre overflow-hidden pointer-events-none select-none"
          >
            {renderHighlightedCode}
          </div>

          {/* Transparent Input Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            onClick={(e) => {
              setCursorPos(e.currentTarget.selectionStart);
              setShowSuggestions(false);
            }}
            spellCheck={false}
            className="absolute inset-0 w-full h-full p-3 bg-transparent text-transparent caret-white leading-6 font-mono text-xs resize-none focus:outline-none whitespace-pre overflow-auto selection:bg-indigo-500/30 selection:text-transparent"
            placeholder="-- Write your SQL query here..."
          />

          {/* Floating IntelliSense Autocomplete Popover */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsBoxRef}
              style={{
                top: `${suggestionCoords.top}px`,
                left: `${suggestionCoords.left}px`
              }}
              className="absolute z-50 w-72 max-h-60 bg-zinc-900/95 backdrop-blur-2xl border border-zinc-700/80 shadow-2xl rounded-2xl overflow-y-auto p-1.5 space-y-0.5 font-mono text-xs animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between border-b border-zinc-800 mb-1">
                <span>IntelliSense Suggestions</span>
                <span className="text-[9px] text-zinc-500">Tab / ↵ to insert</span>
              </div>

              {suggestions.map((item, idx) => (
                <button
                  key={`${item.label}-${idx}`}
                  type="button"
                  onClick={() => applySuggestion(item)}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition-all cursor-pointer",
                    selectedIndex === idx 
                      ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20" 
                      : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {item.kind === 'parameter' && <Sliders size={13} className={selectedIndex === idx ? "text-white" : "text-amber-400"} />}
                    {item.kind === 'table' && <Database size={13} className={selectedIndex === idx ? "text-white" : "text-sky-400"} />}
                    {item.kind === 'module' && <Layers size={13} className={selectedIndex === idx ? "text-white" : "text-purple-400"} />}
                    {item.kind === 'column' && <ColumnsIcon size={13} className={selectedIndex === idx ? "text-white" : "text-zinc-400"} />}
                    {item.kind === 'function' && <Zap size={13} className={selectedIndex === idx ? "text-white" : "text-pink-400"} />}
                    {item.kind === 'keyword' && <Code size={13} className={selectedIndex === idx ? "text-white" : "text-indigo-400"} />}

                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.detail && (
                    <span className={cn(
                      "text-[10px] ml-2 shrink-0 truncate",
                      selectedIndex === idx ? "text-indigo-200" : "text-zinc-500"
                    )}>
                      {item.detail}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SqlEditor;
