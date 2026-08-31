import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Edit3, Command, FileText, Check, Loader2, Sparkles } from 'lucide-react';
import { EmailSnippet } from '../../../types/inbox';
import { InboxService } from '../../../services/inboxService';
import { usePlatform } from '../../../hooks/usePlatform';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

interface InboxSnippetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSnippet?: (snippet: EmailSnippet) => void;
}

export const InboxSnippetsModal: React.FC<InboxSnippetsModalProps> = ({
  isOpen,
  onClose,
  onSelectSnippet
}) => {
  const { tenant } = usePlatform();
  const [snippets, setSnippets] = useState<EmailSnippet[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Partial<EmailSnippet> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadSnippets = async () => {
    try {
      setLoading(true);
      const list = await InboxService.getSnippets(tenant?.id);
      setSnippets(list);
    } catch (_) {
      toast.error('Failed to load snippets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSnippets();
      setEditingSnippet(null);
    }
  }, [isOpen, tenant?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSnippet?.title || !editingSnippet?.content) {
      toast.error('Title and content are required');
      return;
    }

    try {
      setIsSaving(true);
      await InboxService.saveSnippet(editingSnippet, tenant?.id);
      toast.success('Snippet saved successfully');
      setEditingSnippet(null);
      await loadSnippets();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save snippet');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this snippet?')) return;
    try {
      await InboxService.deleteSnippet(id, tenant?.id);
      toast.success('Snippet deleted');
      await loadSnippets();
    } catch (_) {
      toast.error('Failed to delete snippet');
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
                  <Command size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Canned Snippets & Slash Commands</h2>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Type <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono">/shortcut</code> in the email composer for instant response insertion.</p>
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
              {editingSnippet ? (
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Snippet Title</label>
                      <input
                        type="text"
                        required
                        value={editingSnippet.title || ''}
                        onChange={e => setEditingSnippet({ ...editingSnippet, title: e.target.value })}
                        placeholder="e.g. Schedule Call Link"
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                      />
                    </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Slash Shortcut</label>
                  <input
                    type="text"
                    required
                    value={editingSnippet.shortcut || ''}
                    onChange={e => {
                      let val = e.target.value;
                      if (!val.startsWith('/')) val = `/${val}`;
                      setEditingSnippet({ ...editingSnippet, shortcut: val });
                    }}
                    placeholder="/call"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-zinc-400 dark:focus:border-zinc-600 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Category</label>
                <input
                  type="text"
                  value={editingSnippet.category || 'General'}
                  onChange={e => setEditingSnippet({ ...editingSnippet, category: e.target.value })}
                  placeholder="Sales / Support / General"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Message Content</label>
                <textarea
                  required
                  rows={6}
                  value={editingSnippet.content || ''}
                  onChange={e => setEditingSnippet({ ...editingSnippet, content: e.target.value })}
                  placeholder="Type the message body here. Supports tokens like {{user.name}}..."
                  className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-zinc-400 dark:focus:border-zinc-600 resize-none font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSnippet(null)}
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
                  <span>Save Snippet</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Saved Snippets ({snippets.length})</span>
                <button
                  onClick={() => setEditingSnippet({ title: '', shortcut: '/', category: 'General', content: '' })}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-bold shadow-sm cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all"
                >
                  <Plus size={13} />
                  <span>Create Snippet</span>
                </button>
              </div>

              {loading ? (
                <div className="py-12 flex items-center justify-center text-zinc-400 gap-2 text-xs">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Loading snippets...</span>
                </div>
              ) : snippets.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 space-y-2">
                  <FileText size={24} className="mx-auto text-zinc-300 dark:text-zinc-700" />
                  <p className="text-xs font-medium">No snippets found. Create your first canned snippet to save time replying to frequent emails.</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                  {snippets.map(snip => (
                    <div
                      key={snip.id}
                      className="p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-all flex items-start justify-between gap-3 group"
                    >
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          if (onSelectSnippet) {
                            onSelectSnippet(snip);
                            onClose();
                          } else {
                            setEditingSnippet(snip);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-900 dark:text-white">{snip.title}</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono text-[10px] font-bold">
                            {snip.shortcut}
                          </span>
                          <span className="text-[10px] text-zinc-400 uppercase font-semibold">
                            {snip.category}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1 whitespace-pre-wrap">
                          {snip.content}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingSnippet(snip)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(snip.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={13} />
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
