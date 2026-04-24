import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Copy,
  CheckCircle2,
  BrainCircuit,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  AlertTriangle,
  Lightbulb,
  Database,
  Search,
  BookOpen,
  Layers,
  HelpCircle,
  Bookmark,
  Trash2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Field } from '../ModuleEditor';
import { useAuth } from '../../hooks/useAuth';
import { DATA_API_URL } from '../../config';

interface Snapshot {
  logic: string;
  userName: string;
  timestamp: string;
}

interface LogicSnippet {
  id: string;
  name: string;
  expression: string;
  timestamp: string;
}

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (logic: string, triggers: string[]) => void;
  initialLogic?: string;
  initialTriggers?: string[];
  availableFields: Field[];
  relatedFields?: Record<string, Field[]>;
  allModules?: any[];
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
  { 
    name: 'SUM', 
    template: 'SUM(collection)', 
    description: 'Total of a collection',
    longDescription: 'Calculates the total sum of all numeric values in a repeatable group field or array.',
    params: [{ name: 'collection', desc: 'The array or repeatable field to total' }],
    examples: ['SUM({Items.Price})', 'SUM({Quantity})']
  },
  { 
    name: 'AVG', 
    template: 'AVG(collection)', 
    description: 'Mean of a collection',
    longDescription: 'Calculates the average (mean) of all numeric values in a collection.',
    params: [{ name: 'collection', desc: 'The array or repeatable field to average' }],
    examples: ['AVG({Items.Score})']
  },
  { 
    name: 'COUNT', 
    template: 'COUNT(collection)', 
    description: 'Number of items',
    longDescription: 'Returns the total count of items in a collection or repeatable group.',
    params: [{ name: 'collection', desc: 'The collection to count' }],
    examples: ['COUNT({Items})']
  },
  { 
    name: 'MAX', 
    template: 'MAX(collection)', 
    description: 'Highest value',
    longDescription: 'Returns the maximum value found in a collection.',
    params: [{ name: 'collection', desc: 'The collection to check' }],
    examples: ['MAX({Items.Price})']
  },
  { 
    name: 'MIN', 
    template: 'MIN(collection)', 
    description: 'Lowest value',
    longDescription: 'Returns the minimum value found in a collection.',
    params: [{ name: 'collection', desc: 'The collection to check' }],
    examples: ['MIN({Items.Price})']
  },
  { 
    name: 'JOIN', 
    template: 'JOIN(collection, separator)', 
    description: 'Join array to text',
    longDescription: 'Combines multiple values into a single text string separated by a delimiter.',
    params: [
      { name: 'collection', desc: 'The collection to join' },
      { name: 'separator', desc: 'The text to put between items (e.g. ", ")' }
    ],
    examples: ['JOIN({Items.Name}, ", ")']
  },
  { name: 'LEN', template: 'LEN(text)', description: 'String length' },
  { name: 'IS_EMPTY', template: 'IS_EMPTY(value)', description: 'Check if empty' },
  { 
    name: 'FILTER', 
    template: 'FILTER(collection, "$ > 0")', 
    description: 'Filter a collection',
    longDescription: 'Returns a subset of a collection based on a condition. Use $ to represent the current item.',
    params: [
      { name: 'collection', desc: 'The array or repeatable field to filter' },
      { name: 'condition', desc: 'String expression using $ as the current item (e.g. "$ > 100")' }
    ],
    examples: ['FILTER({Items.Price}, "$ > 100")', 'FILTER({Status}, "$ == \'Paid\'")']
  },
  { 
    name: 'MAP', 
    template: 'MAP(collection, "$ * 1.1")', 
    description: 'Transform a collection',
    longDescription: 'Applies a transformation to every item in a collection. Use $ to represent the current item.',
    params: [
      { name: 'collection', desc: 'The array or repeatable field to transform' },
      { name: 'transformation', desc: 'String expression using $ (e.g. "$ * 1.1")' }
    ],
    examples: ['MAP({Prices}, "$ * 1.1")', 'MAP({Names}, "UPPER($)")']
  },
  { 
    name: 'TODAY', 
    template: 'TODAY()', 
    description: 'Current date',
    longDescription: 'Returns the current date as a string.',
    examples: ['TODAY()', 'IF({Due Date} < TODAY(), "Overdue", "On Time")']
  },
  { 
    name: 'NOW', 
    template: 'NOW()', 
    description: 'Current date & time',
    longDescription: 'Returns the current date and precise system time.',
    examples: ['NOW()']
  },
  { 
    name: 'DATETIME', 
    template: 'DATETIME(year, month, day, hour, minute, second)', 
    description: 'Create a date-time',
    longDescription: 'Returns an ISO date-time string from individual components.',
    params: [
      { name: 'year', desc: 'Full year (e.g. 2024)', optional: true },
      { name: 'month', desc: 'Month (1-12)', optional: true },
      { name: 'day', desc: 'Day of month (1-31)', optional: true },
      { name: 'hour', desc: 'Hour (0-23)', optional: true },
      { name: 'minute', desc: 'Minute (0-59)', optional: true },
      { name: 'second', desc: 'Second (0-59)', optional: true }
    ],
    examples: ['DATETIME(2024, 12, 25, 10, 0, 0)']
  },
  { 
    name: 'DIFF_DAYS', 
    template: 'DIFF_DAYS(date1, date2)', 
    description: 'Days between dates',
    params: [
      { name: 'date1', desc: 'Start date' },
      { name: 'date2', desc: 'End date' }
    ],
    examples: ['DIFF_DAYS({CreatedAt}, TODAY())']
  },
  { 
    name: 'ADD_DAYS', 
    template: 'ADD_DAYS(date, days)', 
    description: 'Add days to date',
    params: [
      { name: 'date', desc: 'Starting date' },
      { name: 'days', desc: 'Number of days to add' }
    ],
    examples: ['ADD_DAYS(TODAY(), 7)']
  },
  { 
    name: 'AT', 
    template: 'AT(collection, index)', 
    description: 'Get item at index',
    params: [
      { name: 'collection', desc: 'The array or list' },
      { name: 'index', desc: '0-based index' }
    ],
    examples: ['AT({Items}, 0)']
  },
  { 
    name: 'INDEX_OF', 
    template: 'INDEX_OF(collection, value)', 
    description: 'Find item index',
    params: [
      { name: 'collection', desc: 'The array or list' },
      { name: 'value', desc: 'Value to search for' }
    ],
    examples: ['INDEX_OF({Names}, "John")']
  },
  { 
    name: 'UNIQUE', 
    template: 'UNIQUE(collection)', 
    description: 'Remove duplicates',
    examples: ['UNIQUE({Categories})']
  },
  { 
    name: 'SORT', 
    template: 'SORT(collection)', 
    description: 'Sort a list',
    examples: ['SORT({Names})']
  },
  { 
    name: 'REVERSE', 
    template: 'REVERSE(collection)', 
    description: 'Flip a list',
    examples: ['REVERSE({RecentItems})']
  },
  { 
    name: 'SEARCH', 
    template: 'SEARCH(text, query)', 
    description: 'Find text (case-insensitive)',
    examples: ['SEARCH({Notes}, "urgent")']
  },
  { 
    name: 'ROW_INDEX', 
    template: 'ROW_INDEX(collection, item)', 
    description: 'Get position in list',
    examples: ['ROW_INDEX({Items}, {CurrentItem})']
  },
  { 
    name: 'REPLACE', 
    template: 'REPLACE(text, search, replace)', 
    description: 'Replace text',
    params: [
      { name: 'text', desc: 'Source text' },
      { name: 'search', desc: 'Text to find' },
      { name: 'replace', desc: 'Text to replace with' }
    ],
    examples: ['REPLACE({Notes}, "temp", "FINAL")']
  },
  { 
    name: 'TRIM', 
    template: 'TRIM(text)', 
    description: 'Remove whitespace'
  },
  { 
    name: 'SUBSTR', 
    template: 'SUBSTR(text, start, length)', 
    description: 'Get part of text',
    params: [
      { name: 'text', desc: 'Source text' },
      { name: 'start', desc: 'Start position' },
      { name: 'length', desc: 'Number of characters' }
    ],
    examples: ['SUBSTR({ID}, 0, 4)']
  },
  { 
    name: 'LEFT', 
    template: 'LEFT(text, count)', 
    description: 'Get first N characters',
    params: [
      { name: 'text', desc: 'Source text' },
      { name: 'count', desc: 'Number of characters' }
    ],
    examples: ['LEFT({Name}, 1)']
  },
  { 
    name: 'MID', 
    template: 'MID(text, start, count)', 
    description: 'Get characters from middle',
    params: [
      { name: 'text', desc: 'Source text' },
      { name: 'start', desc: '1-based start position' },
      { name: 'count', desc: 'Number of characters' }
    ],
    examples: ['MID({Code}, 2, 3)']
  },
  { 
    name: 'RIGHT', 
    template: 'RIGHT(text, count)', 
    description: 'Get last N characters',
    params: [
      { name: 'text', desc: 'Source text' },
      { name: 'count', desc: 'Number of characters' }
    ],
    examples: ['RIGHT({Name}, 4)']
  },
  { name: 'CEIL', template: 'CEIL(number)', description: 'Round up' },
  { name: 'FLOOR', template: 'FLOOR(number)', description: 'Round down' },
  { 
    name: 'IS_NULL', 
    template: 'IS_NULL(value)', 
    description: 'Check if field is empty',
    examples: ['IS_NULL({Status})']
  },
  { 
    name: 'PERCENT', 
    template: 'PERCENT(value, total)', 
    description: 'Calculate percentage',
    examples: ['PERCENT({Score}, 100)']
  },
  { 
    name: 'SWITCH', 
    template: 'SWITCH(value, case1, result1, case2, result2, default)', 
    description: 'Multi-case logic',
    longDescription: 'Evaluates an expression against a list of values and returns the result corresponding to the first matching value.',
    params: [
      { name: 'value', desc: 'The value to check' },
      { name: 'cases', desc: 'Pairs of case/result, plus a final default' }
    ],
    examples: ['SWITCH({Status}, "Draft", 1, "Live", 2, 0)']
  },
  { 
    name: 'COALESCE', 
    template: 'COALESCE(val1, val2, val3)', 
    description: 'First non-null value',
    examples: ['COALESCE({AltEmail}, {PrimaryEmail}, "N/A")']
  },
  { 
    name: 'EOMONTH', 
    template: 'EOMONTH(date, months)', 
    description: 'End of month',
    examples: ['EOMONTH(TODAY(), 0)']
  },
  { 
    name: 'WORKDAY', 
    template: 'WORKDAY(date, days)', 
    description: 'Project date math',
    longDescription: 'Returns a date that is the indicated number of working days (excluding weekends) before or after a start date.',
    examples: ['WORKDAY(TODAY(), 5)']
  },
  { name: 'YEAR', template: 'YEAR(date)', description: 'Extract year' },
  { name: 'MONTH', template: 'MONTH(date)', description: 'Extract month' },
  { name: 'DAY', template: 'DAY(date)', description: 'Extract day' },
  { name: 'PROPER', template: 'PROPER(text)', description: 'Title Case' },
];

