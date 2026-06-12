import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  Play, 
  CheckCircle,
  AlertTriangle,
  Loader2,
  Code,
  Hash,
  Search,
  FunctionSquare,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { ValidationRule, evaluateRuleExpression } from '../../lib/validationEngine';
import { generateExpression } from '../../services/aiService';

interface ValidationsTabProps {
  validationRules: ValidationRule[];
  setValidationRules: React.Dispatch<React.SetStateAction<ValidationRule[]>>;
  fields: any[];
}

const COMMON_FUNCTIONS = [
  { name: 'IF(cond, true, false)', template: 'IF(, , )', desc: 'Returns value based on condition' },
  { name: 'AND(c1, c2, ...)', template: 'AND(, )', desc: 'Returns true if all conditions are true' },
  { name: 'OR(c1, c2, ...)', template: 'OR(, )', desc: 'Returns true if any condition is true' },
  { name: 'NOT(cond)', template: 'NOT()', desc: 'Negates a condition' },
  { name: 'IS_NULL(val)', template: 'IS_NULL()', desc: 'Checks if value is empty' },
  { name: 'SUM(a, b, ...)', template: 'SUM(, )', desc: 'Calculates the sum of inputs' },
  { name: 'AVG(a, b, ...)', template: 'AVG(, )', desc: 'Calculates average of inputs' },
  { name: 'ROUND(n, d)', template: 'ROUND(, 0)', desc: 'Rounds number to decimal places' },
  { name: 'TODAY()', template: 'TODAY()', desc: 'Returns current date' },
  { name: 'NOW()', template: 'NOW()', desc: 'Returns current timestamp' },
  { name: 'TIMESPAN(unit, d1, d2)', template: 'TIMESPAN(\'days\', , )', desc: 'Calculates difference between dates' },
  { name: 'ADD_DAYS(date, days)', template: 'ADD_DAYS(, 7)', desc: 'Adds days to a date' },
];

