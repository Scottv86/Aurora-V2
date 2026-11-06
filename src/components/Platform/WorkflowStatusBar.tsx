import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  Check, 
  ChevronRight, 
  ChevronDown,
  Loader2, 
  Zap, 
  GitFork, 
  CheckCircle2, 
  Calendar,
  Clock,
  Plus,
  Phone,
  Mail,
  CheckSquare,
  Square,
  FileText,
  X,
  AlertCircle,
  ShieldAlert,
  RotateCcw,
  Sparkles,
  FileCheck
} from 'lucide-react';
import { Workflow, ModuleField, SubstepStatus } from '../../types/platform';
import { 
  resolveRecordNextStep, 
  NextStepAction, 
  resolveRecordSlaStatus, 
  checkMissingRequiredFields,
  checkStageSubstepsSatisfied,
  resolveStageSubsteps,
  StageSubstepItem,
  ScheduledActivity,
  ProcessStage,
  PipelineStep
} from '../../lib/workflowProcessUtils';
import { TransitionRequirementsModal } from './TransitionRequirementsModal';
import { ScheduleActivityModal } from './ScheduleActivityModal';
import { cn } from '../../lib/utils';

interface WorkflowStatusBarProps {
  workflow: Workflow | null | undefined;
  record: any;
  allFields?: ModuleField[];
  isTransitioning?: boolean;
  onTransition: (targetNodeName: string, targetNodeId: string, additionalData?: Record<string, any>) => Promise<void> | void;
  onStartWorkflow: () => Promise<void> | void;
  onScheduleActivity?: (activity: ScheduledActivity) => Promise<void> | void;
  onCompleteActivity?: (activityId: string) => Promise<void> | void;
  onUpdateSubstep?: (nodeId: string, substepId: string, status: SubstepStatus, note?: string) => Promise<void> | void;
  currentUserName?: string;
  currentUserId?: string;
  members?: any[];
  onOpenVisualizer?: () => void;
  className?: string;
  compact?: boolean;
}

