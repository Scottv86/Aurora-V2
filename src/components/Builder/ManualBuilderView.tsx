import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Shield, Database, Plus, Trash2, ArrowRight, ArrowLeft, Terminal, Save, Check, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ManualBuilderViewProps {
  onSave: (connector: any) => Promise<void>;
  isSaving: boolean;
}

export const ManualBuilderView: React.FC<ManualBuilderViewProps> = ({ onSave, isSaving }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Automation',
    icon: 'Globe',
    baseUrl: '',
    method: 'GET',
    inputs: [{ name: 'api_key', type: 'string', label: 'API Key', required: true }],
    outputs: [{ name: 'status', type: 'string', label: 'Status' }]
  });

  const addInput = () => setFormData(prev => ({ 
    ...prev, 
    inputs: [...prev.inputs, { name: '', type: 'string', label: '', required: false }] 
  }));

  const removeInput = (index: number) => setFormData(prev => ({ 
    ...prev, 
    inputs: prev.inputs.filter((_, i) => i !== index) 
  }));

  const addOutput = () => setFormData(prev => ({ 
    ...prev, 
    outputs: [...prev.outputs, { name: '', type: 'string', label: '' }] 
  }));

  const removeOutput = (index: number) => setFormData(prev => ({ 
    ...prev, 
    outputs: prev.outputs.filter((_, i) => i !== index) 
  }));

  const handleSave = async () => {
    const ioSchema = {
      inputs: formData.inputs.filter(i => i.name).map(i => ({ ...i, placeholder: `Enter ${i.label}` })),
      outputs: formData.outputs.filter(o => o.name)
    };

    await onSave({
      name: formData.name,
      category: formData.category,
      icon: formData.icon,
      ioSchema,
      config: {
        baseUrl: formData.baseUrl,
        method: formData.method
      },
      edgeFunctionLogic: `// Manual Builder Logic\nreturn await fetch(config.baseUrl + "?" + new URLSearchParams(params)).then(r => r.json());`
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Steps Indicator */}
      <div className="px-12 py-6 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-transparent flex items-center justify-center gap-12">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all",
              step === s ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 scale-110" : 
              step > s ? "bg-emerald-500 text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400"
            )}>
              {step > s ? <Check size={14} /> : s}
            </div>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest",
              step === s ? "text-zinc-900 dark:text-white" : "text-zinc-400"
            )}>
              {s === 1 ? 'General' : s === 2 ? 'Requests' : 'Schema'}
            </span>
            {s < 3 && <div className="w-12 h-px bg-zinc-200 dark:bg-zinc-800" />}
          </div>
        ))}
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-xl mx-auto space-y-8"
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Connector Name</label>
                  <input 
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. My Custom API"
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Category</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all appearance-none shadow-sm"
                    >
                      <option>Automation</option>
                      <option>Marketing</option>
                      <option>Finance</option>
                      <option>Utility</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Icon Reference</label>
                    <div className="relative">
                      <input 
                        type="text"
                        value={formData.icon}
                        onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                      />
                      <Globe size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : step === 2 ? (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Base URL</label>
                  <div className="relative">
                    <input 
                      type="text"
                      value={formData.baseUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
                      placeholder="https://api.example.com/v1"
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                    />
                    <Shield size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">HTTP Method</label>
                  <div className="flex gap-4">
                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, method: m }))}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-[10px] font-black transition-all border",
                          formData.method === m ? "bg-indigo-600 text-white border-indigo-600" : "bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto space-y-12"
            >
              <div className="grid grid-cols-2 gap-12">
                {/* Inputs */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <Terminal size={14} className="text-indigo-500" />
                      <h4 className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">Input Parameters</h4>
                    </div>
                    <button type="button" onClick={addInput} className="text-indigo-500 hover:text-indigo-600 transition-colors">
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.inputs.map((input, i) => (
                      <div key={i} className="flex gap-3 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                        <div className="flex-1 space-y-3">
                          <input 
                            type="text"
                            placeholder="Name (e.g. user_id)"
                            value={input.name}
                            onChange={(e) => {
                              const newInputs = [...formData.inputs];
                              newInputs[i].name = e.target.value;
                              setFormData(prev => ({ ...prev, inputs: newInputs }));
                            }}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs"
                          />
                          <input 
                            type="text"
                            placeholder="Label (e.g. User ID)"
                            value={input.label}
                            onChange={(e) => {
                              const newInputs = [...formData.inputs];
                              newInputs[i].label = e.target.value;
                              setFormData(prev => ({ ...prev, inputs: newInputs }));
                            }}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs"
                          />
                        </div>
                        <button type="button" onClick={() => removeInput(i)} className="text-zinc-400 hover:text-rose-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Outputs */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <Database size={14} className="text-emerald-500" />
                      <h4 className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">Expected Outputs</h4>
                    </div>
                    <button type="button" onClick={addOutput} className="text-emerald-500 hover:text-emerald-600 transition-colors">
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.outputs.map((output, i) => (
                      <div key={i} className="flex gap-3 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                        <div className="flex-1 space-y-3">
                          <input 
                            type="text"
                            placeholder="Key (e.g. data.total)"
                            value={output.name}
                            onChange={(e) => {
                              const newOutputs = [...formData.outputs];
                              newOutputs[i].name = e.target.value;
                              setFormData(prev => ({ ...prev, outputs: newOutputs }));
                            }}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs"
                          />
                          <input 
                            type="text"
                            placeholder="Label (e.g. Total Records)"
                            value={output.label}
                            onChange={(e) => {
                              const newOutputs = [...formData.outputs];
                              newOutputs[i].label = e.target.value;
                              setFormData(prev => ({ ...prev, outputs: newOutputs }));
                            }}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs"
                          />
                        </div>
                        <button type="button" onClick={() => removeOutput(i)} className="text-zinc-400 hover:text-rose-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Nav */}
      <div className="p-8 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-transparent flex justify-between">
        <button
          type="button"
          onClick={() => setStep(s => Math.max(1, s - 1))}
          className={cn(
            "flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
            step > 1 ? "text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-900" : "opacity-0 pointer-events-none"
          )}
        >
          <ArrowLeft size={14} />
          Back
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep(s => Math.min(3, s + 1))}
            className="flex items-center gap-2 px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
          >
            Continue
            <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !formData.name}
            className="flex items-center gap-2 px-10 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Forge Connector
          </button>
        )}
      </div>
    </div>
  );
};
