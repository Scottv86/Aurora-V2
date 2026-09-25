import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, 
  X, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  Loader2, 
  Sparkles,
  Quote,
  Calendar
} from 'lucide-react';
import { UniversalDocument, ContractObligation } from '../../types/document';
import { DocumentClientService } from '../../services/documentClientService';
import { toast } from 'sonner';

interface DocumentObligationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: UniversalDocument;
}

export const DocumentObligationsModal: React.FC<DocumentObligationsModalProps> = ({
  isOpen,
  onClose,
  document
}) => {
  const [loading, setLoading] = useState(false);
  const [obligations, setObligations] = useState<ContractObligation[]>([]);
  const [createdTasks, setCreatedTasks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen && document) {
      fetchObligations();
    }
  }, [isOpen, document.id]);

  const fetchObligations = async () => {
    try {
      setLoading(true);
      const res = await DocumentClientService.extractObligations(document.id);
      setObligations(res);
    } catch (err: any) {
      toast.error(err.message || 'Failed to extract obligations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = (ob: ContractObligation) => {
    setCreatedTasks(prev => ({ ...prev, [ob.id]: true }));
    toast.success(`Created scheduled task: "${ob.title}"`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800/60">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                Contract Obligations & Tasks
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
                  AI Extracted
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {document.name} • Operative deadlines, renewal terms, and compliance milestones
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
              <p className="text-sm font-medium text-zinc-900 dark:text-white">Scanning document obligations...</p>
              <p className="text-xs text-zinc-500">Gemini is parsing operative dates, deliverables, and notice terms.</p>
            </div>
          ) : obligations.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">No pending obligations detected</p>
              <p className="text-xs text-zinc-500">This document doesn't appear to contain explicit deadlines or future milestones.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {obligations.map((ob) => {
                const isCreated = createdTasks[ob.id];
                return (
                  <div
                    key={ob.id}
                    className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            ob.category === 'RENEWAL'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                              : ob.category === 'DEADLINE'
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                              : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                          }`}>
                            {ob.category}
                          </span>
                          {ob.dueDate && (
                            <span className="flex items-center gap-1 text-xs text-zinc-500 font-mono">
                              <Calendar className="w-3 h-3 text-zinc-400" />
                              Due: {ob.dueDate}
                            </span>
                          )}
                          {ob.responsibleParty && (
                            <span className="text-xs text-zinc-400">
                              • Responsible: {ob.responsibleParty}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                          {ob.title}
                        </h4>
                      </div>

                      <button
                        onClick={() => handleCreateTask(ob)}
                        disabled={isCreated}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          isCreated
                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        {isCreated ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Task Created
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            Create Task
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                      {ob.description}
                    </p>

                    {ob.sourceQuote && (
                      <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 italic flex items-start gap-2">
                        <Quote className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                        <span>"{ob.sourceQuote}"</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
