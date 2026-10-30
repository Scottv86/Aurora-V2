import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calculator as CalcIcon, 
  X, 
  Copy, 
  Check, 
  RotateCcw, 
  Sparkles, 
  Maximize2, 
  ExternalLink,
  ChevronRight,
  Database,
  History,
  TrendingUp,
  DollarSign,
  FileText,
  Trash2,
  Plus
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePlatform } from '../../hooks/usePlatform';
import { evaluateExpression } from '../../lib/calcEvaluator';
import { fetchRecords } from '../../services/dataService';
import { CalculationTapeEntry } from '../../types/calculations';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface DockedCalculatorPanelProps {
  width: number;
  onResize: (newWidth: number) => void;
  onClose: () => void;
  onUndock: () => void;
}

export const DockedCalculatorPanel: React.FC<DockedCalculatorPanelProps> = ({
  width,
  onResize,
  onClose,
  onUndock,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useAuth() as any;
  const { tenant, modules } = usePlatform();
  const token = session?.access_token;
  const tenantId = tenant?.id;

  // Active Tab inside docked pane: 'standard' | 'financial' | 'record' | 'tape'
  const [activeTab, setActiveTab] = useState<'standard' | 'financial' | 'record' | 'tape'>('standard');

  // Calculator Core State
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');
  const [memory, setMemory] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [tape, setTape] = useState<CalculationTapeEntry[]>(() => {
    try {
      const saved = localStorage.getItem('aurora_calc_docked_tape');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Resizing state
  const [isResizing, setIsResizing] = useState(false);

  // Active record binding context
  const [activeRecordData, setActiveRecordData] = useState<Record<string, any> | null>(null);
  const [detectedModuleName, setDetectedModuleName] = useState<string | null>(null);

  // Persist tape
  useEffect(() => {
    localStorage.setItem('aurora_calc_docked_tape', JSON.stringify(tape.slice(0, 100)));
  }, [tape]);

  // Inspect route to see if user is currently looking at a record
  useEffect(() => {
    const match = location.pathname.match(/\/modules\/([^\/]+)\/records\/([^\/]+)/);
    if (match && tenantId) {
      const modId = match[1];
      const recId = match[2];
      const mod = modules?.find(m => m.id === modId);
      if (mod) setDetectedModuleName(mod.name || (mod as any).label);

      fetchRecords(modId, tenantId, token || '', 1, 50)
        .then(res => {
          const list = res?.records || (Array.isArray(res) ? res : []);
          const target = list.find((r: any) => r.id === recId);
          if (target && target.data) {
            setActiveRecordData(target.data);
          }
        })
        .catch(console.warn);
    } else {
      setActiveRecordData(null);
      setDetectedModuleName(null);
    }
  }, [location.pathname, tenantId, token, modules]);

  // Resize handling
  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 320 && newWidth <= 640) {
        onResize(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onResize]);

  // Calculator logic
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

  const handleEvaluate = useCallback(() => {
    if (!expression.trim()) return;
    const evaluated = evaluateExpression(expression);
    if (evaluated.error) {
      toast.error(`Error: ${evaluated.error}`);
    } else {
      setResult(evaluated.formatted);
      const newEntry: CalculationTapeEntry = {
        id: `tape_${Date.now()}`,
        expression,
        result: evaluated.formatted,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: 'standard',
      };
      setTape(prev => [newEntry, ...prev].slice(0, 100));
    }
  }, [expression]);

  const handleCopyResult = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success('Result copied');
  };

  // Keyboard navigation when docked
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key >= '0' && e.key <= '9') {
        handleInput(e.key);
      } else if (['+', '-', '*', '/'].includes(e.key)) {
        handleInput(` ${e.key} `);
      } else if (e.key === '.') {
        handleInput('.');
      } else if (e.key === '%') {
        handleInput('%');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEvaluate();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleEvaluate]);

  // Numeric fields extracted from active record
  const recordNumericFields = useMemo(() => {
    if (!activeRecordData) return [];
    return Object.entries(activeRecordData).filter(([_, val]) => {
      return typeof val === 'number' || (!isNaN(Number(val)) && val !== '' && val !== null);
    });
  }, [activeRecordData]);

  return (
    <aside
      style={{ width: `${width}px` }}
      className="fixed right-0 top-16 bottom-0 z-30 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col shadow-sm select-none"
    >
      {/* Resizable Left Edge Drag Handle */}
      <div
        onMouseDown={startResizing}
        className={cn(
          "absolute top-0 -left-1.5 w-3 h-full cursor-col-resize z-50 group hover:bg-indigo-500/10 transition-colors",
          isResizing && "bg-indigo-500/20"
        )}
        title="Drag to resize calculator width"
      >
        <div className="w-1 h-full mx-auto group-hover:bg-indigo-500/50 dark:group-hover:bg-indigo-400/50 transition-colors" />
      </div>

      {/* 1. Header */}
      <div className="p-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
            <CalcIcon size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                Docked Calculator
              </span>
              <span className="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[9px] font-bold uppercase">
                Docked
              </span>
            </div>
            {detectedModuleName && (
              <p className="text-[10px] text-zinc-400 truncate">
                Bound to: <span className="font-semibold text-zinc-600 dark:text-zinc-300">{detectedModuleName}</span>
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Undock to Floating Modal */}
          <button
            onClick={onUndock}
            title="Undock to Floating Modal"
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Maximize2 size={13} />
          </button>

          {/* Open Full App */}
          <button
            onClick={() => navigate('/workspace/apps/calculator')}
            title="Open Full Workspace App"
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <ExternalLink size={13} />
          </button>

          {/* Close Docked Pane */}
          <button
            onClick={onClose}
            title="Close Calculator"
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* 2. Subtabs */}
      <div className="px-3 pt-2 pb-1 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs bg-white dark:bg-zinc-900 shrink-0">
        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg w-full">
          {[
            { id: 'standard', label: 'Keypad', icon: CalcIcon },
            { id: 'record', label: `Fields (${recordNumericFields.length})`, icon: Database },
            { id: 'tape', label: `Tape (${tape.length})`, icon: History },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 py-1 rounded-md text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer",
                activeTab === tab.id 
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs" 
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              )}
            >
              <tab.icon size={11} className={activeTab === tab.id ? "text-indigo-600 dark:text-indigo-400" : ""} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Digital Output Display */}
      <div className="p-3 shrink-0">
        <div className="bg-zinc-50 dark:bg-zinc-950 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 flex flex-col items-end justify-between min-h-[90px] relative group shadow-inner">
          <div className="w-full flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            {memory !== 0 ? (
              <span className="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold">
                M: {memory}
              </span>
            ) : <span />}
            <span className="truncate max-w-[220px]">{expression || '0'}</span>
          </div>

          <div className="text-3xl font-extrabold text-zinc-900 dark:text-white font-mono tracking-tight select-all">
            {result}
          </div>

          <button
            onClick={handleCopyResult}
            className="absolute top-2 left-2 p-1 rounded-md bg-white/80 dark:bg-zinc-800/80 text-zinc-400 hover:text-zinc-900 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity border border-zinc-200 dark:border-zinc-700"
            title="Copy result"
          >
            {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
          </button>
        </div>
      </div>

      {/* 4. Active Tab Content */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col justify-between">
        
        {/* TAB A: STANDARD KEYPAD */}
        {activeTab === 'standard' && (
          <div className="flex flex-col gap-2.5">
            {/* Memory Buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              <button onClick={() => { setMemory(0); toast.success('Memory cleared'); }} className="py-1 rounded-lg text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-400">MC</button>
              <button onClick={() => setExpression(prev => prev + memory.toString())} className="py-1 rounded-lg text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-400">MR</button>
              <button onClick={() => { const n = parseFloat(result.replace(/,/g, '')); if (!isNaN(n)) setMemory(m => m + n); }} className="py-1 rounded-lg text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-400">M+</button>
              <button onClick={() => { const n = parseFloat(result.replace(/,/g, '')); if (!isNaN(n)) setMemory(m => m - n); }} className="py-1 rounded-lg text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-400">M-</button>
            </div>

            {/* Main Keypad */}
            <div className="grid grid-cols-4 gap-2">
              <button onClick={handleClear} className="py-3 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-600">AC</button>
              <button onClick={handleBackspace} className="py-3 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300">⌫</button>
              <button onClick={() => handleInput('%')} className="py-3 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300">%</button>
              <button onClick={() => handleInput(' ÷ ')} className="py-3 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600">÷</button>

              <button onClick={() => handleInput('7')} className="py-3 rounded-xl text-sm font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200">7</button>
              <button onClick={() => handleInput('8')} className="py-3 rounded-xl text-sm font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200">8</button>
              <button onClick={() => handleInput('9')} className="py-3 rounded-xl text-sm font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200">9</button>
              <button onClick={() => handleInput(' × ')} className="py-3 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600">×</button>

              <button onClick={() => handleInput('4')} className="py-3 rounded-xl text-sm font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200">4</button>
              <button onClick={() => handleInput('5')} className="py-3 rounded-xl text-sm font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200">5</button>
              <button onClick={() => handleInput('6')} className="py-3 rounded-xl text-sm font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200">6</button>
              <button onClick={() => handleInput(' - ')} className="py-3 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600">-</button>

              <button onClick={() => handleInput('1')} className="py-3 rounded-xl text-sm font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200">1</button>
              <button onClick={() => handleInput('2')} className="py-3 rounded-xl text-sm font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200">2</button>
              <button onClick={() => handleInput('3')} className="py-3 rounded-xl text-sm font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200">3</button>
              <button onClick={() => handleInput(' + ')} className="py-3 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600">+</button>

              <button onClick={() => handleInput('0')} className="col-span-2 py-3 rounded-xl text-sm font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200">0</button>
              <button onClick={() => handleInput('.')} className="py-3 rounded-xl text-sm font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200">.</button>
              <button onClick={handleEvaluate} className="py-3 rounded-xl text-sm font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs">=</button>
            </div>
          </div>
        )}

        {/* TAB B: ACTIVE RECORD FIELD BADGES */}
        {activeTab === 'record' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium">
              <span>Click a field value to insert into calculation:</span>
            </div>

            {recordNumericFields.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs text-zinc-400">
                <Database size={24} className="mx-auto mb-2 opacity-40" />
                <p className="font-semibold">No active record detected</p>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Navigate to any record in Aurora (e.g. Invoices, Deals, POS) to see its numeric fields here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1.5 max-h-[340px] overflow-y-auto pr-1">
                {recordNumericFields.map(([fieldKey, val]) => (
                  <button
                    key={fieldKey}
                    onClick={() => {
                      handleInput(String(val));
                      toast.success(`Inserted ${val}`);
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200/60 dark:border-zinc-800/60 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all text-left group cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                        {fieldKey}
                      </span>
                      <span className="text-[10px] text-zinc-400">Record Field</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
                        {String(val)}
                      </span>
                      <Plus size={12} className="text-zinc-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB C: TAPE / AUDIT TRAIL */}
        {activeTab === 'tape' && (
          <div className="flex flex-col gap-2 h-full">
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span>Recent Calculations</span>
              {tape.length > 0 && (
                <button
                  onClick={() => setTape([])}
                  className="text-rose-500 hover:underline flex items-center gap-1 text-[10px]"
                >
                  <Trash2 size={10} /> Clear
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[340px] pr-1">
              {tape.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400">Tape is empty</div>
              ) : (
                tape.map(entry => (
                  <div
                    key={entry.id}
                    onClick={() => setExpression(entry.result)}
                    className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/60 text-xs font-mono cursor-pointer hover:border-indigo-400 transition-all"
                  >
                    <div className="text-[10px] text-zinc-400 flex justify-between">
                      <span>{entry.timestamp}</span>
                      <span>Click to load</span>
                    </div>
                    <div className="truncate text-zinc-600 dark:text-zinc-400">{entry.expression}</div>
                    <div className="text-sm font-bold text-zinc-900 dark:text-white text-right">= {entry.result}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

    </aside>
  );
};
