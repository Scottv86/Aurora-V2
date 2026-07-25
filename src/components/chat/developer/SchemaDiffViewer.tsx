import React from 'react';
import { Plus, Minus, RefreshCw, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export interface FieldChange {
  fieldName: string;
  fieldType: string;
  action: 'added' | 'removed' | 'modified';
  previousType?: string;
}

export interface SchemaDiffProps {
  moduleName: string;
  changes: FieldChange[];
  onApplySchema?: () => void;
}

export const SchemaDiffViewer: React.FC<SchemaDiffProps> = ({
  moduleName,
  changes,
  onApplySchema
}) => {
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-indigo-500/30 bg-slate-900/90 p-4 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-indigo-500/20 p-2 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-semibold uppercase text-indigo-400">Schema Update Draft</span>
            <h4 className="text-sm font-semibold text-slate-100">{moduleName} Module</h4>
          </div>
        </div>

        <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400 font-mono">
          {changes.length} change{changes.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Changes List */}
      <div className="my-3 space-y-2 text-xs font-mono">
        {changes.map((ch, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between rounded-lg px-3 py-2 border ${
              ch.action === 'added'
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                : ch.action === 'removed'
                ? 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {ch.action === 'added' && <Plus className="h-3.5 w-3.5 text-emerald-400" />}
              {ch.action === 'removed' && <Minus className="h-3.5 w-3.5 text-rose-400" />}
              {ch.action === 'modified' && <RefreshCw className="h-3.5 w-3.5 text-amber-400" />}
              <span className="font-semibold">{ch.fieldName}</span>
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              {ch.action === 'modified' ? (
                <span>{ch.previousType} &rarr; <span className="underline">{ch.fieldType}</span></span>
              ) : (
                <span className="capitalize">{ch.fieldType}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
        <span className="text-[11px] text-slate-400 italic">Review schema diff before applying to draft</span>
        <button
          onClick={() => {
            toast.success(`Applied schema updates to ${moduleName}`);
            onApplySchema?.();
          }}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md transition hover:bg-indigo-500"
        >
          <Check className="h-3.5 w-3.5" />
          <span>Apply to Module</span>
        </button>
      </div>
    </div>
  );
};