export const ValidationsTab: React.FC<ValidationsTabProps> = ({
  validationRules,
  setValidationRules,
  fields
}) => {
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  
  // Editor States
  const [name, setName] = useState('');
  const [expression, setExpression] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [severity, setSeverity] = useState<'error' | 'warning'>('error');
  
  // AI State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Sandbox State
  const [sandboxData, setSandboxData] = useState<Record<string, any>>({});
  const [sandboxResult, setSandboxResult] = useState<{ success: boolean; error?: string } | null>(null);

  // Search & Filtering States
  const [ruleSearchQuery, setRuleSearchQuery] = useState('');
  const [refSearchQuery, setRefSearchQuery] = useState('');
  const [refTab, setRefTab] = useState<'fields' | 'functions'>('fields');

  // IntelliSense State
  const [suggestions, setSuggestions] = useState<{ label: string; value: string; type: 'variable' | 'function'; description?: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [suggestionPos, setSuggestionPos] = useState({ top: 0, left: 0 });
  const [suggestionTrigger, setSuggestionTrigger] = useState<{ type: 'variable' | 'function'; index: number } | null>(null);
  
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedRule = useMemo(() => {
    return validationRules.find(r => r.id === selectedRuleId) || null;
  }, [validationRules, selectedRuleId]);

  // Auto-select the first rule on load/mount if none is currently selected
  useEffect(() => {
    if (!selectedRuleId && validationRules && validationRules.length > 0) {
      setSelectedRuleId(validationRules[0].id);
    }
  }, [validationRules, selectedRuleId]);

  // Load selected rule into form
  useEffect(() => {
    if (selectedRule) {
      setName(selectedRule.name);
      setExpression(selectedRule.expression);
      setErrorMessage(selectedRule.errorMessage);
      setIsActive(selectedRule.isActive);
      setSeverity(selectedRule.severity || 'error');
    } else {
      setName('');
      setExpression('');
      setErrorMessage('');
      setIsActive(true);
      setSeverity('error');
    }
    setSandboxResult(null);
    setAiPrompt('');
  }, [selectedRuleId, selectedRule]);

  const updateCurrentRule = (updates: Partial<ValidationRule>) => {
    if (!selectedRuleId) return;
    setValidationRules(prev => prev.map(r => r.id === selectedRuleId ? { ...r, ...updates } : r));
  };

  // Sync Sandbox inputs structure when expression fields change
  useEffect(() => {
    // Collect variables inside {brackets}
    const variables: string[] = [];
    const regex = /\{([a-zA-Z0-9_]+)\}/g;
    let match;
    while ((match = regex.exec(expression)) !== null) {
      variables.push(match[1]);
    }
    
    // Also support {{ids}}
    const idRegex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
    while ((match = idRegex.exec(expression)) !== null) {
      variables.push(match[1]);
    }

    const uniqueVars = [...new Set(variables)];
    
    setSandboxData(prev => {
      const nextData = { ...prev };
      uniqueVars.forEach(v => {
        const foundField = fields.find(f => f.name === v || f.id === v);
        if (nextData[v] === undefined) {
          nextData[v] = foundField?.defaultValue ?? (foundField?.type === 'number' || foundField?.type === 'currency' ? 0 : '');
        }
      });
      return nextData;
    });
  }, [expression, fields]);

  // Autocomplete Suggestions handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSuggestions]);

  const applySuggestion = (suggestion: any) => {
    if (!suggestionTrigger || !textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = suggestionTrigger.index;
    const end = textarea.selectionStart;
    const currentVal = textarea.value;
    
    const func = suggestion.type === 'function' ? COMMON_FUNCTIONS.find(f => f.name.split('(')[0] === suggestion.label) : null;
    const isZeroArg = func?.template?.endsWith('()');
    
    const insertion = suggestion.type === 'variable' ? suggestion.value : `${suggestion.label}()`;
    const cursorOffset = (suggestion.type === 'function' && !isZeroArg) ? insertion.length - 1 : insertion.length;
    const newVal = currentVal.substring(0, start) + insertion + currentVal.substring(end);
    
    setExpression(newVal);
    updateCurrentRule({ expression: newVal });
    setShowSuggestions(false);
    setSuggestionTrigger(null);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
      handleCursorMove();
    }, 0);
  };

  const handleCursorMove = () => {
    if (!textareaRef.current) return;
    const cursorIndex = textareaRef.current.selectionStart;
    const currentVal = textareaRef.current.value;
    
    if (showSuggestions && suggestionTrigger) {
      const textBeforeCursor = currentVal.substring(0, cursorIndex);
      if (suggestionTrigger.type === 'variable') {
        const match = textBeforeCursor.substring(suggestionTrigger.index + 1);
        if (match.includes('}') || match.includes('\n') || cursorIndex <= suggestionTrigger.index) {
          setShowSuggestions(false);
          setSuggestionTrigger(null);
        } else {
          updateSuggestions('variable', match);
          setTimeout(() => updateSuggestionPos(suggestionTrigger.index + 1), 0);
        }
      } else if (suggestionTrigger.type === 'function') {
        const words = textBeforeCursor.split(/[\s+\-*/%(),]/);
        const lastWord = words[words.length - 1];
        if (cursorIndex <= suggestionTrigger.index) {
          setShowSuggestions(false);
          setSuggestionTrigger(null);
        } else {
          updateSuggestions('universal', lastWord);
          setTimeout(() => updateSuggestionPos(suggestionTrigger.index), 0);
        }
      }
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const cursorIndex = e.target.selectionStart;
    setExpression(newVal);
    updateCurrentRule({ expression: newVal });
    setTimeout(handleCursorMove, 0);

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

  const updateSuggestions = (type: 'variable' | 'function' | 'universal', query: string) => {
    const q = query.toLowerCase();
    let matches: any[] = [];
    
    const availableVariables = fields
      .filter(f => f.type !== 'heading' && f.type !== 'divider' && f.type !== 'spacer')
      .map(f => {
        const hasSlug = !!f.name;
        return {
          label: f.name || f.label || f.id,
          value: hasSlug ? `{${f.name}}` : `{{${f.id}}}`,
          type: 'variable' as const,
          description: `${f.label} (${f.type.toUpperCase()})`
        };
      });

    const availableFunctions = COMMON_FUNCTIONS.map(f => ({
      label: f.name.split('(')[0],
      value: f.template,
      type: 'function' as const,
      description: f.desc
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions) {
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
        setShowSuggestions(false);
        return;
      }
    }
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
      top: rect.top - textareaRect.top + textarea.scrollTop + 22,
      left: rect.left - textareaRect.left + textarea.scrollLeft
    });
  };

  // Run validation sandbox evaluation
  const runSandboxTest = () => {
    try {
      const result = evaluateRuleExpression(expression, sandboxData, fields);
      setSandboxResult({ success: result });
    } catch (err: any) {
      setSandboxResult({ success: false, error: err.message || 'Expression evaluation error' });
    }
  };

  // Inline insert field token helper
  const handleInsertToken = (token: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const newVal = before + token + after;
    setExpression(newVal);
    updateCurrentRule({ expression: newVal });
    
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + token.length;
    }, 50);
  };

  // AI expression generation handler
  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const generated = await generateExpression(aiPrompt, fields, []);
      if (generated && !generated.startsWith('//')) {
        setExpression(generated);
        const nextName = name || aiPrompt.substring(0, 40) + (aiPrompt.length > 45 ? '...' : '');
        const nextError = errorMessage || `Validation failed: ${aiPrompt.toLowerCase()}`;
        if (!name) setName(nextName);
        if (!errorMessage) setErrorMessage(nextError);
        updateCurrentRule({ expression: generated, name: nextName, errorMessage: nextError });
      } else {
        throw new Error(generated || 'No expression returned');
      }
    } catch (err) {
      console.error(err);
      alert('AI Generation failed. Please try a simpler description.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getSeverityColor = (sev?: string, active = true) => {
    if (!active) return 'bg-zinc-50 dark:bg-zinc-950 text-zinc-400 border-zinc-200 dark:border-zinc-800';
    return sev === 'warning'
      ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
      : 'bg-rose-500/10 text-rose-600 border-rose-500/20';
  };

  // Sidebar list filters
  const filteredRules = validationRules.filter(r => 
    r.name.toLowerCase().includes(ruleSearchQuery.toLowerCase()) || 
    r.expression.toLowerCase().includes(ruleSearchQuery.toLowerCase())
  );

  const filteredFields = fields
    .filter(f => f.type !== 'heading' && f.type !== 'divider' && f.type !== 'spacer')
    .filter(f => 
      (f.label || '').toLowerCase().includes(refSearchQuery.toLowerCase()) || 
      (f.name || '').toLowerCase().includes(refSearchQuery.toLowerCase())
    );

  const filteredFunctions = COMMON_FUNCTIONS.filter(func => 
    func.name.toLowerCase().includes(refSearchQuery.toLowerCase()) || 
    func.desc.toLowerCase().includes(refSearchQuery.toLowerCase())
  );

  // Determine type badges
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'number': return { label: 'NUM', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
      case 'currency': return { label: 'CUR', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
      case 'text':
      case 'longText': return { label: 'TXT', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' };
      case 'calculation': return { label: 'CALC', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
      case 'lookup': return { label: 'REL', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' };
      default: return { label: 'VAR', color: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' };
    }
  };

  return (
    <div className="flex h-full w-full bg-white dark:bg-zinc-950 overflow-hidden divide-x divide-zinc-200 dark:divide-zinc-800">
      
      {/* 1. Rules Sidebar (Left) */}
      <aside className="w-72 flex-shrink-0 bg-white dark:bg-zinc-950 p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Validation Rules</h3>
          <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 text-[9px] font-bold text-zinc-500">
            {validationRules.length}
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input 
            type="text"
            value={ruleSearchQuery}
            onChange={(e) => setRuleSearchQuery(e.target.value)}
            placeholder="Search rules..."
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-4 py-2 text-[10px] font-bold focus:outline-none focus:border-indigo-500/50 transition-all dark:text-white"
          />
        </div>

        {/* Rules List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
          {filteredRules.map(rule => (
            <button
              key={rule.id}
              onClick={() => {
                setSelectedRuleId(rule.id);
                setSandboxResult(null);
              }}
              className={cn(
                "w-full flex flex-col gap-1 px-4 py-3 rounded-xl text-left transition-all border group",
                selectedRuleId === rule.id
                  ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold truncate pr-2">{rule.name}</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border shrink-0",
                  getSeverityColor(rule.severity, rule.isActive)
                )}>
                  {rule.severity || 'error'}
                </span>
              </div>
              <p className={cn("text-[9.5px] font-mono truncate", selectedRuleId === rule.id ? "text-indigo-500/80" : "text-zinc-500")}>
                {rule.expression}
              </p>
              <div className="flex items-center justify-between w-full mt-1.5 pt-1.5 border-t border-dashed border-zinc-200 dark:border-zinc-800/80">
                <span className="text-[8.5px] text-zinc-400 uppercase tracking-widest">{rule.isActive ? 'Active' : 'Inactive'}</span>
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setValidationRules(prev => prev.filter(r => r.id !== rule.id));
                    if (selectedRuleId === rule.id) setSelectedRuleId(null);
                  }}
                  className="p-0.5 text-zinc-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </div>
              </div>
            </button>
          ))}
          {filteredRules.length === 0 && (
            <p className="text-[10px] text-zinc-400 text-center py-8">No rules defined</p>
          )}
        </div>

        {/* Add Button */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900">
          <button
            onClick={() => {
              const newId = `rule-${Date.now()}`;
              const newRule: ValidationRule = {
                id: newId,
                name: 'New Validation Rule',
                expression: '',
                errorMessage: 'Validation error: check your input.',
                severity: 'error',
                isActive: true
              };
              setValidationRules(prev => [...prev, newRule]);
              setSelectedRuleId(newId);
              setSandboxResult(null);
            }}
            className="w-full py-3 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            <Plus size={12} />
            New Rule
          </button>
        </div>
      </aside>

      {/* 2. Reference Sidebar (Left-Center) */}
      {selectedRuleId !== null || name ? (
        <aside className="w-64 flex-shrink-0 bg-zinc-50/20 dark:bg-zinc-950/20 p-6 flex flex-col gap-4">
          <div className="flex gap-1 border-b border-zinc-100 dark:border-zinc-900 pb-2 bg-transparent">
            <button 
              onClick={() => { setRefTab('fields'); setRefSearchQuery(''); }}
              className={cn(
                "flex-1 py-2 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all border flex flex-col items-center justify-center gap-1",
                refTab === 'fields' 
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" 
                  : "text-zinc-500 border-transparent hover:bg-zinc-100/50"
              )}
            >
              <Hash size={12} />
              <span>Variables</span>
            </button>
            <button 
              onClick={() => { setRefTab('functions'); setRefSearchQuery(''); }}
              className={cn(
                "flex-1 py-2 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all border flex flex-col items-center justify-center gap-1",
                refTab === 'functions' 
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" 
                  : "text-zinc-500 border-transparent hover:bg-zinc-100/50"
              )}
            >
              <Code size={12} />
              <span>Functions</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text"
              value={refSearchQuery}
              onChange={(e) => setRefSearchQuery(e.target.value)}
              placeholder={refTab === 'fields' ? "Search fields..." : "Search functions..."}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-4 py-2 text-[10px] font-bold focus:outline-none focus:border-indigo-500/50 transition-all dark:text-white"
            />
          </div>

          {/* Reference List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
            {refTab === 'fields' ? (
              filteredFields.map(f => (
                <button
                  key={f.id}
                  onClick={() => handleInsertToken(f.name ? `{${f.name}}` : `{{${f.id}}}`)}
                  className="w-full text-left p-2.5 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 hover:border-indigo-500/50 rounded-2xl transition-all flex items-center gap-3 group shadow-sm"
                >
                  <div className="w-7 h-7 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 group-hover:text-indigo-500 shrink-0">
                    <Hash size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <p className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate">{f.label}</p>
                      <span className={cn("px-1 py-0.5 rounded text-[7px] font-black border uppercase shrink-0", getTypeBadge(f.type).color)}>
                        {getTypeBadge(f.type).label}
                      </span>
                    </div>
                    {f.name && (
                      <p className="text-[8.5px] font-mono text-zinc-500 truncate mt-0.5">{f.name}</p>
                    )}
                  </div>
                </button>
              ))
            ) : (
              filteredFunctions.map((func, i) => (
                <button
                  key={i}
                  onClick={() => handleInsertToken(func.template)}
                  className="w-full text-left p-2.5 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 hover:border-indigo-500/50 rounded-2xl transition-all flex flex-col gap-1 group shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 group-hover:text-indigo-500 shrink-0">
                      <Code size={12} />
                    </div>
                    <span className="text-[11px] font-mono font-bold text-zinc-900 dark:text-zinc-50 truncate">{func.name.split('(')[0]}</span>
                  </div>
                  <span className="text-[8.5px] text-zinc-500 pl-9 leading-tight">{func.desc}</span>
                </button>
              ))
            )}
          </div>
        </aside>
      ) : null}

      {/* 3. Center Main Editor */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-zinc-50/30 dark:bg-zinc-950/20">
        {selectedRuleId !== null || name ? (
          <div className="max-w-3xl mx-auto space-y-6">
            
            {/* Header / Actions */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Configure Validation</h2>
                <p className="text-zinc-500 text-xs mt-0.5">Edit formula rules and severity properties.</p>
              </div>
            </div>

            {/* AI Generator Panel */}
            <div className="p-5 bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-[2rem] relative overflow-hidden shadow-lg shadow-indigo-500/10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl -mr-16 -mt-16" />
              <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-2 text-white">
                  <Sparkles size={14} className="animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">AI Rule Builder</span>
                </div>
                <p className="text-white/80 text-[10px] leading-relaxed">Describe the constraint in plain English, and the AI will auto-compile it into an expression.</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="e.g. End date must be after start date..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:bg-white/20 transition-all"
                  />
                  <button 
                    onClick={handleGenerateAI}
                    disabled={isGenerating || !aiPrompt.trim()}
                    className="px-4 py-2 bg-white text-indigo-700 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-50 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    <span>Generate</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Config Fields */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-6 shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Rule Name</label>
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      updateCurrentRule({ name: e.target.value });
                    }}
                    placeholder="e.g. Budget Cap Checker"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all rounded-xl px-4 py-3 text-xs dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Severity</label>
                    <select
                      value={severity}
                      onChange={(e) => {
                        setSeverity(e.target.value as any);
                        updateCurrentRule({ severity: e.target.value as any });
                      }}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all rounded-xl px-3 py-3 text-xs dark:text-white cursor-pointer"
                    >
                      <option value="error" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Error (Blocks Save)</option>
                      <option value="warning" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Warning (Prompts User)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-6 pl-2">
                    <input 
                      type="checkbox"
                      id="inlineIsActive"
                      checked={isActive}
                      onChange={(e) => {
                        setIsActive(e.target.checked);
                        updateCurrentRule({ isActive: e.target.checked });
                      }}
                      className="w-4 h-4 text-indigo-650 rounded border-zinc-350 dark:border-zinc-800 focus:ring-indigo-500 dark:bg-zinc-950 cursor-pointer"
                    />
                    <label htmlFor="inlineIsActive" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">Active</label>
                  </div>
                </div>
              </div>

              {/* Expression Textarea */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Rule Expression</label>
                  <span className="text-[9px] text-zinc-400 dark:text-zinc-500 italic">Evaluates to TRUE when valid</span>
                </div>
                <div className="flex bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/85 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all rounded-2xl overflow-hidden relative h-48 shadow-inner">
                  {/* Line numbers gutter */}
                  <div className="w-10 bg-zinc-100/40 dark:bg-zinc-900/10 border-r border-zinc-200 dark:border-zinc-800 flex flex-col pt-4 text-right pr-2.5 select-none pointer-events-none overflow-hidden">
                    {expression.split('\n').map((_, i) => (
                      <div key={i} className="text-[10px] font-mono leading-[22px] text-zinc-300 dark:text-zinc-650 h-[22px]">
                        {i + 1}
                      </div>
                    ))}
                  </div>

                  <div className="flex-1 relative overflow-hidden">
                    {/* Highlighting overlay */}
                    <div 
                      aria-hidden="true"
                      className="absolute inset-0 p-4 text-xs font-mono leading-[22px] pointer-events-none whitespace-pre overflow-x-auto overflow-y-auto custom-scrollbar"
                      style={{ color: 'transparent' }}
                    >
                      {expression.split(/(\/\*[\s\S]*?\*\/|\/\/.*|\{[^{}]+\}|[A-Z_]+(?=\()|[()\[\],]|"[^"]*"|'[^']*'|\b\d+(?:\.\d+)?\b|[+\-*/%=<>!&|]+|\b[a-zA-Z_][a-zA-Z0-9_]*\b)/g).map((part, i) => {
                         let colorClass = "text-zinc-500 dark:text-zinc-650";
                         if (/^\{[^}]+\}$/.test(part)) colorClass = "text-indigo-650 dark:text-indigo-400 font-bold";
                         else if (/^[A-Z_]+$/.test(part)) colorClass = "text-emerald-650 dark:text-emerald-450 font-bold";
                         else if (/^[()\[\],]$/.test(part)) colorClass = "text-emerald-650 dark:text-emerald-450 font-bold";
                         else if (/^\d+(?:\.\d+)?$/.test(part)) colorClass = "text-amber-600 dark:text-amber-450";
                         else if (/^'[^']*'$/.test(part) || /^"[^"]*"$/.test(part)) colorClass = "text-rose-600 dark:text-rose-455";
                         else if (/^[+\-*/%=<>!&|]+$/.test(part)) colorClass = "text-zinc-900 dark:text-zinc-200 font-bold";
                         else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(part)) colorClass = "text-zinc-900 dark:text-zinc-100";
                         return <span key={i} className={colorClass}>{part}</span>;
                       })}
                    </div>

                    {/* Editor Textarea */}
                    <textarea
                      ref={textareaRef}
                      value={expression}
                      onChange={handleTextChange}
                      onKeyDown={handleKeyDown}
                      onClick={handleCursorMove}
                      onKeyUp={handleCursorMove}
                      onScroll={(e) => {
                        const overlay = e.currentTarget.previousElementSibling;
                        const gutter = e.currentTarget.parentElement?.previousElementSibling;
                        if (overlay) {
                          overlay.scrollTop = e.currentTarget.scrollTop;
                          overlay.scrollLeft = e.currentTarget.scrollLeft;
                        }
                        if (gutter) gutter.scrollTop = e.currentTarget.scrollTop;
                        if (showSuggestions) setShowSuggestions(false);
                      }}
                      placeholder="e.g. {price} * {quantity} <= {budget}"
                      spellCheck={false}
                      className="absolute inset-0 w-full h-full bg-transparent p-4 text-xs font-mono text-transparent caret-zinc-900 dark:caret-white placeholder:text-zinc-350 dark:placeholder:text-zinc-750 focus:outline-none resize-none leading-[22px] whitespace-pre overflow-x-auto overflow-y-auto custom-scrollbar"
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
                          className="absolute z-[2000] w-80 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden"
                        >
                          <div className="p-1.5 space-y-0.5 max-h-56 overflow-y-auto custom-scrollbar">
                            {suggestions.map((s, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => applySuggestion(s)}
                                onMouseEnter={() => setSelectedIndex(i)}
                                className={cn(
                                  "w-full flex items-center gap-3 p-2 rounded-xl text-left transition-all",
                                  i === selectedIndex 
                                    ? "bg-indigo-650 text-white shadow-lg shadow-indigo-500/30" 
                                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                )}
                              >
                                <div className={cn(
                                  "w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0",
                                  i === selectedIndex ? "bg-white/20" : "bg-zinc-100 dark:bg-zinc-850"
                                )}>
                                  {s.type === 'variable' ? <Hash size={13} /> : <FunctionSquare size={13} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] font-bold truncate">{s.label}</p>
                                    <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border shrink-0">
                                      {s.type === 'variable' ? 'VAR' : 'FUNC'}
                                    </span>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Custom Error Message</label>
                <input 
                  type="text"
                  value={errorMessage}
                  onChange={(e) => {
                    setErrorMessage(e.target.value);
                    updateCurrentRule({ errorMessage: e.target.value });
                  }}
                  placeholder="e.g. Total cost cannot exceed allowed budget!"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all rounded-xl px-4 py-3 text-xs dark:text-white"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="max-w-md text-center space-y-4">
              <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl flex items-center justify-center mx-auto text-zinc-400">
                <ShieldCheck size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Validation Workspace</h3>
                <p className="text-zinc-500 text-xs leading-relaxed">
                  Select a rule from the left sidebar or click **+ New Rule** to configure data constraints and expressions.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Sandbox Testing Sidebar (Right) */}
      {selectedRuleId !== null || name ? (
        <aside className="w-80 flex-shrink-0 bg-white dark:bg-zinc-950 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Sandbox Sandbox</h3>
            <p className="text-[9px] text-zinc-400">Mock field inputs to evaluate rule logic.</p>
          </div>

          {/* Dynamic Mock Inputs */}
          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
            {Object.keys(sandboxData).map(key => {
              const matchedField = fields.find(f => f.name === key || f.id === key);
              return (
                <div key={key} className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
                    <span>{matchedField?.label || key}</span>
                    <span className="text-[7.5px] font-mono text-zinc-400">{"{" + key + "}"}</span>
                  </label>
                  {matchedField?.type === 'checkbox' ? (
                    <div className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-xl">
                      <input 
                        type="checkbox"
                        checked={!!sandboxData[key]}
                        onChange={(e) => setSandboxData(prev => ({ ...prev, [key]: e.target.checked }))}
                        className="w-4 h-4 text-indigo-600 rounded border-zinc-300 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="text-[10px] text-zinc-500 font-bold">{sandboxData[key] ? 'TRUE' : 'FALSE'}</span>
                    </div>
                  ) : (
                    <input 
                      type={matchedField?.type === 'number' || matchedField?.type === 'currency' ? 'number' : 'text'}
                      value={sandboxData[key] ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSandboxData(prev => ({
                          ...prev,
                          [key]: (matchedField?.type === 'number' || matchedField?.type === 'currency') ? Number(val) : val
                        }));
                      }}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-indigo-500/50 dark:text-white"
                    />
                  )}
                </div>
              );
            })}
            {Object.keys(sandboxData).length === 0 && (
              <p className="text-[10px] text-zinc-400 text-center py-4 italic">No variables referenced in formula yet.</p>
            )}
          </div>

          {/* Test Action */}
          <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-900">
            <button
              onClick={runSandboxTest}
              className="w-full py-2.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-indigo-650 hover:text-white dark:hover:bg-indigo-650 text-white dark:text-zinc-900 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Play size={10} />
              Evaluate Expression
            </button>

            {/* Test Results Output */}
            {sandboxResult && (
              <div className={cn(
                "p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in duration-200",
                sandboxResult.success 
                  ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400"
              )}>
                {sandboxResult.success ? (
                  <CheckCircle size={16} className="shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 text-[10px]">
                  <p className="font-bold">{sandboxResult.success ? 'Expression Passed (Valid)' : 'Expression Failed (Invalid)'}</p>
                  <p className="opacity-90 leading-relaxed font-mono">
                    {sandboxResult.success 
                      ? 'Rule evaluated to true. Save condition satisfies constraint.'
                      : sandboxResult.error || `Triggered: "${errorMessage}"`
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>
      ) : null}

    </div>
  );
};
