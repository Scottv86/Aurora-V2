import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Clock, 
  User, 
  Sparkles,
  Zap,
  Database,
  CheckCircle2,
  AlertTriangle,
  Flame,
  LayoutGrid,
  List,
  Columns,
  ArrowRight,
  ExternalLink,
  UserCheck,
  UserMinus,
  X,
  SlidersHorizontal,
  RefreshCw,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

import { usePlatform } from '../hooks/usePlatform';
import { useData } from '../hooks/useData';
import { DocumentList } from './DocumentList';
import { DocumentGeneratorModal } from './DocumentGeneratorModal';
import { UserAvatarWithPresence } from './Common/UserPresenceBadge';

export type WorkQueueViewMode = 'split' | 'list' | 'kanban';
export type WorkQueueFilterTab = 'mine' | 'urgent' | 'due_today' | 'unassigned' | 'in_progress' | 'completed' | 'all';

export interface WorkQueueProps {
  isWidget?: boolean;
  widgetTitle?: string;
  widgetProperties?: {
    viewMode?: WorkQueueViewMode;
    defaultFilter?: WorkQueueFilterTab;
    showKpiRibbon?: boolean;
    density?: 'compact' | 'comfortable';
    pageSize?: number;
    showQuickActions?: boolean;
    moduleId?: string;
    moduleIds?: string[];
    [key: string]: any;
  };
  className?: string;
}

const STATUS_ORDER = ['New', 'In Progress', 'Under Review', 'Completed'] as const;

