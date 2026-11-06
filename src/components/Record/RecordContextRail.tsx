import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  History, 
  StickyNote, 
  Files, 
  Calendar, 
  Send, 
  Plus, 
  Trash2, 
  Download, 
  Clock, 
  PanelRightClose, 
  PanelRightOpen,
  Pin,
  CheckCircle2,
  Circle,
  UploadCloud,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatLocalizedDate } from '../../lib/utils';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../hooks/useAuth';
import { usePlatform } from '../../hooks/usePlatform';
import { getSharedSocket } from '../../lib/socketClient';
import { ActivityEventCard, ActivityEvent } from '../Platform/ActivityEventCard';
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
  editData?: Record<string, any>;
  onUpdateField?: (fieldId: string, val: any) => void;
  onUpdateAssignee?: (assigneeId: string | null) => void;
  onUpdateStatus?: (newStatus: string, targetNodeId?: string) => void;
  members?: any[];
  allFields?: any[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenShare?: () => void;
  statusOptions?: Array<string | StatusOptionItem>;
  workflowTransitions?: any[];
  workflow?: any;
}

interface RailCacheEntry {
  activities?: ActivityEvent[];
  notes?: UniversalNote[];
  files?: UniversalDocument[];
  tasks?: UniversalReminder[];
}

const railRecordCache = new Map<string, RailCacheEntry>();

