import React, { useState, useRef, useEffect } from 'react';
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
  FileText,
  X
} from 'lucide-react';
import { Workflow, ModuleField } from '../../types/platform';
import { 
  resolveRecordNextStep, 
  NextStepAction, 
  resolveRecordSlaStatus, 
  checkMissingRequiredFields,
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
  currentUserName?: string;
  currentUserId?: string;
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
  currentUserName,
  currentUserId,
  onOpenVisualizer,
  className,
  compact = false
}) => {
  // Requirements Modal State
  const [pendingAction, setPendingAction] = useState<NextStepAction | null>(null);
  const [missingFields, setMissingFields] = useState<ModuleField[]>([]);
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);

  // Schedule Activity Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showActivityPopover, setShowActivityPopover] = useState(false);
  const activityPopoverRef = useRef<HTMLDivElement>(null);

  // Transitioning Feedback State
  const [transitioningTarget, setTransitioningTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!isTransitioning) {
      setTransitioningTarget(null);
    }
  }, [isTransitioning]);

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

  const resolution = resolveRecordNextStep(record, workflow, allFields);
  const slaStatus = resolveRecordSlaStatus(record);

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

  const handleStageOrBranchClick = (targetNodeName: string, targetNodeId: string, requiredFieldIds?: string[]) => {
    setHoveredStage(null);
    if (isTransitioning) return;

    // Check for missing required fields
    const missing = checkMissingRequiredFields(requiredFieldIds, record, allFields);
    if (missing.length > 0) {
      setPendingAction({
        targetNodeId,
        targetNodeName,
        label: targetNodeName,
        requiredFieldIds
      });
      setMissingFields(missing);
      setShowRequirementsModal(true);
      return;
    }

    setTransitioningTarget(targetNodeId || targetNodeName);
    onTransition(targetNodeName, targetNodeId);
  };

  const handleConfirmRequirements = async (values: Record<string, any>) => {
    if (!pendingAction) return;
    setTransitioningTarget(pendingAction.targetNodeId || pendingAction.targetNodeName);
    await onTransition(pendingAction.targetNodeName, pendingAction.targetNodeId, values);
    setShowRequirementsModal(false);
    setPendingAction(null);
    setMissingFields([]);
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
            "relative flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer disabled:opacity-70",
            isInForkGroup && "px-2 py-0.5 text-[11px]",
            isThisStageTransitioning
              ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300"
              : "text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10"
          )}
        >
          {isThisStageTransitioning ? (
            <Loader2 size={11} className="animate-spin text-indigo-500 shrink-0" />
          ) : (
            <ArrowRight size={11} className="text-indigo-500/80 shrink-0" />
          )}
          <span className={cn("truncate max-w-[130px]", isThisStageTransitioning && "animate-pulse font-semibold")}>{stage.name}</span>
          {hasAutomations && (
            <span className="flex items-center text-amber-500 dark:text-amber-400 shrink-0 ml-0.5">
              <Zap size={10} className="fill-amber-400/40" />
            </span>
          )}
          {hasConditions && !hasAutomations && (
            <span className="flex items-center text-indigo-400 dark:text-indigo-400 shrink-0 ml-0.5 opacity-80">
              <GitFork size={10} />
            </span>
          )}
        </motion.button>
      );
    }

    // Upcoming later stage (Clickable jump)
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
        title={stage.description || `Jump to ${stage.name}`}
        className={cn(
          "relative flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-normal transition-all cursor-pointer disabled:opacity-70",
          isInForkGroup && "px-2 py-0.5 text-[11px]",
          isThisStageTransitioning
            ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 font-medium"
            : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200/40 dark:hover:bg-zinc-800/40"
        )}
      >
        {isThisStageTransitioning && (
          <Loader2 size={11} className="animate-spin text-indigo-500 shrink-0" />
        )}
        <span className={cn("truncate max-w-[130px]", isThisStageTransitioning && "animate-pulse font-semibold")}>{stage.name}</span>
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
  };

  const renderForkStep = (step: PipelineStep) => {
    const history: Array<{ nodeId: string }> = record?.workflowState?.history || [];
    const currentForkStage = step.stages.find(s => s.isCurrent);
    // A step is only truly completed if the record has moved to a downstream step (i.e. isCompleted on stage is true)
    const isStepCompleted = step.stages.some(s => s.isCompleted);
    // Find the specific branch stage that was traversed in history before advancing past this step
    const completedForkStage = isStepCompleted
      ? (step.stages.find(s => history.some((h: any) => h.nodeId === s.id)) || step.stages[0])
      : undefined;
    const isDirectNext = step.stages.some(s => s.isDirectNext);
    const isStepTransitioning = isTransitioning && step.stages.some(s => transitioningTarget === s.id || transitioningTarget === s.name);
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
          {isStepTransitioning ? (
            <Loader2 size={11} className="animate-spin text-indigo-500 shrink-0" />
          ) : (
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 450, damping: 25 }}
              className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 ring-2 ring-indigo-500/20 dark:ring-indigo-400/20 shrink-0 animate-pulse"
            />
          )}
          <span className="truncate max-w-[130px]">{currentForkStage.name}</span>
          {currentForkStage.automatedActions && currentForkStage.automatedActions.length > 0 && (
            <span className="flex items-center text-amber-500 dark:text-amber-400 shrink-0 ml-0.5">
              <Zap size={10} className="fill-amber-400/40" />
            </span>
          )}
          <ChevronDown size={11} className={cn("text-indigo-500/70 dark:text-indigo-400/70 shrink-0 transition-transform duration-150", isOpen && "rotate-180")} />
        </button>
      );
    }

    if (completedForkStage) {
      return (
        <motion.button
          key={step.id}
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={(e) => handleToggleForkMenu(e, step.id)}
          onMouseEnter={(e) => handleStageMouseEnter(e, completedForkStage)}
          onMouseLeave={handleStageMouseLeave}
          className={cn(
            "relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer",
            isStepTransitioning
              ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/60"
          )}
          title={`Completed Branch: ${completedForkStage.name} (Click to view paths)`}
        >
          {isStepTransitioning ? (
            <Loader2 size={11} className="animate-spin text-indigo-500 shrink-0" />
          ) : (
            <Check size={11} className="text-emerald-500/90 dark:text-emerald-400/90 stroke-[2.5] shrink-0" />
          )}
          <span className="truncate max-w-[130px]">{completedForkStage.name}</span>
          <ChevronDown size={11} className={cn("text-zinc-400 shrink-0 transition-transform duration-150", isOpen && "rotate-180")} />
        </motion.button>
      );
    }

    if (isDirectNext) {
      return (
        <motion.button
          key={step.id}
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={(e) => handleToggleForkMenu(e, step.id)}
          className={cn(
            "relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer border border-dashed",
            isStepTransitioning
              ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/40"
              : "text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10 border-indigo-400/40 dark:border-indigo-500/40 bg-indigo-500/5 shadow-2xs"
          )}
          title={`Select Next Branch (${step.stages.length} options)`}
        >
          {isStepTransitioning ? (
            <Loader2 size={11} className="animate-spin text-indigo-500 shrink-0" />
          ) : (
            <ArrowRight size={11} className="text-indigo-500 shrink-0" />
          )}
          <span className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
            <GitFork size={11} className="shrink-0" />
            <span>Select Branch ({step.stages.length})</span>
          </span>
          <ChevronDown size={11} className={cn("text-indigo-500/80 dark:text-indigo-400/80 shrink-0 transition-transform duration-150", isOpen && "rotate-180")} />
        </motion.button>
      );
    }

    // Upcoming Fork (later in pipeline)
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
        {/* Animated Top Progress Accent Line during transition */}
        <AnimatePresence>
          {isTransitioning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-0 left-0 right-0 h-[2px] bg-indigo-500/20 overflow-hidden z-20 pointer-events-none"
            >
              <motion.div
                className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"
                animate={{ x: ['-100%', '300%'] }}
                transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
                style={{ width: '40%' }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Left: Workflow Process State / Context / SLA */}
        <div className="flex items-center gap-3 shrink-0">
          <AnimatePresence mode="wait">
            {isTransitioning ? (
              <motion.div
                key="transitioning"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2 text-xs"
              >
                <Loader2 size={13} className="animate-spin text-indigo-500 shrink-0" />
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 animate-pulse">
                  Updating workflow status...
                </span>
              </motion.div>
            ) : !isStarted ? (
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

          {/* SLA / Scheduled Activity Traffic Light Pill (Only rendered when pending SLA or task exists) */}
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
                  slaStatus.level === 'OVERDUE' ? "bg-rose-500 animate-ping" : slaStatus.level === 'TODAY' ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                )} />
                {React.createElement(getActivityIcon(slaStatus.nearestActivity?.type), { size: 11, className: "shrink-0" })}
                <span className="truncate max-w-[150px]">{slaStatus.label}</span>
              </button>

              {/* Activity Details Dropdown */}
              <AnimatePresence>
                {showActivityPopover && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-0 mt-1.5 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-50 p-3 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Clock size={12} />
                        Next Activity / SLA
                      </span>
                      <button
                        onClick={() => setShowActivityPopover(false)}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      >
                        <X size={13} />
                      </button>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">
                        {slaStatus.nearestActivity?.summary || (slaStatus.isSlaDeadline ? 'Module SLA Target' : 'Scheduled Task')}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Due: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{slaStatus.nearestDate ? new Date(slaStatus.nearestDate).toLocaleDateString() : 'Today'}</span>
                      </p>
                      {slaStatus.nearestActivity?.note && (
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-lg mt-2 border border-zinc-200/60 dark:border-zinc-800/60">
                          {slaStatus.nearestActivity.note}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 gap-2 border-t border-zinc-100 dark:border-zinc-800">
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

        {/* Right: Stage Progression Ribbon with Option A Fork Sibling Groups & Direct Transitions */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-0.5 no-scrollbar shrink-0">
          {steps && steps.length > 0 && !compact && (
            <nav 
              aria-label="Process progression" 
              className="inline-flex items-center gap-0.5 bg-zinc-100/70 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80 rounded-lg p-1 text-xs shadow-2xs"
            >
              {steps.map((step, stepIdx) => (
                <React.Fragment key={step.id}>
                  {stepIdx > 0 && (
                    <ChevronRight size={11} className="text-zinc-300 dark:text-zinc-700 shrink-0 mx-0.5 opacity-60" />
                  )}

                  {!step.isFork ? (
                    renderStageItem(step.stages[0], false)
                  ) : (
                    /* Compact Fork Dropdown Pill */
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
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[11px]">
              <GitFork size={12} className="shrink-0 mt-0.5 text-indigo-500" />
              <div className="space-y-0.5 overflow-hidden">
                {hoveredStage.stage.decisionName && (
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {hoveredStage.stage.decisionName}
                  </div>
                )}
                {hoveredStage.stage.condition && (
                  <div className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 break-all">
                    Rule: {hoveredStage.stage.condition}
                  </div>
                )}
              </div>
            </div>
          )}

          {hoveredStage.stage.automatedActions && hoveredStage.stage.automatedActions.length > 0 && (
            <div className="space-y-1 pt-0.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Zap size={10} className="shrink-0 fill-amber-400/40" />
                <span>Automated Actions ({hoveredStage.stage.automatedActions.length})</span>
              </div>
              <div className="space-y-1">
                {hoveredStage.stage.automatedActions.map(action => (
                  <div key={action.id} className="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800 text-[11px]">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate">{action.name}</span>
                    <span className="text-[9px] font-semibold uppercase px-1 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">{action.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Floating Fork Branch Selection Menu */}
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
                        ) : (
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            isSelected ? "bg-indigo-600 dark:bg-indigo-400 ring-2 ring-indigo-500/20 animate-pulse" :
                            branch.isCompleted ? "bg-emerald-500" :
                            branch.isDirectNext ? "bg-blue-500" : "bg-zinc-400"
                          )} />
                        )}
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

      {/* Validation Requirements Modal */}
      {showRequirementsModal && pendingAction && (
        <TransitionRequirementsModal
          isOpen={showRequirementsModal}
          onClose={() => {
            setShowRequirementsModal(false);
            setPendingAction(null);
            setMissingFields([]);
          }}
          targetNodeName={pendingAction.targetNodeName}
          missingFields={missingFields}
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
