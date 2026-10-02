import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  Check, 
  ChevronDown, 
  ChevronRight,
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
  ScheduledActivity
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
  const [showAltMenu, setShowAltMenu] = useState(false);
  const altMenuRef = useRef<HTMLDivElement>(null);

  // Requirements Modal State
  const [pendingAction, setPendingAction] = useState<NextStepAction | null>(null);
  const [missingFields, setMissingFields] = useState<ModuleField[]>([]);
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);

  // Schedule Activity Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showActivityPopover, setShowActivityPopover] = useState(false);
  const activityPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAltMenu) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (altMenuRef.current && !altMenuRef.current.contains(e.target as Node)) {
        setShowAltMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showAltMenu]);

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

  const { isStarted, isCompleted, primaryAction, alternativeActions, stages } = resolution;

  const handleActionClick = (action: NextStepAction) => {
    if (action.isStart) {
      onStartWorkflow();
      return;
    }

    // Check for missing required fields
    const missing = checkMissingRequiredFields(action.requiredFieldIds, record, allFields);
    if (missing.length > 0) {
      setPendingAction(action);
      setMissingFields(missing);
      setShowRequirementsModal(true);
      return;
    }

    onTransition(action.targetNodeName, action.targetNodeId);
  };

  const handleConfirmRequirements = async (values: Record<string, any>) => {
    if (!pendingAction) return;
    await onTransition(pendingAction.targetNodeName, pendingAction.targetNodeId, values);
    setShowRequirementsModal(false);
    setPendingAction(null);
    setMissingFields([]);
  };

  const getButtonVariantClasses = (variant?: string) => {
    switch (variant) {
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20 shadow-xs border-emerald-500/30';
      case 'destructive':
        return 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20 shadow-xs border-rose-500/30';
      case 'outline':
        return 'bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700';
      case 'primary':
      default:
        return 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20 shadow-xs border-indigo-500/30';
    }
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

  return (
    <>
      <div
        className={cn(
          "w-full flex items-center justify-between gap-3 select-none transition-all bg-white dark:bg-zinc-900",
          className
        )}
      >
        {/* Left: Actions Area (Primary Next Step + Secondary Transitions + SLA) */}
        <div className="flex items-center gap-2 shrink-0">
          {!isStarted ? (
            <button
              onClick={onStartWorkflow}
              disabled={isTransitioning}
              className="h-8 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isTransitioning ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Zap size={13} className="text-amber-300" />
              )}
              <span>Start Workflow</span>
            </button>
          ) : isCompleted ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-semibold">
              <CheckCircle2 size={14} className="text-emerald-500" />
              <span>Process Complete</span>
            </div>
          ) : primaryAction ? (
            <div className="flex items-center">
              {/* Main Primary Next Action Button */}
              <button
                onClick={() => handleActionClick(primaryAction)}
                disabled={isTransitioning}
                className={cn(
                  "h-8 px-3.5 text-xs font-semibold border flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer",
                  alternativeActions.length > 0 ? "rounded-l-lg border-r-0" : "rounded-lg",
                  getButtonVariantClasses(primaryAction.variant)
                )}
              >
                {isTransitioning ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : primaryAction.variant === 'success' ? (
                  <Check size={13} />
                ) : (
                  <ArrowRight size={13} />
                )}
                <span className="font-medium tracking-tight">Next:</span>
                <span className="font-bold">{primaryAction.label}</span>
              </button>

              {/* Split Dropdown for Alternative Transitions */}
              {alternativeActions.length > 0 && (
                <div className="relative" ref={altMenuRef}>
                  <button
                    onClick={() => setShowAltMenu(!showAltMenu)}
                    disabled={isTransitioning}
                    className={cn(
                      "h-8 px-2 text-xs font-semibold border border-l border-white/20 transition-all rounded-r-lg disabled:opacity-50 cursor-pointer",
                      getButtonVariantClasses(primaryAction.variant)
                    )}
                    title="More actions"
                  >
                    <ChevronDown size={13} className={cn("transition-transform duration-150", showAltMenu && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {showAltMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.95 }}
                        transition={{ duration: 0.12 }}
                        className="absolute left-0 mt-1.5 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden p-1.5 space-y-0.5"
                      >
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-2.5 py-1">Alternative Steps</p>
                        {alternativeActions.map(action => (
                          <button
                            key={action.edgeId || action.targetNodeId}
                            onClick={() => {
                              handleActionClick(action);
                              setShowAltMenu(false);
                            }}
                            disabled={isTransitioning}
                            className={cn(
                              "w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between group disabled:opacity-50 cursor-pointer",
                              action.variant === 'destructive'
                                ? "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                : action.variant === 'success'
                                ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 hover:text-indigo-600 dark:hover:text-indigo-400"
                            )}
                          >
                            <span>{action.label}</span>
                            <ArrowRight size={12} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          ) : null}

          {/* SLA / Scheduled Activity Traffic Light Pill (Only rendered when pending SLA or task exists) */}
          {slaStatus.level !== 'NONE' && (
            <div className="relative" ref={activityPopoverRef}>
              <button
                type="button"
                onClick={() => setShowActivityPopover(!showActivityPopover)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs",
                  slaStatus.level === 'OVERDUE'
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
                    : slaStatus.level === 'TODAY'
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                )}
                title="Click to view scheduled activity / SLA details"
              >
                <span className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  slaStatus.level === 'OVERDUE' ? "bg-rose-500 animate-ping" : slaStatus.level === 'TODAY' ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                )} />
                {React.createElement(getActivityIcon(slaStatus.nearestActivity?.type), { size: 12, className: "shrink-0" })}
                <span className="truncate max-w-[170px]">{slaStatus.label}</span>
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

        {/* Right: Stage Progression Ribbon (Segmented Pipeline) */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-full py-0.5 no-scrollbar shrink-0">
          {stages.length > 0 && !compact && (
            <nav 
              aria-label="Process progression" 
              className="inline-flex items-center bg-zinc-100 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5 text-xs shadow-2xs"
            >
              {stages.map((stage, idx) => {
                const hasAlternativeEdge = alternativeActions.some(a => a.targetNodeId === stage.id || a.targetNodeName.toLowerCase() === stage.name.toLowerCase());
                const isClickable = !stage.isCurrent && (hasAlternativeEdge || (primaryAction && (primaryAction.targetNodeId === stage.id || primaryAction.targetNodeName.toLowerCase() === stage.name.toLowerCase())));

                return (
                  <React.Fragment key={stage.id}>
                    {idx > 0 && (
                      <ChevronRight size={12} className="text-zinc-400 dark:text-zinc-600 shrink-0 mx-0.5" />
                    )}
                    <button
                      type="button"
                      disabled={!isClickable || isTransitioning}
                      onClick={() => {
                        if (isClickable) {
                          const action = primaryAction?.targetNodeId === stage.id ? primaryAction : alternativeActions.find(a => a.targetNodeId === stage.id);
                          if (action) {
                            handleActionClick(action);
                          } else {
                            onTransition(stage.name, stage.id);
                          }
                        }
                      }}
                      title={stage.description || (isClickable ? `Jump to ${stage.name}` : stage.name)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-semibold transition-all select-none flex items-center gap-1.5",
                        stage.isCurrent
                          ? "bg-indigo-600 text-white font-bold shadow-xs cursor-default"
                          : stage.isCompleted
                          ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                          : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300",
                        isClickable && !stage.isCurrent && "hover:bg-zinc-200/60 dark:hover:bg-zinc-800/80 cursor-pointer",
                        !isClickable && !stage.isCurrent && "cursor-default"
                      )}
                    >
                      {stage.isCompleted ? (
                        <Check size={11} className="text-emerald-500 shrink-0 stroke-[2.5]" />
                      ) : stage.isCurrent ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 animate-pulse" />
                      ) : null}
                      <span className="truncate max-w-[130px]">{stage.name}</span>
                    </button>
                  </React.Fragment>
                );
              })}
            </nav>
          )}

          {/* View Flow Graph Button */}
          {onOpenVisualizer && (
            <button
              onClick={onOpenVisualizer}
              className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors shrink-0 ml-1 cursor-pointer"
              title="View Workflow Process Graph"
            >
              <GitFork size={14} />
            </button>
          )}
        </div>
      </div>

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

      {/* Schedule Activity Modal */}
      {showScheduleModal && onScheduleActivity && (
        <ScheduleActivityModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          recordTitle={record?.name || record?.title || record?.key || record?.id}
          currentUserName={currentUserName}
          currentUserId={currentUserId}
          onSchedule={async (act) => {
            await onScheduleActivity(act);
            setShowScheduleModal(false);
          }}
        />
      )}
    </>
  );
};
