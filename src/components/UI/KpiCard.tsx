import React, { useState, useEffect } from 'react';
import { 
  Minus, Target, RefreshCw, 
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '../../lib/utils';
import { KpiDefinition, KpiEvaluationResult } from '../../types/kpi';
import { KpiService } from '../../services/kpiService';
import { usePlatform } from '../../hooks/usePlatform';

export interface KpiCardProps {
  kpiId?: string;
  kpiDefinition?: KpiDefinition;
  evaluationResult?: KpiEvaluationResult;
  variant?: 'standard' | 'compact' | 'minimal' | 'hero';
  showSparkline?: boolean;
  showTargetBar?: boolean;
  showTrend?: boolean;
  interactive?: boolean;
  className?: string;
  onClick?: () => void;
  onDrillDown?: (kpi: KpiDefinition, result: KpiEvaluationResult) => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  kpiId,
  kpiDefinition,
  evaluationResult,
  variant = 'standard',
  showSparkline = true,
  showTargetBar = true,
  showTrend = true,
  interactive = true,
  className,
  onClick,
  onDrillDown
}) => {
  const { tenant } = usePlatform();
  const tenantId = tenant?.id || 't1';

  const [kpi, setKpi] = useState<KpiDefinition | null>(kpiDefinition || null);
  const [result, setResult] = useState<KpiEvaluationResult | null>(evaluationResult || null);
  const [loading, setLoading] = useState<boolean>(!evaluationResult && !!kpiId);
  const [evaluating, setEvaluating] = useState<boolean>(false);

  useEffect(() => {
    if (kpiDefinition) {
      setKpi(kpiDefinition);
    }
  }, [kpiDefinition]);

  useEffect(() => {
    if (evaluationResult) {
      setResult(evaluationResult);
    }
  }, [evaluationResult]);

  // Load KPI and evaluate if kpiId is supplied
  useEffect(() => {
    let isMounted = true;
    if (kpiId && !kpiDefinition) {
      setLoading(true);
      KpiService.getKpi(tenantId, kpiId).then(def => {
        if (isMounted && def) {
          setKpi(def);
          KpiService.evaluateKpi(tenantId, def.id).then(res => {
            if (isMounted) {
              setResult(res);
              setLoading(false);
            }
          });
        } else if (isMounted) {
          setLoading(false);
        }
      });
    } else if (kpi && !evaluationResult) {
      setEvaluating(true);
      KpiService.evaluateKpi(tenantId, kpi.id).then(res => {
        if (isMounted) {
          setResult(res);
          setEvaluating(false);
        }
      });
    }
    return () => { isMounted = false; };
  }, [kpiId, tenantId]);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!kpi) return;
    setEvaluating(true);
    try {
      const fresh = await KpiService.evaluateKpi(tenantId, kpi.id, true);
      setResult(fresh);
    } finally {
      setEvaluating(false);
    }
  };

  // Resolve Icon
  const IconComponent = kpi?.iconName && (LucideIcons as any)[kpi.iconName] 
    ? (LucideIcons as any)[kpi.iconName] 
    : Target;

  const statusColors = {
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    rose: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
    zinc: 'text-zinc-600 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20'
  };

  const statusBadgeColors = {
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    zinc: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
  };

  if (loading) {
    return (
      <div className={cn(
        "p-6 rounded-3xl border border-zinc-200/60 dark:border-white/5 bg-white/40 dark:bg-white/[0.02] animate-pulse flex flex-col justify-between h-52",
        className
      )}>
        <div className="flex justify-between items-center">
          <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
          <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-800 rounded-2xl"></div>
        </div>
        <div className="h-8 w-24 bg-zinc-300 dark:bg-zinc-700 rounded my-2"></div>
        <div className="h-3 w-36 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
      </div>
    );
  }

  const title = kpi?.name || 'Metric KPI';
  const formattedVal = result?.formattedValue || (result ? String(result.value) : '0');
  const changePct = result?.changePercent;
  const isUp = (changePct ?? 0) > 0;
  const isDown = (changePct ?? 0) < 0;
  const statusColor = result?.statusColor || 'zinc';

  // Sparkline SVG path generation
  const sparkPoints = result?.sparklineData || [];
  const minVal = sparkPoints.length > 0 ? Math.min(...sparkPoints.map(p => p.value)) : 0;
  const maxVal = sparkPoints.length > 0 ? Math.max(...sparkPoints.map(p => p.value)) : 100;
  const range = maxVal - minVal || 1;
  const svgWidth = 120;
  const svgHeight = 28;

  const pathData = sparkPoints.length > 1
    ? sparkPoints.map((p, i) => {
        const x = (i / (sparkPoints.length - 1)) * svgWidth;
        const y = svgHeight - ((p.value - minVal) / range) * (svgHeight - 4) - 2;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(' ')
    : '';

  if (variant === 'minimal') {
    return (
      <div 
        onClick={onClick}
        className={cn(
          "flex items-center justify-between p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/80 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all",
          interactive && "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850",
          className
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className={cn("p-1.5 rounded-xl border", statusColors[statusColor])}>
            <IconComponent size={16} />
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate max-w-[140px]">{title}</div>
            <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">{formattedVal}</div>
          </div>
        </div>
        {changePct !== undefined && showTrend && (
          <div className={cn(
            "flex items-center text-xs font-semibold px-2 py-0.5 rounded-full",
            isUp ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" : isDown ? "text-rose-600 dark:text-rose-400 bg-rose-500/10" : "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800"
          )}>
            {isUp ? <ArrowUpRight size={12} className="mr-0.5" /> : isDown ? <ArrowDownRight size={12} className="mr-0.5" /> : null}
            {changePct > 0 ? `+${changePct}%` : `${changePct}%`}
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      onClick={() => {
        if (onClick) onClick();
        if (onDrillDown && kpi && result) onDrillDown(kpi, result);
      }}
      className={cn(
        "relative group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-3xl transition-[border-color,box-shadow,background-color] duration-200 shadow-xl shadow-black/5 dark:shadow-none hover:shadow-indigo-500/10 flex flex-col justify-between h-full overflow-hidden min-h-[220px]",
        interactive && "cursor-pointer",
        className
      )}
    >
      {/* Background subtle glow */}
      <div className={cn(
        "absolute -right-10 -top-10 w-28 h-28 rounded-full blur-3xl opacity-10 dark:opacity-20 pointer-events-none transition-all",
        statusColor === 'emerald' ? "bg-emerald-500" :
        statusColor === 'rose' ? "bg-rose-500" :
        statusColor === 'amber' ? "bg-amber-500" :
        statusColor === 'blue' ? "bg-blue-500" : "bg-zinc-500"
      )} />

      {/* Header Row */}
      <div className="flex items-start justify-between gap-2 z-10 mb-2">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-3 rounded-2xl border flex items-center justify-center transition-colors duration-200",
            statusColors[statusColor]
          )}>
            <IconComponent size={20} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">{title}</h4>
            {kpi?.category && (
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">{kpi.category}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
          {result?.statusLabel && (
            <span className={cn(
              "text-[10px] font-semibold px-2.5 py-0.5 rounded-full border",
              statusBadgeColors[statusColor]
            )}>
              {result.statusLabel}
            </span>
          )}
          <button 
            type="button" 
            onClick={handleRefresh}
            title="Refresh metric"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
          >
            <RefreshCw size={13} className={cn(evaluating && "animate-spin text-indigo-500 dark:text-indigo-400")} />
          </button>
        </div>
      </div>

      {/* Description if available */}
      {kpi?.description && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 my-1 z-10">
          {kpi.description}
        </p>
      )}

      {/* Main Metric Value & Trend Row */}
      <div className="my-3 z-10 flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl lg:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
            {formattedVal}
          </span>
          {kpi?.timeHorizon && kpi.timeHorizon !== 'all_time' && (
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium capitalize">
              ({kpi.timeHorizon.replace('_', ' ')})
            </span>
          )}
        </div>

        {/* Sparkline mini-graph */}
        {showSparkline && pathData && (
          <div className="hidden sm:block">
            <svg width={svgWidth} height={svgHeight} className="overflow-visible">
              <path
                d={pathData}
                fill="none"
                stroke={statusColor === 'emerald' ? '#10b981' : statusColor === 'rose' ? '#f43f5e' : statusColor === 'amber' ? '#f59e0b' : statusColor === 'blue' ? '#3b82f6' : '#71717a'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Footer / Target Progress Bar */}
      <div className="z-10 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          {showTrend && changePct !== undefined ? (
            <div className={cn(
              "flex items-center font-semibold text-[11px]",
              isUp ? "text-emerald-600 dark:text-emerald-400" : isDown ? "text-rose-600 dark:text-rose-400" : "text-zinc-500 dark:text-zinc-400"
            )}>
              {isUp ? <ArrowUpRight size={13} className="mr-0.5" /> : isDown ? <ArrowDownRight size={13} className="mr-0.5" /> : <Minus size={13} className="mr-0.5" />}
              <span>{changePct > 0 ? `+${changePct}%` : `${changePct}%`} vs prior</span>
            </div>
          ) : (
            <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
              {result?.matchedRecordCount !== undefined ? `${result.matchedRecordCount} records evaluated` : 'Active metric'}
            </div>
          )}

          {kpi?.targetValue && showTargetBar && result?.targetProgressPercent !== undefined && (
            <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              {result.targetProgressPercent}% of target
            </div>
          )}
        </div>

        {/* Target Progress Bar */}
        {kpi?.targetValue && showTargetBar && result?.targetProgressPercent !== undefined && (
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-500",
                statusColor === 'emerald' ? "bg-emerald-500" :
                statusColor === 'rose' ? "bg-rose-500" :
                statusColor === 'amber' ? "bg-amber-500" :
                statusColor === 'blue' ? "bg-blue-500" : "bg-indigo-500"
              )}
              style={{ width: `${Math.min(100, Math.max(0, result.targetProgressPercent))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
