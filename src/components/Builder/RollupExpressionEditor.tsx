import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Calculator, 
  Layers, 
  Filter, 
  Check, 
  DollarSign, 
  Hash, 
  Percent, 
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

export interface RollupConfig {
  relationshipFieldId: string;
  targetModuleId: string;
  targetFieldName: string;
  targetFieldType: string;
  aggregation: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'FIRST' | 'LAST';
  filterFieldId?: string;
  filterOperator?: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'is_not_empty';
  filterValue?: string;
  format?: 'number' | 'currency' | 'percent';
  currencySymbol?: string;
  decimals?: number;
}

interface RollupExpressionEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: RollupConfig) => void;
  initialConfig?: Partial<RollupConfig>;
  relationshipFields: any[];
  availableModules: any[];
  currentFieldLabel?: string;
}

const AGGREGATIONS = [
  { id: 'COUNT', label: 'COUNT', desc: 'Total number of related records', applicableTypes: ['all'] },
  { id: 'SUM', label: 'SUM', desc: 'Sum of numeric field values', applicableTypes: ['number', 'currency', 'percent'] },
  { id: 'AVG', label: 'AVG', desc: 'Average of numeric field values', applicableTypes: ['number', 'currency', 'percent'] },
  { id: 'MIN', label: 'MIN', desc: 'Minimum value or earliest date', applicableTypes: ['number', 'currency', 'date', 'datetime'] },
  { id: 'MAX', label: 'MAX', desc: 'Maximum value or latest date', applicableTypes: ['number', 'currency', 'date', 'datetime'] },
  { id: 'FIRST', label: 'FIRST', desc: 'Value from the first created record', applicableTypes: ['all'] },
  { id: 'LAST', label: 'LAST', desc: 'Value from the latest created record', applicableTypes: ['all'] }
];

