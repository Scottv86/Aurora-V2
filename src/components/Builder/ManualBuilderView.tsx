import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Globe,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Terminal,
  Database,
  Check,
  Loader2,
  Link2,
  ChevronDown
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { DynamicIcon } from '../UI/DynamicIcon';

interface ManualBuilderViewProps {
  onSave: (connector: any) => Promise<void>;
  isSaving: boolean;
}

const ICON_OPTIONS = [
  'Globe',
  'Zap',
  'Database',
  'Server',
  'Cloud',
  'Webhook',
  'Mail',
  'Shield',
  'Code2',
  'Cpu'
];

const CATEGORY_OPTIONS = [
  'Automation',
  'CRM',
  'Communication',
  'Finance',
  'Marketing',
  'Analytics',
  'Storage',
  'Utility'
];

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

const TYPE_OPTIONS = ['string', 'number', 'boolean', 'object', 'array'] as const;

const STEPS = [
  { id: 1, label: 'General', description: 'Identity & category' },
  { id: 2, label: 'Endpoint', description: 'URL & HTTP method' },
  { id: 3, label: 'Schema', description: 'Inputs & outputs' }
] as const;

export const ManualBuilderView: React.FC<ManualBuilderViewProps> = ({ onSave, isSaving }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Automation',
    icon: 'Globe',
    baseUrl: '',
    method: 'GET',
    inputs: [{ name: 'api_key', type: 'string', label: 'API Key', required: true }],
    outputs: [{ name: 'status', type: 'string', label: 'Status' }]
  });

  const addInput = () =>
    setFormData(prev => ({
      ...prev,
      inputs: [...prev.inputs, { name: '', type: 'string', label: '', required: false }]
    }));

  const removeInput = (index: number) =>
    setFormData(prev => ({
      ...prev,
      inputs: prev.inputs.filter((_, i) => i !== index)
    }));

  const updateInput = (index: number, patch: Partial<(typeof formData.inputs)[number]>) =>
    setFormData(prev => ({
      ...prev,
      inputs: prev.inputs.map((item, i) => (i === index ? { ...item, ...patch } : item))
    }));

  const addOutput = () =>
    setFormData(prev => ({
      ...prev,
      outputs: [...prev.outputs, { name: '', type: 'string', label: '' }]
    }));

  const removeOutput = (index: number) =>
    setFormData(prev => ({
      ...prev,
      outputs: prev.outputs.filter((_, i) => i !== index)
    }));

  const updateOutput = (index: number, patch: Partial<(typeof formData.outputs)[number]>) =>
    setFormData(prev => ({
      ...prev,
      outputs: prev.outputs.map((item, i) => (i === index ? { ...item, ...patch } : item))
    }));

  const canProceedStep1 = formData.name.trim().length > 0;
  const canProceedStep2 = formData.baseUrl.trim().length > 0;
  const canSubmit = canProceedStep1 && canProceedStep2 && !isSaving;

  const handleSave = async () => {
    if (!canSubmit) return;

    const ioSchema = {
      inputs: formData.inputs
        .filter(i => i.name.trim())
        .map(i => ({
          ...i,
          name: i.name.trim(),
          label: i.label.trim() || i.name.trim(),
          placeholder: `Enter ${i.label.trim() || i.name.trim()}`
        })),
      outputs: formData.outputs
        .filter(o => o.name.trim())
        .map(o => ({
          ...o,
          name: o.name.trim(),
          label: o.label.trim() || o.name.trim()
        }))
    };

    await onSave({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      category: formData.category,
      icon: formData.icon,
      ioSchema,
      config: {
        baseUrl: formData.baseUrl.trim(),
        method: formData.method
      },
      edgeFunctionLogic: `// Custom Endpoint Logic\nreturn await fetch(config.baseUrl + "?" + new URLSearchParams(params)).then(r => r.json());`
    });
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-950">
      {/* Stepper Bar */}
      <div className="px-6 py-3.5 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/40 flex items-center justify-center">
        <div className="flex items-center gap-2 sm:gap-4">
          {STEPS.map((s, idx) => {
            const isActive = step === s.id;
            const isCompleted = step > s.id;
            const isClickable =
              s.id < step || (s.id === 2 && canProceedStep1) || (s.id === 3 && canProceedStep1 && canProceedStep2);

            return (
              <React.Fragment key={s.id}>
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && setStep(s.id)}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left transition-colors',
                    isActive
                      ? 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xs'
                      : isClickable
                        ? 'hover:bg-zinc-100 dark:hover:bg-zinc-800/70 cursor-pointer'
                        : 'opacity-55 cursor-not-allowed'
                  )}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors',
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    )}
                  >
                    {isCompleted ? <Check size={12} strokeWidth={2.5} /> : s.id}
                  </div>
                  <div className="leading-tight">
                    <div
                      className={cn(
                        'text-xs font-medium',
                        isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'
                      )}
                    >
                      {s.label}
                    </div>
                  </div>
                </button>
                {idx < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'w-6 sm:w-10 h-px transition-colors',
                      step > s.id ? 'bg-emerald-400 dark:bg-emerald-500/60' : 'bg-zinc-200 dark:bg-zinc-800'
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Form Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="max-w-xl mx-auto space-y-5"
            >
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">General Information</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Name your custom integration and choose how it appears in your workspace.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Connector Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Internal Billing API"
                    autoFocus
                    className="w-full h-9 bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Description <span className="text-zinc-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Briefly describe what this endpoint does"
                    className="w-full h-9 bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Category
                    </label>
                    <div className="relative">
                      <select
                        value={formData.category}
                        onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full h-9 bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-3 pr-8 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all appearance-none"
                      >
                        {CATEGORY_OPTIONS.map(cat => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={14}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Icon
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {ICON_OPTIONS.slice(0, 6).map(iconName => {
                        const selected = formData.icon === iconName;
                        return (
                          <button
                            key={iconName}
                            type="button"
                            title={iconName}
                            onClick={() => setFormData(prev => ({ ...prev, icon: iconName }))}
                            className={cn(
                              'w-9 h-9 rounded-lg border flex items-center justify-center transition-all',
                              selected
                                ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400'
                                : 'bg-zinc-50/70 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700'
                            )}
                          >
                            <DynamicIcon name={iconName} size={15} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : step === 2 ? (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="max-w-xl mx-auto space-y-5"
            >
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Endpoint Configuration</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Specify the target URL and HTTP method for outgoing requests.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    HTTP Method
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {HTTP_METHODS.map(m => {
                      const active = formData.method === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, method: m }))}
                          className={cn(
                            'h-9 rounded-lg text-xs font-medium border transition-all',
                            active
                              ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/40 shadow-2xs'
                              : 'bg-zinc-50/70 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                          )}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Base URL <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="url"
                      value={formData.baseUrl}
                      onChange={e => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
                      placeholder="https://api.example.com/v1/resource"
                      autoFocus
                      className="w-full h-9 bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-9 pr-3 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                    />
                  </div>
                </div>

                {/* Live Request Preview */}
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 px-3 py-2.5 flex items-center gap-2.5">
                  <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold font-mono">
                    {formData.method}
                  </span>
                  <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400 truncate">
                    {formData.baseUrl.trim() || 'https://api.example.com/v1/resource'}
                  </span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="max-w-4xl mx-auto space-y-5"
            >
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Request & Response Schema</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Define the input parameters this endpoint accepts and the output fields returned for mapping.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Inputs */}
                <div className="rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Terminal size={13} />
                      </div>
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Input Parameters</h4>
                    </div>
                    <button
                      type="button"
                      onClick={addInput}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                    >
                      <Plus size={13} />
                      Add
                    </button>
                  </div>

                  {formData.inputs.length === 0 ? (
                    <div className="py-6 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                      No input parameters defined.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {formData.inputs.map((input, i) => (
                        <div
                          key={i}
                          className="p-3 bg-zinc-50/70 dark:bg-zinc-950 rounded-lg border border-zinc-200/80 dark:border-zinc-800 space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Key (e.g. user_id)"
                              value={input.name}
                              onChange={e => updateInput(i, { name: e.target.value })}
                              className="flex-1 h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
                            />
                            <select
                              value={input.type}
                              onChange={e => updateInput(i, { type: e.target.value })}
                              className="h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-500"
                            >
                              {TYPE_OPTIONS.map(t => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => removeInput(i)}
                              title="Remove parameter"
                              className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-md hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Display label (e.g. User ID)"
                              value={input.label}
                              onChange={e => updateInput(i, { label: e.target.value })}
                              className="flex-1 h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
                            />
                            <label className="inline-flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 px-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={Boolean(input.required)}
                                onChange={e => updateInput(i, { required: e.target.checked })}
                                className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              Required
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Outputs */}
                <div className="rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Database size={13} />
                      </div>
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Expected Outputs</h4>
                    </div>
                    <button
                      type="button"
                      onClick={addOutput}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                    >
                      <Plus size={13} />
                      Add
                    </button>
                  </div>

                  {formData.outputs.length === 0 ? (
                    <div className="py-6 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                      No output fields defined.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {formData.outputs.map((output, i) => (
                        <div
                          key={i}
                          className="p-3 bg-zinc-50/70 dark:bg-zinc-950 rounded-lg border border-zinc-200/80 dark:border-zinc-800 space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Path (e.g. data.total)"
                              value={output.name}
                              onChange={e => updateOutput(i, { name: e.target.value })}
                              className="flex-1 h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
                            />
                            <select
                              value={output.type}
                              onChange={e => updateOutput(i, { type: e.target.value })}
                              className="h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-500"
                            >
                              {TYPE_OPTIONS.map(t => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => removeOutput(i)}
                              title="Remove output"
                              className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-md hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Display label (e.g. Total Records)"
                            value={output.label}
                            onChange={e => updateOutput(i, { label: e.target.value })}
                            className="w-full h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="px-6 py-3.5 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/40 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep(s => Math.max(1, s - 1))}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            step > 1
              ? 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
              : 'opacity-0 pointer-events-none'
          )}
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-zinc-400 hidden sm:inline">Step {step} of 3</span>
          {step < 3 ? (
            <button
              type="button"
              disabled={(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)}
              onClick={() => setStep(s => Math.min(3, s + 1))}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-xs font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Continue
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSubmit}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Create Integration
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
