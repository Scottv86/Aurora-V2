import React, { useState, useEffect, useMemo } from 'react';
import { 
  Target, Plus, Search, Trash2, Edit2, Copy, RefreshCw 
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Primitives';
import { EmptyState } from '../../components/UI/EmptyState';
import { DeleteConfirmationModal } from '../../components/Common/DeleteConfirmationModal';
import { KpiCard } from '../../components/UI/KpiCard';
import { KpiBuilder } from '../../components/Builders/KpiBuilder/KpiBuilder';
import { KpiDefinition, KpiEvaluationResult } from '../../types/kpi';
import { KpiService } from '../../services/kpiService';
import { usePlatform } from '../../hooks/usePlatform';
import { TrashService } from '../../services/trashService';

export const KpiLibraryPage: React.FC = () => {
  const { tenant } = usePlatform();
  const tenantId = tenant?.id || 't1';

  const [kpis, setKpis] = useState<KpiDefinition[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, KpiEvaluationResult>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'DRAFT'>('all');

  // Studio & Modal State
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState<KpiDefinition | null>(null);
  const [kpiToDelete, setKpiToDelete] = useState<KpiDefinition | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch KPIs
  const loadKpis = async () => {
    setLoading(true);
    try {
      const data = await KpiService.getKpis(tenantId);
      
      // If none found in DB yet, provide realistic sample default KPIs
      if (data.length === 0) {
        const seedSamples: Partial<KpiDefinition>[] = [
          {
            name: 'Monthly Revenue',
            slug: 'monthly-revenue',
            description: 'Total revenue closed in the current calendar month.',
            category: 'Sales',
            iconName: 'DollarSign',
            sourceType: 'module_record',
            sourceConfig: {
              aggregateType: 'sum',
              aggregateField: 'amount',
              filters: [{ id: '1', fieldId: 'stage', operator: 'equals', value: 'Closed Won' }]
            },
            format: 'currency',
            formatOptions: { currencyCode: 'USD', decimalPrecision: 0, compactNotation: true },
            trendDirection: 'higher_is_better',
            targetValue: 125000,
            thresholds: [
              { condition: 'gte', value: 125000, color: 'emerald', label: 'Target Met' },
              { condition: 'lt', value: 80000, color: 'rose', label: 'Below Target' }
            ],
            timeHorizon: 'mtd',
            status: 'ACTIVE'
          },
          {
            name: 'Urgent Backlog Tickets',
            slug: 'urgent-backlog-tickets',
            description: 'Open support tickets with High or Urgent SLA priority.',
            category: 'Support',
            iconName: 'Flame',
            sourceType: 'module_record',
            sourceConfig: {
              aggregateType: 'count',
              filters: [{ id: '1', fieldId: 'priority', operator: 'equals', value: 'urgent' }]
            },
            format: 'number',
            trendDirection: 'lower_is_better',
            targetValue: 10,
            thresholds: [
              { condition: 'gt', value: 15, color: 'rose', label: 'Critical Backlog' },
              { condition: 'lte', value: 5, color: 'emerald', label: 'Healthy' }
            ],
            timeHorizon: 'all_time',
            status: 'ACTIVE'
          },
          {
            name: 'Lead Conversion Rate',
            slug: 'lead-conversion-rate',
            description: 'Percentage of inbound leads converted to active opportunities.',
            category: 'Marketing',
            iconName: 'Percent',
            sourceType: 'formula',
            format: 'percentage',
            formatOptions: { decimalPrecision: 1 },
            trendDirection: 'higher_is_better',
            targetValue: 25,
            thresholds: [
              { condition: 'gte', value: 25, color: 'emerald', label: 'High Velocity' },
              { condition: 'lt', value: 15, color: 'amber', label: 'Needs Optimization' }
            ],
            timeHorizon: 'mtd',
            status: 'ACTIVE'
          }
        ];

        // Save seed samples
        const createdSeed = await Promise.all(seedSamples.map(s => KpiService.saveKpi(tenantId, s)));
        setKpis(createdSeed);
        evaluateBatch(createdSeed);
      } else {
        setKpis(data);
        evaluateBatch(data);
      }
    } catch (err) {
      console.error('Failed to load KPIs:', err);
      toast.error('Failed to load KPI metrics');
    } finally {
      setLoading(false);
    }
  };

  const evaluateBatch = async (list: KpiDefinition[]) => {
    const results: Record<string, KpiEvaluationResult> = {};
    await Promise.all(
      list.map(async (k) => {
        try {
          const res = await KpiService.evaluateKpi(tenantId, k.id);
          results[k.id] = res;
        } catch (e) {
          console.warn(`Evaluation failed for KPI ${k.id}:`, e);
        }
      })
    );
    setEvaluations(results);
  };

  useEffect(() => {
    loadKpis();
  }, [tenantId]);

  // Filtered list
  const filteredKpis = useMemo(() => {
    return kpis.filter(k => {
      const matchSearch = !search || 
        k.name.toLowerCase().includes(search.toLowerCase()) ||
        k.description?.toLowerCase().includes(search.toLowerCase()) ||
        k.category?.toLowerCase().includes(search.toLowerCase());
      
      const matchStatus = statusFilter === 'all' || k.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [kpis, search, statusFilter]);

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!kpiToDelete) return;
    setIsDeleting(true);
    try {
      await KpiService.deleteKpi(tenantId, kpiToDelete.id);
      
      // Log in Trash
      await TrashService.softDelete({
        tenantId,
        itemType: 'KPI',
        itemId: kpiToDelete.id,
        title: kpiToDelete.name,
        payload: kpiToDelete
      });

      toast.success(`KPI "${kpiToDelete.name}" deleted`);
      setKpis(kpis.filter(k => k.id !== kpiToDelete.id));
      setKpiToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete KPI');
    } finally {
      setIsDeleting(false);
    }
  };

  // Duplicate / Clone Action
  const handleClone = async (kpi: KpiDefinition) => {
    try {
      const cloned = await KpiService.saveKpi(tenantId, {
        ...kpi,
        id: undefined,
        name: `${kpi.name} (Copy)`,
        slug: `${kpi.slug}-copy-${Date.now().toString().slice(-4)}`,
        status: 'DRAFT'
      });
      toast.success('KPI cloned as draft');
      setKpis([cloned, ...kpis]);
    } catch (err: any) {
      toast.error('Failed to clone KPI');
    }
  };

  return (
    <div className="flex flex-col w-full relative min-h-[calc(100vh-4rem)] bg-zinc-50/50 dark:bg-zinc-950/50 overflow-y-auto">
      {/* Standardized PageHeader matching Queries, Forms, Queues, Workflows */}
      <PageHeader
        title="Metrics"
        description="Centralized studio for defining semantic business metrics, formula aggregations, target goals, and alert thresholds."
        actions={
          <Button
            onClick={() => {
              setSelectedKpi(null);
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
        
        {/* Search & Scope Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search metrics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-zinc-900 dark:text-zinc-100 font-medium"
            />
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl w-full sm:w-auto">
            {[
              { id: 'all', label: 'All' },
              { id: 'ACTIVE', label: 'Active' },
              { id: 'DRAFT', label: 'Drafts' }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setStatusFilter(mode.id as any)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  statusFilter === mode.id
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading Skeletons */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 rounded-3xl border border-zinc-200/60 dark:border-white/5 bg-white/40 dark:bg-white/[0.02] animate-pulse p-6" />
            ))}
          </div>
        ) : filteredKpis.length === 0 ? (
          <EmptyState
            icon={Target}
            title={search ? "No metrics match your search" : "No metrics created yet"}
            description={
              search 
                ? "Try searching for a different keyword or clear your search query." 
                : "Define semantic business metrics, formula aggregations, target goals, and alert thresholds."
            }
            action={{
              label: "Create Metric",
              onClick: () => {
                setSelectedKpi(null);
                setIsBuilderOpen(true);
              }
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredKpis.map((kpi, i) => {
              const evalRes = evaluations[kpi.id];
              return (
                <motion.div
                  key={kpi.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.03, ease: 'easeOut' }}
                  className="relative group h-full"
                >
                  {/* KPI Card */}
                  <KpiCard
                    kpiDefinition={kpi}
                    evaluationResult={evalRes}
                    className="h-full"
                    onClick={() => {
                      setSelectedKpi(kpi);
                      setIsBuilderOpen(true);
                    }}
                  />

                  {/* Hover Quick Action Buttons */}
                  <div className="absolute top-4 right-4 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-1 shadow-md">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedKpi(kpi);
                        setIsBuilderOpen(true);
                      }}
                      title="Edit Metric"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClone(kpi);
                      }}
                      title="Duplicate Metric"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setKpiToDelete(kpi);
                      }}
                      title="Delete Metric"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

      </div>

      {/* KPI Builder Studio Modal */}
      {isBuilderOpen && (
        <KpiBuilder
          initialKpi={selectedKpi}
          onClose={() => setIsBuilderOpen(false)}
          onSaveSuccess={() => {
            loadKpis();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!kpiToDelete}
        title="Delete Metric"
        description={`Are you sure you want to delete the metric "${kpiToDelete?.name}"? Any dashboards, reports, or ribbons referencing this metric will be affected.`}
        itemName={kpiToDelete?.name}
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setKpiToDelete(null)}
      />

    </div>
  );
};