export const RecordContextRail: React.FC<RecordContextRailProps> = ({
  record,
  moduleId,
  moduleData: _moduleData,
  editData: _editData = {},
  onUpdateField: _onUpdateField,
  onUpdateAssignee: _onUpdateAssignee,
  onUpdateStatus: _onUpdateStatus,
  members: _members = [],
  allFields: _allFields,
  isCollapsed,
  onToggleCollapse,
  onOpenShare,
  statusOptions: _statusOptions = ['Todo', 'In Progress', 'Done', 'Blocked'],
  workflowTransitions: _workflowTransitions = [],
  workflow: _workflow
}) => {
  const { session } = useAuth();
  const { tenant } = usePlatform();
  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || '';
  const tenantId = tenant?.id || '';
  const dateFormat = tenant?.localization?.dateFormat || 'DD/MM/YYYY';

  const recordId = record?.id || '';
  const recordKey = record?._record_key || recordId.slice(0, 8);

  // Active rail tab
  const [activeTab, setActiveTab] = useState<ContextRailTab>('activity');

  // Activity State
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityFilter, setActivityFilter] = useState<'ALL' | 'FIELD' | 'STATUS' | 'ASSIGNMENT' | 'COMMENT'>('ALL');
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

  // Active record tracking to prevent out-of-order race conditions
  const activeRecordIdRef = useRef(recordId);
  activeRecordIdRef.current = recordId;

  // Fetch Activity Timeline
  const fetchActivity = useCallback(async (targetId: string = recordId) => {
    if (!targetId || !tenantId) return;
    setActivityLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/audit/${targetId}?order=desc`, {
        headers: {
          'x-tenant-id': tenantId,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        if (activeRecordIdRef.current === targetId) {
          setActivities(list);
        }
        const existing = railRecordCache.get(targetId) || {};
        railRecordCache.set(targetId, { ...existing, activities: list });
      }
    } catch (err) {
      console.error('[RecordContextRail] Failed to fetch activity:', err);
    } finally {
      if (activeRecordIdRef.current === targetId) {
        setActivityLoading(false);
      }
    }
  }, [recordId, tenantId, token]);

  // Fetch Notes
  const fetchNotes = useCallback(async (targetId: string = recordId) => {
    if (!targetId || !tenantId) return;
    setNotesLoading(true);
    try {
      const data = await NotesClientService.getNotes({ recordId: targetId, moduleId }, token, tenantId);
      const list = data || [];
      if (activeRecordIdRef.current === targetId) {
        setNotes(list);
      }
      const existing = railRecordCache.get(targetId) || {};
      railRecordCache.set(targetId, { ...existing, notes: list });
    } catch (err) {
      console.error('[RecordContextRail] Failed to fetch notes:', err);
    } finally {
      if (activeRecordIdRef.current === targetId) {
        setNotesLoading(false);
      }
    }
  }, [recordId, moduleId, token, tenantId]);

  // Fetch Files
  const fetchFiles = useCallback(async (targetId: string = recordId) => {
    if (!targetId) return;
    setFilesLoading(true);
    try {
      const docs = await DocumentClientService.getRecordDocuments(targetId);
      const list = docs || [];
      if (activeRecordIdRef.current === targetId) {
        setFiles(list);
      }
      const existing = railRecordCache.get(targetId) || {};
      railRecordCache.set(targetId, { ...existing, files: list });
    } catch (err) {
      console.error('[RecordContextRail] Failed to fetch documents:', err);
    } finally {
      if (activeRecordIdRef.current === targetId) {
        setFilesLoading(false);
      }
    }
  }, [recordId]);

  // Fetch Tasks / Reminders
  const fetchTasks = useCallback(async (targetId: string = recordId) => {
    if (!targetId || !tenantId) return;
    setTasksLoading(true);
    try {
      const data = await RemindersClientService.getReminders({ recordId: targetId, moduleId }, token, tenantId);
      const list = data || [];
      if (activeRecordIdRef.current === targetId) {
        setTasks(list);
      }
      const existing = railRecordCache.get(targetId) || {};
      railRecordCache.set(targetId, { ...existing, tasks: list });
    } catch (err) {
      console.error('[RecordContextRail] Failed to fetch tasks:', err);
    } finally {
      if (activeRecordIdRef.current === targetId) {
        setTasksLoading(false);
      }
    }
  }, [recordId, moduleId, token, tenantId]);

  // Load record data and reset previous record's state immediately when record switches
  useEffect(() => {
    if (!recordId) {
      setActivities([]);
      setNotes([]);
      setFiles([]);
      setTasks([]);
      return;
    }

    const cached = railRecordCache.get(recordId);
    if (cached) {
      setActivities(cached.activities || []);
      setNotes(cached.notes || []);
      setFiles(cached.files || []);
      setTasks(cached.tasks || []);
      setActivityLoading(!cached.activities);
      setNotesLoading(!cached.notes);
      setFilesLoading(!cached.files);
      setTasksLoading(!cached.tasks);
    } else {
      // Clear out the previous record's content immediately so stale data is never displayed
      setActivities([]);
      setNotes([]);
      setFiles([]);
      setTasks([]);
      setActivityLoading(true);
      setNotesLoading(true);
      setFilesLoading(true);
      setTasksLoading(true);
    }

    // Always fetch fresh data in background/foreground for the active record
    fetchActivity(recordId);
    fetchNotes(recordId);
    fetchFiles(recordId);
    fetchTasks(recordId);
  }, [recordId, fetchActivity, fetchNotes, fetchFiles, fetchTasks]);

  // Real-time socket listener for live activity feed
  useEffect(() => {
    if (!recordId || !tenantId) return;
    const socket = getSharedSocket(token, tenantId);
    if (!socket) return;

    const handleConnect = () => {
      socket.emit('join_tenant', tenantId);
    };

    if (socket.connected) {
      socket.emit('join_tenant', tenantId);
    }

    socket.on('connect', handleConnect);

    const handleNewActivity = (activity: any) => {
      if (!activity) return;
      if (activity.resourceId === recordId || (recordKey && activity.resourceKey === recordKey)) {
        setActivities(prev => {
          if (prev.some(a => a.id === activity.id)) return prev;
          const next = [activity, ...prev];
          const cached = railRecordCache.get(recordId);
          if (cached) {
            railRecordCache.set(recordId, { ...cached, activities: next });
          }
          return next;
        });
      }
    };

    socket.on('RECORD_ACTIVITY', handleNewActivity);
    return () => {
      socket.off('connect', handleConnect);
      socket.off('RECORD_ACTIVITY', handleNewActivity);
    };
  }, [recordId, recordKey, tenantId, token]);

  // Instant local synchronization when record is updated in the current window
  useEffect(() => {
    const handleRecordUpdated = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.recordId === recordId || (recordKey && detail?.record?._record_key === recordKey)) {
        fetchActivity();
      }
    };

    window.addEventListener('aurora:record-updated', handleRecordUpdated as EventListener);
    return () => {
      window.removeEventListener('aurora:record-updated', handleRecordUpdated as EventListener);
    };
  }, [recordId, recordKey, fetchActivity]);

  // Re-fetch activities if parent updates the record prop
  useEffect(() => {
    if (record?.updatedAt && recordId) {
      fetchActivity();
    }
  }, [record?.updatedAt, recordId, fetchActivity]);

  // Submit Activity Comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment || !recordId || !tenantId) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/audit/${recordId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          comment: newComment.trim(),
          moduleId,
          resourceKey: recordKey
        })
      });
      if (res.ok) {
        const created = await res.json();
        setActivities(prev => {
          if (prev.some(a => a.id === created.id)) return prev;
          const next = [created, ...prev];
          const cached = railRecordCache.get(recordId);
          if (cached) {
            railRecordCache.set(recordId, { ...cached, activities: next });
          }
          return next;
        });
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
      await (RemindersClientService.updateReminder as any)(task.id, { status: nextStatus }, token, tenantId);
    } catch (err) {
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
      toast.error('Failed to update task');
    }
  };

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
    return formatLocalizedDate(d, dateFormat);
  };

  // Meaningful activities (exclude passive record view/access spam from workspace rail)
  const meaningfulActivities = useMemo(() => {
    return activities.filter(a => a.category !== 'ACCESS');
  }, [activities]);

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    if (activityFilter === 'ALL') return meaningfulActivities;
    return meaningfulActivities.filter(a => {
      if (activityFilter === 'STATUS') return a.category === 'STATUS' || a.category === 'WORKFLOW';
      if (activityFilter === 'FIELD') return a.category === 'FIELD';
      if (activityFilter === 'COMMENT') return a.category === 'COMMENT';
      if (activityFilter === 'ASSIGNMENT') return a.category === 'ASSIGNMENT';
      return true;
    });
  }, [meaningfulActivities, activityFilter]);

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
      {/* 1. Rail Top Bar: Primary Collaboration Tabs + Collapse Button */}
      <div className="h-10 box-border px-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-zinc-900 select-none">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'activity', label: 'Activity', icon: History, count: meaningfulActivities.length, isLoading: activityLoading && activities.length === 0 },
              { id: 'notes', label: 'Notes', icon: StickyNote, count: notes.length, isLoading: notesLoading && notes.length === 0 },
              { id: 'files', label: 'Files', icon: Files, count: files.length, isLoading: filesLoading && files.length === 0 },
              { id: 'tasks', label: 'Tasks', icon: Calendar, count: tasks.filter(t => t.status !== 'COMPLETED').length, isLoading: tasksLoading && tasks.length === 0 }
            ] as const
          ).map(tab => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0",
                  isActive
                    ? "bg-zinc-100 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 font-bold shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                )}
              >
                <TabIcon size={12} className={cn(isActive ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400")} />
                <span>{tab.label}</span>
                {tab.isLoading ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                ) : tab.count > 0 ? (
                  <span className={cn(
                    "text-[9px] px-1 rounded-full font-bold leading-tight",
                    isActive ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
                  )}>
                    {tab.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Rail Controls */}
        <div className="flex items-center gap-1 shrink-0 ml-1">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Collapse Details [⌘\]"
          >
            <PanelRightClose size={14} />
          </button>
        </div>
      </div>

      {/* Tab Body Area */}
      {activeTab === 'activity' ? (
        <div className="flex-1 flex flex-col min-h-0 bg-zinc-50/50 dark:bg-zinc-900/40">
          {/* Category Filter Pills */}
          <div className="px-3 py-1.5 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center gap-1 shrink-0 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xs overflow-x-auto no-scrollbar">
            {(['ALL', 'FIELD', 'STATUS', 'ASSIGNMENT', 'COMMENT'] as const).map(cat => (
              <button
                key={cat}
                type="button"
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

          {/* Activity Timeline List (Scrollable) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5">
            {activityLoading && activities.length === 0 ? (
              <div className="space-y-2.5 p-0.5">
                {[1, 2, 3, 4].map(idx => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-zinc-900/40 space-y-2.5 animate-pulse"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                        <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                      </div>
                      <div className="h-2 w-10 bg-zinc-100 dark:bg-zinc-800/60 rounded" />
                    </div>
                    <div className="h-3.5 w-4/5 bg-zinc-100 dark:bg-zinc-800/70 rounded" />
                  </div>
                ))}
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 text-xs italic">
                {activityFilter === 'ALL'
                  ? 'No activity events recorded yet. Field changes and updates will stream here live.'
                  : `No ${activityFilter.toLowerCase()} events recorded yet.`}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredActivities.map((event: any, idx: number) => (
                  <ActivityEventCard
                    key={event.id || idx}
                    event={event}
                    showResourceLink={false}
                    members={_members}
                    allFields={_allFields}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Docked Bottom Comment Composer */}
          <div className="p-2.5 border-t border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
            <form onSubmit={handlePostComment} className="relative">
              <input
                type="text"
                placeholder="Leave an activity update..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={submittingComment}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-3 pr-8 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || submittingComment}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-indigo-600 disabled:opacity-30 cursor-pointer"
              >
                <Send size={12} />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/40">
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
                <div className="space-y-2 p-0.5">
                  {[1, 2].map(idx => (
                    <div
                      key={idx}
                      className="p-3 bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl space-y-2 animate-pulse"
                    >
                      <div className="flex items-center justify-between">
                        <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                        <div className="h-2 w-10 bg-zinc-100 dark:bg-zinc-800/60 rounded" />
                      </div>
                      <div className="h-3 w-4/5 bg-zinc-100 dark:bg-zinc-800/60 rounded" />
                    </div>
                  ))}
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
                <div className="space-y-1.5 p-0.5">
                  {[1, 2].map(idx => (
                    <div
                      key={idx}
                      className="p-2.5 bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl flex items-center gap-2 animate-pulse"
                    >
                      <div className="w-7 h-7 rounded-lg bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                      <div className="flex-1 space-y-1">
                        <div className="h-3 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
                        <div className="h-2 w-16 bg-zinc-100 dark:bg-zinc-800/60 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : files.length === 0 ? (
                <div className="py-8 text-center text-zinc-400 text-xs italic">
                  No files or documents attached.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {files.map(doc => {
                    const docName = doc.name || (doc as any).originalFilename || (doc as any).fileName || 'Document';
                    const ext = docName.split('.').pop()?.toUpperCase() || 'DOC';
                    const size = doc.sizeBytes || (doc as any).fileSize;
                    const sizeStr = size ? `${Math.round(size / 1024)} KB` : '';
                    const fileUrl = doc.url || (doc as any).fileUrl;
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
                              {docName}
                            </p>
                            <p className="text-[9px] text-zinc-400 mt-0.5 truncate">
                              {sizeStr}{sizeStr ? ' • ' : ''}{formatTimeAgo(doc.createdAt)}
                            </p>
                          </div>
                        </div>

                        {fileUrl && (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            download={docName}
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
                <div className="space-y-1.5 p-0.5">
                  {[1, 2].map(idx => (
                    <div
                      key={idx}
                      className="p-2.5 bg-white/60 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl flex items-center gap-2.5 animate-pulse"
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                      <div className="flex-1 space-y-1">
                        <div className="h-3 w-36 bg-zinc-200 dark:bg-zinc-800 rounded" />
                        <div className="h-2 w-16 bg-zinc-100 dark:bg-zinc-800/60 rounded" />
                      </div>
                    </div>
                  ))}
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
                              <span>Due {formatLocalizedDate(task.dueAt, dateFormat)}</span>
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
      )}
    </div>
  );
};
