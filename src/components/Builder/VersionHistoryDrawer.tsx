import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  History,
  FileText, 
  RotateCcw, 
  CheckCircle2, 
  GitCommit, 
  GitBranch, 
  FileCode, 
  Copy, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  AlertTriangle, 
  Sparkles, 
  Layers, 
  Tag, 
  Clock, 
  User, 
  Terminal,
  ShieldAlert,
  ArrowRight,
  Check,
  Eye
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { Field } from '../../types/versionControl';
import { ModuleVersionSnapshot, ModuleVersionSnapshotState, VersionFieldDiff } from '../../types/versionControl';
import { versionControlService } from '../../utils/versionControlService';

interface VersionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId: string;
  moduleName: string;
  currentVersionTag: string;
  currentFields: Field[];
  getCurrentState: () => ModuleVersionSnapshotState;
  onRollbackApplied: (restoredState: ModuleVersionSnapshotState, newVersionTag: string) => Promise<void> | void;
}

export const VersionHistoryDrawer: React.FC<VersionHistoryDrawerProps> = ({
  isOpen,
  onClose,
  moduleId,
  moduleName,
  currentVersionTag,
  currentFields,
  getCurrentState,
  onRollbackApplied
}) => {
  const [versions, setVersions] = useState<ModuleVersionSnapshot[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'notes' | 'diff' | 'sql' | 'ast'>('notes');
  
  // Checkpoint creation modal
  const [isCreatingCheckpoint, setIsCreatingCheckpoint] = useState(false);
  const [checkpointTag, setCheckpointTag] = useState('');
  const [checkpointName, setCheckpointName] = useState('');
  const [checkpointDesc, setCheckpointDesc] = useState('');

  // Rollback confirmation modal
  const [rollbackTarget, setRollbackTarget] = useState<ModuleVersionSnapshot | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);

  // Load and subscribe to version history
  useEffect(() => {
    if (!moduleId) return;
    const refresh = () => {
      const list = versionControlService.getVersions(moduleId);
      setVersions(list);
      if (list.length > 0 && !selectedVersionId) {
        setSelectedVersionId(list[0].id);
      }
    };

    refresh();
    const unsubscribe = versionControlService.subscribe(refresh);
    return () => unsubscribe();
  }, [moduleId, isOpen]);

  const selectedVersion = useMemo(() => {
    return versions.find(v => v.id === selectedVersionId) || versions[0] || null;
  }, [versions, selectedVersionId]);

  // Compute visual diff between selected historical snapshot and current live canvas
  const visualDiffs = useMemo<VersionFieldDiff[]>(() => {
    if (!selectedVersion) return [];
    return versionControlService.computeDiff(currentFields, selectedVersion.snapshot.layout);
  }, [selectedVersion, currentFields]);

  // Generate down-migration SQL for rollback preview
  const rollbackSqlPreview = useMemo(() => {
    if (!rollbackTarget) return '';
    return versionControlService.generateDownMigrationSql(
      currentFields,
      rollbackTarget.snapshot.layout,
      moduleName
    );
  }, [rollbackTarget, currentFields, moduleName]);

  const handleCreateCheckpoint = () => {
    if (!checkpointName.trim()) {
      toast.error('Please provide a release title or checkpoint name');
      return;
    }

    const state = getCurrentState();
    const tag = checkpointTag.trim() || `v${currentVersionTag}`;

    versionControlService.createSnapshot({
      moduleId,
      moduleName,
      versionTag: tag,
      name: checkpointName.trim(),
      description: checkpointDesc.trim() || 'Manual checkpoint created by developer',
      author: 'Current Developer',
      isDeployed: true,
      state,
      previousFields: currentFields
    });

    toast.success(`Checkpoint ${tag} ("${checkpointName}") saved!`);
    setIsCreatingCheckpoint(false);
    setCheckpointTag('');
    setCheckpointName('');
    setCheckpointDesc('');
  };

  const handleExecuteRollback = async () => {
    if (!rollbackTarget) return;
    setIsRollingBack(true);
    toast.loading(`Rolling back schema to ${rollbackTarget.versionTag}...`, { id: 'exec-rollback' });

    try {
      const currentState = getCurrentState();
      const res = versionControlService.rollbackToVersion(
        moduleId,
        rollbackTarget.id,
        currentState,
        currentVersionTag,
        'System Administrator'
      );

      if (res) {
        await onRollbackApplied(res.restoredSnapshot, res.newVersion.versionTag);
        toast.success(`Successfully rolled back to ${rollbackTarget.versionTag}! Checkpoint ${res.newVersion.versionTag} created.`, { id: 'exec-rollback' });
        setRollbackTarget(null);
        onClose();
      } else {
        toast.error('Failed to execute rollback pipeline', { id: 'exec-rollback' });
      }
    } catch (e: any) {
      toast.error(`Rollback failed: ${e?.message || 'Unknown error'}`, { id: 'exec-rollback' });
    } finally {
      setIsRollingBack(false);
    }
  };

  const handleDeleteSnapshot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    versionControlService.deleteVersion(id);
    toast.success('Version snapshot deleted');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Slide-over Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="absolute inset-y-0 right-0 max-w-4xl w-full bg-white dark:bg-zinc-900 shadow-2xl border-l border-zinc-200 dark:border-zinc-800 flex flex-col z-10"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center border border-indigo-500/20">
                  <History size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                      Version Control & Rollback History
                    </h3>
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                      Active: {currentVersionTag.startsWith('v') ? currentVersionTag : `v${currentVersionTag}`}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {moduleName} &bull; Browse immutable release snapshots, compare visual diffs, and restore prior states
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCreatingCheckpoint(true)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Tag Checkpoint</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Split View Body */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Column: Version Timeline */}
              <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto p-4 space-y-2.5 bg-zinc-50/40 dark:bg-zinc-900/30">
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-2 pb-1 flex items-center justify-between">
                  <span>Releases ({versions.length})</span>
                  <span>Timeline</span>
                </div>

                {versions.length === 0 ? (
                  <div className="text-center py-10 px-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <History size={24} className="mx-auto text-zinc-400 mb-2" />
                    <p className="text-xs text-zinc-500">No version snapshots found</p>
                  </div>
                ) : (
                  versions.map((ver, idx) => {
                    const isSelected = selectedVersion?.id === ver.id;
                    const isCurrent = ver.versionTag.replace('v', '') === currentVersionTag.replace('v', '');

                    return (
                      <div
                        key={ver.id}
                        onClick={() => setSelectedVersionId(ver.id)}
                        className={cn(
                          "p-3.5 rounded-2xl border transition-all cursor-pointer relative group",
                          isSelected
                            ? "bg-white dark:bg-zinc-800/90 border-indigo-500/40 shadow-sm"
                            : "bg-white/60 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                                {ver.versionTag}
                              </span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  LIVE
                                </span>
                              )}
                              {ver.isRollback && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-0.5">
                                  <RotateCcw size={9} /> REVERT
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[180px]">
                              {ver.name}
                            </h4>
                          </div>

                          {idx > 0 && !isCurrent && (
                            <button
                              onClick={(e) => handleDeleteSnapshot(ver.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-500 transition-opacity"
                              title="Delete snapshot"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-2 mt-1 border-t border-zinc-100 dark:border-zinc-800">
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(ver.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="font-medium text-zinc-500">
                            {ver.snapshot.layout.length} fields
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right Column: Selected Version Inspector & Visual Diff */}
              <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-900">
                {selectedVersion ? (
                  <>
                    {/* Selected Version Meta Bar */}
                    <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                              {selectedVersion.versionTag}
                            </span>
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                              {selectedVersion.name}
                            </h3>
                          </div>
                          {selectedVersion.description && (
                            <p className="text-xs text-zinc-500 mt-1">
                              {selectedVersion.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-zinc-400 mt-2">
                            <span className="flex items-center gap-1">
                              <User size={12} /> {selectedVersion.author}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={12} /> {new Date(selectedVersion.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => setRollbackTarget(selectedVersion)}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 shrink-0"
                        >
                          <RotateCcw size={14} />
                          <span>Rollback to this Version</span>
                        </button>
                      </div>

                      {/* Inspector Sub-Tabs */}
                      <div className="flex items-center gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                        <button
                          onClick={() => setInspectorTab('notes')}
                          className={cn(
                            "px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
                            inspectorTab === 'notes'
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          )}
                        >
                          <FileText size={13} />
                          <span>Release Notes</span>
                        </button>
                        <button
                          onClick={() => setInspectorTab('diff')}
                          className={cn(
                            "px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
                            inspectorTab === 'diff'
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          )}
                        >
                          <Layers size={13} />
                          <span>Visual Diff vs Live Canvas ({visualDiffs.length})</span>
                        </button>
                        <button
                          onClick={() => setInspectorTab('sql')}
                          className={cn(
                            "px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
                            inspectorTab === 'sql'
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          )}
                        >
                          <FileCode size={13} />
                          <span>DDL Script</span>
                        </button>
                        <button
                          onClick={() => setInspectorTab('ast')}
                          className={cn(
                            "px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
                            inspectorTab === 'ast'
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          )}
                        >
                          <Terminal size={13} />
                          <span>Raw State AST</span>
                        </button>
                      </div>
                    </div>

                    {/* Inspector Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                      {inspectorTab === 'notes' && (
                        <div className="space-y-4">
                          <div className="p-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
                              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                                <FileText size={14} />
                                <span>Changelog & Release Notes</span>
                              </span>
                              <button
                                onClick={() => {
                                  if (selectedVersion.description) {
                                    navigator.clipboard.writeText(selectedVersion.description);
                                    toast.success('Release notes copied to clipboard');
                                  }
                                }}
                                className="px-2.5 py-1 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-900 transition-colors flex items-center gap-1"
                              >
                                <Copy size={12} />
                                <span>Copy</span>
                              </button>
                            </div>

                            <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed font-sans whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
                              {selectedVersion.description || 'No detailed release notes recorded for this baseline snapshot.'}
                            </div>
                          </div>
                        </div>
                      )}

                      {inspectorTab === 'diff' && (
                        <div className="space-y-3">
                          {visualDiffs.length === 0 ? (
                            <div className="text-center py-12 px-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                              <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                              <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Identical to Live Canvas</h4>
                              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                                The layout and fields in snapshot {selectedVersion.versionTag} match the active canvas state.
                              </p>
                            </div>
                          ) : (
                            visualDiffs.map((diff, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "p-3.5 rounded-xl border text-xs space-y-1.5",
                                  diff.type === 'added' ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40" :
                                  diff.type === 'removed' ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40" :
                                  "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className={cn(
                                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                      diff.type === 'added' ? "bg-emerald-500 text-white" :
                                      diff.type === 'removed' ? "bg-rose-500 text-white" :
                                      "bg-amber-500 text-white"
                                    )}>
                                      {diff.type === 'added' ? 'Present in Snapshot' : diff.type === 'removed' ? 'Missing in Snapshot' : 'Modified'}
                                    </span>
                                    <span className="font-bold text-zinc-900 dark:text-white">
                                      {diff.fieldLabel}
                                    </span>
                                    <code className="text-[11px] font-mono text-zinc-500">
                                      {diff.fieldName}
                                    </code>
                                  </div>
                                </div>
                                {diff.details && (
                                  <p className="text-zinc-600 dark:text-zinc-400">
                                    {diff.details}
                                  </p>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {inspectorTab === 'sql' && (
                        <div className="space-y-2">
                          <pre className="p-4 bg-zinc-950 text-emerald-400 font-mono text-xs rounded-2xl border border-zinc-800 overflow-x-auto max-h-96 leading-relaxed">
                            {selectedVersion.migrationSql || '-- Initial release baseline (no forward DDL logged)'}
                          </pre>
                        </div>
                      )}

                      {inspectorTab === 'ast' && (
                        <div className="space-y-2">
                          <pre className="p-4 bg-zinc-950 text-indigo-300 font-mono text-xs rounded-2xl border border-zinc-800 overflow-x-auto max-h-96 leading-relaxed">
                            {JSON.stringify(selectedVersion.snapshot, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center p-6 text-zinc-400">
                    Select a version to inspect
                  </div>
                )}
              </div>
            </div>

            {/* Checkpoint Tagging Modal */}
            {isCreatingCheckpoint && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Tag size={16} className="text-indigo-600" />
                      Tag Release Checkpoint
                    </h3>
                    <button
                      onClick={() => setIsCreatingCheckpoint(false)}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Release Version Tag
                      </label>
                      <input
                        type="text"
                        placeholder="v1.2 (or custom tag)"
                        value={checkpointTag}
                        onChange={(e) => setCheckpointTag(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Checkpoint Title *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Pre-Q3 Billing Restructure"
                        value={checkpointName}
                        onChange={(e) => setCheckpointName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                        Release Notes / Commit Message
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Describe what changes were made in this milestone..."
                        value={checkpointDesc}
                        onChange={(e) => setCheckpointDesc(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setIsCreatingCheckpoint(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateCheckpoint}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20"
                    >
                      Save Immutable Checkpoint
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Rollback Confirmation Modal */}
            {rollbackTarget && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4"
                >
                  <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shrink-0">
                      <RotateCcw size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                        Confirm Rollback to {rollbackTarget.versionTag}
                      </h3>
                      <p className="text-xs text-zinc-500">
                        Restores module canvas AST and applies compensating PostgreSQL down-migration
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-800 dark:text-amber-300 space-y-2">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle size={14} />
                      Safe Compensating Rollback Policy:
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                      <li>Restores {rollbackTarget.snapshot.layout.length} fields matching snapshot <span className="font-bold text-zinc-900 dark:text-white">{rollbackTarget.name}</span>.</li>
                      <li>Any newly added columns will be safely archived with prefix <code className="text-indigo-500 font-mono">_deprecated_*</code>.</li>
                      <li>Creates a new rollback release entry to preserve audit continuity.</li>
                    </ul>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                      Compensating Down-Migration DDL
                    </label>
                    <pre className="p-3 bg-zinc-950 text-emerald-400 font-mono text-[11px] rounded-xl border border-zinc-800 max-h-32 overflow-y-auto leading-relaxed">
                      {rollbackSqlPreview}
                    </pre>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      onClick={() => setRollbackTarget(null)}
                      disabled={isRollingBack}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleExecuteRollback}
                      disabled={isRollingBack}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-zinc-950 bg-amber-400 hover:bg-amber-300 transition-all shadow-lg shadow-amber-400/20 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isRollingBack ? (
                        <>
                          <RotateCcw size={14} className="animate-spin" />
                          <span>Restoring Snapshot...</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw size={14} />
                          <span>Execute Rollback & Restore AST</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
