import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  Check, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Workflow as WorkflowIcon, 
  ChevronRight, 
  ChevronDown, 
  Play, 
  RotateCcw, 
  Loader2, 
  ExternalLink,
  Layers,
  ListChecks
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { 
  NextStepAction, 
  NextStepResolution, 
  SlaTrafficLightInfo
} from '../../lib/workflowProcessUtils';
import type { SubstepStatus } from '../../types/platform';

export interface WorkflowStatusHoverCardProps {
  currentStatus: string;
  getStatusBadgeStyle: (status: string) => string;
  workflow?: any;
  resolution: NextStepResolution;
  slaStatus?: SlaTrafficLightInfo | null;
  currentStageSubstepsSummary?: {
    total: number;
    completed: number;
    waived: number;
    requiredRemaining: number;
    isSatisfied?: boolean;
    substeps?: Array<{
      id: string;
      title: string;
      required: boolean;
      status: SubstepStatus;
    }>;
  } | null;
  statusOptions?: any[];
  isTransitioning?: boolean;
  transitioningTarget?: string | null;
  record?: any;
  dateFormat?: string;
  onTransition?: (targetNodeName: string, targetNodeId: string, requiredFieldIds?: string[]) => void;
  onUpdateStatus?: (statusVal: string, statusId?: string) => void;
  onOpenConsole?: () => void;
  onStartWorkflow?: () => void;
}

