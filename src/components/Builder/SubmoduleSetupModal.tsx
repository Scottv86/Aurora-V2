import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Database, PlusCircle, ArrowLeft, ArrowRight, Check, Layers, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface SubmoduleSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  modules: any[];
  currentModuleId: string;
  onComplete: (targetModuleId: string) => void;
  tenantId: string;
  token: string;
  DATA_API_URL: string;
}

type Step = 'source' | 'configure' | 'confirm';
type SourceType = 'existing' | 'new';

const COMMON_ICONS = [
  { name: 'CheckSquare', label: 'Tasks' },
  { name: 'FileText', label: 'Documents' },
  { name: 'Users', label: 'Teams' },
  { name: 'Calendar', label: 'Events' },
  { name: 'Tag', label: 'Tags' },
  { name: 'Activity', label: 'Logs' },
  { name: 'ClipboardList', label: 'List' },
  { name: 'Layers', label: 'Collection' }
];

export const SubmoduleSetupModal: React.FC<SubmoduleSetupModalProps> = ({
  isOpen,
  onClose,
  modules,
  currentModuleId,
  onComplete,
  tenantId,
  token,
  DATA_API_URL
}) => {
  const [step, setStep] = useState<Step>('source');
  const [sourceType, setSourceType] = useState<SourceType | null>(null);
  
  // Selection / Form states
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleIcon, setNewModuleIcon] = useState('Layers');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter out current parent module and match search query
  const eligibleModules = useMemo(() => {
    return modules
      .filter(m => m.id !== currentModuleId)
      .filter(m => m.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [modules, currentModuleId, searchQuery]);

  const handleReset = () => {
    setStep('source');
    setSourceType(null);
    setSelectedModuleId('');
    setNewModuleName('');
    setNewModuleIcon('Layers');
    setSearchQuery('');
    setIsProcessing(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleNext = () => {
    if (step === 'source') {
      if (!sourceType) return;
      setStep('configure');
    } else if (step === 'configure') {
      if (sourceType === 'existing' && !selectedModuleId) {
        toast.error('Please select an existing module');
        return;
      }
      if (sourceType === 'new' && !newModuleName.trim()) {
        toast.error('Please enter a name for the new module');
        return;
      }
      setStep('confirm');
    }
  };

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('configure');
    } else if (step === 'configure') {
      setStep('source');
    }
  };

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      if (sourceType === 'existing') {
        onComplete(selectedModuleId);
        toast.success('Collection linked successfully!');
        handleClose();
      } else {
        // API Call to create new module
        const payload = {
          name: newModuleName.trim(),
          description: `Nested collection created via parent module`,
          category: 'Custom',
          iconName: newModuleIcon,
          type: 'RECORD',
          status: 'ACTIVE',
          enabled: true,
          layout: [
            {
              id: 'name',
              type: 'text',
              label: 'Name',
              placeholder: 'Name',
              required: true,
              colSpan: 12
            }
          ],
          config: {
            titleFieldId: 'name',
            subtitleFieldIds: []
          },
          tabs: [
            { id: 'default-tab', label: 'General' }
          ],
          forms: [
            {
              id: 'default-form',
              name: 'Default Form',
              isMutiStep: false,
              steps: [
                { id: 'step-1', title: 'Step 1', fields: ['name'] }
              ]
            }
          ]
        };

        const response = await fetch(`${DATA_API_URL}/modules`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenantId
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to create module');
        }

        const savedModule = await response.json();
        onComplete(savedModule.id);
        toast.success(`Module "${savedModule.name}" created and nested successfully!`);
        handleClose();
      }
    } catch (error: any) {
      console.error('Error in submodule setup:', error);
      toast.error(error.message || 'Configuration failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedModuleName = useMemo(() => {
    if (sourceType === 'existing') {
      return modules.find(m => m.id === selectedModuleId)?.name || '';
    }
    return newModuleName;
  }, [sourceType, selectedModuleId, newModuleName, modules]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl h-[70vh] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between z-20">
              <div className="flex items-center gap-4">
                {step !== 'source' ? (
                  <button
                    onClick={handleBack}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800 text-zinc-400 hover:text-indigo-600 hover:border-indigo-500/20 transition-all"
                  >
                    <ArrowLeft size={16} />
                  </button>
                ) : (
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
                    <Layers size={20} />
                  </div>
                )}
                <div>
                  <h2 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                    {step === 'source' ? 'Sub-module Setup' :
                     step === 'configure' ? (sourceType === 'existing' ? 'Choose Existing Module' : 'Configure New Module') :
                     'Confirm Configuration'}
                  </h2>
                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                    {step === 'source' ? 'Link existing data or bootstrap a new submodule' :
                     step === 'configure' ? 'Provide mapping specifications' :
                     'Review setup before completing'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="px-8 pt-4 pb-2 flex items-center gap-4">
              <div className="flex-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden relative">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{ width: step === 'source' ? '33.33%' : step === 'configure' ? '66.66%' : '100%' }}
                />
              </div>
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">
                {step === 'source' ? 'Step 1 of 3' : step === 'configure' ? 'Step 2 of 3' : 'Step 3 of 3'}
              </span>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden relative p-8">
              <AnimatePresence mode="wait">
                {step === 'source' && (
                  <motion.div
                    key="source"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="h-full flex flex-col gap-6 justify-center"
                  >
                    <div className="grid grid-cols-2 gap-6">
                      {/* Path A: Link Existing */}
                      <button
                        onClick={() => {
                          setSourceType('existing');
                          setStep('configure');
                        }}
                        className={cn(
                          "group relative flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-900/40 border rounded-[1.5rem] hover:border-indigo-500/50 transition-all overflow-hidden text-center",
                          sourceType === 'existing' ? 'border-indigo-600 bg-indigo-50/10' : 'border-zinc-200 dark:border-zinc-800'
                        )}
                      >
                        <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 group-hover:text-indigo-600 shadow-sm mb-4 transition-all group-hover:scale-110">
                          <Database size={24} />
                        </div>
                        <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-1">Link Existing Module</h3>
                        <p className="text-[10px] text-zinc-500 leading-relaxed max-w-[200px]">Link records from a module already present in the workspace.</p>
                      </button>

                      {/* Path B: Quick Create */}
                      <button
                        onClick={() => {
                          setSourceType('new');
                          setStep('configure');
                        }}
                        className={cn(
                          "group relative flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-900/40 border rounded-[1.5rem] hover:border-indigo-500/50 transition-all overflow-hidden text-center",
                          sourceType === 'new' ? 'border-indigo-600 bg-indigo-50/10' : 'border-zinc-200 dark:border-zinc-800'
                        )}
                      >
                        <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 group-hover:text-indigo-600 shadow-sm mb-4 transition-all group-hover:scale-110">
                          <PlusCircle size={24} />
                        </div>
                        <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-1">Quick Create New</h3>
                        <p className="text-[10px] text-zinc-500 leading-relaxed max-w-[200px]">Spin up a brand new module inline pre-configured with basic fields.</p>
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 'configure' && sourceType === 'existing' && (
                  <motion.div
                    key="configure-existing"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="h-full flex flex-col gap-4"
                  >
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Search modules..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-55 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>

                    <div className="flex-1 overflow-y-auto border border-zinc-250 dark:border-zinc-850 rounded-xl divide-y divide-zinc-200 dark:divide-zinc-900 max-h-[30vh]">
                      {eligibleModules.length > 0 ? (
                        eligibleModules.map(m => (
                          <button
                            key={m.id}
                            onClick={() => setSelectedModuleId(m.id)}
                            className={cn(
                              "w-full px-4 py-3 flex items-center justify-between text-left text-xs font-medium transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/30",
                              selectedModuleId === m.id ? 'bg-indigo-500/5 text-indigo-600' : 'text-zinc-700 dark:text-zinc-300'
                            )}
                          >
                            <span>{m.name}</span>
                            {selectedModuleId === m.id && <Check size={14} className="text-indigo-500 shrink-0" />}
                          </button>
                        ))
                      ) : (
                        <div className="p-8 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">No modules found</div>
                      )}
                    </div>
                  </motion.div>
                )}

                {step === 'configure' && sourceType === 'new' && (
                  <motion.div
                    key="configure-new"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="h-full flex flex-col gap-6"
                  >
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">Module Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Sub-tasks, Relatives, Deliverables..."
                        value={newModuleName}
                        onChange={(e) => setNewModuleName(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all animate-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1 block">Choose Icon</label>
                      <div className="grid grid-cols-4 gap-3">
                        {COMMON_ICONS.map(ico => (
                          <button
                            key={ico.name}
                            onClick={() => setNewModuleIcon(ico.name)}
                            type="button"
                            className={cn(
                              "p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all",
                              newModuleIcon === ico.name 
                                ? 'border-indigo-500 bg-indigo-50/10 text-indigo-500' 
                                : 'border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-600'
                            )}
                          >
                            <Layers size={16} />
                            <span className="text-[8px] font-bold uppercase tracking-wider">{ico.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 'confirm' && (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="h-full flex flex-col justify-center items-center text-center gap-4"
                  >
                    <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/5">
                      <Sparkles size={28} className="animate-pulse" />
                    </div>
                    <div className="space-y-2 max-w-md">
                      <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">Ready to Link Sub-module</h3>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        {sourceType === 'existing' ? (
                          <>You are linking the existing module <strong>{selectedModuleName}</strong> to this submodule field.</>
                        ) : (
                          <>We will bootstrap a new custom module named <strong>{selectedModuleName}</strong> and establish the parent relationship.</>
                        )}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Loader overlay */}
              <AnimatePresence>
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-[99]"
                  >
                    <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest animate-pulse">Setting up relationship...</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-end gap-3 bg-zinc-50/50 dark:bg-transparent">
              <button
                onClick={handleClose}
                className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              
              {step !== 'confirm' ? (
                <button
                  onClick={handleNext}
                  disabled={(step === 'source' && !sourceType) || (step === 'configure' && sourceType === 'existing' && !selectedModuleId) || (step === 'configure' && sourceType === 'new' && !newModuleName.trim())}
                  className="px-5 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-xs font-bold hover:bg-indigo-600 dark:hover:bg-white hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-md"
                >
                  <span>Continue</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-500/10"
                >
                  <span>Complete Setup</span>
                  <Check size={14} />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
