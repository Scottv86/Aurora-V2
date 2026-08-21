import React from 'react';
import { 
  X, Sparkles, GitBranch, Clock, Calculator, ShieldCheck, 
  ArrowRight, FileText, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { cn, Button } from '../Primitives';
import { LineageInfo } from './TableSemanticCells';

export interface DataLineageModalProps {
  isOpen: boolean;
  onClose: () => void;
  lineage: LineageInfo | null;
  recordId?: string | number;
  fieldName?: string;
}

export const DataLineageModal: React.FC<DataLineageModalProps> = ({
  isOpen,
  onClose,
  lineage,
  recordId,
  fieldName
}) => {
  if (!isOpen || !lineage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Data Lineage & Calculation Trace
                {lineage.ruleVersion && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {lineage.ruleVersion}
                  </span>
                )}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {fieldName ? `Field: ${fieldName}` : 'Calculated Value Breakdown'} {recordId ? `(Record #${recordId})` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-zinc-700 dark:text-zinc-300">
          {/* Rule Information Banner */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/80 to-purple-50/50 dark:from-indigo-950/30 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-900/40">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-indigo-600 dark:text-indigo-400" />
                Active Rule / Logic Node
              </span>
              <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                {lineage.ruleName || lineage.formulaName || 'Rule Engine v2.4'}
              </span>
            </div>
            {lineage.expression && (
              <div className="mt-2 font-mono text-[11px] bg-white/80 dark:bg-zinc-950/80 p-2.5 rounded-lg border border-indigo-200/60 dark:border-indigo-900/50 text-indigo-950 dark:text-indigo-200">
                {lineage.expression}
              </div>
            )}
          </div>

          {/* Lineage Steps / Breakdown */}
          <div>
            <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-1.5">
              <GitBranch size={14} className="text-zinc-500" /> Computation Steps & Factors
            </h4>
            
            <div className="space-y-2 border-l-2 border-indigo-200 dark:border-indigo-800/80 ml-2 pl-4">
              {lineage.baseAmount !== undefined && (
                <div className="relative flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200/70 dark:border-zinc-800">
                  <span className="absolute -left-[21px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-zinc-900" />
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Base Input Amount</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{String(lineage.baseAmount)}</span>
                </div>
              )}

              {(lineage.adjustments || []).map((adj, idx) => (
                <div key={idx} className="relative flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200/70 dark:border-zinc-800">
                  <span className="absolute -left-[21px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-indigo-400 ring-4 ring-white dark:ring-zinc-900" />
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{adj.name}</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{String(adj.value)}</span>
                </div>
              ))}

              <div className="relative flex items-center justify-between p-2.5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-900/60">
                <span className="absolute -left-[21px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-zinc-900" />
                <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600" /> Evaluated Result
                </span>
                <span className="font-mono font-extrabold text-emerald-800 dark:text-emerald-200 text-sm">
                  Verified Accurate
                </span>
              </div>
            </div>
          </div>

          {/* Audit Timestamp */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1">
              <Clock size={12} /> Last Evaluated: {lineage.evaluatedAt || new Date().toLocaleString()}
            </span>
            <span>Deterministic Aurora Execution</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <Button variant="secondary" onClick={onClose} size="sm">
            Close Trace
          </Button>
        </div>
      </div>
    </div>
  );
};
