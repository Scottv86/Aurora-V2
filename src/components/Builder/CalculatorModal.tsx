import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Plus, 
  Minus,
  Asterisk,
  Divide,
  Calculator,
  FunctionSquare,
  Settings2,
  RotateCcw,
  Info,
  Hash,
  Terminal,
  Sparkles,
  Check,
  Zap,
  Clock,
  Save,
  MousePointer2,
  Wand2,
  AlertCircle,
  AlertTriangle,
  Lightbulb,
  Copy,
  CheckCircle2,
  BrainCircuit
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Field } from '../ModuleEditor';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (logic: string, triggers: string[]) => void;
  initialLogic?: string;
  initialTriggers?: string[];
  availableFields: Field[];
  targetLabel: string;
}

const OPERATORS = [
  { label: '+', value: ' + ', icon: Plus },
  { label: '-', value: ' - ', icon: Minus },
  { label: '×', value: ' * ', icon: Asterisk },
  { label: '÷', value: ' / ', icon: Divide },
  { label: '(', value: '(', icon: null },
  { label: ')', value: ')', icon: null },
  { label: '=', value: ' == ', icon: null },
  { label: '≠', value: ' != ', icon: null },
  { label: '>', value: ' > ', icon: null },
  { label: '<', value: ' < ', icon: null },
  { label: '≥', value: ' >= ', icon: null },
  { label: '≤', value: ' <= ', icon: null },
];

const FUNCTIONS = [
  { 
    name: 'IF', 
    template: 'IF(condition, then, else)', 
    description: 'Conditional logic',
    longDescription: 'Evaluates a condition and returns the second argument if true, or the third if false.',
    params: [
      { name: 'condition', desc: 'The logical test (e.g., {Price} > 100)' },
      { name: 'then', desc: 'Value to return if condition is true' },
      { name: 'else', desc: 'Value to return if condition is false' }
    ],
    examples: ['IF({Status} == "Paid", "Done", "Pending")', 'IF({Qty} > 0, {Total} / {Qty}, 0)']
  },
  { 
    name: 'AND', 
    template: 'AND(condition1, condition2)', 
    description: 'Logical AND',
    longDescription: 'Returns true only if ALL conditions are true.',
    params: [
      { name: 'condition1', desc: 'First logical test' },
      { name: 'condition2', desc: 'Second logical test' }
    ],
    examples: ['AND({Age} > 18, {HasLicense} == true)']
  },
  { 
    name: 'OR', 
    template: 'OR(condition1, condition2)', 
    description: 'Logical OR',
    longDescription: 'Returns true if AT LEAST ONE condition is true.',
    params: [
      { name: 'condition1', desc: 'First logical test' },
      { name: 'condition2', desc: 'Second logical test' }
    ],
    examples: ['OR({Dept} == "Sales", {IsManager} == true)']
  },
  { 
    name: 'CONCAT', 
    template: 'CONCAT(text1, text2)', 
    description: 'Join strings',
    longDescription: 'Combines two or more text values into one.',
    params: [
      { name: 'text1', desc: 'First text value' },
      { name: 'text2', desc: 'Second text value' }
    ],
    examples: ['CONCAT({FirstName}, " ", {LastName})']
  },
  { 
    name: 'ROUND', 
    template: 'ROUND(number, 2)', 
    description: 'Round decimals',
    longDescription: 'Rounds a number to a specified number of decimal places.',
    params: [
      { name: 'number', desc: 'The number to round' },
      { name: 'decimals', desc: 'Number of decimal places' }
    ],
    examples: ['ROUND({Tax}, 2)', 'ROUND({Total}, 0)']
  },
  { name: 'NOT', template: 'NOT(condition)', description: 'Logical NOT' },
  { name: 'CONTAINS', template: 'CONTAINS(text, search)', description: 'Check for substring' },
  { name: 'UPPER', template: 'UPPER(text)', description: 'To uppercase' },
  { name: 'LOWER', template: 'LOWER(text)', description: 'To lowercase' },
  { name: 'ABS', template: 'ABS(number)', description: 'Absolute value' },
  { name: 'SUM', template: 'SUM(range)', description: 'Sum of values' },
  { name: 'LEN', template: 'LEN(text)', description: 'String length' },
  { name: 'IS_EMPTY', template: 'IS_EMPTY(value)', description: 'Check if empty' },
];

const TRIGGER_OPTIONS = [
  { id: 'onLoad', label: 'On Load', icon: Clock, description: 'Calculate when record is opened' },
  { id: 'onChange', label: 'Real-time', icon: Zap, description: 'Update as dependent fields change' },
  { id: 'onSave', label: 'On Save', icon: Save, description: 'Calculate before record is saved' },
  { id: 'onManual', label: 'Manual', icon: MousePointer2, description: 'Calculate only when triggered' },
];

const DEFAULT_TRIGGERS = ['onLoad', 'onChange'];

