import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  CheckSquare, 
  Check, 
  ShieldAlert, 
  FileCheck
} from 'lucide-react';
import { ModuleField } from '../../types/platform';
import { StageSubstepItem } from '../../lib/workflowProcessUtils';
import { cn } from '../../lib/utils';

interface TransitionRequirementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetNodeName: string;
  missingFields?: ModuleField[];
  incompleteSubsteps?: StageSubstepItem[];
  currentStageName?: string;
  onConfirm: (values: Record<string, any>) => Promise<void> | void;
  onToggleSubstepInWorkspace?: (substepId: string) => void;
  isSubmitting?: boolean;
}

export const TransitionRequirementsModal: React.FC<TransitionRequirementsModalProps> = ({
  isOpen,
  onClose,
  targetNodeName,
  missingFields = [],
  incompleteSubsteps = [],
  currentStageName,
  onConfirm,
  onToggleSubstepInWorkspace,
  isSubmitting = false
}) => {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Substep checklist state inside modal
  const [checkedSubsteps, setCheckedSubsteps] = useState<Set<string>>(new Set());
  const [isBypassingSubsteps, setIsBypassingSubsteps] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [substepError, setSubstepError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCheckedSubsteps(new Set());
      setIsBypassingSubsteps(false);
      setOverrideReason('');
      setSubstepError(null);
      setErrors({});
      setFormValues({});
    }
  }, [isOpen]);

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[fieldId];
        return copy;
      });
    }
  };

  const handleToggleSubstep = (substepId: string) => {
    setSubstepError(null);
    setCheckedSubsteps(prev => {
      const next = new Set(prev);
      if (next.has(substepId)) {
        next.delete(substepId);
      } else {
        next.add(substepId);
      }
      return next;
    });
    onToggleSubstepInWorkspace?.(substepId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // 1. Validate fields
    for (const f of missingFields) {
      const val = formValues[f.id] ?? formValues[f.name];
      if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
        newErrors[f.id] = `${f.label || f.name || 'This field'} is required`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // 2. Validate substeps
    const remainingIncomplete = incompleteSubsteps.filter(s => !checkedSubsteps.has(s.id));
    if (remainingIncomplete.length > 0 && !isBypassingSubsteps) {
      setSubstepError(`Please complete all ${remainingIncomplete.length} remaining required checklist item(s) or authorize a bypass.`);
      return;
    }

    if (remainingIncomplete.length > 0 && isBypassingSubsteps && !overrideReason.trim()) {
      setSubstepError('Please enter an override reason to authorize bypassing required checklist items.');
      return;
    }

    const payload: Record<string, any> = {
      ...formValues
    };

    if (remainingIncomplete.length > 0 && isBypassingSubsteps) {
      payload._overrideReason = overrideReason.trim();
      payload._bypassedSubstepIds = remainingIncomplete.map(s => s.id);
      payload._bypassedSubstepLabels = remainingIncomplete.map(s => s.label);
    }

    if (checkedSubsteps.size > 0) {
      payload._completedSubstepIds = Array.from(checkedSubsteps);
    }

    await onConfirm(payload);
  };

  if (!isOpen) return null;

  const hasMissingFields = missingFields.length > 0;
  const hasIncompleteSubsteps = incompleteSubsteps.length > 0;
  const remainingIncompleteCount = incompleteSubsteps.filter(s => !checkedSubsteps.has(s.id)).length;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={isSubmitting ? undefined : onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                {hasIncompleteSubsteps && !hasMissingFields ? (
                  <CheckSquare size={16} />
                ) : (
                  <AlertCircle size={16} />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  {hasMissingFields && hasIncompleteSubsteps 
                    ? 'Requirements to Advance' 
                    : hasIncompleteSubsteps 
                      ? 'Stage Checklist Requirements' 
                      : 'Required Fields to Advance'}
                </h3>
                <p className="text-xs text-zinc-500">
                  Target Stage: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{targetNodeName}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto custom-scrollbar">

              {/* Substeps Section if applicable */}
              {hasIncompleteSubsteps && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <FileCheck size={14} className="text-indigo-500" />
                      <span>{currentStageName ? `${currentStageName} Subtasks` : 'Stage Subtasks'}</span>
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      {remainingIncompleteCount} required remaining
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    The following checklist items are required before advancing. Complete them now or authorize an override:
                  </p>

                  <div className="space-y-1.5 bg-zinc-50 dark:bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    {incompleteSubsteps.map(step => {
                      const isDone = checkedSubsteps.has(step.id);
                      return (
                        <div
                          key={step.id}
                          onClick={() => handleToggleSubstep(step.id)}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all select-none",
                            isDone 
                              ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                              : "hover:bg-zinc-100 dark:hover:bg-zinc-800/60 border border-transparent text-zinc-800 dark:text-zinc-200"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <button
                              type="button"
                              className={cn(
                                "w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors",
                                isDone 
                                  ? "bg-emerald-600 text-white" 
                                  : "border border-zinc-300 dark:border-zinc-600 hover:border-indigo-500"
                              )}
                            >
                              {isDone && <Check size={11} strokeWidth={3} />}
                            </button>
                            <span className={cn("text-xs font-medium truncate", isDone && "line-through opacity-80")}>
                              {step.label}
                            </span>
                          </div>
                          <span className="text-[9.5px] uppercase font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                            Required
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Edge Case Override Accordion */}
                  <div className={cn(
                    "p-3 rounded-xl border transition-all",
                    isBypassingSubsteps 
                      ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/50" 
                      : "bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800"
                  )}>
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2">
                        <ShieldAlert size={14} className={isBypassingSubsteps ? "text-amber-600 dark:text-amber-400" : "text-zinc-400"} />
                        <div>
                          <p className="text-xs font-bold text-zinc-900 dark:text-white">
                            Edge Case: Bypass Incomplete Subtasks
                          </p>
                          <p className="text-[10.5px] text-zinc-500">
                            Advance without completing the remaining items.
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isBypassingSubsteps}
                        onChange={(e) => {
                          setIsBypassingSubsteps(e.target.checked);
                          if (e.target.checked) setSubstepError(null);
                        }}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-zinc-300 dark:border-zinc-700 cursor-pointer"
                      />
                    </label>

                    {isBypassingSubsteps && (
                      <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-900/50 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <label className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                          Override Reason (Logged in Record History) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={overrideReason}
                          onChange={(e) => {
                            setOverrideReason(e.target.value);
                            if (substepError) setSubstepError(null);
                          }}
                          placeholder="e.g. Authorized exception by VP, client exempt per MSA"
                          className="w-full bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-700/60 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                        />
                      </div>
                    )}
                  </div>

                  {substepError && (
                    <p className="text-xs text-rose-500 font-medium flex items-center gap-1.5">
                      <AlertCircle size={13} className="shrink-0" />
                      <span>{substepError}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Missing Fields Section */}
              {hasMissingFields && (
                <div className="space-y-4 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    The workflow requires values in the following fields before transitioning:
                  </p>

                  <div className="space-y-4">
                    {missingFields.map(field => {
                      const fieldId = field.id;
                      const fieldLabel = field.label || field.name || fieldId;
                      const fieldType = (field.type || 'text').toLowerCase();
                      const value = formValues[fieldId] ?? '';
                      const hasError = !!errors[fieldId];

                      return (
                        <div key={fieldId} className="space-y-1.5">
                          <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
                            <span>{fieldLabel}</span>
                            <span className="text-[10px] text-zinc-400 font-normal uppercase tracking-wider">
                              {fieldType}
                            </span>
                          </label>

                          {fieldType === 'boolean' || fieldType === 'checkbox' ? (
                            <div className="flex items-center gap-2 py-1">
                              <input
                                type="checkbox"
                                id={`req_field_${fieldId}`}
                                checked={Boolean(value)}
                                onChange={(e) => handleFieldChange(fieldId, e.target.checked)}
                                disabled={isSubmitting}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-300 dark:border-zinc-700 cursor-pointer"
                              />
                              <label htmlFor={`req_field_${fieldId}`} className="text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                                Check to confirm
                              </label>
                            </div>
                          ) : fieldType === 'select' || fieldType === 'choice' ? (
                            <select
                              value={value}
                              onChange={(e) => handleFieldChange(fieldId, e.target.value)}
                              disabled={isSubmitting}
                              className={cn(
                                "w-full bg-zinc-50 dark:bg-zinc-950 border rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 transition-all cursor-pointer",
                                hasError 
                                  ? "border-rose-500 ring-rose-500/20" 
                                  : "border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/20"
                              )}
                            >
                              <option value="">Select an option...</option>
                              {Array.isArray((field as any).options) && (field as any).options.map((opt: any) => {
                                const val = typeof opt === 'string' ? opt : opt.value || opt.label;
                                const lbl = typeof opt === 'string' ? opt : opt.label || opt.value;
                                return (
                                  <option key={val} value={val}>
                                    {lbl}
                                  </option>
                                );
                              })}
                            </select>
                          ) : fieldType === 'textarea' ? (
                            <textarea
                              value={value}
                              onChange={(e) => handleFieldChange(fieldId, e.target.value)}
                              disabled={isSubmitting}
                              rows={2}
                              placeholder={`Enter ${fieldLabel.toLowerCase()}...`}
                              className={cn(
                                "w-full bg-zinc-50 dark:bg-zinc-950 border rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 transition-all resize-none",
                                hasError 
                                  ? "border-rose-500 ring-rose-500/20" 
                                  : "border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/20"
                              )}
                            />
                          ) : fieldType === 'number' || fieldType === 'currency' ? (
                            <input
                              type="number"
                              value={value}
                              onChange={(e) => handleFieldChange(fieldId, e.target.value)}
                              disabled={isSubmitting}
                              placeholder={`0.00`}
                              className={cn(
                                "w-full bg-zinc-50 dark:bg-zinc-950 border rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 transition-all",
                                hasError 
                                  ? "border-rose-500 ring-rose-500/20" 
                                  : "border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/20"
                              )}
                            />
                          ) : (
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => handleFieldChange(fieldId, e.target.value)}
                              disabled={isSubmitting}
                              placeholder={`Enter ${fieldLabel.toLowerCase()}...`}
                              className={cn(
                                "w-full bg-zinc-50 dark:bg-zinc-950 border rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 transition-all",
                                hasError 
                                  ? "border-rose-500 ring-rose-500/20" 
                                  : "border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/20"
                              )}
                            />
                          )}

                          {hasError && (
                            <p className="text-[11px] text-rose-500 font-medium">{errors[fieldId]}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <ArrowRight size={13} />
                )}
                <span>Advance to {targetNodeName}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
