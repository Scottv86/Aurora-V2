import React, { useMemo, useState } from 'react';
import { 
  BarChart3, PieChart, TrendingUp, Layers, Hash, 
  ArrowUpRight, Sparkles, Filter, ChevronRight, Activity,
  SlidersHorizontal, Award, Compass
} from 'lucide-react';
import { cn } from '../Primitives';
import { Column } from '../Table';
import { getColKey, getRecordValue, resolveRecordDisplayValue } from './TableGrouping';

export interface TableChartVisualizerProps<T> {
  data: T[];
  columns: Column<T>[];
  groupByField?: string;
  measureField?: string;
  assigneeOptions?: any[];
  filterFields?: any[];
  onClose?: () => void;
}

export function TableChartVisualizer<T>({
  data,
  columns,
  groupByField: initialGroup,
  measureField: initialMeasure,
  assigneeOptions,
  filterFields,
  onClose
}: TableChartVisualizerProps<T>) {
  // Extract all valid columns for grouping (filtering out non-data columns like Actions or Checkbox)
  const eligibleGroupColumns = useMemo(() => {
    return columns
      .filter(c => c.header && c.header.toLowerCase() !== 'actions' && c.header.toLowerCase() !== 'select' && c.header !== '')
      .map(c => ({
        key: getColKey(c),
        header: c.header
      }));
  }, [columns]);

  // Find numeric / currency columns for aggregations (Sum / Average)
  const numericColumns = useMemo(() => {
    return columns.filter(c => {
      const k = getColKey(c).toLowerCase();
      return (
        c.type === 'currency' || 
        c.type === 'number' || 
        k.includes('amount') || 
        k.includes('price') || 
        k.includes('cost') || 
        k.includes('revenue') || 
        k.includes('total') || 
        k.includes('score')
      );
    }).map(c => ({
      key: getColKey(c),
      header: c.header
    }));
  }, [columns]);

  const [selectedGroup, setSelectedGroup] = useState<string>(() => {
    if (initialGroup) return initialGroup;
    const statusCol = eligibleGroupColumns.find(c => c.key.toLowerCase().includes('status'));
    if (statusCol) return statusCol.key;
    const assigneeCol = eligibleGroupColumns.find(c => c.key.toLowerCase().includes('assignee') || c.key.toLowerCase().includes('user'));
    if (assigneeCol) return assigneeCol.key;
    return eligibleGroupColumns[0] ? eligibleGroupColumns[0].key : '';
  });

  const [measureType, setMeasureType] = useState<'count' | 'sum'>('count');
  const [selectedMeasureField, setSelectedMeasureField] = useState<string>(() => {
    return numericColumns[0] ? numericColumns[0].key : '';
  });

  const [chartType, setChartType] = useState<'bar' | 'donut'>('bar');

  // Compute breakdown data
  const chartData = useMemo(() => {
    if (!selectedGroup || data.length === 0) return [];
    const groupAggMap = new Map<string, { count: number; sum: number }>();

    data.forEach((item: any) => {
      const raw = getRecordValue(item, selectedGroup);
      const key = resolveRecordDisplayValue(raw, selectedGroup, assigneeOptions, filterFields);

      if (!groupAggMap.has(key)) {
        groupAggMap.set(key, { count: 0, sum: 0 });
      }
      const current = groupAggMap.get(key)!;
      current.count += 1;

      if (selectedMeasureField) {
        const numVal = getRecordValue(item, selectedMeasureField);
        const parsed = typeof numVal === 'number' ? numVal : parseFloat(String(numVal || '').replace(/[^0-9.-]+/g, ''));
        if (!isNaN(parsed)) current.sum += parsed;
      }
    });

    const totalValue = measureType === 'count' 
      ? data.length 
      : Array.from(groupAggMap.values()).reduce((acc, curr) => acc + curr.sum, 0);

    const entries = Array.from(groupAggMap.entries()).map(([label, stats]) => {
      const value = measureType === 'count' ? stats.count : Math.round(stats.sum * 100) / 100;
      const percent = totalValue > 0 ? Math.round((value / totalValue) * 100) : 0;

      return {
        label,
        count: stats.count,
        sum: Math.round(stats.sum * 100) / 100,
        value,
        percent
      };
    });

    return entries.sort((a, b) => b.value - a.value);
  }, [data, selectedGroup, selectedMeasureField, measureType]);

  const maxValue = useMemo(() => {
    return Math.max(...chartData.map(d => d.value), 1);
  }, [chartData]);

  // Aurora Signature Neon Glowing Gradients
  const visualPalettes = [
    {
      gradient: 'from-indigo-500 via-purple-500 to-pink-500',
      glow: 'rgba(99,102,241,0.45)',
      badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
    },
    {
      gradient: 'from-cyan-400 via-teal-400 to-emerald-400',
      glow: 'rgba(6,182,212,0.45)',
      badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
    },
    {
      gradient: 'from-amber-400 via-orange-500 to-rose-500',
      glow: 'rgba(245,158,11,0.45)',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    },
    {
      gradient: 'from-fuchsia-500 via-pink-500 to-rose-400',
      glow: 'rgba(217,70,239,0.45)',
      badge: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30'
    },
    {
      gradient: 'from-blue-500 via-indigo-500 to-violet-500',
      glow: 'rgba(59,130,246,0.45)',
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30'
    },
    {
      gradient: 'from-emerald-500 via-green-500 to-teal-400',
      glow: 'rgba(16,185,129,0.45)',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    }
  ];

  const activeGroupLabel = eligibleGroupColumns.find(c => c.key === selectedGroup)?.header || selectedGroup;

  return (
    <div className="flex flex-col h-full w-full p-4 sm:p-6 bg-transparent text-zinc-900 dark:text-zinc-100 overflow-y-auto custom-scrollbar">
      
      {/* Glassmorphic Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-zinc-200/50 dark:border-white/[0.08]">
        
        {/* Dimension & Metric Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Group Dimension Glass Pill */}
          <div className="flex items-center gap-2 bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/70 dark:border-white/[0.08] rounded-xl px-3 py-1.5 shadow-sm">
            <Layers size={13} className="text-indigo-500" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Group by:</span>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-transparent text-xs font-bold text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
            >
              {eligibleGroupColumns.map((col, idx) => (
                <option key={idx} value={col.key} className="bg-white dark:bg-zinc-900">
                  {col.header}
                </option>
              ))}
            </select>
          </div>

          {/* Measure Dimension Glass Pill */}
          <div className="flex items-center gap-2 bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/70 dark:border-white/[0.08] rounded-xl px-3 py-1.5 shadow-sm">
            <Activity size={13} className="text-purple-500" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Measure:</span>
            <select
              value={measureType}
              onChange={(e) => setMeasureType(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
            >
              <option value="count" className="bg-white dark:bg-zinc-900">Record Count</option>
              {numericColumns.length > 0 && (
                <option value="sum" className="bg-white dark:bg-zinc-900">Sum Total</option>
              )}
            </select>

            {measureType === 'sum' && numericColumns.length > 0 && (
              <select
                value={selectedMeasureField}
                onChange={(e) => setSelectedMeasureField(e.target.value)}
                className="bg-zinc-100 dark:bg-white/[0.06] text-xs font-medium text-zinc-800 dark:text-zinc-200 rounded px-2 py-0.5 outline-none cursor-pointer"
              >
                {numericColumns.map((col, idx) => (
                  <option key={idx} value={col.key} className="bg-white dark:bg-zinc-900">
                    {col.header}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* View Switchers (Bar / Breakdown) */}
        <div className="flex items-center bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl p-1 rounded-xl border border-zinc-200/70 dark:border-white/[0.08] shadow-sm">
          <button
            type="button"
            onClick={() => setChartType('bar')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer",
              chartType === 'bar' 
                ? "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/30 shadow-2xs" 
                : "text-zinc-600 dark:text-zinc-400 hover:bg-white/40 dark:hover:bg-white/[0.04]"
            )}
          >
            <BarChart3 size={13} /> Bar Chart
          </button>
          <button
            type="button"
            onClick={() => setChartType('donut')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer",
              chartType === 'donut' 
                ? "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/30 shadow-2xs" 
                : "text-zinc-600 dark:text-zinc-400 hover:bg-white/40 dark:hover:bg-white/[0.04]"
            )}
          >
            <PieChart size={13} /> Breakdown
          </button>
        </div>
      </div>

      {/* Hero Glassmorphic KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        
        {/* Total Sample Records */}
        <div className="p-5 rounded-2xl bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/70 dark:border-white/[0.08] shadow-xl relative overflow-hidden group hover:border-indigo-500/30 transition-all">
          <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-indigo-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-indigo-500/20 transition-all" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Sample Records</p>
          <p className="text-2xl sm:text-3xl font-black font-mono text-zinc-900 dark:text-zinc-100 mt-2">
            {data.length.toLocaleString()}
          </p>
        </div>

        {/* Distinct Categories */}
        <div className="p-5 rounded-2xl bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/70 dark:border-white/[0.08] shadow-xl relative overflow-hidden group hover:border-purple-500/30 transition-all">
          <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-purple-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-purple-500/20 transition-all" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Distinct {activeGroupLabel}s</p>
          <p className="text-2xl sm:text-3xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-2">
            {chartData.length}
          </p>
        </div>

        {/* Dominant Category */}
        {chartData[0] ? (
          <div className="p-5 rounded-2xl bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/70 dark:border-white/[0.08] shadow-xl col-span-2 relative overflow-hidden group hover:border-cyan-500/30 transition-all">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-cyan-500/20 transition-all" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Dominant Category</p>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {chartData[0].label}
              </span>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30 shadow-2xs">
                {chartData[0].percent}% of total ({chartData[0].value.toLocaleString()})
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Main Glassmorphic Visualization Workspace */}
      <div className="bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl p-6 rounded-2xl border border-zinc-200/70 dark:border-white/[0.08] shadow-2xl flex-1 flex flex-col relative overflow-hidden">
        
        {/* Card Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-200/50 dark:border-white/[0.06]">
          <div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>{activeGroupLabel} Breakdown</span>
              <span className="text-xs font-normal text-zinc-400 font-mono">
                ({measureType === 'count' ? 'Record Volume' : 'Sum Total'})
              </span>
            </h4>
          </div>
          <span className="text-xs font-mono font-semibold text-zinc-400">
            {chartData.length} categories represented
          </span>
        </div>

        {chartData.length === 0 ? (
          <div className="py-20 text-center text-zinc-400 text-xs">
            No data available for the selected group.
          </div>
        ) : chartType === 'bar' ? (
          /* BAR CHART VIEW WITH AURORA NEON GLOWS */
          <div className="space-y-5 flex-1">
            {chartData.map((item, idx) => {
              const barWidthPercent = (item.value / maxValue) * 100;
              const palette = visualPalettes[idx % visualPalettes.length];

              return (
                <div key={idx} className="space-y-2 group">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-lg bg-zinc-200/60 dark:bg-white/[0.06] text-[10px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center justify-center font-mono border border-zinc-300/40 dark:border-white/[0.08]">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-sm">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {item.value.toLocaleString()}
                      </span>
                      <span className="text-zinc-400 text-[11px] w-12 text-right">
                        ({item.percent}%)
                      </span>
                    </div>
                  </div>

                  {/* Track & Glowing Gradient Fill */}
                  <div className="w-full h-4 bg-zinc-200/50 dark:bg-white/[0.04] rounded-full overflow-hidden flex p-0.5 border border-zinc-300/40 dark:border-white/[0.06] shadow-inner">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-700 bg-gradient-to-r",
                        palette.gradient
                      )}
                      style={{ 
                        width: `${Math.max(barWidthPercent, 2)}%`,
                        boxShadow: `0 0 14px ${palette.glow}`
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* BREAKDOWN / MULTI-SEGMENT DONUT VIEW */
          <div className="space-y-6 flex-1">
            {/* Multi-segment glowing distribution strip */}
            <div className="w-full h-7 rounded-2xl overflow-hidden flex shadow-inner border border-white/[0.08] bg-white/[0.02] p-1 gap-1">
              {chartData.map((item, idx) => {
                const palette = visualPalettes[idx % visualPalettes.length];
                return (
                  <div 
                    key={idx}
                    className={cn(
                      "h-full rounded-lg transition-all duration-500 hover:scale-[1.02] bg-gradient-to-r cursor-pointer",
                      palette.gradient
                    )}
                    style={{ 
                      width: `${Math.max(item.percent, 1.5)}%`,
                      boxShadow: `0 0 10px ${palette.glow}`
                    }}
                    title={`${item.label}: ${item.value.toLocaleString()} (${item.percent}%)`}
                  />
                );
              })}
            </div>

            {/* Visual Glassmorphic Category Legend Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
              {chartData.map((item, idx) => {
                const palette = visualPalettes[idx % visualPalettes.length];
                return (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3.5 rounded-xl bg-white/50 dark:bg-white/[0.02] backdrop-blur-md border border-zinc-200/60 dark:border-white/[0.06] hover:border-indigo-500/50 hover:bg-white/80 dark:hover:bg-white/[0.05] transition-all shadow-sm group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span 
                        className={cn("w-3.5 h-3.5 rounded-full flex-shrink-0 bg-gradient-to-tr shadow-sm", palette.gradient)} 
                        style={{ boxShadow: `0 0 8px ${palette.glow}` }}
                      />
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {item.label}
                      </span>
                    </div>
                    <div className="text-right ml-2 font-mono flex-shrink-0">
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{item.value.toLocaleString()}</p>
                      <p className="text-[10px] text-zinc-400">{item.percent}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
