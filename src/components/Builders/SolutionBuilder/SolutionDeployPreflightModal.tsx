import React from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Rocket,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lock,
  Loader2,
  ShieldCheck,
  Sparkles,
  GitBranch,
  Wrench,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface PreFlightCheckItem {
  id: string;
  severity: 'pass' | 'warning' | 'blocker';
  title: string;
  detail: string;
}

export interface PreFlightDiffItem {
  id: string;
  name: string;
  type: string;
  changeType: 'NEW' | 'MODIFIED' | 'CORE_EXTENSION';
  summary: string;
}

export interface PreFlightBlastRadiusItem {
  id: string;
  sourceArtifactId: string;
  sourceArtifactName: string;
  changeKind: 'FIELD_REMOVED' | 'FIELD_TYPE_CHANGED' | 'STAGE_REMOVED';
  targetKey: string;
  targetLabel: string;
  affectedAssetType: string;
  affectedAssetName: string;
  scope: 'LIVE_WORKSPACE' | 'DRAFT_SOLUTION';
  severity: 'high' | 'medium';
  detail: string;
  suggestedFix: string;
}

export interface PreFlightReport {
  canDeploy: boolean;
  totalComponents: number;
  coreExtensionsCount: number;
  netNewCount: number;
  checks: PreFlightCheckItem[];
  coreImpacts: Array<{ id: string; name: string; type: string; detail: string }>;
  componentsToProvision: Array<{ id: string; name: string; type: string; origin: string }>;
  diffItems?: PreFlightDiffItem[];
  blastRadius?: PreFlightBlastRadiusItem[];
  compliance?: {
    frameworks: string[];
    score: number;
    fixableCount: number;
  };
}

export interface SolutionDeployPreflightModalProps {
  isOpen: boolean;
  onClose: () => void;
  solutionName: string;
  solutionVersion: string;
  loading: boolean;
  deploying: boolean;
  fixingCompliance?: boolean;
  report: PreFlightReport | null;
  onConfirmDeploy: () => void;
  onAutoFixCompliance?: () => void;
  onGenerateBlastRadiusFixes?: (items: PreFlightBlastRadiusItem[]) => void;
}

