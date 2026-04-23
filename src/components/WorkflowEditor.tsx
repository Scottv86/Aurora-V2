import React from 'react';
import { 
  GitFork, 
  Plus, 
  Trash2, 
  GripVertical, 
  Activity, 
  Settings2,
  Zap,
  MessageSquare,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Workflow, WorkflowStep } from '../types/platform';

interface WorkflowEditorProps {
  workflow?: Workflow;
  onChange: (workflow: Workflow) => void;
}

export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({ workflow, onChange }) => {
  const steps = workflow?.steps || [];

  const addStep = () => {
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      name: 'New Status',
      type: 'MANUAL'
    };
    onChange({
      id: workflow?.id || `wf-${Date.now()}`,
      name: workflow?.name || 'Default Workflow',
      steps: [...steps, newStep]
    });
  };

  const updateStep = (id: string, updates: Partial<WorkflowStep>) => {
    const newSteps = steps.map(s => s.id === id ? { ...s, ...updates } : s);
    onChange({
      ...workflow!,
      steps: newSteps
    });
  };

  const removeStep = (id: string) => {
    const newSteps = steps.filter(s => s.id !== id);
    onChange({
      ...workflow!,
      steps: newSteps
    });
  };

  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      <div className="p-8 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
        <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                <GitFork size={20} />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Workflow Architect</h2>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Define the state machine and status transitions for this module.</p>
          </div>
          <button 
            onClick={addStep}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
          >
            <Plus size={18} />
            <span>Add Status</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto w-full space-y-4">
          <AnimatePresence mode="popLayout">
            {steps.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl flex flex-col items-center justify-center text-center"
              >
                <Activity size={48} className="text-zinc-300 dark:text-zinc-700 mb-4" />
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No Lifecycle Defined</h3>
                <p className="text-sm text-zinc-500 max-w-xs mt-2">Every module needs a journey. Start by adding statuses like "New", "In Progress", and "Completed".</p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:border-indigo-500/50 transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 text-zinc-400 cursor-grab active:cursor-grabbing">
                        <GripVertical size={18} />
                      </div>
                      
                      <div className="flex flex-col flex-1">
                        <input 
                          type="text"
                          value={step.name}
                          onChange={(e) => updateStep(step.id, { name: e.target.value })}
                          className="bg-transparent text-sm font-bold text-zinc-900 dark:text-white focus:outline-none placeholder:text-zinc-400"
                          placeholder="Status Name (e.g. Approved)"
                        />
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Type:</span>
                            <select 
                              value={step.type}
                              onChange={(e) => updateStep(step.id, { type: e.target.value as any })}
                              className="bg-transparent text-[10px] font-bold text-indigo-500 uppercase tracking-widest focus:outline-none cursor-pointer"
                            >
                              <option value="MANUAL">Manual Action</option>
                              <option value="AUTOMATED">Automated Step</option>
                              <option value="AI_ASSISTED">AI Assisted</option>
                            </select>
                          </div>
                          {index === 0 && (
                            <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded text-[8px] font-black uppercase tracking-widest">Default Entry</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-4 border-l border-zinc-100 dark:border-zinc-800">
                      <button className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                        <Settings2 size={16} />
                      </button>
                      <button 
                        onClick={() => removeStep(step.id)}
                        className="p-2 text-zinc-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

          {steps.length > 0 && (
            <div className="pt-8">
               <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3">
                    <Zap size={20} className="text-indigo-500" />
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Smart Orchestration</h4>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    You've defined a linear lifecycle. Aurora will automatically generate status badges and transition buttons in the record view based on these steps.
                  </p>
                  <div className="flex gap-4 pt-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                       <MessageSquare size={12} />
                       <span>Send Notification on Entry</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                       <Bot size={12} />
                       <span>Auto-Summarize on Exit</span>
                    </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
