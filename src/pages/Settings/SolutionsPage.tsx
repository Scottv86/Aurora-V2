import React, { useState, useMemo } from 'react';
import { 
  Boxes, Plus, Search, Trash2, Layers, GitBranch, ArrowRight, FileText
} from 'lucide-react';


import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Primitives';
import { InContextBuilderModal } from '../../components/Builders/Common/InContextBuilderModal';
import { motion } from 'motion/react';
import { toast } from 'sonner';


export interface SolutionBlueprint {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  modulesCount: number;
  workflowsCount: number;
  formsCount: number;
  author: string;
  updatedAt: string;
  icon: string;
}

const INITIAL_SOLUTIONS: SolutionBlueprint[] = [
  {
    id: 'sol_case_management',
    name: 'Enterprise Case & Incident Management',
    description: 'Pre-configured blueprint combining triage modules, SLA escalation workflows, intake forms, and resolution analytics.',
    category: 'Governance & Operations',
    version: 'v2.4.0',
    status: 'ACTIVE',
    modulesCount: 4,
    workflowsCount: 8,
    formsCount: 5,
    author: 'Aurora Platform Team',
    updatedAt: '2 hours ago',
    icon: 'Boxes'
  },
  {
    id: 'sol_onboarding_portal',
    name: 'Customer Onboarding & Intake Portal',
    description: 'Complete solution bundle with self-service public intake, identity validation rulesets, and automated welcome triggers.',
    category: 'Customer Experience',
    version: 'v1.8.2',
    status: 'ACTIVE',
    modulesCount: 3,
    workflowsCount: 5,
    formsCount: 6,
    author: 'Platform Architecture',
    updatedAt: '1 day ago',
    icon: 'Globe'
  },
  {
    id: 'sol_workforce_governance',
    name: 'Workforce Operations & Access Suite',
    description: 'Integrated organizational hierarchy, position assignment rules, synthetic member provisioning, and audit tracking.',
    category: 'HR & Workforce',
    version: 'v3.1.0',
    status: 'ACTIVE',
    modulesCount: 5,
    workflowsCount: 6,
    formsCount: 4,
    author: 'Governance Group',
    updatedAt: '3 days ago',
    icon: 'ShieldCheck'
  },
  {
    id: 'sol_procurement_pipeline',
    name: 'Financial Audit & Procurement Pipeline',
    description: 'Multi-stage vendor registration, purchase order approval matrix, tax validation, and invoice document generation.',
    category: 'Finance & Compliance',
    version: 'v1.0.5',
    status: 'DRAFT',
    modulesCount: 3,
    workflowsCount: 4,
    formsCount: 3,
    author: 'Finance Ops',
    updatedAt: '5 days ago',
    icon: 'Package'
  }
];

export const SolutionsPage: React.FC = () => {
  const [solutions, setSolutions] = useState<SolutionBlueprint[]>(INITIAL_SOLUTIONS);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'DRAFTS'>('ALL');

  
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedSolution, setSelectedSolution] = useState<SolutionBlueprint | null>(null);

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

  const handleCreateNew = () => {
    setSelectedSolution(null);
    setIsBuilderOpen(true);
  };

  const handleEditSolution = (sol: SolutionBlueprint) => {
    setSelectedSolution(sol);
    setIsBuilderOpen(true);
  };

  const handleDeleteSolution = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this solution blueprint?')) return;
    setSolutions(prev => prev.filter(s => s.id !== id));
    toast.success('Solution blueprint removed');
  };

  return (
    <div className="flex flex-col w-full relative min-h-[calc(100vh-4rem)] bg-zinc-50/50 dark:bg-zinc-950/50 overflow-y-auto">
      {/* Page Header */}
      <PageHeader
        title="Solution"
        description="Package, deploy, and manage end-to-end solution blueprints, application bundles, and multi-module configurations."
        actions={
          <Button
            onClick={handleCreateNew}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-md transition-all"
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
                onClick={() => handleEditSolution(sol)}
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
                      Edit in Builder <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </motion.div>

            ))}

            {/* Interactive Dashed + Create Solution Card */}
            <motion.div
              whileHover={{ y: -4 }}
              onClick={handleCreateNew}
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

      {/* In-Context Solution Blueprint Builder Modal */}
      <InContextBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        title={selectedSolution ? `Solution Blueprint: ${selectedSolution.name}` : 'New Solution Blueprint'}
        subtitle="Configure application bundle properties, module dependencies, and deployment strategy."
        builderContext={{ mode: 'in_context', hostType: 'workspace' }}
      >


        <div className="p-6 space-y-6 text-zinc-900 dark:text-zinc-100">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                Solution Name
              </label>
              <input
                type="text"
                placeholder="e.g. Enterprise HR & Onboarding Blueprint"
                defaultValue={selectedSolution?.name || ''}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500/50 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                placeholder="Provide an overview of what this solution bundle accomplishes..."
                defaultValue={selectedSolution?.description || ''}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500/50 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  Category
                </label>
                <select 
                  defaultValue={selectedSolution?.category || 'Governance & Operations'}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500/50 outline-none"
                >
                  <option value="Governance & Operations">Governance & Operations</option>
                  <option value="Customer Experience">Customer Experience</option>
                  <option value="HR & Workforce">HR & Workforce</option>
                  <option value="Finance & Compliance">Finance & Compliance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  Version
                </label>
                <input
                  type="text"
                  placeholder="v1.0.0"
                  defaultValue={selectedSolution?.version || 'v1.0.0'}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500/50 outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Bundled Assets</span>
                <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">4 Modules Included</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] font-medium text-zinc-500">
                <div className="p-2 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
                  <Layers size={14} className="text-indigo-500" /> Modules
                </div>
                <div className="p-2 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
                  <GitBranch size={14} className="text-teal-500" /> Workflows
                </div>
                <div className="p-2 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
                  <FileText size={14} className="text-purple-500" /> Forms
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              variant="secondary"
              onClick={() => setIsBuilderOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success(selectedSolution ? 'Solution blueprint updated' : 'Solution blueprint created');
                setIsBuilderOpen(false);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Save Solution Blueprint
            </Button>
          </div>
        </div>
      </InContextBuilderModal>
    </div>
  );
};
