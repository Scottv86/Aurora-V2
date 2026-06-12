import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Play, 
  Info,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Code
} from 'lucide-react';
import { motion } from 'motion/react';
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-5xl h-[85vh] bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 py-5 border-b border-zinc-150 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
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
          
          {/* Left: Configuration Form */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
            
            {/* AI Generator Panel */}
            <div className="p-5 bg-indigo-600 rounded-2xl relative overflow-hidden shadow-md shrink-0">
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
                    className="px-4 py-2 bg-white text-indigo-600 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-50 transition-all flex items-center gap-1.5 disabled:opacity-50"
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
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">Rule Name</label>
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Total Budget Cap Check"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-indigo-500 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">Severity</label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as any)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-3 text-xs focus:outline-none focus:border-indigo-500 dark:text-white"
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
                      className="w-4 h-4 text-indigo-600 rounded border-zinc-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="isActive" className="text-xs font-bold text-zinc-700 dark:text-zinc-350 select-none">Active</label>
                  </div>
                </div>
              </div>

              {/* Expression Textarea */}
              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Rule Expression</label>
                  <span className="text-[9px] text-zinc-400 font-medium italic">Evaluates to TRUE when valid</span>
                </div>
                <textarea 
                  ref={textareaRef}
                  value={expression}
                  onChange={(e) => setExpression(e.target.value)}
                  placeholder="e.g. {Total Cost} <= {Allowed Budget}"
                  rows={4}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-indigo-500 dark:text-white resize-none"
                />
              </div>

              {/* Error Message */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">Custom Error Message</label>
                <input 
                  type="text"
                  value={errorMessage}
                  onChange={(e) => setErrorMessage(e.target.value)}
                  placeholder="e.g. Total cost cannot exceed allowed budget!"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-indigo-500 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Right Panel: Side Panel (Autocomplete & Sandbox) */}
          <div className="w-[380px] shrink-0 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/20 flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800 h-full custom-scrollbar">
            
            {/* Section 1: Tokens / Field Picker */}
            <div className="p-6 space-y-3 shrink-0">
              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <Info size={12} />
                <span>Field Placeholders</span>
              </h4>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl custom-scrollbar">
                {fields.filter(f => f.type !== 'heading' && f.type !== 'divider' && f.type !== 'spacer').map(f => (
                  <button 
                    key={f.id}
                    onClick={() => handleInsertToken(`{${f.label}}`)}
                    className="px-2 py-1 bg-zinc-50 dark:bg-zinc-800 hover:bg-indigo-500 hover:text-white text-[10px] font-bold text-zinc-650 dark:text-zinc-350 rounded border border-zinc-150 dark:border-zinc-700 transition-all"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Section 2: Function Autocomplete */}
            <div className="p-6 space-y-3 shrink-0">
              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <Code size={12} />
                <span>Formula Functions</span>
              </h4>
              <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl custom-scrollbar">
                {COMMON_FUNCTIONS.map((func, i) => (
                  <button 
                    key={i}
                    onClick={() => handleInsertToken(func.template)}
                    title={func.desc}
                    className="p-2 bg-zinc-50 dark:bg-zinc-800 hover:bg-indigo-500 hover:text-white text-left text-[9px] font-bold text-zinc-650 dark:text-zinc-350 rounded border border-zinc-150 dark:border-zinc-700 transition-all flex flex-col"
                  >
                    <span className="font-mono">{func.name.split('(')[0]}</span>
                    <span className="text-[7px] text-zinc-400 group-hover:text-indigo-100 truncate">{func.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 3: Live Sandbox Tester */}
            <div className="p-6 flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Play size={12} className="text-emerald-500" />
                  <span>Sandbox Tester</span>
                </h4>
                <button 
                  onClick={runSandboxTest}
                  disabled={!expression}
                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 transition-all disabled:opacity-50"
                >
                  <Play size={10} />
                  <span>Run Test</span>
                </button>
              </div>

              {/* Sandbox Test Result Indicator */}
              {sandboxResult && (
                <div className={cn(
                  "p-3 rounded-xl border flex gap-2.5 items-start text-xs font-medium leading-relaxed animate-in fade-in slide-in-from-top-2 duration-300",
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
                        <p className="font-bold text-emerald-800 dark:text-emerald-300">Test Passed</p>
                        <p className="text-[10px] opacity-80">Constraint is satisfied. Data is valid.</p>
                      </div>
                    </>
                  ) : sandboxResult.error ? (
                    <>
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-800 dark:text-amber-300">Syntax Error</p>
                        <p className="text-[10px] opacity-80">{sandboxResult.error}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <X size={16} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-rose-800 dark:text-rose-300">Validation Triggered</p>
                        <p className="text-[10px] opacity-80">Constraint violated. Message: &quot;{errorMessage || 'Validation failed.'}&quot;</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Sandbox Mock Inputs */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-80 p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl custom-scrollbar pr-2">
                {fields.filter(f => f.type !== 'heading' && f.type !== 'divider' && f.type !== 'spacer').map(f => (
                  <div key={f.id} className="space-y-1">
                    <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-wide px-1">{f.label}</label>
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
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-[10px] focus:outline-none dark:text-white"
                    />
                  </div>
                ))}
              </div>
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
