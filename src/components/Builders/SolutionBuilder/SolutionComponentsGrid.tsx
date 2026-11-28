import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  Lock,
  Sparkles,
  Trash2,
  SlidersHorizontal,
  Boxes,
  ShieldCheck,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';
import {
  SolutionArtifact,
  SolutionArtifactOrigin,
  PinnedChatContext,
} from '../../../types/solutions';
import {
  SOLUTION_COMPONENT_COLUMNS,
  getComponentMeta,
  getOriginBadgeMeta,
  formatRelativeTime,
} from './solutionComponentCatalog';
import { AddSolutionComponentModal } from './AddSolutionComponentModal';
import { cn } from '../../../lib/utils';

export interface SolutionAuditFindingUI {
  severity: 'CRITICAL' | 'WARNING' | 'SUGGESTION';
  code: string;
  artifactId?: string;
  artifactName?: string;
  message: string;
  autoFixable: boolean;
}

export interface SolutionAuditReportUI {
  score: number;
  findings: SolutionAuditFindingUI[];
  repairedArtifacts: SolutionArtifact[];
  autoFixCount: number;
}

export interface SolutionComponentsGridProps {
  artifacts: SolutionArtifact[];
  onEditInBuilder: (artifact: SolutionArtifact) => void;
  onAskAI: (ctx: PinnedChatContext) => void;
  onAddArtifact: (artifact: SolutionArtifact) => void;
  onRemoveArtifact: (id: string) => void;
  onRunAudit?: () => Promise<SolutionAuditReportUI | null>;
  onApplyAutoFix?: (repaired: SolutionArtifact[]) => void;
  onAskAIToFixFindings?: (findings: SolutionAuditFindingUI[]) => void;
}

const ORIGIN_FILTERS: Array<{ id: 'ALL' | SolutionArtifactOrigin; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'CORE', label: 'Core' },
  { id: 'TEMPLATE', label: 'Blueprint' },
  { id: 'AI_GEN', label: 'AI Gen' },
  { id: 'CUSTOM', label: 'Custom' },
];

