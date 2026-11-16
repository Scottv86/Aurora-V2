import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Pin,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  Mail,
  Star,
  ArrowLeft,
  Calendar as CalendarIcon,
  Delete,
  ExternalLink,
  Loader2,
  StickyNote,
  Bell,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { NotesClientService } from '../../services/notesService';
import { RemindersClientService } from '../../services/remindersService';
import { InboxService } from '../../services/inboxService';
import { schedulingService } from '../../services/schedulingService';
import { evaluateExpression } from '../../lib/calcEvaluator';
import { UniversalNote } from '../../types/notes';
import { UniversalReminder, ReminderSmartView } from '../../types/reminders';
import { EmailThread } from '../../types/inbox';
import { Booking } from '../../types/scheduling';

export interface CompactDockedViewProps {
  compactLevel?: 'side' | 'bottom';
}

const NOTE_ACCENTS: Record<string, string> = {
  yellow: 'border-l-amber-400 bg-amber-50/40 dark:bg-amber-950/10',
  blue: 'border-l-blue-400 bg-blue-50/40 dark:bg-blue-950/10',
  emerald: 'border-l-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/10',
  purple: 'border-l-purple-400 bg-purple-50/40 dark:bg-purple-950/10',
  rose: 'border-l-rose-400 bg-rose-50/40 dark:bg-rose-950/10',
  amber: 'border-l-amber-500 bg-amber-50/40 dark:bg-amber-950/10',
  zinc: 'border-l-zinc-400 bg-zinc-50/60 dark:bg-zinc-900/60',
};

