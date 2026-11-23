import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Search, Trash2, ArrowRight } from 'lucide-react';

import { ValidationRulesetEntity } from '../../types/platform';
import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Primitives';
import { InContextBuilderModal } from '../../components/Builders/Common/InContextBuilderModal';
import { ValidationBuilder } from '../../components/Builders/ValidationBuilder/ValidationBuilder';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { motion } from 'motion/react';
import { TrashService } from '../../services/trashService';
import { DeleteConfirmationModal } from '../../components/Common/DeleteConfirmationModal';

import { EmptyState } from '../../components/UI/EmptyState';
import { builderCache } from '../../utils/builderCache';

export const ValidationsLibraryPage: React.FC = () => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const token = session?.access_token;
  const cacheKey = `validations_${tenant?.id || 'default'}`;
  const [rulesets, setRulesets] = useState<ValidationRulesetEntity[]>(() => builderCache.get<ValidationRulesetEntity[]>(cacheKey) || []);
  const [loading, setLoading] = useState(() => !builderCache.has(cacheKey));
  const [search, setSearch] = useState('');
  
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isValidationDirty, setIsValidationDirty] = useState(false);
  const [selectedRuleset, setSelectedRuleset] = useState<ValidationRulesetEntity | null>(null);

  const fetchRulesets = async () => {
    if (!tenant?.id) {
      setLoading(true);
      return;
    }
    if (!builderCache.has(cacheKey)) {
      setLoading(true);
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/validations`, {
        headers: {
          'x-tenant-id': tenant.id,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        const next = Array.isArray(data) ? data : [];
        setRulesets(next);
        builderCache.set(cacheKey, next);
      } else {
        if (!builderCache.has(cacheKey)) setRulesets([]);
      }
    } catch (err) {
      console.error('Failed to fetch validation rulesets:', err);
      if (!builderCache.has(cacheKey)) setRulesets([]);
    } finally {
      if (tenant?.id) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchRulesets();
  }, [tenant?.id, token]);

  const [rulesetToDelete, setRulesetToDelete] = useState<ValidationRulesetEntity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent, ruleset: ValidationRulesetEntity) => {
    e.stopPropagation();
    setRulesetToDelete(ruleset);
  };

  const confirmDeleteRuleset = async () => {
    if (!rulesetToDelete) return;
    const ruleset = rulesetToDelete;
    setIsDeleting(true);
    try {
      if (tenant?.id) {
        await TrashService.softDelete({
          tenantId: tenant.id,
          itemType: 'VALIDATION',
          itemId: ruleset.id,
          title: ruleset.name,
          subtitle: ruleset.description || `Validation: ${ruleset.name}`,
          payload: ruleset
        });
      }
      await fetch(`${API_BASE_URL}/api/validations/${ruleset.id}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': tenant?.id || '',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      }).catch(() => {});
      toast.success('Validation ruleset moved to Recycling Bin');
      setRulesets(prev => {
        const next = prev.filter(r => r.id !== ruleset.id);
        builderCache.set(cacheKey, next);
        return next;
      });
    } catch (err) {
      toast.error('Failed to delete validation ruleset');
    } finally {
      setIsDeleting(false);
      setRulesetToDelete(null);
    }
  };

  const [filterTab, setFilterTab] = useState<'all' | 'global' | 'module'>('all');

  const filteredRulesets = rulesets.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) || 
                          (r.description && r.description.toLowerCase().includes(search.toLowerCase())) ||
                          (r.moduleName && r.moduleName.toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;
    if (filterTab === 'global') return r.scope === 'GLOBAL';
    if (filterTab === 'module') return r.scope !== 'GLOBAL';
    return true;
  });


  return (
    <div className="flex flex-col w-full relative min-h-[calc(100vh-4rem)] bg-zinc-50/50 dark:bg-zinc-950/50 overflow-y-auto">
      {/* Standardized PageHeader matching Modules & Sites */}
      <PageHeader
        title="Rules"
        description="Create and maintain reusable field and cross-entity validation rulesets."
        actions={
          <Button
            onClick={() => {
              setSelectedRuleset(null);
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
              placeholder="Search rules..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-indigo-500 transition-colors text-zinc-900 dark:text-zinc-100 font-medium"
            />
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 p-1 rounded-lg w-full sm:w-auto">
            {[
              { id: 'all', label: 'All' },
              { id: 'global', label: 'Global Rules' },
              { id: 'module', label: 'Module Rulesets' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id as any)}
                className={`flex-1 sm:flex-initial px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  filterTab === tab.id
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Crisp 3-Column Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl min-h-[176px] flex flex-col justify-between animate-pulse"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                    <div className="w-16 h-5 rounded-md bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                  <div className="h-4 w-2/3 bg-zinc-100 dark:bg-zinc-800 rounded mb-2" />
                  <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded mb-1" />
                  <div className="h-3 w-4/5 bg-zinc-100 dark:bg-zinc-800 rounded" />
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <div className="h-3 w-16 bg-zinc-100 dark:bg-zinc-800 rounded" />
                  <div className="h-3 w-10 bg-zinc-100 dark:bg-zinc-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredRulesets.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={search ? "No rules match your search" : "No rules found"}
            description={
              search
                ? "Try searching for a different keyword or clear your search query."
                : "Configure enterprise validation constraints, regex patterns, and compliance rulesets."
            }
            action={{
              label: "Create Rule",
              onClick: () => {
                setSelectedRuleset(null);
                setIsBuilderOpen(true);
              }
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRulesets.map((ruleset, i) => (
              <motion.div
                key={ruleset.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.02, ease: 'easeOut' }}
                onClick={() => {
                  setSelectedRuleset(ruleset);
                  setIsBuilderOpen(true);
                }}
                className="group p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-500/60 rounded-xl transition-colors duration-150 cursor-pointer flex flex-col justify-between h-full relative min-h-[176px]"
              >
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-700/70 text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-center transition-colors">
                        <ShieldCheck size={18} />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                          ruleset.scope === 'GLOBAL'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60'
                        }`}>
                          {ruleset.scope === 'GLOBAL' ? 'Global' : (ruleset.moduleName || ruleset.scope || 'Module-Bound')}
                        </span>

                        <button
                          onClick={(e) => handleDeleteClick(e, ruleset)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Delete Ruleset"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {ruleset.name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {ruleset.description || "No description provided."}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                      <ShieldCheck size={13} className="text-zinc-400" />
                      <span>{ruleset.rules?.length || 0} Rules</span>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                      Edit <ArrowRight size={13} />
                    </div>
                  </div>
                </div>
              </motion.div>

            ))}

            {/* Dashed Create Card */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: filteredRulesets.length * 0.02, ease: 'easeOut' }}
              onClick={() => {
                setSelectedRuleset(null);
                setIsBuilderOpen(true);
              }}
              className="group p-5 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-400 dark:hover:border-indigo-500/60 rounded-xl transition-colors cursor-pointer flex flex-col items-center justify-center text-center min-h-[176px] hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
            >
              <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-2.5">
                <Plus size={20} />
              </div>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Create Validation Ruleset
              </span>
              <p className="text-[11px] text-zinc-400 mt-1 max-w-[200px]">
                Add a new validation ruleset.
              </p>
            </motion.div>
          </div>
        )}
      </div>

      {/* Standalone Builder Modal */}
      <InContextBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => {
          setIsBuilderOpen(false);
          setIsValidationDirty(false);
          setSelectedRuleset(null);
        }}
        isDirty={isValidationDirty}
        onDiscardAndExit={() => {
          setIsValidationDirty(false);
          setIsBuilderOpen(false);
          setSelectedRuleset(null);
        }}
        title={selectedRuleset ? `Edit ${selectedRuleset.name}` : 'Create Validation Ruleset'}
        subtitle="Validation Ruleset Studio"
        builderContext={{ mode: 'global' }}
      >
        <ValidationBuilder
          initialRuleset={selectedRuleset || undefined}
          onDirtyChange={setIsValidationDirty}
          builderContext={{
            mode: 'global',
            onSaveSuccess: () => {
              toast.success('Validation ruleset saved!');
              setIsValidationDirty(false);
              setIsBuilderOpen(false);
              fetchRulesets();
            }
          }}
        />
      </InContextBuilderModal>

      <DeleteConfirmationModal
        isOpen={Boolean(rulesetToDelete)}
        onClose={() => setRulesetToDelete(null)}
        onConfirm={confirmDeleteRuleset}
        title="Delete Validation Ruleset"
        description="Are you sure you want to delete this validation ruleset? It will be moved to the Recycling Bin."
        itemName={rulesetToDelete?.name}
        isDeleting={isDeleting}
      />
    </div>
  );
};
