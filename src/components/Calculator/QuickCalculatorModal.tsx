import React, { useState, useEffect } from 'react';
import { 
  Calculator as CalcIcon, 
  X, 
  Copy, 
  Check, 
  ExternalLink,
  PanelRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePlatform } from '../../hooks/usePlatform';
import { evaluateExpression } from '../../lib/calcEvaluator';
import { fetchRecords } from '../../services/dataService';
import { toast } from 'sonner';

interface QuickCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickCalculatorModal: React.FC<QuickCalculatorModalProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useAuth() as any;
  const { tenant, modules, setIsCalculatorDocked } = usePlatform();
  const token = session?.access_token;
  const tenantId = tenant?.id;

  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');
  const [copied, setCopied] = useState(false);
  const [activeRecordData, setActiveRecordData] = useState<Record<string, any> | null>(null);
  const [detectedModule, setDetectedModule] = useState<any | null>(null);

  // Check if current page is viewing a record
  useEffect(() => {
    if (!isOpen) return;

    // e.g. /workspace/modules/:moduleId/records/:recordId
    const match = location.pathname.match(/\/modules\/([^\/]+)\/records\/([^\/]+)/);
    if (match && tenantId) {
      const modId = match[1];
      const recId = match[2];
      const mod = modules?.find(m => m.id === modId);
      if (mod) setDetectedModule(mod);

      // Fetch the record data
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
      setDetectedModule(null);
    }
  }, [isOpen, location.pathname, tenantId, token, modules]);

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

  const handleEvaluate = () => {
    if (!expression.trim()) return;
    const evaluated = evaluateExpression(expression);
    if (evaluated.error) {
      toast.error(`Error: ${evaluated.error}`);
    } else {
      setResult(evaluated.formatted);
    }
  };

  const handleCopyResult = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success('Result copied to clipboard');
  };

  // Keyboard listener inside modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key >= '0' && e.key <= '9') {
        handleInput(e.key);
      } else if (['+', '-', '*', '/'].includes(e.key)) {
        handleInput(` ${e.key} `);
      } else if (e.key === '.') {
        handleInput('.');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEvaluate();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, expression]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 flex flex-col gap-4 font-sans text-zinc-900 dark:text-zinc-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <CalcIcon size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Quick Calculator</h3>
              <span className="text-[10px] text-zinc-400">Aurora Floating Pad</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                onClose();
                setIsCalculatorDocked(true);
                toast.success('Calculator docked to right of screen');
              }}
              title="Dock to right side of screen (pushing content)"
              className="p-1.5 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <PanelRight size={14} />
            </button>
            <button
              onClick={() => {
                onClose();
                navigate('/workspace/apps/calculator');
              }}
              title="Open full workspace app"
              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <ExternalLink size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Display */}
        <div className="bg-zinc-50 dark:bg-zinc-950 rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col items-end justify-between min-h-[85px] relative group">
          <span className="text-xs text-zinc-400 font-mono truncate w-full text-right">{expression || '0'}</span>
          <div className="text-3xl font-extrabold text-zinc-900 dark:text-white font-mono select-all">
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

        {/* Active Record Field Badges (Context-Aware) */}
        {activeRecordData && (
          <div className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50">
            <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 block mb-1">
              Active Record Fields{detectedModule?.name ? ` (${detectedModule.name})` : ''}:
            </span>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {Object.entries(activeRecordData).map(([k, v]) => {
                const isNum = typeof v === 'number' || (!isNaN(Number(v)) && v !== '' && v !== null);
                if (!isNum) return null;
                return (
                  <button
                    key={k}
                    onClick={() => handleInput(String(v))}
                    className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-900 text-[10px] font-mono border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50"
                  >
                    {k}: {String(v)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-4 gap-2">
          <button onClick={handleClear} className="py-2.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-600">AC</button>
          <button onClick={handleBackspace} className="py-2.5 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300">⌫</button>
          <button onClick={() => handleInput('%')} className="py-2.5 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300">%</button>
          <button onClick={() => handleInput(' ÷ ')} className="py-2.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600">÷</button>

          <button onClick={() => handleInput('7')} className="py-2.5 rounded-xl text-sm font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200">7</button>
          <button onClick={() => handleInput('8')} className="py-2.5 rounded-xl text-sm font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200">8</button>
          <button onClick={() => handleInput('9')} className="py-2.5 rounded-xl text-sm font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200">9</button>
          <button onClick={() => handleInput(' × ')} className="py-2.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600">×</button>

          <button onClick={() => handleInput('4')} className="py-2.5 rounded-xl text-sm font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200">4</button>
          <button onClick={() => handleInput('5')} className="py-2.5 rounded-xl text-sm font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200">5</button>
          <button onClick={() => handleInput('6')} className="py-2.5 rounded-xl text-sm font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200">6</button>
          <button onClick={() => handleInput(' - ')} className="py-2.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600">-</button>

          <button onClick={() => handleInput('1')} className="py-2.5 rounded-xl text-sm font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200">1</button>
          <button onClick={() => handleInput('2')} className="py-2.5 rounded-xl text-sm font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200">2</button>
          <button onClick={() => handleInput('3')} className="py-2.5 rounded-xl text-sm font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200">3</button>
          <button onClick={() => handleInput(' + ')} className="py-2.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600">+</button>

          <button onClick={() => handleInput('0')} className="col-span-2 py-2.5 rounded-xl text-sm font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200">0</button>
          <button onClick={() => handleInput('.')} className="py-2.5 rounded-xl text-sm font-bold bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-200">.</button>
          <button onClick={handleEvaluate} className="py-2.5 rounded-xl text-sm font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs">=</button>
        </div>
      </motion.div>
    </div>
  );
};
