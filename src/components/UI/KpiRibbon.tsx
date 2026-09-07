import React, { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { Target } from 'lucide-react';
import { cn } from '../../lib/utils';
import { KpiRibbonItem, KpiDefinition, KpiEvaluationResult } from '../../types/kpi';
import { KpiService } from '../../services/kpiService';
import { usePlatform } from '../../hooks/usePlatform';

export interface KpiRibbonProps {
  items?: KpiRibbonItem[];
  kpiIds?: string[];
  activeItemId?: string;
  onSelectItem?: (item: KpiRibbonItem) => void;
  className?: string;
}

export const KpiRibbon: React.FC<KpiRibbonProps> = ({
  items = [],
  kpiIds = [],
  activeItemId,
  onSelectItem,
  className
}) => {
  const { tenant } = usePlatform();
  const tenantId = tenant?.id || 't1';

  const [evaluations, setEvaluations] = useState<Record<string, KpiEvaluationResult>>({});
  const [kpiDefs, setKpiDefs] = useState<Record<string, KpiDefinition>>({});

  // Load KPI data if kpiIds were provided
  useEffect(() => {
    let isMounted = true;
    if (kpiIds.length > 0) {
      Promise.all(kpiIds.map(id => KpiService.getKpi(tenantId, id))).then(defs => {
        if (!isMounted) return;
        const defMap: Record<string, KpiDefinition> = {};
        defs.forEach(d => { if (d) defMap[d.id] = d; });
        setKpiDefs(defMap);

        // Evaluate all
        Promise.all(defs.filter(Boolean).map(d => KpiService.evaluateKpi(tenantId, d!.id))).then(results => {
          if (!isMounted) return;
          const resMap: Record<string, KpiEvaluationResult> = {};
          results.forEach(r => { if (r) resMap[r.kpiId] = r; });
          setEvaluations(resMap);
        });
      });
    }
    return () => { isMounted = false; };
  }, [kpiIds, tenantId]);

  // Combine items
  const ribbonItems: KpiRibbonItem[] = items.length > 0 
    ? items 
    : kpiIds.map(id => {
        const def = kpiDefs[id];
        return {
          id,
          kpiId: id,
          label: def?.name || 'Metric',
          iconName: def?.iconName || 'Target'
        };
      });

  if (ribbonItems.length === 0) return null;

  return (
    <div className={cn(
      "flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-1",
      className
    )}>
      {ribbonItems.map((item) => {
        const isActive = activeItemId === item.id;
        const evalResult = item.kpiId ? evaluations[item.kpiId] : null;
        const displayCount = evalResult?.formattedValue ?? item.filterValue ?? '--';
        
        // Resolve Icon
        const IconComponent = item.iconName && (LucideIcons as any)[item.iconName]
          ? (LucideIcons as any)[item.iconName]
          : Target;

        const statusColor = evalResult?.statusColor || 'zinc';

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectItem && onSelectItem(item)}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 border",
              isActive 
                ? "bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-600/30" 
                : "bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 hover:text-white"
            )}
          >
            <div className={cn(
              "p-1 rounded-md transition-colors",
              isActive ? "bg-white/20 text-white" : item.color || "text-zinc-400 bg-zinc-800"
            )}>
              <IconComponent size={14} />
            </div>

            <span>{item.label}</span>

            <span className={cn(
              "px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide transition-colors",
              isActive
                ? "bg-white/25 text-white"
                : statusColor === 'emerald'
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : statusColor === 'rose'
                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                : statusColor === 'amber'
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                : "bg-zinc-800 text-zinc-300 border border-zinc-700/60"
            )}>
              {displayCount}
            </span>
          </button>
        );
      })}
    </div>
  );
};
