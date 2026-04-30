import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Sparkles, 
  Check, 
  ChevronRight, 
  Type, 
  Hash, 
  Calendar, 
  CheckSquare, 
  Layout, 
  Loader2,
  Info,
  Link
} from 'lucide-react';
import { clsx } from 'clsx';

interface FieldCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (field: any) => Promise<void>;
  sampleValue: any;
  suggestedName: string;
  sourceField?: {
    name: string;
    label: string;
  };
}

const FIELD_TYPES = [
  { id: 'text', label: 'Short Text', icon: Type, description: 'Best for names, titles, and brief descriptions.' },
  { id: 'number', label: 'Number', icon: Hash, description: 'Best for counts, ages, or any numeric values.' },
  { id: 'date', label: 'Date', icon: Calendar, description: 'Best for birthdays, deadlines, or timestamps.' },
  { id: 'checkbox', label: 'Boolean / Toggle', icon: CheckSquare, description: 'Best for yes/no or true/false values.' },
  { id: 'longText', label: 'Long Text', icon: Layout, description: 'Best for notes, addresses, or detailed descriptions.' },
];

export const FieldCreationModal: React.FC<FieldCreationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  sampleValue,
  suggestedName,
  sourceField
}) => {
  const [name, setName] = useState(suggestedName);
  const [type, setType] = useState('text');
  const [isSaving, setIsSaving] = useState(false);
  const [inferenceActive, setInferenceActive] = useState(false);

  // AI Inference Logic
  useEffect(() => {
    if (isOpen) {
      setInferenceActive(true);
      const timer = setTimeout(() => {
        // Simple inference logic
        if (typeof sampleValue === 'number') setType('number');
        else if (typeof sampleValue === 'boolean') setType('checkbox');
        else if (String(sampleValue).match(/^\d{4}-\d{2}-\d{2}/)) setType('date');
        else if (String(sampleValue).length > 100) setType('longText');
        else setType('text');
        setInferenceActive(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isOpen, sampleValue]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        id: name.toLowerCase().replace(/\s+/g, '_'),
        label: name,
        type: type,
        required: false
      });
      onClose();
    } catch (err) {
      console.error("Failed to create field:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/40 backdrop-blur-md pointer-events-auto"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-4xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-[40px] shadow-2xl overflow-hidden flex flex-col pointer-events-auto h-[80vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-200/50 dark:border-zinc-800/50 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white uppercase tracking-tight">Create New Field</h2>
                  <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-0.5">Nexus AI Schema Architect</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleSave}
                  disabled={isSaving || !name}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Create & Map Field
                </button>
                <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Left: Input & Details */}
                <div className="lg:col-span-7 space-y-10">
                  {/* Field Name */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Field Label</label>
                    <input 
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Street Address"
                      className="w-full bg-white/50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-6 py-4 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-zinc-900 dark:text-white"
                    />
                  </div>

                  {/* Suggested Type */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Inferred Schema Type</label>
                      {inferenceActive && (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-500 uppercase tracking-widest animate-pulse">
                          <Sparkles size={12} className="animate-spin-slow" />
                          Analyzing Pattern...
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2">
                      {FIELD_TYPES.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setType(f.id)}
                          className={clsx(
                            "flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group",
                            type === f.id 
                              ? "bg-indigo-500/10 border-indigo-500/50" 
                              : "bg-transparent border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700"
                          )}
                        >
                          <div className={clsx(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                            type === f.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                          )}>
                            <f.icon size={20} />
                          </div>
                          <div className="flex-1">
                            <p className={clsx(
                              "text-sm font-bold transition-colors",
                              type === f.id ? "text-zinc-900 dark:text-white" : "text-zinc-600 dark:text-zinc-400"
                            )}>{f.label}</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5">{f.description}</p>
                          </div>
                          {type === f.id && (
                            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                              <Check size={14} />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Context & Preview */}
                <div className="lg:col-span-5 space-y-8">
                  <div className="p-6 bg-zinc-50/50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-4">
                    <div className="flex items-center gap-2">
                      <Info size={14} className="text-indigo-500" />
                      <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Nexus Context</h3>
                    </div>
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">API Source Identity</p>
                      <div className="flex items-center gap-3 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                          <Link size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-900 dark:text-white">{sourceField?.label || sourceField?.name || 'Unknown Output'}</p>
                          <p className="text-[9px] font-mono text-indigo-500 font-bold uppercase">{sourceField?.name}</p>
                        </div>
                      </div>
                      
                      <p className="text-[10px] font-bold text-zinc-500 uppercase mt-4">Sample Data Preview</p>
                      <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl">
                        <code className="text-xs font-mono text-indigo-500 dark:text-indigo-400 break-all">
                          {JSON.stringify(sampleValue)}
                        </code>
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-relaxed italic">
                        The Architect has analyzed this value and suggested the most efficient field type for your module.
                      </p>
                    </div>
                  </div>

                  <div className="p-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl text-center space-y-2">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Field Preview</p>
                    <div className="flex flex-col items-center gap-3 pt-2">
                      <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-500/20">
                         {(() => {
                           const Icon = FIELD_TYPES.find(f => f.id === type)?.icon;
                           return Icon ? <Icon size={24} /> : null;
                         })()}
                      </div>
                      <span className="text-sm font-bold text-zinc-900 dark:text-white">{name || 'Unnamed Field'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
