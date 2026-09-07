import React, { useState, useEffect, useMemo } from 'react';
import { 
  Target, Plus, Trash2, Save, RefreshCw, Layers, Database, 
  Sliders, Palette, Sparkles, Code, AlertTriangle
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../UI/Primitives';
import { KpiCard } from '../../UI/KpiCard';
import { KpiDefinition, KpiFilterCondition, KpiThresholdRule, KpiEvaluationResult } from '../../../types/kpi';
import { KpiService } from '../../../services/kpiService';
import { usePlatform } from '../../../hooks/usePlatform';
import { cn } from '../../../lib/utils';
import { UnsavedChangesModal } from '../../Common/UnsavedChangesModal';

export interface KpiBuilderProps {
  initialKpi?: KpiDefinition | null;
  onClose: () => void;
  onSaveSuccess?: (saved: KpiDefinition) => void;
}

const AVAILABLE_ICONS = [
  'Target', 'TrendingUp', 'TrendingDown', 'DollarSign', 'Percent', 'Users', 
  'Activity', 'CheckCircle2', 'Flame', 'Zap', 'BarChart2', 'PieChart', 
  'Clock', 'Shield', 'Layers', 'Boxes', 'ShoppingBag', 'FileText'
];

export const KpiBuilder: React.FC<KpiBuilderProps> = ({
  initialKpi,
  onClose,
  onSaveSuccess
}) => {
  const { tenant, modules = [] } = usePlatform();
  const tenantId = tenant?.id || 't1';

  // Active Studio Tab
  const [activeTab, setActiveTab] = useState<'source' | 'targets' | 'formatting' | 'automations'>('source');

  // Form State
  const [name, setName] = useState(initialKpi?.name || 'New Business Metric');
  const [slug, setSlug] = useState(initialKpi?.slug || '');
  const [description, setDescription] = useState(initialKpi?.description || '');
  const [category, setCategory] = useState(initialKpi?.category || 'Operations');
  const [iconName, setIconName] = useState(initialKpi?.iconName || 'Target');
  const [status, setStatus] = useState<'ACTIVE' | 'DRAFT' | 'ARCHIVED'>(initialKpi?.status || 'ACTIVE');

  // Source Configuration
  const [sourceType, setSourceType] = useState<KpiDefinition['sourceType']>(initialKpi?.sourceType || 'module_record');
  const [moduleId, setModuleId] = useState(initialKpi?.sourceConfig?.moduleId || '');
  const [aggregateType, setAggregateType] = useState(initialKpi?.sourceConfig?.aggregateType || 'count');
  const [aggregateField, setAggregateField] = useState(initialKpi?.sourceConfig?.aggregateField || '');
  const [timeHorizon, setTimeHorizon] = useState<KpiDefinition['timeHorizon']>(initialKpi?.timeHorizon || 'all_time');
  const [filters, setFilters] = useState<KpiFilterCondition[]>(initialKpi?.sourceConfig?.filters || []);

  // Targets & Thresholds
  const [targetValue, setTargetValue] = useState<number | undefined>(initialKpi?.targetValue ?? undefined);
  const [trendDirection, setTrendDirection] = useState<KpiDefinition['trendDirection']>(initialKpi?.trendDirection || 'higher_is_better');
  const [thresholds, setThresholds] = useState<KpiThresholdRule[]>(initialKpi?.thresholds || [
    { id: '1', condition: 'gte', value: 80, color: 'emerald', label: 'Optimal' },
    { id: '2', condition: 'lt', value: 50, color: 'rose', label: 'Critical' }
  ]);

  // Formatting Options
  const [format, setFormat] = useState<KpiDefinition['format']>(initialKpi?.format || 'number');
  const [currencyCode, setCurrencyCode] = useState(initialKpi?.formatOptions?.currencyCode || 'USD');
  const [decimalPrecision, setDecimalPrecision] = useState<number>(initialKpi?.formatOptions?.decimalPrecision ?? 0);
  const [prefix, setPrefix] = useState(initialKpi?.formatOptions?.prefix || '');
  const [suffix, setSuffix] = useState(initialKpi?.formatOptions?.suffix || '');
  const [compactNotation, setCompactNotation] = useState(initialKpi?.formatOptions?.compactNotation || false);

  // Live Preview State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [previewResult, setPreviewResult] = useState<KpiEvaluationResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Available Modules
  const availableModules = useMemo(() => {
    return modules.map((m: any) => ({
      id: m.id,
      name: m.name,
      fields: m.config?.fields || []
    }));
  }, [modules]);

  // Selected Module Schema
  const selectedModule = useMemo(() => {
    return availableModules.find((m: any) => m.id === moduleId) || availableModules[0];
  }, [availableModules, moduleId]);

  // Auto set module ID if unset
  useEffect(() => {
    if (!moduleId && availableModules.length > 0) {
      setModuleId(availableModules[0].id);
    }
  }, [availableModules, moduleId]);

  // Current Draft Object
  const currentDraft: Partial<KpiDefinition> = useMemo(() => ({
    id: initialKpi?.id,
    tenantId,
    name,
    slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    description,
    category,
    iconName,
    sourceType,
    sourceConfig: {
      moduleId,
      moduleSlug: selectedModule?.name,
      aggregateType,
      aggregateField,
      filters
    },
    format,
    formatOptions: {
      currencyCode,
      decimalPrecision,
      prefix,
      suffix,
      compactNotation
    },
    trendDirection,
    targetValue: targetValue !== undefined && !isNaN(targetValue) ? Number(targetValue) : null,
    thresholds,
    timeHorizon,
    isGlobal: false,
    status
  }), [
    initialKpi, tenantId, name, slug, description, category, iconName,
    sourceType, moduleId, selectedModule, aggregateType, aggregateField, filters,
    format, currencyCode, decimalPrecision, prefix, suffix, compactNotation,
    trendDirection, targetValue, thresholds, timeHorizon, status
  ]);

  // Evaluate Draft Live
  const runDraftEvaluation = async () => {
    setIsEvaluating(true);
    try {
      const res = await KpiService.evaluateDraftKpi(tenantId, currentDraft);
      setPreviewResult(res);
    } catch (err) {
      console.warn('Evaluation failed:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Run evaluation on mount and when key properties change
  useEffect(() => {
    const timer = setTimeout(() => {
      runDraftEvaluation();
    }, 300);
    return () => clearTimeout(timer);
  }, [name, format, currencyCode, decimalPrecision, targetValue, aggregateType, aggregateField, timeHorizon, thresholds, filters]);

  // Mark dirty
  useEffect(() => {
    setIsDirty(true);
  }, [name, description, category, iconName, sourceType, moduleId, aggregateType, aggregateField, timeHorizon, filters, targetValue, thresholds, format, currencyCode, decimalPrecision]);

  // Add Filter Rule
  const handleAddFilter = () => {
    setFilters([
      ...filters,
      {
        id: `f_${Date.now()}`,
        fieldId: selectedModule?.fields?.[0]?.id || 'status',
        operator: 'equals',
        value: ''
      }
    ]);
  };

  // Remove Filter Rule
  const handleRemoveFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id));
  };

  // Update Filter Rule
  const handleUpdateFilter = (id: string, updates: Partial<KpiFilterCondition>) => {
    setFilters(filters.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  // Add Threshold Rule
  const handleAddThreshold = () => {
    setThresholds([
      ...thresholds,
      {
        id: `t_${Date.now()}`,
        condition: 'gte',
        value: 100,
        color: 'emerald',
        label: 'Goal Met'
      }
    ]);
  };

  // Remove Threshold Rule
  const handleRemoveThreshold = (idx: number) => {
    setThresholds(thresholds.filter((_, i) => i !== idx));
  };

  // Save KPI
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Metric name is required');
      return;
    }
    setIsSaving(true);
    try {
      const saved = await KpiService.saveKpi(tenantId, currentDraft);
      toast.success(initialKpi ? 'KPI Metric updated successfully!' : 'KPI Metric created successfully!');
      setIsDirty(false);
      if (onSaveSuccess) onSaveSuccess(saved);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save KPI metric');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 lg:p-6 overflow-hidden">
      <div className="flex flex-col w-full h-full max-w-7xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Studio Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-xl">
              <Target size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="text-lg font-bold text-white bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-indigo-500 focus:outline-none px-1 rounded transition-colors"
                  placeholder="Metric Name (e.g. Total Revenue Q3)"
                />
                <button
                  type="button"
                  onClick={() => setStatus(status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE')}
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider cursor-pointer",
                    status === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-zinc-800 text-zinc-400 border-zinc-700"
                  )}
                >
                  {status}
                </button>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Define calculations, targets, status rules, and preview live across surfaces.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (isDirty) setShowUnsavedModal(true);
                else onClose();
              }}
              className="text-zinc-300 border-zinc-700 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
            >
              {isSaving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
              <span>Save Metric</span>
            </Button>
          </div>
        </div>

        {/* Studio Body: Split Left Config + Right Live Preview */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Left Configuration Pane */}
          <div className="flex-1 flex flex-col border-r border-zinc-800 bg-zinc-950 overflow-y-auto">
            
            {/* Tabs Navigation */}
            <div className="flex border-b border-zinc-800 bg-zinc-900/40 px-6 gap-6">
              {[
                { id: 'source', label: 'Data Source & Math', icon: Database },
                { id: 'targets', label: 'Targets & Thresholds', icon: Sliders },
                { id: 'formatting', label: 'Display & Formatting', icon: Palette },
                { id: 'automations', label: 'Workflows & Alerts', icon: Sparkles }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "flex items-center gap-2 py-3.5 text-xs font-semibold border-b-2 transition-colors",
                      isActive 
                        ? "border-indigo-500 text-indigo-400" 
                        : "border-transparent text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <Icon size={15} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            <div className="p-6 space-y-6">
              
              {/* TAB 1: DATA SOURCE & AGGREGATION */}
              {activeTab === 'source' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  
                  {/* Source Type Selector */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                      Metric Source Type
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: 'module_record', label: 'Module Records', desc: 'Aggregate data from standard or custom objects', icon: Layers },
                        { id: 'saved_query', label: 'Saved Query', desc: 'Virtual dataset from Query Builder', icon: Database },
                        { id: 'formula', label: 'Custom Formula', desc: 'Math across multiple metrics', icon: Code }
                      ].map(st => {
                        const Icon = st.icon;
                        const isSelected = sourceType === st.id;
                        return (
                          <div
                            key={st.id}
                            onClick={() => setSourceType(st.id as any)}
                            className={cn(
                              "p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between",
                              isSelected 
                                ? "bg-indigo-600/10 border-indigo-500 text-white" 
                                : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                            )}
                          >
                            <div className="flex items-center gap-2 mb-1.5">
                              <Icon size={16} className={isSelected ? "text-indigo-400" : "text-zinc-500"} />
                              <span className="text-xs font-bold text-zinc-100">{st.label}</span>
                            </div>
                            <span className="text-[11px] text-zinc-500 leading-snug">{st.desc}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Module & Field Selection */}
                  {sourceType === 'module_record' && (
                    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Target Module</label>
                          <select
                            value={moduleId}
                            onChange={e => setModuleId(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-indigo-500"
                          >
                            {availableModules.map((m: any) => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Aggregation Operation</label>
                          <select
                            value={aggregateType}
                            onChange={e => setAggregateType(e.target.value as any)}
                            className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="count">COUNT (Total Records)</option>
                            <option value="sum">SUM (Total Amount / Value)</option>
                            <option value="avg">AVERAGE (Mean)</option>
                            <option value="min">MIN (Lowest Value)</option>
                            <option value="max">MAX (Highest Value)</option>
                            <option value="median">MEDIAN</option>
                          </select>
                        </div>
                      </div>

                      {aggregateType !== 'count' && (
                        <div>
                          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Numeric Target Field</label>
                          <select
                            value={aggregateField}
                            onChange={e => setAggregateField(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="">Select numeric field...</option>
                            {selectedModule?.fields?.map((f: any) => (
                              <option key={f.id} value={f.id}>{f.label || f.name} ({f.type})</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Time Horizon</label>
                        <select
                          value={timeHorizon}
                          onChange={e => setTimeHorizon(e.target.value as any)}
                          className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="all_time">All Time (Cumulative)</option>
                          <option value="today">Today vs Yesterday</option>
                          <option value="this_week">This Week vs Last Week</option>
                          <option value="mtd">Month-to-Date (MTD) vs Prior Month</option>
                          <option value="qtd">Quarter-to-Date (QTD) vs Prior Quarter</option>
                          <option value="ytd">Year-to-Date (YTD) vs Prior Year</option>
                          <option value="trailing_30d">Trailing 30 Days</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Filter Conditions Builder */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        Filter Criteria (Optional)
                      </label>
                      <button
                        type="button"
                        onClick={handleAddFilter}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                      >
                        <Plus size={14} /> Add Filter
                      </button>
                    </div>

                    {filters.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
                        No filters applied. Metric will calculate across all records in this module.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filters.map((filter) => (
                          <div key={filter.id} className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
                            <select
                              value={filter.fieldId}
                              onChange={e => handleUpdateFilter(filter.id, { fieldId: e.target.value })}
                              className="px-2.5 py-1.5 text-xs rounded bg-zinc-800 border border-zinc-700 text-zinc-200"
                            >
                              {selectedModule?.fields?.map((f: any) => (
                                <option key={f.id} value={f.id}>{f.label || f.name}</option>
                              ))}
                            </select>

                            <select
                              value={filter.operator}
                              onChange={e => handleUpdateFilter(filter.id, { operator: e.target.value as any })}
                              className="px-2.5 py-1.5 text-xs rounded bg-zinc-800 border border-zinc-700 text-zinc-200"
                            >
                              <option value="equals">equals</option>
                              <option value="not_equals">does not equal</option>
                              <option value="greater_than">is greater than</option>
                              <option value="less_than">is less than</option>
                              <option value="contains">contains</option>
                              <option value="is_empty">is empty</option>
                              <option value="is_not_empty">is not empty</option>
                            </select>

                            <input
                              type="text"
                              value={filter.value}
                              onChange={e => handleUpdateFilter(filter.id, { value: e.target.value })}
                              placeholder="Value..."
                              className="flex-1 px-2.5 py-1.5 text-xs rounded bg-zinc-800 border border-zinc-700 text-zinc-200 focus:outline-none focus:border-indigo-500"
                            />

                            <button
                              type="button"
                              onClick={() => handleRemoveFilter(filter.id)}
                              className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TAB 2: TARGETS & THRESHOLDS */}
              {activeTab === 'targets' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  
                  {/* Target Goal Input */}
                  <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Target Value (Goal)</label>
                        <input
                          type="number"
                          value={targetValue ?? ''}
                          onChange={e => setTargetValue(e.target.value === '' ? undefined : Number(e.target.value))}
                          placeholder="e.g. 100000"
                          className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-indigo-500"
                        />
                        <span className="text-[11px] text-zinc-500 mt-1 block">
                          Used to render the target progress bar and calculate % achievement.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Trend Polarity</label>
                        <select
                          value={trendDirection}
                          onChange={e => setTrendDirection(e.target.value as any)}
                          className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="higher_is_better">Higher is Better (e.g. Revenue, Closed Deals)</option>
                          <option value="lower_is_better">Lower is Better (e.g. Churn, Resolution Time, Backlog)</option>
                          <option value="neutral">Neutral (No directional color bias)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Status Threshold Rules */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                          Visual Status Thresholds
                        </label>
                        <span className="text-[11px] text-zinc-500">
                          Automatically tint card badges and trigger alerts when metric hits designated bounds.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddThreshold}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                      >
                        <Plus size={14} /> Add Threshold
                      </button>
                    </div>

                    <div className="space-y-2">
                      {thresholds.map((th, idx) => (
                        <div key={th.id || idx} className="flex items-center gap-2 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
                          <span className="text-xs text-zinc-400 font-medium">When value is</span>
                          
                          <select
                            value={th.condition}
                            onChange={e => {
                              const updated = [...thresholds];
                              updated[idx].condition = e.target.value as any;
                              setThresholds(updated);
                            }}
                            className="px-2.5 py-1.5 text-xs rounded bg-zinc-800 border border-zinc-700 text-zinc-200"
                          >
                            <option value="gte">≥</option>
                            <option value="gt">&gt;</option>
                            <option value="lte">≤</option>
                            <option value="lt">&lt;</option>
                            <option value="eq">=</option>
                          </select>

                          <input
                            type="number"
                            value={th.value}
                            onChange={e => {
                              const updated = [...thresholds];
                              updated[idx].value = Number(e.target.value);
                              setThresholds(updated);
                            }}
                            className="w-24 px-2.5 py-1.5 text-xs rounded bg-zinc-800 border border-zinc-700 text-zinc-200"
                          />

                          <span className="text-xs text-zinc-400 font-medium">highlight as</span>

                          <select
                            value={th.color}
                            onChange={e => {
                              const updated = [...thresholds];
                              updated[idx].color = e.target.value as any;
                              setThresholds(updated);
                            }}
                            className="px-2.5 py-1.5 text-xs rounded bg-zinc-800 border border-zinc-700 text-zinc-200"
                          >
                            <option value="emerald">Emerald (Good / Target)</option>
                            <option value="rose">Rose (Critical Alert)</option>
                            <option value="amber">Amber (Warning)</option>
                            <option value="blue">Blue (Informational)</option>
                          </select>

                          <input
                            type="text"
                            value={th.label}
                            onChange={e => {
                              const updated = [...thresholds];
                              updated[idx].label = e.target.value;
                              setThresholds(updated);
                            }}
                            placeholder="Status Label"
                            className="flex-1 px-2.5 py-1.5 text-xs rounded bg-zinc-800 border border-zinc-700 text-zinc-200"
                          />

                          <button
                            type="button"
                            onClick={() => handleRemoveThreshold(idx)}
                            className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 3: FORMATTING & APPEARANCE */}
              {activeTab === 'formatting' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Category</label>
                      <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Sales">Sales & Revenue</option>
                        <option value="Support">Support & SLA</option>
                        <option value="Operations">Operations & Backlog</option>
                        <option value="Marketing">Marketing & Leads</option>
                        <option value="Finance">Finance & Billing</option>
                        <option value="Executive">Executive & Overview</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Format Type</label>
                      <select
                        value={format}
                        onChange={e => setFormat(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="number">Number (1,234)</option>
                        <option value="currency">Currency ($1,234.00)</option>
                        <option value="percentage">Percentage (45.8%)</option>
                        <option value="duration">Duration (e.g. 4.2h, 15m)</option>
                        <option value="bytes">Data Size (MB / GB)</option>
                      </select>
                    </div>
                  </div>

                  {format === 'currency' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Currency Code</label>
                        <select
                          value={currencyCode}
                          onChange={e => setCurrencyCode(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="AUD">AUD (A$)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Decimal Precision</label>
                        <select
                          value={decimalPrecision}
                          onChange={e => setDecimalPrecision(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100"
                        >
                          <option value="0">0 decimals ($1,000)</option>
                          <option value="2">2 decimals ($1,000.00)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Prefix & Suffix */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Custom Prefix</label>
                      <input
                        type="text"
                        value={prefix}
                        onChange={e => setPrefix(e.target.value)}
                        placeholder="e.g. ~"
                        className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Custom Suffix</label>
                      <input
                        type="text"
                        value={suffix}
                        onChange={e => setSuffix(e.target.value)}
                        placeholder="e.g. / mo"
                        className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="compactNotation"
                      checked={compactNotation}
                      onChange={e => setCompactNotation(e.target.checked)}
                      className="rounded bg-zinc-900 border-zinc-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="compactNotation" className="text-xs text-zinc-300 font-medium cursor-pointer">
                      Use compact notation for thousands/millions (e.g. 1.2M, 45K)
                    </label>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Metric Description & Intent</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Explain how this metric is computed and why it matters..."
                      rows={2}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Slug */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">System Identifier Slug</label>
                    <input
                      type="text"
                      value={slug}
                      onChange={e => setSlug(e.target.value)}
                      placeholder="e.g. mtd_sales_target"
                      className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono text-zinc-400"
                    />
                  </div>

                  {/* Icon Selector */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                      Card Icon
                    </label>
                    <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
                      {AVAILABLE_ICONS.map(ic => {
                        const Icon = (LucideIcons as any)[ic] || Target;
                        const isSelected = iconName === ic;
                        return (
                          <button
                            key={ic}
                            type="button"
                            onClick={() => setIconName(ic)}
                            className={cn(
                              "p-2.5 rounded-xl border flex items-center justify-center transition-all",
                              isSelected 
                                ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30" 
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                            )}
                          >
                            <Icon size={18} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 4: AUTOMATIONS & WORKFLOWS */}
              {activeTab === 'automations' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-2">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                      <Sparkles size={18} />
                      <span>Drive Automated Workflows with this Metric</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      You can use this KPI inside Aurora’s <strong>Automations Studio</strong> and <strong>Workflow Graph Builder</strong>.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300 mt-0.5">
                        <AlertTriangle size={16} />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-zinc-200">KPI Threshold Breach Trigger</h5>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          When this metric enters a designated Warning or Critical threshold band, automatically kick off an alert or re-balancing workflow.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300 mt-0.5">
                        <Code size={16} />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-zinc-200">Template Variable Tokens</h5>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Use <code className="bg-zinc-800 text-indigo-300 px-1 py-0.5 rounded text-[10px]">{"{{kpi." + (slug || 'metric_slug') + ".value}}"}</code> and <code className="bg-zinc-800 text-indigo-300 px-1 py-0.5 rounded text-[10px]">{"{{kpi." + (slug || 'metric_slug') + ".target}}"}</code> in email and webhook notification templates.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Right Live Preview Pane */}
          <div className="w-full lg:w-[420px] bg-zinc-900/70 p-6 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-zinc-800 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Live Sandbox Preview</span>
                </div>
                <button
                  type="button"
                  onClick={runDraftEvaluation}
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition-colors"
                  title="Re-evaluate preview"
                >
                  <RefreshCw size={14} className={cn(isEvaluating && "animate-spin text-indigo-400")} />
                </button>
              </div>

              {/* Standard Card Preview */}
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase">Dashboard & Custom Page Widget:</span>
                <KpiCard
                  kpiDefinition={currentDraft as KpiDefinition}
                  evaluationResult={previewResult || undefined}
                  interactive={false}
                />
              </div>

              {/* Minimal Pill Preview */}
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase">Compact Ribbon & Header Chip:</span>
                <KpiCard
                  kpiDefinition={currentDraft as KpiDefinition}
                  evaluationResult={previewResult || undefined}
                  variant="minimal"
                  interactive={false}
                />
              </div>

              {/* Evaluation Metrics Breakdown */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-2.5 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Evaluated Records:</span>
                  <span className="font-bold text-zinc-200">{previewResult?.matchedRecordCount ?? 0}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Computed Value:</span>
                  <span className="font-bold text-zinc-100">{previewResult?.formattedValue ?? '--'}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Status State:</span>
                  <span className={cn("font-bold capitalize", previewResult?.statusColor === 'emerald' ? 'text-emerald-400' : 'text-zinc-300')}>
                    {previewResult?.statusLabel || 'Active'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-6 text-center text-[11px] text-zinc-500">
              Changes reflect live across Aurora when published.
            </div>
          </div>

        </div>

      </div>

      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        entityName="KPI metric"
        onDiscardAndExit={() => {
          setShowUnsavedModal(false);
          onClose();
        }}
        onCancel={() => setShowUnsavedModal(false)}
        onSaveAndExit={() => {
          setShowUnsavedModal(false);
          handleSave();
        }}
      />
    </div>
  );
};
