import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Layers, 
  Check, 
  Sparkles, 
  Loader2, 
  User 
} from 'lucide-react';
import { EmailThread } from '../../../types/inbox';
import { InboxService } from '../../../services/inboxService';
import { usePlatform } from '../../../hooks/usePlatform';
import { toast } from 'sonner';

interface InboxConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  thread: EmailThread | null;
  onConvertedSuccess?: () => void;
}

export const InboxConvertModal: React.FC<InboxConvertModalProps> = ({
  isOpen,
  onClose,
  thread,
  onConvertedSuccess
}) => {
  const { tenant, modules } = usePlatform();
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [recordTitle, setRecordTitle] = useState('');
  const [recordDescription, setRecordDescription] = useState('');
  const [recordPriority, setRecordPriority] = useState('Medium');
  const [recordStatus, setRecordStatus] = useState('New');
  const [isExtractingAi, setIsExtractingAi] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available custom modules for conversion with guaranteed defaults
  const availableModules = useMemo(() => {
    const valid = (modules || []).filter((m: any) => m.type !== 'PAGE' && m.status !== 'ARCHIVED');
    if (valid.length > 0) return valid;
    return [
      { id: 'mod_support_tickets', name: 'Support Tickets', category: 'Customer Care' },
      { id: 'mod_applications', name: 'Applications & Leads', category: 'Sales' },
      { id: 'mod_licences', name: 'Licences & Contracts', category: 'Legal & Ops' },
      { id: 'mod_fleet', name: 'Fleet Management', category: 'Operations' }
    ];
  }, [modules]);

  useEffect(() => {
    if (availableModules.length > 0) {
      if (!selectedModuleId || !availableModules.some(m => m.id === selectedModuleId)) {
        setSelectedModuleId(availableModules[0].id);
      }
    }
  }, [availableModules, selectedModuleId]);

  useEffect(() => {
    if (thread) {
      setRecordTitle(thread.subject || '');
      setRecordDescription(thread.snippet || thread.messages?.[0]?.bodyText || '');
      if (thread.aiInsights?.urgencyScore && thread.aiInsights.urgencyScore >= 4) {
        setRecordPriority('High');
      }
    }
  }, [thread]);

  const handleAiExtract = async () => {
    if (!thread) return;
    try {
      setIsExtractingAi(true);
      const targetMod = availableModules.find(m => m.id === selectedModuleId);
      const modName = targetMod ? targetMod.name : 'Custom Record';

      const fields = await InboxService.extractRecordFieldsFromThread(
        thread,
        modName,
        ['title', 'description', 'priority', 'status']
      );

      if (fields) {
        if (fields.title) setRecordTitle(fields.title);
        if (fields.description) setRecordDescription(fields.description);
        if (fields.priority) setRecordPriority(fields.priority);
        if (fields.status) setRecordStatus(fields.status);
      }
      toast.success('AI successfully extracted structured fields from conversation!');
    } catch (_) {
      toast.error('Failed to extract fields with AI');
    } finally {
      setIsExtractingAi(false);
    }
  };

  const handleConvert = async () => {
    if (!selectedModuleId || !recordTitle.trim() || !thread) {
      toast.error('Please select a target module and enter a title');
      return;
    }

    try {
      setIsSubmitting(true);
      const targetMod = availableModules.find(m => m.id === selectedModuleId);
      const modName = targetMod ? targetMod.name : 'Module';

      await InboxService.convertEmailToRecord(
        thread,
        selectedModuleId,
        modName,
        {
          title: recordTitle.trim(),
          name: recordTitle.trim(),
          description: recordDescription.trim(),
          priority: recordPriority,
          status: recordStatus,
          senderName: thread.from?.name || '',
          senderEmail: thread.from?.address || '',
          source: 'EMAIL_INBOX',
          createdAt: new Date().toISOString()
        },
        tenant?.id
      );

      toast.success(`Successfully created and linked new record in "${modName}"!`);
      if (onConvertedSuccess) onConvertedSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to convert email to record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && thread && (
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
            className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden z-10"
          >
            
            {/* Header */}
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Convert Email to Record</h3>
                  <p className="text-xs text-zinc-500">Transform this email thread into an Aurora workspace record</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Body */}
            <div className="p-6 space-y-4 text-xs">
              
              {/* Target Module Picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                    Target Aurora Module *
                  </label>
                  <button
                    type="button"
                    onClick={handleAiExtract}
                    disabled={isExtractingAi}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-[11px] border border-zinc-200 dark:border-zinc-700/80 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isExtractingAi ? <Loader2 size={12} className="animate-spin text-zinc-500" /> : <Sparkles size={12} className="text-zinc-500" />}
                    <span>AI Auto-Extract Fields</span>
                  </button>
                </div>
            <select
              value={selectedModuleId}
              onChange={(e) => setSelectedModuleId(e.target.value)}
              className="w-full p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-500/20 cursor-pointer"
            >
              {availableModules.map(mod => (
                <option key={mod.id} value={mod.id}>
                  {mod.name} ({mod.category || 'Module'})
                </option>
              ))}
            </select>
          </div>

          {/* Record Title */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              Record Title / Subject *
            </label>
            <input
              type="text"
              value={recordTitle}
              onChange={(e) => setRecordTitle(e.target.value)}
              className="w-full p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
              placeholder="e.g. Enterprise SLA Request"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              Description / Notes
            </label>
            <textarea
              rows={3}
              value={recordDescription}
              onChange={(e) => setRecordDescription(e.target.value)}
              className="w-full p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-500/20 resize-none"
              placeholder="Extracted details from email..."
            />
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                Initial Status
              </label>
              <select
                value={recordStatus}
                onChange={(e) => setRecordStatus(e.target.value)}
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
              >
                <option value="New">New</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending Review">Pending Review</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                value={recordPriority}
                onChange={(e) => setRecordPriority(e.target.value)}
                className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Sender Entity Note */}
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl flex items-center gap-2.5 text-zinc-800 dark:text-zinc-200">
            <User size={15} className="shrink-0 text-zinc-500" />
            <div className="text-[11px] truncate">
              <span className="font-bold">Sender:</span> {thread.from.name} ({thread.from.address})
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleConvert}
            disabled={isSubmitting || !recordTitle.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            <span>Create & Link Record</span>
          </button>
        </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