export const WorkflowStatusHoverCard: React.FC<WorkflowStatusHoverCardProps> = ({
  currentStatus,
  getStatusBadgeStyle,
  workflow,
  resolution,
  slaStatus,
  currentStageSubstepsSummary,
  statusOptions = [],
  isTransitioning = false,
  transitioningTarget,
  record,
  onTransition,
  onUpdateStatus,
  onOpenConsole,
  onStartWorkflow
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showAllStages, setShowAllStages] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const enterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (enterTimeoutRef.current) clearTimeout(enterTimeoutRef.current);
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  // Handle outside clicks to close pinned card
  useEffect(() => {
    if (!isOpen && !isPinned) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsPinned(false);
        setShowAllStages(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setIsPinned(false);
        setShowAllStages(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isPinned]);

  const handleMouseEnter = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    enterTimeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, 180);
  };

  const handleMouseLeave = () => {
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = null;
    }
    if (!isPinned) {
      leaveTimeoutRef.current = setTimeout(() => {
        setIsOpen(false);
        setShowAllStages(false);
      }, 250);
    }
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen && isPinned) {
      setIsOpen(false);
      setIsPinned(false);
      setShowAllStages(false);
    } else {
      setIsOpen(true);
      setIsPinned(true);
    }
  };

  const handleExecuteTransition = (action: NextStepAction) => {
    if (isTransitioning) return;
    setIsOpen(false);
    setIsPinned(false);
    onTransition?.(action.targetNodeName, action.targetNodeId, action.requiredFieldIds);
  };

  const handleExecuteManualStatus = (statusVal: string, statusId?: string) => {
    if (isTransitioning) return;
    setIsOpen(false);
    setIsPinned(false);
    onUpdateStatus?.(statusVal, statusId);
  };

  // Derive duration / relative time in stage
  const timeInStage = React.useMemo(() => {
    const updated = record?.updatedAt || record?.updated_at || record?.createdAt || record?.created_at;
    if (!updated) return null;
    try {
      const d = new Date(updated);
      if (isNaN(d.getTime())) return null;
      const diffMs = Date.now() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m in stage`;
      if (diffHours < 24) return `${diffHours}h in stage`;
      return `${diffDays}d in stage`;
    } catch {
      return null;
    }
  }, [record]);

  // SLA badge styling
  const slaColorClass = React.useMemo(() => {
    if (!slaStatus || slaStatus.level === 'NONE') return null;
    switch (slaStatus.level) {
      case 'OVERDUE':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'TODAY':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'UPCOMING':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
    }
  }, [slaStatus]);

  // Transitions split into primary and alternative
  const availableTransitions = resolution?.availableTransitions || [];
  const primaryTransition = availableTransitions.length > 0 ? availableTransitions[0] : null;
  const alternativeTransitions = availableTransitions.length > 1 ? availableTransitions.slice(1) : [];

  const requiredRemaining = currentStageSubstepsSummary?.requiredRemaining ?? 0;
  const totalSubsteps = currentStageSubstepsSummary?.total ?? 0;
  const completedSubsteps = (currentStageSubstepsSummary?.completed ?? 0) + (currentStageSubstepsSummary?.waived ?? 0);

  return (
    <div 
      className="relative inline-block w-full" 
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 1. Interactive Workflow Status Trigger Badge */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleToggleClick}
          aria-expanded={isOpen}
          title="Click to view transitions or hover for quick actions"
          className={cn(
            "group/badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none",
            "hover:ring-2 hover:ring-indigo-500/30 hover:shadow-xs active:scale-[0.98]",
            getStatusBadgeStyle(currentStatus),
            isPinned && "ring-2 ring-indigo-500/40 shadow-xs"
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current transition-transform group-hover/badge:scale-125" />
          <span>{currentStatus}</span>
          <ChevronDown 
            size={11} 
            className={cn(
              "text-current/60 transition-transform duration-150 group-hover/badge:text-current",
              isOpen && "rotate-180"
            )} 
          />
        </button>
      </div>

      {/* 2. Floating Quick Action Hover Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute left-0 right-0 top-full mt-2 z-50",
              "bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md",
              "border border-zinc-200/90 dark:border-zinc-800/90",
              "rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/40",
              "p-3 space-y-3 overflow-hidden text-left"
            )}
            style={{ width: '100%', minWidth: '280px' }}
          >
            {/* Header: Stage Context & Metrics */}
            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Current Stage
                  </span>
                  {isPinned && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                      Pinned
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-bold border",
                    getStatusBadgeStyle(currentStatus)
                  )}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {currentStatus}
                  </span>
                  {workflow?.name && (
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-[120px]" title={workflow.name}>
                      {workflow.name}
                    </span>
                  )}
                </div>
              </div>

              {/* SLA / Time indicator */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                {timeInStage && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400 font-medium bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">
                    <Clock size={10} />
                    {timeInStage}
                  </span>
                )}
                {slaStatus && slaStatus.level !== 'NONE' && (
                  <span className={cn("inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded border", slaColorClass)}>
                    <AlertCircle size={9} />
                    {slaStatus.label || 'SLA Active'}
                  </span>
                )}
              </div>
            </div>

            {/* Substeps / Checklist Guardrail Banner */}
            {totalSubsteps > 0 && (
              <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                    <ListChecks size={12} className="text-indigo-500" />
                    Stage Checklist
                  </span>
                  <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                    {completedSubsteps} / {totalSubsteps} complete
                  </span>
                </div>
                {/* Progress track */}
                <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min(100, Math.round((completedSubsteps / totalSubsteps) * 100))}%` }}
                  />
                </div>
                {requiredRemaining > 0 && (
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 pt-0.5">
                    <AlertCircle size={10} className="shrink-0" />
                    <span>{requiredRemaining} required item{requiredRemaining === 1 ? '' : 's'} remaining</span>
                  </div>
                )}
              </div>
            )}

            {/* Transition Options Section */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-0.5">
                <span>Available Transitions</span>
                {resolution?.hasWorkflow && availableTransitions.length > 0 && (
                  <span className="font-normal lowercase font-mono">
                    {availableTransitions.length} route{availableTransitions.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              {/* Case 1: Workflow Not Started */}
              {!resolution.isStarted && resolution.hasWorkflow ? (
                <button
                  type="button"
                  disabled={isTransitioning}
                  onClick={() => {
                    setIsOpen(false);
                    setIsPinned(false);
                    onStartWorkflow?.();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all disabled:opacity-50"
                >
                  <Play size={12} className="fill-current" />
                  <span>Start Workflow Process</span>
                </button>
              ) : resolution.isCompleted ? (
                /* Case 2: Workflow Completed */
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Workflow completed — all milestones done
                  </span>
                </div>
              ) : availableTransitions.length > 0 ? (
                /* Case 3: Available Structured Transitions */
                <div className="space-y-1.5">
                  {/* Primary recommended transition */}
                  {primaryTransition && (
                    <button
                      type="button"
                      disabled={isTransitioning}
                      onClick={() => handleExecuteTransition(primaryTransition)}
                      className={cn(
                        "w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-xs disabled:opacity-50 group",
                        primaryTransition.variant === 'destructive'
                          ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                          : primaryTransition.variant === 'success'
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
                      )}
                    >
                      <span className="flex items-center gap-2 truncate">
                        {isTransitioning && transitioningTarget === primaryTransition.targetNodeId ? (
                          <Loader2 size={13} className="animate-spin shrink-0" />
                        ) : primaryTransition.variant === 'destructive' ? (
                          <RotateCcw size={13} className="shrink-0 group-hover:-rotate-45 transition-transform" />
                        ) : (
                          <ArrowRight size={13} className="shrink-0 group-hover:translate-x-0.5 transition-transform" />
                        )}
                        <span className="truncate">
                          {primaryTransition.label || `Move to ${primaryTransition.targetNodeName}`}
                        </span>
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-black/15 text-white/90 shrink-0">
                        Next
                      </span>
                    </button>
                  )}

                  {/* Alternative transitions */}
                  {alternativeTransitions.map((action: NextStepAction) => {
                    const isActionTransitioning = isTransitioning && (transitioningTarget === action.targetNodeId || transitioningTarget === action.targetNodeName);
                    const isDestructive = action.variant === 'destructive';
                    return (
                      <button
                        key={action.targetNodeId || action.targetNodeName}
                        type="button"
                        disabled={isTransitioning}
                        onClick={() => handleExecuteTransition(action)}
                        className={cn(
                          "w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer disabled:opacity-50 group",
                          isDestructive
                            ? "text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20"
                            : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 bg-white/50 dark:bg-zinc-800/40"
                        )}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          {isActionTransitioning ? (
                            <Loader2 size={12} className="animate-spin shrink-0" />
                          ) : isDestructive ? (
                            <RotateCcw size={12} className="shrink-0 opacity-70 group-hover:-rotate-45 transition-transform" />
                          ) : (
                            <ChevronRight size={12} className="shrink-0 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                          )}
                          <span className="truncate">{action.label || action.targetNodeName}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Fallback when no automated routes defined */
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 py-1">
                  No automated transitions configured from this stage.
                </div>
              )}
            </div>

            {/* Jump to Any Stage (Collapsible selector for quick override) */}
            {statusOptions.length > 0 && onUpdateStatus && (
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setShowAllStages(prev => !prev)}
                  className="w-full flex items-center justify-between py-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Layers size={11} className="text-zinc-400" />
                    <span>Jump to specific stage</span>
                  </span>
                  <ChevronDown size={11} className={cn("transition-transform", showAllStages && "rotate-180")} />
                </button>

                {showAllStages && (
                  <div className="mt-1.5 max-h-36 overflow-y-auto space-y-0.5 custom-scrollbar pr-0.5">
                    {statusOptions.map((opt: any, idx: number) => {
                      const optVal = typeof opt === 'string' ? opt : opt.name || opt.label || opt.value || opt.id;
                      const optId = typeof opt === 'string' ? opt : opt.id || optVal;
                      const isCurrent = currentStatus.toLowerCase() === String(optVal).toLowerCase();
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleExecuteManualStatus(optVal, optId)}
                          className={cn(
                            "w-full text-left px-2 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center justify-between cursor-pointer",
                            isCurrent
                              ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold"
                              : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          )}
                        >
                          <span className="truncate">{optVal}</span>
                          {isCurrent && <Check size={11} className="text-indigo-600 dark:text-indigo-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Footer: Console Link & Hint */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400">
              <span className="truncate">Hover to preview • Click to pin</span>
              {onOpenConsole && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setIsPinned(false);
                    onOpenConsole();
                  }}
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                >
                  <WorkflowIcon size={10} />
                  <span>Console</span>
                  <ExternalLink size={9} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
