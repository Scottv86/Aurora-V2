import React, { useState } from 'react';
import { ModuleField, Tab } from '../../../types/platform';
import { FieldInput } from '../../FieldInput';
import { Button } from '../../UI/Primitives';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface FormRendererProps {
  title?: string;
  subtitle?: string;
  fields: ModuleField[];
  tabs?: Tab[];
  onSubmit?: (values: Record<string, any>) => Promise<void> | void;
  submitButtonText?: string;
  className?: string;
  readOnly?: boolean;
  initialValues?: Record<string, any>;
}

export const FormRenderer: React.FC<FormRendererProps> = ({
  title,
  subtitle,
  fields,
  tabs = [],
  onSubmit,
  submitButtonText = 'Submit Form',
  className,
  readOnly = false,
  initialValues = {}
}) => {
  const [formValues, setFormValues] = useState<Record<string, any>>(initialValues);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0]?.id || 'default');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;

    setSubmitting(true);
    setErrorMessage(null);
    try {
      if (onSubmit) {
        await onSubmit(formValues);
      }
      setSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit form.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-8 text-center bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-2xl">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Submission Received!</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Thank you. Your form submission has been processed successfully.</p>
        <Button
          variant="secondary"
          onClick={() => {
            setSubmitted(false);
            setFormValues({});
          }}
          className="mt-4 text-xs"
        >
          Submit Another Response
        </Button>
      </div>
    );
  }

  // Group fields by tab if tabs exist
  const visibleFields = tabs.length > 0 && activeTabId !== 'default'
    ? fields.filter(f => f.tabId === activeTabId || (!f.tabId && activeTabId === tabs[0]?.id))
    : fields;

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm", className)}>
      {(title || subtitle) && (
        <div className="border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          {title && <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{title}</h2>}
          {subtitle && <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{subtitle}</p>}
        </div>
      )}

      {/* Tabs if applicable */}
      {tabs.length > 1 && (
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-2 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabId(tab.id)}
              className={cn(
                "px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap",
                activeTabId === tab.id
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Fields Grid Layout */}
      <div className="grid grid-cols-12 gap-4">
        {visibleFields.map(field => {
          const colSpan = field.colSpan || 12;
          const colClass = `col-span-12 md:col-span-${colSpan}`;
          return (
            <div key={field.id} className={colClass}>
              <FieldInput
                field={field}
                value={formValues[field.id]}
                onChange={(val) => handleFieldChange(field.id, val)}
                readonly={readOnly}
              />
            </div>
          );
        })}
      </div>


      {!readOnly && (
        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <Button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-6 py-2.5 rounded-xl shadow-md transition-all"
          >
            <Send size={16} />
            <span>{submitting ? 'Submitting...' : submitButtonText}</span>
          </Button>
        </div>
      )}
    </form>
  );
};
