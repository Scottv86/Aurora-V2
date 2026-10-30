import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  History, 
  StickyNote, 
  Files, 
  Calendar, 
  User, 
  ChevronDown, 
  Share2, 
  Copy, 
  Check, 
  Send, 
  Plus, 
  Trash2, 
  Download, 
  Eye, 
  Clock, 
  PanelRightClose, 
  PanelRightOpen,
  Pin,
  CheckCircle2,
  Circle,
  UploadCloud,
  Loader2,
  Search,
  Filter,
  UserCheck,
  UserMinus,
  ExternalLink,
  Tag,
  Zap,
  GitFork
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../hooks/useAuth';
import { usePlatform } from '../../hooks/usePlatform';
import { UserAvatarWithPresence } from '../Common/UserPresenceBadge';
import { NotesClientService } from '../../services/notesService';
import { RemindersClientService } from '../../services/remindersService';
import { DocumentClientService } from '../../services/documentClientService';
import { UniversalNote } from '../../types/notes';
import { UniversalReminder } from '../../types/reminders';
import { UniversalDocument } from '../../types/document';

export type ContextRailTab = 'activity' | 'notes' | 'files' | 'tasks';

export interface StatusOptionItem {
  id?: string;
  name: string;
  type?: string;
  condition?: string;
  decisionName?: string;
  automatedActions?: Array<{ id: string; name: string; type: string }>;
}