export const CompactNotesView: React.FC<CompactDockedViewProps> = ({ compactLevel = 'side' }) => {
  const { tenant } = usePlatform();
  const { session, user } = useAuth();
  const tenantId = tenant?.id;
  const token =
    (import.meta as any).env?.VITE_DEV_TOKEN ||
    session?.access_token ||
    localStorage.getItem('aurora_token') ||
    undefined;
  const authorName =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    undefined;

  const [notes, setNotes] = useState<UniversalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [selectedNote, setSelectedNote] = useState<UniversalNote | null>(null);
  const [saving, setSaving] = useState(false);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await NotesClientService.getNotes({ search: search || undefined }, token || undefined, tenantId);
      setNotes(Array.isArray(data) ? data : []);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [search, token, tenantId]);

  useEffect(() => {
    const t = setTimeout(loadNotes, 150);
    return () => clearTimeout(t);
  }, [loadNotes]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftBody.trim() && !draftTitle.trim()) return;
    setSaving(true);
    try {
      const created = await NotesClientService.createNote(
        {
          title: draftTitle.trim() || undefined,
          body: draftBody.trim() || draftTitle.trim(),
          color: 'yellow',
          authorId: user?.id,
          authorName,
        },
        token || undefined,
        tenantId
      );
      setNotes((prev) => [created, ...prev]);
      setDraftTitle('');
      setDraftBody('');
      setCreating(false);
      toast.success('Note saved');
    } catch {
      toast.error('Could not create note');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateNote = async () => {
    if (!selectedNote) return;
    setSaving(true);
    try {
      const updated = await NotesClientService.updateNote(
        selectedNote.id,
        { title: selectedNote.title, body: selectedNote.body },
        token || undefined,
        tenantId
      );
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      setSelectedNote(null);
      toast.success('Note updated');
    } catch {
      toast.error('Failed to update note');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePin = async (note: UniversalNote, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await NotesClientService.togglePin(note.id, token || undefined, tenantId);
      setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, isPinned: res.isPinned } : n)));
    } catch {
      toast.error('Failed to toggle pin');
    }
  };

  const handleDelete = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await NotesClientService.deleteNote(noteId, token || undefined, tenantId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      if (selectedNote?.id === noteId) setSelectedNote(null);
    } catch {
      toast.error('Failed to delete note');
    }
  };

  if (selectedNote) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-zinc-950 p-3 gap-2">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setSelectedNote(null)}
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All Notes
          </button>
          <button
            onClick={handleUpdateNote}
            disabled={saving}
            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        <input
          value={selectedNote.title || ''}
          onChange={(e) => setSelectedNote({ ...selectedNote, title: e.target.value })}
          placeholder="Note title..."
          className="text-sm font-semibold bg-transparent border-b border-zinc-200 dark:border-zinc-800 pb-1.5 outline-none text-zinc-900 dark:text-white"
        />
        <textarea
          value={selectedNote.body}
          onChange={(e) => setSelectedNote({ ...selectedNote, body: e.target.value })}
          placeholder="Write your note..."
          className="flex-1 resize-none bg-transparent text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 outline-none"
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-950">
      <div className="p-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md outline-none focus:ring-1 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
          />
        </div>
        <button
          onClick={() => setCreating((v) => !v)}
          className="p-1.5 rounded-md bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 shrink-0"
          title="New Note"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="p-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 space-y-2 shrink-0">
          <input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full px-2.5 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-1 focus:ring-blue-500"
          />
          <textarea
            value={draftBody}
            onChange={(e) => setDraftBody(e.target.value)}
            rows={compactLevel === 'bottom' ? 2 : 3}
            placeholder="Jot something down..."
            className="w-full px-2.5 py-1.5 text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Adding…' : 'Add Note'}
            </button>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {loading ? (
          <div className="h-32 flex items-center justify-center text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center text-zinc-400 px-4">
            <StickyNote className="w-7 h-7 mb-2 opacity-40" />
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">No notes yet</p>
            <p className="text-[11px] mt-0.5">Tap + to capture a quick note without leaving your screen.</p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              onClick={() => setSelectedNote(note)}
              className={cn(
                'group cursor-pointer p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 border-l-4 transition-all hover:shadow-sm',
                NOTE_ACCENTS[note.color] || NOTE_ACCENTS.zinc
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {note.title || 'Untitled Note'}
                </div>
                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 shrink-0">
                  <button
                    onClick={(e) => handleTogglePin(note, e)}
                    className={cn(
                      'p-0.5 rounded hover:bg-zinc-200/70 dark:hover:bg-zinc-800',
                      note.isPinned ? 'text-amber-500' : 'text-zinc-400'
                    )}
                    title={note.isPinned ? 'Unpin' : 'Pin'}
                  >
                    <Pin className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(note.id, e)}
                    className="p-0.5 rounded text-zinc-400 hover:text-rose-500 hover:bg-zinc-200/70 dark:hover:bg-zinc-800"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-1 whitespace-pre-wrap">
                {note.body}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const CompactRemindersView: React.FC<CompactDockedViewProps> = () => {
  const { tenant } = usePlatform();
  const { session, user } = useAuth();
  const tenantId = tenant?.id;
  const token =
    (import.meta as any).env?.VITE_DEV_TOKEN ||
    session?.access_token ||
    localStorage.getItem('aurora_token') ||
    undefined;
  const assignedToName =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    undefined;

  const [view, setView] = useState<ReminderSmartView>('all');
  const [items, setItems] = useState<UniversalReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await RemindersClientService.getReminders({ view }, token || undefined, tenantId);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [view, token, tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const due = new Date(Date.now() + 3600 * 1000).toISOString();
      const created = await RemindersClientService.createReminder(
        {
          title: newTitle.trim(),
          dueAt: due,
          priority: 'MEDIUM',
          assignedToId: user?.id,
          assignedToName,
        },
        token || undefined,
        tenantId
      );
      setItems((prev) => [created, ...prev]);
      setNewTitle('');
    } catch {
      toast.error('Could not add reminder');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const updated = await RemindersClientService.toggleComplete(id, token || undefined, tenantId);
      setItems((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch {
      toast.error('Failed to update reminder');
    }
  };

  const handleSnooze = async (id: string) => {
    try {
      const updated = await RemindersClientService.snoozeReminder(id, 60, token || undefined, tenantId);
      setItems((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast.success('Snoozed for 1 hour');
    } catch {
      toast.error('Failed to snooze');
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-950">
      <div className="px-2.5 pt-2.5 pb-2 border-b border-zinc-200 dark:border-zinc-800 space-y-2 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {(['all', 'today', 'overdue', 'completed'] as ReminderSmartView[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setView(tab)}
              className={cn(
                'px-2 py-1 rounded text-[11px] font-medium capitalize transition-colors shrink-0',
                view === tab
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                  : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <form onSubmit={handleQuickAdd} className="flex items-center gap-1.5">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Quick reminder (due in 1h)..."
            className="flex-1 px-2.5 py-1.5 text-xs rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={adding || !newTitle.trim()}
            className="p-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shrink-0"
            title="Add Reminder"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {loading ? (
          <div className="h-32 flex items-center justify-center text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center text-zinc-400 px-4">
            <Bell className="w-7 h-7 mb-2 opacity-40" />
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">All caught up</p>
            <p className="text-[11px] mt-0.5">No reminders in this view.</p>
          </div>
        ) : (
          items.map((item) => {
            const done = item.status === 'COMPLETED';
            return (
              <div
                key={item.id}
                className="flex items-start gap-2 p-2 rounded-lg border border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors"
              >
                <button
                  onClick={() => handleToggle(item.id)}
                  className={cn(
                    'mt-0.5 shrink-0',
                    done ? 'text-emerald-500' : 'text-zinc-400 hover:text-blue-500'
                  )}
                >
                  {done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className={cn('text-xs font-medium', done ? 'line-through text-zinc-400' : 'text-zinc-900 dark:text-zinc-100')}>
                    {item.title}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(item.dueAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="px-1 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 font-medium">
                      {item.priority}
                    </span>
                  </div>
                </div>
                {!done && (
                  <button
                    onClick={() => handleSnooze(item.id)}
                    className="px-1.5 py-0.5 text-[10px] rounded border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-white shrink-0"
                    title="Snooze 1 hour"
                  >
                    +1h
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export const CompactInboxView: React.FC<CompactDockedViewProps> = () => {
  const { tenant } = usePlatform();
  const navigate = useNavigate();
  const [folder, setFolder] = useState<'inbox' | 'starred' | 'sent'>('inbox');
  const [search, setSearch] = useState('');
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EmailThread | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await InboxService.getThreads({
          folder: folder === 'starred' ? undefined : folder,
          isStarred: folder === 'starred' ? true : undefined,
          search: search || undefined,
          tenantId: tenant?.id,
        });
        if (active) setThreads(Array.isArray(res) ? res : []);
      } catch {
        if (active) setThreads([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    const t = setTimeout(load, 150);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [folder, search, tenant?.id]);

  if (selected) {
    const latest = selected.messages[selected.messages.length - 1];
    return (
      <div className="h-full flex flex-col bg-white dark:bg-zinc-950">
        <div className="p-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={() => setSelected(null)}
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Inbox
          </button>
          <button
            onClick={() => navigate('/workspace/apps/inbox')}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline"
          >
            Reply in Inbox
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-white leading-snug">
            {selected.subject || '(No Subject)'}
          </h4>
          <div className="text-[11px] text-zinc-500 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
            <span className="truncate font-medium text-zinc-700 dark:text-zinc-300">
              {selected.from?.name || selected.from?.address}
            </span>
            <span className="shrink-0">
              {new Date(selected.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
            {latest?.bodyText || selected.snippet || 'No preview available.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-950">
      <div className="p-2.5 border-b border-zinc-200 dark:border-zinc-800 space-y-2 shrink-0">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            {(['inbox', 'starred', 'sent'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFolder(tab)}
                className={cn(
                  'px-2 py-1 rounded text-[11px] font-medium capitalize transition-colors',
                  folder === tab
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                    : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          <button
            onClick={() => navigate('/workspace/apps/inbox')}
            className="text-[11px] font-medium text-blue-600 hover:underline px-1.5"
          >
            Compose
          </button>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search mail..."
            className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-900">
        {loading ? (
          <div className="h-32 flex items-center justify-center text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : threads.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center text-zinc-400 px-4">
            <Mail className="w-7 h-7 mb-2 opacity-40" />
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">No messages</p>
          </div>
        ) : (
          threads.slice(0, 30).map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className="w-full text-left p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'text-xs truncate',
                    t.isRead ? 'font-medium text-zinc-700 dark:text-zinc-300' : 'font-bold text-zinc-900 dark:text-white'
                  )}
                >
                  {t.from?.name || t.from?.address}
                </span>
                <div className="flex items-center gap-1 shrink-0 text-[10px] text-zinc-400">
                  {t.isStarred && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                  <span>
                    {new Date(t.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
              <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate mt-0.5">
                {t.subject || '(No Subject)'}
              </div>
              <div className="text-[11px] text-zinc-500 truncate mt-0.5">{t.snippet}</div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export const CompactCalendarView: React.FC<CompactDockedViewProps> = () => {
  const { tenant } = usePlatform();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<'upcoming' | 'all'>('upcoming');

  useEffect(() => {
    const data = schedulingService.getBookings(tenant?.id);
    setBookings(Array.isArray(data) ? data : []);
  }, [tenant?.id]);

  const now = Date.now();
  const visible = bookings
    .filter((b) => filter === 'all' || new Date(b.endDateTime).getTime() >= now - 86400000)
    .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-950">
      <div className="p-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1">
          {(['upcoming', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                'px-2 py-1 rounded text-[11px] font-medium capitalize',
                filter === tab
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                  : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <button
          onClick={() => navigate('/workspace/apps/calendar')}
          className="text-[11px] font-medium text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          Schedule
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {visible.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center text-zinc-400 px-4">
            <CalendarIcon className="w-7 h-7 mb-2 opacity-40" />
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">No upcoming bookings</p>
          </div>
        ) : (
          visible.slice(0, 25).map((b) => {
            const start = new Date(b.startDateTime);
            return (
              <div
                key={b.id}
                className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                    {start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} ·{' '}
                    {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
                    {b.status}
                  </span>
                </div>
                <div className="text-xs font-semibold text-zinc-900 dark:text-white mt-1 truncate">
                  {b.configTitle || b.customerName}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5 truncate">
                  {b.customerName} · {b.resourceName}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export const CompactCalculatorView: React.FC<CompactDockedViewProps> = () => {
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState('0');
  const [history, setHistory] = useState<Array<{ expr: string; result: string }>>([]);

  const handleEvaluate = () => {
    if (!expr.trim()) return;
    const res = evaluateExpression(expr);
    if (!res.error) {
      setResult(res.formatted);
      setHistory((prev) => [{ expr, result: res.formatted }, ...prev.slice(0, 5)]);
    } else {
      setResult('Error');
    }
  };

  const append = (token: string) => setExpr((prev) => prev + token);

  const buttons = [
    'C', '(', ')', '÷',
    '7', '8', '9', '×',
    '4', '5', '6', '−',
    '1', '2', '3', '+',
    '0', '.', '%', '=',
  ];

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-white p-3 gap-2.5 select-none">
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 flex flex-col justify-end min-h-[86px]">
        <input
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleEvaluate();
            }
          }}
          placeholder="0"
          className="w-full bg-transparent text-right text-xs font-mono text-zinc-400 outline-none"
        />
        <div className="text-right text-2xl font-bold font-mono tracking-tight text-white mt-1 truncate">
          {result}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 flex-1">
        {buttons.map((btn) => {
          const isOp = ['÷', '×', '−', '+'].includes(btn);
          const isEq = btn === '=';
          return (
            <button
              key={btn}
              onClick={() => {
                if (btn === 'C') {
                  setExpr('');
                  setResult('0');
                } else if (btn === '=') {
                  handleEvaluate();
                } else {
                  append(btn);
                }
              }}
              className={cn(
                'rounded-lg text-sm font-semibold transition-colors flex items-center justify-center',
                isEq
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : isOp
                  ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                  : btn === 'C'
                  ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-800'
              )}
            >
              {btn}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
        <span className="truncate">
          {history[0] ? `Last: ${history[0].expr} = ${history[0].result}` : 'Supports %, sin(), cos(), sqrt()'}
        </span>
        <button
          onClick={() => setExpr((prev) => prev.slice(0, -1))}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white shrink-0"
          title="Backspace"
        >
          <Delete className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
