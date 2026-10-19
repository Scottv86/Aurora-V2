import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  StickyNote, 
  Bell, 
  Plus, 
  Pin, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Trash2, 
  Loader2, 
  Search, 
  X, 
  Copy, 
  Check, 
  Tag,
  ArrowRight,
  Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { UniversalNote } from '../../types/notes';
import { UniversalReminder } from '../../types/reminders';
import { NotesClientService } from '../../services/notesService';
import { RemindersClientService } from '../../services/remindersService';
import { useAuth } from '../../hooks/useAuth';
import { usePlatform } from '../../hooks/usePlatform';
import { UserAvatarWithPresence } from '../Common/UserPresenceBadge';

interface RecordNotesRemindersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  recordId: string;
  recordKey?: string;
  recordTitle?: string;
  moduleName?: string;
  moduleId?: string;
  tenantId?: string;
  onCountChange?: (count: number) => void;
}

type TabType = 'notes' | 'reminders';
type ReminderFilterType = 'ALL' | 'PENDING' | 'COMPLETED';

const SUGGESTED_TAGS = ['General', 'Meeting', 'Call', 'Important', 'Client Update', 'Follow-up'];

export const RecordNotesRemindersDrawer: React.FC<RecordNotesRemindersDrawerProps> = ({
  isOpen,
  onClose,
  recordId,
  recordKey,
  recordTitle,
  moduleName,
  moduleId,
  tenantId: propsTenantId,
  onCountChange,
}) => {
  const { session, user: authUser } = useAuth();
  const { tenant, user: platformUser, members } = usePlatform();
  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || '';
  const tenantId = propsTenantId || tenant?.id || '';

  const drawerRef = useRef<HTMLDivElement>(null);
  const noteBodyInputRef = useRef<HTMLTextAreaElement>(null);

  // Cached metadata for smooth exit animation
  const recordInfoRef = useRef({
    recordId,
    recordKey,
    recordTitle,
    moduleName,
    moduleId,
  });

  if (recordId) {
    recordInfoRef.current = {
      recordId,
      recordKey,
      recordTitle,
      moduleName,
      moduleId,
    };
  }

  const activeRecordId = recordId || recordInfoRef.current.recordId;
  const activeRecordKey = recordKey || recordInfoRef.current.recordKey;
  const activeRecordTitle = recordTitle || recordInfoRef.current.recordTitle;
  const activeModuleName = moduleName || recordInfoRef.current.moduleName;
  const activeModuleId = moduleId || recordInfoRef.current.moduleId;

  // View state
  const [activeTab, setActiveTab] = useState<TabType>('notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [reminderFilter, setReminderFilter] = useState<ReminderFilterType>('PENDING');

  // Data state
  const [notes, setNotes] = useState<UniversalNote[]>([]);
  const [reminders, setReminders] = useState<UniversalReminder[]>([]);
  const [loading, setLoading] = useState(true);

  // Note Composer state
  const [isNoteComposerExpanded, setIsNoteComposerExpanded] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [notePinned, setNotePinned] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  // Note Edit State
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteTitle, setEditNoteTitle] = useState('');
  const [editNoteBody, setEditNoteBody] = useState('');
  const [editNoteTags, setEditNoteTags] = useState<string[]>([]);
  const [editNoteCustomTag, setEditNoteCustomTag] = useState('');
  const [isSavingEditNote, setIsSavingEditNote] = useState(false);

  // Reminder Composer state
  const [isReminderComposerExpanded, setIsReminderComposerExpanded] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDesc, setReminderDesc] = useState('');
  const [reminderPreset, setReminderPreset] = useState<'tomorrow' | '3days' | '1week' | 'custom'>('tomorrow');
  const [customDue, setCustomDue] = useState('');
  const [reminderPriority, setReminderPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [isSubmittingReminder, setIsSubmittingReminder] = useState(false);

  // Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Load notes and reminders
  const loadData = async () => {
    if (!activeRecordId || !tenantId) return;
    try {
      setLoading(true);
      const [notesData, remindersData] = await Promise.all([
        NotesClientService.getNotes({ recordId: activeRecordId, moduleId: activeModuleId }, token, tenantId),
        RemindersClientService.getReminders({ recordId: activeRecordId, moduleId: activeModuleId }, token, tenantId),
      ]);
      setNotes(notesData || []);
      setReminders(remindersData || []);
    } catch (err) {
      console.error('Failed to load record notes & reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeRecordId && tenantId) {
      loadData();
    }
  }, [isOpen, activeRecordId, tenantId]);

  // Sync count to parent
  useEffect(() => {
    if (!loading) {
      onCountChange?.(notes.length + reminders.length);
    }
  }, [notes.length, reminders.length, loading, onCountChange]);

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    let result = [...notes];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n => 
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.body && n.body.toLowerCase().includes(q)) ||
        (n.tags && n.tags.some(t => t.toLowerCase().includes(q))) ||
        (n.authorName && n.authorName.toLowerCase().includes(q))
      );
    }
    // Sort pinned to the top, then newest
    return result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [notes, searchQuery]);

  // Filtered Reminders
  const filteredReminders = useMemo(() => {
    let result = [...reminders];
    if (reminderFilter === 'PENDING') {
      result = result.filter(r => r.status !== 'COMPLETED');
    } else if (reminderFilter === 'COMPLETED') {
      result = result.filter(r => r.status === 'COMPLETED');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.title.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.assignedToName && r.assignedToName.toLowerCase().includes(q))
      );
    }

    // Sort by due date (soonest / overdue first)
    return result.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  }, [reminders, reminderFilter, searchQuery]);

  const pendingRemindersCount = useMemo(() => {
    return reminders.filter(r => r.status !== 'COMPLETED').length;
  }, [reminders]);

  // Note Actions
  const handleCreateNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!noteBody.trim() || !tenantId) return;

    try {
      setIsSubmittingNote(true);
      const authorId = platformUser?.memberId || platformUser?.id || authUser?.id || session?.user?.id || 'anonymous';
      const authorName = platformUser?.name || (platformUser?.firstName ? `${platformUser.firstName} ${platformUser.lastName || ''}`.trim() : '') || authUser?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'User';
      const authorEmail = platformUser?.email || authUser?.email || session?.user?.email;
      const authorAvatar = platformUser?.avatarUrl || authUser?.user_metadata?.avatar_url || (authUser as any)?.avatarUrl;

      const created = await NotesClientService.createNote({
        title: noteTitle.trim() || undefined,
        body: noteBody.trim(),
        color: 'zinc',
        isPinned: notePinned,
        tags: selectedTags,
        recordId: activeRecordId,
        moduleId: activeModuleId,
        entityType: 'RECORD',
        entityId: activeRecordId,
        authorId,
        authorName,
        authorEmail,
        authorAvatar,
      }, token, tenantId);

      setNotes(prev => [created, ...prev]);
      setNoteTitle('');
      setNoteBody('');
      setSelectedTags([]);
      setNotePinned(false);
      setIsNoteComposerExpanded(false);
      toast.success('Note added to record');
    } catch (err) {
      console.error('Failed to create note:', err);
      toast.error('Failed to create note');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleTogglePin = async (noteId: string) => {
    if (!tenantId) return;
    try {
      const res = await NotesClientService.togglePin(noteId, token, tenantId);
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, isPinned: res.isPinned } : n));
      toast.success(res.isPinned ? 'Note pinned to top' : 'Note unpinned');
    } catch (_) {
      toast.error('Could not update pin state');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!tenantId) return;
    try {
      await NotesClientService.deleteNote(noteId, token, tenantId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      if (editingNoteId === noteId) {
        cancelEditingNote();
      }
      toast.success('Note deleted');
    } catch (_) {
      toast.error('Could not delete note');
    }
  };

  const startEditingNote = (note: UniversalNote) => {
    setEditingNoteId(note.id);
    setEditNoteTitle(note.title || '');
    setEditNoteBody(note.body || '');
    setEditNoteTags(note.tags || []);
    setEditNoteCustomTag('');
  };

  const cancelEditingNote = () => {
    setEditingNoteId(null);
    setEditNoteTitle('');
    setEditNoteBody('');
    setEditNoteTags([]);
    setEditNoteCustomTag('');
  };

  const handleSaveEditNote = async (noteId: string) => {
    if (!editNoteBody.trim() || !tenantId) return;
    try {
      setIsSavingEditNote(true);
      const lastEditedById = platformUser?.memberId || platformUser?.id || authUser?.id || session?.user?.id || 'anonymous';
      const lastEditedByName = platformUser?.name || (platformUser?.firstName ? `${platformUser.firstName} ${platformUser.lastName || ''}`.trim() : '') || authUser?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'User';
      const lastEditedByAvatar = platformUser?.avatarUrl || authUser?.user_metadata?.avatar_url || (authUser as any)?.avatarUrl;

      const updated = await NotesClientService.updateNote(noteId, {
        title: editNoteTitle.trim() || undefined,
        body: editNoteBody.trim(),
        tags: editNoteTags,
        lastEditedById,
        lastEditedByName,
        lastEditedByAvatar,
      }, token, tenantId);

      setNotes(prev => prev.map(n => n.id === noteId ? { 
        ...n, 
        ...updated, 
        title: editNoteTitle.trim() || undefined, 
        body: editNoteBody.trim(), 
        tags: editNoteTags,
        lastEditedById,
        lastEditedByName,
        lastEditedByAvatar,
        lastEditedAt: updated.lastEditedAt || new Date().toISOString(),
        updatedAt: updated.updatedAt || new Date().toISOString(),
      } : n));
      cancelEditingNote();
      toast.success('Note updated');
    } catch (err) {
      console.error('Failed to update note:', err);
      toast.error('Failed to update note');
    } finally {
      setIsSavingEditNote(false);
    }
  };

  const toggleEditTag = (tag: string) => {
    setEditNoteTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleAddEditCustomTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && editNoteCustomTag.trim()) {
      e.preventDefault();
      const newTag = editNoteCustomTag.trim();
      if (!editNoteTags.includes(newTag)) {
        setEditNoteTags([...editNoteTags, newTag]);
      }
      setEditNoteCustomTag('');
    }
  };

  const handleCopyNote = (note: UniversalNote) => {
    const textToCopy = `${note.title ? `${note.title}\n\n` : ''}${note.body}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedNoteId(note.id);
    toast.success('Note copied to clipboard');
    setTimeout(() => setCopiedNoteId(null), 2000);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && customTagInput.trim()) {
      e.preventDefault();
      const newTag = customTagInput.trim();
      if (!selectedTags.includes(newTag)) {
        setSelectedTags([...selectedTags, newTag]);
      }
      setCustomTagInput('');
    }
  };

  // Reminder Actions
  const handleCreateReminder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!reminderTitle.trim() || !tenantId) return;

    try {
      setIsSubmittingReminder(true);
      const targetDate = new Date();
      if (reminderPreset === 'tomorrow') {
        targetDate.setDate(targetDate.getDate() + 1);
        targetDate.setHours(9, 0, 0, 0);
      } else if (reminderPreset === '3days') {
        targetDate.setDate(targetDate.getDate() + 3);
        targetDate.setHours(9, 0, 0, 0);
      } else if (reminderPreset === '1week') {
        targetDate.setDate(targetDate.getDate() + 7);
        targetDate.setHours(9, 0, 0, 0);
      } else if (reminderPreset === 'custom' && customDue) {
        targetDate.setTime(new Date(customDue).getTime());
      } else {
        targetDate.setDate(targetDate.getDate() + 1);
        targetDate.setHours(9, 0, 0, 0);
      }

      const created = await RemindersClientService.createReminder({
        title: reminderTitle.trim(),
        description: reminderDesc.trim() || undefined,
        dueAt: targetDate.toISOString(),
        priority: reminderPriority,
        recordId: activeRecordId,
        moduleId: activeModuleId,
        entityType: 'RECORD',
        entityId: activeRecordId,
      }, token, tenantId);

      setReminders(prev => [created, ...prev]);
      setReminderTitle('');
      setReminderDesc('');
      setIsReminderComposerExpanded(false);
      toast.success('Follow-up scheduled');
    } catch (err) {
      console.error('Failed to schedule reminder:', err);
      toast.error('Failed to schedule follow-up');
    } finally {
      setIsSubmittingReminder(false);
    }
  };

  const handleToggleCompleteReminder = async (reminderId: string, currentStatus: string) => {
    if (!tenantId) return;
    try {
      const nextStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
      setReminders(prev => prev.map(r => r.id === reminderId ? { ...r, status: nextStatus } : r));
      await RemindersClientService.toggleComplete(reminderId, token, tenantId);
      toast.success(nextStatus === 'COMPLETED' ? 'Marked follow-up complete' : 'Follow-up reopened');
    } catch (_) {
      toast.error('Could not update reminder status');
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    if (!tenantId) return;
    try {
      await RemindersClientService.deleteReminder(reminderId, token, tenantId);
      setReminders(prev => prev.filter(r => r.id !== reminderId));
      toast.success('Follow-up removed');
    } catch (_) {
      toast.error('Could not delete follow-up');
    }
  };

  // Helper formatting for reminder due dates
  const formatDueDate = (isoString: string) => {
    const due = new Date(isoString);
    const now = new Date();
    const isOverdue = due.getTime() < now.getTime();
    
    // Check if today
    const isToday = due.toDateString() === now.toDateString();
    const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === due.toDateString();

    let text = '';
    if (isToday) {
      text = `Today at ${due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (isTomorrow) {
      text = `Tomorrow at ${due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      text = due.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    return { text, isOverdue, isToday };
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return { label: 'Urgent', bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' };
      case 'HIGH':
        return { label: 'High', bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
      case 'LOW':
        return { label: 'Low', bg: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700' };
      case 'MEDIUM':
      default:
        return { label: 'Medium', bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' };
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="notes-reminders-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          onClick={onClose}
          className="fixed inset-0 z-[99998] bg-zinc-950/60 backdrop-blur-xs cursor-pointer"
        />
      )}

      {isOpen && (
        <motion.div
          key="notes-reminders-panel"
          ref={drawerRef}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%', transition: { type: 'spring', damping: 30, stiffness: 300 } }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="fixed inset-y-0 right-0 z-[99999] w-full max-w-xl bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden"
        >
          {/* TOP HEADER */}
          <div className="p-5 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/60 flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <StickyNote size={18} />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                      Notes & Follow-Ups
                    </h2>
                    {activeTab === 'notes' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                        {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                        {pendingRemindersCount} pending
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {activeModuleName ? `${activeModuleName} • ` : ''}
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {activeRecordKey || activeRecordTitle || `Record #${String(activeRecordId || '').slice(0, 8)}`}
                    </span>
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
                  title="Close Drawer (Esc)"
                >
                  <X size={14} />
                  <span className="hidden sm:inline">Close</span>
                  <kbd className="hidden sm:inline text-[9px] px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-400 font-mono">Esc</kbd>
                </button>
              </div>
            </div>

            {/* TAB SELECTOR & SEARCH */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
              {/* Segmented Switcher */}
              <div className="flex items-center p-0.5 rounded-xl bg-zinc-200/70 dark:bg-zinc-800/80 text-xs font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('notes')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                    activeTab === 'notes'
                      ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  <StickyNote size={13} />
                  <span>Notes</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full",
                    activeTab === 'notes' ? "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold" : "bg-zinc-300/60 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                  )}>
                    {notes.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('reminders')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                    activeTab === 'reminders'
                      ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  <Bell size={13} />
                  <span>Follow-Ups</span>
                  {pendingRemindersCount > 0 && (
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                      activeTab === 'reminders' ? "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300" : "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                    )}>
                      {pendingRemindersCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative flex-1 min-w-0">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder={activeTab === 'notes' ? 'Search notes or tags...' : 'Search follow-ups...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-zinc-900 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* DRAWER BODY */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            
            {/* ======================= TAB 1: NOTES ======================= */}
            {activeTab === 'notes' && (
              <div className="space-y-4">
                
                {/* Note Quick Composer */}
                <div className={cn(
                  "rounded-2xl border transition-all duration-200 overflow-hidden",
                  isNoteComposerExpanded
                    ? "bg-white dark:bg-zinc-900 border-indigo-400/60 dark:border-indigo-500/40 shadow-md ring-1 ring-indigo-400/20"
                    : "bg-zinc-50/80 dark:bg-zinc-900/50 border-zinc-200/80 dark:border-zinc-800 hover:border-indigo-400/40"
                )}>
                  {!isNoteComposerExpanded ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsNoteComposerExpanded(true);
                        setTimeout(() => noteBodyInputRef.current?.focus(), 50);
                      }}
                      className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                          <Plus size={14} />
                        </div>
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200">
                          Add a record note, call summary, or memo...
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 opacity-80 group-hover:opacity-100 flex items-center gap-1">
                        Compose <ArrowRight size={11} />
                      </span>
                    </button>
                  ) : (
                    <form onSubmit={handleCreateNote} className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          placeholder="Note title (optional)..."
                          value={noteTitle}
                          onChange={(e) => setNoteTitle(e.target.value)}
                          className="w-full text-xs font-bold bg-transparent border-none text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setIsNoteComposerExpanded(false)}
                          className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <textarea
                        ref={noteBodyInputRef}
                        rows={3}
                        placeholder="Write your note here... (Markdown supported)"
                        value={noteBody}
                        onChange={(e) => setNoteBody(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            handleCreateNote();
                          }
                        }}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 resize-y leading-relaxed"
                      />

                      {/* Tag Selector */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Tag size={11} /> Tags
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {SUGGESTED_TAGS.map(tag => {
                            const isSelected = selectedTags.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                className={cn(
                                  "px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all cursor-pointer",
                                  isSelected
                                    ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
                                    : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                                )}
                              >
                                {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                              </button>
                            );
                          })}
                          <input
                            type="text"
                            placeholder="+ Custom tag (Press Enter)"
                            value={customTagInput}
                            onChange={(e) => setCustomTagInput(e.target.value)}
                            onKeyDown={handleAddCustomTag}
                            className="text-[10px] bg-transparent border-b border-dashed border-zinc-300 dark:border-zinc-700 px-1 py-0.5 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Bottom Controls: Pin, Cancel, Submit */}
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                        <div className="flex items-center gap-3">
                          {/* Pin Toggle */}
                          <button
                            type="button"
                            onClick={() => setNotePinned(!notePinned)}
                            className={cn(
                              "flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md transition-colors cursor-pointer",
                              notePinned
                                ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold"
                                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                            )}
                          >
                            <Pin size={11} className={notePinned ? "fill-current" : ""} />
                            <span>{notePinned ? 'Pinned' : 'Pin'}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsNoteComposerExpanded(false)}
                            className="px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmittingNote || !noteBody.trim()}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isSubmittingNote ? <Loader2 size={12} className="animate-spin" /> : <Plus size={13} />}
                            <span>Add Note</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>

                {/* Notes Feed */}
                {loading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400">
                    <Loader2 size={20} className="animate-spin text-indigo-500" />
                    <span className="text-xs">Loading record notes...</span>
                  </div>
                ) : filteredNotes.length === 0 ? (
                  <div className="py-12 px-4 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                      <StickyNote size={20} />
                    </div>
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white">
                      {searchQuery ? 'No matching notes found' : 'No notes attached yet'}
                    </h3>
                    <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                      {searchQuery 
                        ? 'Try modifying your search keywords or clearing the filter.' 
                        : 'Capture phone call takeaways, status updates, or context about this record.'}
                    </p>
                    {!isNoteComposerExpanded && !searchQuery && (
                      <button
                        type="button"
                        onClick={() => setIsNoteComposerExpanded(true)}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold border border-indigo-500/30 transition-colors cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Write First Note</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredNotes.map(note => {
                      const isEditing = editingNoteId === note.id;

                      if (isEditing) {
                        return (
                          <div
                            key={note.id}
                            className="rounded-2xl border p-4 bg-white dark:bg-zinc-900 border-indigo-400/60 dark:border-indigo-500/40 shadow-md ring-1 ring-indigo-400/20 space-y-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                                <Pencil size={12} className="text-indigo-500" /> Edit Note
                              </span>
                              <button
                                type="button"
                                onClick={cancelEditingNote}
                                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            </div>

                            <input
                              type="text"
                              placeholder="Note title (optional)..."
                              value={editNoteTitle}
                              onChange={(e) => setEditNoteTitle(e.target.value)}
                              className="w-full text-xs font-bold bg-transparent border-none text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
                            />

                            <textarea
                              rows={3}
                              value={editNoteBody}
                              onChange={(e) => setEditNoteBody(e.target.value)}
                              onKeyDown={(e) => {
                                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                  handleSaveEditNote(note.id);
                                }
                              }}
                              placeholder="Write your note here..."
                              className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 resize-y leading-relaxed"
                            />

                            {/* Tags in Edit Mode */}
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {SUGGESTED_TAGS.map(tag => {
                                  const isSelected = editNoteTags.includes(tag);
                                  return (
                                    <button
                                      key={tag}
                                      type="button"
                                      onClick={() => toggleEditTag(tag)}
                                      className={cn(
                                        "px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all cursor-pointer",
                                        isSelected
                                          ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
                                          : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                                      )}
                                    >
                                      {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                                    </button>
                                  );
                                })}
                                <input
                                  type="text"
                                  placeholder="+ Custom tag"
                                  value={editNoteCustomTag}
                                  onChange={(e) => setEditNoteCustomTag(e.target.value)}
                                  onKeyDown={handleAddEditCustomTag}
                                  className="text-[10px] bg-transparent border-b border-dashed border-zinc-300 dark:border-zinc-700 px-1 py-0.5 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-500"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                              <button
                                type="button"
                                onClick={cancelEditingNote}
                                className="px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditNote(note.id)}
                                disabled={isSavingEditNote || !editNoteBody.trim()}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                              >
                                {isSavingEditNote ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
                                <span>Save Changes</span>
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={note.id}
                          className={cn(
                            "group relative rounded-2xl border p-4 transition-all shadow-xs bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700",
                            note.isPinned && "border-indigo-400/50 dark:border-indigo-500/40 ring-1 ring-indigo-400/30"
                          )}
                        >
                          {/* Note Header */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {note.isPinned && (
                                <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                  <Pin size={10} className="fill-current" /> Pinned
                                </span>
                              )}
                              <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                {note.title || 'Untitled Note'}
                              </h4>
                            </div>

                            {/* Card Hover Action Buttons */}
                            <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => startEditingNote(note)}
                                className="p-1 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                title="Edit note"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyNote(note)}
                                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                title="Copy note text"
                              >
                                {copiedNoteId === note.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTogglePin(note.id)}
                                className={cn(
                                  "p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer",
                                  note.isPinned ? "text-indigo-500" : "text-zinc-400 hover:text-indigo-500"
                                )}
                                title={note.isPinned ? 'Unpin note' : 'Pin to top'}
                              >
                                <Pin size={12} className={note.isPinned ? "fill-current" : ""} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteNote(note.id)}
                                className="p-1 text-zinc-400 hover:text-rose-500 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                title="Delete note"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Note Body */}
                          <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed break-words font-normal">
                            {note.body}
                          </p>

                          {/* Tags */}
                          {note.tags && note.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2.5">
                              {note.tags.map(t => (
                                <span
                                  key={t}
                                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Note Footer: Created By & Last Updated By */}
                          {(() => {
                            const resolvedCreatorAvatar = 
                              note.authorAvatar || 
                              members?.find(m => 
                                (m.id && note.authorId === m.id) || 
                                (m.userId && note.authorId === m.userId) || 
                                (m.name && note.authorName && m.name.toLowerCase() === note.authorName.toLowerCase())
                              )?.avatarUrl ||
                              (platformUser?.avatarUrl && (
                                (platformUser.id && note.authorId === platformUser.id) ||
                                (platformUser.memberId && note.authorId === platformUser.memberId) ||
                                (platformUser.name && note.authorName && platformUser.name.toLowerCase() === note.authorName.toLowerCase())
                              ) ? platformUser.avatarUrl : undefined) ||
                              authUser?.user_metadata?.avatar_url;

                            const isEdited = Boolean(
                              note.lastEditedAt || 
                              note.lastEditedByName || 
                              (note.metadata && (note.metadata.lastEditedAt || note.metadata.lastEditedByName)) ||
                              (note.updatedAt && note.createdAt && new Date(note.updatedAt).getTime() - new Date(note.createdAt).getTime() > 10000)
                            );

                            const lastEditorName = 
                              note.lastEditedByName || 
                              note.metadata?.lastEditedByName || 
                              note.authorName || 
                              'Team Member';

                            const lastEditorId = 
                              note.lastEditedById || 
                              note.metadata?.lastEditedById;

                            const resolvedEditorAvatar = 
                              note.lastEditedByAvatar || 
                              note.metadata?.lastEditedByAvatar || 
                              members?.find(m => 
                                (m.id && lastEditorId === m.id) || 
                                (m.userId && lastEditorId === m.userId) || 
                                (m.name && lastEditorName && m.name.toLowerCase() === lastEditorName.toLowerCase())
                              )?.avatarUrl ||
                              (platformUser?.avatarUrl && (
                                (platformUser.id && lastEditorId === platformUser.id) ||
                                (platformUser.memberId && lastEditorId === platformUser.memberId) ||
                                (platformUser.name && lastEditorName && platformUser.name.toLowerCase() === lastEditorName.toLowerCase())
                              ) ? platformUser.avatarUrl : undefined);

                            const lastEditedDate = 
                              note.lastEditedAt || 
                              note.metadata?.lastEditedAt || 
                              note.updatedAt;

                            return (
                              <div className="pt-2.5 mt-2.5 border-t border-zinc-100 dark:border-zinc-800/60 text-[10px] space-y-1.5">
                                {/* Created By Row */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-zinc-400 dark:text-zinc-500 shrink-0">Created by</span>
                                    <UserAvatarWithPresence
                                      avatarUrl={resolvedCreatorAvatar}
                                      name={note.authorName || 'Author'}
                                      size="xs"
                                      showPresence={false}
                                    />
                                    <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate">
                                      {note.authorName || 'Team Member'}
                                    </span>
                                  </div>
                                  <span 
                                    className="text-zinc-400 dark:text-zinc-500 shrink-0" 
                                    title={new Date(note.createdAt).toLocaleString()}
                                  >
                                    {new Date(note.createdAt).toLocaleDateString([], { 
                                      month: 'short', 
                                      day: 'numeric', 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </span>
                                </div>

                                {/* Last Updated By Row (Shown if edited) */}
                                {isEdited && (
                                  <div className="flex items-center justify-between gap-2 text-zinc-400 dark:text-zinc-500">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="text-zinc-400 dark:text-zinc-500 shrink-0">Updated by</span>
                                      <UserAvatarWithPresence
                                        avatarUrl={resolvedEditorAvatar}
                                        name={lastEditorName}
                                        size="xs"
                                        showPresence={false}
                                      />
                                      <span className="font-medium text-zinc-600 dark:text-zinc-400 truncate">
                                        {lastEditorName}
                                      </span>
                                    </div>
                                    <span 
                                      className="shrink-0" 
                                      title={new Date(lastEditedDate).toLocaleString()}
                                    >
                                      {new Date(lastEditedDate).toLocaleDateString([], { 
                                        month: 'short', 
                                        day: 'numeric', 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      })}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ======================= TAB 2: REMINDERS ======================= */}
            {activeTab === 'reminders' && (
              <div className="space-y-4">
                
                {/* Follow-Up Quick Scheduler */}
                <div className={cn(
                  "rounded-2xl border transition-all duration-200 overflow-hidden",
                  isReminderComposerExpanded
                    ? "bg-white dark:bg-zinc-900 border-indigo-400/60 dark:border-indigo-500/40 shadow-md ring-1 ring-indigo-400/20"
                    : "bg-zinc-50/80 dark:bg-zinc-900/50 border-zinc-200/80 dark:border-zinc-800 hover:border-indigo-400/40"
                )}>
                  {!isReminderComposerExpanded ? (
                    <button
                      type="button"
                      onClick={() => setIsReminderComposerExpanded(true)}
                      className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                          <Plus size={14} />
                        </div>
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200">
                          Schedule a follow-up task or reminder...
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 opacity-80 group-hover:opacity-100 flex items-center gap-1">
                        Schedule <ArrowRight size={11} />
                      </span>
                    </button>
                  ) : (
                    <form onSubmit={handleCreateReminder} className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                          <Bell size={13} className="text-indigo-500" /> New Follow-Up
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsReminderComposerExpanded(false)}
                          className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="What needs to be followed up? (e.g. Call client for quote approval)..."
                        value={reminderTitle}
                        onChange={(e) => setReminderTitle(e.target.value)}
                        className="w-full text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-indigo-500"
                      />

                      <textarea
                        rows={2}
                        placeholder="Additional details or notes (optional)..."
                        value={reminderDesc}
                        onChange={(e) => setReminderDesc(e.target.value)}
                        className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-indigo-500 resize-y"
                      />

                      {/* Due Preset Selector */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                          <Clock size={11} /> When is it due?
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {[
                            { id: 'tomorrow', label: 'Tomorrow 9 AM' },
                            { id: '3days', label: 'In 3 Days' },
                            { id: '1week', label: 'Next Week' },
                            { id: 'custom', label: 'Custom Date' }
                          ].map(preset => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => setReminderPreset(preset.id as any)}
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                                reminderPreset === preset.id
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                  : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                              )}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        {reminderPreset === 'custom' && (
                          <div className="pt-1">
                            <input
                              type="datetime-local"
                              value={customDue}
                              onChange={(e) => setCustomDue(e.target.value)}
                              className="w-full text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        )}
                      </div>

                      {/* Priority and Submit */}
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                        {/* Priority Selector */}
                        <div className="flex items-center gap-1">
                          {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map(p => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setReminderPriority(p)}
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer border",
                                reminderPriority === p
                                  ? getPriorityBadge(p).bg
                                  : "bg-transparent border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                              )}
                            >
                              {p.charAt(0) + p.slice(1).toLowerCase()}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsReminderComposerExpanded(false)}
                            className="px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmittingReminder || !reminderTitle.trim()}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isSubmittingReminder ? <Loader2 size={12} className="animate-spin" /> : <Plus size={13} />}
                            <span>Schedule Follow-Up</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>

                {/* Sub-Filter Tabs for Reminders */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    {[
                      { id: 'PENDING', label: 'Pending' },
                      { id: 'COMPLETED', label: 'Completed' },
                      { id: 'ALL', label: 'All' },
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setReminderFilter(f.id as any)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer",
                          reminderFilter === f.id
                            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold"
                            : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reminders Feed */}
                {loading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400">
                    <Loader2 size={20} className="animate-spin text-indigo-500" />
                    <span className="text-xs">Loading follow-ups...</span>
                  </div>
                ) : filteredReminders.length === 0 ? (
                  <div className="py-12 px-4 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                      <Bell size={20} />
                    </div>
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white">
                      {reminderFilter === 'COMPLETED' ? 'No completed tasks' : 'No pending follow-ups'}
                    </h3>
                    <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                      {reminderFilter === 'COMPLETED'
                        ? 'Completed follow-up reminders will appear here for audit history.'
                        : 'Schedule reminders so your team never drops the ball on this record.'}
                    </p>
                    {!isReminderComposerExpanded && reminderFilter !== 'COMPLETED' && (
                      <button
                        type="button"
                        onClick={() => setIsReminderComposerExpanded(true)}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold border border-indigo-500/30 transition-colors cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Schedule Follow-Up</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredReminders.map(rem => {
                      const isCompleted = rem.status === 'COMPLETED';
                      const { text: dueFormatted, isOverdue, isToday } = formatDueDate(rem.dueAt);
                      const priorityConfig = getPriorityBadge(rem.priority);

                      return (
                        <div
                          key={rem.id}
                          className={cn(
                            "group relative flex items-start gap-3 p-3.5 rounded-2xl border transition-all shadow-xs",
                            isCompleted
                              ? "bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200/50 dark:border-zinc-800/50 opacity-70"
                              : "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-900/50"
                          )}
                        >
                          {/* Completion Checkbox */}
                          <button
                            type="button"
                            onClick={() => handleToggleCompleteReminder(rem.id, rem.status)}
                            className="mt-0.5 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer shrink-0"
                            title={isCompleted ? 'Reopen follow-up' : 'Mark completed'}
                          >
                            {isCompleted ? (
                              <CheckCircle2 size={18} className="text-emerald-500 fill-emerald-500/20" />
                            ) : (
                              <Circle size={18} className="hover:scale-110 transition-transform" />
                            )}
                          </button>

                          {/* Content */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className={cn(
                                "text-xs font-bold truncate",
                                isCompleted
                                  ? "line-through text-zinc-400 dark:text-zinc-500"
                                  : "text-zinc-900 dark:text-white"
                              )}>
                                {rem.title}
                              </h4>

                              {/* Priority Badge */}
                              <span className={cn(
                                "text-[9px] font-bold px-1.5 py-0.2 rounded-md border shrink-0",
                                priorityConfig.bg
                              )}>
                                {priorityConfig.label}
                              </span>
                            </div>

                            {rem.description && (
                              <p className={cn(
                                "text-xs leading-relaxed",
                                isCompleted ? "text-zinc-400 dark:text-zinc-500 line-through" : "text-zinc-600 dark:text-zinc-300"
                              )}>
                                {rem.description}
                              </p>
                            )}

                            {/* Metadata Footer: Due Date & Origin */}
                            <div className="flex items-center justify-between text-[10px] pt-1 text-zinc-400">
                              <div className="flex items-center gap-1.5">
                                <Clock size={11} className={!isCompleted && isOverdue ? "text-rose-500" : ""} />
                                <span className={cn(
                                  !isCompleted && isOverdue && "text-rose-600 dark:text-rose-400 font-bold",
                                  !isCompleted && isToday && "text-amber-600 dark:text-amber-400 font-bold"
                                )}>
                                  {!isCompleted && isOverdue ? `Overdue • ${dueFormatted}` : dueFormatted}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {rem.originWorkflowId && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium">
                                    Workflow
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteReminder(rem.id)}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-400 hover:text-rose-500 transition-opacity cursor-pointer"
                                  title="Delete follow-up"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
