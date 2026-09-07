import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Zap, 
  Plus, 
  Trash2, 
  ArrowRight
} from 'lucide-react';
import { EmailRule } from '../../../types/inbox';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

interface InboxRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InboxRulesModal: React.FC<InboxRulesModalProps> = ({
  isOpen,
  onClose
}) => {
  const [rules, setRules] = useState<EmailRule[]>([
    {
      id: 'rule_1',
      name: 'Enterprise VIP Routing',
      condition: { field: 'subject', operator: 'contains', value: 'Enterprise' },
      actions: { applyLabel: 'Enterprise', assignTo: 'Sarah Jenkins', triggerWorkflow: true },
      enabled: true
    },
    {
      id: 'rule_2',
      name: 'Urgent Support Escalation',
      condition: { field: 'subject', operator: 'contains', value: 'URGENT' },
      actions: { applyLabel: 'High Priority', assignTo: 'AI Triage Agent', triggerWorkflow: true },
      enabled: true
    }
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [field, setField] = useState<'subject' | 'from' | 'body'>('subject');
  const [operator, setOperator] = useState<'contains' | 'equals'>('contains');
  const [value, setValue] = useState('');
  const [applyLabel, setApplyLabel] = useState('High Priority');
  const [assignTo, setAssignTo] = useState('AI Triage Agent');

  const handleToggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    toast.success('Rule updated');
  };

  const handleDeleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    toast.success('Rule deleted');
  };

  const handleCreateRule = () => {
    if (!newRuleName.trim() || !value.trim()) {
      toast.error('Please enter a rule name and condition value');
      return;
    }

    const newRule: EmailRule = {
      id: `rule_${Date.now()}`,
      name: newRuleName.trim(),
      condition: { field, operator, value: value.trim() },
      actions: { applyLabel, assignTo, triggerWorkflow: true },
      enabled: true
    };

    setRules(prev => [...prev, newRule]);
    setIsAdding(false);
    setNewRuleName('');
    setValue('');
    toast.success(`Rule "${newRule.name}" created!`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10"
          >
            
            {/* Header */}
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <Zap size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Inbox Automations & Rules</h3>
                  <p className="text-xs text-zinc-500">Automatically tag, route, and trigger workflows on incoming emails</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Rules List / Form */}
            <div className="p-6 space-y-4 text-xs overflow-y-auto custom-scrollbar flex-1">
              
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-700 dark:text-zinc-300 text-[11px] uppercase tracking-wider">
                  Active Rules ({rules.length})
                </span>
                <button
                  onClick={() => setIsAdding(!isAdding)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-bold text-xs border border-zinc-200 dark:border-zinc-700/80 transition-all cursor-pointer"
                >
                  <Plus size={13} />
                  <span>{isAdding ? 'Cancel' : 'New Rule'}</span>
                </button>
              </div>

              {/* Rules List */}
              <div className="space-y-2">
                {rules.map(rule => (
                  <div 
                    key={rule.id}
                    className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900 dark:text-white truncate text-xs">{rule.name}</span>
                        <span className={cn(
                          "text-[9px] px-1.5 py-0.2 rounded font-bold uppercase",
                          rule.enabled 
                            ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" 
                            : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                        )}>
                          {rule.enabled ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500 flex-wrap">
                        <span>If {rule.condition.field} {rule.condition.operator} "{rule.condition.value}"</span>
                        <ArrowRight size={11} />
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                          Add label "{rule.actions.applyLabel}" & Assign to {rule.actions.assignTo}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleToggleRule(rule.id)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                          rule.enabled 
                            ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300" 
                            : "bg-emerald-600 hover:bg-emerald-500 text-white"
                        )}
                      >
                        {rule.enabled ? 'Pause' : 'Enable'}
                      </button>

                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Rule Form */}
              {isAdding && (
                <div className="p-4 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-2xl space-y-3 animate-in fade-in duration-150">
                  <div className="font-bold text-zinc-900 dark:text-white text-xs">Create New Rule</div>
                  
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 mb-1">Rule Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Inbound Lead Assignment"
                      value={newRuleName}
                      onChange={(e) => setNewRuleName(e.target.value)}
                      className="w-full p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-zinc-500 mb-1">Field</label>
                      <select
                        value={field}
                        onChange={(e) => setField(e.target.value as any)}
                        className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs cursor-pointer"
                      >
                        <option value="subject">Subject</option>
                        <option value="from">Sender (From)</option>
                        <option value="body">Body text</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-zinc-500 mb-1">Operator</label>
                      <select
                        value={operator}
                        onChange={(e) => setOperator(e.target.value as any)}
                        className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs cursor-pointer"
                      >
                        <option value="contains">Contains</option>
                        <option value="equals">Exact match</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-zinc-500 mb-1">Value keyword</label>
                      <input
                        type="text"
                        placeholder="Keyword..."
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-semibold text-zinc-500 mb-1">Apply Label</label>
                      <input
                        type="text"
                        value={applyLabel}
                        onChange={(e) => setApplyLabel(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-zinc-500 mb-1">Assign Agent</label>
                      <input
                        type="text"
                        value={assignTo}
                        onChange={(e) => setAssignTo(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleCreateRule}
                    className="w-full py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-xs hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all cursor-pointer shadow-sm"
                  >
                    Save Automation Rule
                  </button>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-end shrink-0">
              <button
                onClick={onClose}
                className="px-5 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-xl transition-all cursor-pointer text-xs"
              >
                Done
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
