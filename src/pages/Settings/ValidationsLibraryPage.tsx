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
import { motion } from 'motion/react';

export const ValidationsLibraryPage: React.FC = () => {
  const { tenant, modules } = usePlatform();
  const [rulesets, setRulesets] = useState<ValidationRulesetEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedRuleset, setSelectedRuleset] = useState<ValidationRulesetEntity | null>(null);

  const fetchRulesets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/validations`, {
        headers: { 'x-tenant-id': tenant?.id || '' }
      });
      if (res.ok) {
        const data = await res.json();
        setRulesets(data);
      } else {
        setRulesets([
          {
            id: 'val_email_tax',
            tenantId: tenant?.id || 't1',
            name: 'Corporate Tax ID & Email Format Ruleset',
            description: 'Validates standard tax ID formats and corporate email domains.',
            scope: 'GLOBAL',
            rules: [
              { id: 'r1', name: 'Tax ID Format Check', expression: 'REGEX_MATCH(tax_id, "^[0-9]{9}$")', errorMessage: 'Tax ID must be 9 digits' }
            ]
          }
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch validation rulesets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRulesets();
  }, [tenant?.id]);

  const handleDeleteRuleset = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this validation ruleset?')) return;
    try {
      await fetch(`${API_BASE_URL}/api/validations/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenant?.id || '' }
      });
      toast.success('Validation ruleset deleted');
      setRulesets(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      toast.error('Failed to delete validation ruleset');
    }
  };

  // Extract validation rulesets defined on custom modules
  const allRulesets = React.useMemo(() => {
    const moduleRulesets: ValidationRulesetEntity[] = (modules || []).flatMap((mod: any) => {
      const items: ValidationRulesetEntity[] = [];
      const modValidations = mod.validations || mod.validationRules || mod.config?.validations;
      if (Array.isArray(modValidations) && modValidations.length > 0) {
        items.push({
          id: `mod_val_${mod.id}`,
          tenantId: tenant?.id || 't1',
          name: `${mod.name} Module Validations`,
          description: `Field & record integrity rules enforced on ${mod.name} module.`,
          scope: 'MODULE',
          rules: modValidations.map((v: any, idx: number) => ({
            id: v.id || `r_${idx}`,
            name: v.name || `${mod.name} Rule #${idx + 1}`,
            expression: v.expression || v.formula || 'true',
            errorMessage: v.errorMessage || 'Validation check failed'
          }))
        });
      }
      return items;
    });
    return [...rulesets, ...moduleRulesets];
  }, [rulesets, modules, tenant?.id]);

  const filteredRulesets = allRulesets.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) || 
    (r.description && r.description.toLowerCase().includes(search.toLowerCase()))
  );


  return (
    <div className="flex flex-col w-full relative min-h-[calc(100vh-4rem)] bg-zinc-50/50 dark:bg-zinc-950/50 overflow-y-auto">
      {/* Standardized PageHeader matching Modules & Sites */}
      <PageHeader
        title="Validations"
        description="Create and maintain reusable field and cross-entity validation rulesets."
        actions={
          <Button
            onClick={() => {
              setSelectedRuleset(null);
              setIsBuilderOpen(true);
            }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-md transition-all"
          >
            <Plus size={16} />
            <span>Create Validation</span>
          </Button>
        }
      />

      {/* Main Content Area */}
      <div className="p-6 lg:p-12 space-y-6">
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search validation rulesets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-zinc-900 dark:text-white"
          />
        </div>

        {/* Glassmorphic 3-Column Grid matching Modules & Sites */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent mb-3" />
            <p className="text-xs font-semibold">Loading validation rulesets...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRulesets.map((ruleset, i) => (
              <motion.div
                key={ruleset.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => {
                  setSelectedRuleset(ruleset);
                  setIsBuilderOpen(true);
                }}
                className="group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-3xl transition-all shadow-xl shadow-black/5 dark:shadow-none hover:shadow-indigo-500/10 cursor-pointer flex flex-col justify-between h-full relative overflow-hidden min-h-[220px]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 group-hover:text-indigo-500 group-hover:border-indigo-500/30 transition-all">
                        <ShieldCheck size={22} />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border bg-indigo-500/10 text-indigo-500 border-indigo-500/20">
                          {ruleset.scope || 'GLOBAL'}
                        </span>

                        <button
                          onClick={(e) => handleDeleteRuleset(e, ruleset.id)}
                          className="p-2 rounded-xl bg-zinc-100/80 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 dark:bg-zinc-800/80 dark:hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                          title="Delete Ruleset"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                      {ruleset.name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {ruleset.description || "No description provided."}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 font-semibold">
                      <ShieldCheck size={13} className="text-zinc-400" />
                      <span>{ruleset.rules?.length || 0} Rules</span>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-indigo-500 group-hover:translate-x-1 transition-transform">
                      Edit in Builder <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </motion.div>

            ))}

            {/* Dashed Create Card matching Custom Modules */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: filteredRulesets.length * 0.03 }}
              onClick={() => {
                setSelectedRuleset(null);
                setIsBuilderOpen(true);
              }}
              className="group p-6 border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 rounded-3xl transition-all cursor-pointer flex flex-col items-center justify-center text-center min-h-[220px]"
            >
              <div className="p-3 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:text-emerald-500 group-hover:bg-emerald-500/10 transition-all mb-3">
                <Plus size={24} />
              </div>
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                Create Validation
              </span>
              <span className="text-xs text-zinc-400 mt-1">
                Add a new validation ruleset
              </span>
            </motion.div>
          </div>
        )}
      </div>

      {/* Standalone Builder Modal */}
      <InContextBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        title={selectedRuleset ? `Edit ${selectedRuleset.name}` : 'Create Validation Ruleset'}
        subtitle="Validation Ruleset Studio"
        builderContext={{ mode: 'global' }}
      >
        <ValidationBuilder
          builderContext={{
            mode: 'global',
            onSaveSuccess: () => {
              toast.success('Validation ruleset saved!');
              setIsBuilderOpen(false);
              fetchRulesets();
            }
          }}
        />
      </InContextBuilderModal>
    </div>
  );
};
