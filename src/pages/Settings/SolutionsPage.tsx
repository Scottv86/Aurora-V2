import React, { useState, useMemo } from 'react';
import { 
  Boxes, Plus, Search, Trash2, Layers, GitBranch, ArrowRight
} from 'lucide-react';

import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Primitives';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { SolutionBlueprint } from '../../types/solutions';
import { NewSolutionModal, TEMPLATE_SOLUTIONS } from '../../components/Modals/NewSolutionModal';
import { SolutionBuilderStudio } from '../../components/Builders/SolutionBuilder/SolutionBuilderStudio';

export const SolutionsPage: React.FC = () => {
  const [solutions, setSolutions] = useState<SolutionBlueprint[]>(TEMPLATE_SOLUTIONS);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'DRAFTS'>('ALL');

  // Modal & Studio States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStudioActive, setIsStudioActive] = useState(false);
  const [activeSolution, setActiveSolution] = useState<SolutionBlueprint | null>(null);

  const filteredSolutions = useMemo(() => {
    return solutions.filter(sol => {
      const matchesSearch = sol.name.toLowerCase().includes(search.toLowerCase()) || 
                            sol.description.toLowerCase().includes(search.toLowerCase()) ||
                            sol.category.toLowerCase().includes(search.toLowerCase());
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
    setActiveSolution(null);
    setIsStudioActive(true);
  };

  const handleSelectTemplate = (template: SolutionBlueprint) => {
    setIsModalOpen(false);
    setActiveSolution(template);
    setIsStudioActive(true);
  };

  const handleEditSolutionCard = (sol: SolutionBlueprint) => {
    setActiveSolution(sol);
    setIsStudioActive(true);
  };

  const handleDeleteSolution = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this solution blueprint?')) return;
    setSolutions(prev => prev.filter(s => s.id !== id));
    toast.success('Solution blueprint removed');
  };

  if (isStudioActive) {
    return (
      <SolutionBuilderStudio
        initialSolution={activeSolution}
        onClose={() => setIsStudioActive(false)}
      />
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
        title="Solution"
        description="Package, deploy, and manage end-to-end solution blueprints, application bundles, and multi-module configurations."
        actions={
          <Button
            onClick={handleCreateNewClick}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Create Solution</span>
          </Button>
        }
      />

      <div className="p-6 lg:p-12 space-y-6">
        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            <input 
              type="text"
              placeholder="Search solutions & blueprints..."
              className="w-full bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-zinc-900 dark:text-zinc-100 font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl w-full sm:w-auto">
            {(['ALL', 'ACTIVE', 'DRAFTS'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {tab.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Glassmorphic Grid */}
        {filteredSolutions.length === 0 ? (
          <div className="p-16 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl text-center space-y-4 bg-white/20 dark:bg-white/[0.005]">
            <Boxes size={36} className="text-zinc-400 mx-auto" />
            <div>
              <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No solutions found</h4>
              <p className="text-xs text-zinc-500 mt-1">Create a new solution blueprint to bundle modules and workflows.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSolutions.map((sol) => (
              <motion.div
                key={sol.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => handleEditSolutionCard(sol)}
                className="group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-3xl transition-all shadow-xl shadow-black/5 dark:shadow-none hover:shadow-indigo-500/10 cursor-pointer flex flex-col justify-between h-full relative overflow-hidden min-h-[220px]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 group-hover:text-indigo-500 group-hover:border-indigo-500/30 transition-all">
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
                          onClick={(e) => handleDeleteSolution(e, sol.id)}
                          className="p-2 rounded-xl bg-zinc-100/80 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 dark:bg-zinc-800/80 dark:hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                          title="Delete Solution"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                      {sol.name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {sol.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-zinc-500">
                      <span className="flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
                        <Layers size={13} className="text-zinc-400" /> {sol.modulesCount} Modules
                      </span>
                      <span className="text-zinc-300 dark:text-zinc-700">•</span>
                      <span className="flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
                        <GitBranch size={13} className="text-zinc-400" /> {sol.workflowsCount} Flows
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-indigo-500 group-hover:translate-x-1 transition-transform">
                      Open Solution Studio <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Interactive Dashed + Create Solution Card */}
            <motion.div
              whileHover={{ y: -4 }}
              onClick={handleCreateNewClick}
              className="group p-6 border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-indigo-500/50 rounded-3xl cursor-pointer flex flex-col items-center justify-center min-h-[220px] transition-all text-center hover:bg-indigo-500/[0.01]"
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-indigo-500 group-hover:scale-110 transition-all mb-3">
                <Plus size={24} />
              </div>
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 group-hover:text-indigo-500 transition-colors">
                Create Solution Blueprint
              </span>
              <p className="text-[10px] text-zinc-400 mt-1 max-w-[200px]">
                Package modules, workflows, and form layouts into a deployable bundle.
              </p>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};