const TRIGGER_OPTIONS = [
  { id: 'onLoad', label: 'On Load', icon: Clock, description: 'Calculate when record is opened' },
  { id: 'onChange', label: 'Real-time', icon: Zap, description: 'Update as dependent fields change' },
  { id: 'onSave', label: 'On Save', icon: Save, description: 'Calculate before record is saved' },
  { id: 'onManual', label: 'Manual', icon: MousePointer2, description: 'Calculate only when triggered' },
];

const DEFAULT_TRIGGERS = ['onLoad', 'onChange'];

const HelpTooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-block">
    <HelpCircle size={12} className="text-zinc-300 hover:text-indigo-500 transition-colors cursor-help" />
    <div className="absolute top-full right-0 mt-2 w-48 p-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-medium rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-[2100] shadow-2xl scale-95 group-hover:scale-100 origin-top-right leading-relaxed">
      <div className="relative">
        {text}
        <div className="absolute bottom-full right-1.5 w-2 h-2 bg-zinc-900 dark:bg-white rotate-45 -mb-1" />
      </div>
    </div>
  </div>
);

export const CalculatorModal = ({
  isOpen,
  onClose,
  onSave,
  initialLogic = '',
  initialTriggers,
  availableFields,
  relatedFields = {},
  allModules = [],
  targetLabel
}: CalculatorModalProps) => {
  const [logic, setLogic] = useState(initialLogic);
  const [triggers, setTriggers] = useState<string[]>(initialTriggers || DEFAULT_TRIGGERS);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeTab, setActiveTab] = useState<'fields' | 'functions' | 'relationships'>('fields');
  const [drillPath, setDrillPath] = useState<string[]>([]);
  const [drillModuleId, setDrillModuleId] = useState<string | null>(null);
  const [relSource, setRelSource] = useState<'linked' | 'platform' | 'library'>('linked');
  const [variableSearch, setVariableSearch] = useState('');
  const [variableTypeFilter, setVariableTypeFilter] = useState<'all' | 'repeatable' | 'lookup' | 'numeric'>('all');
  const [rightActiveTab, setRightActiveTab] = useState<'execution' | 'sandbox' | 'docs' | 'history'>('execution');
  const [fetchedLibrarySchemas, setFetchedLibrarySchemas] = useState<Record<string, Field[]>>({});
  const [isFetchingLibrary, setIsFetchingLibrary] = useState(false);
  const [mockValues, setMockValues] = useState<Record<string, string>>({});
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  // History State
  const { user } = useAuth();
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [isFixing, setIsFixing] = useState(false);
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
  const [isIntelliExpanded, setIsIntelliExpanded] = useState(true);
  const [suggestionTrigger, setSuggestionTrigger] = useState<{ type: 'variable' | 'function'; index: number } | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Find & Replace State
  const [showFind, setShowFind] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findMatches, setFindMatches] = useState<number[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  // AI Co-Pilot State
  const [showAiBuild, setShowAiBuild] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Snippets State
  const [snippets, setSnippets] = useState<LogicSnippet[]>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('aurora_logic_snippets') : null;
    return saved ? JSON.parse(saved) : [];
  });
  const [showSaveSnippet, setShowSaveSnippet] = useState(false);
  const [newSnippetName, setNewSnippetName] = useState('');

  // Cursor Insights
  const [activeInsight, setActiveInsight] = useState<any | null>(null);

  useEffect(() => {
    localStorage.setItem('aurora_logic_snippets', JSON.stringify(snippets));
  }, [snippets]);

  const handleSaveSnippet = () => {
    if (!newSnippetName.trim() || !logic.trim()) return;
    
    const newSnippet: LogicSnippet = {
      id: Math.random().toString(36).substring(2, 9),
      name: newSnippetName.trim(),
      expression: logic.trim(),
      timestamp: new Date().toLocaleDateString()
    };
    
    setSnippets(prev => [newSnippet, ...prev]);
    setNewSnippetName('');
    setShowSaveSnippet(false);
  };

  const deleteSnippet = (id: string) => {
    setSnippets(prev => prev.filter(s => s.id !== id));
  };

  useEffect(() => {
    if (isOpen) {
      setLogic(initialLogic);
      setTriggers(initialTriggers || DEFAULT_TRIGGERS);
      setHistory([{
        logic: initialLogic || '',
        userName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'System',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setHistoryIndex(0);
    }
  }, [isOpen, initialLogic, initialTriggers, user]);

  // Click-away for IntelliSense
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSuggestionTrigger(null);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]);

  // History Recording
  useEffect(() => {
    if (!isUndoing && logic !== history[historyIndex]?.logic) {
      const timer = setTimeout(() => {
        setHistory(prev => {
          const next = prev.slice(0, historyIndex + 1);
          return [...next, {
            logic,
            userName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }];
        });
        setHistoryIndex(prev => prev + 1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [logic, user]);

  const undo = () => {
    if (historyIndex > 0) {
      setIsUndoing(true);
      const prevSnapshot = history[historyIndex - 1];
      setLogic(prevSnapshot.logic);
      setHistoryIndex(historyIndex - 1);
      setTimeout(() => setIsUndoing(false), 50);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setIsUndoing(true);
      const nextSnapshot = history[historyIndex + 1];
      setLogic(nextSnapshot.logic);
      setHistoryIndex(historyIndex + 1);
      setTimeout(() => setIsUndoing(false), 50);
    }
  };

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

  const handleFind = useCallback((text: string) => {
    if (!text) {
      setFindMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }
    const matches: number[] = [];
    let pos = logic.indexOf(text);
    while (pos !== -1) {
      matches.push(pos);
      pos = logic.indexOf(text, pos + 1);
    }
    setFindMatches(matches);
    setCurrentMatchIndex(matches.length > 0 ? 0 : -1);
  }, [logic]);

  useEffect(() => {
    handleFind(findText);
  }, [findText, handleFind]);

  const handleReplace = () => {
    if (currentMatchIndex === -1 || !findText) return;
    const start = findMatches[currentMatchIndex];
    const nextLogic = logic.substring(0, start) + replaceText + logic.substring(start + findText.length);
    setLogic(nextLogic);
  };

  const handleReplaceAll = () => {
    if (!findText) return;
    const nextLogic = logic.split(findText).join(replaceText);
    setLogic(nextLogic);
    setShowFind(false);
  };

  const handleAiFix = async () => {
    const currentValidation = getValidation();
    if (!sandbox.error && currentValidation.errors.length === 0) return;
    setIsFixing(true);
    
    // Simulate Advanced AI Reasoning
    await new Promise(resolve => setTimeout(resolve, 1200)); 
    
    let fixed = logic;
    
    // 1. Structural Fixes (Parentheses/Braces) - Always apply to the working 'fixed' string
    const openParen = (fixed.match(/\(/g) || []).length;
    const closeParen = (fixed.match(/\)/g) || []).length;
    if (openParen > closeParen) fixed += ')'.repeat(openParen - closeParen);
    
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    if (openBraces > closeBraces) fixed += '}'.repeat(openBraces - closeBraces);

    // 2. Intelligent Error Reconciliation
    currentValidation.errors.forEach(err => {
      const msg = err.message.toLowerCase();
      
      // Handle Unknown Identifiers / Missing Variables / Trailing Garbage
      if (msg.includes('unknown identifier') || msg.includes('missing variable') || msg.includes('not defined')) {
        const match = err.message.match(/"([^"]+)"/) || err.message.match(/'([^']+)'/);
        if (match) {
          const idName = match[1];
          const trimmed = fixed.trim();
          
          // Case A: Trailing garbage (token at the very end of the logic)
          if (trimmed.endsWith(idName)) {
            fixed = trimmed.substring(0, trimmed.length - idName.length).trim();
          } else {
            // Case B: Try to find a matching field
            const closestField = availableFields.find(f => 
              f.label.toLowerCase() === idName.toLowerCase() ||
              f.label.toLowerCase().includes(idName.toLowerCase())
            );
            if (closestField) {
              fixed = fixed.replace(new RegExp(`\\b${idName}\\b`, 'g'), `{${closestField.label}}`);
            } else {
              // Case C: Try to find a matching function (misspelled or lowercase)
              const closestFunc = FUNCTIONS.find(fn => 
                fn.name.toLowerCase().includes(idName.toLowerCase())
              );
              if (closestFunc) {
                fixed = fixed.replace(new RegExp(`\\b${idName}\\b`, 'g'), closestFunc.name);
              }
            }
          }
        }
      }

      // Handle Unknown Functions
      if (msg.includes('unknown function')) {
        const match = err.message.match(/"([^"]+)"/);
        if (match) {
          const funcName = match[1];
          const closestFunc = FUNCTIONS.find(fn => 
            fn.name.toLowerCase() === funcName.toLowerCase() ||
            fn.name.toLowerCase().includes(funcName.toLowerCase())
          );
          if (closestFunc) {
            fixed = fixed.replace(new RegExp(`\\b${funcName}\\b`, 'g'), closestFunc.name);
          }
        }
      }

      // Handle Comparison Typos (= vs ==)
      if (msg.includes("detected '=' instead of '=='")) {
         fixed = fixed.replace(/([^=])=([^=])/g, '$1==$2');
      }

      // Handle Incomplete Arguments
      if (msg.includes('incomplete arguments')) {
        const match = err.message.match(/"([^"]+)"/);
        if (match) {
          const funcName = match[1];
          const funcDef = FUNCTIONS.find(fn => fn.name === funcName);
          if (funcDef && funcDef.params) {
            const minArgs = funcDef.params.filter((p: any) => !p.optional).length;
            // Simple regex for top-level function call (doesn't handle deep nesting perfectly but fixes common cases)
            const callRegex = new RegExp(`\\b${funcName}\\s*\\(([^)]*)\\)`, 'g');
            fixed = fixed.replace(callRegex, (fullCall, currentArgs) => {
              // Split by comma but respect brackets (simplified)
              const argList = (currentArgs as string).split(/,(?![^{]*})/).map((a: string) => a.trim()).filter(Boolean);
              if (argList.length < minArgs) {
                const missingCount = minArgs - argList.length;
                const placeholders = Array(missingCount).fill('1');
                return `${funcName}(${[...argList, ...placeholders].join(', ')})`;
              }
              return fullCall;
            });
          }
        }
      }

      // Handle Unknown Fields (Fuzzy Matching)
      // Handle Unknown Fields / Missing Variables (using suggestions from validation)
      if (msg.includes('did you mean')) {
        const fieldMatch = err.message.match(/(?:field not found|missing variable): "([^"]+)"/i);
        const suggestionMatch = err.message.match(/did you mean "([^"]+)"/i);
        
        if (fieldMatch && suggestionMatch) {
          const unknownField = fieldMatch[1]; // This might include braces if it's a Missing Variable
          const suggestion = suggestionMatch[1];
          
          // Clean up braces if present in the match
          const cleanUnknown = unknownField.startsWith('{') ? unknownField.slice(1, -1) : unknownField;
          const cleanSuggestion = suggestion.startsWith('{') ? suggestion.slice(1, -1) : suggestion;
          
          fixed = fixed.split(`{${cleanUnknown}}`).join(`{${cleanSuggestion}}`);
        }
      }
    });

    // 3. Logic Safety & Runtime Fixes
    if (sandbox.error) {
       const sErr = sandbox.error.toLowerCase();
       if (sErr.includes('division by zero')) {
          const parts = fixed.split('/');
          if (parts.length > 1) {
             const denominator = parts[1].split(/[+\-*%(),]/)[0].trim();
             if (denominator) {
                fixed = `IF(${denominator} == 0, 0, ${fixed})`;
             }
          }
       }
    }
    
    setLogic(fixed);
    setIsFixing(false);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiGenerating(true);
    
    setTimeout(() => {
      let generated = '';
      const prompt = aiPrompt.toLowerCase();
      
      // 1. Better Field Detection
      const matchedFieldObj = availableFields.find(f => prompt.includes(f.label.toLowerCase()));
      const matchedField = matchedFieldObj?.label || "Field";

      // 2. Simple Field "Echo"
      if (prompt.includes('render') || prompt.includes('show') || prompt.includes('get') || prompt.includes('value of') || prompt.includes('echo')) {
        generated = `{${matchedField}}`;
      }
      // 3. Math & Percentages
      else if (prompt.includes('percentage') || prompt.includes('%')) {
        generated = `PERCENT({Value}, {Total})`;
      } else if (prompt.includes('add') || prompt.includes('plus')) {
        generated = `{Field1} + {Field2}`;
      } else if (prompt.includes('multiply') || prompt.includes('times')) {
        generated = `{Field1} * {Field2}`;
      }
      
      // 3. Null/Empty Checks
      else if (prompt.includes('not null') || prompt.includes('not empty') || prompt.includes('has a value')) {
        generated = `NOT(IS_NULL({${matchedField}}))`;
      } else if (prompt.includes('is empty') || prompt.includes('is null')) {
        generated = `IS_NULL({${matchedField}})`;
      }
      
      // 4. Date Math
      else if (prompt.includes('days') && (prompt.includes('since') || prompt.includes('between') || prompt.includes('diff'))) {
        generated = `DIFF_DAYS({StartDate}, {EndDate})`;
      } else if (prompt.includes('end of') && prompt.includes('month')) {
        generated = `EOMONTH(TODAY(), 0)`;
      } else if (prompt.includes('work') && prompt.includes('days')) {
        generated = `WORKDAY(TODAY(), 5)`;
      }
      
      // 5. Conditionals
      else if (prompt.includes('if')) {
        if (prompt.includes('status') || prompt.includes('is')) {
           generated = `IF({${matchedField}} == "Value", "Yes", "No")`;
        } else {
           generated = `IF(condition, "Result If True", "Result If False")`;
        }
      }
      
      // 6. String Cleaning
      else if (prompt.includes('proper') || prompt.includes('title case')) {
        generated = `PROPER({${matchedField}})`;
      } else if (prompt.includes('trim') || prompt.includes('clean')) {
        generated = `TRIM({${matchedField}})`;
      }

      // 7. Fallback with Smart Suggestion
      else {
        generated = `// AI: I understood "${aiPrompt}"\n// Tip: Try phrases like "Sum of...", "If {Status} is...", or "Days since {Date}"`;
      }

      if (generated) {
        setLogic(generated);
      }
      
      setIsAiGenerating(false);
      setShowAiBuild(false);
      setAiPrompt('');
    }, 1500);
  };

  const handleDragStart = (e: React.DragEvent, label: string) => {
    e.dataTransfer.setData('text/plain', `{${label}}`);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleFuncDragStart = (e: React.DragEvent, template: string) => {
    e.dataTransfer.setData('text/plain', template);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    // Insert at cursor position if possible, or at end
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    setLogic(before + data + after);
    
    // Focus back and set cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + data.length, start + data.length);
      handleCursorMove();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      setShowFind(true);
      return;
    }
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
    
    setTimeout(handleCursorMove, 0);
  };

  const handleCursorMove = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const pos = textarea.selectionStart;
    const text = textarea.value;
    
    // Find word at cursor
    const leftText = text.slice(0, pos);
    const rightText = text.slice(pos);
    const leftMatch = leftText.match(/[A-Z_]+$/);
    const rightMatch = rightText.match(/^[A-Z_]+/);
    
    const word = (leftMatch ? leftMatch[0] : '') + (rightMatch ? rightMatch[0] : '');
    
    const func = FUNCTIONS.find(f => f.name === word);
    if (func) {
      setActiveInsight({ type: 'function', data: func });
    } else {
      // Check for variables in braces
      const braceMatch = leftText.match(/\{([^{}]*)$/);
      if (braceMatch) {
        const fieldLabel = braceMatch[1] + (rightText.match(/^([^{}]*)\}/)?.[1] || '');
        const field = availableFields.find(f => f.label === fieldLabel);
        if (field) {
          setActiveInsight({ type: 'variable', data: field });
          return;
        }
      }
      setActiveInsight(null);
    }
  };

  const applySuggestion = (suggestion: any) => {
    if (!suggestionTrigger || !textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = suggestionTrigger.index;
    const end = textarea.selectionStart;
    const currentVal = textarea.value;
    
    const func = suggestion.type === 'function' ? FUNCTIONS.find(f => f.name === suggestion.label) : null;
    const isZeroArg = func?.template?.endsWith('()');
    const insertion = suggestion.type === 'variable' ? `{${suggestion.label}}` : `${suggestion.label}()`;
    const cursorOffset = (suggestion.type === 'function' && !isZeroArg) ? insertion.length - 1 : insertion.length;
    const newVal = currentVal.substring(0, start) + insertion + currentVal.substring(end);
    
    setLogic(newVal);
    setShowSuggestions(false);
    setSuggestionTrigger(null);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
      handleCursorMove();
    }, 0);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const cursorIndex = e.target.selectionStart;
    setLogic(newVal);
    handleCursorMove();

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
    
    if (type === 'variable') {
      // Handle dot-notation for nested fields
      if (q.includes('.')) {
        const parts = q.split('.');
        const parentLabel = parts[0];
        const childQuery = parts.slice(1).join('.');
        
        const parentField = availableFields.find(f => f.label.toLowerCase() === parentLabel);
        if (parentField) {
          if (parentField.fields) {
            matches = parentField.fields
              .filter(f => f.label.toLowerCase().includes(childQuery))
              .map(f => ({ 
                label: `${parentField.label}.${f.label}`, 
                value: `${parentField.id}.${f.id}`, 
                type: 'variable',
                description: `Sub-field of ${parentField.label}` 
              }));
          } else if (parentField.type === 'lookup' && parentField.targetModuleId) {
            const relFields = relatedFields[parentField.targetModuleId];
            if (relFields) {
              matches = relFields
                .filter(f => f.label.toLowerCase().includes(childQuery) && f.type !== 'group' && f.type !== 'fieldGroup')
                .map(f => ({ 
                  label: `${parentField.label}.${f.label}`, 
                  value: `${parentField.id}.${f.id}`, 
                  type: 'variable',
                  description: `Field in related module` 
                }));
            }
          }
        }
      } else {
        matches = availableFields
          .filter(f => f.label.toLowerCase().includes(q))
          .map(f => ({ 
            label: f.label, 
            value: f.id, 
            type: 'variable',
            description: f.type.toUpperCase()
          }));
      }
    } else if (type === 'function') {
      matches = FUNCTIONS
        .filter(f => f.name.toLowerCase().includes(q))
        .map(f => ({ 
          label: f.name, 
          value: f.name, 
          type: 'function',
          description: f.description 
        }));
    } else {
      // Universal search
      const vMatches = availableFields
        .filter(f => f.label.toLowerCase().includes(q))
        .map(f => ({ 
          label: f.label, 
          value: f.id, 
          type: 'variable',
          description: f.type.toUpperCase()
        }));
      
      const fMatches = FUNCTIONS
        .filter(f => f.name.toLowerCase().includes(q))
        .map(f => ({ 
          label: f.name, 
          value: f.name, 
          type: 'function',
          description: f.description 
        }));
      
      matches = [...vMatches, ...fMatches];
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
    
    // Create a version of the logic with comments replaced by spaces to maintain indices
    const cleanLogic = logic.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, match => ' '.repeat(match.length));

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

    const checkPathExists = (path: string, fields: Field[]): boolean => {
      const parts = path.split('.');
      const parentLabel = parts[0];
      const field = fields.find(f => f.label === parentLabel);
      
      if (!field) return false;
      if (parts.length === 1) return true;

      // Handle nested fields in same module (repeatable groups / groups)
      if (field.fields) {
        return checkPathExists(parts.slice(1).join('.'), field.fields);
      }

      // Handle cross-module relationships (lookups)
      if (field.type === 'lookup' && field.targetModuleId) {
        const relFields = relatedFields[field.targetModuleId];
        if (relFields) {
          return checkPathExists(parts.slice(1).join('.'), relFields);
        }
      }

      return false;
    };

    const varRegex = /\{([^{}]+)\}/g;
    let varMatch;
    while ((varMatch = varRegex.exec(cleanLogic)) !== null) {
      const tag = varMatch[0];
      const label = varMatch[1];
      const line = getLineNumber(varMatch.index);
      
      if (label === targetLabel) {
        errors.push({ message: `Circular Dependency: Field "{${label}}" cannot reference itself.`, line });
        brokenTokens.add(tag);
      } else if (!checkPathExists(label, availableFields)) {
        const allFields = [...availableFields, ...Object.values(relatedFields).flat()];
        let bestSuggestion = null;
        let minDistance = 999;

        const distance = (a: string, b: string) => {
          const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
          for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
          for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
          for (let j = 1; j <= b.length; j++) {
            for (let i = 1; i <= a.length; i++) {
              const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
              matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator);
            }
          }
          return matrix[b.length][a.length];
        };

        allFields.forEach(f => {
          const d = distance(label.toLowerCase(), f.label.toLowerCase());
          if (d < minDistance) {
            minDistance = d;
            bestSuggestion = f.label;
          }
        });

        if (bestSuggestion && minDistance < 5) {
          errors.push({ message: `Missing Variable: "{${label}}" does not exist. Did you mean "{${bestSuggestion}}"?`, line });
        } else {
          errors.push({ message: `Missing Variable: "{${label}}" does not exist in this module.`, line });
        }
        brokenTokens.add(tag);
      }
    }

    // 3. Function Argument Validation
    const funcRegex = /([A-Z_]+)\(/g;
    let funcMatch;
    while ((funcMatch = funcRegex.exec(cleanLogic)) !== null) {
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
          const minArgs = funcDef.params.filter((p: any) => !p.optional).length;
          if (argCount < minArgs) {
             errors.push({ message: `Incomplete Arguments: "${funcName}" expects ${minArgs} parameters, but found ${argCount}.`, line });
             brokenTokens.add(funcName);
          }
        }
      }
    }

    // 4. Identifier Validation (Barewords/Typos)
    const identRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    let identMatch;
    while ((identMatch = identRegex.exec(cleanLogic)) !== null) {
      const name = identMatch[1];
      const index = identMatch.index;
      
      // Skip if inside a string
      const beforeText = logic.substring(0, index);
      const quoteCount = (beforeText.match(/'|"/g) || []).length;
      if (quoteCount % 2 !== 0) continue;
      
      // Skip if inside a variable
      const braceCount = (beforeText.match(/\{|\}/g) || []).length;
      if (braceCount % 2 !== 0) continue;

      // Skip if it's a function call (handled by funcRegex)
      if (logic[index + name.length] === '(') continue;

      // Skip reserved words/constants
      if (['true', 'false', 'null', 'undefined'].includes(name)) continue;

      // It's a bareword/typo
      const line = getLineNumber(index);
      errors.push({ message: `Unknown Identifier: "${name}". Did you mean to use "{${name}}" or a function?`, line });
      brokenTokens.add(name);
    }

    // 4. Formatting Suggestions
    if (logic.length > 200 && !logic.includes('\n')) {
      suggestions.push("Long expression detected. Use 'Magic Format' to improve readability.");
    }
    if (logic.includes('=') && !logic.includes('==') && !logic.includes('!=') && !logic.includes('>=') && !logic.includes('<=') && !logic.includes('=>') && !logic.includes('=<')) {
      warnings.push("Detected '=' instead of '=='. In formulas, use '==' for equality testing.");
    }

    return { errors, warnings, suggestions, brokenTokens };
  };

  const computeResult = (): { result: any; error: string | null } => {
    const validation = getValidation();
    if (!logic.trim()) return { result: null, error: null };
    if (validation.errors.length > 0) return { result: null, error: 'Awaiting valid expression...' };
    
    try {
      let executable = logic.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
      
      // 1. Variable Substitution (with Array Support)
      executable = executable.replace(/\{([^{}]+)\}/g, (_match, label) => {
        const raw = mockValues[label];
        
        // Find field for type-aware substitution
        const getField = (path: string, fields: Field[]): Field | null => {
          const parts = path.split('.');
          const f = fields.find(field => field.label === parts[0]);
          if (!f) return null;
          if (parts.length === 1) return f;
          if (f.fields) return getField(parts.slice(1).join('.'), f.fields);
          if (f.type === 'lookup' && f.targetModuleId && relatedFields[f.targetModuleId]) {
            return getField(parts.slice(1).join('.'), relatedFields[f.targetModuleId]);
          }
          return null;
        };
        const field = getField(label, availableFields);
        const value = raw !== undefined ? raw : (field?.type === 'number' || field?.type === 'currency' ? '0' : '');

        // Handle comma-separated arrays
        if (value.includes(',') && !value.startsWith('"')) {
           const parts = value.split(',').map(v => v.trim());
           const parsed = parts.map(v => {
              if (v.toLowerCase() === 'true') return true;
              if (v.toLowerCase() === 'false') return false;
              return isNaN(Number(v)) ? v : Number(v);
           });
           return JSON.stringify(parsed);
        }

        // Booleans
        if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
          // Only use literal booleans for checkbox fields
          if (field?.type === 'checkbox') return value.toLowerCase();
          return `"${value}"`;
        }

        // Numbers vs Strings
        if (value === '') return '""';
        return isNaN(Number(value)) ? `"${value}"` : value;
      });

      // 2. JS Equality & Logical Operators
      executable = executable.replace(/==/g, '===');
      
      // 3. Execution Context (Aggregations)
      const context = {
        IF: (c: any, t: any, e: any) => c ? t : e,
        AND: (...args: any[]) => args.every(Boolean),
        OR: (...args: any[]) => args.some(Boolean),
        ROUND: (n: number, d: number) => Number(Number(n).toFixed(d)),
        SUM: (...args: any[]) => args.flat().reduce((a, b) => Number(a) + Number(b), 0),
        AVG: (...args: any[]) => {
          const flat = args.flat();
          return flat.reduce((a, b) => Number(a) + Number(b), 0) / (flat.length || 1);
        },
        COUNT: (...args: any[]) => args.flat().length,
        MAX: (...args: any[]) => Math.max(...args.flat().map(Number)),
        MIN: (...args: any[]) => Math.min(...args.flat().map(Number)),
        JOIN: (arr: any, s: string) => Array.isArray(arr) ? arr.join(s) : String(arr),
        LEN: (s: any) => String(s).length,
        ABS: Math.abs,
        UPPER: (s: any) => String(s).toUpperCase(),
        LOWER: (s: any) => String(s).toLowerCase(),
        CONTAINS: (s: any, q: any) => String(s).includes(q),
        CONCAT: (...args: any[]) => args.join(''),
        FILTER: (val: any, expression: string) => {
          const collection = Array.isArray(val) ? val : [val];
          return collection.filter(item => {
            const subExpr = expression.replace(/\$/g, JSON.stringify(item));
            try {
              // eslint-disable-next-line no-new-func
              return new Function(`return ${subExpr}`)();
            } catch {
              return false;
            }
          });
        },
        MAP: (val: any, expression: string) => {
          const collection = Array.isArray(val) ? val : [val];
          return collection.map(item => {
            const subExpr = expression.replace(/\$/g, JSON.stringify(item));
            try {
              // eslint-disable-next-line no-new-func
              return new Function(`return ${subExpr}`)();
            } catch {
              return item;
            }
          });
        },
        NOW: () => new Date().toISOString(),
        DATETIME: (...args: any[]) => {
          if (args.length === 0) return new Date().toISOString();
          const [y, m, d, h = 0, mi = 0, s = 0] = args;
          return new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(mi), Number(s)).toISOString();
        },
        TODAY: () => new Date().toISOString().split('T')[0],
        DIFF_DAYS: (d1: any, d2: any) => {
          const start = new Date(d1);
          const end = new Date(d2);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        },
        ADD_DAYS: (d: any, days: number) => {
          const date = new Date(d);
          date.setDate(date.getDate() + Number(days));
          return date.toISOString().split('T')[0];
        },
        AT: (arr: any, i: number) => Array.isArray(arr) ? arr[i] : (i === 0 ? arr : null),
        INDEX_OF: (arr: any, v: any) => Array.isArray(arr) ? arr.indexOf(v) : (arr === v ? 0 : -1),
        UNIQUE: (arr: any) => Array.isArray(arr) ? [...new Set(arr)] : [arr],
        SORT: (arr: any) => Array.isArray(arr) ? [...arr].sort() : [arr],
        REPLACE: (s: any, f: any, r: any) => String(s).replace(new RegExp(f, 'g'), r),
        TRIM: (s: any) => String(s).trim(),
        SUBSTR: (s: any, start: number, len: number) => String(s).substring(start, start + len),
        LEFT: (s: any, n: number) => String(s).substring(0, n),
        MID: (s: any, start: number, n: number) => String(s).substring(start - 1, (start - 1) + n),
        RIGHT: (s: any, n: number) => {
          const str = String(s);
          return str.substring(str.length - n);
        },
        SEARCH: (s: any, q: any) => String(s).toLowerCase().includes(String(q).toLowerCase()),
        ROW_INDEX: (arr: any, item: any) => Array.isArray(arr) ? arr.indexOf(item) : 0,
        CEIL: Math.ceil,
        FLOOR: Math.floor,
        PERCENT: (v: number, t: number) => (Number(v) / Number(t)) * 100,
        SWITCH: (val: any, ...args: any[]) => {
          for (let i = 0; i < args.length - 1; i += 2) {
            if (val === args[i]) return args[i + 1];
          }
          return args[args.length - 1]; // Return default (last arg)
        },
        COALESCE: (...args: any[]) => args.find(a => a !== null && a !== undefined && a !== ''),
        IS_NULL: (v: any) => v === null || v === undefined || v === '',
        YEAR: (d: any) => new Date(d).getFullYear(),
        MONTH: (d: any) => new Date(d).getMonth() + 1,
        DAY: (d: any) => new Date(d).getDate(),
        EOMONTH: (d: any, m: number) => {
          const date = new Date(d);
          date.setMonth(date.getMonth() + m + 1);
          date.setDate(0);
          return date.toISOString().split('T')[0];
        },
        WORKDAY: (d: any, days: number) => {
          let date = new Date(d);
          let count = 0;
          while (count < Math.abs(days)) {
            date.setDate(date.getDate() + (days > 0 ? 1 : -1));
            if (date.getDay() !== 0 && date.getDay() !== 6) count++;
          }
          return date.toISOString().split('T')[0];
        },
        PROPER: (s: any) => String(s).replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
      };
      
      // 4. Execution
      // eslint-disable-next-line no-new-func
      const func = new Function(...Object.keys(context), `return ${executable}`);
      const result = func(...Object.values(context));
      return { result, error: null };
    } catch (err) {
      console.error('Sandbox Error:', err);
      return { result: null, error: 'Runtime Error: Check your logic or mock values.' };
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedFields(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchLibrarySchema = async (moduleId: string) => {
    if (fetchedLibrarySchemas[moduleId] || (relatedFields && relatedFields[moduleId])) return;
    
    setIsFetchingLibrary(true);
    try {
      const response = await fetch(`${DATA_API_URL}/modules/${moduleId}`, {
        headers: {
          'Authorization': `Bearer ${(import.meta as any).env.VITE_DEV_TOKEN}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.layout) {
          setFetchedLibrarySchemas(prev => ({ ...prev, [moduleId]: data.layout }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch library schema:', err);
    } finally {
      setIsFetchingLibrary(false);
    }
  };

  const SYSTEM_SCHEMAS: Record<string, Field[]> = {
    'Users': [
      { id: 'u1', label: 'Full Name', type: 'text' },
      { id: 'u2', label: 'Email', type: 'email' },
      { id: 'u3', label: 'Role', type: 'text' },
      { id: 'u4', label: 'Avatar URL', type: 'url' },
      { id: 'u5', label: 'Status', type: 'text' },
    ],
    'Organization': [
      { id: 'o1', label: 'Company Name', type: 'text' },
      { id: 'o2', label: 'Domain', type: 'text' },
      { id: 'o3', label: 'Billing Plan', type: 'text' },
      { id: 'o4', label: 'Logo URL', type: 'url' },
    ],
    'Current Session': [
      { id: 's1', label: 'User ID', type: 'text' },
      { id: 's2', label: 'Login Time', type: 'date' },
      { id: 's3', label: 'IP Address', type: 'text' },
    ]
  };

  const renderField = (field: Field, depth = 0, parentPath = '') => {
    const isExpanded = expandedFields.has(field.id);
    const hasChildren = field.fields && field.fields.length > 0;
    const fullLabel = parentPath ? `${parentPath}.${field.label}` : field.label;

    return (
      <div key={field.id} className="space-y-1">
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, fullLabel)}
          className={cn(
            "w-full flex items-center gap-3 p-2.5 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-indigo-500/50 hover:bg-indigo-500/[0.02] transition-all group text-left relative",
            depth > 0 && "ml-4 scale-[0.98] origin-left"
          )}
        >
          <div 
            onClick={() => hasChildren && toggleExpand(field.id)}
            className={cn(
              "w-7 h-7 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 transition-colors shrink-0",
              hasChildren && "cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700"
            )}
          >
            {field.type === 'currency' ? <span className="text-[10px] font-bold">$</span> : 
             field.type === 'repeatableGroup' ? (isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />) :
             field.type === 'number' || field.type === 'calculation' ? <Hash size={12} /> :
             <Terminal size={12} />}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold text-zinc-900 dark:text-white truncate">{field.label}</p>
              {(() => {
                const badge = getTypeBadge(field.type);
                return (
                  <span className={cn("px-1 py-0.5 rounded text-[7px] font-black border uppercase shrink-0", badge.color)}>
                    {badge.label}
                  </span>
                );
              })()}
            </div>
          </div>

          <div className="hidden group-hover:flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => {
                if (!mockValues[fullLabel]) {
                  setMockValues(prev => ({ ...prev, [fullLabel]: '' }));
                }
                setRightActiveTab('sandbox');
              }}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-lg transition-all",
                mockValues[fullLabel] !== undefined
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
              onClick={() => handleInsertField(fullLabel)}
              className="w-7 h-7 flex items-center justify-center text-zinc-300 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all"
              title="Add to Formula"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
            {field.fields?.map(f => renderField(f, depth + 1, fullLabel))}
          </div>
        )}
      </div>
    );
  };

  const validation = getValidation();
  const sandbox = computeResult();

  const filteredFields = availableFields.filter(f => {
    if (f.type === 'group' || f.type === 'fieldGroup') return false;
    
    const matchesSearch = f.label.toLowerCase().includes(variableSearch.toLowerCase());
    if (!matchesSearch) return false;
    
    if (variableTypeFilter === 'repeatable') return f.type === 'repeatableGroup';
    if (variableTypeFilter === 'lookup') return f.type === 'lookup';
    if (variableTypeFilter === 'numeric') return f.type === 'number' || f.type === 'calculation' || f.type === 'currency';
    
    return true;
  });

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
            <div className="px-6 py-2.5 border-b border-zinc-100 dark:border-zinc-900/50 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/20">
              <div className="flex items-center gap-6">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                  <Calculator size={20} className="text-white" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Logic Architect</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Building Logic for:</span>
                    <span className="px-3 py-1 bg-indigo-500/10 text-indigo-500 rounded-lg text-xs font-black uppercase tracking-tight">{targetLabel}</span>
                  </div>
                </div>
              </div>
              <button 
                type="button"
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Column - Variables & Functions */}
              <aside className="w-72 border-r border-zinc-100 dark:border-zinc-900 flex flex-col bg-zinc-50/30 dark:bg-zinc-900/10">
                <div className="p-2 flex gap-1 border-b border-zinc-100 dark:border-zinc-900">
                  {[
                    { id: 'fields', label: 'Variables', icon: Hash },
                    { id: 'functions', label: 'Functions', icon: FunctionSquare },
                    { id: 'relationships', label: 'Relations', icon: Database },
                    { id: 'snippets', label: 'Snippets', icon: Bookmark }
                  ].map(tab => (
                    <button 
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as any)}
                      className={cn(
                        "flex-1 py-2 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all border flex flex-col items-center justify-center gap-1",
                        activeTab === tab.id 
                          ? "bg-white dark:bg-zinc-800 text-indigo-600 border-indigo-500/20 shadow-sm" 
                          : "text-zinc-500 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      )}
                    >
                      <tab.icon size={12} />
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  {activeTab === 'fields' ? (
                    <>
                      {/* Search & Filter UI */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Variables</p>
                          <HelpTooltip text="These are the fields from your current module that you can use in your calculations. Wrap them in curly braces like {Field Name}." />
                        </div>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                            <Wand2 size={12} />
                          </div>
                          <input 
                            type="text"
                            value={variableSearch}
                            onChange={(e) => setVariableSearch(e.target.value)}
                            placeholder="Search variables..."
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-[10px] font-medium focus:outline-none focus:border-indigo-500/50 transition-all shadow-sm"
                          />
                        </div>
                        
                        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                          {[
                            { id: 'all', label: 'All' },
                            { id: 'repeatable', label: 'Lists' },
                            { id: 'lookup', label: 'Lookups' },
                            { id: 'numeric', label: 'Numbers' }
                          ].map(filter => (
                            <button
                              key={filter.id}
                              type="button"
                              onClick={() => setVariableTypeFilter(filter.id as any)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                                variableTypeFilter === filter.id 
                                  ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/30" 
                                  : "bg-white dark:bg-zinc-900 text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                              )}
                            >
                              {filter.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        {filteredFields.length > 0 ? (
                          filteredFields.map(field => renderField(field))
                        ) : (
                          <div className="p-8 text-center space-y-3">
                            <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto">
                              <Info size={20} className="text-zinc-400" />
                            </div>
                            <p className="text-xs text-zinc-500">No matching fields found.</p>
                          </div>
                        )}
                      </div>
                    </>
                  ) : activeTab === 'functions' ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Functions</p>
                        <HelpTooltip text="Pre-built logic tools to transform your data. Click one to insert its template into the editor." />
                      </div>
                      <div className="space-y-2">
                        {FUNCTIONS.map(fn => (
                          <button
                            key={fn.name}
                            type="button"
                            draggable
                            onDragStart={(e) => handleFuncDragStart(e, fn.template)}
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
                        ))}
                      </div>
                    </div>
                  ) : activeTab === 'relationships' ? (
                    <div className="space-y-4">
                      {/* Explorer Navigation */}
                      <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl mb-4">
                        {(['linked', 'platform', 'library'] as const).map((source) => (
                          <button
                            key={source}
                            type="button"
                            onClick={() => {
                              setRelSource(source);
                              setDrillPath([]);
                              setDrillModuleId(null);
                            }}
                            className={cn(
                              "flex-1 px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                              relSource === source 
                                ? "bg-white dark:bg-zinc-800 text-indigo-500 shadow-sm" 
                                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                            )}
                          >
                            {source === 'linked' ? 'Linked' : source === 'platform' ? 'System' : 'Library'}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 px-1 text-[10px] font-black uppercase tracking-widest overflow-hidden mb-4">
                        <button 
                          onClick={() => {
                            setDrillPath([]);
                            setDrillModuleId(null);
                          }}
                          className={cn("transition-colors", drillPath.length > 0 ? "text-indigo-500 hover:text-indigo-400" : "text-zinc-400")}
                        >
                          {relSource === 'linked' ? 'Relations' : relSource === 'platform' ? 'System' : 'Modules'}
                        </button>
                        {drillPath.map((p, i) => (
                          <React.Fragment key={i}>
                            <ChevronRight size={10} className="text-zinc-300 shrink-0" />
                            <span className={cn("truncate", i === drillPath.length - 1 ? "text-zinc-900 dark:text-white" : "text-indigo-500")}>
                              {p}
                            </span>
                          </React.Fragment>
                        ))}
                        <div className="ml-auto">
                          <HelpTooltip text="Access data from other connected modules or system objects (like the current user) to build cross-module logic." />
                        </div>
                      </div>
                      
                      {drillPath.length === 0 ? (
                        <div className="space-y-2">
                          {relSource === 'linked' && (
                            availableFields.filter(f => f.type === 'lookup').length > 0 ? (
                              availableFields.filter(f => f.type === 'lookup').map(lookup => (
                                <button
                                  key={lookup.id}
                                  type="button"
                                  onClick={() => setDrillPath([lookup.label])}
                                  className="w-full flex items-center gap-3 p-4 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-indigo-500/50 hover:bg-indigo-500/[0.02] transition-all group text-left"
                                >
                                  <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 shrink-0">
                                    <Database size={18} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{lookup.label}</p>
                                    <p className="text-[8px] text-indigo-500 font-black uppercase tracking-widest mt-0.5">Connected Relation</p>
                                  </div>
                                  <ChevronRight size={14} className="text-zinc-300 group-hover:text-indigo-500 transition-colors" />
                                </button>
                              ))
                            ) : (
                              <div className="p-8 text-center space-y-3">
                                <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto">
                                  <Database size={20} className="text-zinc-400" />
                                </div>
                                <p className="text-xs text-zinc-500">No Relationship fields found.</p>
                              </div>
                            )
                          )}

                          {relSource === 'platform' && (
                            Object.keys(SYSTEM_SCHEMAS).map(name => (
                              <button
                                key={name}
                                type="button"
                                onClick={() => setDrillPath([name])}
                                className="w-full flex items-center gap-3 p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-emerald-500/50 hover:bg-emerald-500/[0.02] transition-all group text-left shadow-sm"
                              >
                                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 shrink-0">
                                  {name === 'Users' ? <CheckCircle2 size={18} /> : <Save size={18} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{name}</p>
                                  <p className="text-[8px] text-emerald-500 font-black uppercase tracking-widest mt-0.5">Global System Object</p>
                                </div>
                                <ChevronRight size={14} className="text-zinc-300 group-hover:text-emerald-500 transition-colors" />
                              </button>
                            ))
                          )}

                          {relSource === 'library' && (
                            allModules?.length ? (
                              allModules.map(mod => (
                                <button
                                  key={mod.id}
                                  type="button"
                                  onClick={() => {
                                    setDrillPath([mod.name]);
                                    setDrillModuleId(mod.id);
                                    fetchLibrarySchema(mod.id);
                                  }}
                                  className="w-full flex items-center gap-3 p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-rose-500/50 hover:bg-rose-500/[0.02] transition-all group text-left shadow-sm"
                                >
                                  <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500 shrink-0">
                                    <Layers size={18} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{mod.name}</p>
                                    <p className="text-[8px] text-rose-500 font-black uppercase tracking-widest mt-0.5">{mod.type || 'Custom'} Module</p>
                                  </div>
                                  <ChevronRight size={14} className="text-zinc-300 group-hover:text-rose-500 transition-colors" />
                                </button>
                              ))
                            ) : (
                              <div className="p-8 text-center space-y-3">
                                <p className="text-xs text-zinc-500">No other modules found.</p>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1 animate-in fade-in slide-in-from-right-4 duration-300">
                          {(() => {
                            let schema: Field[] = [];
                            let parentPrefix = drillPath[0];

                            if (relSource === 'linked') {
                              const activeLookup = availableFields.find(f => f.label === drillPath[0]);
                              schema = activeLookup?.targetModuleId ? (relatedFields?.[activeLookup.targetModuleId] || []) : [];
                            } else if (relSource === 'platform') {
                              schema = SYSTEM_SCHEMAS[drillPath[0]] || [];
                            } else if (relSource === 'library' && drillModuleId) {
                              schema = fetchedLibrarySchemas[drillModuleId] || relatedFields?.[drillModuleId] || [];
                            }
                            
                            return isFetchingLibrary ? (
                              <div className="p-8 text-center space-y-3">
                                <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center mx-auto animate-spin">
                                  <RotateCcw size={16} className="text-indigo-500" />
                                </div>
                                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Accessing Schema...</p>
                              </div>
                            ) : schema.length > 0 ? (
                              schema
                                .filter(rf => rf.type !== 'group' && rf.type !== 'fieldGroup')
                                .map(rf => renderField(rf, 0, parentPrefix))
                            ) : (
                              <div className="p-8 text-center space-y-3">
                                <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center mx-auto animate-pulse">
                                  <Database size={16} className="text-zinc-300" />
                                </div>
                                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">No fields available.</p>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  ) : activeTab === 'snippets' ? (
                <div className="p-4 space-y-4 animate-in fade-in slide-in-from-left-4">
                  {snippets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-30">
                      <Bookmark size={32} className="text-zinc-400" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">No snippets yet</p>
                        <p className="text-[9px] text-zinc-400 max-w-[140px]">Save your common logic expressions to reuse them later.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {snippets.map(snippet => (
                        <div 
                          key={snippet.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', snippet.expression);
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                          className="group relative p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[1.5rem] hover:border-indigo-500/50 transition-all cursor-pointer"
                          onClick={() => insertText(snippet.expression)}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                             <div className="flex items-center gap-2 min-w-0">
                               <div className="w-6 h-6 bg-indigo-500/10 rounded-lg flex items-center justify-center shrink-0">
                                 <Bookmark size={10} className="text-indigo-500" />
                               </div>
                               <p className="text-[11px] font-black text-zinc-900 dark:text-white truncate uppercase tracking-tight">{snippet.name}</p>
                             </div>
                             <button 
                               onClick={(e) => { e.stopPropagation(); deleteSnippet(snippet.id); }}
                               className="p-1 text-zinc-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                             >
                               <Trash2 size={12} />
                             </button>
                          </div>
                          <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                             <code className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 line-clamp-2 break-all">{snippet.expression}</code>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                             <span className="text-[8px] font-black text-zinc-300 uppercase tracking-widest">{snippet.timestamp}</span>
                             <span className="text-[8px] font-black text-indigo-500 opacity-0 group-hover:opacity-100 uppercase tracking-widest transition-opacity">Click to Insert</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
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
              <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-950 p-6 space-y-6 border-r border-zinc-100 dark:border-zinc-900">
                {/* Editor Area */}
                <div className="flex-[2] relative group flex flex-col min-h-[300px]">
                  <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-[2.5rem] blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative flex-1 flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden shadow-sm">
                    {/* Editor Header */}
                    <div className="px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 flex items-center justify-between">
                      <div className="flex-1 min-w-0 mr-4">
                        <AnimatePresence mode="wait">
                          {!activeInsight ? (
                            <motion.div 
                              key="title"
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 5 }}
                              className="flex items-center gap-2"
                            >
                              <Terminal size={14} className="text-indigo-500" />
                              <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Logic Expression Editor</span>
                            </motion.div>
                          ) : (
                            <motion.div 
                              key="insight"
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 5 }}
                              className="flex items-center gap-4"
                            >
                              <div className={cn(
                                "flex items-center gap-2 px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest",
                                activeInsight.type === 'function' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                              )}>
                                {activeInsight.type === 'function' ? <FunctionSquare size={10} /> : <Hash size={10} />}
                                {activeInsight.type === 'function' ? activeInsight.data.name : activeInsight.data.label}
                              </div>
                              <p className="text-[9px] text-zinc-500 dark:text-zinc-400 font-medium truncate italic max-w-md">
                                {activeInsight.type === 'function' ? activeInsight.data.description : `Variable: ${activeInsight.data.type}`}
                                {activeInsight.type === 'function' && activeInsight.data.examples && (
                                  <span className="ml-3 text-zinc-400 font-normal group-hover:text-emerald-500 transition-colors">
                                    Ex: <code className="text-emerald-500/70">{activeInsight.data.examples[0]}</code>
                                  </span>
                                )}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* 1. History & Search Utilities */}
                        <div className="flex items-center bg-zinc-100/50 dark:bg-zinc-800/50 rounded-xl p-1 gap-1">
                          <button
                            type="button"
                            onClick={undo}
                            disabled={historyIndex <= 0}
                            className="p-1.5 text-zinc-400 hover:text-indigo-500 disabled:opacity-30 transition-all rounded-lg hover:bg-white dark:hover:bg-zinc-700"
                            title="Undo (Ctrl+Z)"
                          >
                            <RotateCcw size={12} className="scale-x-[-1]" />
                          </button>
                          <button
                            type="button"
                            onClick={redo}
                            disabled={historyIndex >= history.length - 1}
                            className="p-1.5 text-zinc-400 hover:text-indigo-500 disabled:opacity-30 transition-all rounded-lg hover:bg-white dark:hover:bg-zinc-700"
                            title="Redo (Ctrl+Y)"
                          >
                            <RotateCcw size={12} />
                          </button>
                          <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-700 mx-1" />
                          <button 
                            type="button"
                            onClick={() => setShowFind(!showFind)}
                            className={cn(
                              "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                              showFind ? "bg-white dark:bg-zinc-700 text-indigo-500 shadow-sm" : "text-zinc-500 hover:text-indigo-500"
                            )}
                          >
                            <Search size={10} />
                            Find
                          </button>
                        </div>

                        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />

                        {/* 2. Intelligence Tools */}
                        <div className="flex items-center gap-1.5">
                          <button 
                            type="button"
                            onClick={() => setShowDocs(true)}
                            className={cn(
                              "flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all border",
                              showDocs 
                                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-lg shadow-black/20" 
                                : "bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-900 dark:hover:text-white"
                            )}
                          >
                            <BookOpen size={10} />
                            Docs
                          </button>

                          <button 
                            type="button"
                            onClick={() => setShowAiBuild(!showAiBuild)}
                            className={cn(
                              "flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all border",
                              showAiBuild 
                                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-lg" 
                                : "bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-900 dark:hover:text-white"
                            )}
                          >
                            <Sparkles size={10} />
                            Build with AI
                          </button>
                        </div>
                        {validation.errors.length > 0 && (
                          <button 
                            type="button"
                            onClick={handleAiFix}
                            disabled={isFixing}
                            className={cn(
                              "flex items-center gap-1.5 text-[9px] font-black transition-all uppercase tracking-widest px-3 py-1.5 rounded-xl relative group/fix border",
                              isFixing 
                                ? "bg-zinc-900 text-white border-zinc-900 animate-pulse" 
                                : "bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-900 dark:hover:text-white"
                            )}
                          >
                            <Sparkles size={10} />
                            <span className="relative z-10">{isFixing ? 'Fixing...' : 'Fix with AI'}</span>
                            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[7px] font-black flex items-center justify-center rounded-full shadow-lg border border-white dark:border-zinc-950 z-20">
                              {validation.errors.length}
                            </span>
                          </button>
                        )}

                        <button 
                          type="button"
                          onClick={magicFormat}
                          className="flex items-center gap-1.5 text-[9px] font-black text-zinc-500 hover:text-zinc-900 dark:hover:text-white px-3 py-1.5 rounded-xl transition-all uppercase tracking-widest border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
                        >
                          <Wand2 size={10} />
                          Format
                        </button>

                        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />

                        {/* 3. Global Actions */}
                        <div className="flex items-center gap-1.5">
                          <div className="relative">
                            <button 
                              type="button"
                              onClick={() => setShowSaveSnippet(!showSaveSnippet)}
                              disabled={!logic.trim()}
                              className={cn(
                                "px-3 py-1.5 text-[9px] font-black uppercase rounded-xl transition-all flex items-center gap-2 border",
                                showSaveSnippet 
                                  ? "bg-zinc-900 text-white border-zinc-900 shadow-lg" 
                                  : "bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 disabled:opacity-30"
                              )}
                            >
                              <Bookmark size={10} />
                              Save
                            </button>

                          <AnimatePresence>
                            {showSaveSnippet && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute right-0 top-full mt-2 w-64 p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-[100] space-y-3"
                              >
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Name your snippet</p>
                                <input 
                                  autoFocus
                                  type="text"
                                  placeholder="e.g., Margin Calculation"
                                  value={newSnippetName}
                                  onChange={(e) => setNewSnippetName(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveSnippet()}
                                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 transition-all placeholder:text-zinc-300"
                                />
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => setShowSaveSnippet(false)}
                                    className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    onClick={handleSaveSnippet}
                                    disabled={!newSnippetName.trim()}
                                    className="flex-1 px-3 py-2 bg-indigo-600 text-white text-[10px] font-bold rounded-lg disabled:opacity-50 hover:bg-indigo-500 transition-colors"
                                  >
                                    Save
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                          <button 
                            type="button"
                            onClick={() => setLogic('')}
                            className="px-3 py-1.5 bg-white dark:bg-zinc-900 text-zinc-500 text-[9px] font-black uppercase rounded-xl hover:text-rose-500 hover:bg-rose-500/5 transition-all border border-zinc-200 dark:border-zinc-800 hover:border-rose-500/30"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* AI Prompt Bar */}
                    <AnimatePresence>
                      {showAiBuild && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-6 py-4 border-b border-purple-100 dark:border-purple-900/30 bg-purple-50/30 dark:bg-purple-900/10 overflow-hidden"
                        >
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-purple-500 rounded-md flex items-center justify-center">
                                  <BrainCircuit size={12} className="text-white" />
                                </div>
                                <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">Logic Co-Pilot</span>
                              </div>
                              <button onClick={() => setShowAiBuild(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors">
                                <X size={14} />
                              </button>
                            </div>
                            <div className="relative group">
                              <textarea 
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                placeholder="Describe your logic in plain English (e.g. 'Sum all items where status is paid')..."
                                className="w-full bg-white dark:bg-zinc-950 border border-purple-200 dark:border-purple-800/50 rounded-xl p-4 text-[11px] font-medium focus:outline-none focus:border-purple-500 transition-all shadow-inner resize-none h-20 placeholder:text-zinc-400"
                              />
                              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                                <button 
                                  type="button"
                                  disabled={!aiPrompt.trim() || isAiGenerating}
                                  onClick={handleAiGenerate}
                                  className={cn(
                                    "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                    !aiPrompt.trim() || isAiGenerating
                                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                                      : "bg-purple-600 text-white hover:bg-purple-500 shadow-xl shadow-purple-500/30"
                                  )}
                                >
                                  {isAiGenerating ? (
                                    <>
                                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                      <span>Architecting...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles size={12} />
                                      <span>Generate Logic</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                            <p className="text-[9px] text-zinc-400 font-medium italic px-1">
                              Tip: I can handle complex filters, aggregations, and multi-step math.
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Find & Replace Bar */}
                    <AnimatePresence>
                      {showFind && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-4 overflow-hidden"
                        >
                          <div className="flex-1 flex items-center gap-2">
                            <div className="relative flex-1 group">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" size={12} />
                              <input 
                                type="text"
                                value={findText}
                                onChange={(e) => setFindText(e.target.value)}
                                placeholder="Find..."
                                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-8 pr-20 py-1.5 text-[10px] focus:outline-none focus:border-indigo-500 transition-all"
                              />
                              {findMatches.length > 0 && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded text-[8px] font-black text-zinc-400 select-none">
                                  <span>{currentMatchIndex + 1} of {findMatches.length}</span>
                                  <div className="w-px h-2 bg-zinc-100 dark:bg-zinc-800 mx-0.5" />
                                  <div className="flex items-center">
                                    <button 
                                      onClick={() => setCurrentMatchIndex(prev => (prev - 1 + findMatches.length) % findMatches.length)}
                                      className="p-0.5 hover:text-indigo-500 transition-colors"
                                    >
                                      <ChevronDown size={10} className="rotate-180" />
                                    </button>
                                    <button 
                                      onClick={() => setCurrentMatchIndex(prev => (prev + 1) % findMatches.length)}
                                      className="p-0.5 hover:text-indigo-500 transition-colors"
                                    >
                                      <ChevronDown size={10} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="relative flex-1 group">
                              <RotateCcw className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" size={12} />
                              <input 
                                type="text"
                                value={replaceText}
                                onChange={(e) => setReplaceText(e.target.value)}
                                placeholder="Replace with..."
                                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-[10px] focus:outline-none focus:border-indigo-500 transition-all"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              type="button"
                              onClick={handleReplace}
                              disabled={findMatches.length === 0}
                              className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-[9px] font-black uppercase rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 transition-all"
                            >
                              Replace
                            </button>
                            <button 
                              type="button"
                              onClick={handleReplaceAll}
                              disabled={findMatches.length === 0}
                              className="px-3 py-1.5 bg-indigo-600 text-white text-[9px] font-black uppercase rounded-lg hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 disabled:opacity-30 transition-all"
                            >
                              Replace All
                            </button>
                            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />
                            <button 
                              type="button"
                              onClick={() => setShowFind(false)}
                              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

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
                          {logic.split(/(\/\*[\s\S]*?\*\/|\/\/.*|\{[^{}]+\}|[A-Z_]+(?=\()|[()\[\],]|"[^"]*"|'[^']*'|\b\d+(?:\.\d+)?\b|[+\-*/%=<>!&|]+|\b[a-zA-Z_][a-zA-Z0-9_]*\b)/g).map((part, i) => {
                             const isBroken = validation.brokenTokens.has(part);
                             const squiggleClass = isBroken ? "border-b-2 border-rose-500 border-dotted bg-rose-500/10" : "";
                             
                             let colorClass = "text-zinc-500 dark:text-zinc-600"; // Default punctuation
                             
                             if (/^\{[^}]+\}$/.test(part)) {
                               colorClass = "text-indigo-600 dark:text-indigo-400 font-bold";
                             } else if (/^[A-Z_]+$/.test(part)) {
                               colorClass = "text-emerald-600 dark:text-emerald-400 font-bold";
                             } else if (/^[()\[\],]$/.test(part)) {
                               colorClass = "text-emerald-600 dark:text-emerald-400 font-bold";
                             } else if (/^\d+(?:\.\d+)?$/.test(part)) {
                               colorClass = "text-amber-600 dark:text-amber-400";
                             } else if (/^'[^']*'$/.test(part) || /^"[^"]*"$/.test(part)) {
                               colorClass = "text-rose-600 dark:text-rose-400";
                             } else if (/^[+\-*/%=<>!&|]+$/.test(part)) {
                               colorClass = "text-zinc-900 dark:text-zinc-200 font-bold";
                             } else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(part)) {
                               colorClass = "text-zinc-900 dark:text-zinc-100";
                             }

                             const content = findText && part.includes(findText) ? (
                               <span>
                                 {part.split(findText).map((segment, si, array) => (
                                   <React.Fragment key={si}>
                                     {segment}
                                     {si < array.length - 1 && (
                                       <span className="bg-amber-500/30 text-zinc-900 dark:text-white rounded-sm ring-1 ring-amber-500/50 px-0.5 shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                                         {findText}
                                       </span>
                                     )}
                                   </React.Fragment>
                                 ))}
                               </span>
                             ) : part;

                             return <span key={i} className={cn(colorClass, squiggleClass)}>{content}</span>;
                           })}
                        </div>

                        {/* Actual Textarea */}
                        <textarea
                          ref={textareaRef}
                          value={logic}
                          onChange={handleTextChange}
                          onKeyDown={handleKeyDown}
                          onClick={handleCursorMove}
                          onKeyUp={handleCursorMove}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={handleDrop}
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
                          spellCheck={false}
                          className="absolute inset-0 w-full h-full bg-transparent p-6 text-base font-mono text-transparent caret-zinc-900 dark:caret-white placeholder:text-zinc-200 dark:placeholder:text-zinc-800 focus:outline-none resize-none leading-[26px] whitespace-pre overflow-x-auto overflow-y-auto custom-scrollbar"
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
                              <div className="p-1.5 space-y-0.5 max-h-72 overflow-y-auto custom-scrollbar">
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
                                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                    )}
                                  >
                                    <div className={cn(
                                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                      i === selectedIndex ? "bg-white/20" : "bg-zinc-100 dark:bg-zinc-800"
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
                                        <p className={cn("text-[9px] truncate mt-0.5", i === selectedIndex ? "text-white/60" : "text-zinc-500")}>
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
                </div>

                  {/* Operator Palette (Single Row) */}
                  <div className="flex items-center gap-1.5">
                    {OPERATORS.map(op => (
                      <button
                        key={op.label}
                        type="button"
                        onClick={() => insertText(op.value)}
                        className="flex-1 h-9 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-indigo-500/50 hover:bg-indigo-500/5 text-xs font-black text-zinc-700 dark:text-zinc-300 transition-all shadow-sm group min-w-0"
                      >
                        {op.icon ? <op.icon size={14} className="group-hover:scale-110 transition-transform" /> : op.label}
                      </button>
                    ))}
                  </div>

                  {/* Logic Intelligence Panel */}
                  <div className="bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden flex flex-col min-h-[160px]">
                    <div className="px-6 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 flex items-center justify-between">
                      <button 
                        type="button"
                        onClick={() => setIsIntelliExpanded(!isIntelliExpanded)}
                        className="flex items-center gap-3 hover:opacity-70 transition-opacity"
                      >
                        <BrainCircuit size={14} className="text-indigo-500" />
                        <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">Logic Intelligence</span>
                        <HelpTooltip text="Our AI-powered engine checks for syntax errors, circular dependencies, and suggests improvements to your logic." />
                        {isIntelliExpanded ? <ChevronDown size={12} className="text-zinc-400" /> : <ChevronRight size={12} className="text-zinc-400" />}
                      </button>
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
                    
                    <AnimatePresence>
                      {isIntelliExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 280, opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="flex-1 grid grid-cols-2 divide-x divide-zinc-100 dark:divide-zinc-800 bg-white/30 dark:bg-zinc-900/20 overflow-hidden"
                        >
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
                          <div key={i} className="flex items-center justify-between gap-4 p-3 bg-rose-500/5 border border-rose-500/20 rounded-2xl animate-in fade-in slide-in-from-left-2 group">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
                                 <AlertCircle size={14} className="text-rose-500" />
                                 <span className="text-[7px] font-black text-rose-400 bg-rose-500/10 px-1 rounded-sm uppercase tracking-tighter">#{String(i + 1).padStart(2, '0')}</span>
                              </div>
                              <div className="space-y-1 flex-1 min-w-0">
                                 <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 leading-relaxed truncate">{err.message}</p>
                                 {err.line && (
                                    <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                       <div className="w-1 h-1 rounded-full bg-rose-400" />
                                       <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">At Line {err.line}</span>
                                    </div>
                                 )}
                              </div>
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
                          <div className="space-y-2">
                            {Array.from(new Set(logic.match(/\{([^{}]+)\}/g) || [])).map((tag, i) => {
                              const label = tag.slice(1, -1);
                              const field = availableFields.find(f => f.label === label);
                              return (
                                <div key={i} className="flex items-center gap-4 p-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm group/var transition-all hover:border-indigo-500/30">
                                   <div className="flex-1 min-w-0 flex items-center gap-3">
                                      <div className="w-8 h-8 bg-zinc-50 dark:bg-zinc-900 rounded-lg flex items-center justify-center shrink-0">
                                        <Hash size={14} className="text-zinc-400" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[11px] font-black text-zinc-900 dark:text-white truncate">{label}</span>
                                          {field && (
                                            <span className={cn("px-1 py-0.5 rounded text-[7px] font-black uppercase", getTypeBadge(field.type).color)}>
                                              {getTypeBadge(field.type).label}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                   </div>
                                   <div className="w-32 shrink-0">
                                      <input 
                                        type="text"
                                        placeholder="Mock Value"
                                        value={mockValues[label] || ''}
                                        onChange={(e) => setMockValues(prev => ({ ...prev, [label]: e.target.value }))}
                                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl text-[11px] font-mono focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-300"
                                      />
                                   </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

            {/* Right Column - Tabs & Tools */}
            <aside className="w-64 flex flex-col bg-zinc-50/30 dark:bg-zinc-900/10 border-l border-zinc-100 dark:border-zinc-900">
              {/* Right Tabs */}
              <div className="p-2 flex gap-1 border-b border-zinc-100 dark:border-zinc-900 overflow-x-auto no-scrollbar">
                {[
                  { id: 'execution', label: 'Strategy', icon: Settings2 },
                  { id: 'sandbox', label: 'Sandbox', icon: Zap },
                  { id: 'history', label: 'History', icon: Clock }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    type="button"
                    onClick={() => setRightActiveTab(tab.id as any)}
                    className={cn(
                      "flex-1 min-w-0 py-2 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all border flex flex-col items-center justify-center gap-1",
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Settings2 size={12} className="text-indigo-500" />
                          <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Execution Strategy</span>
                        </div>
                        <HelpTooltip text="Define when this calculation should run. 'Real-time' updates as you type, while 'On Save' waits until the record is submitted." />
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
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <Zap size={12} className="text-amber-500" />
                           <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Live Preview</span>
                         </div>
                         <HelpTooltip text="Test your logic here with mock data. Change the values in the 'Variable Map' to see how the result updates instantly." />
                       </div>
                       
                       <div className="relative p-6 bg-zinc-50/30 dark:bg-zinc-900/20 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl flex flex-col items-center justify-center text-center overflow-hidden group">
                          {/* Animated Background Gradient */}
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] via-transparent to-rose-500/[0.03]" />
                          
                          <div className="relative z-10 space-y-6">
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Computed Outcome</p>
                              <div className="h-0.5 w-8 bg-indigo-500/20 mx-auto rounded-full" />
                            </div>
                            
                            {sandbox.error ? (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                   <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto">
                                     <AlertCircle size={24} className="text-rose-500" />
                                   </div>
                                    <p className="text-xs font-bold text-rose-500/80 px-4 leading-relaxed">{sandbox.error}</p>
                                 </div>
                            ) : !logic.trim() ? (
                              <div className="space-y-4 opacity-20 animate-in fade-in zoom-in-95">
                                 <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto">
                                   <Terminal size={24} className="text-zinc-400" />
                                 </div>
                                 <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">No expression</p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-4">
                                 <div className="relative">
                                    <motion.div
                                      key={String(sandbox.result)}
                                      initial={{ scale: 1.5, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      className="absolute -inset-8 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"
                                    />
                                    <motion.span 
                                      key={String(sandbox.result) + '_text'}
                                      initial={{ y: 10, opacity: 0 }}
                                      animate={{ y: 0, opacity: 1 }}
                                      className={cn(
                                        "text-sm font-bold tracking-tight transition-all duration-500 leading-relaxed block break-words max-w-full",
                                        typeof sandbox.result === 'number' ? "text-indigo-600 dark:text-indigo-400" :
                                        typeof sandbox.result === 'boolean' ? (sandbox.result ? "text-emerald-500" : "text-rose-500") :
                                        "text-zinc-900 dark:text-white"
                                      )}
                                    >
                                      {sandbox.result === null ? '—' : 
                                       typeof sandbox.result === 'boolean' ? (sandbox.result ? 'TRUE' : 'FALSE') :
                                       sandbox.result}
                                    </motion.span>
                                 </div>
                                 
                                 <div className="inline-flex items-center gap-2 px-3 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full shadow-sm">
                                    <div className={cn(
                                      "w-1.5 h-1.5 rounded-full",
                                      typeof sandbox.result === 'number' ? "bg-indigo-500" :
                                      typeof sandbox.result === 'boolean' ? "bg-emerald-500" : "bg-zinc-400"
                                    )} />
                                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                                      {typeof sandbox.result === 'number' ? 'Numeric Value' : 
                                       typeof sandbox.result === 'boolean' ? 'Logic Boolean' : 
                                       'Data Output'}
                                    </span>
                                 </div>
                              </div>
                            )}
                          </div>
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
                                {(() => {
                                   const activeVars = new Set((logic.match(/\{([^{}]+)\}/g) || []).map(t => t.slice(1, -1)));
                                   const entries = Object.entries(mockValues).filter(([key]) => activeVars.has(key));
                                   
                                   if (entries.length === 0) {
                                      return <p className="text-[10px] text-zinc-400 italic">No mock data used in current expression...</p>;
                                   }
                                   
                                   return entries.map(([key, val]) => (
                                      <div key={key} className="px-2 py-1 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800 text-[9px] font-mono">
                                         <span className="text-zinc-400">{key}:</span> <span className="text-zinc-900 dark:text-white">{val}</span>
                                      </div>
                                   ));
                                 })()}
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
                )}
                
                <AnimatePresence>
                  {showDocs && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      className="absolute inset-0 z-[500] bg-white dark:bg-zinc-950 flex flex-col"
                    >
                      <div className="px-12 py-8 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/40">
                            <BookOpen size={28} className="text-white" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">Documentation</h3>
                            <div className="flex items-center gap-3">
                              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em]">Logic Guides & Function Reference</p>
                              <div className="w-1 h-1 bg-zinc-300 rounded-full" />
                              <span className="text-[10px] text-indigo-500 font-black uppercase">{FUNCTIONS.length} Functions Available</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="relative group w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                            <input 
                              type="text"
                              value={docsSearch}
                              onChange={(e) => setDocsSearch(e.target.value)}
                              placeholder="Search for functions or syntax..."
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-sm font-medium focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                            />
                          </div>
                          <button 
                            onClick={() => setShowDocs(false)}
                            className="w-12 h-12 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-2xl transition-all"
                          >
                            <X size={24} />
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto custom-scrollbar p-12 space-y-16">
                        {/* Syntax Guide & Help Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                          <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                              <Terminal size={20} className="text-indigo-500" />
                              <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">Syntax Guide</h4>
                            </div>
                            <div className="space-y-8">
                              <div className="space-y-3">
                                <p className="text-sm font-bold text-zinc-900 dark:text-white">Collection Processing</p>
                                <p className="text-xs text-zinc-500 leading-relaxed bg-zinc-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                  Use <code className="text-indigo-500 px-1.5 py-0.5 bg-indigo-500/5 rounded font-mono font-bold">FILTER</code> or <code className="text-indigo-500 px-1.5 py-0.5 bg-indigo-500/5 rounded font-mono font-bold">MAP</code> with the <code className="text-emerald-500 font-mono font-black">$</code> token representing the current item.
                                  <br /><br />
                                  <span className="text-zinc-400 block mb-1 text-[10px] font-black uppercase tracking-widest">Example:</span>
                                  <code className="text-indigo-600 dark:text-indigo-400 font-mono text-sm">{"FILTER([1, 2, 3], \"$ > 1\")"}</code>
                                </p>
                              </div>
                              <div className="space-y-3">
                                <p className="text-sm font-bold text-zinc-900 dark:text-white">Code Documentation</p>
                                <p className="text-xs text-zinc-500 leading-relaxed bg-zinc-50 dark:bg-zinc-900/50 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                  Add notes to your logic using <code className="text-zinc-400 font-mono text-sm">// single line</code> or <code className="text-zinc-400 font-mono text-sm">/* multi-line */</code>. 
                                  Comments are completely ignored during the calculation process.
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                              <Sparkles size={20} className="text-purple-500" />
                              <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">Pro Tips</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                              <div className="p-6 bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-[2.5rem] space-y-3">
                                <p className="text-[11px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">Dynamic Types</p>
                                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">Calculations automatically handle numbers, text, and dates based on context.</p>
                              </div>
                              <div className="p-6 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-[2.5rem] space-y-3">
                                <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Zero Safety</p>
                                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">Always wrap divisions in an IF check to prevent 'Division by Zero' runtime errors.</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Function Grid */}
                        <div className="space-y-10">
                          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-6">
                            <div className="flex items-center gap-4">
                               <FunctionSquare size={24} className="text-indigo-500" />
                               <h4 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-tight">Function Reference</h4>
                            </div>
                            <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Click + to insert into editor</span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {FUNCTIONS
                              .filter(f => !docsSearch || f.name.toLowerCase().includes(docsSearch.toLowerCase()))
                              .map(f => (
                               <div key={f.name} className="p-8 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[3rem] space-y-6 group hover:border-indigo-500/50 transition-all hover:shadow-2xl hover:shadow-indigo-500/10">
                                  <div className="flex items-center justify-between">
                                     <span className="text-lg font-black text-indigo-500 font-mono tracking-tight">{f.name}</span>
                                     <button 
                                        type="button"
                                        onClick={() => {
                                          insertText(f.template);
                                          setShowDocs(false);
                                        }}
                                        className="w-10 h-10 bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:text-white hover:bg-indigo-600 rounded-xl flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-xl"
                                     >
                                        <Plus size={20} />
                                     </button>
                                  </div>
                                  <p className="text-xs font-bold text-zinc-900 dark:text-white leading-relaxed">{f.longDescription || f.description}</p>
                                  
                                  {f.params && (
                                     <div className="space-y-3">
                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Parameters</p>
                                        <div className="space-y-2">
                                          {f.params.map(p => (
                                             <div key={p.name} className="flex gap-3 bg-zinc-50/50 dark:bg-zinc-900/50 p-3 rounded-xl border border-zinc-100/50 dark:border-zinc-800/50">
                                                <span className="text-xs font-mono font-bold text-emerald-500 shrink-0">{p.name}</span>
                                                <span className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-tight font-medium">{p.desc}</span>
                                             </div>
                                          ))}
                                        </div>
                                     </div>
                                  )}
                                  
                                  {f.examples && (
                                     <div className="space-y-3">
                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Examples</p>
                                        <div className="space-y-2">
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
                                                  "w-full p-3 rounded-xl text-xs font-mono break-all text-left transition-all flex items-center justify-between group/ex",
                                                  copiedLabel === ex 
                                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                                                    : "bg-zinc-50 dark:bg-zinc-900 text-indigo-500/80 hover:bg-indigo-500/5 hover:text-indigo-500"
                                                )}
                                                title="Click to copy example"
                                             >
                                                <span className="flex-1">{ex}</span>
                                                {copiedLabel === ex ? (
                                                  <Check size={14} className="text-emerald-500 shrink-0 ml-2" />
                                                ) : (
                                                  <Copy size={14} className="opacity-0 group-hover/ex:opacity-100 shrink-0 ml-2" />
                                                )}
                                             </button>
                                          ))}
                                        </div>
                                     </div>
                                  )}
                               </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {rightActiveTab === 'history' && (
                   <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-4">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <Clock size={12} className="text-indigo-500" />
                            <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Version History</span>
                         </div>
                         <div className="flex items-center gap-3">
                           <span className="text-[9px] font-black text-zinc-400">{history.length} Snapshots</span>
                           <HelpTooltip text="Every change you make is saved as a snapshot. You can jump back to any previous version at any time." />
                         </div>
                      </div>
                      
                      <div className="relative space-y-4">
                         {/* Timeline Line */}
                         <div className="absolute left-[19px] top-4 bottom-4 w-px bg-zinc-100 dark:bg-zinc-800" />

                         {history.map((snapshot, i) => (
                            <button
                               key={i}
                               type="button"
                               onClick={() => {
                                  setIsUndoing(true);
                                  setLogic(snapshot.logic);
                                  setHistoryIndex(i);
                                  setTimeout(() => setIsUndoing(false), 50);
                               }}
                               className={cn(
                                  "w-full flex items-start gap-4 p-4 rounded-2xl transition-all group text-left relative",
                                  i === historyIndex 
                                     ? "bg-indigo-500/5 ring-1 ring-inset ring-indigo-500/20" 
                                     : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
                               )}
                            >
                               {/* Timeline Node */}
                               <div className={cn(
                                 "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 z-10 transition-colors",
                                 i === historyIndex ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "bg-white dark:bg-zinc-800 text-zinc-400 border border-zinc-100 dark:border-zinc-700 shadow-sm"
                               )}>
                                 {i === 0 ? <Plus size={16} /> : <Clock size={16} />}
                               </div>

                               <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                     <span className={cn(
                                       "text-[10px] font-black uppercase tracking-tight",
                                       i === historyIndex ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-900 dark:text-white"
                                     )}>
                                       {snapshot.userName}
                                     </span>
                                     <span className="text-[8px] font-bold text-zinc-400">{snapshot.timestamp}</span>
                                  </div>
                                  <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 line-clamp-1 break-all bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-lg mt-2 border border-zinc-100/50 dark:border-zinc-800/50">
                                    {snapshot.logic || '(Empty)'}
                                  </p>
                                  {i === historyIndex && (
                                     <div className="mt-2 flex items-center gap-2">
                                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                       <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Active State</span>
                                     </div>
                                  )}
                               </div>
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
            <div className="px-6 py-2.5 border-t border-zinc-100 dark:border-zinc-900/50 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-end gap-3">
                <button 
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  disabled={validation.errors.length > 0}
                  onClick={() => onSave(logic, triggers)}
                  className={cn(
                    "px-10 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3",
                    validation.errors.length > 0 
                      ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed" 
                      : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-2xl shadow-indigo-500/30"
                  )}
                >
                  <Check size={18} />
                  <span>Apply Calculation</span>
                </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
