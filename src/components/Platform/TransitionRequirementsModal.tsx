import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { ModuleField } from '../../types/platform';
import { cn } from '../../lib/utils';

interface TransitionRequirementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetNodeName: string;
  missingFields: ModuleField[];
  onConfirm: (values: Record<string, any>) => Promise<void> | void;
  isSubmitting?: boolean;
}

export const TransitionRequirementsModal: React.FC<TransitionRequirementsModalProps> = ({
  isOpen,
  onClose,
  targetNodeName,
  missingFields,
  onConfirm,
  isSubmitting = false
}) => {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

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

    await onConfirm(formValues);
  };

  if (!isOpen) return null;

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
                <AlertCircle size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Required Fields to Advance
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
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                The workflow definition requires the following information before transitioning this record:
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
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          {fieldLabel}
                          <span className="text-rose-500 ml-1">*</span>
                        </label>
                        <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">
                          {fieldType}
                        </span>
                      </div>

                      {fieldType === 'select' || fieldType === 'dropdown' ? (
                        <select
                          value={value}
                          onChange={(e) => handleFieldChange(fieldId, e.target.value)}
                          disabled={isSubmitting}
                          className={cn(
                            "w-full bg-zinc-50 dark:bg-zinc-950 border rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 transition-all",
                            hasError 
                              ? "border-rose-500 ring-rose-500/20" 
                              : "border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/20"
                          )}
                        >
                          <option value="">Select an option...</option>
                          {(field.options || []).map((opt: any) => {
                            const optVal = typeof opt === 'string' ? opt : opt.value ?? opt.label;
                            const optLab = typeof opt === 'string' ? opt : opt.label ?? opt.value;
                            return (
                              <option key={optVal} value={optVal}>
                                {optLab}
                              </option>
                            );
                          })}
                        </select>
                      ) : fieldType === 'textarea' ? (
                        <textarea
                          rows={3}
                          value={value}
                          onChange={(e) => handleFieldChange(fieldId, e.target.value)}
                          disabled={isSubmitting}
                          placeholder={`Enter ${fieldLabel.toLowerCase()}...`}
                          className={cn(
                            "w-full bg-zinc-50 dark:bg-zinc-950 border rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 transition-all resize-none",
                            hasError 
                              ? "border-rose-500 ring-rose-500/20" 
                              : "border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/20"
                          )}
                        />
                      ) : fieldType === 'boolean' || fieldType === 'checkbox' ? (
                        <label className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(value)}
                            onChange={(e) => handleFieldChange(fieldId, e.target.checked)}
                            disabled={isSubmitting}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-zinc-300 dark:border-zinc-700"
                          />
                          <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                            Confirm / Check to proceed
                          </span>
                        </label>
                      ) : fieldType === 'date' || fieldType === 'datetime' ? (
                        <input
                          type={fieldType === 'datetime' ? 'datetime-local' : 'date'}
                          value={value}
                          onChange={(e) => handleFieldChange(fieldId, e.target.value)}
                          disabled={isSubmitting}
                          className={cn(
                            "w-full bg-zinc-50 dark:bg-zinc-950 border rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 transition-all",
                            hasError 
                              ? "border-rose-500 ring-rose-500/20" 
                              : "border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/20"
                          )}
                        />
                      ) : fieldType === 'number' || fieldType === 'currency' ? (
                        <input
                          type="number"
                          step="any"
                          value={value}
                          onChange={(e) => handleFieldChange(fieldId, e.target.value === '' ? '' : Number(e.target.value))}
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

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <ArrowRight size={13} />
                )}
                <span>Save & Advance to {targetNodeName}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
