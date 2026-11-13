import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
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
  X,
  CheckCircle2,
  Circle,
  UploadCloud,
  Loader2,
  SlidersHorizontal,
  User,
  Users,
  Copy,
  Check,
  ChevronDown,
  UserCheck,
  UserMinus,
  Search,
  Layers,
  Workflow,
  GitFork,
  Zap,
  CheckSquare,
  ShieldAlert,
  Play,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Star,
  Link2,
  Share2,
  CopyPlus,
  FolderInput,
  FileText,
  UserPlus
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatLocalizedDate } from '../../lib/utils';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../hooks/useAuth';
import { usePlatform } from '../../hooks/usePlatform';
import { getSharedSocket } from '../../lib/socketClient';
import { ActivityEventCard, ActivityEvent } from '../Platform/ActivityEventCard';
import { UserAvatarWithPresence } from '../Common/UserPresenceBadge';
import { NotesClientService } from '../../services/notesService';
import { RemindersClientService } from '../../services/remindersService';
import { DocumentClientService } from '../../services/documentClientService';
import { UniversalNote } from '../../types/notes';
import { UniversalReminder } from '../../types/reminders';
import { UniversalDocument } from '../../types/document';
import { SubstepStatus, ModuleField } from '../../types/platform';
import { 
  resolveRecordNextStep, 
  NextStepAction, 
  resolveRecordSlaStatus, 
  checkMissingRequiredFields,
  checkStageSubstepsSatisfied,
  resolveStageSubsteps,
  StageSubstepItem,
  ScheduledActivity
} from '../../lib/workflowProcessUtils';
import { TransitionRequirementsModal } from '../Platform/TransitionRequirementsModal';

export type ContextRailTab = 'overview' | 'workflow' | 'activity' | 'notes' | 'files' | 'tasks';

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

  // Controlled rail tab
  activeTab?: ContextRailTab;
  onTabChange?: (tab: ContextRailTab) => void;

  // Workflow interactive props
  isTransitioning?: boolean;
  onTransition?: (targetNodeName: string, targetNodeId: string, additionalData?: Record<string, any>) => Promise<void> | void;
  onStartWorkflow?: () => Promise<void> | void;
  onScheduleActivity?: (activity: ScheduledActivity) => Promise<void> | void;
  onCompleteActivity?: (activityId: string) => Promise<void> | void;
  onUpdateSubstep?: (nodeId: string, substepId: string, status: SubstepStatus, note?: string) => Promise<void> | void;
  currentUserName?: string;
  currentUserId?: string;
  onOpenVisualizer?: () => void;
  onOpenHistory?: () => void;

  // Overview Action Cluster Props
  isStarred?: boolean;
  onToggleStar?: () => void;
  onDuplicate?: () => void;
  isCloning?: boolean;
  onOpenMove?: () => void;
  onCopyLink?: () => void;
  onExportPdf?: () => void;
  onDeleteRecord?: () => void;
  fullViewUrl?: string;
  onToggleParticipant?: (memberId: string) => void;
  onClearParticipants?: () => void;
}

interface RailCacheEntry {
  activities?: ActivityEvent[];
  notes?: UniversalNote[];
  files?: UniversalDocument[];
  tasks?: UniversalReminder[];
}

const railRecordCache = new Map<string, RailCacheEntry>();

const tabOrder: Record<ContextRailTab, number> = {
  overview: 0,
  workflow: 1,
  activity: 2,
  notes: 3,
  files: 4,
  tasks: 5
};

