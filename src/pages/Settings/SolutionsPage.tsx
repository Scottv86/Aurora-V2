import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Boxes, Plus, Search, Trash2, ArrowRight, Sparkles, FileText
} from 'lucide-react';

import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Primitives';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { SolutionBlueprint } from '../../types/solutions';
import { NewSolutionModal, TEMPLATE_SOLUTIONS } from '../../components/Modals/NewSolutionModal';
import { SolutionBuilderStudio } from '../../components/Builders/SolutionBuilder/SolutionBuilderStudio';
import { EmptyState } from '../../components/UI/EmptyState';
import { API_BASE_URL } from '../../config';
import { usePlatform } from '../../context/PlatformContext';
import { TrashService } from '../../services/trashService';
import { DeleteConfirmationModal } from '../../components/Common/DeleteConfirmationModal';
import { supabase } from '../../lib/supabase';
import { builderCache } from '../../utils/builderCache';

const getAuthToken = async (): Promise<string> => {
  const authDataStr = localStorage.getItem('aurora_auth');
  if (authDataStr) {
    try {
      const authData = JSON.parse(authDataStr);
      if (authData?.access_token || authData?.token) return authData.access_token || authData.token;
    } catch (e) {}
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return session.access_token;
  } catch (e) {}
  return '';
};