export const WorkflowStatusBar: React.FC<WorkflowStatusBarProps> = ({
  workflow,
  record,
  allFields,
  isTransitioning = false,
  onTransition,
  onStartWorkflow,
  onScheduleActivity,
  onCompleteActivity,
  onUpdateSubstep,
  currentUserName,
  currentUserId,
  members,
  onOpenVisualizer,
  className,
  compact = false
}) => {
  const formatUserLabel = (rawUser?: string) => {
    if (!rawUser) return '';
    if (members && members.length > 0) {
      const matched = members.find((m: any) => 
        m.email === rawUser || 
        m.workEmail === rawUser || 
        m.id === rawUser || 
        m.userId === rawUser ||
        (m.user && (m.user.email === rawUser || m.user.id === rawUser))
      );
      if (matched) {
        const name = `${matched.firstName || ''} ${matched.familyName || ''}`.trim() || matched.name;
        if (name) return name;
      }
    }
    if (currentUserName && currentUserName !== 'User' && !currentUserName.includes('@')) {
      if (rawUser.includes('@') || rawUser === currentUserName) {
        return currentUserName;
      }
    }
    if (rawUser.includes('@')) {
      const namePart = rawUser.split('@')[0];
      return namePart.split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return rawUser;
  };
  // Requirements & Gating Modal State
  const [pendingAction, setPendingAction] = useState<NextStepAction | null>(null);
  const [missingFields, setMissingFields] = useState<ModuleField[]>([]);
  const [incompleteSubsteps, setIncompleteSubsteps] = useState<StageSubstepItem[]>([]);
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);

  // Schedule Activity Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showActivityPopover, setShowActivityPopover] = useState(false);
  const activityPopoverRef = useRef<HTMLDivElement>(null);

  // Transitioning Feedback State
  const [transitioningTarget, setTransitioningTarget] = useState<string | null>(null);

  // Optimistic Substep State for snappy UI feedback
  const [optimisticSubsteps, setOptimisticSubsteps] = useState<Record<string, Record<string, { status: SubstepStatus; note?: string; updatedBy?: string; updatedAt?: string }>>>({});

  // Substep Dropdown Popover State
  const [openSubstepsStageId, setOpenSubstepsStageId] = useState<string | null>(null);
  const [substepsMenuCoords, setSubstepsMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const [waivingSubstepId, setWaivingSubstepId] = useState<string | null>(null);
  const [waiveInputReason, setWaiveInputReason] = useState('');
  const substepsPopoverRef = useRef<HTMLDivElement>(null);

  // Reset local transient state whenever record changes
  useEffect(() => {
    setOpenSubstepsStageId(null);
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

  // Click outside to close activity popover
  useEffect(() => {
    if (!showActivityPopover) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (activityPopoverRef.current && !activityPopoverRef.current.contains(e.target as Node)) {
        setShowActivityPopover(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showActivityPopover]);

  // Click outside to close substeps popover
  useEffect(() => {
    if (!openSubstepsStageId) return;
    const handleOutside = (e: MouseEvent) => {
      if (substepsPopoverRef.current && !substepsPopoverRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement | null;
        if (target && target.closest('[data-substeps-trigger]')) return;
        setOpenSubstepsStageId(null);
        setWaivingSubstepId(null);
        setWaiveInputReason('');
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [openSubstepsStageId]);

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

  const resolution = resolveRecordNextStep(effectiveRecord, workflow, allFields);
  const slaStatus = resolveRecordSlaStatus(effectiveRecord);

  if (!resolution.hasWorkflow) {
    return null;
  }

  const { isStarted, isCompleted, currentStageName, steps } = resolution;

  // Rich Tooltip / Hover Inspector State for Stages
  const [hoveredStage, setHoveredStage] = useState<{
    stage: ProcessStage;
    coords: { top: number; left: number };
  } | null>(null);

  const handleStageMouseEnter = (e: React.MouseEvent<HTMLElement>, stage: ProcessStage) => {
    if (openSubstepsStageId) return; // Don't show tooltip if popover is open
    if (!stage.automatedActions?.length && !stage.decisionName && !stage.condition && !stage.description) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredStage({
      stage,
      coords: {
        top: rect.bottom + 6,
        left: rect.left
      }
    });
  };

  const handleStageMouseLeave = () => {
    setHoveredStage(null);
  };

  // Fork Branch Dropdown State
  const [openForkStepId, setOpenForkStepId] = useState<string | null>(null);
  const [forkMenuCoords, setForkMenuCoords] = useState<{ top: number; left: number } | null>(null);

  const handleToggleForkMenu = (e: React.MouseEvent<HTMLElement>, stepId: string) => {
    e.stopPropagation();
    setHoveredStage(null);
    setOpenSubstepsStageId(null);
    if (openForkStepId === stepId) {
      setOpenForkStepId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setForkMenuCoords({
      top: rect.bottom + 6,
      left: Math.min(window.innerWidth - 275, Math.max(12, rect.left - 20))
    });
    setOpenForkStepId(stepId);
  };

  useEffect(() => {
    if (!openForkStepId) return;
    const handleOutside = () => setOpenForkStepId(null);
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [openForkStepId]);

  // Toggle Substeps Dropdown Popover
  const handleToggleSubstepsMenu = (e: React.MouseEvent<HTMLElement>, stageId: string) => {
    e.stopPropagation();
    setHoveredStage(null);
    setOpenForkStepId(null);
    setWaivingSubstepId(null);
    setWaiveInputReason('');

    if (openSubstepsStageId === stageId) {
      setOpenSubstepsStageId(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    setSubstepsMenuCoords({
      top: rect.bottom + 6,
      left: Math.min(window.innerWidth - 340, Math.max(12, rect.left - 40))
    });
    setOpenSubstepsStageId(stageId);
  };

  // Handle checking/unchecking a substep
  const handleToggleSubstep = async (stageNodeId: string, substepId: string, currentStatus: SubstepStatus) => {
    const nextStatus: SubstepStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    const targetNode = workflow?.nodes?.find(n => n.id === stageNodeId || n.name === stageNodeId);
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
    const targetNode = workflow?.nodes?.find(n => n.id === stageNodeId || n.name === stageNodeId);
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
    setHoveredStage(null);
    setOpenSubstepsStageId(null);
    if (isTransitioning) return;

    // 1. Check for missing required fields
    const missing = checkMissingRequiredFields(requiredFieldIds, effectiveRecord, allFields);
    
    // 2. Check for incomplete required substeps on current active stage
    const activeStageNode = resolution.currentStageNode || (workflow?.nodes?.find(n => n.name === currentStageName || n.id === currentStageName));
    const substepsCheck = checkStageSubstepsSatisfied(activeStageNode || undefined, effectiveRecord);

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
    onTransition(targetNodeName, targetNodeId);
  };

  const handleConfirmRequirements = async (values: Record<string, any>) => {
    if (!pendingAction) return;
    setTransitioningTarget(pendingAction.targetNodeId || pendingAction.targetNodeName);

    // Reset transient optimistic substeps so the target stage begins with a clean state
    setOptimisticSubsteps({});

    await onTransition(pendingAction.targetNodeName, pendingAction.targetNodeId, values);
    setShowRequirementsModal(false);
    setPendingAction(null);
    setMissingFields([]);
    setIncompleteSubsteps([]);
  };

  const getActivityIcon = (type?: string) => {
    switch (type) {
      case 'call': return Phone;
      case 'email': return Mail;
      case 'meeting': return Calendar;
      case 'document': return FileText;
      case 'todo': 
      default: return CheckSquare;
    }
  };

  const renderStageItem = (stage: ProcessStage, isInForkGroup: boolean = false) => {
    const isThisStageTransitioning = isTransitioning && (transitioningTarget === stage.id || transitioningTarget === stage.name);
    const hasAutomations = Boolean(stage.automatedActions && stage.automatedActions.length > 0);
    const hasConditions = Boolean(stage.condition || stage.decisionName);
    const hasSubsteps = Boolean(stage.substeps && stage.substeps.length > 0);
    const substepsSummary = stage.substepsSummary;
    const isSubstepsOpen = openSubstepsStageId === stage.id;

    if (stage.isCurrent) {
      return (
        <div
          key={stage.id}
          onMouseEnter={(e) => handleStageMouseEnter(e, stage)}
          onMouseLeave={handleStageMouseLeave}
          className={cn(
            "relative flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold text-indigo-700 dark:text-indigo-300 select-none cursor-default",
            isInForkGroup && "px-2 py-0.5 text-[11px]"
          )}
          title={stage.description || `Current Stage: ${stage.name}`}
        >
          <motion.div
            layoutId="activeWorkflowStagePill"
            className="absolute inset-0 bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 rounded-md -z-10 shadow-xs"
            transition={{ type: "spring", stiffness: 450, damping: 32 }}
          />
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 450, damping: 25 }}
            className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 ring-2 ring-indigo-500/20 dark:ring-indigo-400/20 shrink-0 animate-pulse"
          />
          <span className="truncate max-w-[130px]">{stage.name}</span>

          {/* Subtasks Dropdown Pill on Active Stage */}
          {hasSubsteps && (
            <button
              type="button"
              data-substeps-trigger="true"
              onClick={(e) => handleToggleSubstepsMenu(e, stage.id)}
              className={cn(
                "flex items-center gap-1 ml-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer shadow-2xs",
                substepsSummary?.isSatisfied
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30"
                  : "bg-indigo-600/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600/20 border border-indigo-500/25"
              )}
              title="Click to view and complete stage subtasks"
            >
              <CheckSquare size={10} className={substepsSummary?.isSatisfied ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-400"} />
              <span>{substepsSummary?.completed || 0}/{substepsSummary?.total || 0}</span>
              <ChevronDown size={9} className={cn("transition-transform duration-200", isSubstepsOpen && "rotate-180")} />
            </button>
          )}

          {hasAutomations && (
            <span className="flex items-center text-amber-500 dark:text-amber-400 shrink-0 ml-0.5" title={`${stage.automatedActions!.length} automated action(s)`}>
              <Zap size={10} className="fill-amber-400/40" />
            </span>
          )}
          {hasConditions && !hasAutomations && (
            <span className="flex items-center text-indigo-400 dark:text-indigo-400 shrink-0 ml-0.5 opacity-80" title={stage.decisionName || stage.condition}>
              <GitFork size={10} />
            </span>
          )}
        </div>
      );
    }

    if (stage.isCompleted) {
      return (
        <motion.button
          key={stage.id}
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          disabled={isTransitioning}
          onMouseEnter={(e) => handleStageMouseEnter(e, stage)}
          onMouseLeave={handleStageMouseLeave}
          onClick={() => handleStageOrBranchClick(stage.name, stage.id, stage.requiredFieldIds)}
          title={stage.description || `Revert to ${stage.name}`}
          className={cn(
            "relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer disabled:opacity-70",
            isInForkGroup && "px-2 py-0.5 text-[11px]",
            isThisStageTransitioning
              ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/60"
          )}
        >
          {isThisStageTransitioning ? (
            <Loader2 size={11} className="animate-spin text-indigo-500 shrink-0" />
          ) : (
            <motion.span
              initial={{ scale: 0, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 450, damping: 25 }}
              className="flex items-center"
            >
              <Check size={11} className="text-emerald-500/90 dark:text-emerald-400/90 stroke-[2.5] shrink-0" />
            </motion.span>
          )}
          <span className={cn("truncate max-w-[130px]", isThisStageTransitioning && "animate-pulse font-semibold")}>{stage.name}</span>
          
          {hasSubsteps && (
            <span className="text-[10px] text-zinc-400 font-medium ml-0.5">
              ({substepsSummary?.completed || 0}/{substepsSummary?.total || 0})
            </span>
          )}

          {hasAutomations && (
            <span className="flex items-center text-amber-500 dark:text-amber-400 shrink-0 ml-0.5">
              <Zap size={10} className="fill-amber-400/40" />
            </span>
          )}
          {hasConditions && !hasAutomations && (
            <span className="flex items-center text-zinc-400 dark:text-zinc-500 shrink-0 ml-0.5 opacity-70">
              <GitFork size={10} />
            </span>
          )}
        </motion.button>
      );
    }

    if (stage.isDirectNext) {
      return (
        <motion.button
          key={stage.id}
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          disabled={isTransitioning}
          onMouseEnter={(e) => handleStageMouseEnter(e, stage)}
          onMouseLeave={handleStageMouseLeave}
          onClick={() => handleStageOrBranchClick(stage.name, stage.id, stage.requiredFieldIds)}
          title={stage.description || `Advance to ${stage.name}`}
          className={cn(
            "relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer disabled:opacity-70",
            isInForkGroup && "px-2 py-0.5 text-[11px]",
            isThisStageTransitioning
              ? "bg-indigo-600 text-white"
              : "text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          )}
        >
          {isThisStageTransitioning && (
            <Loader2 size={11} className="animate-spin text-indigo-500 shrink-0" />
          )}
          <span className="truncate max-w-[130px]">{stage.name}</span>
          {hasSubsteps && (
            <span className="text-[10px] opacity-75 font-normal ml-0.5">
              ({stage.substeps?.length || 0})
            </span>
          )}
          {hasAutomations && (
            <span className="flex items-center text-amber-500 shrink-0 ml-0.5">
              <Zap size={10} className="fill-amber-400/40" />
            </span>
          )}
        </motion.button>
      );
    }

    // Default Upcoming Stage
    return (
      <div
        key={stage.id}
        onMouseEnter={(e) => handleStageMouseEnter(e, stage)}
        onMouseLeave={handleStageMouseLeave}
        className={cn(
          "relative flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-normal text-zinc-400 dark:text-zinc-500 select-none cursor-default",
          isInForkGroup && "px-1.5 py-0.5 text-[11px]"
        )}
        title={stage.description || stage.name}
      >
        <span className="truncate max-w-[120px]">{stage.name}</span>
        {hasSubsteps && (
          <span className="text-[9.5px] opacity-60 ml-0.5">
            ({stage.substeps?.length})
          </span>
        )}
      </div>
    );
  };

  const renderForkStep = (step: PipelineStep) => {
    const currentForkStage = step.stages.find(s => s.isCurrent);
    const isOpen = openForkStepId === step.id;

    if (currentForkStage) {
      return (
        <button
          key={step.id}
          type="button"
          onClick={(e) => handleToggleForkMenu(e, step.id)}
          onMouseEnter={(e) => handleStageMouseEnter(e, currentForkStage)}
          onMouseLeave={handleStageMouseLeave}
          className="relative flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold text-indigo-700 dark:text-indigo-300 select-none cursor-pointer group"
          title={`Active Branch: ${currentForkStage.name} (Click to switch branch)`}
        >
          <motion.div
            layoutId="activeWorkflowStagePill"
            className="absolute inset-0 bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 rounded-md -z-10 shadow-xs"
            transition={{ type: "spring", stiffness: 450, damping: 32 }}
          />
          <GitFork size={11} className="text-indigo-500 dark:text-indigo-400 shrink-0" />
          <span className="truncate max-w-[120px]">{currentForkStage.name}</span>
          <ChevronDown size={11} className={cn("text-indigo-400/80 shrink-0 transition-transform duration-150", isOpen && "rotate-180")} />
        </button>
      );
    }

    const completedStages = step.stages.filter(s => s.isCompleted);
    if (completedStages.length > 0) {
      return (
        <motion.button
          key={step.id}
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={(e) => handleToggleForkMenu(e, step.id)}
          className="relative flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/60 transition-all cursor-pointer"
          title={`Completed Branch: ${completedStages[0].name}`}
        >
          <Check size={11} className="text-emerald-500 stroke-[2.5] shrink-0" />
          <span className="truncate max-w-[120px]">{completedStages[0].name}</span>
          <ChevronDown size={11} className={cn("text-zinc-400 shrink-0 transition-transform duration-150", isOpen && "rotate-180")} />
        </motion.button>
      );
    }

    return (
      <motion.button
        key={step.id}
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        onClick={(e) => handleToggleForkMenu(e, step.id)}
        className="relative flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-normal text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200/40 dark:hover:bg-zinc-800/40 transition-all cursor-pointer"
        title={`Upcoming: ${step.stages.length} parallel paths`}
      >
        <GitFork size={10} className="text-zinc-400/80 shrink-0" />
        <span>Branch ({step.stages.length})</span>
        <ChevronDown size={11} className={cn("text-zinc-400/70 shrink-0 transition-transform duration-150", isOpen && "rotate-180")} />
      </motion.button>
    );
  };

  return (
    <>
      <div
        className={cn(
          "w-full h-[52px] px-6 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 select-none box-border relative overflow-hidden",
          className
        )}
      >
        {/* Left: Workflow Process State / Context / Primary Action Button / SLA */}
        <div className="flex items-center gap-3 shrink-0">
          <AnimatePresence mode="wait">
            {!isStarted ? (
              <motion.button
                key="start"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={onStartWorkflow}
                disabled={isTransitioning}
                className="h-7 px-3 bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-100 dark:border dark:border-zinc-700 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium rounded-md shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Zap size={12} className="text-amber-400 dark:text-amber-500" />
                <span>Start Workflow</span>
              </motion.button>
            ) : isCompleted ? (
              <motion.div
                key="completed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-md text-xs font-medium"
              >
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span>Workflow Complete</span>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* SLA / Scheduled Activity Traffic Light Pill */}
          {slaStatus.level !== 'NONE' && (
            <div className="relative" ref={activityPopoverRef}>
              <button
                type="button"
                onClick={() => setShowActivityPopover(!showActivityPopover)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border transition-all cursor-pointer shadow-2xs",
                  slaStatus.level === 'OVERDUE'
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
                    : slaStatus.level === 'TODAY'
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                )}
                title="Click to view scheduled activity / SLA details"
              >
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  slaStatus.level === 'OVERDUE' ? "bg-rose-500 animate-pulse" :
                  slaStatus.level === 'TODAY' ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                )} />
                <Clock size={11} className="shrink-0" />
                <span>{slaStatus.label}</span>
                <ChevronDown size={10} className={cn("transition-transform duration-150", showActivityPopover && "rotate-180")} />
              </button>

              <AnimatePresence>
                {showActivityPopover && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute left-0 top-full mt-1.5 z-50 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-3 space-y-2.5"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          slaStatus.level === 'OVERDUE' ? "bg-rose-500" :
                          slaStatus.level === 'TODAY' ? "bg-amber-500" : "bg-emerald-500"
                        )} />
                        <span className="font-semibold text-xs text-zinc-900 dark:text-white">
                          Activity & SLA Schedule
                        </span>
                      </div>
                      <button
                        onClick={() => setShowActivityPopover(false)}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    {slaStatus.nearestActivity ? (
                      <div className="space-y-1.5 bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {React.createElement(getActivityIcon(slaStatus.nearestActivity.type), {
                              size: 13,
                              className: "text-indigo-500 shrink-0"
                            })}
                            <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                              {slaStatus.nearestActivity.summary}
                            </span>
                          </div>
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0",
                            slaStatus.level === 'OVERDUE' ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                            slaStatus.level === 'TODAY' ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                            "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          )}>
                            {slaStatus.nearestActivity.dueDate}
                          </span>
                        </div>
                        {slaStatus.nearestActivity.assignedToName && (
                          <p className="text-[11px] text-zinc-500 pl-4">
                            Assigned to: <span className="font-medium text-zinc-700 dark:text-zinc-300">{slaStatus.nearestActivity.assignedToName}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500 italic">No scheduled activities pending</p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      {slaStatus.nearestActivity && onCompleteActivity && (
                        <button
                          type="button"
                          onClick={() => {
                            if (slaStatus.nearestActivity) {
                              onCompleteActivity(slaStatus.nearestActivity.id);
                              setShowActivityPopover(false);
                            }
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer transition-all"
                        >
                          <Check size={11} />
                          <span>Mark Done</span>
                        </button>
                      )}

                      {onScheduleActivity && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowActivityPopover(false);
                            setShowScheduleModal(true);
                          }}
                          className="px-2.5 py-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-[11px] font-semibold rounded-lg flex items-center gap-1 ml-auto cursor-pointer transition-all"
                        >
                          <Plus size={11} />
                          <span>Schedule New</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Right: Stage Progression Ribbon */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-0.5 no-scrollbar shrink-0">
          {steps && steps.length > 0 && !compact && (
            <nav 
              aria-label="Process progression" 
              className="inline-flex items-center gap-0.5 bg-zinc-100/70 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-lg p-1 text-xs shadow-2xs"
            >
              {steps.map((step, stepIdx) => (
                <React.Fragment key={step.id}>
                  {stepIdx > 0 && (
                    <ChevronRight size={11} className="text-zinc-300 dark:text-zinc-700 shrink-0 mx-0.5 opacity-60" />
                  )}

                  {!step.isFork ? (
                    renderStageItem(step.stages[0], false)
                  ) : (
                    renderForkStep(step)
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}

          {/* View Flow Graph Button */}
          {onOpenVisualizer && (
            <button
              onClick={onOpenVisualizer}
              className="h-7 w-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors shrink-0 ml-0.5 cursor-pointer"
              title="View Workflow Process Graph"
            >
              <GitFork size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Floating Substeps Dropdown Popover (Rendered in Portal) */}
      {openSubstepsStageId && substepsMenuCoords && typeof document !== 'undefined' && (() => {
        const activeStageNode = workflow?.nodes?.find(n => n.id === openSubstepsStageId);
        if (!activeStageNode) return null;
        const stageSummary = resolveStageSubsteps(activeStageNode, effectiveRecord);

        return createPortal(
          <div
            ref={substepsPopoverRef}
            style={{
              position: 'fixed',
              top: `${substepsMenuCoords.top}px`,
              left: `${substepsMenuCoords.left}px`,
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="z-[99999] w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-120 ease-out"
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <CheckSquare size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                    {activeStageNode.name} Checklist
                  </h4>
                </div>
                <p className="text-[10.5px] text-zinc-500 mt-0.5">
                  {stageSummary.completed} of {stageSummary.total} completed {stageSummary.waived > 0 && `(${stageSummary.waived} waived)`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpenSubstepsStageId(null);
                  setWaivingSubstepId(null);
                }}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300 rounded-full",
                  stageSummary.isSatisfied ? "bg-emerald-500" : "bg-indigo-600"
                )}
                style={{ width: `${Math.round(((stageSummary.completed + stageSummary.waived) / Math.max(1, stageSummary.total)) * 100)}%` }}
              />
            </div>

            {/* Checklist items list */}
            <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1.5 pr-0.5">
              {stageSummary.items.map(item => {
                const isCompleted = item.status === 'completed';
                const isWaived = item.status === 'waived';
                const isPending = item.status === 'pending';
                const isWaivingThis = waivingSubstepId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (!isWaivingThis) {
                        handleToggleSubstep(activeStageNode.id, item.id, item.status);
                      }
                    }}
                    className={cn(
                      "p-2.5 rounded-xl border transition-all text-left cursor-pointer select-none group",
                      isCompleted 
                        ? "bg-emerald-50/60 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-950 dark:text-emerald-100 hover:bg-emerald-50 dark:hover:bg-emerald-500/15" 
                        : isWaived
                        ? "bg-amber-50/60 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30 text-amber-950 dark:text-amber-100 hover:bg-amber-50 dark:hover:bg-amber-500/15"
                        : "bg-zinc-50 dark:bg-zinc-950/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0 pr-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSubstep(activeStageNode.id, item.id, item.status);
                          }}
                          className={cn(
                            "w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 transition-transform active:scale-90 cursor-pointer",
                            isCompleted 
                              ? "bg-emerald-600 text-white shadow-2xs" 
                              : isWaived
                              ? "bg-amber-500 text-white shadow-2xs"
                              : "border border-zinc-300 dark:border-zinc-600 group-hover:border-indigo-500 bg-white dark:bg-zinc-900"
                          )}
                          title={isCompleted ? "Click to mark pending" : "Click to mark completed"}
                        >
                          {isCompleted && <Check size={11} strokeWidth={3} />}
                          {isWaived && <span className="text-[9px] font-bold">~</span>}
                        </button>
                        <div className="min-w-0">
                          <p className={cn(
                            "text-xs font-semibold leading-tight",
                            (isCompleted || isWaived) && "line-through opacity-75"
                          )}>
                            {item.label}
                          </p>
                          {item.description && (
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                              {item.description}
                            </p>
                          )}
                          
                          {/* Metadata / Attribution */}
                          {isCompleted && item.updatedBy && (
                            <p className="text-[9.5px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                              Done by {formatUserLabel(item.updatedBy)}
                            </p>
                          )}
                          {isWaived && (
                            <p className="text-[9.5px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                              Waived: {item.note || 'Exempt'}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className={cn(
                          "text-[9px] uppercase font-bold px-1.5 py-0.5 rounded",
                          item.required 
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20" 
                            : "bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500"
                        )}>
                          {item.required ? 'Req' : 'Opt'}
                        </span>

                        {/* Quick Waive / Reset action */}
                        {isPending ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setWaivingSubstepId(isWaivingThis ? null : item.id);
                              setWaiveInputReason('');
                            }}
                            className="text-[10px] font-medium text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 px-1 py-0.5 rounded hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Mark as Waived / N/A"
                          >
                            Waive
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSubstep(activeStageNode.id, item.id, item.status);
                            }}
                            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Reset to pending"
                          >
                            <RotateCcw size={10} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline Waiver Form */}
                    {isWaivingThis && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-1.5 animate-in fade-in duration-150 cursor-default"
                      >
                        <input
                          type="text"
                          value={waiveInputReason}
                          onChange={(e) => setWaiveInputReason(e.target.value)}
                          placeholder="Reason for waiver (e.g. Client exempt)"
                          className="w-full bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-700/60 rounded-md px-2 py-1 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none"
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setWaivingSubstepId(null)}
                            className="px-2 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleWaiveSubstep(activeStageNode.id, item.id, waiveInputReason)}
                            className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-semibold"
                          >
                            Confirm Waive
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Popover Footer Status */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px]">
              {stageSummary.isSatisfied ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <Check size={12} strokeWidth={2.5} /> All required subtasks satisfied
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                  <AlertCircle size={12} /> {stageSummary.requiredRemaining} required item remaining
                </span>
              )}
            </div>
          </div>,
          document.body
        );
      })()}

      {/* Floating Stage Inspector Popover */}
      {hoveredStage && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            top: `${hoveredStage.coords.top}px`,
            left: `${Math.min(window.innerWidth - 275, Math.max(12, hoveredStage.coords.left - 20))}px`,
          }}
          className="z-[99999] pointer-events-none w-68 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-100 ease-out"
        >
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
            <span className="font-semibold text-xs text-zinc-900 dark:text-white truncate">
              {hoveredStage.stage.name}
            </span>
            <span className={cn(
              "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded",
              hoveredStage.stage.isCurrent ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20" :
              hoveredStage.stage.isCompleted ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" :
              hoveredStage.stage.isDirectNext ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20" :
              "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
            )}>
              {hoveredStage.stage.isCurrent ? 'Current' : hoveredStage.stage.isCompleted ? 'Completed' : hoveredStage.stage.isDirectNext ? 'Next' : 'Upcoming'}
            </span>
          </div>

          {hoveredStage.stage.description && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {hoveredStage.stage.description}
            </p>
          )}

          {(hoveredStage.stage.decisionName || hoveredStage.stage.condition) && (
            <div className="p-2 bg-indigo-500/5 rounded-lg border border-indigo-500/10 space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1">
                <GitFork size={10} />
                <span>Decision Guard</span>
              </span>
              <p className="text-[10px] text-zinc-600 dark:text-zinc-300 font-mono">
                {hoveredStage.stage.decisionName && <span className="font-semibold">{hoveredStage.stage.decisionName}: </span>}
                {hoveredStage.stage.condition || 'Automated condition'}
              </p>
            </div>
          )}

          {hoveredStage.stage.automatedActions && hoveredStage.stage.automatedActions.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                <Zap size={10} />
                <span>Triggered Automations</span>
              </span>
              <div className="space-y-1">
                {hoveredStage.stage.automatedActions.map(act => (
                  <div key={act.id} className="flex items-center gap-1.5 text-[10px] text-zinc-600 dark:text-zinc-400">
                    <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                    <span className="truncate">{act.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Floating Fork Branch Selector Popover */}
      {openForkStepId && forkMenuCoords && typeof document !== 'undefined' && (() => {
        const activeStep = steps.find(s => s.id === openForkStepId);
        if (!activeStep) return null;

        return createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${forkMenuCoords.top}px`,
              left: `${forkMenuCoords.left}px`,
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="z-[99999] w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100 ease-out"
          >
            <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <GitFork size={11} />
                <span>Parallel Branches ({activeStep.stages.length})</span>
              </span>
              <button
                type="button"
                onClick={() => setOpenForkStepId(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer p-0.5 rounded"
              >
                <X size={12} />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-0.5 p-0.5">
              {activeStep.stages.map(branch => {
                const isSelected = branch.isCurrent;
                const isTransitioningBranch = isTransitioning && (transitioningTarget === branch.id || transitioningTarget === branch.name);
                return (
                  <button
                    key={branch.id}
                    type="button"
                    disabled={isTransitioning}
                    onClick={() => {
                      handleStageOrBranchClick(branch.name, branch.id, branch.requiredFieldIds);
                      setOpenForkStepId(null);
                    }}
                    className={cn(
                      "w-full flex items-start justify-between p-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-left disabled:opacity-70",
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        {isTransitioningBranch ? (
                          <Loader2 size={11} className="animate-spin text-indigo-500 shrink-0" />
                        ) : isSelected ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 ring-2 ring-indigo-500/20 animate-pulse shrink-0" />
                        ) : branch.isCompleted ? (
                          <Check size={11} className="text-emerald-500 stroke-[2.5] shrink-0" />
                        ) : null}
                        <span className="truncate">{branch.name}</span>
                        {branch.automatedActions && branch.automatedActions.length > 0 && (
                          <span className="flex items-center text-amber-500 dark:text-amber-400 shrink-0 ml-0.5" title={`${branch.automatedActions.length} action(s)`}>
                            <Zap size={10} className="fill-amber-400/40" />
                          </span>
                        )}
                      </div>
                      {(branch.decisionName || branch.condition) && (
                        <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-normal pl-3 truncate">
                          {branch.decisionName ? `${branch.decisionName}: ` : ''}{branch.condition || ''}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check size={12} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        );
      })()}

      {/* Validation Requirements & Edge-Case Bypass Modal */}
      {showRequirementsModal && pendingAction && (
        <TransitionRequirementsModal
          isOpen={showRequirementsModal}
          onClose={() => {
            setShowRequirementsModal(false);
            setPendingAction(null);
            setMissingFields([]);
            setIncompleteSubsteps([]);
          }}
          targetNodeName={pendingAction.targetNodeName}
          missingFields={missingFields}
          incompleteSubsteps={incompleteSubsteps}
          currentStageName={currentStageName}
          onConfirm={handleConfirmRequirements}
          isSubmitting={isTransitioning}
        />
      )}

      {/* Schedule Activity Drawer */}
      {showScheduleModal && onScheduleActivity && (
        <ScheduleActivityModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          recordKey={record?._record_key || record?.key}
          recordTitle={record?.premises_name || record?.name || record?.title || record?._record_key || record?.id}
          activities={record?._activities || record?.data?._activities || []}
          currentUserName={currentUserName}
          currentUserId={currentUserId}
          onSchedule={async (act) => {
            await onScheduleActivity(act);
            setShowScheduleModal(false);
          }}
          onCompleteActivity={onCompleteActivity}
        />
      )}
    </>
  );
};