export const RecordContextRail: React.FC<RecordContextRailProps> = ({
  record,
  moduleId,
  moduleData,
  editData = {},
  onUpdateField: _onUpdateField,
  onUpdateAssignee,
  onUpdateStatus,
  members = [],
  allFields: propAllFields = [],
  isCollapsed,
  onToggleCollapse,
  onOpenShare,
  statusOptions = ['Todo', 'In Progress', 'Done', 'Blocked'],
  workflowTransitions: _workflowTransitions = [],
  workflow,
  activeTab: propActiveTab,
  onTabChange,
  isTransitioning = false,
  onTransition,
  onStartWorkflow,
  onScheduleActivity: _onScheduleActivity,
  onCompleteActivity: _onCompleteActivity,
  onUpdateSubstep,
  currentUserName,
  currentUserId: _currentUserId,
  onOpenVisualizer,
  onOpenHistory,
  isStarred = false,
  onToggleStar,
  onDuplicate,
  isCloning = false,
  onOpenMove,
  onCopyLink,
  onExportPdf,
  onDeleteRecord,
  fullViewUrl,
  onToggleParticipant,
  onClearParticipants
}) => {
  const { session } = useAuth();
  const { tenant, user: platformUser } = usePlatform();
  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || '';
  const tenantId = tenant?.id || '';
  const dateFormat = tenant?.localization?.dateFormat || 'DD/MM/YYYY';

  const recordId = record?.id || '';
  const recordKey = record?._record_key || recordId.slice(0, 8);

  // Active rail tab - controlled or internal
  const [internalActiveTab, setInternalActiveTab] = useState<ContextRailTab>(propActiveTab || 'overview');
  const activeTab = propActiveTab || internalActiveTab;
  const [direction, setDirection] = useState<number>(1);
  const activeTabRef = useRef<ContextRailTab>(activeTab);

  useEffect(() => {
    if (propActiveTab && propActiveTab !== activeTabRef.current) {
      const currentIdx = tabOrder[activeTabRef.current] ?? 0;
      const nextIdx = tabOrder[propActiveTab] ?? 0;
      setDirection(nextIdx >= currentIdx ? 1 : -1);
      activeTabRef.current = propActiveTab;
      setInternalActiveTab(propActiveTab);
    }
  }, [propActiveTab]);

  const switchTab = useCallback((nextTab: ContextRailTab) => {
    const currentIdx = tabOrder[activeTabRef.current] ?? 0;
    const nextIdx = tabOrder[nextTab] ?? 0;
    setDirection(nextIdx >= currentIdx ? 1 : -1);
    activeTabRef.current = nextTab;
    setInternalActiveTab(nextTab);
    onTabChange?.(nextTab);
  }, [onTabChange]);

  const tabVariants: Variants = {
    initial: (dir: number) => ({
      opacity: 0,
      x: dir >= 0 ? 16 : -16,
    }),
    animate: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.18,
        ease: [0.16, 1, 0.3, 1] as const
      }
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: dir >= 0 ? -16 : 16,
      transition: {
        duration: 0.12,
        ease: [0.16, 1, 0.3, 1] as const
      }
    })
  };

  // Workflow Interactive State
  const [optimisticSubsteps, setOptimisticSubsteps] = useState<Record<string, Record<string, { status: SubstepStatus; note?: string; updatedBy?: string; updatedAt?: string }>>>({});
  const [transitioningTarget, setTransitioningTarget] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<NextStepAction | null>(null);
  const [missingFields, setMissingFields] = useState<ModuleField[]>([]);
  const [incompleteSubsteps, setIncompleteSubsteps] = useState<StageSubstepItem[]>([]);
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [waivingSubstepId, setWaivingSubstepId] = useState<string | null>(null);
  const [waiveInputReason, setWaiveInputReason] = useState('');

  // Reset transient workflow state when record changes
  useEffect(() => {
    setOptimisticSubsteps({});
    setPendingAction(null);
    setShowRequirementsModal(false);
    setMissingFields([]);
    setIncompleteSubsteps([]);
    setWaivingSubstepId(null);
    setWaiveInputReason('');
  }, [record?.id]);

  useEffect(() => {
    if (!isTransitioning) {
      setTransitioningTarget(null);
    }
  }, [isTransitioning]);

  // Effective Record with merged optimistic substeps
  const effectiveRecord = useMemo(() => {
    if (Object.keys(optimisticSubsteps).length === 0) return record;
    const currentWfState = record?.workflowState || {};
    const existingSubsteps = currentWfState.substeps || {};
    const mergedSubsteps = { ...existingSubsteps };

    for (const [nodeId, steps] of Object.entries(optimisticSubsteps)) {
      mergedSubsteps[nodeId] = {
        ...(mergedSubsteps[nodeId] || {}),
        ...steps
      };
    }

    return {
      ...record,
      workflowState: {
        ...currentWfState,
        substeps: mergedSubsteps
      }
    };
  }, [record, optimisticSubsteps]);

  const resolution = useMemo(() => {
    return resolveRecordNextStep(effectiveRecord, workflow, propAllFields);
  }, [effectiveRecord, workflow, propAllFields]);

  const slaStatus = useMemo(() => {
    return resolveRecordSlaStatus(effectiveRecord);
  }, [effectiveRecord]);

  const currentStageNode = useMemo(() => {
    if (!resolution.hasWorkflow) return null;
    return resolution.currentStageNode || (workflow?.nodes?.find((n: any) => n.name === resolution.currentStageName || n.id === resolution.currentStageName)) || null;
  }, [resolution, workflow]);

  const currentStageSubstepsSummary = useMemo(() => {
    if (!currentStageNode) return null;
    return resolveStageSubsteps(currentStageNode, effectiveRecord);
  }, [currentStageNode, effectiveRecord]);

  const pendingRequiredSubstepsCount = useMemo(() => {
    return currentStageSubstepsSummary?.requiredRemaining || 0;
  }, [currentStageSubstepsSummary]);

  // Handle checking/unchecking a substep
  const handleToggleSubstep = async (stageNodeId: string, substepId: string, currentStatus: SubstepStatus) => {
    const nextStatus: SubstepStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    const targetNode = workflow?.nodes?.find((n: any) => n.id === stageNodeId || n.name === stageNodeId);
    const nId = targetNode?.id || stageNodeId;
    const nName = targetNode?.name || '';

    setOptimisticSubsteps(prev => {
      const existing = { ...(nName ? prev[nName] : {}), ...(prev[nId] || {}) };
      const updated = {
        ...existing,
        [substepId]: {
          status: nextStatus,
          updatedBy: currentUserName || 'Current User',
          updatedAt: new Date().toISOString()
        }
      };
      return {
        ...prev,
        [nId]: updated,
        ...(nName ? { [nName]: updated } : {})
      };
    });

    if (onUpdateSubstep) {
      await onUpdateSubstep(nId, substepId, nextStatus);
    }
  };

  // Handle waiving a substep with note
  const handleWaiveSubstep = async (stageNodeId: string, substepId: string, reason?: string) => {
    const note = reason?.trim() || 'Waived by operator';
    const targetNode = workflow?.nodes?.find((n: any) => n.id === stageNodeId || n.name === stageNodeId);
    const nId = targetNode?.id || stageNodeId;
    const nName = targetNode?.name || '';

    setOptimisticSubsteps(prev => {
      const existing = { ...(nName ? prev[nName] : {}), ...(prev[nId] || {}) };
      const updated = {
        ...existing,
        [substepId]: {
          status: 'waived' as SubstepStatus,
          note,
          updatedBy: currentUserName || 'Current User',
          updatedAt: new Date().toISOString()
        }
      };
      return {
        ...prev,
        [nId]: updated,
        ...(nName ? { [nName]: updated } : {})
      };
    });
    setWaivingSubstepId(null);
    setWaiveInputReason('');

    if (onUpdateSubstep) {
      await onUpdateSubstep(nId, substepId, 'waived', note);
    }
  };

  // Transition Gating: Checks missing fields & incomplete required substeps
  const handleStageOrBranchClick = (targetNodeName: string, targetNodeId: string, requiredFieldIds?: string[]) => {
    if (isTransitioning) return;

    // 1. Check for missing required fields
    const missing = checkMissingRequiredFields(requiredFieldIds, effectiveRecord, propAllFields);

    // 2. Check for incomplete required substeps on current active stage
    const substepsCheck = checkStageSubstepsSatisfied(currentStageNode || undefined, effectiveRecord);

    if (missing.length > 0 || !substepsCheck.isSatisfied) {
      setPendingAction({
        targetNodeId,
        targetNodeName,
        label: targetNodeName,
        requiredFieldIds
      });
      setMissingFields(missing);
      setIncompleteSubsteps(substepsCheck.incompleteRequired);
      setShowRequirementsModal(true);
      return;
    }

    setTransitioningTarget(targetNodeId || targetNodeName);
    if (onTransition) {
      onTransition(targetNodeName, targetNodeId);
    } else if (onUpdateStatus) {
      onUpdateStatus(targetNodeName, targetNodeId);
    }
  };

  const handleConfirmRequirements = async (values: Record<string, any>) => {
    if (!pendingAction) return;
    setTransitioningTarget(pendingAction.targetNodeId || pendingAction.targetNodeName);

    setOptimisticSubsteps({});

    if (onTransition) {
      await onTransition(pendingAction.targetNodeName, pendingAction.targetNodeId, values);
    } else if (onUpdateStatus) {
      onUpdateStatus(pendingAction.targetNodeName, pendingAction.targetNodeId);
    }

    setShowRequirementsModal(false);
    setPendingAction(null);
    setMissingFields([]);
    setIncompleteSubsteps([]);
  };

  const handleToggleSubstepFromModal = (substepId: string) => {
    const nId = currentStageNode?.id || resolution.currentStageName;
    handleToggleSubstep(nId, substepId, 'pending');
  };

  // Overview Tab State & Dropdowns
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isAssigneeMenuOpen, setIsAssigneeMenuOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isParticipantMenuOpen, setIsParticipantMenuOpen] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');

  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const participantDropdownRef = useRef<HTMLDivElement>(null);

  const handleCopyRecordLink = () => {
    if (onCopyLink) {
      onCopyLink();
    } else {
      const url = `${window.location.origin}/workspace/modules/${moduleId}/records/${recordId}`;
      navigator.clipboard.writeText(url);
      toast.success('Copied record link to clipboard');
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(target)) {
        setIsAssigneeMenuOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(target)) {
        setIsStatusMenuOpen(false);
      }
      if (participantDropdownRef.current && !participantDropdownRef.current.contains(target)) {
        setIsParticipantMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Computed values for Overview
  const currentStatus = useMemo(() => {
    return editData?.status !== undefined 
      ? editData.status 
      : (record?.status || record?.data?.status || 'New');
  }, [editData?.status, record?.status, record?.data?.status]);

  const currentAssigneeId = editData?.assigneeId !== undefined ? editData.assigneeId : record?.assigneeId;
  const currentAssignee = useMemo(() => {
    if (!currentAssigneeId) return null;
    return members.find(m => m.id === currentAssigneeId) || null;
  }, [currentAssigneeId, members]);

  const currentParticipantIds = useMemo(() => {
    const ids: string[] = editData?.participantIds !== undefined 
      ? (editData.participantIds || []) 
      : (record?.participantIds || []);
    return Array.isArray(ids) ? ids : [];
  }, [editData?.participantIds, record?.participantIds]);

  const currentParticipants = useMemo(() => {
    return members.filter(m => currentParticipantIds.includes(m.id));
  }, [currentParticipantIds, members]);

  const creator = useMemo(() => {
    const creatorId = record?.createdBy || record?.created_by || record?.creatorId || record?.createdByMemberId || record?.createdByUserId;
    const createdByMemberObj = record?.createdByMember;

    // Search members list with comprehensive matching (id, cuid, userId, email, and name)
    const member = members?.find((m: any) => {
      if (!m) return false;
      if (creatorId) {
        if (m.id === creatorId || m.cuid === creatorId || m.userId === creatorId) return true;
        if (typeof creatorId === 'string') {
          const cIdTrim = creatorId.trim().toLowerCase();
          if (m.email && m.email.toLowerCase() === cIdTrim) return true;
          if (m.name && m.name.trim().toLowerCase() === cIdTrim) return true;
          const memberFullName = `${m.firstName || ''} ${m.familyName || m.lastName || ''}`.trim().toLowerCase();
          if (memberFullName && memberFullName === cIdTrim) return true;
        }
      }
      if (record?.createdByMemberId && (m.id === record.createdByMemberId || m.cuid === record.createdByMemberId)) return true;
      if (record?.createdByUserId && (m.id === record.createdByUserId || m.userId === record.createdByUserId)) return true;
      if (createdByMemberObj) {
        if (createdByMemberObj.id && (m.id === createdByMemberObj.id || m.cuid === createdByMemberObj.id)) return true;
        if (createdByMemberObj.email && m.email && m.email.toLowerCase() === createdByMemberObj.email.toLowerCase()) return true;
        if (createdByMemberObj.name && m.name && m.name.trim().toLowerCase() === createdByMemberObj.name.trim().toLowerCase()) return true;
        const memberFullName = `${m.firstName || ''} ${m.familyName || m.lastName || ''}`.trim().toLowerCase();
        const objFullName = `${createdByMemberObj.firstName || ''} ${createdByMemberObj.familyName || createdByMemberObj.lastName || ''}`.trim().toLowerCase();
        if (memberFullName && objFullName && memberFullName === objFullName) return true;
      }
      return false;
    });

    if (member) {
      return {
        ...member,
        avatarUrl: member.avatarUrl || (member as any).avatar || (member as any).photoUrl || (member as any).picture,
        name: member.name || `${member.firstName || ''} ${member.familyName || member.lastName || ''}`.trim() || 'User'
      };
    }

    // Check against current user if not in members array or if platformUser has avatar
    const currentUserName = platformUser?.name || `${platformUser?.firstName || ''} ${platformUser?.familyName || ''}`.trim();
    const currentUserEmail = session?.user?.email || platformUser?.email;
    const currentUserId = platformUser?.id || session?.user?.id;
    const isCurrentUserCreator = (
      (creatorId && currentUserId && creatorId === currentUserId) ||
      (creatorId && typeof creatorId === 'string' && currentUserEmail && creatorId.toLowerCase() === currentUserEmail.toLowerCase()) ||
      (creatorId && typeof creatorId === 'string' && currentUserName && creatorId.trim().toLowerCase() === currentUserName.toLowerCase())
    );
    if (isCurrentUserCreator && (platformUser || session?.user)) {
      return {
        ...(platformUser || {}),
        name: currentUserName || 'You',
        avatarUrl: platformUser?.avatarUrl || (platformUser as any)?.avatar || (platformUser as any)?.photoUrl || session?.user?.user_metadata?.avatar_url || (session?.user as any)?.picture
      };
    }

    if (createdByMemberObj && typeof createdByMemberObj === 'object') {
      const name = createdByMemberObj.name || `${createdByMemberObj.firstName || ''} ${createdByMemberObj.familyName || createdByMemberObj.lastName || ''}`.trim() || 'User';
      return {
        ...createdByMemberObj,
        name,
        avatarUrl: createdByMemberObj.avatarUrl || createdByMemberObj.avatar || createdByMemberObj.photoUrl || createdByMemberObj.picture
      };
    }

    if (typeof creatorId === 'string' && creatorId.trim()) {
      return { name: creatorId };
    }
    return null;
  }, [
    record?.createdBy, 
    record?.created_by, 
    record?.creatorId, 
    record?.createdByMemberId, 
    record?.createdByUserId, 
    record?.createdByMember, 
    members,
    platformUser,
    session?.user
  ]);

  const createdDate = record?.createdAt || record?.created_at;
  const updatedDate = record?.updatedAt || record?.updated_at;

  const formatRelativeTime = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSec < 45) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 30) return `${diffDays}d ago`;
      return formatLocalizedDate(date, dateFormat);
    } catch {
      return '';
    }
  };

  const getStatusBadgeStyle = (statusName: string = '') => {
    const s = String(statusName).toLowerCase();
    if (['done', 'completed', 'resolved', 'closed', 'passed', 'approved'].some(k => s.includes(k))) {
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    }
    if (['progress', 'active', 'development', 'review', 'testing', 'uat'].some(k => s.includes(k))) {
      return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
    }
    if (['blocked', 'rejected', 'failed', 'cancelled', 'error'].some(k => s.includes(k))) {
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
    }
    if (['pending', 'waiting', 'hold', 'paused', 'backlog'].some(k => s.includes(k))) {
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    }
    return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700';
  };

  const isMe = (m: any) => {
    return m.id === (platformUser as any)?.memberId || 
           m.id === platformUser?.id || 
           m.id === session?.user?.id || 
           m.cuid === session?.user?.id;
  };

  const filteredMembers = useMemo(() => {
    if (!assigneeSearch.trim()) return members;
    const q = assigneeSearch.toLowerCase();
    return members.filter(m => (m.name || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q));
  }, [members, assigneeSearch]);

  const handleCopyKey = () => {
    if (!recordKey) return;
    navigator.clipboard.writeText(recordKey);
    setCopiedKey(true);
    toast.success(`Copied ${recordKey} to clipboard`);
    setTimeout(() => setCopiedKey(false), 2000);
  };

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

  const railTabs = useMemo(() => {
    const tabs: Array<{ id: ContextRailTab; label: string; icon: any; count: number; isLoading: boolean }> = [
      { id: 'overview', label: 'Overview', icon: SlidersHorizontal, count: 0, isLoading: false }
    ];
    if (workflow) {
      tabs.push({
        id: 'workflow',
        label: 'Workflow',
        icon: Workflow,
        count: pendingRequiredSubstepsCount,
        isLoading: isTransitioning
      });
    }
    tabs.push(
      { id: 'activity', label: 'Activity Feed', icon: History, count: meaningfulActivities.length, isLoading: activityLoading && activities.length === 0 },
      { id: 'notes', label: 'Notes', icon: StickyNote, count: notes.length, isLoading: notesLoading && notes.length === 0 },
      { id: 'files', label: 'Files & Documents', icon: Files, count: files.length, isLoading: filesLoading && files.length === 0 },
      { id: 'tasks', label: 'Tasks & Reminders', icon: Calendar, count: tasks.filter(t => t.status !== 'COMPLETED').length, isLoading: tasksLoading && tasks.length === 0 }
    );
    return tabs;
  }, [workflow, pendingRequiredSubstepsCount, isTransitioning, meaningfulActivities.length, activityLoading, activities.length, notes.length, notesLoading, files.length, filesLoading, tasks, tasksLoading]);

  const activeTabMeta = useMemo(() => {
    switch (activeTab) {
      case 'overview':
        return { title: 'Overview', icon: SlidersHorizontal, count: undefined };
      case 'workflow':
        return { title: 'Workflow Process', icon: Workflow, count: pendingRequiredSubstepsCount || undefined };
      case 'activity':
        return { title: 'Activity Timeline', icon: History, count: meaningfulActivities.length };
      case 'notes':
        return { title: 'Notes', icon: StickyNote, count: notes.length };
      case 'files':
        return { title: 'Files & Documents', icon: Files, count: files.length };
      case 'tasks':
        return { title: 'Tasks & Reminders', icon: Calendar, count: tasks.filter(t => t.status !== 'COMPLETED').length };
    }
  }, [activeTab, pendingRequiredSubstepsCount, meaningfulActivities.length, notes.length, files.length, tasks]);

  const ActiveTabIcon = activeTabMeta.icon;

  const handleTabClick = (tabId: ContextRailTab) => {
    if (isCollapsed) {
      switchTab(tabId);
      onToggleCollapse();
    } else if (activeTab === tabId) {
      // Clicking the active tab collapses the drawer
      onToggleCollapse();
    } else {
      switchTab(tabId);
    }
  };

  return (
    <div className="shrink-0 h-full flex transition-all duration-300 select-none">
      {/* 1. Main Content Drawer Panel (Smooth slide in/out matching record navigator) */}
      <div
        className={cn(
          "h-full border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-hidden shrink-0 transition-all duration-300 relative",
          isCollapsed ? "w-0 overflow-hidden border-l-0 pointer-events-none" : "w-80 xl:w-96"
        )}
      >
        <div className="w-80 xl:w-96 h-full flex flex-col shrink-0">
          {/* Drawer Header */}
          <div className="h-10 box-border px-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-zinc-900 select-none">
              <div className="flex items-center gap-2 min-w-0">
                <ActiveTabIcon size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                  {activeTabMeta.title}
                </span>
                {activeTabMeta.count !== undefined && activeTabMeta.count > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    {activeTabMeta.count}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Close Drawer [⌘\]"
              >
                <X size={14} />
              </button>
            </div>

            {/* Tab Body with Animated Slide Transitions */}
            <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col bg-zinc-50/50 dark:bg-zinc-900/40">
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                <motion.div
                  key={activeTab}
                  custom={direction}
                  variants={tabVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="w-full h-full flex flex-col min-h-0"
                >
                  {activeTab === 'activity' ? (
                    <div className="w-full h-full flex flex-col min-h-0">
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
                    members={members}
                    allFields={propAllFields}
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
        <div className="w-full h-full overflow-y-auto custom-scrollbar p-3 space-y-3">
          {activeTab === 'overview' && (
            <div className="space-y-3">
              {/* 1. Quick Action Command Bar (Uniform Icon Actions) */}
              <div className="p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xs flex items-center justify-between gap-1">
                {/* Star Toggle Button */}
                {onToggleStar && (
                  <button
                    type="button"
                    onClick={onToggleStar}
                    className={cn(
                      "flex-1 py-1.5 rounded-xl transition-all border cursor-pointer shadow-2xs flex items-center justify-center",
                      isStarred
                        ? "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                        : "bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-200/60 dark:border-zinc-700/60"
                    )}
                    title={isStarred ? "Unstar Record" : "Star Record"}
                  >
                    <Star size={13} className={cn(isStarred ? "fill-amber-400 text-amber-500" : "")} />
                  </button>
                )}

                {/* Duplicate Record */}
                {onDuplicate && (
                  <button
                    type="button"
                    disabled={isCloning}
                    onClick={onDuplicate}
                    className="flex-1 py-1.5 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200/60 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-800/60 cursor-pointer shadow-2xs flex items-center justify-center disabled:opacity-50"
                    title="Duplicate Record"
                  >
                    {isCloning ? <Loader2 size={13} className="animate-spin text-zinc-400" /> : <CopyPlus size={13} />}
                  </button>
                )}

                {/* Export PDF */}
                {onExportPdf && (
                  <button
                    type="button"
                    onClick={onExportPdf}
                    className="flex-1 py-1.5 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200/60 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-800/60 cursor-pointer shadow-2xs flex items-center justify-center"
                    title="Export PDF"
                  >
                    <FileText size={13} />
                  </button>
                )}

                {/* Share Button */}
                {onOpenShare && (
                  <button
                    type="button"
                    onClick={onOpenShare}
                    className="flex-1 py-1.5 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200/60 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-800/60 cursor-pointer shadow-2xs flex items-center justify-center"
                    title="Share Record"
                  >
                    <Share2 size={13} />
                  </button>
                )}

                {/* Copy Link Button */}
                <button
                  type="button"
                  onClick={handleCopyRecordLink}
                  className="flex-1 py-1.5 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200/60 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-800/60 cursor-pointer shadow-2xs flex items-center justify-center"
                  title="Copy Record Link"
                >
                  {copiedLink ? <Check size={13} className="text-emerald-500" /> : <Link2 size={13} />}
                </button>

                {/* Move to Recycling Bin */}
                {onDeleteRecord && (
                  <button
                    type="button"
                    onClick={onDeleteRecord}
                    className="flex-1 py-1.5 rounded-xl text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors border border-zinc-200/60 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-800/60 cursor-pointer shadow-2xs flex items-center justify-center"
                    title="Move to Recycling Bin"
                  >
                    <Trash2 size={13} />
                  </button>
                )}

                {/* Open Full Page View Button (when in split view / embedded) */}
                {fullViewUrl && (
                  <a
                    href={fullViewUrl}
                    className="flex-1 py-1.5 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border border-zinc-200/60 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-800/60 cursor-pointer shadow-2xs flex items-center justify-center"
                    title="Open full page view"
                  >
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>

              {/* 2. Record Identity & Quick Reference Header */}
              <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                      {recordKey}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyKey}
                      className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Copy Key"
                    >
                      {copiedKey ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </button>
                  </div>

                  {/* Priority or Type tag if available */}
                  {(record?.priority || record?.data?.priority || record?.type || record?.data?.type) && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      {record?.priority || record?.data?.priority || record?.type || record?.data?.type}
                    </span>
                  )}
                </div>

                {/* Module / Queue Location */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 min-w-0">
                    <Layers size={13} className="text-zinc-400 shrink-0" />
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate">
                      {moduleData?.name || record?.moduleName || 'Queue Record'}
                    </span>
                  </div>

                  {onOpenMove && (
                    <button
                      type="button"
                      onClick={onOpenMove}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/80 transition-all cursor-pointer shadow-2xs shrink-0"
                      title="Move record to another module"
                    >
                      <FolderInput size={12} />
                      <span>Move</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Status & Workflow Section */}
              <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xs space-y-2 relative" ref={statusDropdownRef}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Workflow Status
                  </span>
                  <div className="flex items-center gap-2">
                    {workflow && (
                      <button
                        type="button"
                        onClick={() => switchTab('workflow')}
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                        title="View interactive workflow console"
                      >
                        <Workflow size={10} />
                        <span>Console</span>
                      </button>
                    )}
                    {onUpdateStatus && (
                      <button
                        type="button"
                        onClick={() => setIsStatusMenuOpen(prev => !prev)}
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>Change</span>
                        <ChevronDown size={11} className={cn("transition-transform", isStatusMenuOpen && "rotate-180")} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border",
                    getStatusBadgeStyle(currentStatus)
                  )}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {currentStatus}
                  </span>

                  {workflow?.name && (
                    <span className="text-[10px] text-zinc-400 truncate max-w-[140px]" title={workflow.name}>
                      {workflow.name}
                    </span>
                  )}
                </div>

                {/* Status Picker Popover */}
                {isStatusMenuOpen && onUpdateStatus && (
                  <div className="absolute left-3 right-3 top-full mt-1.5 z-30 p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl space-y-1">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 px-2 py-1">
                      Transition Stage
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar">
                      {statusOptions.map((opt: any, idx: number) => {
                        const optVal = typeof opt === 'string' ? opt : opt.name || opt.label || opt.value || opt.id;
                        const optId = typeof opt === 'string' ? opt : opt.id || optVal;
                        const isCurrent = currentStatus.toLowerCase() === optVal.toLowerCase();
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              onUpdateStatus(optVal, optId);
                              setIsStatusMenuOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer",
                              isCurrent
                                ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold"
                                : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            )}
                          >
                            <span className="truncate">{optVal}</span>
                            {isCurrent && <Check size={12} className="text-indigo-600 dark:text-indigo-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. People Section */}
              <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xs space-y-3">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  People
                </span>

                {/* Assignee Row */}
                <div className="relative" ref={assigneeDropdownRef}>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Assignee</span>
                    <button
                      type="button"
                      onClick={() => onUpdateAssignee && setIsAssigneeMenuOpen(prev => !prev)}
                      disabled={!onUpdateAssignee}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all text-xs text-right max-w-[190px]",
                        onUpdateAssignee ? "hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer" : "cursor-default"
                      )}
                    >
                      {currentAssignee ? (
                        <>
                          <UserAvatarWithPresence
                            avatarUrl={currentAssignee.avatarUrl}
                            name={currentAssignee.name}
                            status={(currentAssignee as any).status || (currentAssignee as any).presenceStatus || 'AVAILABLE'}
                            size="xs"
                          />
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {currentAssignee.name}
                          </span>
                        </>
                      ) : (
                        <span className="text-zinc-400 italic font-normal flex items-center gap-1">
                          <User size={12} />
                          Unassigned
                        </span>
                      )}
                      {onUpdateAssignee && <ChevronDown size={11} className="text-zinc-400 shrink-0" />}
                    </button>
                  </div>

                  {/* Assignee Selection Popover */}
                  {isAssigneeMenuOpen && onUpdateAssignee && (
                    <div className="absolute right-0 top-full mt-1.5 z-30 w-64 p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl space-y-1.5">
                      {/* Search */}
                      <div className="relative">
                        <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          placeholder="Search team..."
                          value={assigneeSearch}
                          onChange={(e) => setAssigneeSearch(e.target.value)}
                          className="w-full pl-7 pr-2.5 py-1 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Quick Actions */}
                      <div className="flex flex-col gap-0.5 border-b border-zinc-100 dark:border-zinc-800 pb-1">
                        <button
                          type="button"
                          onClick={() => {
                            const me = members.find(isMe);
                            if (me) onUpdateAssignee(me.id);
                            else if (session?.user?.id) onUpdateAssignee(session.user.id);
                            setIsAssigneeMenuOpen(false);
                          }}
                          className="w-full text-left px-2 py-1 rounded-md text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <UserCheck size={12} />
                          <span>Assign to me</span>
                        </button>
                        {currentAssignee && (
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateAssignee(null);
                              setIsAssigneeMenuOpen(false);
                            }}
                            className="w-full text-left px-2 py-1 rounded-md text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <UserMinus size={12} />
                            <span>Unassign</span>
                          </button>
                        )}
                      </div>

                      {/* Member List */}
                      <div className="max-h-44 overflow-y-auto space-y-0.5 custom-scrollbar">
                        {filteredMembers.map(member => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => {
                              onUpdateAssignee(member.id);
                              setIsAssigneeMenuOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer",
                              currentAssignee?.id === member.id
                                ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold"
                                : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <UserAvatarWithPresence
                                avatarUrl={member.avatarUrl}
                                name={member.name}
                                status={(member as any).status || (member as any).presenceStatus || 'AVAILABLE'}
                                size="xs"
                              />
                              <span className="truncate">{member.name}</span>
                            </div>
                            {currentAssignee?.id === member.id && <Check size={12} className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Created By Row */}
                <div className="flex items-center justify-between py-1 border-t border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Created By</span>
                  <div className="flex items-center gap-1.5 max-w-[190px]">
                    {creator ? (
                      <>
                        <UserAvatarWithPresence
                          avatarUrl={creator.avatarUrl}
                          name={creator.name || 'User'}
                          status={(creator as any).status || (creator as any).presenceStatus || 'AVAILABLE'}
                          size="xs"
                        />
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                          {creator.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-zinc-400">System</span>
                    )}
                  </div>
                </div>

                {/* Participants / Watchers Row (with Interactive Popover Checklist) */}
                <div className="relative border-t border-zinc-100 dark:border-zinc-800/60 pt-1" ref={participantDropdownRef}>
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      <Users size={12} />
                      <span>Participants</span>
                      {currentParticipants.length > 0 && (
                        <span className="text-[10px] px-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold">
                          {currentParticipants.length}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {currentParticipants.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setIsParticipantMenuOpen(!isParticipantMenuOpen)}
                          className="flex -space-x-1.5 overflow-hidden hover:opacity-85 transition-opacity cursor-pointer p-0.5 rounded-full"
                          title="Manage participants"
                        >
                          {currentParticipants.slice(0, 3).map((p, idx) => (
                            <div key={idx} title={p.name} className="ring-2 ring-white dark:ring-zinc-900 rounded-full">
                              <UserAvatarWithPresence
                                avatarUrl={p.avatarUrl}
                                name={p.name}
                                status={(p as any).status || (p as any).presenceStatus || 'AVAILABLE'}
                                size="xs"
                              />
                            </div>
                          ))}
                          {currentParticipants.length > 3 && (
                            <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-zinc-900">
                              +{currentParticipants.length - 3}
                            </span>
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-400 italic">None</span>
                      )}

                      {/* Add / Manage Participants Button */}
                      <button
                        type="button"
                        onClick={() => setIsParticipantMenuOpen(!isParticipantMenuOpen)}
                        className={cn(
                          "p-1 rounded-md transition-colors ml-1 cursor-pointer",
                          isParticipantMenuOpen
                            ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                            : "text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        )}
                        title="Add / Manage Participants"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Dedicated Interactive Participants Popover */}
                  {isParticipantMenuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 z-30 w-64 p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl space-y-1.5">
                      {/* Search */}
                      <div className="relative">
                        <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          placeholder="Search members..."
                          value={participantSearch}
                          onChange={(e) => setParticipantSearch(e.target.value)}
                          className="w-full pl-7 pr-2.5 py-1 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500"
                          autoFocus
                        />
                      </div>

                      {/* Quick Actions */}
                      <div className="flex flex-col gap-0.5 border-b border-zinc-100 dark:border-zinc-800 pb-1">
                        {onToggleParticipant && (
                          <button
                            type="button"
                            onClick={() => {
                              const me = members.find(m => m.id === platformUser?.memberId || m.id === platformUser?.cuid || isMe(m));
                              if (me) onToggleParticipant(me.id);
                              else if (session?.user?.id) onToggleParticipant(session.user.id);
                            }}
                            className="w-full text-left px-2 py-1 rounded-md text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <UserPlus size={12} />
                            <span>Toggle myself</span>
                          </button>
                        )}
                        {currentParticipantIds.length > 0 && onClearParticipants && (
                          <button
                            type="button"
                            onClick={() => {
                              onClearParticipants();
                              setIsParticipantMenuOpen(false);
                            }}
                            className="w-full text-left px-2 py-1 rounded-md text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <UserMinus size={12} />
                            <span>Clear All Participants</span>
                          </button>
                        )}
                      </div>

                      {/* Member Checklist */}
                      <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar">
                        {members
                          .filter(m => !m.isSynthetic && m.name.toLowerCase().includes(participantSearch.toLowerCase()))
                          .map(member => {
                            const isSelected = currentParticipantIds.includes(member.id);
                            return (
                              <button
                                key={member.id}
                                type="button"
                                onClick={() => onToggleParticipant?.(member.id)}
                                className={cn(
                                  "w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer",
                                  isSelected
                                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold"
                                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                )}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <UserAvatarWithPresence
                                    avatarUrl={member.avatarUrl}
                                    name={member.name}
                                    status={(member as any).status || (member as any).presenceStatus || 'AVAILABLE'}
                                    size="xs"
                                  />
                                  <div className="min-w-0">
                                    <span className="truncate leading-none block">{member.name}</span>
                                    <span className="text-[9px] text-zinc-400 block truncate">{member.email}</span>
                                  </div>
                                </div>
                                {isSelected && <Check size={12} className="text-indigo-600 dark:text-indigo-400 shrink-0 ml-1.5" />}
                              </button>
                            );
                          })}
                        {members.filter(m => !m.isSynthetic && m.name.toLowerCase().includes(participantSearch.toLowerCase())).length === 0 && (
                          <p className="text-[10px] text-zinc-400 text-center py-3 italic">No team members found</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Dates & Audit */}
              <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xs space-y-2.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Dates & Audit
                </span>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <Clock size={12} className="text-zinc-400" />
                      Created
                    </span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200 text-right">
                      {createdDate ? (
                        <>
                          {formatLocalizedDate(createdDate, dateFormat, true)}
                          {formatRelativeTime(createdDate) && (
                            <span className="text-zinc-400 text-[10px] ml-1.5 font-normal">
                              ({formatRelativeTime(createdDate)})
                            </span>
                          )}
                        </>
                      ) : '—'}
                    </span>
                  </div>

                  {updatedDate && (
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                      <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <Clock size={12} className="text-zinc-400" />
                        Updated
                      </span>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200 text-right">
                        {formatLocalizedDate(updatedDate, dateFormat, true)}
                        {formatRelativeTime(updatedDate) && (
                          <span className="text-zinc-400 text-[10px] ml-1.5 font-normal">
                            ({formatRelativeTime(updatedDate)})
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Source field if present */}
                  {(record?.source || record?.data?.source) && (
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                      <span className="text-zinc-500 dark:text-zinc-400">Submission Source</span>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {record?.source || record?.data?.source}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Quick Jump Shortcuts */}
              <div className="p-3 bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Quick Jump
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => switchTab('activity')}
                    className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-800/90 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 border border-zinc-200/60 dark:border-zinc-700/60 text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <History size={12} className="text-zinc-400 group-hover:text-indigo-500 shrink-0" />
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">Activity</span>
                    </div>
                    {meaningfulActivities.length > 0 && (
                      <span className="text-[10px] px-1.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300 font-bold shrink-0">
                        {meaningfulActivities.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => switchTab('tasks')}
                    className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-800/90 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 border border-zinc-200/60 dark:border-zinc-700/60 text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Calendar size={12} className="text-zinc-400 group-hover:text-indigo-500 shrink-0" />
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">Tasks</span>
                    </div>
                    {tasks.length > 0 && (
                      <span className="text-[10px] px-1.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300 font-bold shrink-0">
                        {tasks.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => switchTab('notes')}
                    className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-800/90 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 border border-zinc-200/60 dark:border-zinc-700/60 text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <StickyNote size={12} className="text-zinc-400 group-hover:text-indigo-500 shrink-0" />
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">Notes</span>
                    </div>
                    {notes.length > 0 && (
                      <span className="text-[10px] px-1.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300 font-bold shrink-0">
                        {notes.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => switchTab('files')}
                    className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-800/90 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 border border-zinc-200/60 dark:border-zinc-700/60 text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Files size={12} className="text-zinc-400 group-hover:text-indigo-500 shrink-0" />
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">Files</span>
                    </div>
                    {files.length > 0 && (
                      <span className="text-[10px] px-1.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300 font-bold shrink-0">
                        {files.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* B. WORKFLOW CONSOLE TAB */}
          {activeTab === 'workflow' && (
            <div className="space-y-3">
              {/* If no workflow configured */}
              {!workflow || !resolution.hasWorkflow ? (
                <div className="p-6 text-center space-y-2 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl">
                  <Workflow className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto" />
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">No Workflow Configured</p>
                  <p className="text-[11px] text-zinc-400">
                    This module does not have an active process workflow attached.
                  </p>
                </div>
              ) : (
                <>
                  {/* 1. Current Stage Hero Card */}
                  <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Workflow size={11} className="text-indigo-500" />
                        <span>Current Stage</span>
                      </span>

                      <div className="flex items-center gap-2">
                        {onOpenHistory && (
                          <button
                            type="button"
                            onClick={onOpenHistory}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                            title="View workflow transition history"
                          >
                            <History size={11} />
                            <span>History</span>
                          </button>
                        )}
                        {onOpenVisualizer && (
                          <button
                            type="button"
                            onClick={onOpenVisualizer}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                            title="Open workflow visualizer canvas"
                          >
                            <GitFork size={11} />
                            <span>Visualizer</span>
                            <ExternalLink size={10} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                          {resolution.currentStageName || 'Not Started'}
                        </h3>
                        {workflow.name && (
                          <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                            {workflow.name}
                          </p>
                        )}
                      </div>

                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shrink-0",
                        resolution.isCompleted
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : !resolution.isStarted
                          ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                          : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full bg-current", !resolution.isCompleted && resolution.isStarted && "animate-pulse")} />
                        {resolution.isCompleted ? 'Completed' : !resolution.isStarted ? 'Draft' : 'In Progress'}
                      </span>
                    </div>

                    {/* SLA Status Banner if configured */}
                    {slaStatus.level !== 'NONE' && (
                      <div className={cn(
                        "p-2 rounded-xl text-xs flex items-center justify-between border",
                        slaStatus.color === 'rose'
                          ? "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                          : slaStatus.color === 'amber'
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      )}>
                        <div className="flex items-center gap-1.5 truncate">
                          <Clock size={12} className="shrink-0" />
                          <span className="font-semibold truncate">{slaStatus.label || 'SLA Target'}</span>
                        </div>
                        {slaStatus.nearestDate && (
                          <span className="text-[10px] font-mono shrink-0">
                            {formatLocalizedDate(slaStatus.nearestDate, dateFormat)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2. Primary Next Transitions / Action Area */}
                  {!resolution.isStarted ? (
                    <div className="p-3.5 bg-gradient-to-br from-indigo-50/70 to-purple-50/40 dark:from-indigo-950/30 dark:to-purple-950/20 border border-indigo-500/20 rounded-2xl space-y-2.5">
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Workflow Ready</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                        Initiate this record into the lifecycle pipeline to track stages, requirements, and SLAs.
                      </p>
                      {onStartWorkflow && (
                        <button
                          type="button"
                          disabled={isTransitioning}
                          onClick={() => onStartWorkflow()}
                          className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-60"
                        >
                          {isTransitioning ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Play size={13} className="fill-current" />
                          )}
                          <span>Start Workflow</span>
                        </button>
                      )}
                    </div>
                  ) : resolution.isCompleted ? (
                    <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={18} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                          Workflow Completed
                        </h4>
                        <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 leading-snug">
                          All process milestones and requirements have been satisfied.
                        </p>
                      </div>
                    </div>
                  ) : resolution.availableTransitions.length > 0 ? (
                    <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        <span>Transition workflow</span>
                        <span className="font-normal lowercase font-mono">
                          {resolution.availableTransitions.length} option{resolution.availableTransitions.length === 1 ? '' : 's'}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        {resolution.availableTransitions.map((action: NextStepAction) => {
                          const isActionTransitioning = isTransitioning && (transitioningTarget === action.targetNodeId || transitioningTarget === action.targetNodeName);
                          const isDestructive = action.variant === 'destructive';
                          const isSuccess = action.variant === 'success';

                          return (
                            <button
                              key={action.targetNodeId || action.targetNodeName}
                              type="button"
                              disabled={isTransitioning}
                              onClick={() => handleStageOrBranchClick(action.targetNodeName, action.targetNodeId, action.requiredFieldIds)}
                              className={cn(
                                "w-full px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer shadow-xs disabled:opacity-60 group",
                                isDestructive
                                  ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                  : isSuccess
                                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20"
                                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
                              )}
                            >
                              <span className="flex items-center gap-2 truncate">
                                {isActionTransitioning ? (
                                  <Loader2 size={13} className="animate-spin shrink-0" />
                                ) : isDestructive ? (
                                  <RotateCcw size={13} className="shrink-0 group-hover:-rotate-45 transition-transform" />
                                ) : (
                                  <ArrowRight size={13} className="shrink-0 group-hover:translate-x-0.5 transition-transform" />
                                )}
                                <span className="truncate">{action.label || `Advance to ${action.targetNodeName}`}</span>
                              </span>

                              {action.requiredFieldIds && action.requiredFieldIds.length > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/20 text-white/90 shrink-0 font-normal">
                                  {action.requiredFieldIds.length} required
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {/* 3. Stage Substeps Checklist */}
                  {currentStageSubstepsSummary && currentStageSubstepsSummary.total > 0 && (
                    <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckSquare size={11} className="text-indigo-500" />
                          <span>Stage Checklist</span>
                        </span>

                        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                          {currentStageSubstepsSummary.completed}/{currentStageSubstepsSummary.total} done
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            currentStageSubstepsSummary.isSatisfied ? "bg-emerald-500" : "bg-indigo-600"
                          )}
                          style={{
                            width: `${Math.round((currentStageSubstepsSummary.completed / currentStageSubstepsSummary.total) * 100)}%`
                          }}
                        />
                      </div>

                      {/* Substep Items */}
                      <div className="space-y-2">
                        {currentStageSubstepsSummary.items.map((substep) => {
                          const isItemDone = substep.status === 'completed';
                          const isItemWaived = substep.status === 'waived';
                          const stageNodeId = currentStageNode?.id || resolution.currentStageName;

                          return (
                            <div
                              key={substep.id}
                              className={cn(
                                "p-2.5 rounded-xl border transition-all text-xs",
                                isItemDone
                                  ? "bg-zinc-50/60 dark:bg-zinc-900/40 border-zinc-200/50 dark:border-zinc-800/50"
                                  : isItemWaived
                                  ? "bg-amber-50/30 dark:bg-amber-950/20 border-amber-500/20"
                                  : "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80 hover:border-indigo-500/40 shadow-2xs"
                              )}
                            >
                              <div className="flex items-start gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleSubstep(stageNodeId, substep.id, substep.status)}
                                  className="pt-0.5 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shrink-0 cursor-pointer"
                                  title={isItemDone ? "Mark as pending" : "Mark as completed"}
                                >
                                  {isItemDone ? (
                                    <CheckCircle2 size={15} className="text-emerald-500" />
                                  ) : isItemWaived ? (
                                    <ShieldAlert size={15} className="text-amber-500" />
                                  ) : (
                                    <Circle size={15} />
                                  )}
                                </button>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <p className={cn(
                                      "font-medium leading-snug",
                                      isItemDone ? "line-through text-zinc-400" : isItemWaived ? "text-amber-700 dark:text-amber-300 italic" : "text-zinc-900 dark:text-zinc-100"
                                    )}>
                                      {substep.label}
                                    </p>

                                    {substep.required && !isItemDone && !isItemWaived && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                                        Required
                                      </span>
                                    )}
                                    {isItemWaived && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                                        Waived
                                      </span>
                                    )}
                                  </div>

                                  {substep.description && !isItemDone && !isItemWaived && (
                                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                                      {substep.description}
                                    </p>
                                  )}

                                  {/* Completion / Waived Metadata */}
                                  {(substep.updatedBy || substep.updatedAt || substep.note) && (
                                    <div className="text-[10px] text-zinc-400 mt-1 flex flex-wrap items-center gap-1">
                                      {substep.updatedBy && <span>By {substep.updatedBy}</span>}
                                      {substep.updatedAt && <span>• {formatTimeAgo(substep.updatedAt)}</span>}
                                      {substep.note && <span className="italic text-zinc-500">({substep.note})</span>}
                                    </div>
                                  )}

                                  {/* Waive Toggle Option */}
                                  {!isItemDone && !isItemWaived && waivingSubstepId !== substep.id && (
                                    <div className="mt-1">
                                      <button
                                        type="button"
                                        onClick={() => { setWaivingSubstepId(substep.id); setWaiveInputReason(''); }}
                                        className="text-[10px] text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 font-medium underline cursor-pointer"
                                      >
                                        Waive substep...
                                      </button>
                                    </div>
                                  )}

                                  {/* Inline Waive Input Form */}
                                  {waivingSubstepId === substep.id && (
                                    <div className="mt-2 p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 space-y-1.5">
                                      <input
                                        type="text"
                                        placeholder="Reason for waiving (optional)..."
                                        value={waiveInputReason}
                                        onChange={(e) => setWaiveInputReason(e.target.value)}
                                        className="w-full text-xs px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500"
                                        autoFocus
                                      />
                                      <div className="flex justify-end gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => { setWaivingSubstepId(null); setWaiveInputReason(''); }}
                                          className="px-2 py-0.5 text-[11px] text-zinc-400 hover:text-zinc-600 cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleWaiveSubstep(stageNodeId, substep.id, waiveInputReason)}
                                          className="px-2 py-0.5 text-[11px] font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded cursor-pointer"
                                        >
                                          Confirm Waive
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 4. Active Stage Automated Triggers */}
                  {currentStageNode?.automatedActions && currentStageNode.automatedActions.length > 0 && (
                    <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xs space-y-2.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        <Zap size={11} className="text-amber-500" />
                        <span>Automated Triggers</span>
                      </div>
                      <div className="space-y-1.5">
                        {currentStageNode.automatedActions.map((auto: any) => (
                          <div
                            key={auto.id}
                            className="p-2 rounded-xl bg-amber-50/30 dark:bg-amber-950/20 border border-amber-500/20 flex items-center justify-between text-xs"
                          >
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                              {auto.name}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                              {auto.type || 'AUTOMATION'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5. Vertical Pipeline Timeline (Process Stages Tree) */}
                  <div className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xs space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      <span>Workflow</span>
                      {resolution.stages.length > 0 && (
                        <span className="font-normal font-mono lowercase">
                          {resolution.stages.filter(s => s.isCompleted).length}/{resolution.stages.length} done
                        </span>
                      )}
                    </div>

                    <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
                      {resolution.steps.map((step) => {
                        if (!step.isFork) {
                          const stage = step.stages[0];
                          if (!stage) return null;
                          const isCurrent = stage.isCurrent;
                          const isCompleted = stage.isCompleted;
                          const isNext = stage.isDirectNext;
                          const isStageTransitioning = isTransitioning && (transitioningTarget === stage.id || transitioningTarget === stage.name);

                          return (
                            <div key={stage.id} className="relative group">
                              {/* Spine Node Dot */}
                              <div className={cn(
                                "absolute -left-6 top-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-all -translate-x-[2px]",
                                isCurrent
                                  ? "bg-indigo-600 text-white ring-4 ring-indigo-500/20 shadow-xs"
                                  : isCompleted
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                  : "bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-400"
                              )}>
                                {isStageTransitioning ? (
                                  <Loader2 size={11} className="animate-spin text-indigo-500" />
                                ) : isCompleted ? (
                                  <Check size={11} className="stroke-[2.5]" />
                                ) : isCurrent ? (
                                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                ) : (
                                  <Circle size={7} className="fill-current opacity-40" />
                                )}
                              </div>

                              {/* Stage Card */}
                              <div className={cn(
                                "p-2.5 rounded-xl border transition-all text-xs",
                                isCurrent
                                  ? "bg-indigo-50/20 dark:bg-indigo-950/20 border-indigo-500/30 shadow-xs"
                                  : isCompleted
                                  ? "bg-white/40 dark:bg-zinc-900/40 border-zinc-200/50 dark:border-zinc-800/50 opacity-80"
                                  : "bg-white/30 dark:bg-zinc-900/20 border-zinc-200/40 dark:border-zinc-800/40"
                              )}>
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className={cn(
                                    "font-semibold truncate",
                                    isCurrent ? "text-indigo-600 dark:text-indigo-400" : isCompleted ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-400"
                                  )}>
                                    {stage.name}
                                  </span>

                                  {isCurrent && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                                      Active
                                    </span>
                                  )}
                                  {isCompleted && (
                                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                                      Done
                                    </span>
                                  )}
                                  {!isCurrent && !isCompleted && isNext && (
                                    <button
                                      type="button"
                                      disabled={isTransitioning}
                                      onClick={() => handleStageOrBranchClick(stage.name, stage.id, stage.requiredFieldIds)}
                                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-indigo-500/10 text-zinc-600 hover:text-indigo-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:text-indigo-400 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer shrink-0"
                                    >
                                      Transition
                                    </button>
                                  )}
                                </div>

                                {/* Substeps or Automations summary pill */}
                                {(Boolean(stage.substeps?.length) || Boolean(stage.automatedActions?.length)) && (
                                  <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
                                    {stage.substeps && stage.substeps.length > 0 && (
                                      <span className="flex items-center gap-1">
                                        <CheckSquare size={10} />
                                        <span>
                                          {stage.substepsSummary ? `${stage.substepsSummary.completed}/${stage.substepsSummary.total}` : `${stage.substeps.length}`} steps
                                        </span>
                                      </span>
                                    )}
                                    {stage.automatedActions && stage.automatedActions.length > 0 && (
                                      <span className="flex items-center gap-0.5 text-amber-500">
                                        <Zap size={10} />
                                        <span>{stage.automatedActions.length} auto</span>
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        } else {
                          // Fork / Branching step
                          const activeBranchStage = step.stages.find(s => s.isCurrent);
                          return (
                            <div key={step.id} className="relative group">
                              {/* Spine Node Dot for Fork */}
                              <div className={cn(
                                "absolute -left-6 top-2 w-5 h-5 rounded-full flex items-center justify-center transition-all -translate-x-[2px]",
                                activeBranchStage
                                  ? "bg-indigo-600 text-white ring-4 ring-indigo-500/20 shadow-xs"
                                  : "bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-400"
                              )}>
                                <GitFork size={11} />
                              </div>

                              {/* Fork Container */}
                              <div className="p-2.5 rounded-xl border border-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                  <span className="flex items-center gap-1.5">
                                    <GitFork size={12} className="text-indigo-500" />
                                    <span>Branching Decision</span>
                                  </span>
                                  <span className="text-[10px] font-normal text-zinc-400">
                                    {step.stages.length} paths
                                  </span>
                                </div>

                                {/* Branch Sub-cards */}
                                <div className="space-y-1.5 pl-2 border-l-2 border-indigo-200 dark:border-indigo-800/80">
                                  {step.stages.map(bStage => {
                                    const isBranchActive = bStage.isCurrent;
                                    const isBranchCompleted = bStage.isCompleted;
                                    const isReachable = bStage.isDirectNext;
                                    return (
                                      <div
                                        key={bStage.id}
                                        className={cn(
                                          "p-2 rounded-lg border text-xs transition-all",
                                          isBranchActive
                                            ? "bg-white dark:bg-zinc-900 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-2xs font-semibold"
                                            : isBranchCompleted
                                            ? "bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-500"
                                            : "bg-white/30 dark:bg-zinc-900/30 border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400"
                                        )}
                                      >
                                        <div className="flex items-center justify-between gap-1.5">
                                          <span className="truncate">{bStage.name}</span>
                                          {isBranchActive ? (
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500 text-white shrink-0">
                                              Current
                                            </span>
                                          ) : isBranchCompleted ? (
                                            <span className="text-[9px] text-emerald-500 font-semibold shrink-0">Done</span>
                                          ) : isReachable ? (
                                            <button
                                              type="button"
                                              disabled={isTransitioning}
                                              onClick={() => handleStageOrBranchClick(bStage.name, bStage.id, bStage.requiredFieldIds)}
                                              className="text-[9px] font-semibold px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shrink-0"
                                            >
                                              Select
                                            </button>
                                          ) : null}
                                        </div>
                                        {bStage.decisionName && (
                                          <div className="text-[10px] text-zinc-400 mt-0.5 truncate">
                                            Rule: {bStage.decisionName}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        }
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

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
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 2. Docked Vertical Icon Rail (Always Visible on Far Right) */}
      <div className="w-12 shrink-0 h-full border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col transition-all duration-300">
        {/* Top Header Cell - aligned with center tabs and drawer header (h-10 border-b) */}
        <div className="h-10 box-border border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0 bg-white dark:bg-zinc-900">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shadow-2xs"
            title={isCollapsed ? "Expand Details [⌘\\]" : "Collapse Details [⌘\\]"}
          >
            {isCollapsed ? <PanelRightOpen size={15} /> : <PanelRightClose size={15} />}
          </button>
        </div>

        {/* Vertical Icon Buttons */}
        <div className="flex flex-col gap-2 items-center w-full px-1.5 py-2.5">
          {railTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = !isCollapsed && activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  "relative p-2 rounded-xl transition-colors cursor-pointer group flex items-center justify-center w-9 h-9",
                  isActive
                    ? "text-indigo-600 dark:text-indigo-400 font-bold"
                    : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                )}
                title={tab.label}
              >
                {/* Animated Gliding Left Accent Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeVerticalRailIndicator"
                    className="absolute -left-1.5 top-1.5 bottom-1.5 w-1 rounded-full bg-indigo-600 dark:bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.6)] z-20"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}

                <Icon size={16} className={cn("relative z-10 transition-transform group-hover:scale-105", isActive ? "scale-105 text-indigo-600 dark:text-indigo-400" : "text-zinc-400")} />

                {/* Loading Indicator */}
                {tab.isLoading && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500 animate-pulse z-10" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Requirements & Gating Modal for Transitions */}
      <TransitionRequirementsModal
        isOpen={showRequirementsModal}
        onClose={() => {
          setShowRequirementsModal(false);
          setPendingAction(null);
        }}
        targetNodeName={pendingAction?.targetNodeName || ''}
        missingFields={missingFields}
        incompleteSubsteps={incompleteSubsteps}
        currentStageName={resolution.currentStageName}
        onConfirm={handleConfirmRequirements}
        onToggleSubstepInWorkspace={handleToggleSubstepFromModal}
        isSubmitting={isTransitioning}
      />
    </div>
  );
};
