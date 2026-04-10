import { 
  FileText, 
  Search, 
  Filter, 
  ChevronRight, 
  Clock, 
  User, 
  Sparkles,
  MessageSquare,
  Zap,
  Database
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

import { usePlatform } from '../hooks/usePlatform';
import { useData } from '../hooks/useData';
import { DocumentList } from './DocumentList';
import { DocumentGeneratorModal } from './DocumentGeneratorModal';

export const WorkQueue = () => {
  const { tenant } = usePlatform();
  const { data: cases, loading: casesLoading, mutate: mutateCases } = useData('records');
  const { data: modules, loading: modulesLoading } = useData('modules');
  
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'documents'>('details');
  const [activeModuleIds, setActiveModuleIds] = useState<Set<string>>(new Set());

  const loading = casesLoading || modulesLoading;

  useEffect(() => {
    if (!modules) return;
    const activeIds = new Set<string>();
    modules.forEach(m => {
      // Assuming 'enabled' or 'status' check for modules depending on config
      if (m.enabled !== false) {
        activeIds.add(m.id);
      }
    });
    setActiveModuleIds(activeIds);
  }, [modules]);

  const handleProcessCase = async () => {
    if (!tenant?.id || !selectedCase) return;
    
    setProcessing(true);
    try {
      const nextStatus = selectedCase.status === 'New' ? 'In Progress' : 
                        selectedCase.status === 'In Progress' ? 'Completed' : 'Completed';
      
      await mutateCases('UPDATE', { status: nextStatus }, selectedCase.id);
      
      toast.success(`Case updated to ${nextStatus}`);
      setSelectedCase({ ...selectedCase, status: nextStatus });
    } catch (error) {
      console.error(error);
      toast.error("Failed to process case");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-full">
          <Database className="text-zinc-300 dark:text-zinc-700" size={48} />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">No Workspace Selected</h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mt-2">
            You don't seem to be associated with a workspace. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Queue</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage and process active cases across all modules.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input 
              type="text" 
              placeholder="Filter cases..." 
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-900 dark:text-zinc-300 focus:outline-none focus:border-indigo-500 w-64"
            />
          </div>
          <button className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {cases.filter(c => c.moduleId && activeModuleIds.has(c.moduleId)).length > 0 ? cases.filter(c => c.moduleId && activeModuleIds.has(c.moduleId)).map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedCase(c)}
              className={cn(
                "p-4 bg-white dark:bg-zinc-900/50 border rounded-2xl cursor-pointer transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900 group shadow-sm",
                selectedCase?.id === c.id ? "border-indigo-500 ring-1 ring-indigo-500/50" : "border-zinc-200 dark:border-zinc-800"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{c.id}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">{c.module || 'General Request'}</span>
                    </div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">{c.title}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status</p>
                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{c.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Priority</p>
                    <p className={cn("text-xs font-medium", 
                      c.priority === 'High' ? "text-rose-600 dark:text-rose-400" : 
                      c.priority === 'Medium' ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"
                    )}>{c.priority}</p>
                  </div>
                  <ChevronRight size={16} className="text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 transition-colors" />
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="p-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl text-center">
              <p className="text-zinc-500">No active cases found in the queue.</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {selectedCase ? (
              <motion.div
                key={selectedCase.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="p-6 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl sticky top-24 space-y-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Case Details</h3>
                  <div className="flex bg-zinc-100 dark:bg-zinc-950 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <button
                      onClick={() => setActiveTab('details')}
                      className={cn(
                        "px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all",
                        activeTab === 'details' ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                      )}
                    >
                      Details
                    </button>
                    <button
                      onClick={() => setActiveTab('documents')}
                      className={cn(
                        "px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all",
                        activeTab === 'documents' ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                      )}
                    >
                      Documents
                    </button>
                  </div>
                </div>

                {activeTab === 'details' ? (
                  <>
                    <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <Sparkles size={16} />
                        <span className="text-xs font-bold uppercase tracking-widest">AI Summary</span>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed italic">
                        "{selectedCase.aiSummary}"
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">Submitted By</span>
                        <span className="text-zinc-900 dark:text-white font-medium flex items-center gap-2">
                          <User size={14} className="text-zinc-400 dark:text-zinc-600" />
                          {selectedCase.submittedBy}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">Submitted At</span>
                        <span className="text-zinc-900 dark:text-white font-medium flex items-center gap-2">
                          <Clock size={14} className="text-zinc-400 dark:text-zinc-600" />
                          {selectedCase.createdAt ? new Date(selectedCase.createdAt).toLocaleString() : selectedCase.time}
                        </span>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Actions</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button className="py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-700 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors flex items-center justify-center gap-2">
                          <MessageSquare size={14} />
                          <span>Comment</span>
                        </button>
                        <button 
                          onClick={() => setIsGenModalOpen(true)}
                          className="py-2 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600/20 transition-colors flex items-center justify-center gap-2"
                        >
                          <Zap size={14} />
                          <span>Generate</span>
                        </button>
                      </div>
                      <button 
                        onClick={handleProcessCase}
                        disabled={processing || selectedCase.status === 'Completed'}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {processing ? (
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                          <span>{selectedCase.status === 'Completed' ? 'Case Completed' : 'Process Case'}</span>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <DocumentList 
                      recordId={selectedCase.id} 
                      moduleId={selectedCase.moduleId}
                      onGenerateNew={() => setIsGenModalOpen(true)}
                    />
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="p-12 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 border-dashed rounded-3xl text-center flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-zinc-300 dark:text-zinc-700 shadow-sm">
                  <FileText size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-500">No case selected</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1">Select a case from the queue to view details and AI insights.</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <DocumentGeneratorModal
        isOpen={isGenModalOpen}
        onClose={() => setIsGenModalOpen(false)}
        recordData={selectedCase}
        moduleId={selectedCase?.moduleId || 'general'}
      />
    </div>
  );
};