interface RecordContextRailProps {
  record: any;
  moduleId?: string;
  moduleData?: any;
  editData: Record<string, any>;
  onUpdateField: (fieldId: string, val: any) => void;
  onUpdateAssignee: (assigneeId: string | null) => void;
  onUpdateStatus: (newStatus: string, targetNodeId?: string) => void;
  members: any[];
  allFields: any[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenShare?: () => void;
  statusOptions?: Array<string | StatusOptionItem>;
  workflowTransitions?: any[];
}

export const RecordContextRail: React.FC<RecordContextRailProps> = ({
  record,
  moduleId,
  moduleData,
  editData,
  onUpdateField,
  onUpdateAssignee,
  onUpdateStatus,
  members,
  allFields,
  isCollapsed,
  onToggleCollapse,
  onOpenShare,
  statusOptions = ['Todo', 'In Progress', 'Done', 'Blocked'],
  workflowTransitions = []
}) => {
  const { session, user: authUser } = useAuth();
  const { tenant, user: platformUser } = usePlatform();
  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || '';
  const tenantId = tenant?.id || '';

  const recordId = record?.id || '';
  const recordKey = record?._record_key || recordId.slice(0, 8);

  // Active rail tab
  const [activeTab, setActiveTab] = useState<ContextRailTab>('activity');

  // Menus
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const assigneeMenuRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  // Activity State
  const [activities, setActivities] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityFilter, setActivityFilter] = useState<'ALL' | 'STATUS' | 'FIELD' | 'COMMENT'>('ALL');
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Notes State
  const [notes, setNotes] = useState<UniversalNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNoteBody, setNewNoteBody] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNotePinned, setNewNotePinned] = useState(false);
  const [isNoteComposerOpen, setIsNoteComposerOpen] = useState(false);
  const [submittingNote, setSubmittingNote] = useState(false);

  // Files State
  const [files, setFiles] = useState<UniversalDocument[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tasks / Reminders State
  const [tasks, setTasks] = useState<UniversalReminder[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState<'today' | 'tomorrow' | 'next_week'>('tomorrow');
  const [isTaskComposerOpen, setIsTaskComposerOpen] = useState(false);
  const [submittingTask, setSubmittingTask] = useState(false);

  // Close menus on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (assigneeMenuRef.current && !assigneeMenuRef.current.contains(e.target as Node)) {
        setShowAssigneeMenu(false);
      }
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setShowStatusMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Fetch Activity Timeline
  const fetchActivity = useCallback(async () => {
    if (!recordId || !tenantId) return;
    setActivityLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/audit/${recordId}?order=desc`, {
        headers: {
          'x-tenant-id': tenantId,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setActivities(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('[RecordContextRail] Failed to fetch activity:', err);
    } finally {
      setActivityLoading(false);
    }
  }, [recordId, tenantId, token]);

  // Fetch Notes
  const fetchNotes = useCallback(async () => {
    if (!recordId || !tenantId) return;
    setNotesLoading(true);
    try {
      const data = await NotesClientService.getNotes({ recordId, moduleId }, token, tenantId);
      setNotes(data || []);
    } catch (err) {
      console.error('[RecordContextRail] Failed to fetch notes:', err);
    } finally {
      setNotesLoading(false);
    }
  }, [recordId, moduleId, token, tenantId]);

  // Fetch Files
  const fetchFiles = useCallback(async () => {
    if (!recordId) return;
    setFilesLoading(true);
    try {
      const docs = await DocumentClientService.getDocumentsByRecord(recordId);
      setFiles(docs || []);
    } catch (err) {
      console.error('[RecordContextRail] Failed to fetch documents:', err);
    } finally {
      setFilesLoading(false);
    }
  }, [recordId]);

  // Fetch Tasks / Reminders
  const fetchTasks = useCallback(async () => {
    if (!recordId || !tenantId) return;
    setTasksLoading(true);
    try {
      const data = await RemindersClientService.getReminders({ recordId, moduleId }, token, tenantId);
      setTasks(data || []);
    } catch (err) {
      console.error('[RecordContextRail] Failed to fetch tasks:', err);
    } finally {
      setTasksLoading(false);
    }
  }, [recordId, moduleId, token, tenantId]);

  // Load active tab data on record change or tab switch
  useEffect(() => {
    if (!recordId) return;
    if (activeTab === 'activity') fetchActivity();
    if (activeTab === 'notes') fetchNotes();
    if (activeTab === 'files') fetchFiles();
    if (activeTab === 'tasks') fetchTasks();
  }, [recordId, activeTab, fetchActivity, fetchNotes, fetchFiles, fetchTasks]);

  // Initial eager count load
  useEffect(() => {
    if (recordId) {
      fetchActivity();
      fetchNotes();
      fetchFiles();
      fetchTasks();
    }
  }, [recordId]);

  // Real-time socket listener for activity
  useEffect(() => {
    if (!recordId) return;
    const socket = (window as any)._auroraSocket;
    if (!socket) return;

    const handleNewActivity = (activity: any) => {
      if (activity.resourceId === recordId) {
        setActivities(prev => [activity, ...prev]);
      }
    };

    socket.on('RECORD_ACTIVITY', handleNewActivity);
    return () => {
      socket.off('RECORD_ACTIVITY', handleNewActivity);
    };
  }, [recordId]);

  // Submit Activity Comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment || !recordId || !tenantId) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/audit/${recordId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ comment: newComment.trim() })
      });
      if (res.ok) {
        const created = await res.json();
        setActivities(prev => [created, ...prev]);
        setNewComment('');
        toast.success('Comment added to timeline');
      } else {
        toast.error('Failed to post comment');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error posting comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Submit Note
  const handleSaveNote = async () => {
    if (!newNoteBody.trim() || submittingNote || !recordId || !tenantId) return;
    setSubmittingNote(true);
    try {
      const created = await NotesClientService.createNote(
        {
          recordId,
          moduleId,
          title: newNoteTitle.trim() || undefined,
          body: newNoteBody.trim(),
          isPinned: newNotePinned
        },
        token,
        tenantId
      );
      if (created) {
        setNotes(prev => [created, ...prev]);
        setNewNoteTitle('');
        setNewNoteBody('');
        setNewNotePinned(false);
        setIsNoteComposerOpen(false);
        toast.success('Note saved');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save note');
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await NotesClientService.deleteNote(noteId, token, tenantId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      toast.success('Note deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete note');
    }
  };

  // File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploadingFile || !recordId) return;
    setUploadingFile(true);
    const toastId = toast.loading(`Uploading ${file.name}...`);
    try {
      const { document } = await DocumentClientService.uploadDocument({
        file,
        recordId,
        moduleId,
        sourceType: 'RECORD_ATTACHMENT'
      });
      if (document) {
        setFiles(prev => [document, ...prev]);
        toast.success(`Attached ${file.name}`, { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || 'Upload failed', { id: toastId });
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Submit Task / Reminder
  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || submittingTask || !recordId || !tenantId) return;
    setSubmittingTask(true);
    try {
      const now = new Date();
      let due = new Date();
      if (newTaskDue === 'today') due.setHours(17, 0, 0, 0);
      else if (newTaskDue === 'tomorrow') due.setDate(now.getDate() + 1);
      else if (newTaskDue === 'next_week') due.setDate(now.getDate() + 7);

      const created = await RemindersClientService.createReminder(
        {
          recordId,
          moduleId,
          title: newTaskTitle.trim(),
          dueAt: due.toISOString(),
          priority: 'MEDIUM'
        },
        token,
        tenantId
      );
      if (created) {
        setTasks(prev => [created, ...prev]);
        setNewTaskTitle('');
        setIsTaskComposerOpen(false);
        toast.success('Task scheduled');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create task');
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleToggleTask = async (task: UniversalReminder) => {
    const nextStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
    try {
      await RemindersClientService.updateReminder(task.id, { status: nextStatus }, token, tenantId);
    } catch (err) {
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
      toast.error('Failed to update task');
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(recordKey);
    setCopiedKey(true);
    toast.success(`Copied key "${recordKey}"`);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success('Copied record URL to clipboard');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Resolve current Assignee
  const currentAssigneeId = editData.assigneeId !== undefined ? editData.assigneeId : record?.assigneeId;
  const currentAssignee = (members || []).find(m => m.id === currentAssigneeId);

  // Resolve current Status (prioritize record.status as authoritative source for workflow status)
  const currentStatus = record?.status || editData.status || 'Todo';

  // Normalize status options to StatusOptionItem objects
  const normalizedStatusOptions: StatusOptionItem[] = useMemo(() => {
    return (statusOptions || []).map(opt => {
      if (typeof opt === 'string') {
        return { id: opt, name: opt };
      }
      return opt;
    });
  }, [statusOptions]);

  // Relative time helper
  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDays = Math.floor(diffHour / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    if (activityFilter === 'ALL') return activities;
    return activities.filter(a => {
      if (activityFilter === 'STATUS') return a.category === 'STATUS' || a.category === 'WORKFLOW';
      if (activityFilter === 'FIELD') return a.category === 'FIELD';
      if (activityFilter === 'COMMENT') return a.category === 'COMMENT';
      return true;
    });
  }, [activities, activityFilter]);

  if (isCollapsed) {
    return (
      <div className="shrink-0 w-12 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col items-center py-3 gap-4 transition-all duration-300 select-none">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shadow-2xs"
          title="Expand Details [⌘\]"
        >
          <PanelRightOpen size={16} />
        </button>

        <div className="w-6 border-b border-zinc-200 dark:border-zinc-800" />

        {/* Collapsed tab indicators */}
        <div className="flex flex-col gap-2 items-center">
          <button
            onClick={() => { onToggleCollapse(); setActiveTab('activity'); }}
            className="p-2 rounded-xl text-zinc-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors cursor-pointer"
            title="Activity Feed"
          >
            <History size={15} />
          </button>
          <button
            onClick={() => { onToggleCollapse(); setActiveTab('notes'); }}
            className="p-2 rounded-xl text-zinc-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors cursor-pointer relative"
            title="Notes"
          >
            <StickyNote size={15} />
            {notes.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500" />}
          </button>
          <button
            onClick={() => { onToggleCollapse(); setActiveTab('files'); }}
            className="p-2 rounded-xl text-zinc-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors cursor-pointer relative"
            title="Files & Attachments"
          >
            <Files size={15} />
            {files.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500" />}
          </button>
          <button
            onClick={() => { onToggleCollapse(); setActiveTab('tasks'); }}
            className="p-2 rounded-xl text-zinc-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors cursor-pointer relative"
            title="Tasks & Reminders"
          >
            <Calendar size={15} />
            {tasks.filter(t => t.status !== 'COMPLETED').length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 xl:w-96 shrink-0 h-full border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-hidden transition-all duration-300">
      {/* 1. Rail Top Bar (h-[52px] box-border to match tab line pixel-for-pixel) */}
      <div className="h-[52px] box-border px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
            Details
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Collapse Details [⌘\]"
          >
            <PanelRightClose size={15} />
          </button>
        </div>
      </div>

      {/* Rail Scrollable Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-zinc-50/50 dark:bg-zinc-900/40">
        {/* 2. Vital Controls: Ownership & Status Card */}
        <div className="bg-white dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 shadow-2xs space-y-3.5">
          {/* Top Row: Record Key Pill + Quick Toolbar */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handleCopyKey}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Copy Record Key"
            >
              <span>{recordKey}</span>
              {copiedKey ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} className="text-zinc-400" />}
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyLink}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Copy Record Link"
              >
                {copiedLink ? <Check size={12} className="text-emerald-500" /> : <ExternalLink size={12} />}
              </button>
              {onOpenShare && (
                <button
                  onClick={onOpenShare}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Share Record"
                >
                  <Share2 size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Assignee Control */}
          <div className="space-y-1 relative" ref={assigneeMenuRef}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Assignee
            </span>
            <button
              type="button"
              onClick={() => setShowAssigneeMenu(prev => !prev)}
              className="w-full flex items-center justify-between p-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/40 text-xs font-medium transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2 min-w-0">
                {currentAssignee ? (
                  <>
                    <UserAvatarWithPresence
                      avatarUrl={currentAssignee.avatarUrl}
                      name={currentAssignee.name}
                      status={(currentAssignee as any).status || (currentAssignee as any).presenceStatus || 'AVAILABLE'}
                      size="xs"
                    />
                    <div className="text-left min-w-0">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate leading-none">{currentAssignee.name}</p>
                      <p className="text-[9px] text-zinc-400 truncate mt-0.5">{currentAssignee.email}</p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-zinc-400">
                    <div className="w-5 h-5 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center">
                      <User size={10} />
                    </div>
                    <span>Unassigned</span>
                  </div>
                )}
              </div>
              <ChevronDown size={12} className={cn("text-zinc-400 transition-transform", showAssigneeMenu && "rotate-180")} />
            </button>

            {/* Assignee Selection Popover */}
            <AnimatePresence>
              {showAssigneeMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.96 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  <div className="p-1.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 flex gap-1">
                    <button
                      onClick={() => {
                        const me = members.find(m => m.id === platformUser?.memberId || m.id === platformUser?.cuid);
                        if (me) onUpdateAssignee(me.id);
                        setShowAssigneeMenu(false);
                      }}
                      className="flex-1 py-1 px-2 rounded-lg text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <UserCheck size={11} />
                      <span>Assign to me</span>
                    </button>
                    {currentAssignee && (
                      <button
                        onClick={() => {
                          onUpdateAssignee(null);
                          setShowAssigneeMenu(false);
                        }}
                        className="py-1 px-2 rounded-lg text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        title="Clear Assignee"
                      >
                        <UserMinus size={11} />
                      </button>
                    )}
                  </div>

                  <div className="p-1.5 border-b border-zinc-100 dark:border-zinc-800 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={11} />
                    <input
                      type="text"
                      placeholder="Search team..."
                      value={assigneeSearch}
                      onChange={(e) => setAssigneeSearch(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-7 pr-2 py-1 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="max-h-44 overflow-y-auto p-1 space-y-0.5 custom-scrollbar">
                    {members
                      .filter(m => !m.isSynthetic && m.name.toLowerCase().includes(assigneeSearch.toLowerCase()))
                      .map(m => {
                        const isSelected = m.id === currentAssigneeId;
                        return (
                          <button
                            key={m.id}
                            onClick={() => {
                              onUpdateAssignee(m.id);
                              setShowAssigneeMenu(false);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors cursor-pointer",
                              isSelected ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <UserAvatarWithPresence avatarUrl={m.avatarUrl} name={m.name} size="xs" />
                              <span className="truncate">{m.name}</span>
                            </div>
                            {isSelected && <Check size={12} className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
                          </button>
                        );
                      })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Status & Stage Control */}
          <div className="space-y-1 relative" ref={statusMenuRef}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Status & Stage
            </span>
            <button
              type="button"
              onClick={() => setShowStatusMenu(prev => !prev)}
              className="w-full flex items-center justify-between p-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/40 text-xs font-semibold transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                <span className="text-zinc-900 dark:text-white">{currentStatus}</span>
              </div>
              <ChevronDown size={12} className={cn("text-zinc-400 transition-transform", showStatusMenu && "rotate-180")} />
            </button>

            {/* Status Dropdown */}
            <AnimatePresence>
              {showStatusMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.96 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 p-1 space-y-0.5 max-h-64 overflow-y-auto custom-scrollbar"
                >
                  {normalizedStatusOptions.map((st) => {
                    const isSelected = st.name.toLowerCase() === currentStatus.toLowerCase();
                    const hasAutomations = Boolean(st.automatedActions && st.automatedActions.length > 0);
                    return (
                      <button
                        key={st.id || st.name}
                        type="button"
                        onClick={() => {
                          onUpdateStatus(st.name, st.id);
                          setShowStatusMenu(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-left",
                          isSelected ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        )}
                        title={st.condition ? `Rule: ${st.condition}` : undefined}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0", 
                            isSelected ? "bg-indigo-600 dark:bg-indigo-400 ring-2 ring-indigo-500/20 animate-pulse" : "bg-zinc-400 dark:bg-zinc-600"
                          )} />
                          <span className="truncate">{st.name}</span>
                          {hasAutomations && (
                            <span className="flex items-center text-amber-500 dark:text-amber-400 shrink-0 ml-0.5" title={`${st.automatedActions!.length} action(s)`}>
                              <Zap size={10} className="fill-amber-400/40" />
                            </span>
                          )}
                          {st.condition && !hasAutomations && (
                            <span className="flex items-center text-indigo-400 dark:text-indigo-400 shrink-0 ml-0.5 opacity-80" title={st.condition}>
                              <GitFork size={10} />
                            </span>
                          )}
                        </div>
                        {isSelected && <Check size={12} className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Timestamps */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-400">
            <span>Created {formatTimeAgo(record?.createdAt)}</span>
            <span>Updated {formatTimeAgo(record?.updatedAt || record?.createdAt)}</span>
          </div>
        </div>

        {/* 3. Segmented Collaboration Tabs Switcher */}
        <div className="flex items-center p-1 bg-zinc-200/60 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl">
          {(
            [
              { id: 'activity', label: 'Activity', icon: History, count: activities.length },
              { id: 'notes', label: 'Notes', icon: StickyNote, count: notes.length },
              { id: 'files', label: 'Files', icon: Files, count: files.length },
              { id: 'tasks', label: 'Tasks', icon: Calendar, count: tasks.filter(t => t.status !== 'COMPLETED').length }
            ] as const
          ).map(tab => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none",
                  isActive
                    ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                )}
              >
                <TabIcon size={12} />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={cn(
                    "text-[9px] px-1 py-0.2 rounded-full font-bold",
                    isActive ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" : "bg-zinc-300/60 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 4. Tab Panels */}
        <div className="space-y-3">
          {/* A. ACTIVITY TAB */}
          {activeTab === 'activity' && (
            <div className="space-y-3">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1">
                {(['ALL', 'STATUS', 'FIELD', 'COMMENT'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActivityFilter(cat)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0",
                      activityFilter === cat
                        ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30"
                        : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Comment Composer */}
              <form onSubmit={handlePostComment} className="relative">
                <input
                  type="text"
                  placeholder="Leave an activity update..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={submittingComment}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-3 pr-8 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || submittingComment}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-indigo-600 disabled:opacity-30 cursor-pointer"
                >
                  <Send size={12} />
                </button>
              </form>

              {/* Activity Timeline List */}
              {activityLoading && activities.length === 0 ? (
                <div className="py-8 flex justify-center text-zinc-400">
                  <Loader2 size={16} className="animate-spin" />
                </div>
              ) : filteredActivities.length === 0 ? (
                <div className="py-8 text-center text-zinc-400 text-xs italic">
                  No activity events recorded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredActivities.map((event: any, idx: number) => {
                    const actorName = event.userName || event.actorName || event.user?.name || 'System';
                    return (
                      <div
                        key={event.id || idx}
                        className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl space-y-1 text-xs shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-[10px] text-zinc-400">
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">{actorName}</span>
                          <span>{formatTimeAgo(event.createdAt)}</span>
                        </div>
                        <p className="text-zinc-800 dark:text-zinc-200 leading-snug">
                          {event.description || event.message || event.action}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* B. NOTES TAB */}
          {activeTab === 'notes' && (
            <div className="space-y-3">
              {/* Quick Add Note Header Button */}
              {!isNoteComposerOpen ? (
                <button
                  onClick={() => setIsNoteComposerOpen(true)}
                  className="w-full py-2 px-3 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-500 hover:text-indigo-600 hover:border-indigo-500/50 hover:bg-indigo-50/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Write a note...</span>
                </button>
              ) : (
                <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2 shadow-sm animate-in fade-in">
                  <input
                    type="text"
                    placeholder="Note title (optional)..."
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                    className="w-full text-xs font-bold bg-transparent border-b border-zinc-100 dark:border-zinc-800 pb-1.5 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none"
                  />
                  <textarea
                    rows={3}
                    placeholder="Note content..."
                    value={newNoteBody}
                    onChange={(e) => setNewNoteBody(e.target.value)}
                    className="w-full text-xs bg-transparent text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none resize-none"
                  />
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setNewNotePinned(!newNotePinned)}
                      className={cn(
                        "p-1 rounded-md text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer",
                        newNotePinned ? "text-indigo-600 bg-indigo-500/10" : "text-zinc-400 hover:text-zinc-600"
                      )}
                    >
                      <Pin size={11} />
                      <span>Pin</span>
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsNoteComposerOpen(false)}
                        className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-600 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!newNoteBody.trim() || submittingNote}
                        onClick={handleSaveNote}
                        className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        {submittingNote ? 'Saving...' : 'Save Note'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes List */}
              {notesLoading && notes.length === 0 ? (
                <div className="py-8 flex justify-center text-zinc-400">
                  <Loader2 size={16} className="animate-spin" />
                </div>
              ) : notes.length === 0 ? (
                <div className="py-8 text-center text-zinc-400 text-xs italic">
                  No internal notes added yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {notes.map(note => (
                    <div
                      key={note.id}
                      className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl space-y-1.5 shadow-2xs group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {note.isPinned && <Pin size={11} className="text-indigo-500 shrink-0" />}
                          <h5 className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                            {note.title || 'Note'}
                          </h5>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-zinc-400">{formatTimeAgo(note.createdAt)}</span>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-500 transition-opacity cursor-pointer"
                            title="Delete note"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                        {note.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* C. FILES TAB */}
          {activeTab === 'files' && (
            <div className="space-y-3">
              {/* Dropzone trigger */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                disabled={uploadingFile}
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-3 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-500 rounded-xl text-xs font-semibold text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50/20 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"
              >
                {uploadingFile ? (
                  <Loader2 size={16} className="animate-spin text-indigo-500" />
                ) : (
                  <>
                    <UploadCloud size={16} className="text-zinc-400" />
                    <span>Upload or drop document</span>
                  </>
                )}
              </button>

              {/* Files List */}
              {filesLoading && files.length === 0 ? (
                <div className="py-8 flex justify-center text-zinc-400">
                  <Loader2 size={16} className="animate-spin" />
                </div>
              ) : files.length === 0 ? (
                <div className="py-8 text-center text-zinc-400 text-xs italic">
                  No files or documents attached.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {files.map(doc => {
                    const ext = doc.fileName?.split('.').pop()?.toUpperCase() || 'DOC';
                    const sizeStr = doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : '';
                    return (
                      <div
                        key={doc.id}
                        className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl flex items-center justify-between gap-2 shadow-2xs group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[9px] flex items-center justify-center shrink-0">
                            {ext.slice(0, 3)}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate leading-tight">
                              {doc.title || doc.fileName}
                            </p>
                            <p className="text-[9px] text-zinc-400 mt-0.5 truncate">
                              {sizeStr} • {formatTimeAgo(doc.createdAt)}
                            </p>
                          </div>
                        </div>

                        {doc.fileUrl && (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            download={doc.fileName}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Download file"
                          >
                            <Download size={12} />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* D. TASKS / SCHEDULE TAB */}
          {activeTab === 'tasks' && (
            <div className="space-y-3">
              {/* Quick Task Composer Button */}
              {!isTaskComposerOpen ? (
                <button
                  onClick={() => setIsTaskComposerOpen(true)}
                  className="w-full py-2 px-3 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-500 hover:text-indigo-600 hover:border-indigo-500/50 hover:bg-indigo-50/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Schedule follow-up task...</span>
                </button>
              ) : (
                <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2 shadow-sm animate-in fade-in">
                  <input
                    type="text"
                    placeholder="What needs to be done?..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="w-full text-xs bg-transparent border-b border-zinc-100 dark:border-zinc-800 pb-1.5 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none"
                  />
                  <div className="flex items-center justify-between gap-1 pt-1">
                    <div className="flex items-center gap-1">
                      {(['today', 'tomorrow', 'next_week'] as const).map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setNewTaskDue(preset)}
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer capitalize",
                            newTaskDue === preset
                              ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30"
                              : "text-zinc-400 hover:text-zinc-600"
                          )}
                        >
                          {preset.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setIsTaskComposerOpen(false)}
                        className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-600 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!newTaskTitle.trim() || submittingTask}
                        onClick={handleCreateTask}
                        className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        {submittingTask ? 'Adding...' : 'Add Task'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tasks List */}
              {tasksLoading && tasks.length === 0 ? (
                <div className="py-8 flex justify-center text-zinc-400">
                  <Loader2 size={16} className="animate-spin" />
                </div>
              ) : tasks.length === 0 ? (
                <div className="py-8 text-center text-zinc-400 text-xs italic">
                  No scheduled activities or reminders.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {tasks.map(task => {
                    const isCompleted = task.status === 'COMPLETED';
                    return (
                      <div
                        key={task.id}
                        onClick={() => handleToggleTask(task)}
                        className={cn(
                          "p-2.5 bg-white dark:bg-zinc-900 border rounded-xl flex items-start gap-2.5 cursor-pointer transition-all shadow-2xs group",
                          isCompleted
                            ? "border-zinc-200/40 dark:border-zinc-800/40 opacity-60"
                            : "border-zinc-200/80 dark:border-zinc-800/80 hover:border-indigo-500/40"
                        )}
                      >
                        <button
                          type="button"
                          className="pt-0.5 text-zinc-400 group-hover:text-indigo-600 transition-colors shrink-0"
                        >
                          {isCompleted ? (
                            <CheckCircle2 size={14} className="text-emerald-500" />
                          ) : (
                            <Circle size={14} />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={cn(
                            "text-xs font-medium leading-snug truncate",
                            isCompleted ? "line-through text-zinc-400" : "text-zinc-900 dark:text-zinc-100"
                          )}>
                            {task.title}
                          </p>
                          {task.dueAt && (
                            <div className="flex items-center gap-1 text-[9px] text-zinc-400 mt-1">
                              <Clock size={10} />
                              <span>Due {new Date(task.dueAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