export const CalculatorModal = ({
  isOpen,
  onClose,
  onSave,
  initialLogic = '',
  initialTriggers,
  availableFields,
  targetLabel
}: CalculatorModalProps) => {
  const [logic, setLogic] = useState(initialLogic);
  const [triggers, setTriggers] = useState<string[]>(initialTriggers || DEFAULT_TRIGGERS);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeTab, setActiveTab] = useState<'fields' | 'functions'>('fields');
  const [rightActiveTab, setRightActiveTab] = useState<'execution' | 'sandbox' | 'docs' | 'history'>('execution');
  const [mockValues, setMockValues] = useState<Record<string, string>>({});

  // History State
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoing, setIsUndoing] = useState(false);

  // Docs State
  const [docsSearch, setDocsSearch] = useState('');
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  // IntelliSense State
  const [suggestions, setSuggestions] = useState<{ label: string; value: string; type: 'variable' | 'function'; description?: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [suggestionPos, setSuggestionPos] = useState({ top: 0, left: 0 });
  const [suggestionTrigger, setSuggestionTrigger] = useState<{ type: 'variable' | 'function'; index: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLogic(initialLogic);
      setTriggers(initialTriggers || DEFAULT_TRIGGERS);
      setHistory([initialLogic]);
      setHistoryIndex(0);
    }
  }, [isOpen, initialLogic, initialTriggers]);

  // History Recording
  useEffect(() => {
    if (!isUndoing && logic !== history[historyIndex]) {
      const timer = setTimeout(() => {
        setHistory(prev => {
          const next = prev.slice(0, historyIndex + 1);
          return [...next, logic];
        });
        setHistoryIndex(prev => prev + 1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [logic]);

  const undo = () => {
    if (historyIndex > 0) {
      setIsUndoing(true);
      const prevLogic = history[historyIndex - 1];
      setLogic(prevLogic);
      setHistoryIndex(prev => prev - 1);
      setTimeout(() => setIsUndoing(false), 50);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setIsUndoing(true);
      const nextLogic = history[historyIndex + 1];
      setLogic(nextLogic);
      setHistoryIndex(prev => prev + 1);
      setTimeout(() => setIsUndoing(false), 50);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'number': return { label: 'NUM', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
      case 'currency': return { label: 'CUR', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
      case 'text':
      case 'longText': return { label: 'TXT', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' };
      case 'calculation': return { label: 'FX', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' };
      case 'dropdown': return { label: 'OPT', color: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' };
      case 'date': return { label: 'DTE', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
      case 'boolean': return { label: 'BOL', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' };
      default: return { label: 'VAR', color: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' };
    }
  };

  const insertText = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;
    const newVal = currentVal.substring(0, start) + text + currentVal.substring(end);
    
    setLogic(newVal);
    
    // Set cursor position after insertion
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const handleInsertField = (label: string) => {
    insertText(`{${label}}`);
  };

  const handleInsertFunction = (template: string) => {
    insertText(template);
  };

  const toggleTrigger = (id: string) => {
    setTriggers(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
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

    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      redo();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;

      setLogic(val.substring(0, start) + '  ' + val.substring(end));
      
      setTimeout(() => {
        textarea.setSelectionRange(start + 2, start + 2);
      }, 0);
    }
  };

  const applySuggestion = (suggestion: any) => {
    if (!suggestionTrigger || !textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = suggestionTrigger.index;
    const end = textarea.selectionStart;
    const currentVal = textarea.value;
    
    const insertion = suggestion.type === 'variable' ? `{${suggestion.label}}` : `${suggestion.label}(`;
    const newVal = currentVal.substring(0, start) + insertion + currentVal.substring(end);
    
    setLogic(newVal);
    setShowSuggestions(false);
    setSuggestionTrigger(null);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + insertion.length, start + insertion.length);
    }, 0);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const cursorIndex = e.target.selectionStart;
    setLogic(newVal);

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
      updateSuggestions('function', lastWord);
      setTimeout(() => updateSuggestionPos(cursorIndex - lastWord.length), 0);
    } else if (suggestionTrigger?.type === 'function') {
      if (/[\s+\-*/%(),]/.test(lastChar) || lastChar === undefined) {
        setShowSuggestions(false);
        setSuggestionTrigger(null);
      } else {
        updateSuggestions('function', lastWord);
        setTimeout(() => updateSuggestionPos(suggestionTrigger.index), 0);
      }
    } else {
      setShowSuggestions(false);
      setSuggestionTrigger(null);
    }
  };

  const updateSuggestions = (type: 'variable' | 'function', query: string) => {
    const q = query.toLowerCase();
    let matches: any[] = [];
    
    if (type === 'variable') {
      matches = availableFields
        .filter(f => f.label.toLowerCase().includes(q))
        .map(f => ({ label: f.label, value: f.id, type: 'variable' }));
    } else {
      matches = FUNCTIONS
        .filter(f => f.name.toLowerCase().startsWith(q))
        .map(f => ({ label: f.name, value: f.template, type: 'function', description: f.description }));
    }

    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
    setSelectedIndex(0);
  };

  const updateSuggestionPos = (index: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Create mirror element to measure position
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
    
    // Ensure the mirror is in the same container to respect any inherited styles
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
      top: rect.top - textareaRect.top + textarea.scrollTop + 26,
      left: rect.left - textareaRect.left + textarea.scrollLeft
    });
  };

  const magicFormat = () => {
    if (!logic) return;
    
    // 1. Basic cleanup
    let formatted = logic
      .replace(/\s*([+\-*/%]|==|!=|>=|<=|>|<|&&|\|\|)\s*/g, ' $1 ')
      .replace(/,\s*/g, ', ')
      .replace(/\s*\(/g, '(');

    // 2. Multi-line Indentation logic
    let indent = 0;
    const lines: string[] = [];
    let currentLine = '';
    
    for (let i = 0; i < formatted.length; i++) {
      const char = formatted[i];
      if (char === '(') {
        currentLine += char;
        lines.push(currentLine);
        indent++;
        currentLine = '  '.repeat(indent);
      } else if (char === ')') {
        if (currentLine.trim()) lines.push(currentLine);
        indent = Math.max(0, indent - 1);
        currentLine = '  '.repeat(indent) + char;
      } else if (char === ',') {
        currentLine += char;
        lines.push(currentLine);
        currentLine = '  '.repeat(indent);
      } else {
        currentLine += char;
      }
    }
    if (currentLine.trim()) lines.push(currentLine.trim());
    
    setLogic(lines.filter(l => l.length > 0).join('\n'));
  };

  const getValidation = () => {
    const errors: { message: string, line?: number }[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    const brokenTokens = new Set<string>();

    const getLineNumber = (index: number) => {
      return logic.substring(0, index).split('\n').length;
    };

    if (!logic.trim()) {
      warnings.push("Expression is empty. Calculation will result in null.");
      return { errors, warnings, suggestions, brokenTokens };
    }

    // 1. Parentheses Balance
    const openParen = (logic.match(/\(/g) || []).length;
    const closeParen = (logic.match(/\)/g) || []).length;
    if (openParen !== closeParen) {
      errors.push({ message: `Unmatched parentheses: ${openParen} open vs ${closeParen} closed.` });
    }

    // 2. Variable Integrity & Circular Check
    const openBrace = (logic.match(/\{/g) || []).length;
    const closeBrace = (logic.match(/\}/g) || []).length;
    if (openBrace !== closeBrace) {
      errors.push({ message: "Invalid variable syntax: Check for missing or unmatched curly brackets { }." });
    }

    const varRegex = /\{([^}]+)\}/g;
    let varMatch;
    while ((varMatch = varRegex.exec(logic)) !== null) {
      const tag = varMatch[0];
      const label = varMatch[1];
      const line = getLineNumber(varMatch.index);
      
      if (label === targetLabel) {
        errors.push({ message: `Circular Dependency: Field "{${label}}" cannot reference itself.`, line });
        brokenTokens.add(tag);
      }
      if (!availableFields.some(f => f.label === label)) {
        errors.push({ message: `Missing Variable: "{${label}}" does not exist in this module.`, line });
        brokenTokens.add(tag);
      }
    }

    // 3. Function Argument Validation
    const funcRegex = /([A-Z_]+)\(/g;
    let funcMatch;
    while ((funcMatch = funcRegex.exec(logic)) !== null) {
      const funcName = funcMatch[1];
      const line = getLineNumber(funcMatch.index);
      const funcDef = FUNCTIONS.find(f => f.name === funcName);
      
      if (!funcDef) {
        errors.push({ message: `Unknown Function: "${funcName}"`, line });
        brokenTokens.add(funcName);
        continue;
      }

      if (funcDef.params) {
        let depth = 0;
        let commaCount = 0;
        let foundEnd = false;
        for (let i = funcMatch.index + funcName.length + 1; i < logic.length; i++) {
          if (logic[i] === '(') depth++;
          if (logic[i] === ')') {
            if (depth === 0) { foundEnd = true; break; }
            depth--;
          }
          if (logic[i] === ',' && depth === 0) commaCount++;
        }
        
        if (foundEnd) {
          const argCount = commaCount + (logic[funcMatch.index + funcName.length + 1] === ')' ? 0 : 1);
          const minArgs = funcDef.params.length;
          if (argCount < minArgs) {
             errors.push({ message: `Incomplete Arguments: "${funcName}" expects ${minArgs} parameters, but found ${argCount}.`, line });
             brokenTokens.add(funcName);
          }
        }
      }
    }
    // ... suggestions and return ...

    // 4. Formatting Suggestions
    if (logic.length > 200 && !logic.includes('\n')) {
      suggestions.push("Long expression detected. Use 'Magic Format' to improve readability.");
    }
    if (logic.includes('=') && !logic.includes('==') && !logic.includes('!=') && !logic.includes('>=') && !logic.includes('<=') && !logic.includes('=>') && !logic.includes('=<')) {
      warnings.push("Detected '=' instead of '=='. In formulas, use '==' for equality testing.");
    }

    return { errors, warnings, suggestions, brokenTokens };
  };

  const computeResult = () => {
    const validation = getValidation();
    if (!logic.trim() || validation.errors.length > 0) return { result: null, error: 'Awaiting valid expression...' };
    
    try {
      let executable = logic;
      
      // 1. Variable Substitution
      executable = executable.replace(/\{([^}]+)\}/g, (match, label) => {
        const val = mockValues[label] || '0';
        // If it's a number or boolean, use as is, otherwise wrap in quotes
        if (val.toLowerCase() === 'true' || val.toLowerCase() === 'false') return val.toLowerCase();
        return isNaN(Number(val)) ? `"${val}"` : val;
      });

      // 2. Simple Function Mapping (IF, ROUND, etc.)
      // Note: This is a basic mapping for the sandbox preview
      executable = executable.replace(/IF\s*\(([^,]+),([^,]+),([^)]+)\)/gi, '($1 ? $2 : $3)');
      executable = executable.replace(/ROUND\s*\(([^,]+),([^)]+)\)/gi, 'Number(Number($1).toFixed($2))');
      executable = executable.replace(/AND\s*\(([^,]+),([^)]+)\)/gi, '($1 && $2)');
      executable = executable.replace(/OR\s*\(([^,]+),([^)]+)\)/gi, '($1 || $2)');
      
      // 3. JS Equality
      executable = executable.replace(/==/g, '===');
      
      // 4. Execution
      // eslint-disable-next-line no-new-func
      const result = new Function(`return ${executable}`)();
      return { result, error: null };
    } catch (err) {
      return { result: null, error: 'Runtime Error: Check your logic or mock values.' };
    }
  };

  const validation = getValidation();
  const sandbox = computeResult();

  const displayFields = availableFields.filter(f => 
    f.type !== 'group' && f.type !== 'fieldGroup' && f.type !== 'repeatableGroup'
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-white/60 dark:bg-black/80 backdrop-blur-xl"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 40 }}
            className="relative w-full max-w-[90vw] h-[90vh] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col"
          >
            {/* Modal Header */}
            <div className="px-10 py-6 border-b border-zinc-100 dark:border-zinc-900/50 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/20">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                  <Calculator size={28} className="text-white" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Logic Architect</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Building Logic for:</span>
                    <span className="px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded-lg text-xs font-black uppercase tracking-tight">{targetLabel}</span>
                  </div>
                </div>
              </div>
              <button 
                type="button"
                onClick={onClose}
                className="w-12 h-12 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-2xl transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Column - Variables & Functions */}
              <aside className="w-72 border-r border-zinc-100 dark:border-zinc-900 flex flex-col bg-zinc-50/30 dark:bg-zinc-900/10">
                <div className="p-4 flex gap-2">
                  <button 
                    type="button"
                    onClick={() => setActiveTab('fields')}
                    className={cn(
                      "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border",
                      activeTab === 'fields' 
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20" 
                        : "bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/30"
                    )}
                  >
                    Variables
                  </button>
                  <button 
                    type="button"
                    onClick={() => setActiveTab('functions')}
                    className={cn(
                      "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border",
                      activeTab === 'functions' 
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20" 
                        : "bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/30"
                    )}
                  >
                    Functions
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                  {activeTab === 'fields' ? (
                    <>
                      {displayFields.length > 0 ? (
                        displayFields.map(field => (
                          <div
                            key={field.id}
                            className="w-full flex items-center gap-3 p-3 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-indigo-500/50 hover:bg-indigo-500/[0.02] transition-all group text-left relative"
                          >
                            <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 transition-colors shrink-0">
                              {field.type === 'currency' ? <span className="text-xs font-bold">$</span> : 
                               field.type === 'number' || field.type === 'calculation' ? <Hash size={14} /> :
                               <Terminal size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{field.label}</p>
                                {(() => {
                                  const badge = getTypeBadge(field.type);
                                  return (
                                    <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-black border", badge.color)}>
                                      {badge.label}
                                    </span>
                                  );
                                })()}
                              </div>
                              <p className="text-[10px] text-zinc-500 font-mono truncate">{`{${field.id}}`}</p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!mockValues[field.label]) {
                                    setMockValues(prev => ({ ...prev, [field.label]: '' }));
                                  }
                                  setRightActiveTab('sandbox');
                                }}
                                className={cn(
                                  "w-7 h-7 flex items-center justify-center rounded-lg transition-all",
                                  mockValues[field.label] !== undefined
                                    ? "bg-amber-500/20 text-amber-500 shadow-inner"
                                    : "text-zinc-300 hover:text-amber-500 hover:bg-amber-500/10"
                                )}
                                title="Test in Sandbox"
                              >
                                <Zap size={12} />
                              </button>
                              <div className="w-px h-3 bg-zinc-100 dark:bg-zinc-800 mx-0.5" />
                              <button
                                type="button"
                                onClick={() => handleInsertField(field.label)}
                                className="w-7 h-7 flex items-center justify-center text-zinc-300 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all"
                                title="Add to Formula"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center space-y-3">
                          <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto">
                            <Info size={20} className="text-zinc-400" />
                          </div>
                          <p className="text-xs text-zinc-500">No compatible fields available.</p>
                        </div>
                      )}
                    </>
                  ) : (
                    FUNCTIONS.map(fn => (
                      <button
                        key={fn.name}
                        type="button"
                        onClick={() => handleInsertFunction(fn.template)}
                        className="w-full flex flex-col p-4 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-indigo-500/50 hover:bg-indigo-500/[0.02] transition-all group text-left space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-indigo-500 font-mono">{fn.name}</span>
                          <FunctionSquare size={12} className="text-zinc-300 group-hover:text-indigo-500" />
                        </div>
                        <p className="text-[10px] font-bold text-zinc-900 dark:text-white">{fn.template}</p>
                        <p className="text-[9px] text-zinc-500 leading-relaxed">{fn.description}</p>
                      </button>
                    ))
                  )}
                </div>
                
                <div className="p-6 border-t border-zinc-100 dark:border-zinc-900 bg-indigo-500/[0.02]">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                      <BrainCircuit size={16} className="text-white" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Architect Tip</p>
                      <p className="text-[9px] text-zinc-500 leading-relaxed italic">
                        "Use curly brackets to reference fields."
                      </p>
                    </div>
                  </div>
                </div>
              </aside>

              {/* Center Column - Editor & Operators */}
              <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 p-8 space-y-6 border-r border-zinc-100 dark:border-zinc-900">
                {/* Editor Area */}
                <div className="flex-1 relative group flex flex-col">
                  <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-[2.5rem] blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative flex-1 flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden shadow-sm">
                    {/* Editor Header */}
                    <div className="px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Terminal size={14} className="text-indigo-500" />
                        <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Logic Expression Editor</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={undo}
                            disabled={historyIndex <= 0}
                            className="p-1.5 text-zinc-400 hover:text-indigo-500 disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
                            title="Undo (Ctrl+Z)"
                          >
                            <RotateCcw size={12} className="scale-x-[-1]" />
                          </button>
                          <button
                            type="button"
                            onClick={redo}
                            disabled={historyIndex >= history.length - 1}
                            className="p-1.5 text-zinc-400 hover:text-indigo-500 disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
                            title="Redo (Ctrl+Y)"
                          >
                            <RotateCcw size={12} />
                          </button>
                        </div>
                        <div className="w-px h-3 bg-zinc-200 dark:border-zinc-800" />
                        <button 
                          type="button"
                          onClick={magicFormat}
                          className="flex items-center gap-1.5 text-[9px] font-bold text-indigo-500 hover:text-indigo-400 transition-colors uppercase tracking-widest"
                        >
                          <Wand2 size={10} />
                          Magic Format
                        </button>
                        <div className="w-px h-3 bg-zinc-200 dark:border-zinc-800" />
                        <button 
                          type="button"
                          onClick={() => setLogic('')}
                          className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 hover:text-rose-500 transition-colors uppercase tracking-widest"
                        >
                          <RotateCcw size={10} />
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                      {/* Line Number Gutter */}
                      <div className="w-12 bg-zinc-50 dark:bg-zinc-900/50 border-r border-zinc-100 dark:border-zinc-800 flex flex-col pt-6 text-right pr-3 select-none pointer-events-none overflow-hidden">
                        {logic.split('\n').map((_, i) => (
                          <div key={i} className="text-[10px] font-mono leading-[26px] text-zinc-300 dark:text-zinc-600 h-[26px]">
                            {i + 1}
                          </div>
                        ))}
                      </div>

                      <div className="flex-1 relative overflow-hidden">
                        {/* Highlighting Overlay */}
                        <div 
                          aria-hidden="true"
                          className="absolute inset-0 p-6 text-base font-mono leading-[26px] pointer-events-none whitespace-pre overflow-x-auto overflow-y-auto custom-scrollbar"
                          style={{ color: 'transparent' }}
                        >
                          {logic.split(/(\{[^}]+\}|\b[A-Z_]+\b(?=\()|\b\d+(?:\.\d+)?\b|'[^']*'|[+\-*/%=<>!&|]+)/g).map((part, i) => {
                             const isBroken = validation.brokenTokens.has(part.replace('(', ''));
                             const squiggleClass = isBroken ? "border-b-2 border-rose-500 border-dotted bg-rose-500/10" : "";

                             if (/^\{[^}]+\}$/.test(part)) return <span key={i} className={cn("text-indigo-400 font-bold px-0.5 rounded", squiggleClass)}>{part}</span>;
                             if (/^[A-Z_]+$/.test(part)) return <span key={i} className={cn("text-emerald-400 font-bold", squiggleClass)}>{part}</span>;
                             if (/^\d+(?:\.\d+)?$/.test(part)) return <span key={i} className={cn("text-amber-400", squiggleClass)}>{part}</span>;
                             if (/^'[^']*'$/.test(part)) return <span key={i} className={cn("text-rose-400", squiggleClass)}>{part}</span>;
                             if (/^[+\-*/%=<>!&|]+$/.test(part)) return <span key={i} className={cn("text-zinc-500 font-bold", squiggleClass)}>{part}</span>;
                             return <span key={i} className={cn("text-zinc-900 dark:text-zinc-400", squiggleClass)}>{part}</span>;
                           })}
                        </div>

                        {/* Actual Textarea */}
                        <textarea
                          ref={textareaRef}
                          value={logic}
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
                          placeholder="Write your calculation logic here..."
                          className="absolute inset-0 w-full h-full bg-transparent p-6 text-base font-mono text-transparent caret-zinc-900 dark:caret-white placeholder:text-zinc-200 dark:placeholder:text-zinc-800 focus:outline-none resize-none leading-[26px] whitespace-pre overflow-x-auto overflow-y-auto custom-scrollbar"
                        />

                        {/* IntelliSense Dropdown */}
                        <AnimatePresence>
                          {showSuggestions && (
                            <motion.div 
                              initial={{ opacity: 0, y: 5, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              style={{ top: suggestionPos.top, left: suggestionPos.left }}
                              className="absolute z-[2000] w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)] overflow-hidden"
                            >
                              <div className="p-2 space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar">
                                {suggestions.map((s, i) => (
                                  <button
                                    key={i}
                                    onClick={() => applySuggestion(s)}
                                    onMouseEnter={() => setSelectedIndex(i)}
                                    className={cn(
                                      "w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all group",
                                      i === selectedIndex ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    )}
                                  >
                                    <div className={cn(
                                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                      i === selectedIndex ? "bg-white/20" : "bg-zinc-100 dark:bg-zinc-800"
                                    )}>
                                      {s.type === 'variable' ? <Hash size={14} /> : <FunctionSquare size={14} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={cn("text-[11px] font-black uppercase tracking-tight truncate", i === selectedIndex ? "text-white" : "text-zinc-900 dark:text-white")}>
                                        {s.label}
                                      </p>
                                      {s.description && (
                                        <p className={cn("text-[9px] truncate", i === selectedIndex ? "text-white/70" : "text-zinc-500")}>
                                          {s.description}
                                        </p>
                                      )}
                                    </div>
                                    {i === selectedIndex && <div className="text-[9px] font-black opacity-50">ENTER</div>}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </div>

                  {/* Operator Grid */}
                  <div className="grid grid-cols-6 gap-2">
                    {OPERATORS.map(op => (
                      <button
                        key={op.label}
                        type="button"
                        onClick={() => insertText(op.value)}
                        className="h-10 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-indigo-500/50 hover:bg-indigo-500/5 text-sm font-black text-zinc-700 dark:text-zinc-300 transition-all shadow-sm group"
                      >
                        {op.icon ? <op.icon size={16} className="group-hover:scale-110 transition-transform" /> : op.label}
                      </button>
                    ))}
                  </div>

                  {/* Logic Intelligence Panel */}
                  <div className="bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden flex flex-col min-h-[160px]">
                    <div className="px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BrainCircuit size={14} className="text-indigo-500" />
                        <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">Logic Intelligence</span>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-1.5">
                           <div className={cn("w-1.5 h-1.5 rounded-full", validation.errors.length ? "bg-rose-500 animate-pulse" : "bg-emerald-500")} />
                           <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{validation.errors.length} Errors</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                           <div className={cn("w-1.5 h-1.5 rounded-full", validation.warnings.length ? "bg-amber-500" : "bg-zinc-300")} />
                           <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{validation.warnings.length} Warnings</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 grid grid-cols-2 divide-x divide-zinc-100 dark:divide-zinc-800 bg-white/30 dark:bg-zinc-900/20 overflow-hidden min-h-0">
                      {/* Left: Issues & Tips */}
                      <div className="p-6 space-y-3 overflow-y-auto custom-scrollbar">
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-4">Issues & Tips</p>
                        
                        {validation.errors.length === 0 && validation.warnings.length === 0 && validation.suggestions.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-8 text-center space-y-2 opacity-50">
                            <Sparkles size={16} className="text-zinc-300" />
                            <p className="text-[9px] font-medium text-zinc-400 uppercase tracking-widest leading-tight">No issues detected in current logic.</p>
                          </div>
                        )}

                        {validation.errors.map((err, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl animate-in fade-in slide-in-from-left-2 group">
                            <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
                               <AlertCircle size={14} className="text-rose-500" />
                               <span className="text-[7px] font-black text-rose-400 bg-rose-500/10 px-1 rounded-sm uppercase tracking-tighter">#{String(i + 1).padStart(2, '0')}</span>
                            </div>
                            <div className="space-y-1 flex-1">
                               <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 leading-relaxed">{err.message}</p>
                               {err.line && (
                                  <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                     <div className="w-1 h-1 rounded-full bg-rose-400" />
                                     <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">At Line {err.line}</span>
                                  </div>
                               )}
                            </div>
                          </div>
                        ))}

                        {validation.warnings.map((warn, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl animate-in fade-in slide-in-from-left-2">
                            <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 leading-relaxed">{warn}</p>
                          </div>
                        ))}

                        {validation.suggestions.map((sug, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl animate-in fade-in slide-in-from-left-2">
                            <Lightbulb size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 leading-relaxed">{sug}</p>
                          </div>
                        ))}
                      </div>

                      {/* Right: Variable Map */}
                      <div className="p-6 space-y-3 overflow-y-auto custom-scrollbar bg-zinc-50/30 dark:bg-zinc-900/10">
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-4">Variable Map</p>
                        
                        {!logic.includes('{') ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center space-y-2 opacity-50">
                            <Hash size={16} className="text-zinc-300" />
                            <p className="text-[9px] font-medium text-zinc-400 uppercase tracking-widest leading-tight">No external variables used.</p>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {Array.from(new Set(logic.match(/\{([^}]+)\}/g) || [])).map((tag, i) => {
                              const label = tag.slice(1, -1);
                              const field = availableFields.find(f => f.label === label);
                              return (
                                <div key={i} className="flex flex-col gap-2 p-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm group/var transition-all hover:border-indigo-500/30">
                                  <div className="flex items-center justify-between gap-4">
                                     <div className="flex items-center gap-2">
                                        <Hash size={10} className="text-zinc-400" />
                                        <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 truncate max-w-[80px]">{label}</span>
                                     </div>
                                     {field && (
                                       <span className={cn("px-1 py-0.5 rounded text-[7px] font-black uppercase", getTypeBadge(field.type).color)}>
                                         {getTypeBadge(field.type).label}
                                       </span>
                                     )}
                                  </div>
                                  <input 
                                    type="text"
                                    placeholder="Mock Value"
                                    value={mockValues[label] || ''}
                                    onChange={(e) => setMockValues(prev => ({ ...prev, [label]: e.target.value }))}
                                    className="w-full px-2 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg text-[10px] font-mono focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-300"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
              </div>

            {/* Right Column - Tabs & Tools */}
            <aside className="w-80 flex flex-col bg-zinc-50/30 dark:bg-zinc-900/10 border-l border-zinc-100 dark:border-zinc-900">
              {/* Right Tabs */}
              <div className="p-2 flex gap-1 border-b border-zinc-100 dark:border-zinc-900 overflow-x-auto no-scrollbar">
                {[
                  { id: 'execution', label: 'Strategy', icon: Settings2 },
                  { id: 'sandbox', label: 'Sandbox', icon: Zap },
                  { id: 'docs', label: 'Docs', icon: Info },
                  { id: 'history', label: 'History', icon: Clock }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    type="button"
                    onClick={() => setRightActiveTab(tab.id as any)}
                    className={cn(
                      "flex-1 min-w-[70px] py-2 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all border flex flex-col items-center justify-center gap-1",
                      rightActiveTab === tab.id 
                        ? "bg-white dark:bg-zinc-800 text-indigo-600 border-indigo-500/20 shadow-sm" 
                        : "text-zinc-500 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    )}
                  >
                    <tab.icon size={12} />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {rightActiveTab === 'execution' && (
                  <div className="p-6 space-y-8 animate-in fade-in slide-in-from-right-4">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Settings2 size={12} className="text-indigo-500" />
                        <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Execution Strategy</span>
                      </div>
                      <div className="space-y-2">
                        {TRIGGER_OPTIONS.map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => toggleTrigger(opt.id)}
                            className={cn(
                              "w-full flex items-center gap-4 p-4 rounded-[1.5rem] border transition-all text-left group",
                              triggers.includes(opt.id)
                                ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
                                : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300"
                            )}
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                              triggers.includes(opt.id) ? "bg-indigo-500/20 text-indigo-500" : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-800"
                            )}>
                              <opt.icon size={18} />
                            </div>
                            <div className="flex-1">
                              <p className="text-[11px] font-black uppercase tracking-tight">{opt.label}</p>
                              <p className="text-[9px] opacity-70 leading-tight mt-0.5">{opt.description}</p>
                            </div>
                            {triggers.includes(opt.id) && (
                              <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/40">
                                <Check size={12} className="text-white" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {rightActiveTab === 'sandbox' && (
                  <div className="p-6 space-y-8 animate-in fade-in slide-in-from-right-4">
                    <div className="space-y-4">
                       <div className="flex items-center gap-2">
                         <Zap size={12} className="text-amber-500" />
                         <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Live Preview</span>
                       </div>
                       
                       <div className="p-8 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden group">
                          {/* Background Glow */}
                          <div className={cn(
                            "absolute inset-0 opacity-[0.03] transition-colors duration-500",
                            sandbox.error ? "bg-rose-500" : "bg-indigo-500"
                          )} />

                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest relative">Current Outcome</p>
                          
                          {sandbox.error ? (
                            <div className="space-y-2 relative">
                               <AlertCircle size={24} className="text-rose-500 mx-auto" />
                               <p className="text-xs font-medium text-rose-600 dark:text-rose-400 px-4">{sandbox.error}</p>
                            </div>
                          ) : (
                            <div className="relative">
                               <span className={cn(
                                 "text-4xl font-black tracking-tighter transition-all duration-500",
                                 typeof sandbox.result === 'number' ? "text-indigo-600 dark:text-indigo-400" :
                                 typeof sandbox.result === 'boolean' ? (sandbox.result ? "text-emerald-500" : "text-rose-500") :
                                 "text-zinc-900 dark:text-white"
                               )}>
                                 {sandbox.result === null ? '—' : 
                                  typeof sandbox.result === 'boolean' ? (sandbox.result ? 'TRUE' : 'FALSE') :
                                  sandbox.result}
                               </span>
                               {typeof sandbox.result === 'number' && (
                                 <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/10 rounded-full text-[9px] font-bold text-indigo-600">
                                    NUMERIC
                                 </div>
                               )}
                            </div>
                          )}
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="flex items-center gap-2">
                         <Clock size={12} className="text-zinc-400" />
                         <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Execution Trace</span>
                       </div>
                       <div className="space-y-2">
                          <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col gap-3">
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase">Input Sync</span>
                                <CheckCircle2 size={12} className="text-emerald-500" />
                             </div>
                             <div className="flex flex-wrap gap-1.5">
                                {Object.keys(mockValues).length === 0 ? (
                                   <p className="text-[10px] text-zinc-400 italic">No mock data provided yet...</p>
                                ) : (
                                   Object.entries(mockValues).map(([key, val]) => (
                                      <div key={key} className="px-2 py-1 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800 text-[9px] font-mono">
                                         <span className="text-zinc-400">{key}:</span> <span className="text-zinc-900 dark:text-white">{val}</span>
                                      </div>
                                   ))
                                )}
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
                )}


                {rightActiveTab === 'docs' && (
                  <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-4">
                     <div className="space-y-4">
                        <div className="flex items-center gap-2">
                           <Info size={12} className="text-indigo-500" />
                           <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Function Reference</span>
                        </div>
                        <div className="relative">
                           <input 
                              type="text"
                              value={docsSearch}
                              onChange={(e) => setDocsSearch(e.target.value)}
                              placeholder="Search functions..."
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs font-medium focus:outline-none focus:border-indigo-500/50 transition-all"
                           />
                        </div>
                     </div>
                     <div className="space-y-3">
                        {FUNCTIONS
                          .filter(f => !docsSearch || f.name.toLowerCase().includes(docsSearch.toLowerCase()))
                          .map(f => (
                           <div key={f.name} className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3 group">
                              <div className="flex items-center justify-between">
                                 <span className="text-xs font-black text-indigo-500 font-mono tracking-tight">{f.name}</span>
                                 <button 
                                    type="button"
                                    onClick={() => insertText(f.template)}
                                    className="w-6 h-6 bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:text-indigo-500 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                 >
                                    <Plus size={12} />
                                 </button>
                              </div>
                              <p className="text-[10px] font-bold text-zinc-900 dark:text-white leading-relaxed">{f.longDescription || f.description}</p>
                              {f.params && (
                                 <div className="space-y-1.5">
                                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Parameters</p>
                                    {f.params.map(p => (
                                       <div key={p.name} className="flex gap-2">
                                          <span className="text-[9px] font-mono font-bold text-emerald-500 shrink-0">{p.name}</span>
                                          <span className="text-[9px] text-zinc-500 leading-tight">{p.desc}</span>
                                       </div>
                                    ))}
                                 </div>
                              )}
                              {f.examples && (
                                 <div className="space-y-1.5">
                                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Examples</p>
                                    {f.examples.map((ex, i) => (
                                       <button 
                                          key={i}
                                          type="button"
                                          onClick={() => {
                                            navigator.clipboard.writeText(ex);
                                            setCopiedLabel(ex);
                                            setTimeout(() => setCopiedLabel(null), 2000);
                                          }}
                                          className={cn(
                                            "w-full p-2 rounded-lg text-[9px] font-mono break-all text-left transition-all flex items-center justify-between group/ex",
                                            copiedLabel === ex 
                                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                                              : "bg-zinc-50 dark:bg-zinc-900 text-indigo-500/80 hover:bg-indigo-500/5 hover:text-indigo-500"
                                          )}
                                          title="Click to copy example"
                                       >
                                          <span className="flex-1">{ex}</span>
                                          {copiedLabel === ex ? (
                                            <Check size={10} className="text-emerald-500 shrink-0 ml-2" />
                                          ) : (
                                            <Copy size={10} className="opacity-0 group-hover/ex:opacity-100 shrink-0 ml-2" />
                                          )}
                                       </button>
                                    ))}
                                 </div>
                              )}
                           </div>
                        ))}
                     </div>
                  </div>
                )}

                {rightActiveTab === 'history' && (
                  <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-4">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <Clock size={12} className="text-indigo-500" />
                           <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Session History</span>
                        </div>
                        <span className="text-[9px] font-black text-zinc-400">{history.length} Snapshots</span>
                     </div>
                     <div className="space-y-2">
                        {history.map((snapshot, i) => (
                           <button
                              key={i}
                              type="button"
                              onClick={() => {
                                 setIsUndoing(true);
                                 setLogic(snapshot);
                                 setHistoryIndex(i);
                                 setTimeout(() => setIsUndoing(false), 50);
                              }}
                              className={cn(
                                 "w-full p-4 rounded-2xl border text-left transition-all group",
                                 i === historyIndex 
                                    ? "bg-indigo-500/5 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                                    : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-400"
                              )}
                           >
                              <div className="flex items-center justify-between mb-2">
                                 <span className="text-[9px] font-black uppercase tracking-widest">{i === 0 ? 'Initial State' : `Snapshot ${i}`}</span>
                                 {i === historyIndex && (
                                    <span className="px-1.5 py-0.5 bg-indigo-500 text-white rounded text-[7px] font-black uppercase">Current</span>
                                 )}
                              </div>
                              <p className="text-[10px] font-mono line-clamp-2 opacity-70 break-all">{snapshot || '(Empty)'}</p>
                           </button>
                        )).reverse()}
                     </div>
                  </div>
                )}
              </div>

                {/* Footer Tip */}
                <div className="p-6 border-t border-zinc-100 dark:border-zinc-900">
                   <div className="flex items-center gap-3 text-zinc-400 group">
                      <Info size={14} className="group-hover:text-indigo-500 transition-colors" />
                      <p className="text-[9px] font-medium leading-relaxed uppercase tracking-widest">Deploying logic will update all active records.</p>
                   </div>
                </div>
              </aside>
            </div>

            {/* Modal Footer */}
            <div className="px-10 py-6 border-t border-zinc-100 dark:border-zinc-900/50 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-end gap-4">
                <button 
                  type="button"
                  onClick={onClose}
                  className="px-8 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={() => onSave(logic, triggers)}
                  className="px-12 py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-500/30 flex items-center gap-3"
                >
                  <Check size={20} />
                  <span>Apply Calculation</span>
                </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
