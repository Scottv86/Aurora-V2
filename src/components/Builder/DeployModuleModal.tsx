import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Rocket,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Calendar,
  Clock,
  Copy,
  Check,
  Download,
  RefreshCw,
  ArrowRight,
  Play,
  Plus,
  Minus,
  Pencil,
  SlidersHorizontal
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import {
  ModuleVersionSnapshot,
  ModuleVersionSnapshotState,
  VersionFieldDiff,
  AICommitResult
} from '../../types/versionControl';
import { ScheduledDeployment } from '../../types/deployments';
import { versionControlService } from '../../utils/versionControlService';
import { deploymentQueueService } from '../../utils/deploymentQueueService';

const CURRENT_DRAFT_OPTION = '__current_unsaved__';

interface DeployModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId: string;
  moduleName: string;
  isDirty: boolean;
  initialTargetVersionId?: string | null;
  getCurrentState: () => ModuleVersionSnapshotState;
  onSaveCurrentAsVersion: () => Promise<ModuleVersionSnapshot | null>;
  onPromoteVersion: (
    targetVersion: ModuleVersionSnapshot,
    options: {
      softDeleteDropped: boolean;
      releaseNotes: string;
      isRollback: boolean;
    }
  ) => Promise<void>;
  onViewAllVersions?: () => void;
}