export const WorkQueue: React.FC<WorkQueueProps> = ({
  isWidget = false,
  widgetTitle,
  widgetProperties = {},
  className
}) => {
  const { tenant, user: platformUser, isLoading: platformLoading, members, modules: platformModules } = usePlatform();
  const [page, setPage] = useState(1);
  const pageSize = widgetProperties?.pageSize || 25;
  const { data: cases, loading: casesLoading, hasMore, mutate: mutateCases } = useData('records', { page, limit: pageSize, append: true });
  const modules = platformModules || [];

  // View & UI states
  const [viewMode, setViewMode] = useState<WorkQueueViewMode>(widgetProperties?.viewMode || 'split');
  const [activeFilterTab, setActiveFilterTab] = useState<WorkQueueFilterTab>(widgetProperties?.defaultFilter || 'mine');
  const [isDetailPaneOpen, setIsDetailPaneOpen] = useState(false);
  const showKpiRibbon = widgetProperties?.showKpiRibbon ?? true;
  
  // Selection and Detail states
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'documents'>('details');

  // Search & advanced filters
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>(widgetProperties?.moduleId || 'all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'High' | 'Medium' | 'Low'>('all');
  const [sortBy, setSortBy] = useState<'urgency' | 'newest' | 'priority' | 'title'>('urgency');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [aiRecommendedCaseId, setAiRecommendedCaseId] = useState<string | null>(null);

  const myMemberId = platformUser?.memberId || platformUser?.cuid || platformUser?.id;

  const activeModuleIds = useMemo(() => {
    const activeIds = new Set<string>();
    (platformModules || []).forEach((m: any) => {
      if (m.enabled !== false) activeIds.add(m.id);
    });
    return activeIds;
  }, [platformModules]);

  // Compute KPI Counts
  const kpiStats = useMemo(() => {
    if (!cases) return { mine: 0, urgent: 0, dueToday: 0, unassigned: 0, inProgress: 0, completed: 0, total: 0 };
    
    let mine = 0;
    let urgent = 0;
    let dueToday = 0;
    let unassigned = 0;
    let inProgress = 0;
    let completed = 0;

    cases.forEach((c: any) => {
      if (c.moduleId && !activeModuleIds.has(c.moduleId)) return;
      if (widgetProperties?.moduleIds?.length && !widgetProperties.moduleIds.includes(c.moduleId)) return;

      const isCompleted = c.status === 'Completed';
      const isMine = c.assigneeId === myMemberId;
      const isHighPriority = c.priority === 'High' || c.priority === 'Urgent';

      if (isMine && !isCompleted) mine++;
      if (isHighPriority && !isCompleted) urgent++;
      if (!c.assigneeId && !isCompleted) unassigned++;
      if (c.status === 'In Progress') inProgress++;
      if (isCompleted) completed++;

      // Due today or overdue heuristic
      if (!isCompleted && (isHighPriority || (c.createdAt && Date.now() - new Date(c.createdAt).getTime() > 86400000 * 2))) {
        dueToday++;
      }
    });

    return {
      mine,
      urgent,
      dueToday,
      unassigned,
      inProgress,
      completed,
      total: cases.length
    };
  }, [cases, activeModuleIds, myMemberId, widgetProperties?.moduleIds]);

  // AI Recommendation calculation: Find highest urgency case for user
  useEffect(() => {
    if (!cases || cases.length === 0) return;
    const candidates = cases.filter((c: any) => {
      if (c.status === 'Completed') return false;
      if (c.assigneeId && c.assigneeId !== myMemberId) return false;
      return true;
    });

    if (candidates.length === 0) {
      setAiRecommendedCaseId(null);
      return;
    }

    // Rank: High priority first, then oldest created
    candidates.sort((a: any, b: any) => {
      const pScoreA = a.priority === 'High' ? 3 : a.priority === 'Medium' ? 2 : 1;
      const pScoreB = b.priority === 'High' ? 3 : b.priority === 'Medium' ? 2 : 1;
      if (pScoreA !== pScoreB) return pScoreB - pScoreA;
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateA - dateB;
    });

    setAiRecommendedCaseId(candidates[0].id);
  }, [cases, myMemberId]);

  // Filtered & Sorted Cases
  const filteredCases = useMemo(() => {
    if (!cases) return [];
    let result = cases.filter((c: any) => {
      // Filter by module activity
      if (c.moduleId && !activeModuleIds.has(c.moduleId)) return false;
      if (widgetProperties?.moduleIds?.length && !widgetProperties.moduleIds.includes(c.moduleId)) return false;
      if (moduleFilter !== 'all' && c.moduleId !== moduleFilter) return false;

      // Filter by Priority
      if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false;

      // Filter by KPI Tab
      if (activeFilterTab === 'mine') {
        if (c.assigneeId !== myMemberId || c.status === 'Completed') return false;
      } else if (activeFilterTab === 'urgent') {
        if ((c.priority !== 'High' && c.priority !== 'Urgent') || c.status === 'Completed') return false;
      } else if (activeFilterTab === 'due_today') {
        const isUrgentOrOld = (c.priority === 'High' || (c.createdAt && Date.now() - new Date(c.createdAt).getTime() > 86400000 * 2));
        if (!isUrgentOrOld || c.status === 'Completed') return false;
      } else if (activeFilterTab === 'unassigned') {
        if (c.assigneeId || c.status === 'Completed') return false;
      } else if (activeFilterTab === 'in_progress') {
        if (c.status !== 'In Progress') return false;
      } else if (activeFilterTab === 'completed') {
        if (c.status !== 'Completed') return false;
      }

      // Filter by Search Query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchTitle = c.title?.toLowerCase().includes(query) || false;
        const matchId = String(c.id || '').toLowerCase().includes(query);
        const matchModule = c.module?.toLowerCase().includes(query) || false;
        const matchStatus = c.status?.toLowerCase().includes(query) || false;
        const matchSubmitter = c.submittedBy?.toLowerCase().includes(query) || false;
        if (!matchTitle && !matchId && !matchModule && !matchStatus && !matchSubmitter) return false;
      }

      return true;
    });

    // Sorting
    result = [...result].sort((a: any, b: any) => {
      if (sortBy === 'urgency') {
        const pScoreA = a.priority === 'High' ? 3 : a.priority === 'Medium' ? 2 : 1;
        const pScoreB = b.priority === 'High' ? 3 : b.priority === 'Medium' ? 2 : 1;
        if (pScoreA !== pScoreB) return pScoreB - pScoreA;
        return (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime());
      } else if (sortBy === 'newest') {
        return (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime());
      } else if (sortBy === 'priority') {
        const pScoreA = a.priority === 'High' ? 3 : a.priority === 'Medium' ? 2 : 1;
        const pScoreB = b.priority === 'High' ? 3 : b.priority === 'Medium' ? 2 : 1;
        return pScoreB - pScoreA;
      } else if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return 0;
    });

    return result;
  }, [cases, activeModuleIds, widgetProperties?.moduleIds, moduleFilter, priorityFilter, activeFilterTab, myMemberId, searchQuery, sortBy]);

  // Auto-select first case if in split view and nothing selected
  useEffect(() => {
    if (viewMode === 'split' && filteredCases.length > 0 && !selectedCase) {
      setSelectedCase(filteredCases[0]);
    }
  }, [viewMode, filteredCases, selectedCase]);

  // Quick Action Handlers
  const handleAdvanceStatus = async (targetCase: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!tenant?.id || !targetCase) return;
    
    setProcessingId(targetCase.id);
    try {
      const currentIdx = STATUS_ORDER.indexOf(targetCase.status as any);
      const nextStatus = currentIdx >= 0 && currentIdx < STATUS_ORDER.length - 1 
        ? STATUS_ORDER[currentIdx + 1] 
        : 'Completed';

      await mutateCases('UPDATE', { status: nextStatus }, targetCase.id);
      toast.success(`Case advanced to ${nextStatus}`);
      
      if (selectedCase?.id === targetCase.id) {
        setSelectedCase({ ...selectedCase, status: nextStatus });
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to advance case status');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSetStatus = async (targetCase: any, newStatus: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!tenant?.id || !targetCase) return;
    
    setProcessingId(targetCase.id);
    try {
      await mutateCases('UPDATE', { status: newStatus }, targetCase.id);
      toast.success(`Status updated to ${newStatus}`);
      if (selectedCase?.id === targetCase.id) {
        setSelectedCase({ ...selectedCase, status: newStatus });
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to update status');
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateAssignee = async (targetCase: any, newAssigneeId: string | null, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!tenant?.id || !targetCase) return;
    
    setProcessingId(targetCase.id);
    try {
      await mutateCases('UPDATE', { 
        assigneeId: newAssigneeId,
        moduleId: targetCase.moduleId
      }, targetCase.id);
      
      toast.success(newAssigneeId ? 'Case claimed successfully' : 'Case released to queue');
      if (selectedCase?.id === targetCase.id) {
        setSelectedCase((prev: any) => prev ? { ...prev, assigneeId: newAssigneeId } : null);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to update case assignee');
    } finally {
      setProcessingId(null);
    }
  };

  // Bulk Actions Handlers
  const toggleSelectCase = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCaseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    if (selectedCaseIds.size === filteredCases.length) {
      setSelectedCaseIds(new Set());
    } else {
      setSelectedCaseIds(new Set(filteredCases.map(c => c.id)));
    }
  };

  const handleBulkClaim = async () => {
    if (selectedCaseIds.size === 0) return;
    const toastId = toast.loading(`Claiming ${selectedCaseIds.size} cases...`);
    try {
      for (const id of selectedCaseIds) {
        const item = cases.find(c => c.id === id);
        if (item) {
          await mutateCases('UPDATE', { assigneeId: myMemberId, moduleId: item.moduleId }, id);
        }
      }
      toast.success(`Claimed ${selectedCaseIds.size} cases`, { id: toastId });
      setSelectedCaseIds(new Set());
    } catch (err) {
      toast.error('Failed to claim selected cases', { id: toastId });
    }
  };

  const handleBulkComplete = async () => {
    if (selectedCaseIds.size === 0) return;
    const toastId = toast.loading(`Completing ${selectedCaseIds.size} cases...`);
    try {
      for (const id of selectedCaseIds) {
        await mutateCases('UPDATE', { status: 'Completed' }, id);
      }
      toast.success(`Completed ${selectedCaseIds.size} cases`, { id: toastId });
      setSelectedCaseIds(new Set());
    } catch (err) {
      toast.error('Failed to update selected cases', { id: toastId });
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !casesLoading) {
      setPage(prev => prev + 1);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'In Progress':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'Under Review':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'Completed':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'High':
      case 'Urgent':
        return 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'Medium':
        return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Low':
      default:
        return 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  // Render Kanban Columns
  const renderKanbanView = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 flex-1 min-h-0 overflow-y-auto p-3 custom-scrollbar">
        {STATUS_ORDER.map((status) => {
          const colCases = filteredCases.filter(c => (c.status || 'New') === status);
          return (
            <div key={status} className="flex flex-col bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-2.5 min-h-[320px]">
              <div className="flex items-center justify-between px-2 py-1.5 mb-2 border-b border-zinc-200/50 dark:border-zinc-800/50 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn("w-2 h-2 rounded-full", 
                    status === 'New' ? "bg-blue-500" :
                    status === 'In Progress' ? "bg-amber-500" :
                    status === 'Under Review' ? "bg-purple-500" : "bg-emerald-500"
                  )} />
                  <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">{status}</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  {colCases.length}
                </span>
              </div>

              <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-0.5">
                {colCases.map((c) => (
                  <motion.div
                    key={c.id}
                    layoutId={`case-card-${c.id}`}
                    onClick={() => {
                      setSelectedCase(c);
                      if (viewMode !== 'split') {
                        setIsDetailPaneOpen(true);
                      }
                    }}
                    className={cn(
                      "p-3 bg-white dark:bg-zinc-900 border rounded-xl shadow-2xs hover:shadow-md transition-all cursor-pointer group relative flex flex-col gap-2",
                      selectedCase?.id === c.id ? "border-indigo-500 ring-1 ring-indigo-500/40" : "border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700",
                      aiRecommendedCaseId === c.id && "ring-2 ring-indigo-500/40 bg-indigo-50/20 dark:bg-indigo-950/20"
                    )}
                  >
                    {aiRecommendedCaseId === c.id && (
                      <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-md w-fit">
                        <Sparkles size={10} />
                        <span>AI Top Recommendation</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[9px] font-mono font-bold text-zinc-400 dark:text-zinc-500">{String(c.id).slice(-6)}</span>
                      <span className={cn("text-[9px] font-bold px-1.5 py-0.2 rounded border", getPriorityBadge(c.priority))}>
                        {c.priority || 'Normal'}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug">
                      {c.title}
                    </h4>

                    {c.aiSummary && (
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 italic line-clamp-1 bg-zinc-50 dark:bg-zinc-950 p-1 rounded border border-zinc-100 dark:border-zinc-800/60">
                        "{c.aiSummary}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800/60 text-[10px]">
                      <span className="text-zinc-500 font-medium truncate max-w-[80px]">{c.module || 'General'}</span>
                      <div className="flex items-center gap-1">
                        {c.assigneeId === myMemberId ? (
                          <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">Mine</span>
                        ) : c.assigneeId ? (
                          <span className="text-[9px] text-zinc-400">Assigned</span>
                        ) : (
                          <button
                            onClick={(e) => handleUpdateAssignee(c, myMemberId, e)}
                            className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            Claim
                          </button>
                        )}
                        {status !== 'Completed' && (
                          <button
                            onClick={(e) => handleAdvanceStatus(c, e)}
                            title="Advance Status"
                            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-indigo-600 transition-colors"
                          >
                            <ArrowRight size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {colCases.length === 0 && (
                  <div className="h-24 flex items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] text-zinc-400 italic">
                    No cases
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Dense List View
  const renderListView = () => {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 divide-y divide-zinc-100 dark:divide-zinc-800/60">
        {filteredCases.map((c) => {
          const isSelected = selectedCase?.id === c.id;
          const isChecked = selectedCaseIds.has(c.id);
          const caseAssignee = (members || []).find(m => m.id === c.assigneeId);
          const isMine = c.assigneeId === myMemberId;

          return (
            <motion.div
              key={c.id}
              onClick={() => {
                setSelectedCase(c);
                if (viewMode !== 'split') {
                  setIsDetailPaneOpen(true);
                }
              }}
              className={cn(
                "p-3 rounded-xl transition-all cursor-pointer group flex items-center justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                isSelected ? "bg-indigo-50/40 dark:bg-indigo-950/20 border-l-2 border-indigo-500" : ""
              )}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}}
                  onClick={(e) => toggleSelectCase(c.id, e)}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500/20 shrink-0 cursor-pointer"
                />

                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-400 group-hover:text-indigo-600 shrink-0 transition-colors">
                  <FileText size={15} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase">{String(c.id).slice(-6)}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                      {c.module || 'General'}
                    </span>
                    {aiRecommendedCaseId === c.id && (
                      <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1 rounded flex items-center gap-1">
                        <Sparkles size={9} /> Next Best
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate mt-0.5">
                    {c.title}
                  </h4>
                </div>
              </div>

              {/* Status, Priority, Assignee & 1-Click Triage Controls */}
              <div className="flex items-center gap-3 shrink-0">
                {/* Status Dropdown / Quick Button */}
                <button
                  onClick={(e) => handleAdvanceStatus(c, e)}
                  disabled={processingId === c.id}
                  title="Click to advance status"
                  className={cn(
                    "text-[10px] font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1 hover:brightness-95",
                    getStatusBadge(c.status || 'New')
                  )}
                >
                  {processingId === c.id ? (
                    <RefreshCw size={10} className="animate-spin" />
                  ) : (
                    <span>{c.status || 'New'}</span>
                  )}
                  {c.status !== 'Completed' && <ArrowRight size={10} className="opacity-60" />}
                </button>

                {/* Priority Badge */}
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-lg border hidden sm:inline-block", getPriorityBadge(c.priority))}>
                  {c.priority || 'Normal'}
                </span>

                {/* Assignee display & 1-Click Claim */}
                <div className="min-w-[90px] text-right">
                  {caseAssignee ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <UserAvatarWithPresence
                        avatarUrl={caseAssignee.avatarUrl}
                        name={caseAssignee.name}
                        status={(caseAssignee as any).status || 'AVAILABLE'}
                        size="xs"
                      />
                      <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[70px]">
                        {isMine ? 'You' : caseAssignee.name}
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleUpdateAssignee(c, myMemberId, e)}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-2 py-1 rounded-lg transition-all"
                    >
                      + Claim
                    </button>
                  )}
                </div>

                {/* Direct Link to full Record */}
                <Link
                  to={`/workspace/modules/${c.moduleId || 'general'}/records/${c.id}`}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  title="Open full record"
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <ExternalLink size={13} />
                </Link>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  // Render Split Queue Item Card
  const renderQueueItemCard = (c: any) => {
    const isSelected = selectedCase?.id === c.id;
    const isChecked = selectedCaseIds.has(c.id);
    const caseAssignee = (members || []).find(m => m.id === c.assigneeId);
    const isMine = c.assigneeId === myMemberId;

    return (
      <motion.div
        key={c.id}
        onClick={() => {
          setSelectedCase(c);
          setIsDetailPaneOpen(true);
        }}
        className={cn(
          "p-3 rounded-2xl border transition-all cursor-pointer group relative flex flex-col gap-2 shadow-2xs",
          isSelected 
            ? "bg-white dark:bg-zinc-900 border-indigo-500 ring-2 ring-indigo-500/20" 
            : "bg-white dark:bg-zinc-900/70 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/50 dark:hover:bg-zinc-900",
          aiRecommendedCaseId === c.id && "border-indigo-400/80 dark:border-indigo-600/80"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => {}}
              onClick={(e) => toggleSelectCase(c.id, e)}
              className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500/20 shrink-0 cursor-pointer"
            />
            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">{String(c.id).slice(-6)}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
              {c.module || 'General'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {aiRecommendedCaseId === c.id && (
              <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Sparkles size={10} /> AI Top
              </span>
            )}
            <span className={cn("text-[10px] font-bold px-1.5 py-0.2 rounded border", getPriorityBadge(c.priority))}>
              {c.priority || 'Normal'}
            </span>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
            {c.title}
          </h4>
          {c.aiSummary && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic line-clamp-1 mt-0.5">
              "{c.aiSummary}"
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px]">
          {/* Quick status button */}
          <button
            onClick={(e) => handleAdvanceStatus(c, e)}
            title="Click to advance status"
            className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 hover:brightness-95 transition-all",
              getStatusBadge(c.status || 'New')
            )}
          >
            <span>{c.status || 'New'}</span>
            {c.status !== 'Completed' && <ArrowRight size={9} />}
          </button>

          {/* Assignee / Claim */}
          <div className="flex items-center gap-2">
            {caseAssignee ? (
              <div className="flex items-center gap-1">
                <UserAvatarWithPresence
                  avatarUrl={caseAssignee.avatarUrl}
                  name={caseAssignee.name}
                  status={(caseAssignee as any).status || 'AVAILABLE'}
                  size="xs"
                />
                <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 truncate max-w-[65px]">
                  {isMine ? 'You' : caseAssignee.name}
                </span>
              </div>
            ) : (
              <button
                onClick={(e) => handleUpdateAssignee(c, myMemberId, e)}
                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                + Claim
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  // Render Case Detail Pane
  const renderDetailPane = () => {
    if (!selectedCase) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-zinc-50/50 dark:bg-zinc-950/30 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-300 dark:text-zinc-700 shadow-2xs mb-3">
            <FileText size={22} />
          </div>
          <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">No Record Selected</h4>
          <p className="text-[11px] text-zinc-400 max-w-xs mt-1">
            Select a case from the queue to view AI summaries, document generators, and rapid triage actions.
          </p>
        </div>
      );
    }

    const caseAssignee = (members || []).find(m => m.id === selectedCase.assigneeId);
    const isAssignedToMe = selectedCase.assigneeId === myMemberId;

    return (
      <div className="h-full flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Header / Tabs */}
        <div className="p-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/50 dark:bg-zinc-950/20">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">{String(selectedCase.id).slice(-6)}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              {selectedCase.module || 'General'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-zinc-100 dark:bg-zinc-950 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setActiveTab('details')}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                  activeTab === 'details' ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                )}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all",
                  activeTab === 'documents' ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                )}
              >
                Docs
              </button>
            </div>

            <Link
              to={`/workspace/modules/${selectedCase.moduleId || 'general'}/records/${selectedCase.id}`}
              title="Open full record page"
              className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ExternalLink size={14} />
            </Link>
          </div>
        </div>

        {/* Body content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar space-y-4">
          {activeTab === 'details' ? (
            <>
              {/* Title & Priority Header */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-lg border", getPriorityBadge(selectedCase.priority))}>
                    {selectedCase.priority || 'Normal Priority'}
                  </span>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-lg border", getStatusBadge(selectedCase.status || 'New'))}>
                    {selectedCase.status || 'New'}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-snug">
                  {selectedCase.title}
                </h3>
              </div>

              {/* AI Summary Card */}
              <div className="p-3 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/15 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <Sparkles size={13} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">AI Executive Brief</span>
                </div>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed italic">
                  "{selectedCase.aiSummary || 'Ready for evaluation. Triage this case according to standard module rules.'}"
                </p>
              </div>

              {/* Key Metadata Table */}
              <div className="bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl p-3 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 text-[11px]">Submitted By</span>
                  <span className="text-zinc-900 dark:text-white font-medium flex items-center gap-1.5">
                    <User size={13} className="text-zinc-400" />
                    {selectedCase.submittedBy || 'Portal User'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 text-[11px]">Submitted Date</span>
                  <span className="text-zinc-900 dark:text-white font-medium flex items-center gap-1.5">
                    <Clock size={13} className="text-zinc-400" />
                    {selectedCase.createdAt ? new Date(selectedCase.createdAt).toLocaleString() : 'Recent'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 text-[11px]">Current Assignee</span>
                  {caseAssignee ? (
                    <span className="text-zinc-900 dark:text-white font-medium flex items-center gap-1.5">
                      <UserAvatarWithPresence
                        avatarUrl={caseAssignee.avatarUrl}
                        name={caseAssignee.name}
                        status={(caseAssignee as any).status || 'AVAILABLE'}
                        size="xs"
                      />
                      {isAssignedToMe ? 'You (Me)' : caseAssignee.name}
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold italic text-[11px]">Unassigned</span>
                  )}
                </div>
              </div>

              {/* Status Advancement Actions */}
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Triage Actions</p>

                {/* Status Switcher Pills */}
                <div className="grid grid-cols-4 gap-1.5">
                  {STATUS_ORDER.map((st) => (
                    <button
                      key={st}
                      onClick={() => handleSetStatus(selectedCase, st)}
                      disabled={processingId === selectedCase.id}
                      className={cn(
                        "py-1.5 px-1 rounded-lg text-[10px] font-bold border transition-all text-center",
                        selectedCase.status === st 
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-2xs" 
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      )}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                {/* Claim / Release and Generate Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {isAssignedToMe ? (
                    <button
                      onClick={() => handleUpdateAssignee(selectedCase, null)}
                      disabled={processingId === selectedCase.id}
                      className="py-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <UserMinus size={13} />
                      <span>Release Case</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateAssignee(selectedCase, myMemberId)}
                      disabled={processingId === selectedCase.id}
                      className="py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10"
                    >
                      <UserCheck size={13} />
                      <span>Claim to Me</span>
                    </button>
                  )}

                  <button
                    onClick={() => setIsGenModalOpen(true)}
                    className="py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <Zap size={13} className="text-amber-500" />
                    <span>Generate Doc</span>
                  </button>
                </div>

                {/* Primary Advance Button */}
                <button
                  onClick={() => handleAdvanceStatus(selectedCase)}
                  disabled={processingId === selectedCase.id || selectedCase.status === 'Completed'}
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processingId === selectedCase.id ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <>
                      <span>{selectedCase.status === 'Completed' ? 'Case Completed' : 'Advance to Next Stage'}</span>
                      {selectedCase.status !== 'Completed' && <ArrowRight size={14} />}
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <DocumentList
                recordId={selectedCase.id}
                moduleId={selectedCase.moduleId}
                onGenerateNew={() => setIsGenModalOpen(true)}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!tenant && !platformLoading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center space-y-2 p-6 text-center">
        <Database className="text-zinc-300 dark:text-zinc-700" size={32} />
        <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No Workspace Bound</h4>
        <p className="text-xs text-zinc-400 max-w-xs">Select a workspace to view your personal work queue.</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "w-full flex flex-col min-h-0",
      isWidget 
        ? "h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xs overflow-hidden" 
        : "px-6 lg:px-10 pt-6 pb-10 space-y-6",
      className
    )}>
      {/* Top Header & Triage Toolbar */}
      <div className={cn(
        "flex flex-col gap-3 shrink-0 border-b border-zinc-100 dark:border-zinc-800/80",
        isWidget ? "p-3.5 bg-zinc-50/50 dark:bg-zinc-950/20" : "pb-4"
      )}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Widget / Page Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Layers size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                {widgetTitle || 'My Work Inbox'}
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  {filteredCases.length}
                </span>
              </h2>
              {!isWidget && (
                <p className="text-xs text-zinc-500">Manage and process active cases across all business modules.</p>
              )}
            </div>
          </div>

          {/* Right Toolbar Controls: Search, Filters, View Modes */}
          <div className="flex items-center gap-2">
            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
              <input
                type="text"
                placeholder="Search queue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-36 sm:w-48 transition-all"
              />
            </div>

            {/* View Mode Switcher */}
            <div className="flex bg-zinc-100 dark:bg-zinc-950 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setViewMode('split')}
                title="Split / Master-Detail View"
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  viewMode === 'split' ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-2xs" : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                <Columns size={14} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="High-Density List View"
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  viewMode === 'list' ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-2xs" : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                title="Kanban Board View"
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  viewMode === 'kanban' ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-2xs" : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                <LayoutGrid size={14} />
              </button>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={cn(
                "p-1.5 rounded-xl border transition-all flex items-center gap-1 text-xs font-bold",
                (moduleFilter !== 'all' || priorityFilter !== 'all' || sortBy !== 'urgency')
                  ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 text-indigo-600 dark:text-indigo-400"
                  : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
              title="Filters & Sorting"
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>
        </div>

        {/* Filter Drawer / Bar */}
        <AnimatePresence>
          {showFilterDropdown && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 flex flex-wrap items-center gap-3 text-xs"
            >
              {/* Module Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Module:</span>
                <select
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                  className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none"
                >
                  <option value="all">All Modules</option>
                  {modules.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Priority Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Priority:</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as any)}
                  className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none"
                >
                  <option value="all">All Priorities</option>
                  <option value="High">High / Urgent</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none"
                >
                  <option value="urgency">Urgency / SLA</option>
                  <option value="newest">Newest First</option>
                  <option value="priority">Highest Priority</option>
                  <option value="title">Title A-Z</option>
                </select>
              </div>

              {/* Clear filters */}
              {(moduleFilter !== 'all' || priorityFilter !== 'all' || sortBy !== 'urgency') && (
                <button
                  onClick={() => {
                    setModuleFilter('all');
                    setPriorityFilter('all');
                    setSortBy('urgency');
                  }}
                  className="text-[10px] font-bold text-rose-500 hover:underline"
                >
                  Reset Filters
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Interactive KPI Summary Ribbon */}
        {showKpiRibbon && (
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pt-1 pb-0.5">
            {[
              { id: 'mine', label: 'My Assigned Work', count: kpiStats.mine, icon: User, color: 'text-indigo-600 dark:text-indigo-400' },
              { id: 'urgent', label: 'Urgent & High SLA', count: kpiStats.urgent, icon: Flame, color: 'text-rose-600 dark:text-rose-400' },
              { id: 'due_today', label: 'Due Soon / Backlog', count: kpiStats.dueToday, icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400' },
              { id: 'unassigned', label: 'Unassigned Pool', count: kpiStats.unassigned, icon: Layers, color: 'text-violet-600 dark:text-violet-400' },
              { id: 'in_progress', label: 'In Progress', count: kpiStats.inProgress, icon: Zap, color: 'text-blue-600 dark:text-blue-400' },
              { id: 'completed', label: 'Completed', count: kpiStats.completed, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' },
              { id: 'all', label: 'All Items', count: kpiStats.total, icon: FileText, color: 'text-zinc-600 dark:text-zinc-400' },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeFilterTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilterTab(tab.id as WorkQueueFilterTab)}
                  className={cn(
                    "px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border",
                    isActive
                      ? "bg-white dark:bg-zinc-800 border-indigo-500/80 text-zinc-900 dark:text-white shadow-2xs"
                      : "bg-zinc-100/70 dark:bg-zinc-950/60 border-zinc-200/70 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  )}
                >
                  <Icon size={12} className={tab.color} />
                  <span>{tab.label}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-md font-bold",
                    isActive ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500"
                  )}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk Action Ribbon when items selected */}
      <AnimatePresence>
        {selectedCaseIds.size > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-indigo-600 text-white px-4 py-2 flex items-center justify-between shrink-0 shadow-lg text-xs font-bold"
          >
            <div className="flex items-center gap-3">
              <span>{selectedCaseIds.size} case(s) selected</span>
              <button
                onClick={selectAllFiltered}
                className="text-[10px] underline hover:opacity-90 cursor-pointer"
              >
                {selectedCaseIds.size === filteredCases.length ? 'Deselect All' : 'Select All Filtered'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkClaim}
                className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs transition-colors flex items-center gap-1"
              >
                <UserCheck size={12} />
                <span>Claim Selected</span>
              </button>
              <button
                onClick={handleBulkComplete}
                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-xs transition-colors flex items-center gap-1"
              >
                <CheckCircle2 size={12} />
                <span>Mark Completed</span>
              </button>
              <button
                onClick={() => setSelectedCaseIds(new Set())}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                title="Clear Selection"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Queue Workspace Content */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {viewMode === 'kanban' ? (
          renderKanbanView()
        ) : viewMode === 'list' ? (
          renderListView()
        ) : (
          /* Split Master-Detail View */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 min-h-0 p-3 overflow-hidden">
            {/* Left Queue List */}
            <div className={cn(
              "flex flex-col min-h-0 overflow-y-auto space-y-2.5 custom-scrollbar pr-1",
              selectedCase ? "lg:col-span-7" : "lg:col-span-12"
            )}>
              {filteredCases.length > 0 ? (
                filteredCases.map(c => renderQueueItemCard(c))
              ) : (
                <div className="p-8 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-center space-y-2">
                  <p className="text-xs text-zinc-500 font-medium">
                    {activeFilterTab === 'mine' ? 'No active cases assigned to you.' :
                     activeFilterTab === 'urgent' ? 'No urgent cases pending.' :
                     activeFilterTab === 'unassigned' ? 'No unassigned backlog.' :
                     'No cases match current filter criteria.'}
                  </p>
                  {(activeFilterTab !== 'all' || searchQuery || moduleFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setActiveFilterTab('all');
                        setSearchQuery('');
                        setModuleFilter('all');
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                    >
                      Show all items
                    </button>
                  )}
                </div>
              )}

              {hasMore && (
                <div className="flex justify-center pt-2 pb-1">
                  <button
                    onClick={handleLoadMore}
                    disabled={casesLoading}
                    className="px-4 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {casesLoading ? 'Loading more...' : 'Load More Cases'}
                  </button>
                </div>
              )}
            </div>

            {/* Right Case Inspector Pane */}
            {selectedCase && (
              <div className="hidden lg:flex lg:col-span-5 min-h-0 flex-col">
                {renderDetailPane()}
              </div>
            )}
          </div>
        )}
      </div>

      <DocumentGeneratorModal
        isOpen={isGenModalOpen}
        onClose={() => setIsGenModalOpen(false)}
        recordData={selectedCase}
        moduleId={selectedCase?.moduleId || 'general'}
      />

      {viewMode !== 'split' && isDetailPaneOpen && selectedCase && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end" onClick={() => setIsDetailPaneOpen(false)}>
          <div 
            className="w-full max-w-xl bg-white dark:bg-zinc-900 h-full p-4 overflow-y-auto shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsDetailPaneOpen(false)}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X size={16} />
            </button>
            {renderDetailPane()}
          </div>
        </div>
      )}
    </div>
  );
};
