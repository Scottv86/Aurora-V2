import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  StickyNote, 
  Search, 
  Plus, 
  Pin, 
  Trash2, 
  Layers, 
  Lock, 
  Globe, 
  ExternalLink,
  Eye,
  Edit3
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePlatform } from '../../hooks/usePlatform';
import { UserAvatarWithPresence } from '../../components/Common/UserPresenceBadge';
import { NotesClientService } from '../../services/notesService';
import { UniversalNote, CreateNotePayload } from '../../types/notes';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const COLOR_MAP: Record<string, { border: string; bg: string; badge: string; dot: string }> = {
  zinc: { border: 'border-zinc-200 dark:border-zinc-800', bg: 'bg-zinc-50 dark:bg-zinc-900', badge: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300', dot: 'bg-zinc-400' },
  yellow: { border: 'border-amber-300 dark:border-amber-800/60', bg: 'bg-amber-500/5 dark:bg-amber-950/20', badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300', dot: 'bg-amber-400' },
  blue: { border: 'border-blue-300 dark:border-blue-800/60', bg: 'bg-blue-500/5 dark:bg-blue-950/20', badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  emerald: { border: 'border-emerald-300 dark:border-emerald-800/60', bg: 'bg-emerald-500/5 dark:bg-emerald-950/20', badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  purple: { border: 'border-purple-300 dark:border-purple-800/60', bg: 'bg-purple-500/5 dark:bg-purple-950/20', badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
  rose: { border: 'border-rose-300 dark:border-rose-800/60', bg: 'bg-rose-500/5 dark:bg-rose-950/20', badge: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' },
  amber: { border: 'border-amber-400 dark:border-amber-700/60', bg: 'bg-amber-500/10 dark:bg-amber-950/30', badge: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200', dot: 'bg-amber-500' },
};

export const NotesApp: React.FC = () => {
  const { session, user: authUser } = useAuth();
  const { tenant, user: platformUser, modules, members } = usePlatform();
  const navigate = useNavigate();
  const token = session?.access_token;
  const tenantId = tenant?.id;

  const [notes, setNotes] = useState<UniversalNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collectionFilter, setCollectionFilter] = useState<'all' | 'pinned' | 'personal' | 'linked'>('all');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  // Active note editing states
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editColor, setEditColor] = useState<UniversalNote['color']>('zinc');
  const [editIsPinned, setEditIsPinned] = useState(false);
  const [editIsPersonal, setEditIsPersonal] = useState(false);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNotes = async () => {
    if (!tenantId) return;
    try {
      setLoading(true);
      const data = await NotesClientService.getNotes({}, token, tenantId);
      setNotes(data);
      if (data.length > 0 && !selectedNoteId) {
        setSelectedNoteId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [tenantId, token]);

  const activeNote = useMemo(() => {
    return notes.find(n => n.id === selectedNoteId) || null;
  }, [notes, selectedNoteId]);

  // Synchronize editing buffer when active note changes
  useEffect(() => {
    if (activeNote) {
      setEditTitle(activeNote.title || '');
      setEditBody(activeNote.body || '');
      setEditColor(activeNote.color || 'zinc');
      setEditIsPinned(activeNote.isPinned);
      setEditIsPersonal(activeNote.isPersonal);
      setEditTags(Array.isArray(activeNote.tags) ? activeNote.tags : []);
    }
  }, [activeNote?.id]);

  // Auto-save debouncer
  const triggerAutoSave = (updatedFields: Partial<CreateNotePayload>) => {
    if (!selectedNoteId || !tenantId) return;
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      try {
        const lastEditedById = platformUser?.memberId || platformUser?.id || authUser?.id || session?.user?.id || 'anonymous';
        const lastEditedByName = platformUser?.name || (platformUser?.firstName ? `${platformUser.firstName} ${platformUser.lastName || ''}`.trim() : '') || authUser?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'User';
        const lastEditedByAvatar = platformUser?.avatarUrl || authUser?.user_metadata?.avatar_url || (authUser as any)?.avatarUrl;

        const payload = {
          ...updatedFields,
          lastEditedById,
          lastEditedByName,
          lastEditedByAvatar,
        };

        const updated = await NotesClientService.updateNote(selectedNoteId, payload, token, tenantId);
        setSaveStatus('saved');
        setNotes(prev => prev.map(n => n.id === selectedNoteId ? { 
          ...n, 
          ...updatedFields,
          ...updated,
          lastEditedById,
          lastEditedByName,
          lastEditedByAvatar,
          lastEditedAt: updated.lastEditedAt || new Date().toISOString(),
          updatedAt: updated.updatedAt || new Date().toISOString()
        } as UniversalNote : n));
      } catch (err) {
        console.error('Failed to save note:', err);
        setSaveStatus('saved');
      }
    }, 600);
  };

  const handleCreateNewNote = async () => {
    if (!tenantId) return;
    try {
      const authorId = platformUser?.memberId || platformUser?.id || authUser?.id || session?.user?.id || 'anonymous';
      const authorName = platformUser?.name || (platformUser?.firstName ? `${platformUser.firstName} ${platformUser.lastName || ''}`.trim() : '') || authUser?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'User';
      const authorEmail = platformUser?.email || authUser?.email || session?.user?.email;
      const authorAvatar = platformUser?.avatarUrl || authUser?.user_metadata?.avatar_url || (authUser as any)?.avatarUrl;

      const newNote = await NotesClientService.createNote({
        title: 'Untitled Note',
        body: '',
        color: 'zinc',
        isPersonal: collectionFilter === 'personal',
        authorId,
        authorName,
        authorEmail,
        authorAvatar,
      }, token, tenantId);

      setNotes([newNote, ...notes]);
      setSelectedNoteId(newNote.id);
      toast.success('New note created');
    } catch (err) {
      console.error('Failed to create note:', err);
      toast.error('Failed to create note');
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!tenantId) return;
    try {
      await NotesClientService.deleteNote(id, token, tenantId);
      const remaining = notes.filter(n => n.id !== id);
      setNotes(remaining);
      if (selectedNoteId === id) {
        setSelectedNoteId(remaining.length > 0 ? remaining[0].id : null);
      }
      toast.success('Note deleted');
    } catch (err) {
      console.error('Failed to delete note:', err);
      toast.error('Failed to delete note');
    }
  };

  const handleTogglePin = async () => {
    if (!selectedNoteId || !tenantId || !activeNote) return;
    try {
      const nextPin = !editIsPinned;
      setEditIsPinned(nextPin);
      await NotesClientService.togglePin(selectedNoteId, token, tenantId);
      setNotes(prev => prev.map(n => n.id === selectedNoteId ? { ...n, isPinned: nextPin } : n));
      toast.success(nextPin ? 'Note pinned' : 'Note unpinned');
    } catch (_) {}
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const cleanTag = tagInput.trim().startsWith('#') ? tagInput.trim() : `#${tagInput.trim()}`;
      if (!editTags.includes(cleanTag)) {
        const next = [...editTags, cleanTag];
        setEditTags(next);
        triggerAutoSave({ tags: next });
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const next = editTags.filter(t => t !== tagToRemove);
    setEditTags(next);
    triggerAutoSave({ tags: next });
  };

  // Collect all unique tags from all notes
  const allUniqueTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach(n => {
      if (Array.isArray(n.tags)) {
        n.tags.forEach(t => tagSet.add(t));
      }
    });
    return Array.from(tagSet);
  }, [notes]);

  // Filtered notes list
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      // Collection filter
      if (collectionFilter === 'pinned' && !n.isPinned) return false;
      if (collectionFilter === 'personal' && !n.isPersonal) return false;
      if (collectionFilter === 'linked' && !n.recordId && !n.moduleId) return false;

      // Module filter
      if (selectedModuleId !== 'all' && n.moduleId !== selectedModuleId) return false;

      // Tag filter
      if (selectedTag) {
        const tags = Array.isArray(n.tags) ? n.tags : [];
        if (!tags.includes(selectedTag)) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (n.title || '').toLowerCase().includes(q);
        const matchesBody = (n.body || '').toLowerCase().includes(q);
        const matchesTags = Array.isArray(n.tags) && n.tags.some(t => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesBody && !matchesTags) return false;
      }

      return true;
    });
  }, [notes, collectionFilter, selectedModuleId, selectedTag, searchQuery]);

  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      
      {/* Top Header Bar */}
      <div className="h-14 px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <StickyNote size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-900 dark:text-white">Aurora Notes</h1>
            <p className="text-[10px] text-zinc-400">Scratchpads, record logs, and shared workspace notes</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateNewNote}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Main 3-Pane Body */}
      <div className="flex-1 flex overflow-hidden">

        {/* Pane 1: Collections Sidebar */}
        <div className="w-56 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/30 flex flex-col p-3 shrink-0">
          <div className="space-y-1 mb-6">
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider px-2 mb-2">Collections</p>
            {[
              { id: 'all', label: 'All Notes', icon: Layers, count: notes.length },
              { id: 'pinned', label: 'Pinned Notes', icon: Pin, count: notes.filter(n => n.isPinned).length },
              { id: 'personal', label: 'Personal Scratchpad', icon: Lock, count: notes.filter(n => n.isPersonal).length },
              { id: 'linked', label: 'Record & Module Notes', icon: Globe, count: notes.filter(n => n.recordId || n.moduleId).length },
            ].map(col => {
              const Icon = col.icon;
              const isActive = collectionFilter === col.id;
              return (
                <button
                  key={col.id}
                  onClick={() => {
                    setCollectionFilter(col.id as any);
                    setSelectedTag(null);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-zinc-800/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={14} />
                    <span>{col.label}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-semibold">{col.count}</span>
                </button>
              );
            })}
          </div>

          {/* Module Filter */}
          {modules && modules.length > 0 && (
            <div className="space-y-1 mb-6">
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider px-2 mb-2">Filter by Module</p>
              <select
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
              >
                <option value="all">All Modules</option>
                {modules.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Tags Cloud */}
          {allUniqueTags.length > 0 && (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider px-2 mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5 px-2">
                {allUniqueTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer",
                      selectedTag === tag
                        ? "bg-indigo-600 text-white"
                        : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pane 2: Notes List */}
        <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col shrink-0">
          
          {/* Search Bar */}
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search notes or #tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          {/* Notes Feed */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
            {loading ? (
              <div className="p-6 text-center text-xs text-zinc-400">Loading notes...</div>
            ) : filteredNotes.length === 0 ? (
              <div className="p-8 text-center">
                <StickyNote size={24} className="mx-auto text-zinc-400 mb-2 opacity-50" />
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">No notes found</p>
                <p className="text-[10px] text-zinc-400 mt-1">Create your first note to get started.</p>
              </div>
            ) : (
              filteredNotes.map(note => {
                const isSelected = note.id === selectedNoteId;
                const colorConfig = COLOR_MAP[note.color] || COLOR_MAP.zinc;

                return (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNoteId(note.id)}
                    className={cn(
                      "p-3 rounded-xl border transition-all cursor-pointer relative group",
                      isSelected
                        ? "border-indigo-500 bg-indigo-500/5 shadow-sm"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className={cn("w-2 h-2 rounded-full shrink-0", colorConfig.dot)} />
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                          {note.title || 'Untitled Note'}
                        </h4>
                      </div>
                      {note.isPinned && (
                        <Pin size={11} className="text-amber-500 shrink-0 fill-amber-500" />
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-2">
                      {note.snippet || note.body || 'No content...'}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                      <div className="flex items-center gap-1">
                        {note.module && (
                          <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[9px] font-semibold">
                            {note.module.name}
                          </span>
                        )}
                        {note.isPersonal && (
                          <span className="flex items-center gap-0.5 text-zinc-400">
                            <Lock size={9} /> Personal
                          </span>
                        )}
                      </div>
                      <span>{new Date(note.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pane 3: Note Editor */}
        <div className="flex-1 bg-white dark:bg-zinc-950 flex flex-col overflow-hidden">
          {activeNote ? (
            <>
              {/* Note Header / Meta Bar */}
              <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  
                  {/* Pin Toggle */}
                  <button
                    onClick={handleTogglePin}
                    className={cn(
                      "p-1.5 rounded-lg border transition-all cursor-pointer",
                      editIsPinned
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                        : "border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-600"
                    )}
                    title={editIsPinned ? 'Unpin Note' : 'Pin Note to Top'}
                  >
                    <Pin size={14} className={editIsPinned ? 'fill-current' : ''} />
                  </button>

                  {/* Color Selector */}
                  <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1">
                    {Object.keys(COLOR_MAP).map(c => (
                      <button
                        key={c}
                        onClick={() => {
                          setEditColor(c as any);
                          triggerAutoSave({ color: c });
                        }}
                        className={cn(
                          "w-4 h-4 rounded-full transition-transform cursor-pointer",
                          COLOR_MAP[c].dot,
                          editColor === c ? "scale-125 ring-2 ring-indigo-500 ring-offset-1" : "hover:scale-110 opacity-70"
                        )}
                      />
                    ))}
                  </div>

                  {/* Personal / Shared Toggle */}
                  <button
                    onClick={() => {
                      const next = !editIsPersonal;
                      setEditIsPersonal(next);
                      triggerAutoSave({ isPersonal: next });
                    }}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer",
                      editIsPersonal
                        ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                        : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-700"
                    )}
                  >
                    {editIsPersonal ? <Lock size={12} /> : <Globe size={12} />}
                    <span>{editIsPersonal ? 'Private Scratchpad' : 'Shared Note'}</span>
                  </button>

                  {/* Linked Record Pill if present */}
                  {activeNote.record && activeNote.module && (
                    <button
                      onClick={() => navigate(`/workspace/module/${activeNote.module?.id}/record/${activeNote.record?.id}`)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:underline cursor-pointer"
                    >
                      <span>{activeNote.module.name} Record</span>
                      <ExternalLink size={11} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-zinc-400">
                    {saveStatus === 'saving' ? 'Saving...' : 'All changes saved'}
                  </span>

                  <button
                    onClick={() => setPreviewMode(!previewMode)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    title={previewMode ? 'Switch to Edit' : 'Switch to Markdown Preview'}
                  >
                    {previewMode ? <Edit3 size={15} /> : <Eye size={15} />}
                  </button>

                  <button
                    onClick={() => handleDeleteNote(activeNote.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    title="Delete Note"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Title & Tag Inputs */}
              <div className="px-8 pt-6 pb-2">
                <input
                  type="text"
                  placeholder="Note Title..."
                  value={editTitle}
                  onChange={(e) => {
                    setEditTitle(e.target.value);
                    triggerAutoSave({ title: e.target.value });
                  }}
                  className="w-full text-2xl font-black text-zinc-900 dark:text-white bg-transparent border-none focus:outline-none placeholder:text-zinc-400"
                />

                {/* Tags Section */}
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  {editTags.map(tag => (
                    <span 
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-medium"
                    >
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="hover:text-rose-500 cursor-pointer">&times;</button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="+ add tag (Enter)"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="text-xs bg-transparent text-zinc-500 focus:outline-none w-28 placeholder:text-zinc-400"
                  />
                </div>

                {/* Note Audit Info: Created by & Last Updated by */}
                {(() => {
                  const resolvedCreatorAvatar = 
                    activeNote.authorAvatar || 
                    members?.find(m => 
                      (m.id && activeNote.authorId === m.id) || 
                      (m.userId && activeNote.authorId === m.userId) || 
                      (m.name && activeNote.authorName && m.name.toLowerCase() === activeNote.authorName.toLowerCase())
                    )?.avatarUrl ||
                    (platformUser?.avatarUrl && (
                      (platformUser.id && activeNote.authorId === platformUser.id) ||
                      (platformUser.memberId && activeNote.authorId === platformUser.memberId) ||
                      (platformUser.name && activeNote.authorName && platformUser.name.toLowerCase() === activeNote.authorName.toLowerCase())
                    ) ? platformUser.avatarUrl : undefined) ||
                    authUser?.user_metadata?.avatar_url;

                  const isEdited = Boolean(
                    activeNote.lastEditedAt || 
                    activeNote.lastEditedByName || 
                    (activeNote.metadata && (activeNote.metadata.lastEditedAt || activeNote.metadata.lastEditedByName)) ||
                    (activeNote.updatedAt && activeNote.createdAt && new Date(activeNote.updatedAt).getTime() - new Date(activeNote.createdAt).getTime() > 10000)
                  );

                  const lastEditorName = 
                    activeNote.lastEditedByName || 
                    activeNote.metadata?.lastEditedByName || 
                    activeNote.authorName || 
                    'Team Member';

                  const lastEditorId = 
                    activeNote.lastEditedById || 
                    activeNote.metadata?.lastEditedById;

                  const resolvedEditorAvatar = 
                    activeNote.lastEditedByAvatar || 
                    activeNote.metadata?.lastEditedByAvatar || 
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
                    activeNote.lastEditedAt || 
                    activeNote.metadata?.lastEditedAt || 
                    activeNote.updatedAt;

                  return (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/60 text-[11px] text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-400 dark:text-zinc-500">Created by</span>
                        <UserAvatarWithPresence
                          avatarUrl={resolvedCreatorAvatar}
                          name={activeNote.authorName || 'Author'}
                          size="xs"
                          showPresence={false}
                        />
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          {activeNote.authorName || 'Team Member'}
                        </span>
                        <span className="text-zinc-300 dark:text-zinc-700">•</span>
                        <span className="text-zinc-400 dark:text-zinc-500" title={new Date(activeNote.createdAt).toLocaleString()}>
                          {new Date(activeNote.createdAt).toLocaleDateString([], { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric',
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>

                      {isEdited && (
                        <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
                          <span className="text-zinc-300 dark:text-zinc-700">|</span>
                          <span>Updated by</span>
                          <UserAvatarWithPresence
                            avatarUrl={resolvedEditorAvatar}
                            name={lastEditorName}
                            size="xs"
                            showPresence={false}
                          />
                          <span className="font-medium text-zinc-600 dark:text-zinc-400">
                            {lastEditorName}
                          </span>
                          <span className="text-zinc-300 dark:text-zinc-700">•</span>
                          <span title={new Date(lastEditedDate).toLocaleString()}>
                            {new Date(lastEditedDate).toLocaleDateString([], { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric',
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

              {/* Editor / Markdown Body */}
              <div className="flex-1 px-8 py-4 overflow-y-auto custom-scrollbar">
                {previewMode ? (
                  <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                    {editBody || '*No content yet. Click edit to begin typing.*'}
                  </div>
                ) : (
                  <textarea
                    placeholder="Type markdown, meeting notes, checklist items, or paste code..."
                    value={editBody}
                    onChange={(e) => {
                      setEditBody(e.target.value);
                      triggerAutoSave({ body: e.target.value });
                    }}
                    className="w-full h-full bg-transparent border-none resize-none focus:outline-none text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans placeholder:text-zinc-400"
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400">
              <StickyNote size={36} className="mb-3 opacity-30" />
              <p className="text-sm font-semibold">Select a note to view</p>
              <p className="text-xs mt-1">Or click "+ New Note" to write down an idea.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
