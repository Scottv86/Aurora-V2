import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, 
  Sparkles, 
  Clock, 
  X, 
  Send, 
  Trash2, 
  Edit3, 
  Check, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useDigitalTwin } from '../../context/DigitalTwinContext';

export const MorningHandoverModal: React.FC = () => {
  const { 
    digest, 
    isHandoverOpen, 
    setIsHandoverOpen, 
    approveOrRejectDraft,
    setPresenceStatus
  } = useDigitalTwin();

  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');

  const handleApprove = async (draftId: string, customContent?: string) => {
    await approveOrRejectDraft(draftId, 'APPROVE', customContent);
    setEditingDraftId(null);
  };

  const handleReject = async (draftId: string) => {
    await approveOrRejectDraft(draftId, 'REJECT');
  };

  const handleBackToWork = async () => {
    await setPresenceStatus('AVAILABLE');
    setIsHandoverOpen(false);
  };

  return (
    <AnimatePresence>
      {isHandoverOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-8">
          {/* Motion Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsHandoverOpen(false)}
            className="fixed inset-0 bg-zinc-950/70 backdrop-blur-xl"
          />

          {/* Premium Modal Dialog */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-[2rem] shadow-2xl shadow-indigo-500/10 w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden"
          >

        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Sun size={22} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                Good Morning Handover Digest
                <span className="text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Twin Summary
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Here is what your Digital Twin accomplished while you were away</p>
            </div>
          </div>
          <button 
            onClick={() => setIsHandoverOpen(false)}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Overview Stats Cards */}
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Pings Triaged</div>
            <div className="text-xl font-extrabold text-zinc-900 dark:text-white mt-1">{digest.totalPingsTriaged}</div>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Auto-Executed</div>
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{digest.tasksCompletedCount}</div>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Pending Sign-offs</div>
            <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">{digest.pendingApprovalsCount}</div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Section 1: Pending Draft Sign-offs */}
          <div>
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles size={14} className="text-indigo-500" />
              Response Drafts Awaiting Your Approval ({digest.pendingDrafts.length})
            </h3>

            {digest.pendingDrafts.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
                All response drafts have been approved or processed!
              </div>
            ) : (
              <div className="space-y-4">
                {digest.pendingDrafts.map((draft) => (
                  <div key={draft.id} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/50 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{draft.targetChannel}</span>
                      <span className="text-[10px] text-zinc-400">{new Date(draft.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 text-xs">
                      <span className="font-bold text-zinc-500">Incoming Ping: </span>
                      <span className="text-zinc-800 dark:text-zinc-200 italic">"{draft.incomingPrompt}"</span>
                    </div>

                    {/* Draft Content or Edit Box */}
                    {editingDraftId === draft.id ? (
                      <textarea
                        rows={3}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-indigo-500 rounded-lg text-zinc-900 dark:text-white"
                      />
                    ) : (
                      <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
                        {draft.draftedResponse}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleReject(draft.id)}
                        className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        Discard
                      </button>

                      {editingDraftId === draft.id ? (
                        <button
                          onClick={() => handleApprove(draft.id, editText)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Check size={12} />
                          Save & Send
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingDraftId(draft.id);
                              setEditText(draft.draftedResponse);
                            }}
                            className="px-3 py-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Edit3 size={12} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleApprove(draft.id)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm shadow-indigo-500/20"
                          >
                            <Send size={12} />
                            Approve & Send
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Recent Activity Timeline */}
          <div>
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock size={14} className="text-zinc-400" />
              Recent Twin Activity Log
            </h3>
            <div className="space-y-2">
              {digest.logs.slice(0, 4).map((log) => (
                <div key={log.id} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck size={16} className={log.status === 'COMPLETED' ? 'text-emerald-500' : 'text-amber-500'} />
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-white">{log.title}</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{log.description}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                    {(log.confidenceScore * 100).toFixed(0)}% Match
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex justify-between items-center">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Ready to resume your shift?</span>
          <button
            onClick={handleBackToWork}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
          >
            Switch Status to Available
            <ArrowRight size={14} />
          </button>
        </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
