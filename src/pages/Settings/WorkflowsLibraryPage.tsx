import React, { useState, useEffect } from 'react';
import { GitBranch, Plus, Search, Trash2, ArrowRight, Layers } from 'lucide-react';



import { WorkflowEntity } from '../../types/platform';
import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Primitives';
import { InContextBuilderModal } from '../../components/Builders/Common/InContextBuilderModal';
import { WorkflowBuilder } from '../../components/Builders/WorkflowBuilder/WorkflowBuilder';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';
import { usePlatform } from '../../hooks/usePlatform';
import { motion } from 'motion/react';
import { TrashService } from '../../services/trashService';
import { DeleteConfirmationModal } from '../../components/Common/DeleteConfirmationModal';

import { EmptyState } from '../../components/UI/EmptyState';
import { builderCache } from '../../utils/builderCache';

export const WorkflowsLibraryPage: React.FC = () => {
  const { tenant, modules } = usePlatform();
  const cacheKey = `workflows_${tenant?.id || 'default'}`;
  const [workflows, setWorkflows] = useState<WorkflowEntity[]>(() => builderCache.get<WorkflowEntity[]>(cacheKey) || []);
  const [loading, setLoading] = useState(() => !builderCache.has(cacheKey));
  const [search, setSearch] = useState('');
  
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowEntity | null>(null);

  const fetchWorkflows = async () => {
    if (!builderCache.has(cacheKey)) {
      setLoading(true);
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/workflows`, {
        headers: { 'x-tenant-id': tenant?.id || '' }
      });
      if (res.ok) {
        const data = await res.json();
        const next = Array.isArray(data) ? data : [];
        setWorkflows(next);
        builderCache.set(cacheKey, next);
      } else {
        setWorkflows([
          {
            id: 'wf_approval',
            tenantId: tenant?.id || 't1',
            name: 'Multi-Step Approval Workflow',
            description: 'Automated manager approval & notification chain.',
            isGlobal: true,
            triggerType: 'RECORD_EVENT',
            version: 1,
            status: 'PUBLISHED',
            nodes: [
              { id: 'start', type: 'START', name: 'Record Submitted', position: { x: 100, y: 150 } },
              { id: 'approval', type: 'DECISION', name: 'Manager Approval', position: { x: 300, y: 150 } },
              { id: 'end', type: 'END', name: 'Complete Process', position: { x: 500, y: 150 } }
            ],
            edges: [
              { id: 'e1', source: 'start', target: 'approval' },
              { id: 'e2', source: 'approval', target: 'end' }
            ]
          }
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [tenant?.id]);

  const [workflowToDelete, setWorkflowToDelete] = useState<WorkflowEntity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent, wf: WorkflowEntity) => {
    e.stopPropagation();
    setWorkflowToDelete(wf);
  };

  const confirmDeleteWorkflow = async () => {
    if (!workflowToDelete) return;
    const wf = workflowToDelete;
    setIsDeleting(true);
    try {
      if (tenant?.id) {
        await TrashService.softDelete({
          tenantId: tenant.id,
          itemType: 'WORKFLOW',
          itemId: wf.id,
          title: wf.name,
          subtitle: wf.description || `Workflow: ${wf.name}`,
          payload: wf
        });
      }
      await fetch(`${API_BASE_URL}/api/workflows/${wf.id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenant?.id || '' }
      }).catch(() => {});
      toast.success('Workflow moved to Recycling Bin');
      setWorkflows(prev => {
        const next = prev.filter(w => w.id !== wf.id);
        builderCache.set(cacheKey, next);
        return next;
      });
    } catch (err) {
      toast.error('Failed to delete workflow');
    } finally {
      setIsDeleting(false);
      setWorkflowToDelete(null);
    }
  };

  // Extract workflows embedded inside custom modules
  const allWorkflows = React.useMemo(() => {
    const moduleWorkflows: WorkflowEntity[] = (modules || []).flatMap((mod: any) => {
      const items: WorkflowEntity[] = [];
      const modWfs = mod.workflows || mod.config?.workflows;
      if (Array.isArray(modWfs)) {
        modWfs.forEach((wf: any, i: number) => {
          items.push({
            id: wf.id || `mod_wf_${mod.id}_${i}`,
            tenantId: tenant?.id || 't1',
            name: wf.name || `${mod.name} Process Flow`,
            description: wf.description || `Automated workflow associated with ${mod.name} module.`,
            isGlobal: false,
            moduleId: mod.id,
            moduleName: mod.name,
            triggerType: wf.triggerType || 'RECORD_EVENT',
            version: wf.version || 1,
            status: wf.status || 'PUBLISHED',
            nodes: wf.nodes || [],
            edges: wf.edges || []
          });
        });
      }
      return items;
    });
    return [...workflows, ...moduleWorkflows];
  }, [workflows, modules, tenant?.id]);

  const [filterTab, setFilterTab] = useState<'all' | 'global' | 'module'>('all');

  const filteredWorkflows = allWorkflows.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(search.toLowerCase()) || 
                          (w.description && w.description.toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;
    if (filterTab === 'global') return w.isGlobal;
    if (filterTab === 'module') return !w.isGlobal;
    return true;
  });


  return (
    <div className="flex flex-col w-full relative min-h-[calc(100vh-4rem)] bg-zinc-50/50 dark:bg-zinc-950/50 overflow-y-auto">
      {/* Standardized PageHeader matching Modules & Sites */}
      <PageHeader
        title="Workflows"
        description="Visual graph studio for building and managing automated process chains across your platform."
        actions={
          <Button
            onClick={() => {
              setSelectedWorkflow(null);
              setIsBuilderOpen(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Create</span>
          </Button>
        }
      />

      {/* Main Content Area */}
      <div className="flex-1 px-6 lg:px-12 pt-8 pb-20 relative z-10 space-y-6">
        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-zinc-900 dark:text-zinc-100 font-medium"
            />
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl w-full sm:w-auto">
            {[
              { id: 'all', label: 'All' },
              { id: 'global', label: 'Global Flows' },
              { id: 'module', label: 'Module Processes' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id as any)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filterTab === tab.id
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Glassmorphic 3-Column Grid matching Modules & Sites */}
        {loading ? null : filteredWorkflows.length === 0 ? (
          <EmptyState
            icon={GitBranch}
            title="No workflows found"
            description="Create multi-node visual workflows, trigger automations, and manage business logic graphs."
            action={{
              label: "Create",
              onClick: () => {
                setSelectedWorkflow(null);
                setIsBuilderOpen(true);
              }
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkflows.map((wf, i) => (
              <motion.div
                key={wf.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03, ease: 'easeOut' }}
                onClick={() => {
                  setSelectedWorkflow(wf);
                  setIsBuilderOpen(true);
                }}
                className="group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-3xl transition-[border-color,box-shadow,background-color] duration-200 shadow-xl shadow-black/5 dark:shadow-none hover:shadow-indigo-500/10 cursor-pointer flex flex-col justify-between h-full relative overflow-hidden min-h-[220px]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 group-hover:text-indigo-500 group-hover:border-indigo-500/30 transition-colors duration-200">
                        <GitBranch size={22} />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                          {wf.status || 'PUBLISHED'}
                        </span>

                        <button
                          onClick={(e) => handleDeleteClick(e, wf)}
                          className="p-2 rounded-xl bg-zinc-100/80 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 dark:bg-zinc-800/80 dark:hover:bg-red-500/20 transition-colors duration-150 opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                          title="Delete Workflow"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-indigo-500 transition-colors duration-150">
                      {wf.name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {wf.description || "No description provided."}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 font-semibold">
                      <Layers size={13} className="text-zinc-400" />
                      <span>{wf.nodes?.length || 0} Nodes</span>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-indigo-500 group-hover:translate-x-1 transition-transform duration-150">
                      Edit in Builder <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </motion.div>

            ))}

            {/* Dashed Create Card matching Custom Modules */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: filteredWorkflows.length * 0.03, ease: 'easeOut' }}
              onClick={() => {
                setSelectedWorkflow(null);
                setIsBuilderOpen(true);
              }}
              className="group p-6 border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-indigo-500/50 rounded-3xl transition-[border-color,background-color] duration-200 cursor-pointer flex flex-col items-center justify-center text-center min-h-[220px] hover:bg-indigo-500/[0.01]"
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-indigo-500 group-hover:scale-110 transition-transform duration-200 mb-3">
                <Plus size={24} />
              </div>
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 group-hover:text-indigo-500 transition-colors duration-150">
                Create Workflow
              </span>
              <p className="text-[10px] text-zinc-400 mt-1 max-w-[200px]">
                Design a new process graph workflow.
              </p>
            </motion.div>
          </div>
        )}
      </div>

      {/* Standalone Workflow Builder Modal */}
      <InContextBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        title={selectedWorkflow ? `Edit ${selectedWorkflow.name}` : 'Create New Workflow'}
        subtitle="Visual Workflow Graph Canvas"
        builderContext={{ mode: 'global' }}
      >
        <WorkflowBuilder
          initialWorkflow={selectedWorkflow || undefined}
          builderContext={{
            mode: 'global',
            onSaveSuccess: (_id, savedWf) => {
              toast.success(`Workflow "${savedWf.name}" saved!`);
              setIsBuilderOpen(false);
              fetchWorkflows();
            }
          }}
        />
      </InContextBuilderModal>

      <DeleteConfirmationModal
        isOpen={Boolean(workflowToDelete)}
        onClose={() => setWorkflowToDelete(null)}
        onConfirm={confirmDeleteWorkflow}
        title="Delete Workflow"
        description="Are you sure you want to delete this workflow? It will be moved to the Recycling Bin."
        itemName={workflowToDelete?.name}
        isDeleting={isDeleting}
      />
    </div>
  );
};
