import React, { useState, useEffect } from 'react';
import { 
  GitCompare, 
  X, 
  ArrowRight, 
  PlusCircle, 
  MinusCircle, 
  Edit3, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { UniversalDocument, VersionDiffResult } from '../../types/document';
import { DocumentClientService } from '../../services/documentClientService';
import { toast } from 'sonner';

interface DocumentVersionDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: UniversalDocument;
}

export const DocumentVersionDiffModal: React.FC<DocumentVersionDiffModalProps> = ({
  isOpen,
  onClose,
  document
}) => {
  const versions = document.versions || [];
  const latestVer = versions[0]?.versionNumber || 1;
  const [versionA, setVersionA] = useState<number>(Math.max(1, latestVer - 1));
  const [versionB, setVersionB] = useState<number>(latestVer);
  const [loading, setLoading] = useState(false);
  const [diff, setDiff] = useState<VersionDiffResult | null>(null);

  useEffect(() => {
    if (isOpen && document) {
      handleRunComparison();
    }
  }, [isOpen, document.id]);

  const handleRunComparison = async () => {
    try {
      setLoading(true);
      const res = await DocumentClientService.compareVersions(document.id, versionA, versionB);
      setDiff(res);
    } catch (err: any) {
      toast.error(err.message || 'Failed to compare versions');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/60">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                Version Comparator & Legal Diff
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium">
                  AI Diff
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {document.name} • Identifying clause alterations and revisions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Version Selectors Bar */}
        <div className="px-6 py-3 bg-zinc-100/60 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Earlier:</span>
              <select
                value={versionA}
                onChange={(e) => setVersionA(Number(e.target.value))}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {versions.length > 0 ? (
                  versions.map(v => (
                    <option key={`a-${v.versionNumber}`} value={v.versionNumber}>
                      v{v.versionNumber} ({new Date(v.createdAt).toLocaleDateString()})
                    </option>
                  ))
                ) : (
                  <option value={1}>v1 (Current)</option>
                )}
              </select>
            </div>

            <ArrowRight className="w-4 h-4 text-zinc-400" />

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Later:</span>
              <select
                value={versionB}
                onChange={(e) => setVersionB(Number(e.target.value))}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {versions.length > 0 ? (
                  versions.map(v => (
                    <option key={`b-${v.versionNumber}`} value={v.versionNumber}>
                      v{v.versionNumber} ({new Date(v.createdAt).toLocaleDateString()})
                    </option>
                  ))
                ) : (
                  <option value={1}>v1 (Current)</option>
                )}
              </select>
            </div>
          </div>

          <button
            onClick={handleRunComparison}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Re-Analyze Diff
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
              <p className="text-sm font-medium text-zinc-900 dark:text-white">Comparing versions...</p>
              <p className="text-xs text-zinc-500">Multimodal Gemini is analyzing clause differences and modifications.</p>
            </div>
          ) : diff ? (
            <>
              {/* Executive Summary Card */}
              <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60">
                <div className="flex items-center gap-2 mb-2 text-indigo-700 dark:text-indigo-300 font-semibold text-xs uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  Executive AI Change Summary
                </div>
                <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans">
                  {diff.summary}
                </p>
              </div>

              {/* Changes List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  <span>Detected Alterations ({diff.changes?.length || 0})</span>
                  <span>v{versionA} ➔ v{versionB}</span>
                </div>

                {(!diff.changes || diff.changes.length === 0) ? (
                  <div className="text-center py-10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 font-medium">No material changes detected</p>
                    <p className="text-xs text-zinc-400">The content across these two versions appears identical.</p>
                  </div>
                ) : (
                  diff.changes.map((change, idx) => (
                    <div 
                      key={`change-${idx}`}
                      className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-white dark:bg-zinc-900/60 shadow-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {change.type === 'ADDED' && (
                            <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                              <PlusCircle className="w-3 h-3" /> Added
                            </span>
                          )}
                          {change.type === 'REMOVED' && (
                            <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                              <MinusCircle className="w-3 h-3" /> Removed
                            </span>
                          )}
                          {change.type === 'MODIFIED' && (
                            <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                              <Edit3 className="w-3 h-3" /> Modified
                            </span>
                          )}
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            {change.clauseOrLocation || 'Document Content'}
                          </span>
                        </div>

                        {change.significance === 'HIGH' && (
                          <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60">
                            <AlertTriangle className="w-3 h-3" /> High Risk Change
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-700 dark:text-zinc-300">
                        {change.description}
                      </p>

                      {/* Text Snippets Before/After */}
                      {(change.textBefore || change.textAfter) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 font-mono text-[11px]">
                          {change.textBefore && (
                            <div className="p-2 rounded bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-900/40 text-rose-900 dark:text-rose-200">
                              <div className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 mb-1">Previous (v{versionA}):</div>
                              <div className="line-through opacity-80 whitespace-pre-wrap">{change.textBefore}</div>
                            </div>
                          )}
                          {change.textAfter && (
                            <div className="p-2 rounded bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200">
                              <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 mb-1">New (v{versionB}):</div>
                              <div className="whitespace-pre-wrap">{change.textAfter}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white transition-colors"
          >
            Close Comparator
          </button>
        </div>
      </div>
    </div>
  );
};
