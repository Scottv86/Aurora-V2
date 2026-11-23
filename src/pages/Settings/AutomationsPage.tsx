import React, { useState, useEffect, useMemo } from 'react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Primitives';
import { InContextBuilderModal } from '../../components/Builders/Common/InContextBuilderModal';
import { AutomationsTab } from '../../components/Builder/AutomationsTab';
import { Zap, Plus, Trash2, ArrowRight, Search } from 'lucide-react';
import { toast } from 'sonner';
import { TrashService } from '../../services/trashService';
import { flattenFields } from '../../lib/utils';
import { EmptyState } from '../../components/UI/EmptyState';
import { motion } from 'motion/react';
import { DeleteConfirmationModal } from '../../components/Common/DeleteConfirmationModal';
import { builderCache } from '../../utils/builderCache';

export const AutomationsPage: React.FC = () => {
  const { tenant, modules } = usePlatform();
  const { session } = useAuth();

  const [automations, setAutomations] = useState<any[]>(() => builderCache.get<any[]>('automations_all') || []);
  const [deletedAutomationIds, setDeletedAutomationIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(() => !builderCache.has('automations_all'));
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScope, setFilterScope] = useState<'ALL' | 'GLOBAL' | 'LOCAL'>('ALL');
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isAutomationDirty, setIsAutomationDirty] = useState(false);
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<any | null>(null);
  const [isDeletingRule, setIsDeletingRule] = useState(false);

  const selectedRule = useMemo(
    () => automations.find(a => a.id === selectedRuleId) || null,
    [automations, selectedRuleId]
  );

  const activeFields = useMemo(() => {
    const targetMod = modules?.find((m: any) => m.id === selectedRule?.moduleId);
    return targetMod ? flattenFields(targetMod.layout || []) : [];
  }, [modules, selectedRule?.moduleId]);

  const fetchAutomations = async () => {
    if (!builderCache.has('automations_all')) setLoading(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || '';
      const res = await fetch(`${API_BASE_URL}/api/automations`, {
        headers: {
          'x-tenant-id': tenant.id || '',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setAutomations(list);
        builderCache.set('automations_all', list);
      }
    } catch (err) {
      console.error('Error fetching automations:', err);
      toast.error('Failed to load automations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomations();
  }, [tenant?.id]);

  // Sync deletions queued inside AutomationsTab back to the backend
  useEffect(() => {
    if (deletedAutomationIds.length === 0) return;
    const idsToDelete = [...deletedAutomationIds];
    setDeletedAutomationIds([]);
    const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || '';
    Promise.all(
      idsToDelete.map(id =>
        fetch(`${API_BASE_URL}/api/automations/${id}`, {
          method: 'DELETE',
          headers: {
            'x-tenant-id': tenant.id || '',
            'Authorization': `Bearer ${token}`
          }
        })
      )
    )
      .then(() => fetchAutomations())
      .catch(err => console.error('Failed to delete automation:', err));
  }, [deletedAutomationIds]);

  const handleCreateRule = () => {
    const tempId = `temp-${Date.now()}`;
    const defaultModuleId = modules?.[0]?.id || null;
    const newRule = {
      id: tempId,
      name: 'New Automation',
      description: '',
      moduleId: defaultModuleId,
      scope: defaultModuleId ? 'LOCAL' : 'GLOBAL',
      inputs: { visualConditions: [], conditionMatchType: 'AND' },
      actions: [],
      triggers: [{ type: 'MODULE_EVENT', on: 'RECORD_CREATED', moduleId: defaultModuleId }],
      isActive: true,
      conditions: null
    };
    setAutomations(prev => [...prev, newRule]);
    setSelectedRuleId(tempId);
    setIsAutomationDirty(true);
    setIsStudioOpen(true);
  };

  const handleSaveRule = async (rule: any) => {
    if (!rule?.name?.trim()) {
      toast.error('Automation name is required');
      return;
    }
    setIsSavingRule(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || '';
      const isNew = String(rule.id).startsWith('temp-') || rule.id === 'new';
      const url = isNew ? `${API_BASE_URL}/api/automations` : `${API_BASE_URL}/api/automations/${rule.id}`;
      const payload = {
        name: rule.name.trim(),
        description: rule.description || '',
        moduleId: rule.moduleId || null,
        inputs: rule.inputs || {},
        actions: rule.actions || [],
        triggers: rule.triggers || [],
        isActive: rule.isActive !== false,
        conditions: rule.conditions || null
      };
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant.id || '',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save automation');
      }
      const saved = await res.json();
      setIsAutomationDirty(false);
      toast.success(isNew ? 'Automation created' : 'Automation saved');
      if (isNew && saved?.id) {
        setAutomations(prev => prev.map(a => (a.id === rule.id ? saved : a)));
        setSelectedRuleId(saved.id);
      } else {
        await fetchAutomations();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error saving automation');
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleDeleteRule = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const rule = automations.find(a => a.id === id);
    if (rule) setRuleToDelete(rule);
  };

  const confirmDeleteRule = async () => {
    if (!ruleToDelete) return;
    setIsDeletingRule(true);
    try {
      await TrashService.moveToTrash(
        tenant.id || '',
        'automation',
        ruleToDelete.id,
        ruleToDelete.name,
        {
          description: ruleToDelete.description,
          moduleId: ruleToDelete.moduleId,
          actionsCount: ruleToDelete.actions?.length || 0,
          scope: ruleToDelete.scope
        },
        session?.access_token
      );
      if (selectedRuleId === ruleToDelete.id) {
        setSelectedRuleId(null);
        setIsStudioOpen(false);
      }
      toast.success('Automation moved to Recycling Bin');
      setRuleToDelete(null);
      fetchAutomations();
    } catch (err: any) {
      toast.error(err?.message || 'Error deleting automation');
    } finally {
      setIsDeletingRule(false);
    }
  };

  const filteredCatalogRules = automations.filter(rule => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (rule.name || '').toLowerCase().includes(q) ||
      (rule.description || '').toLowerCase().includes(q);
    if (filterScope === 'GLOBAL') return matchesSearch && (!rule.moduleId || rule.scope === 'GLOBAL');
    if (filterScope === 'LOCAL') return matchesSearch && Boolean(rule.moduleId) && rule.scope !== 'GLOBAL';
    return matchesSearch;
  });

  return (
    <div className="flex flex-col w-full relative min-h-[calc(100vh-4rem)] bg-zinc-50/50 dark:bg-zinc-950/50 overflow-y-auto">
      <PageHeader
        title="Automations"
        description="Design visual trigger conditions, automated actions, and multi-step workflow rules."
        actions={
          <Button
            onClick={handleCreateRule}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Create</span>
          </Button>
        }
      />

      <div className="flex-1 px-6 lg:px-12 pt-8 pb-20 relative z-10 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-zinc-900 dark:text-zinc-100 font-medium"
            />
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl w-full sm:w-auto">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'GLOBAL', label: 'Global' },
              { id: 'LOCAL', label: 'Local' }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setFilterScope(mode.id as any)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filterScope === mode.id
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? null : filteredCatalogRules.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="No automations found"
            description="Design visual trigger conditions, automated actions, and multi-step background workflow rules."
            action={{ label: 'Create', onClick: handleCreateRule }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCatalogRules.map((rule, i) => (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03, ease: 'easeOut' }}
                onClick={() => {
                  setSelectedRuleId(rule.id);
                  setIsStudioOpen(true);
                }}
                className="group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-3xl transition-[border-color,box-shadow,background-color] duration-200 shadow-xl shadow-black/5 dark:shadow-none hover:shadow-indigo-500/10 cursor-pointer flex flex-col justify-between h-full relative overflow-hidden min-h-[220px]"
              >
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 group-hover:text-indigo-500 group-hover:border-indigo-500/30 transition-colors duration-200">
                        <Zap size={22} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                          !rule.moduleId || rule.scope === 'GLOBAL'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                        }`}>
                          {!rule.moduleId || rule.scope === 'GLOBAL' ? 'GLOBAL' : 'LOCAL'}
                        </span>
                        <button
                          onClick={(e) => handleDeleteRule(rule.id, e)}
                          className="p-2 rounded-xl bg-zinc-100/80 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 dark:bg-zinc-800/80 dark:hover:bg-red-500/20 transition-colors duration-150 opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                          title="Delete Rule"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-indigo-500 transition-colors duration-150">
                      {rule.name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {rule.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 font-semibold">
                      <Zap size={13} className="text-zinc-400" />
                      <span>{rule.actions?.length || 0} Actions</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-indigo-500 group-hover:translate-x-1 transition-transform duration-150">
                      Edit in Builder <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: filteredCatalogRules.length * 0.03, ease: 'easeOut' }}
              onClick={handleCreateRule}
              className="group p-6 border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-indigo-500/50 rounded-3xl transition-[border-color,background-color] duration-200 cursor-pointer flex flex-col items-center justify-center text-center min-h-[220px] hover:bg-indigo-500/[0.01]"
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-indigo-500 group-hover:scale-110 transition-transform duration-200 mb-3">
                <Plus size={24} />
              </div>
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 group-hover:text-indigo-500 transition-colors duration-150">
                Create Automation
              </span>
              <p className="text-[10px] text-zinc-400 mt-1 max-w-[200px]">
                Design a new background trigger rule.
              </p>
            </motion.div>
          </div>
        )}

        <InContextBuilderModal
          isOpen={isStudioOpen}
          onClose={() => {
            setIsStudioOpen(false);
            setIsAutomationDirty(false);
            setSelectedRuleId(null);
          }}
          isDirty={isAutomationDirty}
          onDiscardAndExit={() => {
            setIsAutomationDirty(false);
            setIsStudioOpen(false);
            setSelectedRuleId(null);
          }}
          title={selectedRule ? `Edit ${selectedRule.name}` : 'Create Automation Rule'}
          subtitle="Automation Studio"
          builderContext={{ mode: 'global' }}
        >
          <div className="h-full w-full overflow-hidden">
            <AutomationsTab
              mode="global"
              moduleId={selectedRule?.moduleId || undefined}
              fields={activeFields}
              automations={automations}
              setAutomations={setAutomations}
              deletedAutomationIds={deletedAutomationIds}
              setDeletedAutomationIds={setDeletedAutomationIds}
              initialSelectedRuleId={selectedRuleId}
              onSaveRule={handleSaveRule}
              isSaving={isSavingRule}
              onDirtyChange={setIsAutomationDirty}
            />
          </div>
        </InContextBuilderModal>

        <DeleteConfirmationModal
          isOpen={Boolean(ruleToDelete)}
          onClose={() => setRuleToDelete(null)}
          onConfirm={confirmDeleteRule}
          title="Delete Automation"
          description="Are you sure you want to delete this automation rule? It will be moved to the Recycling Bin."
          itemName={ruleToDelete?.name}
          isDeleting={isDeletingRule}
        />
      </div>
    </div>
  );
};
