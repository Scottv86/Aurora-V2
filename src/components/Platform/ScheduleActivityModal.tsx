import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Calendar, 
  Phone, 
  Mail, 
  CheckSquare, 
  FileText, 
  Clock, 
  User, 
  Loader2 
} from 'lucide-react';
import { ScheduledActivity, ScheduledActivityType } from '../../lib/workflowProcessUtils';
import { cn } from '../../lib/utils';

interface ScheduleActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordTitle?: string;
  onSchedule: (activity: ScheduledActivity) => Promise<void> | void;
  currentUserName?: string;
  currentUserId?: string;
  isSubmitting?: boolean;
}

const ACTIVITY_TYPES: { id: ScheduledActivityType; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'call', label: 'Call', icon: Phone, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
  { id: 'email', label: 'Email', icon: Mail, color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' },
  { id: 'meeting', label: 'Meeting', icon: Calendar, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' },
  { id: 'todo', label: 'To-Do', icon: CheckSquare, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  { id: 'document', label: 'Document', icon: FileText, color: 'text-violet-500 bg-violet-500/10 border-violet-500/20' }
];

export const ScheduleActivityModal: React.FC<ScheduleActivityModalProps> = ({
  isOpen,
  onClose,
  recordTitle,
  onSchedule,
  currentUserName,
  currentUserId,
  isSubmitting = false
}) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDueDate = tomorrow.toISOString().split('T')[0];

  const [type, setType] = useState<ScheduledActivityType>('call');
  const [summary, setSummary] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      setError('Please provide a summary for this activity.');
      return;
    }
    if (!dueDate) {
      setError('Please select a due date.');
      return;
    }

    const newActivity: ScheduledActivity = {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type,
      summary: summary.trim(),
      dueDate,
      assignedToName: currentUserName || 'Current User',
      assignedToId: currentUserId,
      note: note.trim() || undefined,
      done: false,
      createdAt: new Date().toISOString()
    };

    await onSchedule(newActivity);
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
          className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
                <Clock size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Schedule Follow-up Activity
                </h3>
                {recordTitle && (
                  <p className="text-xs text-zinc-500 truncate max-w-[240px]">
                    For: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{recordTitle}</span>
                  </p>
                )}
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

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
              {/* Activity Type Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Activity Type
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {ACTIVITY_TYPES.map(item => {
                    const Icon = item.icon;
                    const isSelected = type === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setType(item.id)}
                        className={cn(
                          "flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition-all cursor-pointer",
                          isSelected
                            ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20 shadow-xs"
                            : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                        )}
                      >
                        <Icon size={16} className={cn("mb-1", isSelected ? "text-indigo-500" : "text-zinc-400")} />
                        <span className="text-[10px] font-semibold">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Summary / Next Task <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={summary}
                  onChange={(e) => {
                    setSummary(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder={
                    type === 'call' 
                      ? 'e.g. Call client to discuss scope' 
                      : type === 'email' 
                      ? 'e.g. Send updated pricing proposal' 
                      : type === 'meeting' 
                      ? 'e.g. Review requirements kick-off' 
                      : 'e.g. Complete invoice review'
                  }
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              {/* Due Date & Assignee */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Due Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Assigned To
                  </label>
                  <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-700 dark:text-zinc-300">
                    <User size={13} className="text-zinc-400 shrink-0" />
                    <span className="truncate">{currentUserName || 'You'}</span>
                  </div>
                </div>
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Note / Log Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Additional context or talking points..."
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                />
              </div>

              {error && (
                <p className="text-xs text-rose-500 font-medium">{error}</p>
              )}
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
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Calendar size={13} />
                )}
                <span>Schedule Activity</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