export const SolutionsPage: React.FC = () => {
  const { tenant } = usePlatform();
  const cacheKey = `solutions_${tenant?.id || 'default'}`;
  const [searchParams, setSearchParams] = useSearchParams();
  const [solutions, setSolutions] = useState<SolutionBlueprint[]>(() => builderCache.get<SolutionBlueprint[]>(cacheKey) || []);
  const [loading, setLoading] = useState(() => !builderCache.has(cacheKey));
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'DRAFTS'>('ALL');

  const fetchSolutions = React.useCallback(async () => {
    if (!builderCache.has(cacheKey)) {
      setLoading(true);
    }
    try {
      const token = await getAuthToken();

      const res = await fetch(`${API_BASE_URL}/api/solutions`, {
        headers: {
          'x-tenant-id': tenant?.id || 'default-tenant',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.solutions)) {
          setSolutions(data.solutions);
          builderCache.set(cacheKey, data.solutions);
        }
      }
    } catch (err) {
      console.error('Failed to fetch solutions:', err);
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, cacheKey]);

  useEffect(() => {
    fetchSolutions();
  }, [fetchSolutions, searchParams]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Derived Studio States directly from searchParams
  const isStudioActive = searchParams.get('mode') === 'studio' || searchParams.get('mode') === 'builder' || searchParams.has('id');
  const solutionParamId = searchParams.get('id');

  const activeSolution = useMemo(() => {
    if (!solutionParamId) return null;
    return solutions.find(s => s.id === solutionParamId) || TEMPLATE_SOLUTIONS.find(s => s.id === solutionParamId) || null;
  }, [solutionParamId, solutions]);

  const filteredSolutions = useMemo(() => {
    return solutions.filter(sol => {
      const name = sol.name || '';
      const description = sol.description || '';
      const category = sol.category || '';
      const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) || 
                            description.toLowerCase().includes(search.toLowerCase()) ||
                            category.toLowerCase().includes(search.toLowerCase());
      if (activeTab === 'ACTIVE') return matchesSearch && sol.status === 'ACTIVE';
      if (activeTab === 'DRAFTS') return matchesSearch && sol.status === 'DRAFT';
      return matchesSearch;
    });
  }, [solutions, search, activeTab]);

  const handleCreateNewClick = () => {
    setIsModalOpen(true);
  };

  const handleSelectBlank = () => {
    setIsModalOpen(false);
    setSearchParams({ mode: 'studio' });
  };

  const handleSelectTemplate = (template: SolutionBlueprint) => {
    setIsModalOpen(false);
    setSearchParams({ mode: 'studio', id: template.id });
  };

  const handleEditSolutionCard = (sol: SolutionBlueprint) => {
    setSearchParams({ mode: 'studio', id: sol.id });
  };

  const handleCloseStudio = () => {
    setSearchParams({});
    fetchSolutions();
  };

  const [solutionToDelete, setSolutionToDelete] = useState<SolutionBlueprint | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent, sol: SolutionBlueprint) => {
    e.stopPropagation();
    setSolutionToDelete(sol);
  };

  const confirmDeleteSolution = async () => {
    if (!solutionToDelete) return;
    const sol = solutionToDelete;
    setIsDeleting(true);
    setSolutions(prev => {
      const next = prev.filter(s => s.id !== sol.id);
      builderCache.set(cacheKey, next);
      return next;
    });
    try {
      if (tenant?.id) {
        await TrashService.softDelete({
          tenantId: tenant.id,
          itemType: 'SOLUTION',
          itemId: sol.id,
          title: sol.name,
          subtitle: sol.description || `Solution Blueprint`,
          payload: sol
        });
      }
      const token = await getAuthToken();

      await fetch(`${API_BASE_URL}/api/solutions/${sol.id}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': tenant?.id || 'default-tenant',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      }).catch(() => {});
      toast.success('Solution blueprint moved to Recycling Bin');
    } catch (err) {
      console.error('Failed to delete solution from API:', err);
      toast.error('Failed to delete solution');
    } finally {
      setIsDeleting(false);
      setSolutionToDelete(null);
    }
  };

  if (isStudioActive) {
    return (
      <div className="fixed inset-0 z-[9999] bg-zinc-950 w-screen h-screen overflow-hidden">
        <NewSolutionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSelectBlank={handleSelectBlank}
          onSelectTemplate={handleSelectTemplate}
        />
        <SolutionBuilderStudio
          initialSolution={activeSolution}
          onClose={handleCloseStudio}
          onSaveSuccess={fetchSolutions}
        />
      </div>
    );
  }


  return (
    <div className="flex flex-col w-full relative min-h-[calc(100vh-4rem)] bg-zinc-50/50 dark:bg-zinc-950/50 overflow-y-auto">
      {/* New Solution Modal */}
      <NewSolutionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectBlank={handleSelectBlank}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Page Header */}
      <PageHeader
        title="Solutions"
        description="Package, deploy, and manage end-to-end solution blueprints, application bundles, and multi-module configurations."
        actions={
          <Button
            onClick={handleCreateNewClick}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Create</span>
          </Button>
        }
      />

      <div className="flex-1 px-6 lg:px-12 pt-8 pb-20 relative z-10 space-y-6">
        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            <input 
              type="text"
              placeholder="Search"
              className="w-full bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-zinc-900 dark:text-zinc-100 font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl w-full sm:w-auto">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'ACTIVE', label: 'Active' },
              { id: 'DRAFTS', label: 'Drafts' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? null : filteredSolutions.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No solutions found"
            description="Create a new solution blueprint to bundle modules, workflows, and form layouts into a deployable package."
            action={{
              label: "Create",
              onClick: handleCreateNewClick
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSolutions.map((sol, i) => (
              <motion.div
                key={sol.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03, ease: 'easeOut' }}
                onClick={() => handleEditSolutionCard(sol)}
                className="group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-3xl transition-[border-color,box-shadow,background-color] duration-200 shadow-xl shadow-black/5 dark:shadow-none hover:shadow-indigo-500/10 cursor-pointer flex flex-col justify-between h-full relative overflow-hidden min-h-[220px]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 group-hover:text-indigo-500 group-hover:border-indigo-500/30 transition-colors duration-200">
                        <Boxes size={22} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold rounded-full border border-zinc-200 dark:border-zinc-700">
                          {sol.version}
                        </span>
                        {sol.status === 'ACTIVE' && (
                          <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-wider rounded-full border border-emerald-500/20">
                            Active
                          </span>
                        )}
                        <button
                          onClick={(e) => handleDeleteClick(e, sol)}
                          className="p-2 rounded-xl bg-zinc-100/80 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 dark:bg-zinc-800/80 dark:hover:bg-red-500/20 transition-colors duration-150 opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                          title="Delete Solution"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-indigo-500 transition-colors duration-150">
                      {sol.name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {sol.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-zinc-500">
                      <span className="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300">
                        <Sparkles size={13} className="text-indigo-500" /> {Array.isArray(sol.artifacts) ? sol.artifacts.length : (sol.artifactsCount ?? 0)} Artifacts
                      </span>
                      {Array.isArray(sol.contextSources) && sol.contextSources.length > 0 && (
                        <>
                          <span className="text-zinc-300 dark:text-zinc-700">•</span>
                          <span className="flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
                            <FileText size={13} className="text-zinc-400" /> {sol.contextSources.length} Sources
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-indigo-500 group-hover:translate-x-1 transition-transform duration-150">
                      Edit in Builder <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Interactive Dashed + Create Solution Card */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: filteredSolutions.length * 0.03, ease: 'easeOut' }}
              onClick={handleCreateNewClick}
              className="group p-6 border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-indigo-500/50 rounded-3xl cursor-pointer flex flex-col items-center justify-center min-h-[220px] transition-[border-color,background-color] duration-200 text-center hover:bg-indigo-500/[0.01]"
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-indigo-500 group-hover:scale-110 transition-transform duration-200 mb-3">
                <Plus size={24} />
              </div>
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 group-hover:text-indigo-500 transition-colors duration-150">
                Create Solution
              </span>
              <p className="text-[10px] text-zinc-400 mt-1 max-w-[200px]">
                Package modules, workflows, and form layouts into a deployable bundle.
              </p>
            </motion.div>
          </div>
        )}

        <DeleteConfirmationModal
          isOpen={Boolean(solutionToDelete)}
          onClose={() => setSolutionToDelete(null)}
          onConfirm={confirmDeleteSolution}
          title="Delete Solution Blueprint"
          description="Are you sure you want to delete this solution blueprint? It will be moved to the Recycling Bin."
          itemName={solutionToDelete?.name}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
};