export const SolutionDeployPreflightModal: React.FC<SolutionDeployPreflightModalProps> = ({
  isOpen,
  onClose,
  solutionName,
  solutionVersion,
  loading,
  deploying,
  fixingCompliance = false,
  report,
  onConfirmDeploy,
  onAutoFixCompliance,
  onGenerateBlastRadiusFixes,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10060] flex items-center justify-center bg-zinc-950/45 backdrop-blur-[2px] p-4"
      onClick={deploying ? undefined : onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[86vh] flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Slim Google-UI Header */}
        <div className="h-12 px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
              Pre-Flight Check · {solutionName}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
              {solutionVersion}
            </span>
          </div>
          {!deploying && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {loading || !report ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-zinc-500">
              <Loader2 size={22} className="animate-spin text-indigo-600" />
              <p className="text-xs font-medium">
                Validating cross-component links, roles, and Core asset extensions...
              </p>
            </div>
          ) : (
            <>
              {/* Summary Strip */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                  <div className="text-[11px] text-zinc-500">Total Components</div>
                  <div className="text-lg font-bold text-zinc-900 dark:text-white mt-0.5">
                    {report.totalComponents}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                  <div className="text-[11px] text-zinc-500">Solution Assets</div>
                  <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {report.netNewCount}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20">
                  <div className="text-[11px] text-amber-700 dark:text-amber-300">Core Links</div>
                  <div className="text-lg font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                    {report.coreExtensionsCount}
                  </div>
                </div>
              </div>

              {/* Compliance-as-Code Banner */}
              {report.compliance && (report.compliance.frameworks.length > 0 || report.compliance.fixableCount > 0) && (
                <div className="p-3.5 rounded-xl border border-indigo-200/80 dark:border-indigo-500/25 bg-indigo-50/50 dark:bg-indigo-500/10 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                      <ShieldCheck size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>Compliance-as-Code Score: {report.compliance.score}/100</span>
                    </div>
                    <div className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 mt-0.5 truncate">
                      {report.compliance.frameworks.length > 0
                        ? `Active frameworks: ${report.compliance.frameworks.join(', ')}`
                        : 'Baseline PII & role-masking controls active'}
                    </div>
                  </div>
                  {report.compliance.fixableCount > 0 && onAutoFixCompliance && (
                    <button
                      type="button"
                      disabled={fixingCompliance || deploying}
                      onClick={onAutoFixCompliance}
                      className="h-7 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[11px] font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                    >
                      {fixingCompliance ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Wrench size={12} />
                      )}
                      <span>Auto-Fix ({report.compliance.fixableCount})</span>
                    </button>
                  )}
                </div>
              )}

              {/* Downstream Blast Radius */}
              {report.blastRadius && report.blastRadius.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <GitBranch size={12} />
                      <span>Downstream Blast Radius ({report.blastRadius.length})</span>
                    </h4>
                    {onGenerateBlastRadiusFixes && (
                      <button
                        type="button"
                        disabled={deploying}
                        onClick={() => onGenerateBlastRadiusFixes(report.blastRadius || [])}
                        className="h-7 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Sparkles size={12} />
                        <span>Generate Fix Patches</span>
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {report.blastRadius.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-500/10 border border-rose-200/80 dark:border-rose-500/25 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-semibold text-rose-900 dark:text-rose-100 truncate">
                              {item.affectedAssetName}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-medium shrink-0">
                              {item.affectedAssetType}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/80 dark:bg-zinc-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 shrink-0">
                            {item.changeKind === 'FIELD_REMOVED'
                              ? 'Field Removed'
                              : item.changeKind === 'FIELD_TYPE_CHANGED'
                                ? 'Type Changed'
                                : 'Stage Removed'}
                          </span>
                        </div>
                        <div className="text-[11px] text-rose-800/90 dark:text-rose-200/90">
                          {item.detail}
                        </div>
                        <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                          Fix: {item.suggestedFix}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Validation Checks */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Validation Checks
                </h4>
                <div className="space-y-1.5">
                  {report.checks.map((chk) => (
                    <div
                      key={chk.id}
                      className={cn(
                        'p-3 rounded-xl border flex items-start gap-2.5 text-xs',
                        chk.severity === 'blocker'
                          ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/25 text-rose-800 dark:text-rose-200'
                          : chk.severity === 'warning'
                          ? 'bg-amber-50/80 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25 text-amber-800 dark:text-amber-200'
                          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200'
                      )}
                    >
                      {chk.severity === 'blocker' ? (
                        <XCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
                      ) : chk.severity === 'warning' ? (
                        <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold">{chk.title}</div>
                        <div className="text-[11px] opacity-80 mt-0.5">{chk.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shared Platform Core Impacts */}
              {report.coreImpacts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Lock size={11} />
                    <span>Shared Platform Core (Extension-Only)</span>
                  </h4>
                  <div className="space-y-1.5">
                    {report.coreImpacts.map((c) => (
                      <div
                        key={c.id}
                        className="px-3 py-2 rounded-lg bg-amber-50/60 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-amber-900 dark:text-amber-200">
                          {c.name}
                        </span>
                        <span className="text-[11px] text-amber-700 dark:text-amber-300">
                          {c.detail}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Re-Deploy Diff / Provisioning Plan */}
              {report.diffItems && report.diffItems.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Workspace Diff & Provisioning Plan ({report.diffItems.length})
                  </h4>
                  <div className="space-y-1.5">
                    {report.diffItems.map((diff) => (
                      <div
                        key={diff.id}
                        className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-zinc-800 dark:text-zinc-100 truncate">
                              {diff.name}
                            </span>
                            <span className="text-[10px] text-zinc-400">{diff.type}</span>
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                            {diff.summary}
                          </div>
                        </div>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0',
                            diff.changeType === 'NEW'
                              ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : diff.changeType === 'MODIFIED'
                                ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                                : 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          )}
                        >
                          {diff.changeType === 'NEW'
                            ? 'New'
                            : diff.changeType === 'MODIFIED'
                              ? 'Update'
                              : 'Core Ext'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Native Aurora Assets to Provision ({report.componentsToProvision.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {report.componentsToProvision.map((item) => (
                      <div
                        key={item.id}
                        className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="font-medium text-zinc-800 dark:text-zinc-100 truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] font-medium text-zinc-400 shrink-0">
                          {item.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-zinc-500">
            All provisioned assets remain editable in both Solution Studio and standalone builders.
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={deploying}
              onClick={onClose}
              className="h-8 px-3 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading || deploying || !report?.canDeploy}
              onClick={onConfirmDeploy}
              className={cn(
                'h-8 px-4 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors',
                loading || deploying || !report?.canDeploy
                  ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
              )}
            >
              {deploying ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Deploying...</span>
                </>
              ) : (
                <>
                  <Rocket size={13} />
                  <span>Confirm & Deploy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
