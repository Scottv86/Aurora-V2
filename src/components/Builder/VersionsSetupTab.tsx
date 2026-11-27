import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Rocket,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  RefreshCw,
  FileCode,
  Layers,
  Plus,
  Minus,
  Pencil,
  Trash2,
  ArrowUpRight,
  Download,
  Search,
  X
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { ModuleVersionSnapshot, ModuleVersionSnapshotState, VersionFieldDiff } from '../../types/versionControl';
import { versionControlService, countSchemaFields } from '../../utils/versionControlService';
import { usePlatform } from '../../hooks/usePlatform';
import { UserAvatarWithPresence, UserProfileTrigger } from '../Common/UserPresenceBadge';

interface VersionsSetupTabProps {
  moduleId: string;
  moduleName: string;
  isDirty: boolean;
  onSaveNewVersion: () => void;
  onOpenDeployModal: (targetVersionId?: string) => void;
  onRestoreToDraft: (snapshot: ModuleVersionSnapshotState, version: ModuleVersionSnapshot) => Promise<void> | void;
  hidePageHeader?: boolean;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export const VersionsSetupTab: React.FC<VersionsSetupTabProps> = ({
  moduleId,
  moduleName,
  isDirty,
  onSaveNewVersion,
  onOpenDeployModal,
  onRestoreToDraft,
  hidePageHeader = false
}) => {
  const { members = [] } = usePlatform();
  const [versions, setVersions] = useState<ModuleVersionSnapshot[]>([]);

  const resolveAuthorMember = (ver: ModuleVersionSnapshot): any | null => {
    if (!members || members.length === 0) return null;
    if (ver.authorId) {
      const byId = members.find((m: any) => m.id === ver.authorId || m.userId === ver.authorId);
      if (byId) return byId;
    }
    const raw = String(ver.author || '').trim().toLowerCase();
    if (!raw || raw === 'system') return null;
    return (
      members.find((m: any) => {
        const name = String(m.name || '').trim().toLowerCase();
        const email = String(m.email || '').trim().toLowerCase();
        const emailPrefix = email.includes('@') ? email.split('@')[0] : '';
        return name === raw || email === raw || (emailPrefix && emailPrefix === raw);
      }) || null
    );
  };
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [techTab, setTechTab] = useState<'sql' | 'json'>('sql');
  const [copiedTech, setCopiedTech] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'drafts' | 'rollbacks'>('all');

  useEffect(() => {
    if (!moduleId) return;
    const refresh = () => {
      const list = versionControlService.getVersions(moduleId);
      setVersions(list);
      setSelectedId(prev => {
        if (prev && list.some(v => v.id === prev)) return prev;
        return list[0]?.id || null;
      });
    };
    refresh();
    return versionControlService.subscribe(refresh);
  }, [moduleId]);

  const liveVersion = useMemo(
    () => versions.find(v => v.isDeployed) || null,
    [versions]
  );

  const latestVersion = versions[0] || null;

  const selectedVersion = useMemo(
    () => versions.find(v => v.id === selectedId) || versions[0] || null,
    [versions, selectedId]
  );

  const selectedIndex = useMemo(
    () => (selectedVersion ? versions.findIndex(v => v.id === selectedVersion.id) : -1),
    [versions, selectedVersion]
  );

  const previousVersion = useMemo(() => {
    if (selectedIndex < 0 || selectedIndex >= versions.length - 1) return null;
    return versions[selectedIndex + 1];
  }, [versions, selectedIndex]);

  const liveIndex = useMemo(
    () => (liveVersion ? versions.findIndex(v => v.id === liveVersion.id) : -1),
    [versions, liveVersion]
  );

  const isSelectedOlderThanLive = useMemo(() => {
    if (!selectedVersion || !liveVersion || selectedVersion.id === liveVersion.id) return false;
    return selectedIndex > liveIndex && liveIndex >= 0;
  }, [selectedVersion, liveVersion, selectedIndex, liveIndex]);

  // Diff between selected version and its predecessor (what this commit changed)
  const commitDiffs = useMemo<VersionFieldDiff[]>(() => {
    if (!selectedVersion || !previousVersion) return [];
    return versionControlService.computeDiff(
      previousVersion.snapshot.layout || [],
      selectedVersion.snapshot.layout || [],
      { moduleName }
    );
  }, [selectedVersion, previousVersion, moduleName]);

  const hasUnpublishedVersions = Boolean(
    latestVersion && (!liveVersion || latestVersion.id !== liveVersion.id)
  );

  const filteredVersions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return versions.filter(v => {
      if (statusFilter === 'live' && !v.isDeployed) return false;
      if (statusFilter === 'drafts' && v.isDeployed) return false;
      if (statusFilter === 'rollbacks' && !v.isRollback) return false;
      if (!q) return true;
      const haystack = [
        v.versionTag,
        v.name,
        v.description || '',
        v.author || '',
        ...(v.commitSummary || []),
        ...(v.sectionChanges || [])
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [versions, searchQuery, statusFilter]);

  const handleRegenerateAI = async (ver: ModuleVersionSnapshot) => {
    const idx = versions.findIndex(v => v.id === ver.id);
    const prev = idx >= 0 && idx < versions.length - 1 ? versions[idx + 1] : null;
    const diffs = prev
      ? versionControlService.computeDiff(prev.snapshot.layout || [], ver.snapshot.layout || [], { moduleName })
      : [];
    const sectionChanges = prev
      ? versionControlService.computeSectionChanges(prev.snapshot, ver.snapshot)
      : [];

    setRegeneratingId(ver.id);
    try {
      const result = await versionControlService.generateAICommit({
        moduleId,
        moduleName,
        fromVersion: prev?.versionTag || 'v1.0',
        toVersion: ver.versionTag,
        mode: 'commit',
        diffs,
        sectionChanges,
        isRollback: ver.isRollback,
        rollbackTargetVersion: ver.rollbackTargetVersion
      });
      versionControlService.updateSnapshot(ver.id, {
        name: result.title,
        description: result.releaseNotes,
        commitSummary: result.summary,
        aiGenerated: result.aiGenerated,
        isGeneratingAI: false
      });
      toast.success('Commit notes updated by AI');
    } catch {
      toast.error('Could not regenerate commit notes');
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleRestoreDraftClick = async (ver: ModuleVersionSnapshot) => {
    setRestoringId(ver.id);
    try {
      await onRestoreToDraft(JSON.parse(JSON.stringify(ver.snapshot)), ver);
      toast.success(`Loaded ${ver.versionTag} into your working draft`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to restore draft');
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeleteVersion = (ver: ModuleVersionSnapshot, e: React.MouseEvent) => {
    e.stopPropagation();
    if (ver.isDeployed) {
      toast.error('Cannot delete the live production version');
      return;
    }
    versionControlService.deleteVersion(ver.id);
    toast.success(`Removed ${ver.versionTag} from history`);
  };

  const technicalSql = useMemo(() => {
    if (!selectedVersion) return '';
    if (selectedVersion.migrationSql) return selectedVersion.migrationSql;
    if (previousVersion) {
      return versionControlService.generateForwardMigrationSql(
        previousVersion.snapshot.layout || [],
        selectedVersion.snapshot.layout || [],
        moduleName,
        moduleId,
        previousVersion.versionTag,
        selectedVersion.versionTag
      );
    }
    return '-- Initial baseline snapshot (no structural migration DDL)';
  }, [selectedVersion, previousVersion, moduleName, moduleId]);

  const handleCopyTechnical = () => {
    const text = techTab === 'sql' ? technicalSql : JSON.stringify(selectedVersion?.snapshot || {}, null, 2);
    navigator.clipboard.writeText(text);
    setCopiedTech(true);
    toast.success(techTab === 'sql' ? 'SQL copied to clipboard' : 'Schema JSON copied to clipboard');
    setTimeout(() => setCopiedTech(false), 1800);
  };

  return (
    <div
      className={cn(
        'flex-1 min-h-0 flex flex-col',
        hidePageHeader ? 'overflow-hidden p-5' : 'overflow-y-auto p-6 lg:p-8 custom-scrollbar'
      )}
    >
      <div
        className={cn(
          'mx-auto flex flex-col',
          hidePageHeader ? 'w-full flex-1 min-h-0 gap-4' : 'max-w-6xl w-full space-y-5 pb-16'
        )}
      >
        {/* Page Header */}
        {!hidePageHeader && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Versions & Releases</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Every save creates an immutable draft version with AI-written commit notes. Promote any version to update the live workspace.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onSaveNewVersion}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>Save Version</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenDeployModal(latestVersion?.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
              >
                <Rocket size={13} />
                <span>Deploy to Production</span>
              </button>
            </div>
          </div>
        )}

        {/* Status Summary Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 shrink-0">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-500">Live in Workspace</span>
                  {liveVersion && (
                    <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                      {liveVersion.versionTag}
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium text-zinc-900 dark:text-white truncate mt-0.5">
                  {liveVersion ? liveVersion.name : 'Not yet deployed'}
                </p>
              </div>
            </div>
            {liveVersion?.deployedAt && (
              <span className="text-[11px] text-zinc-400 shrink-0">
                {formatRelativeTime(liveVersion.deployedAt)}
              </span>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                hasUnpublishedVersions || isDirty
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
              )}>
                <History size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-500">Latest Saved Version</span>
                  {latestVersion && (
                    <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {latestVersion.versionTag}
                    </span>
                  )}
                  {hasUnpublishedVersions && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
                      Ready to promote
                    </span>
                  )}
                  {isDirty && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      Unsaved edits
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium text-zinc-900 dark:text-white truncate mt-0.5">
                  {latestVersion ? latestVersion.name : 'Save your first version to begin history'}
                </p>
              </div>
            </div>
            {hasUnpublishedVersions && latestVersion && (
              <button
                type="button"
                onClick={() => onOpenDeployModal(latestVersion.id)}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 cursor-pointer"
              >
                <span>Promote</span>
                <ArrowUpRight size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Main Split Card: Timeline + Inspector */}
        {versions.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl py-16 px-6 text-center">
            <History size={28} className="mx-auto text-zinc-400 mb-3" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">No saved versions yet</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
              Click Save in the header to capture your first version. AI will automatically write the commit summary.
            </p>
            <button
              type="button"
              onClick={onSaveNewVersion}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Save Initial Version</span>
            </button>
          </div>
        ) : (
          <div
            className={cn(
              'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12',
              hidePageHeader ? 'flex-1 min-h-0' : 'min-h-[480px]'
            )}
          >
            {/* Left Column: Chronological Version List */}
            <div className="lg:col-span-5 xl:col-span-4 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 flex flex-col min-h-0 overflow-hidden">
              <div className="p-3.5 border-b border-zinc-100 dark:border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Version History ({filteredVersions.length}{filteredVersions.length !== versions.length ? ` of ${versions.length}` : ''})
                  </span>
                  <span className="text-[11px] text-zinc-400">Newest first</span>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search versions, commits, authors..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 flex-wrap">
                  {(
                    [
                      { id: 'all', label: 'All' },
                      { id: 'live', label: 'Live' },
                      { id: 'drafts', label: 'Drafts' },
                      { id: 'rollbacks', label: 'Rollbacks' }
                    ] as const
                  ).map(pill => (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setStatusFilter(pill.id)}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer',
                        statusFilter === pill.id
                          ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      )}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className={cn(
                  'divide-y divide-zinc-100 dark:divide-zinc-800/80 overflow-y-auto custom-scrollbar',
                  hidePageHeader ? 'flex-1 min-h-0' : 'max-h-[68vh]'
                )}
              >
                {filteredVersions.length === 0 ? (
                  <div className="py-10 px-4 text-center space-y-2">
                    <p className="text-xs text-zinc-500">No versions match your filter.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                      }}
                      className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Clear search &amp; filters
                    </button>
                  </div>
                ) : (
                  filteredVersions.map(ver => {
                  const isSelected = selectedVersion?.id === ver.id;
                  return (
                    <div
                      key={ver.id}
                      onClick={() => {
                        setSelectedId(ver.id);
                        setShowTechnicalDetails(false);
                      }}
                      className={cn(
                        "px-4 py-3.5 cursor-pointer transition-colors relative group",
                        isSelected
                          ? "bg-indigo-50/60 dark:bg-indigo-500/10"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      )}
                    >
                      {isSelected && (
                        <div className="absolute left-0 inset-y-0 w-0.5 bg-indigo-600 dark:bg-indigo-400" />
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-white">
                            {ver.versionTag}
                          </span>
                          {ver.isDeployed ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Live
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                              Saved
                            </span>
                          )}
                          {ver.isRollback && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400">
                              <RotateCcw size={9} />
                              Rollback
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[11px] text-zinc-400">
                            {formatRelativeTime(ver.createdAt)}
                          </span>
                          {!ver.isDeployed && versions.length > 1 && (
                            <button
                              type="button"
                              onClick={e => handleDeleteVersion(ver, e)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-400 hover:text-rose-500 transition-opacity"
                              title="Delete saved version"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 mt-1.5 line-clamp-1">
                        {ver.isGeneratingAI ? (
                          <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                            <Sparkles size={11} className="animate-pulse" />
                            Writing AI commit summary...
                          </span>
                        ) : (
                          ver.name
                        )}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1.5">
                        {(() => {
                          const authorMember = resolveAuthorMember(ver);
                          if (!authorMember) {
                            return <span className="truncate">{ver.author}</span>;
                          }
                          return (
                            <UserProfileTrigger
                              memberId={authorMember.id}
                              userId={authorMember.userId || authorMember.id}
                              name={authorMember.name}
                              avatarUrl={authorMember.avatarUrl}
                              status={authorMember.status}
                              className="inline-flex items-center gap-1.5 min-w-0 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                            >
                              <UserAvatarWithPresence
                                avatarUrl={authorMember.avatarUrl}
                                name={authorMember.name}
                                status={authorMember.status}
                                size="xs"
                              />
                              <span className="truncate font-medium text-zinc-600 dark:text-zinc-300">
                                {authorMember.name}
                              </span>
                            </UserProfileTrigger>
                          );
                        })()}
                        {ver.changesSummary && ver.changesSummary.total > 0 && (
                          <span className="font-mono text-[10px] flex items-center gap-1.5 shrink-0">
                            {ver.changesSummary.added > 0 && (
                              <span className="text-emerald-600 dark:text-emerald-400">+{ver.changesSummary.added}</span>
                            )}
                            {ver.changesSummary.modified > 0 && (
                              <span className="text-amber-600 dark:text-amber-400">~{ver.changesSummary.modified}</span>
                            )}
                            {ver.changesSummary.removed > 0 && (
                              <span className="text-rose-600 dark:text-rose-400">-{ver.changesSummary.removed}</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }))}
              </div>
            </div>

            {/* Right Column: Selected Version Details */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col min-h-0 overflow-hidden">
              {selectedVersion ? (
                <div
                  className={cn(
                    'p-6 lg:p-7 space-y-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar',
                    !hidePageHeader && 'max-h-[72vh]'
                  )}
                >
                  {/* Top Title & Action Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-white">
                          {selectedVersion.versionTag}
                        </span>
                        {selectedVersion.isDeployed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Live in Production
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            Saved Draft
                          </span>
                        )}
                        {selectedVersion.aiGenerated && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <Sparkles size={10} />
                            AI Commit
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                        {selectedVersion.name}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        {(() => {
                          const authorMember = resolveAuthorMember(selectedVersion);
                          if (!authorMember) {
                            return <span>{selectedVersion.author}</span>;
                          }
                          return (
                            <UserProfileTrigger
                              memberId={authorMember.id}
                              userId={authorMember.userId || authorMember.id}
                              name={authorMember.name}
                              avatarUrl={authorMember.avatarUrl}
                              status={authorMember.status}
                              className="inline-flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-white transition-colors"
                            >
                              <UserAvatarWithPresence
                                avatarUrl={authorMember.avatarUrl}
                                name={authorMember.name}
                                status={authorMember.status}
                                size="xs"
                              />
                              <span className="font-medium text-zinc-700 dark:text-zinc-200">
                                {authorMember.name}
                              </span>
                            </UserProfileTrigger>
                          );
                        })()}
                        <span>&middot;</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(selectedVersion.createdAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Clear, Non-Cluttered Actions */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleRestoreDraftClick(selectedVersion)}
                        disabled={restoringId === selectedVersion.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Load this version into the builder canvas without changing production"
                      >
                        <Download size={13} />
                        <span>{restoringId === selectedVersion.id ? 'Loading...' : 'Load into Draft'}</span>
                      </button>

                      {!selectedVersion.isDeployed && (
                        <button
                          type="button"
                          onClick={() => onOpenDeployModal(selectedVersion.id)}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-xs cursor-pointer",
                            isSelectedOlderThanLive
                              ? "bg-amber-500 hover:bg-amber-400 text-zinc-950"
                              : "bg-indigo-600 hover:bg-indigo-500 text-white"
                          )}
                        >
                          {isSelectedOlderThanLive ? (
                            <>
                              <RotateCcw size={13} />
                              <span>Rollback Live to {selectedVersion.versionTag}</span>
                            </>
                          ) : (
                            <>
                              <Rocket size={13} />
                              <span>Promote to Production</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* AI Commit Summary & Release Notes */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <Sparkles size={13} className="text-indigo-500" />
                        <span>Release Notes</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleRegenerateAI(selectedVersion)}
                        disabled={regeneratingId === selectedVersion.id}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw size={11} className={regeneratingId === selectedVersion.id ? 'animate-spin' : ''} />
                        <span>{regeneratingId === selectedVersion.id ? 'Writing...' : 'Rewrite with AI'}</span>
                      </button>
                    </div>

                    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 p-4 space-y-2.5">
                      {selectedVersion.commitSummary && selectedVersion.commitSummary.length > 0 ? (
                        <ul className="space-y-1.5">
                          {selectedVersion.commitSummary.map((line, i) => (
                            <li key={i} className="text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2 leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/70 mt-1.5 shrink-0" />
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                          {selectedVersion.description || 'Snapshot captured.'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Clean Field Changes List */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <Layers size={13} className="text-zinc-400" />
                        <span>
                          {previousVersion
                            ? `Changes from ${previousVersion.versionTag}`
                            : 'Baseline Fields'}
                        </span>
                      </h4>
                      <span className="text-[11px] text-zinc-400">
                        {countSchemaFields(selectedVersion.snapshot.layout)} total fields
                      </span>
                    </div>

                    {!previousVersion ? (
                      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 px-4 py-3 text-xs text-zinc-500">
                        Initial baseline snapshot containing {countSchemaFields(selectedVersion.snapshot.layout)} fields.
                      </div>
                    ) : commitDiffs.length === 0 ? (
                      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 px-4 py-3 text-xs text-zinc-500">
                        {selectedVersion.sectionChanges && selectedVersion.sectionChanges.length > 0
                          ? `Configuration updates: ${selectedVersion.sectionChanges.join(', ')}.`
                          : 'No structural field changes in this version.'}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800/80 overflow-hidden">
                        {commitDiffs.map((diff, idx) => (
                          <div
                            key={`${diff.fieldId}-${idx}`}
                            className="px-3.5 py-2.5 flex items-center justify-between gap-3 bg-white dark:bg-zinc-900"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={cn(
                                  "w-5 h-5 rounded-md flex items-center justify-center shrink-0",
                                  diff.type === 'added'
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : diff.type === 'removed'
                                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                )}
                              >
                                {diff.type === 'added' ? (
                                  <Plus size={12} />
                                ) : diff.type === 'removed' ? (
                                  <Minus size={12} />
                                ) : (
                                  <Pencil size={11} />
                                )}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-zinc-900 dark:text-white truncate">
                                    {diff.fieldLabel}
                                  </span>
                                  <code className="text-[11px] font-mono text-zinc-400">
                                    {diff.fieldName}
                                  </code>
                                </div>
                                {diff.details && (
                                  <p className="text-[11px] text-zinc-500 truncate">
                                    {diff.details}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Collapsed Advanced Technical Details */}
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setShowTechnicalDetails(v => !v)}
                      className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    >
                      {showTechnicalDetails ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <FileCode size={13} />
                      <span>Technical details (SQL & Schema JSON)</span>
                    </button>

                    {showTechnicalDetails && (
                      <div className="mt-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                            <button
                              type="button"
                              onClick={() => setTechTab('sql')}
                              className={cn(
                                "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer",
                                techTab === 'sql'
                                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs"
                                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                              )}
                            >
                              Migration SQL
                            </button>
                            <button
                              type="button"
                              onClick={() => setTechTab('json')}
                              className={cn(
                                "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer",
                                techTab === 'json'
                                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs"
                                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                              )}
                            >
                              Snapshot JSON
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={handleCopyTechnical}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          >
                            {copiedTech ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                            <span>{copiedTech ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>

                        <pre className="p-3.5 rounded-xl bg-zinc-950 text-zinc-200 font-mono text-[11px] overflow-x-auto max-h-60 leading-relaxed border border-zinc-800">
                          {techTab === 'sql'
                            ? technicalSql
                            : JSON.stringify(selectedVersion.snapshot, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8 text-xs text-zinc-400">
                  Select a version to view its details
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
