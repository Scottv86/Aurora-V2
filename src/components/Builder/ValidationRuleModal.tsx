import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Play, 
  CheckCircle,
  AlertTriangle,
  Loader2,
  Code,
  Hash,
  Search,
  Info,
  FunctionSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { ValidationRule, evaluateRuleExpression } from '../../lib/validationEngine';
import { generateExpression } from '../../services/aiService';

interface ValidationRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: ValidationRule) => void;
  rule: ValidationRule | null;
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

export const ValidationRuleModal: React.FC<ValidationRuleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  rule,
  fields
}) => {
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

  // Sidebar State
  const [sidebarTab, setSidebarTab] = useState<'fields' | 'functions'>('fields');
  const [searchQuery, setSearchQuery] = useState('');

  // Suggestions State
  const [suggestions, setSuggestions] = useState<{ label: string; value: string; type: 'variable' | 'function'; description?: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [suggestionPos, setSuggestionPos] = useState({ top: 0, left: 0 });
  const [suggestionTrigger, setSuggestionTrigger] = useState<{ type: 'variable' | 'function'; index: number } | null>(null);
  
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'number': return { label: 'NUM', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
      case 'currency': return { label: 'CUR', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
      case 'text':
      case 'longText': return { label: 'TXT', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' };
      case 'calculation': return { label: 'CALC', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
      case 'lookup': return { label: 'REL', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' };
      case 'repeatableGroup': return { label: 'LIST', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' };
      default: return { label: 'VAR', color: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' };
    }
  };

  // Suggestions Effects & Handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
    setTimeout(handleCursorMove, 0);

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
      top: rect.top - textareaRect.top + textarea.scrollTop + 22,
      left: rect.left - textareaRect.left + textarea.scrollLeft
    });
  };

  useEffect(() => {
    if (isOpen) {
      if (rule) {
        setName(rule.name);
        setExpression(rule.expression);
        setErrorMessage(rule.errorMessage);
        setIsActive(rule.isActive);
        setSeverity(rule.severity || 'error');
      } else {
        setName('');
        setExpression('');
        setErrorMessage('');
        setIsActive(true);
        setSeverity('error');
      }
      
      // Initialize sandbox data with default/mock values
      const initialSandbox: Record<string, any> = {};
      fields.forEach(f => {
        initialSandbox[f.id] = f.defaultValue ?? (f.type === 'number' || f.type === 'currency' ? 0 : '');
      });
      setSandboxData(initialSandbox);
      setSandboxResult(null);
      setAiPrompt('');
    }
  }, [isOpen, rule, fields]);

  // Run validation in sandbox
  const runSandboxTest = () => {
    try {
      // Create test values mapped properly
      const result = evaluateRuleExpression(expression, sandboxData, fields);
      setSandboxResult({ success: result });
    } catch (err: any) {
      setSandboxResult({ success: false, error: err.message || 'Expression evaluation error' });
    }
  };

  const handleInsertToken = (token: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const newExpr = before + token + after;
    setExpression(newExpr);
    
    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + token.length;
    }, 50);
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const generated = await generateExpression(aiPrompt, fields, []);
      if (generated && !generated.startsWith('//')) {
        setExpression(generated);
        
        // Auto-generate name and error message if empty
        if (!name) {
          setName(aiPrompt.substring(0, 40) + (aiPrompt.length > 40 ? '...' : ''));
        }
        if (!errorMessage) {
          setErrorMessage(`Validation failed: Constraint violated: ${aiPrompt.toLowerCase()}`);
        }
      } else {
        throw new Error(generated || 'No expression returned');
      }
    } catch (err: any) {
      console.error(err);
      alert('AI Generation failed. Please try a simpler description.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('Rule Name is required.');
      return;
    }
    if (!expression.trim()) {
      alert('Rule Expression is required.');
      return;
    }
    if (!errorMessage.trim()) {
      alert('Error Message is required.');
      return;
    }

    onSave({
      id: rule?.id || `rule_${Date.now()}`,
      name,
      expression,
      errorMessage,
      isActive,
      severity
    });
  };

  if (!isOpen) return null;

  // Filter fields and functions based on search query
  const filteredFields = fields
    .filter(f => f.type !== 'heading' && f.type !== 'divider' && f.type !== 'spacer')
    .filter(f => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (f.label || '').toLowerCase().includes(q) || (f.name || '').toLowerCase().includes(q);
    });

  const filteredFunctions = COMMON_FUNCTIONS.filter(func => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return func.name.toLowerCase().includes(q) || func.desc.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative w-full max-w-[92vw] h-[90vh] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-8 py-5 border-b border-zinc-150 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-650 dark:text-indigo-400">
              <Code size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-white tracking-tight">
                {rule ? 'Edit Validation Rule' : 'New Validation Rule'}
              </h3>
              <p className="text-[10px] text-zinc-500 font-medium">Create expressions to ensure field data meets constraint rules.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden flex divide-x divide-zinc-200 dark:divide-zinc-800">
          
          {/* Left Sidebar: Variables & Functions */}
          <aside className="w-72 shrink-0 flex flex-col bg-zinc-50/30 dark:bg-zinc-900/10 h-full">
            {/* Tabs */}
            <div className="p-3 flex gap-1 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-950/40">
              <button 
                type="button"
                onClick={() => { setSidebarTab('fields'); setSearchQuery(''); }}
                className={cn(
                  "flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border flex flex-col items-center justify-center gap-1",
                  sidebarTab === 'fields' 
                    ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 dark:border-indigo-500/10 shadow-sm" 
                    : "text-zinc-500 border-transparent hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50"
                )}
              >
                <Hash size={12} />
                <span>Variables</span>
              </button>
              <button 
                type="button"
                onClick={() => { setSidebarTab('functions'); setSearchQuery(''); }}
                className={cn(
                  "flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border flex flex-col items-center justify-center gap-1",
                  sidebarTab === 'functions' 
                    ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 dark:border-indigo-500/10 shadow-sm" 
                    : "text-zinc-500 border-transparent hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50"
                )}
              >
                <Code size={12} />
                <span>Functions</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-zinc-150 dark:border-zinc-800 bg-white/30 dark:bg-zinc-950/10">
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={sidebarTab === 'fields' ? "Search variables..." : "Search functions..."}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl pl-8 pr-4 py-2 text-[10px] font-bold focus:outline-none focus:border-indigo-500/50 transition-all shadow-sm dark:text-white"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
              {sidebarTab === 'fields' ? (
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-1">Fields (Slugs)</p>
                  {filteredFields.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleInsertToken(f.name ? `{${f.name}}` : `{{f.id}}`)}
                      className="w-full text-left p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 hover:border-indigo-500/50 hover:bg-indigo-500/[0.02] rounded-2xl transition-all flex items-center gap-3 group shadow-sm"
                    >
                      <div className="w-7 h-7 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 group-hover:text-indigo-500 transition-colors shrink-0">
                        {f.type === 'currency' ? <span className="text-[10px] font-bold">$</span> :
                         f.type === 'number' || f.type === 'calculation' ? <Hash size={12} /> :
                         <Hash size={12} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <p className="text-[11px] font-bold text-zinc-950 dark:text-zinc-100 truncate">{f.label}</p>
                          <span className={cn("px-1 py-0.5 rounded text-[7px] font-black border uppercase shrink-0", getTypeBadge(f.type).color)}>
                            {getTypeBadge(f.type).label}
                          </span>
                        </div>
                        {f.name && (
                          <p className="text-[8.5px] font-mono text-zinc-450 dark:text-zinc-500 truncate mt-0.5">{f.name}</p>
                        )}
                      </div>
                    </button>
                  ))}
                  {filteredFields.length === 0 && (
                    <p className="text-[10px] text-zinc-450 text-center py-4">No fields found</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-1">Formulas</p>
                  {filteredFunctions.map((func, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleInsertToken(func.template)}
                      className="w-full text-left p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 hover:border-indigo-500/50 hover:bg-indigo-500/[0.02] rounded-2xl transition-all flex flex-col gap-1 group shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 group-hover:text-indigo-500 transition-colors shrink-0">
                          <Code size={12} />
                        </div>
                        <span className="text-[11px] font-mono font-bold text-zinc-950 dark:text-zinc-50 truncate">{func.name.split('(')[0]}</span>
                      </div>
                      <span className="text-[8.5px] text-zinc-500 dark:text-zinc-400 pl-9 leading-tight">{func.desc}</span>
                    </button>
                  ))}
                  {filteredFunctions.length === 0 && (
                    <p className="text-[10px] text-zinc-450 text-center py-4">No functions found</p>
                  )}
                </div>
              )}
            </div>
          </aside>

          {/* Center: Configuration Form */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
            
            {/* AI Generator Panel */}
            <div className="p-5 bg-gradient-to-r from-indigo-650 to-indigo-800 rounded-2xl relative overflow-hidden shadow-lg shadow-indigo-500/10 shrink-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl -mr-16 -mt-16" />
              <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-2 text-white">
                  <Sparkles size={14} className="animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Shadow Architect Copilot</span>
                </div>
                <p className="text-white/80 text-[10px] leading-relaxed">Describe the constraint in plain English, and AI will compile it into an expression.</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="e.g. Quantity must be greater than 0 and less than 100..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:bg-white/20 transition-all"
                  />
                  <button 
                    onClick={handleGenerateAI}
                    disabled={isGenerating || !aiPrompt.trim()}
                    className="px-4 py-2 bg-white text-indigo-650 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-50 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    <span>Generate</span>
                  </button>
                </div>
              </div>
            </div>

            {/* General Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Rule Name</label>
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Total Budget Cap Check"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all rounded-xl px-4 py-3 text-xs dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Severity</label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as any)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all rounded-xl px-3 py-3 text-xs dark:text-white cursor-pointer"
                    >
                      <option value="error">Error (Blocks Save)</option>
                      <option value="warning">Warning (Prompts User)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-6 pl-2">
                    <input 
                      type="checkbox"
                      id="isActive"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 text-indigo-650 rounded border-zinc-300 dark:border-zinc-800 focus:ring-indigo-500 dark:bg-zinc-950 cursor-pointer"
                    />
                    <label htmlFor="isActive" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">Active</label>
                  </div>
                </div>
              </div>

              {/* Expression Textarea */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Rule Expression</label>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium italic">Evaluates to TRUE when valid</span>
                    <button 
                      type="button"
                      onClick={() => setExpression('')}
                      className="px-2.5 py-1 bg-zinc-100 hover:bg-rose-500/10 hover:text-rose-605 dark:bg-zinc-905 text-zinc-500 text-[8px] font-black uppercase rounded-lg transition-all border border-zinc-200 dark:border-zinc-800 hover:border-rose-500/30"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="flex bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all rounded-2xl overflow-hidden relative h-48 shadow-inner">
                  {/* Line Number Gutter */}
                  <div className="w-10 bg-zinc-100/50 dark:bg-zinc-900/20 border-r border-zinc-200 dark:border-zinc-850 flex flex-col pt-4 text-right pr-2.5 select-none pointer-events-none overflow-hidden">
                    {expression.split('\n').map((_, i) => (
                      <div key={i} className="text-[10px] font-mono leading-[22px] text-zinc-300 dark:text-zinc-650 h-[22px]">
                        {i + 1}
                      </div>
                    ))}
                  </div>

                  <div className="flex-1 relative overflow-hidden">
                    {/* Highlighting Overlay */}
                    <div 
                      aria-hidden="true"
                      className="absolute inset-0 p-4 text-xs font-mono leading-[22px] pointer-events-none whitespace-pre overflow-x-auto overflow-y-auto custom-scrollbar"
                      style={{ color: 'transparent' }}
                    >
                      {expression.split(/(\/\*[\s\S]*?\*\/|\/\/.*|\{[^{}]+\}|[A-Z_]+(?=\()|[()\[\],]|"[^"]*"|'[^']*'|\b\d+(?:\.\d+)?\b|[+\-*/%=<>!&|]+|\b[a-zA-Z_][a-zA-Z0-9_]*\b)/g).map((part, i) => {
                         let colorClass = "text-zinc-500 dark:text-zinc-650"; // Default punctuation / syntax
                         
                         if (/^\{[^}]+\}$/.test(part)) {
                           colorClass = "text-indigo-650 dark:text-indigo-400 font-bold";
                         } else if (/^[A-Z_]+$/.test(part)) {
                           colorClass = "text-emerald-650 dark:text-emerald-400 font-bold";
                         } else if (/^[()\[\],]$/.test(part)) {
                           colorClass = "text-emerald-650 dark:text-emerald-400 font-bold";
                         } else if (/^\d+(?:\.\d+)?$/.test(part)) {
                           colorClass = "text-amber-600 dark:text-amber-450";
                         } else if (/^'[^']*'$/.test(part) || /^"[^"]*"$/.test(part)) {
                           colorClass = "text-rose-600 dark:text-rose-455";
                         } else if (/^[+\-*/%=<>!&|]+$/.test(part)) {
                           colorClass = "text-zinc-900 dark:text-zinc-200 font-bold";
                         } else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(part)) {
                           colorClass = "text-zinc-900 dark:text-zinc-100";
                         }

                         return <span key={i} className={colorClass}>{part}</span>;
                       })}
                    </div>

                    {/* Actual Textarea */}
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
                        if (gutter) {
                          gutter.scrollTop = e.currentTarget.scrollTop;
                        }
                        if (showSuggestions) setShowSuggestions(false);
                      }}
                      placeholder="e.g. {total_cost} <= {allowed_budget}"
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
                          className="absolute z-[2000] w-80 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-200"
                        >
                          <div className="p-1.5 space-y-0.5 max-h-56 overflow-y-auto custom-scrollbar">
                            {suggestions.map((s, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => applySuggestion(s)}
                                onMouseEnter={() => setSelectedIndex(i)}
                                className={cn(
                                  "w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all group/sug",
                                  i === selectedIndex 
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" 
                                    : "text-zinc-655 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                )}
                              >
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                  i === selectedIndex ? "bg-white/20" : "bg-zinc-100 dark:bg-zinc-850"
                                )}>
                                  {s.type === 'variable' ? <Hash size={14} /> : <FunctionSquare size={14} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className={cn("text-[11px] font-bold truncate", i === selectedIndex ? "text-white" : "text-zinc-900 dark:text-white")}>
                                      {s.label}
                                    </p>
                                    <span className={cn(
                                      "text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border shrink-0",
                                      i === selectedIndex ? "bg-white/20 border-white/30 text-white" : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400"
                                    )}>
                                      {s.type === 'variable' ? 'VAR' : 'FUNC'}
                                    </span>
                                  </div>
                                  {s.description && (
                                    <p className={cn("text-[8.5px] truncate mt-0.5", i === selectedIndex ? "text-white/60" : "text-zinc-500")}>
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
              </div>

              {/* Error Message */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Custom Error Message</label>
                <input 
                  type="text"
                  value={errorMessage}
                  onChange={(e) => setErrorMessage(e.target.value)}
                  placeholder="e.g. Total cost cannot exceed allowed budget!"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all rounded-xl px-4 py-3 text-xs dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Right Panel: Live Sandbox Tester */}
          <div className="w-[360px] shrink-0 overflow-y-auto bg-zinc-50/55 dark:bg-zinc-950/20 flex flex-col p-6 h-full custom-scrollbar gap-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <Play size={12} className="text-emerald-500" />
                <span>Sandbox Tester</span>
              </h4>
              <button 
                onClick={runSandboxTest}
                disabled={!expression}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-md shadow-indigo-500/10 disabled:opacity-50"
              >
                <Play size={10} fill="currentColor" />
                <span>Run Test</span>
              </button>
            </div>

            {/* Sandbox Test Result Indicator */}
            {sandboxResult && (
              <div className={cn(
                "p-4 rounded-2xl border flex gap-3 items-start text-xs font-medium leading-relaxed animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm",
                sandboxResult.success 
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400" 
                  : sandboxResult.error
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-450"
              )}>
                {sandboxResult.success ? (
                  <>
                    <CheckCircle size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-800 dark:text-emerald-350">Test Passed</p>
                      <p className="text-[10px] opacity-80">Constraint is satisfied. Data is valid.</p>
                    </div>
                  </>
                ) : sandboxResult.error ? (
                  <>
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-800 dark:text-amber-350">Syntax Error</p>
                      <p className="text-[10px] opacity-80">{sandboxResult.error}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <X size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-800 dark:text-rose-350">Validation Triggered</p>
                      <p className="text-[10px] opacity-80">Constraint violated. Message: &quot;{errorMessage || 'Validation failed.'}&quot;</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Sandbox Mock Inputs */}
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[420px] p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl custom-scrollbar pr-2 shadow-sm">
              {(() => {
                const usedFields = fields.filter(f => {
                  if (f.type === 'heading' || f.type === 'divider' || f.type === 'spacer') return false;
                  const escapedName = f.name ? f.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
                  const escapedId = f.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  const idPattern = new RegExp(`\\{\\{${escapedId}\\}\\}`, 'i');
                  const namePattern1 = escapedName ? new RegExp(`\\{${escapedName}\\}`, 'i') : null;
                  const namePattern2 = escapedName ? new RegExp(`\\{\\{${escapedName}\\}\\}`, 'i') : null;
                  return idPattern.test(expression) || 
                         (namePattern1 ? namePattern1.test(expression) : false) || 
                         (namePattern2 ? namePattern2.test(expression) : false);
                });

                if (usedFields.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400 dark:text-zinc-500 px-4 space-y-2">
                      <Info size={20} className="opacity-40" />
                      <p className="text-[10px] font-bold uppercase tracking-wider">No variables in use</p>
                      <p className="text-[9px] leading-relaxed max-w-[200px]">Insert variables (e.g. <code>&#123;quantity&#125;</code>) from the sidebar to test them in the sandbox.</p>
                    </div>
                  );
                }

                return usedFields.map(f => (
                  <div key={f.id} className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="text-[8.5px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide px-1">
                      {f.label}{f.name ? ` (${f.name})` : ''}
                    </label>
                    <input 
                      type={f.type === 'number' || f.type === 'currency' ? 'number' : 'text'}
                      value={sandboxData[f.id] ?? ''}
                      onChange={(e) => {
                        const val = f.type === 'number' || f.type === 'currency' ? Number(e.target.value) : e.target.value;
                        setSandboxData(prev => ({ ...prev, [f.id]: val }));
                        // Clear sandbox result on input change
                        setSandboxResult(null);
                      }}
                      placeholder={`Mock ${f.label} value`}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800/85 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all rounded-xl px-3 py-2 text-[10.5px] dark:text-white"
                    />
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-5 border-t border-zinc-150 dark:border-zinc-800 flex justify-end gap-3 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-zinc-750 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2.5 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-indigo-500/10"
          >
            Save Rule
          </button>
        </div>

      </motion.div>
    </div>
  );
};