export const SolutionComponentsGrid: React.FC<SolutionComponentsGridProps> = ({
  artifacts,
  onEditInBuilder,
  onAskAI,
  onAddArtifact,
  onRemoveArtifact,
  onRunAudit,
  onApplyAutoFix,
  onAskAIToFixFindings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [originFilter, setOriginFilter] = useState<'ALL' | SolutionArtifactOrigin>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [auditReport, setAuditReport] = useState<SolutionAuditReportUI | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleAuditClick = async () => {
    if (!onRunAudit || auditing) return;
    setAuditing(true);
    try {
      const report = await onRunAudit();
      if (report) setAuditReport(report);
    } finally {
      setAuditing(false);
    }
  };

  // Cmd/Ctrl + K focuses component search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const filteredArtifacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return artifacts.filter((art) => {
      const meta = getComponentMeta(art.type);
      const matchesOrigin =
        originFilter === 'ALL' || (art.origin || 'AI_GEN') === originFilter;
      if (!matchesOrigin) return false;
      if (!q) return true;
      return (
        art.name.toLowerCase().includes(q) ||
        meta.label.toLowerCase().includes(q) ||
        meta.singularLabel.toLowerCase().includes(q) ||
        (art.description || '').toLowerCase().includes(q)
      );
    });
  }, [artifacts, searchQuery, originFilter]);

  const columnsWithItems = useMemo(() => {
    return SOLUTION_COMPONENT_COLUMNS.map((col) => ({
      ...col,
      items: filteredArtifacts.filter((art) => getComponentMeta(art.type).column === col.id),
    }));
  }, [filteredArtifacts]);

  return (
    <div className="flex flex-col h-full w-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      <AddSolutionComponentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        existingArtifacts={artifacts}
        onAddArtifact={onAddArtifact}
      />

      {/* Top Filter & Add Action Row */}
      <div className="px-6 pt-5 pb-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shrink-0 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter components..."
              className="w-full h-9 pl-9 pr-14 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              ⌘K
            </kbd>
          </div>

          {onRunAudit && artifacts.length > 0 && (
            <button
              type="button"
              onClick={handleAuditClick}
              disabled={auditing}
              className="h-9 inline-flex items-center gap-1.5 px-3 rounded-lg bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-medium transition-colors cursor-pointer shrink-0"
              title="Check for unlinked forms, missing PII role masks, and workflow drift"
            >
              {auditing ? <Loader2 size={13} className="animate-spin text-indigo-500" /> : <ShieldCheck size={13} className="text-indigo-500" />}
              <span>{auditing ? 'Auditing...' : 'Audit Solution'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus size={14} />
            <span>Add Component</span>
          </button>
        </div>

        {/* Inline Audit Results Banner */}
        {auditReport && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/60 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {auditReport.findings.length === 0 ? (
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                )}
                <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                  Solution Quality Score: {auditReport.score}/100
                </span>
                <span className="text-[11px] text-zinc-500">
                  {auditReport.findings.length === 0
                    ? 'All links, workflows, and PII role masks look great.'
                    : `${auditReport.findings.length} finding(s)`}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {auditReport.autoFixCount > 0 && onApplyAutoFix && (
                  <button
                    type="button"
                    onClick={() => {
                      onApplyAutoFix(auditReport.repairedArtifacts);
                      setAuditReport(null);
                    }}
                    className="h-7 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Wrench size={11} />
                    <span>Auto-Fix ({auditReport.autoFixCount})</span>
                  </button>
                )}
                {auditReport.findings.length > 0 && onAskAIToFixFindings && (
                  <button
                    type="button"
                    onClick={() => {
                      onAskAIToFixFindings(auditReport.findings);
                      setAuditReport(null);
                    }}
                    className="h-7 px-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:border-indigo-400 text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={11} className="text-indigo-500" />
                    <span>Ask AI to Fix</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAuditReport(null)}
                  className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  title="Dismiss audit"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
            {auditReport.findings.length > 0 && (
              <div className="space-y-1">
                {auditReport.findings.map((f, i) => (
                  <div
                    key={`${f.code}_${i}`}
                    className="flex items-start gap-2 text-[11px] text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-lg px-2.5 py-1.5"
                  >
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase shrink-0 mt-0.5',
                        f.severity === 'CRITICAL'
                          ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300'
                          : f.severity === 'WARNING'
                            ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      )}
                    >
                      {f.severity}
                    </span>
                    <span className="flex-1">{f.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Origin Filter Pills */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            {ORIGIN_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setOriginFilter(f.id)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer',
                  originFilter === f.id
                    ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-zinc-400">
            Showing {filteredArtifacts.length} of {artifacts.length} components
          </span>
        </div>
      </div>

      {/* 3-Column Visual Card Grid */}
      <div className="flex-1 overflow-y-auto px-6 pt-5 pb-28 custom-scrollbar">
        {artifacts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 mb-3 shadow-xs">
              <Boxes size={22} />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              No components in this Solution yet
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
              Describe the business system you need in Solution Chat on the left, or click{' '}
              <span className="font-medium text-zinc-700 dark:text-zinc-200">+ Add Component</span>{' '}
              to link Platform Core assets and add any of Aurora’s 19 builders.
            </p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 h-8 inline-flex items-center gap-1.5 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Add First Component</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            {columnsWithItems.map((col) => (
              <div key={col.id} className="space-y-3 min-w-0">
                {/* Column Header */}
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {col.title}
                  </h4>
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    {col.items.length}
                  </span>
                </div>

                {/* Cards Stack */}
                <div className="space-y-2.5">
                  {col.items.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-[11px] text-zinc-400">
                      No {col.title.toLowerCase()} components
                    </div>
                  ) : (
                    col.items.map((art) => {
                      const meta = getComponentMeta(art.type);
                      const originMeta = getOriginBadgeMeta(art.origin);
                      const Icon = meta.icon;

                      return (
                        <div
                          key={art.id}
                          className={cn(
                            'group relative p-3.5 rounded-xl bg-white dark:bg-zinc-900 border transition-all duration-150',
                            art.isSharedCore
                              ? 'border-amber-200/80 dark:border-amber-500/25 hover:border-amber-300 dark:hover:border-amber-500/45'
                              : 'border-zinc-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-sm'
                          )}
                        >
                          {/* Top Row: Icon + Name + Origin Badge */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/15 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-center shrink-0 transition-colors">
                                <Icon size={14} />
                              </div>
                              <div className="min-w-0">
                                <h5
                                  className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate"
                                  title={art.name}
                                >
                                  {art.name}
                                </h5>
                                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5">
                                  <span>{meta.singularLabel}</span>
                                  <span>·</span>
                                  <span>Modified {formatRelativeTime(art.updatedAt)}</span>
                                </div>
                              </div>
                            </div>

                            <span
                              className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0',
                                originMeta.className
                              )}
                            >
                              {art.isSharedCore && <Lock size={9} />}
                              <span>{originMeta.label}</span>
                            </span>
                          </div>

                          {/* Core Extension-Only Notice */}
                          {art.isSharedCore && (
                            <div className="mt-2.5 px-2 py-1 rounded-md bg-amber-50/70 dark:bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                              <Lock size={10} className="shrink-0" />
                              <span className="truncate">
                                Shared Platform Core · Extension-only in Solution
                              </span>
                            </div>
                          )}

                          {/* Hover / Focus Action Bar */}
                          <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => onEditInBuilder(art)}
                              className="flex-1 h-7 inline-flex items-center justify-center gap-1.5 px-2.5 rounded-lg bg-zinc-100 hover:bg-indigo-600 text-zinc-700 hover:text-white dark:bg-zinc-800 dark:hover:bg-indigo-600 dark:text-zinc-200 dark:hover:text-white text-[11px] font-medium transition-colors cursor-pointer"
                            >
                              <SlidersHorizontal size={12} />
                              <span>Edit in Builder</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                onAskAI({
                                  artifactId: art.id,
                                  artifactName: art.name,
                                  artifactType: art.type,
                                  label: art.name,
                                })
                              }
                              className="h-7 px-2 rounded-lg text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium"
                              title={`Pin @${art.name} to Solution Chat`}
                            >
                              <Sparkles size={12} />
                            </button>

                            <button
                              type="button"
                              onClick={() => onRemoveArtifact(art.id)}
                              className="h-7 px-2 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Remove from Solution"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
