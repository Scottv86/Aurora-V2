import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calculator as CalcIcon, 
  History, 
  Sparkles, 
  Save, 
  Copy, 
  Check, 
  Trash2, 
  Plus, 
  FileText, 
  Database, 
  Search, 
  TrendingUp, 
  DollarSign, 
  Download, 
  ChevronDown, 
  Pin,
  Briefcase,
  PanelRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { usePlatform } from '../../hooks/usePlatform';
import { toast } from 'sonner';
import { 
  CalculationClientService 
} from '../../services/calculationService';
import { 
  UniversalCalculationItem, 
  CalculationTapeEntry, 
  CalculationMode 
} from '../../types/calculations';
import { 
  evaluateExpression, 
  evaluateScratchpad
} from '../../lib/calcEvaluator';
import { fetchRecords } from '../../services/dataService';
import { NotesClientService } from '../../services/notesService';

const INITIAL_SHEET: UniversalCalculationItem = {
  id: 'local_sheet',
  tenantId: '',
  authorId: 'user',
  title: 'Primary Calculation',
  mode: 'standard',
  expression: '',
  result: '0',
  tape: [],
  variables: {},
  isPinned: false,
  isArchived: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const CalculatorApp: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { tenant, modules, setIsCalculatorDocked } = usePlatform();
  const token = session?.access_token;
  const tenantId = tenant?.id;

  // Calculation Sheets & Current Active Sheet
  const [sheets, setSheets] = useState<UniversalCalculationItem[]>([INITIAL_SHEET]);
  const [activeSheet, setActiveSheet] = useState<UniversalCalculationItem | null>(INITIAL_SHEET);
  const [isSheetMenuOpen, setIsSheetMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Active Mode
  const [mode, setMode] = useState<CalculationMode>('standard');
  const [scientificExpanded, setScientificExpanded] = useState(false);

  // Calculator Core State
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');
  const [memory, setMemory] = useState<number>(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Tape & Audit Trail
  const [tape, setTape] = useState<CalculationTapeEntry[]>([]);
  const [tapeSearch, setTapeSearch] = useState('');

  // Financial Presets State
  // 1. Margin & Markup
  const [finCost, setFinCost] = useState('100');
  const [finRevenue, setFinRevenue] = useState('150');
  // 2. Tax / GST
  const [taxAmount, setTaxAmount] = useState('1000');
  const [taxRate, setTaxRate] = useState('10');
  const [taxMode, setTaxMode] = useState<'net_to_gross' | 'gross_to_net'>('net_to_gross');
  // 3. Loan
  const [loanPrincipal, setLoanPrincipal] = useState('250000');
  const [loanRate, setLoanRate] = useState('5.5');
  const [loanYears, setLoanYears] = useState('30');
  // 4. Delta / % Change
  const [deltaOld, setDeltaOld] = useState('80');
  const [deltaNew, setDeltaNew] = useState('120');

  // Record & Module Cruncher State
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [cruncherSubTab, setCruncherSubTab] = useState<'records' | 'aggregates'>('records');
  const [recordsList, setRecordsList] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [recordSearch, setRecordSearch] = useState('');
  const [recordsLoading, setRecordsLoading] = useState(false);

  // Aggregation State
  const [aggField, setAggField] = useState('');
  const [aggType, setAggType] = useState<'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT' | 'MEDIAN'>('SUM');
  const [aggResult, setAggResult] = useState<any | null>(null);
  const [aggLoading, setAggLoading] = useState(false);

  // Smart Scratchpad State
  const [scratchpadText, setScratchpadText] = useState(
    `# Aurora Business Scratchpad\n# Define variables or calculate line-by-line\n\nRevenue = 45000\nCost_Of_Goods = 18500\nGross_Profit = Revenue - Cost_Of_Goods\n\nTax_Rate = 15%\nEstimated_Tax = Gross_Profit * Tax_Rate\nNet_Retained = Gross_Profit - Estimated_Tax`
  );

  // Load calculations on mount
  const loadCalculations = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const rawList = await CalculationClientService.getCalculations({}, token, tenantId);
      const list = Array.isArray(rawList) ? rawList : (rawList as any)?.calculations || [];
      if (list && list.length > 0) {
        setSheets(list);
        const first = list[0];
        setActiveSheet(first);
        setTape(first.tape || []);
        setExpression(first.expression || '');
        setResult(first.result || '0');
        setMode(first.mode || 'standard');
      }
    } catch (err) {
      console.warn('Using local calculations state:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, token]);

  useEffect(() => {
    loadCalculations();
  }, [loadCalculations]);

  // Set default selected module when modules are ready
  useEffect(() => {
    if (modules && modules.length > 0 && !selectedModuleId) {
      setSelectedModuleId(modules[0].id);
    }
  }, [modules, selectedModuleId]);

  // Load records for selected module in Record Cruncher
  useEffect(() => {
    const loadModuleRecords = async () => {
      if (!selectedModuleId || !tenantId) return;
      try {
        setRecordsLoading(true);
        const res = await fetchRecords(selectedModuleId, tenantId, token || '', 1, 50);
        const items = res?.records || (Array.isArray(res) ? res : []);
        setRecordsList(items);
        if (items.length > 0) {
          setSelectedRecord(items[0]);
        } else {
          setSelectedRecord(null);
        }
      } catch (err) {
        console.warn('Failed to load module records for calculator:', err);
        setRecordsList([]);
      } finally {
        setRecordsLoading(false);
      }
    };

    if (mode === 'records') {
      loadModuleRecords();
    }
  }, [selectedModuleId, tenantId, token, mode]);

  // Create new calculation sheet
  const handleCreateNewSheet = async (title?: string) => {
    if (!tenantId) return;
    try {
      const created = await CalculationClientService.createCalculation(
        {
          title: title || `Calculation #${sheets.length + 1}`,
          mode: 'standard',
          expression: '',
          result: '0',
          tape: [],
        },
        token,
        tenantId
      );
      setSheets(prev => [created, ...prev]);
      setActiveSheet(created);
      setTape([]);
      setExpression('');
      setResult('0');
      toast.success('New calculation sheet created');
    } catch (err: any) {
      console.error('Failed to create calculation sheet:', err);
      toast.error('Failed to create calculation sheet');
    }
  };

  // Switch active sheet
  const handleSelectSheet = (sheet: UniversalCalculationItem) => {
    setActiveSheet(sheet);
    setTape(sheet.tape || []);
    setExpression(sheet.expression || '');
    setResult(sheet.result || '0');
    setMode(sheet.mode || 'standard');
    setIsSheetMenuOpen(false);
  };

  // Delete current sheet
  const handleDeleteSheet = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!tenantId) return;
    try {
      await CalculationClientService.deleteCalculation(id, token, tenantId);
      const remaining = sheets.filter(s => s.id !== id);
      setSheets(remaining);
      if (activeSheet?.id === id) {
        if (remaining.length > 0) {
          handleSelectSheet(remaining[0]);
        } else {
          handleCreateNewSheet('New Calculation');
        }
      }
      toast.success('Calculation sheet deleted');
    } catch (err) {
      toast.error('Failed to delete calculation sheet');
    }
  };

  // Toggle Pin on sheet
  const handleTogglePin = async () => {
    if (!activeSheet || !tenantId) return;
    try {
      const nextPinned = !activeSheet.isPinned;
      const updated = await CalculationClientService.updateCalculation(
        activeSheet.id,
        { isPinned: nextPinned },
        token,
        tenantId
      );
      setActiveSheet(updated);
      setSheets(prev => prev.map(s => s.id === updated.id ? updated : s));
      toast.success(nextPinned ? 'Calculation pinned' : 'Calculation unpinned');
    } catch (err) {
      toast.error('Failed to pin calculation');
    }
  };

  // Save current sheet
  const handleSaveSheet = async () => {
    if (!activeSheet || !tenantId) return;
    try {
      const updated = await CalculationClientService.updateCalculation(
        activeSheet.id,
        {
          mode,
          expression,
          result,
          tape,
        },
        token,
        tenantId
      );
      setActiveSheet(updated);
      setSheets(prev => prev.map(s => s.id === updated.id ? updated : s));
      toast.success('Calculation saved');
    } catch (err) {
      toast.error('Failed to save calculation');
    }
  };

  // Execute standard evaluation and append to tape
  const handleEvaluate = useCallback(async () => {
    if (!expression.trim()) return;
    const evaluated = evaluateExpression(expression);
    if (evaluated.error) {
      toast.error(`Evaluation Error: ${evaluated.error}`);
      return;
    }

    setResult(evaluated.formatted);

    const newTapeEntry: CalculationTapeEntry = {
      id: `tape_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      expression,
      result: evaluated.formatted,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      mode,
    };

    const updatedTape = [newTapeEntry, ...tape].slice(0, 500);
    setTape(updatedTape);

    // Auto-persist tape entry if sheet exists
    if (activeSheet && tenantId) {
      CalculationClientService.appendTapeEntry(
        activeSheet.id,
        {
          expression,
          result: evaluated.formatted,
          mode,
        },
        token,
        tenantId
      ).catch(console.warn);
    }
  }, [expression, tape, mode, activeSheet, tenantId, token]);

  // Keypad actions
  const handleInput = (val: string) => {
    setExpression(prev => prev + val);
  };

  const handleClear = () => {
    setExpression('');
    setResult('0');
  };

  const handleBackspace = () => {
    setExpression(prev => prev.slice(0, -1));
  };

  // Memory buttons
  const handleMemoryAdd = () => {
    const num = parseFloat(result.replace(/,/g, ''));
    if (!isNaN(num)) {
      setMemory(prev => prev + num);
      toast.success(`M+ added ${num} (Memory: ${memory + num})`);
    }
  };

  const handleMemorySub = () => {
    const num = parseFloat(result.replace(/,/g, ''));
    if (!isNaN(num)) {
      setMemory(prev => prev - num);
      toast.success(`M- subtracted ${num} (Memory: ${memory - num})`);
    }
  };

  const handleMemoryRecall = () => {
    setExpression(prev => prev + memory.toString());
  };

  const handleMemoryClear = () => {
    setMemory(0);
    toast.success('Memory cleared');
  };

  // Copy result
  const handleCopy = (text: string, id?: string) => {
    navigator.clipboard.writeText(text);
    if (id) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    }
    toast.success('Copied to clipboard');
  };

  // Clear Tape
  const handleClearTape = async () => {
    setTape([]);
    if (activeSheet && tenantId) {
      try {
        await CalculationClientService.clearTape(activeSheet.id, token, tenantId);
        toast.success('History tape cleared');
      } catch (err) {
        console.warn(err);
      }
    }
  };

  // Export Tape as CSV
  const handleExportCSV = () => {
    if (tape.length === 0) {
      toast.error('Tape is empty');
      return;
    }
    const headers = 'Timestamp,Expression,Result\n';
    const rows = tape.map(t => `"${t.timestamp}","${t.expression.replace(/"/g, '""')}","${t.result}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aurora_calc_tape_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Tape exported to CSV');
  };

  // Push Tape to Universal Notes
  const handlePushToNotes = async () => {
    if (tape.length === 0 || !tenantId) {
      toast.error('No calculations on tape to convert to note');
      return;
    }

    try {
      const tapeContent = tape
        .map(t => `• ${t.timestamp}: ${t.expression} = **${t.result}**`)
        .join('\n');

      const noteTitle = `Calc Audit: ${activeSheet?.title || 'Calculation'} (${new Date().toLocaleDateString()})`;
      const noteBody = `### Calculation Audit Trail\n\nSheet: ${activeSheet?.title || 'General'}\nMode: ${mode}\n\n${tapeContent}`;

      await NotesClientService.createNote(
        {
          title: noteTitle,
          body: noteBody,
          snippet: `Audit of ${tape.length} calculations from Aurora Calculator`,
          color: 'blue',
          tags: ['calculator', 'audit', mode],
          moduleId: activeSheet?.moduleId,
          recordId: activeSheet?.recordId,
        },
        token,
        tenantId
      );

      toast.success('Saved as Aurora Note! Available in Notes App');
    } catch (err) {
      console.error('Failed to push to notes:', err);
      toast.error('Failed to create Note');
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        handleInput(e.key);
      } else if (['+', '-', '*', '/'].includes(e.key)) {
        handleInput(` ${e.key} `);
      } else if (e.key === '.') {
        handleInput('.');
      } else if (e.key === '(' || e.key === ')') {
        handleInput(e.key);
      } else if (e.key === '%') {
        handleInput('%');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEvaluate();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleEvaluate]);

  // Compute live Financial Preset values
  const financialMarginResult = useMemo(() => {
    const c = parseFloat(finCost) || 0;
    const r = parseFloat(finRevenue) || 0;
    const profit = r - c;
    const margin = r > 0 ? (profit / r) * 100 : 0;
    const markup = c > 0 ? (profit / c) * 100 : 0;
    return {
      cost: c,
      revenue: r,
      profit: Math.round(profit * 100) / 100,
      marginPercent: Math.round(margin * 10) / 10,
      markupPercent: Math.round(markup * 10) / 10,
    };
  }, [finCost, finRevenue]);

  const financialTaxResult = useMemo(() => {
    const amt = parseFloat(taxAmount) || 0;
    const rate = parseFloat(taxRate) || 0;
    if (taxMode === 'net_to_gross') {
      const tax = (amt * rate) / 100;
      return {
        net: amt,
        tax: Math.round(tax * 100) / 100,
        gross: Math.round((amt + tax) * 100) / 100,
      };
    } else {
      const net = amt / (1 + rate / 100);
      const tax = amt - net;
      return {
        net: Math.round(net * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        gross: amt,
      };
    }
  }, [taxAmount, taxRate, taxMode]);

  const financialLoanResult = useMemo(() => {
    const p = parseFloat(loanPrincipal) || 0;
    const r = (parseFloat(loanRate) || 0) / 100 / 12;
    const n = (parseFloat(loanYears) || 0) * 12;

    if (p <= 0 || r <= 0 || n <= 0) {
      return { monthlyPayment: 0, totalPayment: 0, totalInterest: 0 };
    }

    const monthly = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const total = monthly * n;
    const interest = total - p;

    return {
      monthlyPayment: Math.round(monthly * 100) / 100,
      totalPayment: Math.round(total * 100) / 100,
      totalInterest: Math.round(interest * 100) / 100,
    };
  }, [loanPrincipal, loanRate, loanYears]);

  const financialDeltaResult = useMemo(() => {
    const o = parseFloat(deltaOld) || 0;
    const n = parseFloat(deltaNew) || 0;
    const diff = n - o;
    const pct = o !== 0 ? (diff / Math.abs(o)) * 100 : 0;
    return {
      difference: Math.round(diff * 100) / 100,
      percentDelta: Math.round(pct * 10) / 10,
    };
  }, [deltaOld, deltaNew]);

  // Execute Aggregate Query in Record Cruncher
  const handleExecuteAggregate = async () => {
    if (!selectedModuleId || !aggField || !tenantId) {
      toast.error('Please choose a module and field');
      return;
    }
    try {
      setAggLoading(true);
      const res = await CalculationClientService.computeAggregate(
        {
          moduleId: selectedModuleId,
          fieldName: aggField,
          aggregateType: aggType,
        },
        token,
        tenantId
      );
      setAggResult(res);
      toast.success(`Calculated ${aggType}(${aggField}): ${res.value}`);
    } catch (err: any) {
      console.error('Aggregate computation error:', err);
      toast.error('Failed to calculate aggregate');
    } finally {
      setAggLoading(false);
    }
  };

  // Evaluate Smart Scratchpad lines
  const scratchpadEvaluation = useMemo(() => {
    return evaluateScratchpad(scratchpadText);
  }, [scratchpadText]);

  // Extract numeric fields of selected module for easy variable binding
  const selectedModule = useMemo(() => {
    return modules?.find(m => m.id === selectedModuleId);
  }, [modules, selectedModuleId]);

  const numericFieldsInSelectedModule = useMemo(() => {
    if (!selectedModule) return [];
    const fields = (selectedModule as any).fields || [];
    return fields.filter((f: any) => 
      ['number', 'currency', 'percentage', 'decimal', 'integer', 'calc'].includes(f.type?.toLowerCase()) ||
      ['price', 'cost', 'amount', 'total', 'subtotal', 'hours', 'rate', 'quantity'].some(keyword => f.name?.toLowerCase().includes(keyword))
    );
  }, [selectedModule]);



  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">
      
      {/* 1. Header Toolbar */}
      <header className="h-16 px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0 shadow-xs z-20">
        
        {/* Left: App Identity & Sheet Manager */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-600/10 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300 flex items-center justify-center border border-slate-500/20 shadow-xs">
            <CalcIcon size={20} />
          </div>

          <div className="relative">
            <button
              onClick={() => setIsSheetMenuOpen(!isSheetMenuOpen)}
              className="flex items-center gap-2 group text-left px-2 py-1 -mx-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-zinc-900 dark:text-white leading-none">
                    {activeSheet?.title || 'Universal Calculator'}
                  </h1>
                  {activeSheet?.isPinned && (
                    <Pin size={13} className="text-amber-500 fill-amber-500" />
                  )}
                  {loading && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" title="Syncing calculations..." />
                  )}
                  <ChevronDown size={14} className="text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-transform" />
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                  Workspace Suite • Aurora Formula Engine
                </p>
              </div>
            </button>

            {/* Sheets Switcher Dropdown */}
            <AnimatePresence>
              {isSheetMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-2 z-50"
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Calculations</span>
                    <button
                      onClick={() => handleCreateNewSheet()}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Plus size={12} /> New Sheet
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1 space-y-1">
                    {sheets.map(sheet => (
                      <div
                        key={sheet.id}
                        onClick={() => handleSelectSheet(sheet)}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer group transition-colors",
                          sheet.id === activeSheet?.id 
                            ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold"
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        )}
                      >
                        <div className="truncate flex items-center gap-2">
                          {sheet.isPinned && <Pin size={11} className="text-amber-500 fill-amber-500 shrink-0" />}
                          <span className="truncate">{sheet.title}</span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteSheet(sheet.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-600 rounded transition-opacity"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Center: Mode Tabs */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700/60 shadow-inner">
          {[
            { id: 'standard', label: 'Standard & Sci', icon: CalcIcon },
            { id: 'financial', label: 'Financial Presets', icon: DollarSign },
            { id: 'records', label: 'Record & Module Cruncher', icon: Database },
            { id: 'scratchpad', label: 'Smart Scratchpad', icon: FileText },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = mode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id as CalculationMode)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer",
                  isActive 
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs border border-zinc-200/50 dark:border-zinc-700/50" 
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                <Icon size={14} className={isActive ? "text-indigo-600 dark:text-indigo-400" : ""} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsCalculatorDocked(true);
              navigate(-1);
            }}
            title="Dock to side pane and return to previous workspace page"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer"
          >
            <PanelRight size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Dock to Side</span>
          </button>

          <button
            onClick={handleTogglePin}
            title={activeSheet?.isPinned ? "Unpin Calculation" : "Pin Calculation"}
            className={cn(
              "p-2 rounded-lg border transition-all cursor-pointer",
              activeSheet?.isPinned 
                ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-600" 
                : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )}
          >
            <Pin size={16} className={activeSheet?.isPinned ? "fill-amber-500" : ""} />
          </button>

          <button
            onClick={handleSaveSheet}
            title="Save Calculation"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all cursor-pointer"
          >
            <Save size={14} />
            <span>Save</span>
          </button>
        </div>
      </header>

      {/* 2. Main Work Area (Split between Calculator Workspace & Audit Tape) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Primary Interaction Surface */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center items-center">
          
          {/* TAB 1: STANDARD & SCIENTIFIC CALCULATOR */}
          {mode === 'standard' && (
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xl flex flex-col gap-5">
              
              {/* Display Area */}
              <div className="bg-zinc-50 dark:bg-zinc-950 rounded-2xl p-5 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col items-end justify-between min-h-[110px] shadow-inner relative group">
                <div className="w-full flex items-center justify-between text-xs text-zinc-400 font-mono">
                  <div className="flex items-center gap-2">
                    {memory !== 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                        M = {memory}
                      </span>
                    )}
                  </div>
                  <span className="truncate max-w-[280px]">{expression || '0'}</span>
                </div>

                <div className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight font-mono select-all">
                  {result}
                </div>

                {/* Quick Copy Result button on hover */}
                <button
                  onClick={() => handleCopy(result)}
                  className="absolute top-2 left-2 p-1.5 rounded-md bg-white/80 dark:bg-zinc-800/80 text-zinc-400 hover:text-zinc-900 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity border border-zinc-200 dark:border-zinc-700"
                  title="Copy result"
                >
                  <Copy size={12} />
                </button>
              </div>

              {/* Memory Row */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'MC', action: handleMemoryClear, title: 'Memory Clear' },
                  { label: 'MR', action: handleMemoryRecall, title: 'Memory Recall' },
                  { label: 'M+', action: handleMemoryAdd, title: 'Memory Add' },
                  { label: 'M-', action: handleMemorySub, title: 'Memory Subtract' },
                ].map(mem => (
                  <button
                    key={mem.label}
                    onClick={mem.action}
                    title={mem.title}
                    className="py-1.5 rounded-lg text-[11px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    {mem.label}
                  </button>
                ))}
              </div>

              {/* Scientific Toggle Row */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setScientificExpanded(!scientificExpanded)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles size={12} />
                  <span>{scientificExpanded ? 'Hide Scientific Pad' : 'Show Scientific Functions'}</span>
                </button>
              </div>

              {/* Scientific Expanded Keypad */}
              <AnimatePresence>
                {scientificExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden grid grid-cols-4 gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800"
                  >
                    {[
                      { label: 'sin', val: 'sin(' },
                      { label: 'cos', val: 'cos(' },
                      { label: 'tan', val: 'tan(' },
                      { label: 'π', val: 'π' },
                      { label: 'ln', val: 'ln(' },
                      { label: 'log', val: 'log(' },
                      { label: '√x', val: 'sqrt(' },
                      { label: 'x^y', val: '^' },
                      { label: '(', val: '(' },
                      { label: ')', val: ')' },
                      { label: 'e', val: 'e' },
                      { label: 'abs', val: 'abs(' },
                    ].map(fn => (
                      <button
                        key={fn.label}
                        onClick={() => handleInput(fn.val)}
                        className="py-2 rounded-xl text-xs font-semibold bg-zinc-100/70 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
                      >
                        {fn.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Primary Keypad Grid */}
              <div className="grid grid-cols-4 gap-2.5">
                {/* Row 1 */}
                <button
                  onClick={handleClear}
                  className="py-3.5 rounded-2xl text-sm font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 transition-colors"
                >
                  AC
                </button>
                <button
                  onClick={handleBackspace}
                  className="py-3.5 rounded-2xl text-sm font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
                >
                  ⌫
                </button>
                <button
                  onClick={() => handleInput('%')}
                  className="py-3.5 rounded-2xl text-sm font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
                >
                  %
                </button>
                <button
                  onClick={() => handleInput(' ÷ ')}
                  className="py-3.5 rounded-2xl text-sm font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 transition-colors"
                >
                  ÷
                </button>

                {/* Row 2 */}
                <button
                  onClick={() => handleInput('7')}
                  className="py-3.5 rounded-2xl text-base font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 text-zinc-900 dark:text-white transition-colors"
                >
                  7
                </button>
                <button
                  onClick={() => handleInput('8')}
                  className="py-3.5 rounded-2xl text-base font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 text-zinc-900 dark:text-white transition-colors"
                >
                  8
                </button>
                <button
                  onClick={() => handleInput('9')}
                  className="py-3.5 rounded-2xl text-base font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 text-zinc-900 dark:text-white transition-colors"
                >
                  9
                </button>
                <button
                  onClick={() => handleInput(' × ')}
                  className="py-3.5 rounded-2xl text-sm font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 transition-colors"
                >
                  ×
                </button>

                {/* Row 3 */}
                <button
                  onClick={() => handleInput('4')}
                  className="py-3.5 rounded-2xl text-base font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 text-zinc-900 dark:text-white transition-colors"
                >
                  4
                </button>
                <button
                  onClick={() => handleInput('5')}
                  className="py-3.5 rounded-2xl text-base font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 text-zinc-900 dark:text-white transition-colors"
                >
                  5
                </button>
                <button
                  onClick={() => handleInput('6')}
                  className="py-3.5 rounded-2xl text-base font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 text-zinc-900 dark:text-white transition-colors"
                >
                  6
                </button>
                <button
                  onClick={() => handleInput(' - ')}
                  className="py-3.5 rounded-2xl text-sm font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 transition-colors"
                >
                  -
                </button>

                {/* Row 4 */}
                <button
                  onClick={() => handleInput('1')}
                  className="py-3.5 rounded-2xl text-base font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 text-zinc-900 dark:text-white transition-colors"
                >
                  1
                </button>
                <button
                  onClick={() => handleInput('2')}
                  className="py-3.5 rounded-2xl text-base font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 text-zinc-900 dark:text-white transition-colors"
                >
                  2
                </button>
                <button
                  onClick={() => handleInput('3')}
                  className="py-3.5 rounded-2xl text-base font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 text-zinc-900 dark:text-white transition-colors"
                >
                  3
                </button>
                <button
                  onClick={() => handleInput(' + ')}
                  className="py-3.5 rounded-2xl text-sm font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 transition-colors"
                >
                  +
                </button>

                {/* Row 5 */}
                <button
                  onClick={() => handleInput('0')}
                  className="col-span-2 py-3.5 rounded-2xl text-base font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 text-zinc-900 dark:text-white transition-colors"
                >
                  0
                </button>
                <button
                  onClick={() => handleInput('.')}
                  className="py-3.5 rounded-2xl text-base font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 text-zinc-900 dark:text-white transition-colors"
                >
                  .
                </button>
                <button
                  onClick={handleEvaluate}
                  className="py-3.5 rounded-2xl text-base font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all active:scale-95"
                >
                  =
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: FINANCIAL PRESETS */}
          {mode === 'financial' && (
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Card 1: Gross Margin & Markup */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                        <TrendingUp size={16} />
                      </div>
                      <h3 className="text-sm font-bold">Margin & Markup</h3>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Profitability</span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="text-xs text-zinc-500 font-medium block mb-1">Cost of Goods ($)</label>
                      <input
                        type="number"
                        value={finCost}
                        onChange={(e) => setFinCost(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 font-medium block mb-1">Selling Revenue ($)</label>
                      <input
                        type="number"
                        value={finRevenue}
                        onChange={(e) => setFinRevenue(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800/80 mb-4 text-center">
                    <div>
                      <span className="text-[10px] text-zinc-400 font-medium block">Gross Profit</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        ${financialMarginResult.profit.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 font-medium block">Margin</span>
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                        {financialMarginResult.marginPercent}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 font-medium block">Markup</span>
                      <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 font-mono">
                        {financialMarginResult.markupPercent}%
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setExpression(`Rev ${finRevenue} - Cost ${finCost}`);
                    setResult(`$${financialMarginResult.profit}`);
                    handleEvaluate();
                  }}
                  className="w-full py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} /> Add Calculation to Tape
                </button>
              </div>

              {/* Card 2: Sales Tax / GST / VAT */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                        <DollarSign size={16} />
                      </div>
                      <h3 className="text-sm font-bold">Tax & GST/VAT Split</h3>
                    </div>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-[10px] font-bold">
                      <button
                        onClick={() => setTaxMode('net_to_gross')}
                        className={cn("px-2 py-0.5 rounded", taxMode === 'net_to_gross' ? "bg-white dark:bg-zinc-900 shadow-xs text-indigo-600" : "text-zinc-500")}
                      >
                        + Tax
                      </button>
                      <button
                        onClick={() => setTaxMode('gross_to_net')}
                        className={cn("px-2 py-0.5 rounded", taxMode === 'gross_to_net' ? "bg-white dark:bg-zinc-900 shadow-xs text-indigo-600" : "text-zinc-500")}
                      >
                        Extract Tax
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="text-xs text-zinc-500 font-medium block mb-1">
                        {taxMode === 'net_to_gross' ? 'Net Amount ($)' : 'Gross Inclusive Amount ($)'}
                      </label>
                      <input
                        type="number"
                        value={taxAmount}
                        onChange={(e) => setTaxAmount(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 font-medium block mb-1">Tax Rate (%)</label>
                      <input
                        type="number"
                        value={taxRate}
                        onChange={(e) => setTaxRate(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800/80 mb-4 text-center">
                    <div>
                      <span className="text-[10px] text-zinc-400 font-medium block">Net</span>
                      <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 font-mono">
                        ${financialTaxResult.net.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 font-medium block">Tax (${taxRate}%)</span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">
                        ${financialTaxResult.tax.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 font-medium block">Gross</span>
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                        ${financialTaxResult.gross.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setExpression(`Base $${taxAmount} @ ${taxRate}% Tax`);
                    setResult(`$${financialTaxResult.gross}`);
                    handleEvaluate();
                  }}
                  className="w-full py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} /> Add Calculation to Tape
                </button>
              </div>

              {/* Card 3: Loan & Amortization */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                        <Briefcase size={16} />
                      </div>
                      <h3 className="text-sm font-bold">Loan & Financing</h3>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Amortization</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div>
                      <label className="text-[11px] text-zinc-500 font-medium block mb-1">Principal ($)</label>
                      <input
                        type="number"
                        value={loanPrincipal}
                        onChange={(e) => setLoanPrincipal(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-500 font-medium block mb-1">Annual %</label>
                      <input
                        type="number"
                        step="0.1"
                        value={loanRate}
                        onChange={(e) => setLoanRate(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-500 font-medium block mb-1">Term (Yrs)</label>
                      <input
                        type="number"
                        value={loanYears}
                        onChange={(e) => setLoanYears(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-2 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800/80 mb-4 text-center">
                    <div>
                      <span className="text-[10px] text-zinc-400 font-medium block">Monthly Pmt</span>
                      <span className="text-sm font-bold text-purple-600 dark:text-purple-400 font-mono">
                        ${financialLoanResult.monthlyPayment.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 font-medium block">Total Interest</span>
                      <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 font-mono">
                        ${financialLoanResult.totalInterest.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 font-medium block">Total Cost</span>
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                        ${financialLoanResult.totalPayment.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setExpression(`Loan $${loanPrincipal} @ ${loanRate}% for ${loanYears}y`);
                    setResult(`$${financialLoanResult.monthlyPayment}/mo`);
                    handleEvaluate();
                  }}
                  className="w-full py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} /> Add Calculation to Tape
                </button>
              </div>

              {/* Card 4: % Delta / Variance */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                        <TrendingUp size={16} />
                      </div>
                      <h3 className="text-sm font-bold">Percentage Delta</h3>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Variance</span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="text-xs text-zinc-500 font-medium block mb-1">Baseline / Previous Value</label>
                      <input
                        type="number"
                        value={deltaOld}
                        onChange={(e) => setDeltaOld(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 font-medium block mb-1">New / Current Value</label>
                      <input
                        type="number"
                        value={deltaNew}
                        onChange={(e) => setDeltaNew(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800/80 mb-4 text-center">
                    <div>
                      <span className="text-[10px] text-zinc-400 font-medium block">Absolute Difference</span>
                      <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 font-mono">
                        {financialDeltaResult.difference > 0 ? `+${financialDeltaResult.difference}` : financialDeltaResult.difference}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 font-medium block">Percentage Change</span>
                      <span className={cn(
                        "text-sm font-bold font-mono",
                        financialDeltaResult.percentDelta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      )}>
                        {financialDeltaResult.percentDelta > 0 ? `+${financialDeltaResult.percentDelta}%` : `${financialDeltaResult.percentDelta}%`}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setExpression(`Change from ${deltaOld} to ${deltaNew}`);
                    setResult(`${financialDeltaResult.percentDelta}%`);
                    handleEvaluate();
                  }}
                  className="w-full py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} /> Add Calculation to Tape
                </button>
              </div>

            </div>
          )}

          {/* TAB 3: RECORD & MODULE DATA CRUNCHER */}
          {mode === 'records' && (
            <div className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xl flex flex-col gap-6">
              
              {/* Module Selector & Subtab */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <Database size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">Module Data Cruncher</h2>
                    <p className="text-xs text-zinc-500">Perform calculations directly on live Aurora business records</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={selectedModuleId}
                    onChange={(e) => setSelectedModuleId(e.target.value)}
                    className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white"
                  >
                    {modules?.map(m => (
                      <option key={m.id} value={m.id}>
                        {(m as any).label || m.name}
                      </option>
                    ))}
                  </select>

                  <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl text-xs font-semibold">
                    <button
                      onClick={() => setCruncherSubTab('records')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg transition-colors cursor-pointer",
                        cruncherSubTab === 'records' ? "bg-white dark:bg-zinc-900 shadow-xs text-indigo-600 font-bold" : "text-zinc-500"
                      )}
                    >
                      Single Record Inspector
                    </button>
                    <button
                      onClick={() => setCruncherSubTab('aggregates')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg transition-colors cursor-pointer",
                        cruncherSubTab === 'aggregates' ? "bg-white dark:bg-zinc-900 shadow-xs text-indigo-600 font-bold" : "text-zinc-500"
                      )}
                    >
                      Module Aggregations
                    </button>
                  </div>
                </div>
              </div>

              {/* Subtab 1: Single Record Inspector */}
              {cruncherSubTab === 'records' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Column: Record List */}
                  <div className="md:col-span-1 border-r border-zinc-200 dark:border-zinc-800 pr-4 flex flex-col gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
                      <input
                        type="text"
                        placeholder="Filter records..."
                        value={recordSearch}
                        onChange={(e) => setRecordSearch(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium"
                      />
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                      {recordsLoading ? (
                        <div className="p-4 text-center text-xs text-zinc-400">Loading records...</div>
                      ) : recordsList.length === 0 ? (
                        <div className="p-4 text-center text-xs text-zinc-400">No records found</div>
                      ) : (
                        recordsList
                          .filter(r => {
                            if (!recordSearch.trim()) return true;
                            const text = JSON.stringify(r.data || {}).toLowerCase();
                            return text.includes(recordSearch.toLowerCase());
                          })
                          .map(rec => {
                            const isSelected = selectedRecord?.id === rec.id;
                            const displayTitle = rec.data?.title || rec.data?.name || rec.data?.subject || rec.id.slice(0, 8);
                            return (
                              <div
                                key={rec.id}
                                onClick={() => setSelectedRecord(rec)}
                                className={cn(
                                  "p-2.5 rounded-xl text-xs cursor-pointer transition-all border",
                                  isSelected 
                                    ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 font-bold"
                                    : "bg-white dark:bg-zinc-900 border-zinc-200/60 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                )}
                              >
                                <div className="truncate">{displayTitle}</div>
                                <div className="text-[10px] text-zinc-400 font-mono mt-0.5">ID: {rec.id.slice(0, 10)}...</div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>

                  {/* Right Column: Record Field Inspector & Formula Binder */}
                  <div className="md:col-span-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                          {selectedRecord ? `Fields in: ${selectedRecord.data?.title || selectedRecord.data?.name || selectedRecord.id.slice(0, 8)}` : 'Select a record to inspect fields'}
                        </span>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                          Click field badge to insert into formula
                        </span>
                      </div>

                      {selectedRecord ? (
                        <div className="flex flex-wrap gap-2 mb-4 max-h-40 overflow-y-auto p-1">
                          {Object.entries(selectedRecord.data || {}).map(([key, val]) => {
                            const isNumeric = typeof val === 'number' || (!isNaN(Number(val)) && val !== '' && val !== null);
                            return (
                              <button
                                key={key}
                                onClick={() => {
                                  const insertVal = isNumeric ? String(val) : `"${val}"`;
                                  setExpression(prev => prev ? `${prev} + ${insertVal}` : String(insertVal));
                                }}
                                className={cn(
                                  "flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs border transition-all cursor-pointer",
                                  isNumeric 
                                    ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:scale-105"
                                    : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                                )}
                              >
                                <span className="font-semibold">{key}:</span>
                                <span className="font-mono font-bold">{String(val)}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-xs text-zinc-400 border border-dashed rounded-xl">
                          Select a record on the left to see its field values
                        </div>
                      )}

                      {/* Formula Builder Input */}
                      <div className="space-y-2 mt-4">
                        <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 block">
                          Calculation Formula
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="e.g. 1500 * 1.15 or click field pills above"
                            value={expression}
                            onChange={(e) => setExpression(e.target.value)}
                            className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono"
                          />
                          <button
                            onClick={handleEvaluate}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            Calculate
                          </button>
                        </div>
                      </div>

                      {/* Result Preview */}
                      <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                        <span className="text-xs text-zinc-500 font-medium">Computed Result:</span>
                        <span className="text-xl font-bold font-mono text-zinc-900 dark:text-white">{result}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Subtab 2: Module Aggregations */}
              {cruncherSubTab === 'aggregates' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 block mb-1">
                        Numeric Field
                      </label>
                      <select
                        value={aggField}
                        onChange={(e) => setAggField(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold"
                      >
                        <option value="">-- Choose Field --</option>
                        {numericFieldsInSelectedModule.map((f: any) => (
                          <option key={f.name} value={f.name}>
                            {f.label || f.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 block mb-1">
                        Aggregate Operation
                      </label>
                      <select
                        value={aggType}
                        onChange={(e) => setAggType(e.target.value as any)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold"
                      >
                        <option value="SUM">SUM (Total)</option>
                        <option value="AVG">AVG (Average)</option>
                        <option value="COUNT">COUNT (Total Records)</option>
                        <option value="MIN">MIN (Lowest)</option>
                        <option value="MAX">MAX (Highest)</option>
                        <option value="MEDIAN">MEDIAN</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        onClick={handleExecuteAggregate}
                        disabled={aggLoading || !aggField}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        {aggLoading ? 'Computing...' : `Compute ${aggType}`}
                      </button>
                    </div>
                  </div>

                  {/* Aggregate Result Display */}
                  {aggResult && (
                    <div className="p-5 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-zinc-500 font-semibold block">
                          Aggregate: {aggResult.aggregateType} of <code className="text-indigo-600 dark:text-indigo-400 font-mono">@{aggResult.fieldName}</code>
                        </span>
                        <div className="text-3xl font-extrabold text-zinc-900 dark:text-white font-mono mt-1">
                          {aggResult.value.toLocaleString()}
                        </div>
                        <span className="text-[11px] text-zinc-400 mt-1 block">
                          Calculated across {aggResult.count} records ({aggResult.totalRecords} total records inspected)
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setExpression(prev => prev ? `${prev} + ${aggResult.value}` : String(aggResult.value));
                            toast.success(`Inserted ${aggResult.value} into formula`);
                          }}
                          className="px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold hover:bg-zinc-100 transition-colors"
                        >
                          Insert into Formula
                        </button>
                        <button
                          onClick={() => {
                            const newTapeEntry: CalculationTapeEntry = {
                              id: `agg_${Date.now()}`,
                              expression: `${aggResult.aggregateType}(${selectedModule?.name}.${aggResult.fieldName})`,
                              result: String(aggResult.value),
                              timestamp: new Date().toLocaleTimeString(),
                              mode: 'records',
                            };
                            setTape(prev => [newTapeEntry, ...prev]);
                            toast.success('Added aggregate to tape');
                          }}
                          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
                        >
                          Add to Tape
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SMART SCRATCHPAD */}
          {mode === 'scratchpad' && (
            <div className="w-full max-w-4xl h-[520px] bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl flex flex-col overflow-hidden">
              
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Live Formula Scratchpad (Soulver-Style)
                  </span>
                </div>
                <div className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  Total Sum: {scratchpadEvaluation.formattedTotal}
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* Left: Text Editor */}
                <div className="flex-1 p-4 border-r border-zinc-200 dark:border-zinc-800">
                  <textarea
                    value={scratchpadText}
                    onChange={(e) => setScratchpadText(e.target.value)}
                    className="w-full h-full bg-transparent resize-none font-mono text-xs text-zinc-900 dark:text-zinc-100 leading-6 outline-none"
                    placeholder="Type numbers, assignments (Tax = 15%), and math operations..."
                  />
                </div>

                {/* Right: Live Line-by-Line Results */}
                <div className="w-48 bg-zinc-50 dark:bg-zinc-950/60 p-4 font-mono text-xs overflow-y-auto leading-6 select-all">
                  {scratchpadEvaluation.lines.map((line, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "text-right truncate h-6 font-semibold",
                        line.hasError ? "text-rose-500" : line.formattedResult ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-300 dark:text-zinc-700"
                      )}
                    >
                      {line.formattedResult || (line.isComment ? '//' : '—')}
                    </div>
                  ))}
                </div>
              </div>

              {/* Scratchpad Footer */}
              <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between text-xs text-zinc-500">
                <span>Supports named variables, arithmetic, % deltas, and comments (#).</span>
                <button
                  onClick={() => {
                    const newEntry: CalculationTapeEntry = {
                      id: `scratch_${Date.now()}`,
                      expression: 'Scratchpad Total',
                      result: scratchpadEvaluation.formattedTotal,
                      timestamp: new Date().toLocaleTimeString(),
                      mode: 'scratchpad',
                    };
                    setTape(prev => [newEntry, ...prev]);
                    toast.success('Pushed scratchpad total to tape');
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Save Total to Tape
                </button>
              </div>
            </div>
          )}

        </div>

        {/* 3. Right Sidebar: Audit Paper Tape & History */}
        <aside className="w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col shrink-0">
          
          {/* Tape Header */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={16} className="text-zinc-500" />
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                Audit Tape ({tape.length})
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleExportCSV}
                title="Export Tape as CSV"
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Download size={14} />
              </button>
              <button
                onClick={handleClearTape}
                title="Clear Tape"
                className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Search Tape */}
          <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/60">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={12} />
              <input
                type="text"
                placeholder="Search tape..."
                value={tapeSearch}
                onChange={(e) => setTapeSearch(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-7 pr-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300"
              />
            </div>
          </div>

          {/* Tape List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {tape.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                <History size={24} className="mb-2 opacity-40" />
                <p className="text-xs font-medium">Audit tape is empty</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Calculations will appear here automatically</p>
              </div>
            ) : (
              tape
                .filter(entry => {
                  if (!tapeSearch.trim()) return true;
                  const q = tapeSearch.toLowerCase();
                  return entry.expression.toLowerCase().includes(q) || entry.result.toLowerCase().includes(q);
                })
                .map(entry => (
                  <div
                    key={entry.id}
                    onClick={() => {
                      setExpression(entry.result);
                      toast.success(`Loaded ${entry.result} into calculator`);
                    }}
                    className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200/60 dark:border-zinc-800/60 hover:border-indigo-400/50 dark:hover:border-indigo-600/50 cursor-pointer group transition-all"
                  >
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono mb-1">
                      <span>{entry.timestamp}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(entry.result, entry.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 hover:text-zinc-900 dark:hover:text-white transition-opacity"
                        title="Copy result"
                      >
                        {copiedId === entry.id ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                      </button>
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono truncate">
                      {entry.expression}
                    </div>
                    <div className="text-sm font-bold text-zinc-900 dark:text-white font-mono text-right mt-1">
                      = {entry.result}
                    </div>
                  </div>
                ))
            )}
          </div>

          {/* Tape Footer: Push to Notes */}
          <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <button
              onClick={handlePushToNotes}
              className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileText size={14} />
              <span>Save Tape to Notes App</span>
            </button>
          </div>

        </aside>

      </div>

    </div>
  );
};
export default CalculatorApp;
