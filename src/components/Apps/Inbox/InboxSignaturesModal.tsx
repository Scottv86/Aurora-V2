import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Edit3, PenTool, Check, Loader2, Mail } from 'lucide-react';
import { EmailSignature, EmailAccount } from '../../../types/inbox';
import { InboxService } from '../../../services/inboxService';
import { usePlatform } from '../../../hooks/usePlatform';
import { toast } from 'sonner';

interface InboxSignaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: EmailAccount[];
}

export const InboxSignaturesModal: React.FC<InboxSignaturesModalProps> = ({
  isOpen,
  onClose,
  accounts
}) => {
  const { tenant } = usePlatform();
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingSig, setEditingSig] = useState<Partial<EmailSignature> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadSignatures = async () => {
    try {
      setLoading(true);
      const list = await InboxService.getSignatures(tenant?.id);
      setSignatures(list);
    } catch (_) {
      toast.error('Failed to load signatures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSignatures();
      setEditingSig(null);
    }
  }, [isOpen, tenant?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSig?.name || !editingSig?.contentHtml) {
      toast.error('Name and signature HTML content are required');
      return;
    }

    try {
      setIsSaving(true);
      await InboxService.saveSignature({
        ...editingSig,
        contentText: editingSig.contentHtml.replace(/<[^>]*>?/gm, '')
      }, tenant?.id);
      toast.success('Signature saved');
      setEditingSig(null);
      await loadSignatures();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save signature');
    } finally {
      setIsSaving(false);
    }
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
            className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] z-10"
          >
            
            {/* Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center border border-zinc-200 dark:border-zinc-700/60 shadow-sm">
                  <PenTool size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Email Signatures</h2>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Configure corporate branding and per-account signatures.</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {editingSig ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Signature Name</label>
                  <input
                    type="text"
                    required
                    value={editingSig.name || ''}
                    onChange={e => setEditingSig({ ...editingSig, name: e.target.value })}
                    placeholder="e.g. Standard Sales Signature"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Apply to Account</label>
                  <select
                    value={editingSig.accountId || ''}
                    onChange={e => setEditingSig({ ...editingSig, accountId: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                  >
                    <option value="">All Accounts (Default)</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">HTML Signature Template</label>
                  <button
                    type="button"
                    onClick={() => setEditingSig({
                      ...editingSig,
                      contentHtml: `<div style="font-family: sans-serif; font-size: 13px; color: #374151; margin-top: 16px; border-top: 1px solid #E5E7EB; padding-top: 10px;">
  <strong>{{user.name}}</strong><br/>
  <span style="color: #6B7280;">{{tenant.name}} Operations</span><br/>
  <a href="https://aurora.internal" style="color: #4F46E5; text-decoration: none;">aurora.internal</a>
</div>`
                    })}
                    className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 hover:underline cursor-pointer"
                  >
                    Insert Corporate Template
                  </button>
                </div>
                <textarea
                  required
                  rows={6}
                  value={editingSig.contentHtml || ''}
                  onChange={e => setEditingSig({ ...editingSig, contentHtml: e.target.value })}
                  placeholder="<div><strong>Your Name</strong><br/>Company Details</div>"
                  className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-zinc-400 dark:focus:border-zinc-600 font-mono resize-none"
                />
              </div>

              {/* Live Preview */}
              {editingSig.contentHtml && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Signature Preview</label>
                  <div 
                    className="p-3 bg-zinc-50 dark:bg-zinc-950/50 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-xs"
                    dangerouslySetInnerHTML={{ __html: editingSig.contentHtml }}
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSig(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Save Signature</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Active Signatures ({signatures.length})</span>
                <button
                  onClick={() => setEditingSig({ name: '', accountId: '', isDefault: true, contentHtml: '' })}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-bold shadow-sm cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all"
                >
                  <Plus size={13} />
                  <span>New Signature</span>
                </button>
              </div>

              {loading ? (
                <div className="py-12 flex items-center justify-center text-zinc-400 gap-2 text-xs">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Loading signatures...</span>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                  {signatures.map(sig => (
                    <div
                      key={sig.id}
                      className="p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-all flex items-start justify-between gap-3 group"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-900 dark:text-white">{sig.name}</span>
                          {sig.accountId ? (
                            <span className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px]">
                              {accounts.find(a => a.id === sig.accountId)?.name || 'Linked Account'}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] font-medium">
                              All Accounts
                            </span>
                          )}
                        </div>
                        <div 
                          className="mt-2 text-xs opacity-80"
                          dangerouslySetInnerHTML={{ __html: sig.contentHtml }}
                        />
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingSig(sig)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
