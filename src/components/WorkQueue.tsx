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
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

import { usePlatform } from '../hooks/usePlatform';
import { useData } from '../hooks/useData';
import { DocumentList } from './DocumentList';
import { DocumentGeneratorModal } from './DocumentGeneratorModal';
import { Skeleton } from './UI/Skeleton';

export const WorkQueue = () => {
  const { tenant, user: platformUser, isLoading: platformLoading, members } = usePlatform();
  const [page, setPage] = useState(1);
  const { data: cases, loading: casesLoading, hasMore, mutate: mutateCases } = useData('records', { page, limit: 20, append: true });
  const { data: modules, loading: modulesLoading } = useData('modules');
  
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'documents'>('details');
  const [activeModuleIds, setActiveModuleIds] = useState<Set<string>>(new Set());
  const [assigneeFilter, setAssigneeFilter] = useState<'mine' | 'unassigned' | 'all'>('mine');
  const [searchQuery, setSearchQuery] = useState('');

  const loading = (casesLoading && page === 1) || modulesLoading;

  const myMemberId = platformUser?.memberId || platformUser?.cuid;

  const filteredCases = useMemo(() => {
    if (!cases) return [];
    return cases.filter((c: any) => {
      // Filter by module activity
      if (!c.moduleId || !activeModuleIds.has(c.moduleId)) return false;

      // Filter by assignee
      if (assigneeFilter === 'mine') {
        if (c.assigneeId !== myMemberId) return false;
      } else if (assigneeFilter === 'unassigned') {
        if (c.assigneeId) return false;
      }

      // Filter by search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchTitle = c.title?.toLowerCase().includes(query) || false;
        const matchId = c.id?.toLowerCase().includes(query) || false;
        const matchModule = c.module?.toLowerCase().includes(query) || false;
        const matchStatus = c.status?.toLowerCase().includes(query) || false;
        if (!matchTitle && !matchId && !matchModule && !matchStatus) return false;
      }

      return true;
    });
  }, [cases, activeModuleIds, assigneeFilter, myMemberId, searchQuery]);

  useEffect(() => {
    if (!modules) return;
    const activeIds = new Set<string>();
    modules.forEach(m => {
      if (m.enabled !== false) {
        activeIds.add(m.id);
      }
    });
    setActiveModuleIds(activeIds);
  }, [modules]);

  const handleLoadMore = () => {
    if (hasMore && !casesLoading) {
      setPage(prev => prev + 1);
    }
  };

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

  const handleUpdateCaseAssignee = async (newAssigneeId: string | null) => {
    if (!tenant?.id || !selectedCase) return;
    
    setProcessing(true);
    try {
      await mutateCases('UPDATE', { 
        assigneeId: newAssigneeId,
        moduleId: selectedCase.moduleId
      }, selectedCase.id);
      
      toast.success(newAssigneeId ? "Case claimed successfully" : "Case released successfully");
      setSelectedCase((prev: any) => prev ? { ...prev, assigneeId: newAssigneeId } : null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update case assignee");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col w-full px-6 lg:px-12 pt-6 pb-10 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton width={120} height={32} variant="rounded" />
            <Skeleton width={300} height={20} variant="text" />
          </div>
          <div className="flex gap-3">
            <Skeleton width={256} height={40} variant="rounded" />
            <Skeleton width={40} height={40} variant="rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton width={40} height={40} variant="rounded" />
                  <div className="space-y-2">
                    <Skeleton width={80} height={12} variant="text" />
                    <Skeleton width={200} height={16} variant="text" />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="space-y-1">
                    <Skeleton width={40} height={10} variant="text" />
                    <Skeleton width={60} height={14} variant="text" />
                  </div>
                  <div className="space-y-1">
                    <Skeleton width={40} height={10} variant="text" />
                    <Skeleton width={60} height={14} variant="text" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-6">
            <Skeleton height={400} variant="rounded" className="rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!tenant && !platformLoading) {
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
    <div className="flex flex-col w-full px-6 lg:px-12 pt-6 pb-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">My work</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage and process active cases across all modules.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Assignee Filter Tabs */}
          <div className="flex bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <button
              onClick={() => setAssigneeFilter('mine')}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                assigneeFilter === 'mine' 
                  ? "bg-white dark:bg-zinc-900 text-indigo-500 shadow-md shadow-indigo-500/5" 
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              Assigned to me
            </button>
            <button
              onClick={() => setAssigneeFilter('unassigned')}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                assigneeFilter === 'unassigned' 
                  ? "bg-white dark:bg-zinc-900 text-indigo-500 shadow-md shadow-indigo-500/5" 
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              Unassigned
            </button>
            <button
              onClick={() => setAssigneeFilter('all')}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                assigneeFilter === 'all' 
                  ? "bg-white dark:bg-zinc-900 text-indigo-500 shadow-md shadow-indigo-500/5" 
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              All cases
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input 
              type="text" 
              placeholder="Filter cases..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-900 dark:text-zinc-300 focus:outline-none focus:border-indigo-500 w-64 transition-all"
            />
          </div>
          <button className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {filteredCases.length > 0 ? filteredCases.map((c) => (
            <div
              key={c.id}
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
                  {/* Assignee display in row */}
                  <div className="text-right min-w-[100px]">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Assignee</p>
                    {(() => {
                      const caseAssignee = (members || []).find(m => m.id === c.assigneeId);
                      if (caseAssignee) {
                        return (
                          <div className="flex items-center justify-end gap-1.5 mt-0.5">
                            {caseAssignee.avatarUrl ? (
                              <img src={caseAssignee.avatarUrl} alt={caseAssignee.name} className="w-4 h-4 rounded-full object-cover" />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-[8px] font-black text-indigo-500">
                                {caseAssignee.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                            )}
                            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 max-w-[80px] truncate">{caseAssignee.name}</span>
                          </div>
                        );
                      }
                      return <span className="text-xs text-zinc-400 italic font-medium">Unassigned</span>;
                    })()}
                  </div>
                  <ChevronRight size={16} className="text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 transition-colors" />
                </div>
              </div>
            </div>
          )) : (
            <div className="p-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl text-center">
              <p className="text-zinc-500">
                {assigneeFilter === 'mine' ? 'No cases assigned to you.' :
                 assigneeFilter === 'unassigned' ? 'No unassigned cases.' :
                 'No cases found.'}
              </p>
            </div>
          )}
          
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button 
                onClick={handleLoadMore}
                disabled={casesLoading}
                className="px-6 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all disabled:opacity-50"
              >
                {casesLoading ? 'Loading...' : 'Load More Cases'}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {selectedCase ? (
              <motion.div
                key={selectedCase.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
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
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">Assignee</span>
                        {(() => {
                          const caseAssignee = (members || []).find(m => m.id === selectedCase.assigneeId);
                          if (caseAssignee) {
                            return (
                              <span className="text-zinc-900 dark:text-white font-medium flex items-center gap-2">
                                {caseAssignee.avatarUrl ? (
                                  <img src={caseAssignee.avatarUrl} alt={caseAssignee.name} className="w-4 h-4 rounded-full object-cover" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-[8px] font-black text-indigo-500">
                                    {caseAssignee.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                  </div>
                                )}
                                {caseAssignee.name}
                              </span>
                            );
                          }
                          return (
                            <span className="text-zinc-400 dark:text-zinc-600 font-medium italic">Unassigned</span>
                          );
                        })()}
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

                      {/* Claim / Release Case Button */}
                      {(() => {
                        const isAssignedToMe = selectedCase.assigneeId === myMemberId;
                        const isAssignedToOthers = selectedCase.assigneeId && !isAssignedToMe;
                        const otherAssigneeName = isAssignedToOthers 
                          ? (members || []).find(m => m.id === selectedCase.assigneeId)?.name || 'Someone Else'
                          : '';

                        if (isAssignedToMe) {
                          return (
                            <button
                              onClick={() => handleUpdateCaseAssignee(null)}
                              disabled={processing}
                              className="w-full py-2 bg-rose-600/10 border border-rose-500/20 hover:bg-rose-600/20 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                            >
                              <span>Release Case</span>
                            </button>
                          );
                        } else {
                          return (
                            <button
                              onClick={() => handleUpdateCaseAssignee(myMemberId)}
                              disabled={processing}
                              className="w-full py-2 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10"
                            >
                              <span>{isAssignedToOthers ? `Claim Case (Assigned to ${otherAssigneeName})` : 'Claim Case'}</span>
                            </button>
                          );
                        }
                      })()}

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
                  <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1">Select a case from My work to view details and AI insights.</p>
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