export const RollupExpressionEditor: React.FC<RollupExpressionEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  relationshipFields,
  availableModules,
  currentFieldLabel = 'Rollup Field'
}) => {
  const [selectedRelId, setSelectedRelId] = useState<string>(
    initialConfig?.relationshipFieldId || relationshipFields[0]?.id || ''
  );
  const [aggregation, setAggregation] = useState<RollupConfig['aggregation']>(
    initialConfig?.aggregation || 'SUM'
  );
  const [targetFieldName, setTargetFieldName] = useState<string>(
    initialConfig?.targetFieldName || ''
  );
  const [targetFieldType, setTargetFieldType] = useState<string>(
    initialConfig?.targetFieldType || 'number'
  );
  const [hasFilter, setHasFilter] = useState<boolean>(
    !!(initialConfig?.filterFieldId || initialConfig?.filterValue)
  );
  const [filterFieldId, setFilterFieldId] = useState<string>(
    initialConfig?.filterFieldId || ''
  );
  const [filterOperator, setFilterOperator] = useState<RollupConfig['filterOperator']>(
    initialConfig?.filterOperator || 'equals'
  );
  const [filterValue, setFilterValue] = useState<string>(
    initialConfig?.filterValue || ''
  );
  const [format, setFormat] = useState<'number' | 'currency' | 'percent'>(
    initialConfig?.format || 'currency'
  );
  const [currencySymbol, setCurrencySymbol] = useState<string>(
    initialConfig?.currencySymbol || '$'
  );
  const [decimals, setDecimals] = useState<number>(
    initialConfig?.decimals !== undefined ? initialConfig.decimals : 2
  );

  // Determine current related module based on selected relationship field
  const currentRelField = useMemo(() => {
    return relationshipFields.find(f => f.id === selectedRelId);
  }, [relationshipFields, selectedRelId]);

  const targetModule = useMemo(() => {
    const modId = currentRelField?.targetModuleId || currentRelField?.submoduleId || initialConfig?.targetModuleId;
    return availableModules.find(m => m.id === modId);
  }, [currentRelField, availableModules, initialConfig]);

  // Extract candidate fields from target module layout
  const targetModuleFields = useMemo(() => {
    if (!targetModule?.layout) {
      return [
        { id: 'amount', label: 'Amount', type: 'currency' },
        { id: 'total', label: 'Total', type: 'currency' },
        { id: 'quantity', label: 'Quantity', type: 'number' },
        { id: 'hours', label: 'Hours', type: 'number' },
        { id: 'status', label: 'Status', type: 'select' },
        { id: 'createdAt', label: 'Created At', type: 'date' }
      ];
    }
    const extract = (items: any[]): any[] => {
      let res: any[] = [];
      items.forEach(item => {
        if (item.id && !['heading', 'divider', 'spacer', 'card'].includes(item.type)) {
          res.push(item);
        }
        if (item.fields && Array.isArray(item.fields)) {
          res = res.concat(extract(item.fields));
        }
      });
      return res;
    };
    return extract(targetModule.layout);
  }, [targetModule]);

  // Filter aggregations based on target field type
  const availableAggregations = useMemo(() => {
    return AGGREGATIONS.filter(agg => {
      if (agg.applicableTypes.includes('all')) return true;
      return agg.applicableTypes.includes(targetFieldType);
    });
  }, [targetFieldType]);

  const generatedFormulaSnippet = useMemo(() => {
    const relName = currentRelField?.label || 'RelatedRecords';
    const fieldName = aggregation === 'COUNT' ? '*' : (targetFieldName || 'Field');
    const filterClause = hasFilter && filterFieldId 
      ? ` WHERE ${filterFieldId} ${filterOperator === 'equals' ? '==' : filterOperator} "${filterValue}"` 
      : '';
    return `${aggregation}(${relName}.${fieldName})${filterClause}`;
  }, [aggregation, currentRelField, targetFieldName, hasFilter, filterFieldId, filterOperator, filterValue]);

  const handleSave = () => {
    if (!selectedRelId && relationshipFields.length > 0) {
      toast.error('Please select a relationship field');
      return;
    }
    if (aggregation !== 'COUNT' && !targetFieldName) {
      toast.error('Please select a target field to aggregate');
      return;
    }

    const config: RollupConfig = {
      relationshipFieldId: selectedRelId,
      targetModuleId: targetModule?.id || 'target-module',
      targetFieldName: aggregation === 'COUNT' ? '_count' : targetFieldName,
      targetFieldType,
      aggregation,
      filterFieldId: hasFilter ? filterFieldId : undefined,
      filterOperator: hasFilter ? filterOperator : undefined,
      filterValue: hasFilter ? filterValue : undefined,
      format,
      currencySymbol,
      decimals
    };

    onSave(config);
    toast.success('Rollup configuration saved');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-zinc-950/70 backdrop-blur-xl transition-opacity"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] shadow-2xl overflow-hidden z-10 flex flex-col my-auto max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-8 pb-5 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                <Calculator size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                  Rollup Computation Editor
                </h2>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">
                  Dynamically aggregate records from linked child and junction modules.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
            {/* Live Formula Preview Badge */}
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-500/20 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 block">Computed Expression</span>
                  <code className="text-xs font-mono font-bold text-indigo-950 dark:text-indigo-200 truncate block mt-0.5">
                    {generatedFormulaSnippet}
                  </code>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 shrink-0">
                Live Dynamic
              </span>
            </div>

            {/* Step 1: Relationship Selection */}
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                1. Select Linked Relationship / Submodule
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {relationshipFields.length > 0 ? (
                  relationshipFields.map((rel) => {
                    const isSelected = selectedRelId === rel.id;
                    return (
                      <button
                        key={rel.id}
                        type="button"
                        onClick={() => setSelectedRelId(rel.id)}
                        className={cn(
                          "p-4 rounded-2xl border text-left flex items-center gap-3 transition-all",
                          isSelected
                            ? "bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm ring-2 ring-indigo-500/20"
                            : "bg-zinc-50/50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 text-zinc-700 dark:text-zinc-300"
                        )}
                      >
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                          isSelected ? "bg-indigo-600 text-white" : "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500"
                        )}>
                          <Layers size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs truncate">{rel.label || rel.name}</div>
                          <div className="text-[10px] text-zinc-400 truncate">Target: {targetModule?.name || 'Related Module'}</div>
                        </div>
                        {isSelected && <Check size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
                      </button>
                    );
                  })
                ) : (
                  <div className="col-span-2 p-4 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-center text-xs text-zinc-500">
                    No relational submodule fields found in this module. Add a Submodule or Relationship block first.
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Aggregation Function */}
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                2. Aggregation Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {availableAggregations.map((agg) => {
                  const isSelected = aggregation === agg.id;
                  return (
                    <button
                      key={agg.id}
                      type="button"
                      onClick={() => setAggregation(agg.id as any)}
                      className={cn(
                        "p-3 rounded-2xl border text-left flex flex-col justify-between transition-all",
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20"
                          : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      <div className="font-black text-xs">{agg.label}</div>
                      <div className={cn(
                        "text-[9px] mt-1 line-clamp-2",
                        isSelected ? "text-white/80" : "text-zinc-400"
                      )}>
                        {agg.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Target Field in Related Module */}
            {aggregation !== 'COUNT' && (
              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                  3. Field to Aggregate
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {targetModuleFields.map((f) => {
                    const isSelected = targetFieldName === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setTargetFieldName(f.id);
                          setTargetFieldType(f.type);
                        }}
                        className={cn(
                          "p-3 rounded-2xl border text-left flex items-center justify-between transition-all",
                          isSelected
                            ? "bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm ring-2 ring-indigo-500/20"
                            : "bg-zinc-50/50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 text-zinc-700 dark:text-zinc-300"
                        )}
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-xs truncate">{f.label || f.name}</div>
                          <div className="text-[10px] text-zinc-400 font-mono uppercase">{f.type}</div>
                        </div>
                        {isSelected && <Check size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Conditional Filter */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Filter size={12} />
                  <span>Conditional Filter (Optional)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setHasFilter(h => !h)}
                  className={cn(
                    "text-xs font-bold transition-colors",
                    hasFilter ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400 hover:text-zinc-600"
                  )}
                >
                  {hasFilter ? 'Enabled' : '+ Add Filter'}
                </button>
              </div>

              {hasFilter && (
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">When Field</label>
                    <select
                      value={filterFieldId}
                      onChange={(e) => setFilterFieldId(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 outline-none"
                    >
                      <option value="">Select field...</option>
                      {targetModuleFields.map(f => (
                        <option key={f.id} value={f.id}>{f.label || f.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Operator</label>
                    <select
                      value={filterOperator}
                      onChange={(e) => setFilterOperator(e.target.value as any)}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 outline-none"
                    >
                      <option value="equals">Equals (==)</option>
                      <option value="not_equals">Does not equal (!=)</option>
                      <option value="greater_than">Greater than (&gt;)</option>
                      <option value="less_than">Less than (&lt;)</option>
                      <option value="contains">Contains text</option>
                      <option value="is_not_empty">Is not empty</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Value</label>
                    <input
                      type="text"
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      placeholder="e.g. Paid, Completed, 100"
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Step 5: Display & Formatting */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">
                5. Output Formatting
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFormat('currency')}
                  className={cn(
                    "p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5",
                    format === 'currency'
                      ? "bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold"
                      : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  <DollarSign size={16} />
                  <span className="text-xs">Currency ($)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('number')}
                  className={cn(
                    "p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5",
                    format === 'number'
                      ? "bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold"
                      : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  <Hash size={16} />
                  <span className="text-xs">Standard Number</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('percent')}
                  className={cn(
                    "p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5",
                    format === 'percent'
                      ? "bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold"
                      : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  <Percent size={16} />
                  <span className="text-xs">Percentage (%)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-white dark:bg-zinc-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
            >
              <Calculator size={15} />
              <span>Save Rollup Configuration</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
