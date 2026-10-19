import React, { useState, useEffect } from 'react';
import { 
  StickyNote, 
  Bell, 
  Plus, 
  Pin, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Trash2,
  Loader2
} from 'lucide-react';
import { UniversalNote } from '../../types/notes';
import { UniversalReminder } from '../../types/reminders';
import { NotesClientService } from '../../services/notesService';
import { RemindersClientService } from '../../services/remindersService';
import { useAuth } from '../../hooks/useAuth';
import { usePlatform } from '../../hooks/usePlatform';
import { UserAvatarWithPresence } from '../Common/UserPresenceBadge';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
export { RecordNotesRemindersDrawer } from './RecordNotesRemindersDrawer';

interface RecordNotesRemindersTabProps {
  recordId: string;
  moduleId: string;
  tenantId: string;
  recordTitle?: string;
}

export const RecordNotesRemindersTab: React.FC<RecordNotesRemindersTabProps> = ({
  recordId,
  moduleId,
  tenantId,
  recordTitle = 'Record'
}) => {
  const { session, user: authUser } = useAuth();
  const { user: platformUser, members } = usePlatform();
  const token = session?.access_token;

  const [activeTab, setActiveTab] = useState<'notes' | 'reminders'>('notes');
  const [notes, setNotes] = useState<UniversalNote[]>([]);
  const [reminders, setReminders] = useState<UniversalReminder[]>([]);
  const [loading, setLoading] = useState(true);

  // New Note Form
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteColor, setNoteColor] = useState('zinc');
  const [notePinned, setNotePinned] = useState(false);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // New Reminder Form
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDueOffset, setReminderDueOffset] = useState<'tomorrow' | '3days' | '1week' | 'custom'>('tomorrow');
  const [customDue, setCustomDue] = useState('');
  const [reminderPriority, setReminderPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [isSubmittingReminder, setIsSubmittingReminder] = useState(false);

  const loadData = async () => {
    if (!recordId || !tenantId) return;
    try {
      setLoading(true);
      const [notesData, remindersData] = await Promise.all([
        NotesClientService.getNotes({ recordId, moduleId }, token, tenantId),
        RemindersClientService.getReminders({ recordId, moduleId }, token, tenantId),
      ]);
      setNotes(notesData);
      setReminders(remindersData);
    } catch (err) {
      console.error('Failed to load record notes & reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [recordId, tenantId, token]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
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
        color: noteColor,
        isPinned: notePinned,
        recordId,
        moduleId,
        entityType: 'RECORD',
        entityId: recordId,
        authorId,
        authorName,
        authorEmail,
        authorAvatar,
      }, token, tenantId);

      setNotes([created, ...notes]);
      setNoteTitle('');
      setNoteBody('');
      setNotePinned(false);
      toast.success('Note attached to record');
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
    } catch (_) {}
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!tenantId) return;
    try {
      await NotesClientService.deleteNote(noteId, token, tenantId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      toast.success('Note removed');
    } catch (_) {}
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderTitle.trim() || !tenantId) return;

    try {
      setIsSubmittingReminder(true);
      const now = new Date();
      if (reminderDueOffset === 'tomorrow') {
        now.setDate(now.getDate() + 1);
        now.setHours(9, 0, 0, 0);
      } else if (reminderDueOffset === '3days') {
        now.setDate(now.getDate() + 3);
        now.setHours(9, 0, 0, 0);
      } else if (reminderDueOffset === '1week') {
        now.setDate(now.getDate() + 7);
        now.setHours(9, 0, 0, 0);
      } else if (reminderDueOffset === 'custom' && customDue) {
        now.setTime(new Date(customDue).getTime());
      }

      const created = await RemindersClientService.createReminder({
        title: reminderTitle.trim(),
        dueAt: now.toISOString(),
        priority: reminderPriority,
        recordId,
        moduleId,
        entityType: 'RECORD',
        entityId: recordId,
      }, token, tenantId);

      setReminders([created, ...reminders]);
      setReminderTitle('');
      toast.success('Follow-up reminder scheduled');
    } catch (err) {
      console.error('Failed to schedule reminder:', err);
      toast.error('Failed to schedule reminder');
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
      toast.success(nextStatus === 'COMPLETED' ? 'Reminder completed' : 'Reminder reopened');
    } catch (_) {}
  };

  const handleDeleteReminder = async (reminderId: string) => {
    if (!tenantId) return;
    try {
      await RemindersClientService.deleteReminder(reminderId, token, tenantId);
      setReminders(prev => prev.filter(r => r.id !== reminderId));
      toast.success('Reminder removed');
    } catch (_) {}
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
      
      {/* Sub-Tabs Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('notes')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
              activeTab === 'notes'
                ? "bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            <StickyNote size={14} />
            <span>Notes ({notes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reminders')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
              activeTab === 'reminders'
                ? "bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            <Bell size={14} />
            <span>Follow-Ups ({reminders.filter(r => r.status !== 'COMPLETED').length})</span>
          </button>
        </div>

        <span className="text-[10px] text-zinc-400">Linked to {recordTitle}</span>
      </div>

      {/* Body Content */}
      <div className="flex-1 flex flex-col p-4 overflow-y-auto custom-scrollbar space-y-4">
        
        {/* TAB 1: NOTES */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            
            {/* Quick Add Note Form */}
            <form onSubmit={handleCreateNote} className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2.5">
              <input
                type="text"
                placeholder="Note title (optional)..."
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="w-full text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
              />

              <textarea
                placeholder="Log internal note, phone call highlights, or next steps..."
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                rows={2}
                className="w-full text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
              />

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <select
                    value={noteColor}
                    onChange={(e) => setNoteColor(e.target.value)}
                    className="text-[11px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  >
                    <option value="zinc">Neutral (Zinc)</option>
                    <option value="yellow">Attention (Yellow)</option>
                    <option value="blue">Info (Blue)</option>
                    <option value="emerald">Positive (Green)</option>
                    <option value="purple">Priority (Purple)</option>
                    <option value="amber">Warning (Amber)</option>
                    <option value="rose">Urgent (Rose)</option>
                  </select>

                  <label className="flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notePinned}
                      onChange={(e) => setNotePinned(e.target.checked)}
                      className="rounded text-amber-500"
                    />
                    <span>Pin to top</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingNote || !noteBody.trim()}
                  className="flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Attach Note</span>
                </button>
              </div>
            </form>

            {/* Notes List */}
            {loading ? (
              <div className="py-8 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                <Loader2 size={13} className="animate-spin text-amber-500" />
                <span>Loading notes...</span>
              </div>
            ) : notes.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-6">No notes recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {notes.map(note => (
                  <div
                    key={note.id}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all relative group",
                      note.isPinned
                        ? "border-amber-400 dark:border-amber-800/80 bg-amber-500/5 dark:bg-amber-950/20 shadow-sm"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        {note.isPinned && <Pin size={11} className="text-amber-500 fill-amber-500" />}
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                          {note.title || 'Note'}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={() => handleTogglePin(note.id)}
                          className="p-1 text-zinc-400 hover:text-amber-500 cursor-pointer"
                          title={note.isPinned ? 'Unpin' : 'Pin to top'}
                        >
                          <Pin size={12} className={note.isPinned ? 'fill-current text-amber-500' : ''} />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1 text-zinc-400 hover:text-rose-500 cursor-pointer"
                          title="Delete note"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {note.body}
                    </p>

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
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REMINDERS / FOLLOW-UPS */}
        {activeTab === 'reminders' && (
          <div className="space-y-4">
            
            {/* Quick Schedule Reminder Form */}
            <form onSubmit={handleCreateReminder} className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2.5">
              <input
                type="text"
                placeholder="What needs to be followed up? (e.g. Call client back)..."
                value={reminderTitle}
                onChange={(e) => setReminderTitle(e.target.value)}
                className="w-full text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-900 dark:text-white focus:outline-none focus:border-purple-500"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  {[
                    { id: 'tomorrow', label: 'Tomorrow' },
                    { id: '3days', label: 'In 3 Days' },
                    { id: '1week', label: 'In 1 Week' },
                    { id: 'custom', label: 'Custom' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setReminderDueOffset(p.id as any)}
                      className={cn(
                        "px-2 py-0.5 rounded text-[11px] font-medium border cursor-pointer",
                        reminderDueOffset === p.id
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}

                  {reminderDueOffset === 'custom' && (
                    <input
                      type="datetime-local"
                      value={customDue}
                      onChange={(e) => setCustomDue(e.target.value)}
                      className="text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-0.5"
                    />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={reminderPriority}
                    onChange={(e) => setReminderPriority(e.target.value as any)}
                    className="text-[11px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>

                  <button
                    type="submit"
                    disabled={isSubmittingReminder || !reminderTitle.trim()}
                    className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Set Follow-Up</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Reminders List */}
            {reminders.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-6">No scheduled follow-ups on this record.</p>
            ) : (
              <div className="space-y-2">
                {reminders.map(rem => {
                  const isDone = rem.status === 'COMPLETED';
                  const due = new Date(rem.dueAt);
                  const isOverdue = !isDone && due < new Date();

                  return (
                    <div
                      key={rem.id}
                      className={cn(
                        "p-3 rounded-xl border flex items-start justify-between gap-3 transition-all",
                        isDone
                          ? "bg-zinc-50/50 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 opacity-60"
                          : isOverdue
                          ? "bg-rose-500/5 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/50"
                          : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                      )}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <button
                          onClick={() => handleToggleCompleteReminder(rem.id, rem.status)}
                          className="mt-0.5 text-zinc-400 hover:text-purple-600 cursor-pointer shrink-0"
                        >
                          {isDone ? (
                            <CheckCircle2 size={16} className="text-emerald-500 fill-emerald-500/10" />
                          ) : (
                            <Circle size={16} />
                          )}
                        </button>

                        <div className="min-w-0 space-y-1">
                          <p className={cn(
                            "text-xs font-bold text-zinc-900 dark:text-white truncate",
                            isDone && "line-through text-zinc-400"
                          )}>
                            {rem.title}
                          </p>

                          <div className="flex items-center gap-2 text-[10px]">
                            <span className={cn(
                              "flex items-center gap-1 font-semibold",
                              isOverdue ? "text-rose-600 dark:text-rose-400" : "text-zinc-500"
                            )}>
                              <Clock size={10} />
                              {due.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>

                            {rem.priority === 'URGENT' && (
                              <span className="text-[9px] font-bold text-rose-500 uppercase">Urgent</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteReminder(rem.id)}
                        className="p-1 text-zinc-400 hover:text-rose-500 cursor-pointer"
                        title="Delete reminder"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
};