export const DeployModuleModal: React.FC<DeployModuleModalProps> = ({
  isOpen,
  onClose,
  moduleId,
  moduleName,
  isDirty,
  initialTargetVersionId,
  getCurrentState,
  onSaveCurrentAsVersion,
  onPromoteVersion,
  onViewAllVersions
}) => {
  const [versions, setVersions] = useState<ModuleVersionSnapshot[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledDeployment[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [isVersionPickerOpen, setIsVersionPickerOpen] = useState(false);
  const versionPickerRef = useRef<HTMLDivElement>(null);

  // Close custom version picker on click-outside or Escape
  useEffect(() => {
    if (!isVersionPickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (versionPickerRef.current && !versionPickerRef.current.contains(e.target as Node)) {
        setIsVersionPickerOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsVersionPickerOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVersionPickerOpen]);

  // Timing
  const [timing, setTiming] = useState<'now' | 'schedule'>('now');
  const [schedulePreset, setSchedulePreset] = useState<'tonight' | 'tomorrow' | 'weekend' | 'custom'>('tonight');
  const [customDateTime, setCustomDateTime] = useState<string>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 4);
    return d.toISOString().slice(0, 16);
  });

  // Advanced options (collapsed by default)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showChangesList, setShowChangesList] = useState(false);
  const [softDeleteDropped, setSoftDeleteDropped] = useState(true);
  const [autoRollback, setAutoRollback] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [notifyUsers, setNotifyUsers] = useState(true);
  const [copiedSql, setCopiedSql] = useState(false);

  // AI release notes state
  const [aiNotes, setAiNotes] = useState<AICommitResult | null>(null);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);

  // Sync versions & scheduled jobs
  useEffect(() => {
    if (!isOpen || !moduleId) return;
    const refreshVersions = () => {
      const list = versionControlService.getVersions(moduleId);
      setVersions(list);
    };
    const refreshJobs = () => {
      const jobs = deploymentQueueService
        .getDeployments(moduleId)
        .filter(j => j.status === 'SCHEDULED' || j.status === 'RUNNING');
      setScheduledJobs(jobs);
    };

    refreshVersions();
    refreshJobs();
    const unsubV = versionControlService.subscribe(refreshVersions);
    const unsubJ = deploymentQueueService.subscribe(refreshJobs);
    return () => {
      unsubV();
      unsubJ();
    };
  }, [isOpen, moduleId]);

  // Pick smart default target when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setShowAdvanced(false);
    setShowChangesList(false);
    setTiming('now');

    if (initialTargetVersionId) {
      setSelectedOptionId(initialTargetVersionId);
      return;
    }
    if (isDirty) {
      setSelectedOptionId(CURRENT_DRAFT_OPTION);
      return;
    }
    const list = versionControlService.getVersions(moduleId);
    const latestNonLive = list.find(v => !v.isDeployed);
    setSelectedOptionId(latestNonLive?.id || list[0]?.id || CURRENT_DRAFT_OPTION);
  }, [isOpen, initialTargetVersionId, isDirty, moduleId]);

  const liveVersion = useMemo(
    () => versions.find(v => v.isDeployed) || null,
    [versions]
  );

  const selectedVersion = useMemo(() => {
    if (selectedOptionId === CURRENT_DRAFT_OPTION) return null;
    return versions.find(v => v.id === selectedOptionId) || null;
  }, [versions, selectedOptionId]);

  const nextTagForUnsaved = useMemo(
    () => versionControlService.getNextVersionTag(moduleId),
    [moduleId, versions]
  );

  const targetVersionTag = selectedVersion ? selectedVersion.versionTag : nextTagForUnsaved;

  const isRollback = useMemo(() => {
    if (!selectedVersion || !liveVersion || selectedVersion.id === liveVersion.id) return false;
    const targetIdx = versions.findIndex(v => v.id === selectedVersion.id);
    const liveIdx = versions.findIndex(v => v.id === liveVersion.id);
    return targetIdx > liveIdx && liveIdx >= 0;
  }, [selectedVersion, liveVersion, versions]);

  const isAlreadyLive = Boolean(
    selectedVersion && liveVersion && selectedVersion.id === liveVersion.id
  );

  const targetState = useMemo<ModuleVersionSnapshotState>(() => {
    if (selectedVersion) return selectedVersion.snapshot;
    return getCurrentState();
  }, [selectedVersion, getCurrentState, isOpen]);

  const liveState = useMemo<ModuleVersionSnapshotState | null>(
    () => (liveVersion ? liveVersion.snapshot : null),
    [liveVersion]
  );

  // Compute structural diffs between Current Live and Target Version
  const diffs = useMemo<VersionFieldDiff[]>(() => {
    if (!liveState) return [];
    return versionControlService.computeDiff(liveState.layout || [], targetState.layout || [], {
      moduleName,
      softDeleteDropped
    });
  }, [liveState, targetState, moduleName, softDeleteDropped]);

  const sectionChanges = useMemo(
    () => versionControlService.computeSectionChanges(liveState, targetState),
    [liveState, targetState]
  );

  const overallRisk = useMemo<'safe' | 'warning' | 'critical'>(() => {
    if (diffs.some(d => d.riskLevel === 'critical')) return 'critical';
    if (diffs.some(d => d.riskLevel === 'warning')) return 'warning';
    return 'safe';
  }, [diffs]);

  const migrationSql = useMemo(() => {
    if (!liveState) return '-- Initial production release';
    if (isRollback) {
      return versionControlService.generateDownMigrationSql(
        liveState.layout || [],
        targetState.layout || [],
        moduleName
      );
    }
    return versionControlService.generateForwardMigrationSql(
      liveState.layout || [],
      targetState.layout || [],
      moduleName,
      moduleId,
      liveVersion?.versionTag || 'v1.0',
      targetVersionTag,
      softDeleteDropped
    );
  }, [liveState, targetState, isRollback, moduleName, moduleId, liveVersion, targetVersionTag, softDeleteDropped]);

  // Automatically generate AI release notes whenever target version changes
  const generateNotes = async () => {
    if (!isOpen) return;
    // If promoting a single saved version that is directly after live and already has AI notes, show them immediately while optionally refreshing
    if (selectedVersion && selectedVersion.aiGenerated && selectedVersion.commitSummary?.length && !isRollback) {
      setAiNotes({
        title: selectedVersion.name,
        summary: selectedVersion.commitSummary,
        releaseNotes: selectedVersion.description || selectedVersion.commitSummary.join(' '),
        aiGenerated: true
      });
    }

    setIsGeneratingNotes(true);
    try {
      const result = await versionControlService.generateAICommit({
        moduleId,
        moduleName,
        fromVersion: liveVersion?.versionTag || 'v1.0',
        toVersion: targetVersionTag,
        mode: 'release',
        diffs,
        sectionChanges,
        isRollback,
        rollbackTargetVersion: isRollback ? targetVersionTag : ''
      });
      setAiNotes(result);
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  useEffect(() => {
    if (!isOpen || isAlreadyLive) return;
    let cancelled = false;
    const run = async () => {
      setIsGeneratingNotes(true);
      const res = await versionControlService.generateAICommit({
        moduleId,
        moduleName,
        fromVersion: liveVersion?.versionTag || 'v1.0',
        toVersion: targetVersionTag,
        mode: 'release',
        diffs,
        sectionChanges,
        isRollback,
        rollbackTargetVersion: isRollback ? targetVersionTag : ''
      });
      if (!cancelled) {
        setAiNotes(res);
        setIsGeneratingNotes(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedOptionId, isAlreadyLive]);

  const calculateTargetDate = (): Date => {
    const now = new Date();
    if (schedulePreset === 'tonight') {
      const d = new Date(now);
      d.setHours(26, 0, 0, 0);
      return d;
    }
    if (schedulePreset === 'tomorrow') {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(4, 0, 0, 0);
      return d;
    }
    if (schedulePreset === 'weekend') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = (7 - day) % 7 || 7;
      d.setDate(d.getDate() + diff);
      d.setHours(1, 0, 0, 0);
      return d;
    }
    return new Date(customDateTime);
  };

  const handlePrimaryAction = async () => {
    if (isAlreadyLive) {
      onClose();
      return;
    }

    if (timing === 'schedule') {
      const targetDate = calculateTargetDate();
      if (isNaN(targetDate.getTime()) || targetDate.getTime() <= Date.now()) {
        toast.error('Please pick a future date and time');
        return;
      }

      let versionToSchedule = selectedVersion;
      if (!versionToSchedule) {
        versionToSchedule = await onSaveCurrentAsVersion();
        if (!versionToSchedule) return;
      }

      deploymentQueueService.scheduleDeployment({
        moduleId,
        moduleName,
        versionTag: versionToSchedule.versionTag,
        fromVersion: liveVersion?.versionTag || 'v1.0',
        riskLevel: overallRisk,
        changesCount: {
          added: diffs.filter(d => d.type === 'added').length,
          removed: diffs.filter(d => d.type === 'removed').length,
          modified: diffs.filter(d => d.type === 'modified').length,
          renamed: diffs.filter(d => d.type === 'renamed').length,
          total: diffs.length
        },
        generatedSql: migrationSql,
        scheduledAt: targetDate.toISOString(),
        maintenanceMode,
        notifyUsers,
        autoRollback,
        softDeleteDropped,
        createSnapshot: true,
        author: 'Admin'
      });

      toast.success(`Scheduled ${versionToSchedule.versionTag} for ${targetDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`);
      onClose();
      return;
    }

    // Immediate promotion
    setIsDeploying(true);
    try {
      let target = selectedVersion;
      if (!target) {
        target = await onSaveCurrentAsVersion();
        if (!target) {
          setIsDeploying(false);
          return;
        }
      }

      const releaseNotesText = aiNotes
        ? `${aiNotes.title}\n${aiNotes.summary.map(s => `• ${s}`).join('\n')}`
        : target.description || '';

      await onPromoteVersion(target, {
        softDeleteDropped,
        releaseNotes: releaseNotesText,
        isRollback
      });

      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to deploy version');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleRunScheduledNow = async (job: ScheduledDeployment) => {
    setRunningJobId(job.id);
    try {
      const matchingVersion = versions.find(v => v.versionTag === job.versionTag);
      await deploymentQueueService.executeDeploymentNow(job.id);
      if (matchingVersion) {
        await onPromoteVersion(matchingVersion, {
          softDeleteDropped: job.softDeleteDropped,
          releaseNotes: matchingVersion.description || '',
          isRollback: false
        });
      }
      toast.success(`Promoted ${job.versionTag} to production`);
    } catch {
      toast.error('Failed to execute scheduled deployment');
    } finally {
      setRunningJobId(null);
    }
  };

  const handleCancelScheduled = (jobId: string) => {
    deploymentQueueService.cancelDeployment(jobId);
    toast.success('Scheduled deployment cancelled');
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(migrationSql);
    setCopiedSql(true);
    toast.success('Migration SQL copied');
    setTimeout(() => setCopiedSql(false), 1800);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([migrationSql], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${moduleName.toLowerCase().replace(/\s+/g, '_')}_${targetVersionTag}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addedCount = diffs.filter(d => d.type === 'added').length;
  const modifiedCount = diffs.filter(d => d.type === 'modified' || d.type === 'renamed').length;
  const removedCount = diffs.filter(d => d.type === 'removed').length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Calm Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          />

          {/* Clean Single-Column Google-Style Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className={cn(
              "relative w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[88vh] z-10",
              isVersionPickerOpen ? "overflow-visible" : "overflow-hidden"
            )}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                    isRollback
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                  )}
                >
                  {isRollback ? <RotateCcw size={18} /> : <Rocket size={18} />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                    {isRollback ? 'Rollback Production Version' : 'Deploy to Production'}
                  </h3>
                  <p className="text-xs text-zinc-500 truncate">
                    {moduleName} &middot; Promote a saved version to the live workspace
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div
              className={cn(
                "flex-1 px-6 py-5 space-y-5 custom-scrollbar",
                isVersionPickerOpen ? "overflow-visible" : "overflow-y-auto"
              )}
            >
              {/* 1. Version Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Version to promote
                  </label>
                  {onViewAllVersions && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onViewAllVersions();
                      }}
                      className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      View full history
                    </button>
                  )}
                </div>

                {/* Custom Google-Style Version Picker Combobox */}
                <div className="relative" ref={versionPickerRef}>
                  <button
                    type="button"
                    onClick={() => setIsVersionPickerOpen(v => !v)}
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-zinc-950 text-left transition-all flex items-center justify-between gap-3 cursor-pointer",
                      isVersionPickerOpen
                        ? "border-indigo-500 ring-2 ring-indigo-500/20"
                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 shrink-0">
                        {selectedOptionId === CURRENT_DRAFT_OPTION
                          ? nextTagForUnsaved
                          : selectedVersion?.versionTag || 'v1.0'}
                      </span>
                      <span className="text-xs font-medium text-zinc-900 dark:text-white truncate">
                        {selectedOptionId === CURRENT_DRAFT_OPTION
                          ? 'Save current unsaved edits & promote'
                          : selectedVersion?.name || 'Select version'}
                      </span>
                      {selectedVersion?.isDeployed && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Live
                        </span>
                      )}
                      {selectedOptionId === CURRENT_DRAFT_OPTION && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                          New
                        </span>
                      )}
                    </div>
                    <ChevronDown
                      size={15}
                      className={cn(
                        "text-zinc-400 shrink-0 transition-transform duration-150",
                        isVersionPickerOpen && "rotate-180 text-indigo-500"
                      )}
                    />
                  </button>

                  <AnimatePresence>
                    {isVersionPickerOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.99 }}
                        transition={{ duration: 0.12 }}
                        className="absolute left-0 right-0 mt-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl py-1.5 z-50 max-h-64 overflow-y-auto custom-scrollbar"
                      >
                        {isDirty && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOptionId(CURRENT_DRAFT_OPTION);
                              setIsVersionPickerOpen(false);
                            }}
                            className={cn(
                              "w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer",
                              selectedOptionId === CURRENT_DRAFT_OPTION
                                ? "bg-indigo-50/70 dark:bg-indigo-500/10"
                                : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                            )}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                  {nextTagForUnsaved}
                                </span>
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                  Unsaved edits
                                </span>
                              </div>
                              <p className="text-xs text-zinc-700 dark:text-zinc-300 truncate mt-0.5">
                                Save current edits &amp; promote to production
                              </p>
                            </div>
                            {selectedOptionId === CURRENT_DRAFT_OPTION && (
                              <Check size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                            )}
                          </button>
                        )}

                        {versions.map(v => {
                          const isSelected = selectedOptionId === v.id;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => {
                                setSelectedOptionId(v.id);
                                setIsVersionPickerOpen(false);
                              }}
                              className={cn(
                                "w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer",
                                isSelected
                                  ? "bg-indigo-50/70 dark:bg-indigo-500/10"
                                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                              )}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-white">
                                    {v.versionTag}
                                  </span>
                                  {v.isDeployed ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      Live
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                                      Saved
                                    </span>
                                  )}
                                  <span className="text-[11px] text-zinc-400 ml-auto shrink-0">
                                    {new Date(v.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-600 dark:text-zinc-300 truncate mt-0.5">
                                  {v.name}
                                </p>
                              </div>
                              {isSelected && (
                                <Check size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Clean Live -> Target Transition Pill */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Live: {liveVersion?.versionTag || 'None'}
                    </span>
                    <ArrowRight size={13} className="text-zinc-400" />
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold",
                        isRollback
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                      )}
                    >
                      {isRollback ? 'Rollback:' : 'Target:'} {targetVersionTag}
                    </span>
                  </div>

                  {!isAlreadyLive && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
                        overallRisk === 'critical'
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          : overallRisk === 'warning'
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      )}
                    >
                      {overallRisk === 'critical' ? (
                        <ShieldAlert size={11} />
                      ) : overallRisk === 'warning' ? (
                        <AlertTriangle size={11} />
                      ) : (
                        <CheckCircle2 size={11} />
                      )}
                      {overallRisk === 'critical'
                        ? 'Breaking change'
                        : overallRisk === 'warning'
                        ? 'Review recommended'
                        : 'Safe to deploy'}
                    </span>
                  )}
                </div>
              </div>

              {/* 2. AI Release Notes & Diff Summary */}
              {isAlreadyLive ? (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50 p-4 flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                      {targetVersionTag} is already live in production
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Select a different saved version above to promote or roll back.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-200/70 dark:border-zinc-800/80 flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-indigo-500" />
                      <span>AI Release Summary</span>
                    </span>
                    <button
                      type="button"
                      onClick={generateNotes}
                      disabled={isGeneratingNotes}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw size={11} className={isGeneratingNotes ? 'animate-spin' : ''} />
                      <span>{isGeneratingNotes ? 'Writing...' : 'Rewrite'}</span>
                    </button>
                  </div>

                  <div className="p-4 space-y-3">
                    {isGeneratingNotes && !aiNotes ? (
                      <div className="space-y-2 animate-pulse">
                        <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3" />
                        <div className="h-3 bg-zinc-200/80 dark:bg-zinc-800/80 rounded w-full" />
                        <div className="h-3 bg-zinc-200/80 dark:bg-zinc-800/80 rounded w-5/6" />
                      </div>
                    ) : aiNotes ? (
                      <>
                        <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                          {aiNotes.title}
                        </p>
                        <ul className="space-y-1.5">
                          {aiNotes.summary.map((bullet, i) => (
                            <li key={i} className="text-xs text-zinc-600 dark:text-zinc-300 flex items-start gap-2 leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/70 mt-1.5 shrink-0" />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}

                    {/* Compact Change Counts + Expandable Diff List */}
                    <div className="pt-2 border-t border-zinc-200/70 dark:border-zinc-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                        {diffs.length === 0 ? (
                          <span>
                            {sectionChanges.length > 0
                              ? `Config changes: ${sectionChanges.join(', ')}`
                              : 'Configuration & layout update'}
                          </span>
                        ) : (
                          <>
                            {addedCount > 0 && (
                              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                +{addedCount} added
                              </span>
                            )}
                            {modifiedCount > 0 && (
                              <span className="font-medium text-amber-600 dark:text-amber-400">
                                ~{modifiedCount} modified
                              </span>
                            )}
                            {removedCount > 0 && (
                              <span className="font-medium text-rose-600 dark:text-rose-400">
                                -{removedCount} removed
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {diffs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowChangesList(v => !v)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                        >
                          <span>{showChangesList ? 'Hide fields' : `Inspect ${diffs.length} fields`}</span>
                          {showChangesList ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>
                      )}
                    </div>

                    {showChangesList && diffs.length > 0 && (
                      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800 max-h-44 overflow-y-auto">
                        {diffs.map((d, i) => (
                          <div key={`${d.fieldId}-${i}`} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={cn(
                                  "w-4 h-4 rounded flex items-center justify-center shrink-0",
                                  d.type === 'added'
                                    ? "bg-emerald-500/10 text-emerald-600"
                                    : d.type === 'removed'
                                    ? "bg-rose-500/10 text-rose-600"
                                    : "bg-amber-500/10 text-amber-600"
                                )}
                              >
                                {d.type === 'added' ? <Plus size={10} /> : d.type === 'removed' ? <Minus size={10} /> : <Pencil size={9} />}
                              </span>
                              <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{d.fieldLabel}</span>
                              <code className="text-[10px] font-mono text-zinc-400 truncate">{d.fieldName}</code>
                            </div>
                            <span className="text-[11px] text-zinc-400 shrink-0">{d.details}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. Deploy Timing (Segmented Control) */}
              {!isAlreadyLive && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80">
                    <button
                      type="button"
                      onClick={() => setTiming('now')}
                      className={cn(
                        "py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                        timing === 'now'
                          ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      )}
                    >
                      <Rocket size={13} />
                      <span>Deploy now</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTiming('schedule')}
                      className={cn(
                        "py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                        timing === 'schedule'
                          ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      )}
                    >
                      <Calendar size={13} />
                      <span>Schedule</span>
                    </button>
                  </div>

                  {timing === 'schedule' && (
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3.5 space-y-3 bg-zinc-50/50 dark:bg-zinc-950/30">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {[
                          { id: 'tonight', label: 'Tonight 2 AM' },
                          { id: 'tomorrow', label: 'Tomorrow 4 AM' },
                          { id: 'weekend', label: 'Weekend' },
                          { id: 'custom', label: 'Custom' }
                        ].map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSchedulePreset(p.id as any)}
                            className={cn(
                              "px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer",
                              schedulePreset === p.id
                                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
                                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                            )}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>

                      {schedulePreset === 'custom' && (
                        <input
                          type="datetime-local"
                          value={customDateTime}
                          onChange={e => setCustomDateTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white"
                        />
                      )}

                      <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                        <Clock size={12} className="text-indigo-500" />
                        <span>
                          Scheduled for{' '}
                          <strong className="text-zinc-700 dark:text-zinc-300">
                            {calculateTargetDate().toLocaleString([], {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </strong>
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Active Scheduled Deployments (Inline — No Separate Drawer Needed) */}
              {scheduledJobs.length > 0 && (
                <div className="rounded-xl border border-indigo-200/70 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 p-3.5 space-y-2.5">
                  <div className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                    <Clock size={12} />
                    <span>Scheduled deployments ({scheduledJobs.length})</span>
                  </div>
                  <div className="space-y-2">
                    {scheduledJobs.map(job => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between gap-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200/80 dark:border-zinc-800 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-white">
                              {job.versionTag}
                            </span>
                            <span className="text-[11px] text-zinc-500 truncate">
                              {new Date(job.scheduledAt).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRunScheduledNow(job)}
                            disabled={runningJobId === job.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium cursor-pointer disabled:opacity-50"
                          >
                            <Play size={10} />
                            <span>Run now</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelScheduled(job.id)}
                            className="px-2 py-1 rounded-md text-[11px] font-medium text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Advanced Options (Collapsed by default — Zero Clutter) */}
              {!isAlreadyLive && (
                <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(v => !v)}
                    className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    {showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <SlidersHorizontal size={12} />
                    <span>Advanced options &amp; SQL</span>
                  </button>

                  {showAdvanced && (
                    <div className="mt-3 space-y-3.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                          <input
                            type="checkbox"
                            checked={softDeleteDropped}
                            onChange={e => setSoftDeleteDropped(e.target.checked)}
                            className="mt-0.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">Archive removed columns</div>
                            <div className="text-[11px] text-zinc-500">Keep data safe with _deprecated_ prefix</div>
                          </div>
                        </label>

                        <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                          <input
                            type="checkbox"
                            checked={autoRollback}
                            onChange={e => setAutoRollback(e.target.checked)}
                            className="mt-0.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">Auto-rollback on error</div>
                            <div className="text-[11px] text-zinc-500">Revert atomically if migration fails</div>
                          </div>
                        </label>

                        <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                          <input
                            type="checkbox"
                            checked={maintenanceMode}
                            onChange={e => setMaintenanceMode(e.target.checked)}
                            className="mt-0.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">Maintenance lock</div>
                            <div className="text-[11px] text-zinc-500">Pause writes briefly during update</div>
                          </div>
                        </label>

                        <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                          <input
                            type="checkbox"
                            checked={notifyUsers}
                            onChange={e => setNotifyUsers(e.target.checked)}
                            className="mt-0.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200">Notify workspace</div>
                            <div className="text-[11px] text-zinc-500">Alert admins when release goes live</div>
                          </div>
                        </label>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-zinc-500">Generated PostgreSQL DDL</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={handleCopySql}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                            >
                              {copiedSql ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                              <span>{copiedSql ? 'Copied' : 'Copy'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleDownloadSql}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                            >
                              <Download size={11} />
                              <span>.sql</span>
                            </button>
                          </div>
                        </div>
                        <pre className="p-3 rounded-xl bg-zinc-950 text-zinc-200 font-mono text-[11px] overflow-x-auto max-h-40 leading-relaxed border border-zinc-800">
                          {migrationSql}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeploying}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {!isAlreadyLive && (
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  disabled={isDeploying}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors shadow-xs disabled:opacity-50 cursor-pointer",
                    isRollback
                      ? "bg-amber-500 hover:bg-amber-400 text-zinc-950"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white"
                  )}
                >
                  {isDeploying ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Promoting...</span>
                    </>
                  ) : timing === 'schedule' ? (
                    <>
                      <Calendar size={13} />
                      <span>Schedule {targetVersionTag}</span>
                    </>
                  ) : isRollback ? (
                    <>
                      <RotateCcw size={13} />
                      <span>Rollback Live to {targetVersionTag}</span>
                    </>
                  ) : (
                    <>
                      <Rocket size={13} />
                      <span>Promote {targetVersionTag} to Production</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
