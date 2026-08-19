import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bot, 
  Plus, 
  Search, 
  Trash2, 
  ArrowRight, 
  Wrench, 
  Copy 
} from 'lucide-react';
import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Primitives';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { AgentBlueprint } from '../../types/agent';
import { NewAgentModal } from '../../components/Modals/NewAgentModal';
import { AgentBuilderStudio } from '../../components/Builders/AgentBuilder/AgentBuilderStudio';
import { EmptyState } from '../../components/UI/EmptyState';
import { DeleteConfirmationModal } from '../../components/Common/DeleteConfirmationModal';
import { usePlatform } from '../../hooks/usePlatform';
import { useUsers } from '../../hooks/useUsers';
import { builderCache } from '../../utils/builderCache';
import { createDefaultAgentBlueprint } from '../../services/agentBuilderService';

export const AgentsLibraryPage: React.FC = () => {
  const { tenant, refreshMembers } = usePlatform();
  const { members } = useUsers();
  const cacheKey = `agents_${tenant?.id || 'default'}`;

  const [agents, setAgents] = useState<AgentBlueprint[]>(() => {
    const cached = builderCache.get<AgentBlueprint[]>(cacheKey) || [];
    // Filter out any template seeds
    return cached.filter(a => a && !a.id.startsWith('agent_tpl_'));
  });

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'DRAFT'>('ALL');

  // Studio & Modal states
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentBlueprint | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<AgentBlueprint | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync synthetic workforce members into agent blueprints if any exist
  useEffect(() => {
    if (members && members.length > 0) {
      const syntheticMembers = members.filter(m => m.isSynthetic);
      setAgents(prev => {
        // Clean out any lingering template seeds
        const nonTemplates = prev.filter(a => !a.id.startsWith('agent_tpl_'));
        const merged = [...nonTemplates];

        syntheticMembers.forEach(m => {
          const mName = m.name || `${m.firstName || ''} ${m.familyName || ''}`.trim() || (m as any).agentConfig?.name || 'Digital Coworker';
          const existingIdx = merged.findIndex(a => a.id === m.id || a.name === mName);
          if (existingIdx === -1) {
            const blueprintFromConfig = (m as any).agentConfig;
            merged.push(
              blueprintFromConfig ? {
                ...blueprintFromConfig,
                id: blueprintFromConfig.id || m.id,
                name: blueprintFromConfig.name || mName,
                status: blueprintFromConfig.status || 'ACTIVE'
              } : {
                ...createDefaultAgentBlueprint(mName),
                id: m.id,
                name: mName,
                roleTitle: m.role || 'Digital Coworker',
                status: 'ACTIVE',
                workforceMapping: {
                  assignedMemberId: m.id,
                  role: m.role,
                  licenceType: m.licenceType || 'AI Agent Seat'
                }
              }
            );
          }
        });
        builderCache.set(cacheKey, merged);
        return merged;
      });
    }
  }, [members, cacheKey]);

  const filteredAgents = useMemo(() => {
    return agents.filter(agent => {
      const name = agent.name || '';
      const role = agent.roleTitle || '';
      const desc = agent.description || '';
      const matchesSearch = 
        name.toLowerCase().includes(search.toLowerCase()) ||
        role.toLowerCase().includes(search.toLowerCase()) ||
        desc.toLowerCase().includes(search.toLowerCase());

      if (activeFilter === 'ACTIVE') return matchesSearch && agent.status === 'ACTIVE';
      if (activeFilter === 'DRAFT') return matchesSearch && agent.status === 'DRAFT';
      return matchesSearch;
    });
  }, [agents, search, activeFilter]);

  const handleCreateNew = () => {
    setIsNewModalOpen(true);
  };

  const handleSelectBlank = () => {
    setSelectedAgent(createDefaultAgentBlueprint());
    setIsNewModalOpen(false);
    setIsStudioOpen(true);
  };

  const handleSelectTemplate = (template: AgentBlueprint) => {
    setSelectedAgent({
      ...template,
      id: `agent_${Date.now()}`
    });
    setIsNewModalOpen(false);
    setIsStudioOpen(true);
  };

  const handleEditAgent = (agent: AgentBlueprint) => {
    setSelectedAgent(agent);
    setIsStudioOpen(true);
  };

  const handleDuplicateAgent = (e: React.MouseEvent, agent: AgentBlueprint) => {
    e.stopPropagation();
    const duplicated: AgentBlueprint = {
      ...agent,
      id: `agent_${Date.now()}`,
      name: `${agent.name} (Copy)`,
      status: 'DRAFT',
      updatedAt: new Date().toISOString()
    };
    setAgents(prev => {
      const next = [duplicated, ...prev];
      builderCache.set(cacheKey, next);
      return next;
    });
    toast.success(`Duplicated "${agent.name}"`);
  };

  const handleDeleteAgent = (e: React.MouseEvent, agent: AgentBlueprint) => {
    e.stopPropagation();
    setAgentToDelete(agent);
  };

  const confirmDelete = async () => {
    if (!agentToDelete) return;
    setIsDeleting(true);
    try {
      setAgents(prev => {
        const next = prev.filter(a => a.id !== agentToDelete.id);
        builderCache.set(cacheKey, next);
        return next;
      });
      toast.success(`Agent "${agentToDelete.name}" removed`);
    } finally {
      setIsDeleting(false);
      setAgentToDelete(null);
    }
  };

  const handleDeploySuccess = (deployedAgent: AgentBlueprint) => {
    setAgents(prev => {
      const idx = prev.findIndex(a => a.id === deployedAgent.id);
      let next: AgentBlueprint[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = deployedAgent;
      } else {
        next = [deployedAgent, ...prev];
      }
      builderCache.set(cacheKey, next);
      return next;
    });
    setIsStudioOpen(false);
    refreshMembers();
  };

  return (
    <div className="flex flex-col w-full relative min-h-[calc(100vh-4rem)] bg-zinc-50/50 dark:bg-zinc-950/50 overflow-y-auto">
      {/* Standardized PageHeader matching Forms, Workflows, Queues & Solutions */}
      <PageHeader
        title="Agents"
        description="Centralized hub for designing, grounding with knowledge, and deploying autonomous AI agents across your workspace."
        actions={
          <Button
            onClick={handleCreateNew}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Create</span>
          </Button>
        }
      />

      {/* Main Content Area */}
      <div className="flex-1 px-6 lg:px-12 pt-8 pb-20 relative z-10 space-y-6">
        {/* Search & Scope Filters matching exact builder pages */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search agents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-zinc-900 dark:text-zinc-100 font-medium"
            />
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl w-full sm:w-auto">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'ACTIVE', label: 'Active' },
              { id: 'DRAFT', label: 'Drafts' }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setActiveFilter(mode.id as any)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeFilter === mode.id
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Agent Cards Grid or Empty State */}
        {loading ? null : filteredAgents.length === 0 ? (
          <EmptyState
            icon={Bot}
            title={search ? "No agents match your search" : "No agents created yet"}
            description={
              search 
                ? "Try searching for a different keyword or clear your search query." 
                : "Construct your first autonomous coworker to triage records, execute connector tools, and automate platform actions."
            }
            action={{
              label: "Create Agent",
              onClick: handleCreateNew
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent, i) => {
              const activeToolsCount = agent.tools?.filter(t => t.enabled).length || 0;

              return (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.03, ease: 'easeOut' }}
                  onClick={() => handleEditAgent(agent)}
                  className="group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-3xl transition-[border-color,box-shadow,background-color] duration-200 shadow-xl shadow-black/5 dark:shadow-none hover:shadow-indigo-500/10 cursor-pointer flex flex-col justify-between h-full relative overflow-hidden min-h-[220px]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 group-hover:text-indigo-500 group-hover:border-indigo-500/30 transition-colors duration-200">
                          <Bot size={22} />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                            agent.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                          }`}>
                            {agent.status}
                          </span>

                          <button
                            onClick={(e) => handleDuplicateAgent(e, agent)}
                            className="p-2 rounded-xl bg-zinc-100/80 hover:bg-indigo-500/10 text-zinc-500 hover:text-indigo-500 dark:bg-zinc-800/80 dark:hover:bg-indigo-500/20 transition-colors duration-150 opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                            title="Duplicate Agent"
                          >
                            <Copy size={14} />
                          </button>

                          <button
                            onClick={(e) => handleDeleteAgent(e, agent)}
                            className="p-2 rounded-xl bg-zinc-100/80 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 dark:bg-zinc-800/80 dark:hover:bg-red-500/20 transition-colors duration-150 opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                            title="Delete Agent"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-indigo-500 transition-colors duration-150">
                        {agent.name}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {agent.description || "No description provided."}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-zinc-500 font-semibold">
                        <Wrench size={13} className="text-zinc-400" />
                        <span>{activeToolsCount} Tools</span>
                        <span className="text-zinc-300 dark:text-zinc-700">•</span>
                        <span>{agent.modelConfig?.model || 'Gemini'}</span>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-bold text-indigo-500 group-hover:translate-x-1 transition-transform duration-150">
                        Edit in Studio <ArrowRight size={14} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Dashed Create Card matching Forms, Workflows, Queues */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: filteredAgents.length * 0.03, ease: 'easeOut' }}
              onClick={handleCreateNew}
              className="group p-6 border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-indigo-500/50 rounded-3xl transition-[border-color,background-color] duration-200 cursor-pointer flex flex-col items-center justify-center text-center min-h-[220px] hover:bg-indigo-500/[0.01]"
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-indigo-500 group-hover:scale-110 transition-transform duration-200 mb-3">
                <Plus size={24} />
              </div>
              <span className="text-xs font-bold text-zinc-500 group-hover:text-indigo-500 transition-colors">
                Create New Agent
              </span>
              <span className="text-[10px] text-zinc-400 mt-1 max-w-[180px]">
                Build with conversational AI or start from an archetype template
              </span>
            </motion.div>
          </div>
        )}
      </div>

      {/* New Agent Modal */}
      <NewAgentModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSelectBlank={handleSelectBlank}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Delete Confirmation Modal */}
      {agentToDelete && (
        <DeleteConfirmationModal
          isOpen={Boolean(agentToDelete)}
          onClose={() => setAgentToDelete(null)}
          onConfirm={confirmDelete}
          title="Delete Agent"
          description={`Are you sure you want to delete "${agentToDelete.name}"? This will remove the agent from workforce handovers and workflow triggers.`}
          isDeleting={isDeleting}
        />
      )}

      {/* Fullscreen Agent Builder Studio */}
      {isStudioOpen && (
        <AgentBuilderStudio
          initialAgent={selectedAgent}
          onClose={() => setIsStudioOpen(false)}
          onDeploySuccess={handleDeploySuccess}
        />
      )}
    </div>
  );
};
