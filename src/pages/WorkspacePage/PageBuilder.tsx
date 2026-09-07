
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { 
  ArrowLeft, Save, Trash2, Settings, 
  Sparkles, Layout, Eye, Loader2, Cpu, GripVertical,
  SlidersHorizontal
} from 'lucide-react';
import ReactGridLayout from 'react-grid-layout';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line 
} from 'recharts';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/UI/Primitives';
import { toast } from 'sonner';
import { fetchModule, fetchRecords } from '../../services/dataService';
import { PageAIBuilderModal } from './PageAIBuilderModal';
import { PLATFORM_MODULES } from '../../config/platformModules';
import { API_BASE_URL, DATA_API_URL } from '../../config';
import { cn, slugify } from '../../lib/utils';
import { ReportWidgetEmbed, getWidgetDefaultDimensions } from './WorkspacePageView';
import { QueueRenderer } from '../../components/Builders/QueueBuilder/QueueRenderer';
import { builderCache } from '../../utils/builderCache';
import { UnsavedChangesModal } from '../../components/Common/UnsavedChangesModal';
export { PageBuilderEngine } from '../../components/PageEngine';
export { getWidgetDefaultDimensions };

// --- BUILDER LIVE WIDGET PREVIEW COMPONENTS ---

const BuilderStatsGridPreview: React.FC<{ widget: any; tenant: any; session: any }> = ({ tenant, session }) => {
  const statsCacheKey = `stats_${tenant?.id || 'default'}`;
  const defaultStats = { activeRecords: 12, totalRecords: 48, aiAutomations: 128, health: '99.9%' };
  const [stats, setStats] = useState<any>(() => builderCache.get(statsCacheKey) || defaultStats);

  useEffect(() => {
    if (!tenant?.id) return;
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const res = await fetch(`${API_BASE_URL}/api/data/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant.id
          }
        });
        if (res.ok && isMounted) {
          const json = await res.json();
          setStats(json);
          builderCache.set(statsCacheKey, json);
        }
      } catch (err) {
        console.warn('Failed to fetch widget stats for builder preview', err);
      }
    };
    fetchStats();
    return () => { isMounted = false; };
  }, [tenant?.id, session?.access_token, statsCacheKey]);

  const currentStats = stats || defaultStats;
  const items = [
    { label: 'Active Cases', value: currentStats.activeRecords?.toString() || '12', icon: Icons.Database, color: 'text-indigo-500 bg-indigo-500/10' },
    { label: 'Submissions', value: currentStats.totalRecords?.toString() || '48', icon: Icons.Globe, color: 'text-emerald-500 bg-emerald-500/10' },
    { label: 'AI Automations', value: currentStats.aiAutomations?.toString() || '128', icon: Icons.Cpu, color: 'text-purple-500 bg-purple-500/10' },
    { label: 'System Health', value: currentStats.health || '99.9%', icon: Icons.ShieldCheck, color: 'text-amber-500 bg-amber-500/10' },
  ];

  return (
    <div className="h-full w-full flex flex-col justify-center pointer-events-none p-0.5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 h-full">
        {items.map((stat, i) => {
          const IconComp = stat.icon;
          return (
            <div 
              key={i} 
              className="p-2.5 bg-zinc-50/80 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider truncate">{stat.label}</span>
                <div className={cn("p-1 rounded-md shrink-0", stat.color)}>
                  <IconComp size={12} />
                </div>
              </div>
              <p className="text-sm font-black text-zinc-900 dark:text-white mt-1">{stat.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BuilderWorkflowsPreview: React.FC<{ widget: any }> = ({ widget }) => {
  const workflows = [
    { name: 'Customer Onboarding', status: 'Running', health: 'Healthy', items: 42 },
    { name: 'Invoice & Expense Approval', status: 'Running', health: 'Healthy', items: 128 },
    { name: 'Support SLA Triage', status: 'Paused', health: 'Warning', items: 15 },
    { name: 'Vendor Security Screening', status: 'Running', health: 'Healthy', items: 9 },
  ];

  return (
    <div className="h-full flex flex-col bg-zinc-50/70 dark:bg-zinc-950/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800 overflow-hidden pointer-events-none">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-600">
            <Icons.Workflow size={11} />
          </div>
          <span className="text-[11px] font-bold text-zinc-900 dark:text-white truncate">{widget.title || 'Running Workflows'}</span>
        </div>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 uppercase">
          4 Active
        </span>
      </div>

      <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {workflows.map((wf, i) => (
          <div key={i} className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                <Icons.Workflow size={11} className="text-zinc-500" />
              </div>
              <div className="truncate">
                <p className="text-[11px] font-bold text-zinc-850 dark:text-white truncate">{wf.name}</p>
                <p className="text-[9px] text-zinc-400">{wf.items} cases in queue</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded", wf.status === 'Running' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400")}>
                {wf.status}
              </span>
              <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded", wf.health === 'Healthy' ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400")}>
                {wf.health}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BuilderQueuePreview: React.FC<{ widget: any }> = ({ widget }) => {
  return (
    <div className="h-full flex flex-col bg-zinc-50/70 dark:bg-zinc-950/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800 overflow-hidden text-left pointer-events-none">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-2 shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <div className="w-5 h-5 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
            <Icons.Layers size={11} />
          </div>
          <span className="text-[11px] font-bold text-zinc-900 dark:text-white truncate">{widget.title || 'My Work Inbox'}</span>
        </div>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 uppercase shrink-0">
          {widget.properties?.viewMode || 'Split'} View
        </span>
      </div>

      {/* Mini KPI summary */}
      {widget.properties?.showKpiRibbon !== false && (
        <div className="flex gap-1.5 overflow-hidden mb-2 shrink-0">
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-indigo-600">Mine: 4</span>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-rose-600">Urgent: 2</span>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500">All: 12</span>
        </div>
      )}

      {/* Mini case preview cards */}
      <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <div className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xs">
          <div className="flex items-center justify-between text-[9px] text-zinc-400 mb-0.5">
            <span className="font-mono font-bold">#49201</span>
            <span className="font-bold text-rose-600 bg-rose-500/10 px-1 rounded">High</span>
          </div>
          <p className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 truncate">Customer SLA Escalation Response</p>
        </div>
        <div className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xs">
          <div className="flex items-center justify-between text-[9px] text-zinc-400 mb-0.5">
            <span className="font-mono font-bold">#49202</span>
            <span className="font-bold text-blue-600 bg-blue-500/10 px-1 rounded">Normal</span>
          </div>
          <p className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 truncate">Verify Billing Address & Tax ID</p>
        </div>
        <div className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xs">
          <div className="flex items-center justify-between text-[9px] text-zinc-400 mb-0.5">
            <span className="font-mono font-bold">#49203</span>
            <span className="font-bold text-emerald-600 bg-emerald-500/10 px-1 rounded">Low</span>
          </div>
          <p className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 truncate">Quarterly Client Review Follow-up</p>
        </div>
      </div>
    </div>
  );
};

const BuilderModuleTablePreview: React.FC<{ widget: any; tenant: any; session: any; modules: any[] }> = ({ widget, tenant, session, modules }) => {
  const moduleId = widget.properties?.moduleId;
  const targetModule = useMemo(() => modules.find((m: any) => m.id === moduleId), [modules, moduleId]);
  const recordsCacheKey = `records_${tenant?.id || 'default'}_${moduleId || 'none'}`;
  const [records, setRecords] = useState<any[]>(() => builderCache.get(recordsCacheKey) || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tenant?.id || !moduleId) return;
    let isSubscribed = true;
    const loadRecords = async () => {
      if (!builderCache.has(recordsCacheKey)) setLoading(true);
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const res = await fetchRecords(moduleId, tenant.id, token, 1, 10);
        if (isSubscribed) {
          const data = res.records || [];
          setRecords(data);
          builderCache.set(recordsCacheKey, data);
        }
      } catch (err) {
        console.warn('Failed to load records for builder table preview', err);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };
    loadRecords();
    return () => { isSubscribed = false; };
  }, [moduleId, tenant?.id, session?.access_token, recordsCacheKey]);

  const sampleRecords = [
    { id: 'REC-10492', title: 'Global Enterprise Service Level Agreement', createdAt: '2026-08-30' },
    { id: 'REC-10493', title: 'Quarterly Corporate Tax Compliance Audit', createdAt: '2026-08-29' },
    { id: 'REC-10494', title: 'Customer Support Escalation Tier-2', createdAt: '2026-08-28' },
    { id: 'REC-10495', title: 'Vendor Security & Privacy Assessment', createdAt: '2026-08-27' }
  ];

  const displayRecords = moduleId && records.length > 0 ? records : sampleRecords;

  return (
    <div className="h-full flex flex-col bg-zinc-50/70 dark:bg-zinc-950/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800 overflow-hidden pointer-events-none">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-2 shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <div className="w-5 h-5 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
            <Icons.Database size={11} />
          </div>
          <span className="text-[11px] font-bold text-zinc-900 dark:text-white truncate">
            {widget.title || (targetModule ? targetModule.name : 'Module Records Table')}
          </span>
        </div>
        <span className={cn(
          "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0",
          moduleId ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        )}>
          {moduleId && targetModule ? targetModule.name : 'Sample Preview'}
        </span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                <th className="pb-1.5 pl-1">Record ID</th>
                <th className="pb-1.5">Summary</th>
                <th className="pb-1.5 text-right pr-1">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
              {displayRecords.slice(0, 5).map((rec: any, idx: number) => {
                const recId = rec.id ? String(rec.id).slice(-6) : `00${idx + 1}`;
                let summary = rec.title || rec.name;
                if (!summary && rec.data) {
                  const firstKey = Object.keys(rec.data).find(k => !k.startsWith('_') && rec.data[k]);
                  if (firstKey) summary = rec.data[firstKey];
                }
                if (!summary) summary = `Record ${recId}`;

                const dateStr = rec.createdAt ? new Date(rec.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Today';

                return (
                  <tr key={rec.id || idx} className="hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50">
                    <td className="py-1.5 pl-1 font-mono text-[10px] font-bold text-zinc-500">#{recId}</td>
                    <td className="py-1.5 font-medium text-[11px] text-zinc-800 dark:text-zinc-200 truncate max-w-[150px]">{summary}</td>
                    <td className="py-1.5 pr-1 text-right text-[10px] text-zinc-400 whitespace-nowrap">{dateStr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const BuilderModuleCreatorPreview: React.FC<{ widget: any; tenant: any; session: any; modules: any[] }> = ({ widget, tenant, session, modules }) => {
  const moduleId = widget.properties?.moduleId;
  const targetModule = useMemo(() => modules.find((m: any) => m.id === moduleId), [modules, moduleId]);
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tenant?.id || !moduleId) {
      setFields([]);
      return;
    }
    let isSubscribed = true;
    const loadModule = async () => {
      setLoading(true);
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const mod = await fetchModule(moduleId, tenant.id, token, modules);
        if (isSubscribed) {
          const layout = mod?.config?.layout || [];
          const inputs = layout.filter((item: any) => item && item.id && !['heading', 'divider', 'spacer'].includes(item.type));
          setFields(inputs.length > 0 ? inputs : (mod.fields || []));
        }
      } catch (err) {
        console.warn('Failed to fetch module layout for builder creator preview', err);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };
    loadModule();
    return () => { isSubscribed = false; };
  }, [moduleId, tenant?.id, session?.access_token, modules]);

  const sampleFields = [
    { id: 'f1', label: 'Item Title / Summary', type: 'text', required: true, placeholder: 'e.g. New Project Request' },
    { id: 'f2', label: 'Department / Category', type: 'select', required: true, options: ['Operations', 'Engineering', 'Finance'] },
    { id: 'f3', label: 'Description & Notes', type: 'longText', required: false, placeholder: 'Enter details...' }
  ];

  const displayFields = fields.length > 0 ? fields : sampleFields;

  return (
    <div className="h-full flex flex-col bg-zinc-50/70 dark:bg-zinc-950/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800 overflow-hidden pointer-events-none">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-2 shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <div className="w-5 h-5 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
            <Icons.FileText size={11} />
          </div>
          <span className="text-[11px] font-bold text-zinc-900 dark:text-white truncate">
            {widget.title || (targetModule ? `Submit ${targetModule.name}` : 'Submission Form')}
          </span>
        </div>
        <span className={cn(
          "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0",
          moduleId ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        )}>
          {moduleId && targetModule ? targetModule.name : 'Sample Form'}
        </span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5 custom-scrollbar text-xs">
          {displayFields.slice(0, 4).map((f: any, i: number) => (
            <div key={f.id || i} className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">
                {f.label || f.name} {f.required && <span className="text-red-500">*</span>}
              </label>
              {f.type === 'longText' || f.type === 'textarea' ? (
                <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-[10px] text-zinc-400 h-12">
                  {f.placeholder || 'Enter notes or comments...'}
                </div>
              ) : f.type === 'select' ? (
                <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-[10px] text-zinc-500 flex items-center justify-between">
                  <span>Select option...</span>
                  <Icons.ChevronDown size={11} className="text-zinc-400" />
                </div>
              ) : (
                <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-[10px] text-zinc-400">
                  {f.placeholder || `Enter ${f.label || 'value'}...`}
                </div>
              )}
            </div>
          ))}
          <div className="pt-1 flex justify-end">
            <div className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-bold text-[10px]">
              Submit Entry
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const BuilderChartPreview: React.FC<{ widget: any; tenant: any; session: any }> = ({ widget, tenant, session }) => {
  const moduleId = widget.properties?.moduleId;
  const chartType = widget.properties?.chartType || 'bar';
  const chartCacheKey = `chart_data_${tenant?.id || 'default'}_${moduleId || 'none'}`;
  const [chartData, setChartData] = useState<any[]>(() => builderCache.get(chartCacheKey) || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tenant?.id || !moduleId) return;
    let isSubscribed = true;
    const loadChartData = async () => {
      if (!builderCache.has(chartCacheKey)) setLoading(true);
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const res = await fetchRecords(moduleId, tenant.id, token, 1, 50);
        if (isSubscribed) {
          const recs = res.records || [];
          const grouped: Record<string, number> = {};
          recs.forEach((r: any) => {
            const dateStr = new Date(r.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            grouped[dateStr] = (grouped[dateStr] || 0) + 1;
          });
          const formatted = Object.entries(grouped).map(([date, count]) => ({ date, volume: count })).reverse();
          setChartData(formatted);
          builderCache.set(chartCacheKey, formatted);
        }
      } catch (err) {
        console.warn('Failed to load chart records for builder', err);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };
    loadChartData();
    return () => { isSubscribed = false; };
  }, [moduleId, tenant?.id, session?.access_token, chartCacheKey]);

  const sampleChartData = [
    { date: 'Mon', volume: 14 },
    { date: 'Tue', volume: 28 },
    { date: 'Wed', volume: 19 },
    { date: 'Thu', volume: 34 },
    { date: 'Fri', volume: 42 },
    { date: 'Sat', volume: 22 },
    { date: 'Sun', volume: 11 },
  ];

  const dataToRender = moduleId && chartData.length > 0 ? chartData : sampleChartData;

  return (
    <div className="h-full flex flex-col bg-zinc-50/70 dark:bg-zinc-950/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800 overflow-hidden pointer-events-none">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-2 shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <div className="w-5 h-5 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
            <Icons.BarChart size={11} />
          </div>
          <span className="text-[11px] font-bold text-zinc-900 dark:text-white truncate">
            {widget.title || 'Volume Chart'}
          </span>
        </div>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 uppercase shrink-0">
          {chartType} {moduleId ? 'Live' : 'Sample'}
        </span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="flex-1 min-h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%" minHeight={100}>
            {chartType === 'line' ? (
              <LineChart data={dataToRender} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120, 120, 120, 0.15)" />
                <XAxis dataKey="date" stroke="#71717a" fontSize={9} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={9} tickLine={false} />
                <Line type="monotone" dataKey="volume" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            ) : (
              <BarChart data={dataToRender} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120, 120, 120, 0.15)" />
                <XAxis dataKey="date" stroke="#71717a" fontSize={9} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={9} tickLine={false} />
                <Bar dataKey="volume" fill="#6366f1" radius={[3, 3, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

const BuilderRichTextPreview: React.FC<{ widget: any }> = ({ widget }) => {
  const content = widget.properties?.content || '<p>Welcome to your noticeboard! You can customize this message in the widget properties panel.</p>';

  return (
    <div className="h-full flex flex-col bg-zinc-50/70 dark:bg-zinc-950/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800 overflow-hidden pointer-events-none">
      <div className="flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-2 shrink-0">
        <div className="w-5 h-5 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
          <Icons.Layout size={11} />
        </div>
        <span className="text-[11px] font-bold text-zinc-900 dark:text-white truncate">
          {widget.title || 'Noticeboard'}
        </span>
      </div>
      <div 
        className="flex-1 min-h-0 overflow-y-auto custom-scrollbar prose dark:prose-invert max-w-none text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
};

const BuilderStandaloneFormPreview: React.FC<{ widget: any }> = ({ widget }) => {
  const fields = widget.properties?.fields || [
    { id: 'name', label: 'Full Name', type: 'text', required: true, colSpan: 6 },
    { id: 'email', label: 'Email Address', type: 'email', required: true, colSpan: 6 },
    { id: 'comments', label: 'Comments / Inquiry', type: 'textarea', required: false, colSpan: 12 }
  ];

  return (
    <div className="h-full flex flex-col bg-zinc-50/70 dark:bg-zinc-950/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800 overflow-hidden pointer-events-none">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-2 shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <div className="w-5 h-5 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
            <Icons.FileText size={11} />
          </div>
          <span className="text-[11px] font-bold text-zinc-900 dark:text-white truncate">
            {widget.title || 'Standalone Form Embed'}
          </span>
        </div>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 uppercase shrink-0">
          Form Library
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5 custom-scrollbar">
        {widget.properties?.subtitle && (
          <p className="text-[10px] text-zinc-500">{widget.properties.subtitle}</p>
        )}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {fields.map((f: any, idx: number) => (
            <div key={f.id || idx} className={f.colSpan === 12 ? "col-span-2 space-y-1" : "col-span-1 space-y-1"}>
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">
                {f.label} {f.required && <span className="text-red-500">*</span>}
              </label>
              {f.type === 'textarea' ? (
                <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 text-[10px] text-zinc-400 h-12">
                  Enter message...
                </div>
              ) : (
                <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-[10px] text-zinc-400">
                  Enter {f.label}...
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="pt-1 flex justify-end">
          <div className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-bold text-[10px]">
            {widget.properties?.buttonLabel || 'Submit Request'}
          </div>
        </div>
      </div>
    </div>
  );
};

const BuilderReportPreview: React.FC<{ widget: any; tenant: any; session: any }> = ({ widget, tenant, session }) => {
  if (widget.properties?.reportId) {
    return (
      <div className="w-full h-full pointer-events-none scale-[0.96] origin-top bg-zinc-50/70 dark:bg-zinc-950/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <ReportWidgetEmbed widget={widget} tenant={tenant} session={session} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-50/70 dark:bg-zinc-950/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800 overflow-hidden pointer-events-none">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-2 shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <div className="w-5 h-5 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
            <Icons.BarChart3 size={11} />
          </div>
          <span className="text-[11px] font-bold text-zinc-900 dark:text-white truncate">
            {widget.title || 'BI Report Dashboard'}
          </span>
        </div>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 uppercase shrink-0">
          BI Studio
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-between space-y-2">
        <div className="grid grid-cols-3 gap-1.5">
          <div className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
            <span className="text-[8px] font-bold text-zinc-400 uppercase">Revenue</span>
            <p className="text-xs font-black text-indigo-600">$48.5k</p>
          </div>
          <div className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
            <span className="text-[8px] font-bold text-zinc-400 uppercase">Growth</span>
            <p className="text-xs font-black text-emerald-600">+24.8%</p>
          </div>
          <div className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
            <span className="text-[8px] font-bold text-zinc-400 uppercase">Avg SLA</span>
            <p className="text-xs font-black text-amber-600">1.4 hrs</p>
          </div>
        </div>

        <div className="p-3 bg-white/70 dark:bg-zinc-900/70 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-lg text-center flex flex-col items-center justify-center">
          <Icons.BarChart3 size={18} className="text-zinc-400 mb-1" />
          <p className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">Select BI Report</p>
          <p className="text-[9px] text-zinc-400">Choose a published report in widget properties to embed its live visual charts.</p>
        </div>
      </div>
    </div>
  );
};

const BuilderHeroPreview: React.FC<{ widget: any }> = ({ widget }) => {
  return (
    <div className="h-full flex flex-col justify-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl p-4 shadow-sm text-center space-y-2 pointer-events-none overflow-hidden">
      <h3 className="text-sm font-black truncate">{widget.title || 'Welcome to Aurora Platform'}</h3>
      <p className="text-[11px] text-indigo-100 line-clamp-2 max-w-sm mx-auto">
        {widget.properties?.subtitle || 'Empowering operational excellence with modular low-code engines.'}
      </p>
      <div>
        <span className="inline-block px-3 py-1 bg-white text-indigo-600 font-bold text-[10px] rounded-lg shadow-sm">
          {widget.properties?.buttonLabel || 'Explore Portal'}
        </span>
      </div>
    </div>
  );
};

const BuilderFaqPreview: React.FC<{ widget: any }> = ({ widget }) => {
  return (
    <div className="h-full flex flex-col bg-zinc-50/70 dark:bg-zinc-950/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800 overflow-hidden pointer-events-none">
      <div className="flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-2 shrink-0">
        <Icons.HelpCircle size={12} className="text-indigo-500" />
        <span className="text-[11px] font-bold text-zinc-900 dark:text-white truncate">{widget.title || 'Frequently Asked Questions'}</span>
      </div>
      <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto custom-scrollbar text-xs">
        <div className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
          <p className="font-semibold text-[10px] text-zinc-850 dark:text-white">Q: How do I customize this page?</p>
          <p className="text-[9px] text-zinc-500">Drag and drop widgets from the toolbox and configure properties on the right.</p>
        </div>
        <div className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
          <p className="font-semibold text-[10px] text-zinc-850 dark:text-white">Q: Can I embed custom forms and tables?</p>
          <p className="text-[9px] text-zinc-500">Yes, select any custom module or form from your workspace library.</p>
        </div>
      </div>
    </div>
  );
};

const BuilderAccessibleModulesPreview: React.FC<{ widget: any; modules: any[] }> = ({ widget, modules }) => {
  const displayStyle = widget.properties?.displayStyle || 'cards';
  const columns = Number(widget.properties?.columns) || 3;
  const showDescription = widget.properties?.showDescription !== false;
  const showCategory = widget.properties?.showCategory !== false;
  const showSearch = widget.properties?.showSearch !== false;
  const scope = widget.properties?.scope || 'all';
  const selectedModuleIds: string[] = widget.properties?.selectedModuleIds || [];

  const rawDisplayMods = useMemo(() => {
    let list = (modules || []).filter((m: any) => {
      if (m.type === 'PAGE' || m.isGlobal || m.isIntakeTriage || m.config?.isIntakeTriage) return false;
      return true;
    });
    if (scope === 'curated' && selectedModuleIds.length > 0) {
      list = list.filter((m: any) => selectedModuleIds.includes(m.id));
    }
    if (list.length === 0) {
      list = [
        { id: 'm1', name: 'Customer Inquiries', category: 'Support', description: 'Customer tickets and resolution tracking', icon: 'LifeBuoy' },
        { id: 'm2', name: 'Vendor Invoices', category: 'Finance', description: 'Accounts payable and vendor invoice validation', icon: 'Receipt' },
        { id: 'm3', name: 'Employee Directory', category: 'HR', description: 'Staff roster and department alignment', icon: 'Users' },
        { id: 'm4', name: 'Asset Registry', category: 'Operations', description: 'Hardware assets and equipment tracking', icon: 'Server' }
      ];
    }
    return list;
  }, [modules, scope, selectedModuleIds]);

  const resolveIcon = (iconName: any) => {
    if (!iconName) return Icons.Box;
    const LucideIcon = (Icons as any)[iconName];
    return LucideIcon || Icons.Box;
  };

  const gridColClass = columns === 2 ? 'grid-cols-2' : columns === 4 ? 'grid-cols-4' : 'grid-cols-3';

  return (
    <div className="h-full flex flex-col bg-zinc-50/70 dark:bg-zinc-950/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800 overflow-hidden pointer-events-none text-left">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-2 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
            <Icons.Boxes size={11} />
          </div>
          <span className="text-[11px] font-bold text-zinc-900 dark:text-white truncate">
            {widget.title || 'Accessible Modules'}
          </span>
        </div>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 uppercase shrink-0">
          {displayStyle}
        </span>
      </div>

      {showSearch && (
        <div className="mb-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-400">
            <Icons.Search size={10} />
            <span>Search accessible modules...</span>
          </div>
        </div>
      )}

      <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {displayStyle === 'tiles' ? (
          <div className="grid grid-cols-4 gap-2">
            {rawDisplayMods.slice(0, 8).map((m: any, i: number) => {
              const IconComp = resolveIcon(m.icon || m.iconName);
              return (
                <div key={m.id || i} className="flex flex-col items-center justify-center p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center">
                  <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-600 mb-1">
                    <IconComp size={14} />
                  </div>
                  <span className="text-[9px] font-bold text-zinc-800 dark:text-zinc-200 truncate w-full">{m.name}</span>
                </div>
              );
            })}
          </div>
        ) : displayStyle === 'list' || displayStyle === 'compact-list' ? (
          <div className="space-y-1">
            {rawDisplayMods.slice(0, 5).map((m: any, i: number) => {
              const IconComp = resolveIcon(m.icon || m.iconName);
              return (
                <div key={m.id || i} className="flex items-center justify-between p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-600 shrink-0">
                      <IconComp size={11} />
                    </div>
                    <div className="truncate">
                      <p className="text-[10px] font-bold text-zinc-850 dark:text-white truncate">{m.name}</p>
                      {showDescription && displayStyle === 'list' && m.description && (
                        <p className="text-[8px] text-zinc-400 truncate">{m.description}</p>
                      )}
                    </div>
                  </div>
                  {showCategory && m.category && (
                    <span className="text-[8px] px-1 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shrink-0">{m.category}</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className={cn("grid gap-2", gridColClass)}>
            {rawDisplayMods.slice(0, 6).map((m: any, i: number) => {
              const IconComp = resolveIcon(m.icon || m.iconName);
              return (
                <div key={m.id || i} className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-600">
                        <IconComp size={12} />
                      </div>
                      {showCategory && m.category && (
                        <span className="text-[8px] font-bold px-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">{m.category}</span>
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-zinc-850 dark:text-white truncate">{m.name}</p>
                    {showDescription && m.description && (
                      <p className="text-[8px] text-zinc-400 line-clamp-1 mt-0.5">{m.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const BuilderWidgetPreviewRenderer: React.FC<{ widget: any; tenant: any; session: any; modules: any[] }> = ({ widget, tenant, session, modules }) => {
  switch (widget.type) {
    case 'stats-grid':
      return <BuilderStatsGridPreview widget={widget} tenant={tenant} session={session} />;
    case 'active-workflows':
      return <BuilderWorkflowsPreview widget={widget} />;
    case 'queue':
    case 'work-queue':
      if (widget.properties?.queueId) {
        return (
          <div className="w-full h-full pointer-events-none scale-[0.92] origin-top bg-zinc-50/70 dark:bg-zinc-950/50 rounded-xl p-2 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <QueueRenderer queueId={widget.properties.queueId} queueConfig={widget.properties.queueConfig} showHeader={false} readOnly={true} />
          </div>
        );
      }
      return <BuilderQueuePreview widget={widget} />;
    case 'module-table':
      return <BuilderModuleTablePreview widget={widget} tenant={tenant} session={session} modules={modules} />;
    case 'module-creator':
      return <BuilderModuleCreatorPreview widget={widget} tenant={tenant} session={session} modules={modules} />;
    case 'accessible-modules':
    case 'module-directory':
      return <BuilderAccessibleModulesPreview widget={widget} modules={modules} />;
    case 'rich-text':
      return <BuilderRichTextPreview widget={widget} />;
    case 'chart':
      return <BuilderChartPreview widget={widget} tenant={tenant} session={session} />;
    case 'report':
      return <BuilderReportPreview widget={widget} tenant={tenant} session={session} />;
    case 'standalone-form':
      return <BuilderStandaloneFormPreview widget={widget} />;
    case 'hero':
      return <BuilderHeroPreview widget={widget} />;
    case 'faq':
      return <BuilderFaqPreview widget={widget} />;
    default:
      return (
        <div className="h-full flex items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/40 text-[10px] text-zinc-400 font-medium">
          Widget: {widget.title || widget.type}
        </div>
      );
  }
};

const useMyContainerWidth = (loading: boolean) => {
  const [width, setWidth] = useState(1280);
  const [mounted, setMounted] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading) return;
    
    const timer = setTimeout(() => {
      const node = containerRef.current;
      if (node) {
        setWidth(node.offsetWidth || 1280);
        setMounted(true);
      }
    }, 0);

    const node = containerRef.current;
    if (!node) {
      return () => clearTimeout(timer);
    }

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry && entry.contentRect.width) {
          setWidth(entry.contentRect.width);
        }
      });
      observer.observe(node);
    }

    return () => {
      clearTimeout(timer);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [loading]);

  return { width, containerRef, mounted };
};

export const PageBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const returnUrl = (location.state as any)?.returnUrl || searchParams.get('returnUrl');
  const { tenant, refreshModules, modules, menuConfig, isBuilderFullscreen, setIsBuilderFullscreen, setBreadcrumbOverride } = usePlatform();
  const { session } = useAuth();

  useEffect(() => {
    setIsBuilderFullscreen(true);
    return () => {
      setIsBuilderFullscreen(false);
    };
  }, [setIsBuilderFullscreen]);

  const [name, setName] = useState('');
  const [iconName, setIconName] = useState('Layers');
  const [widgets, setWidgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const isInitializedRef = React.useRef(false);

  // Widget settings editing state
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);

  const selectedWidget = widgets.find(w => w.id === selectedWidgetId);

  // Track user modifications after initial page load
  useEffect(() => {
    if (isInitializedRef.current) {
      setIsDirty(true);
    }
  }, [widgets, name, iconName]);

  // Fetch existing layout
  useEffect(() => {
    const loadPage = async () => {
      if (!tenant?.id || !id) return;
      setLoading(true);
      try {
        // Resolve slugified pageName to actual page ID
        let targetId = id;
        const matchedPage = modules.find(
          (m: any) => m.type === 'PAGE' && (slugify(m.name) === id || m.name.toLowerCase() === id.toLowerCase())
        );
        if (matchedPage) {
          targetId = matchedPage.id;
        }
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const pageMod = await fetchModule(targetId, tenant.id, token, modules);
        setName(pageMod.name || '');
        setIconName(pageMod.iconName || pageMod.icon || 'Layers');
        if (id && pageMod?.name) {
          setBreadcrumbOverride(id, pageMod.name);
        }
        
        const loadedWidgets = (pageMod.config?.widgets || pageMod.config?.config?.widgets || pageMod.widgets || []).map((w: any, index: number) => {
          const dims = getWidgetDefaultDimensions(w.type);
          return {
            ...w,
            x: (w.x !== undefined && w.x !== null) ? w.x : (index % 2 === 0 ? 0 : 6),
            y: (w.y !== undefined && w.y !== null) ? w.y : Math.floor(index / 2) * dims.h,
            w: (w.w !== undefined && w.w !== null) ? w.w : dims.w,
            h: (w.h !== undefined && w.h !== null) ? w.h : dims.h
          };
        });
        setWidgets(loadedWidgets);
        setTimeout(() => {
          isInitializedRef.current = true;
          setIsDirty(false);
        }, 100);
      } catch (err) {
        console.error('Failed to fetch page config for builder', err);
        toast.error('Failed to fetch page configuration');
      } finally {
        setLoading(false);
      }
    };
    loadPage();
  }, [id, tenant?.id, session?.access_token, modules, setBreadcrumbOverride]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Page name cannot be empty.');
      return;
    }
    if (!tenant?.id || !id) return;

    // Enforce name uniqueness (prevent duplicate slugs)
    const newSlug = slugify(name);
    const activePage = modules.find(
      (m: any) => m.type === 'PAGE' && (m.id === id || slugify(m.name) === id || m.name.toLowerCase() === id.toLowerCase())
    );
    const actualId = activePage ? activePage.id : id;

    const isDuplicate = modules.some(
      (m: any) => m.type === 'PAGE' && m.id !== actualId && slugify(m.name) === newSlug
    );
    if (isDuplicate) {
      toast.error(`A workspace page with the name "${name}" (slug: "${newSlug}") already exists. Please choose a unique name.`);
      return;
    }

    setSaving(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      
      const response = await fetch(`${DATA_API_URL}/modules/${actualId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({
          name,
          category: 'Workspace Pages',
          iconName,
          type: 'PAGE',
          enabled: true,
          status: 'ACTIVE',
          config: {
            widgets
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save page layout');
      }

      await refreshModules();
      setIsDirty(false);
      toast.success('Page layout saved successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const handleAddWidget = (type: string) => {
    let title = 'New Widget';
    let properties: any = {};

    switch (type) {
      case 'stats-grid':
        title = 'Overview Statistics';
        break;
      case 'active-workflows':
        title = 'Running Workflows';
        break;
      case 'work-queue':
      case 'queue':
        title = type === 'queue' ? 'Work Queue Embed' : 'My Work Inbox';
        properties = {
          viewMode: 'split',
          defaultFilter: 'mine',
          showKpiRibbon: true,
          density: 'comfortable',
          pageSize: 25,
          moduleId: 'all'
        };
        break;
      case 'module-table':
        title = 'Recent Records';
        properties = { moduleId: '' };
        break;
      case 'module-creator':
        title = 'Submit Record Form';
        properties = { moduleId: '' };
        break;
      case 'accessible-modules':
      case 'module-directory':
        title = 'Accessible Modules';
        properties = {
          displayStyle: 'cards',
          columns: 3,
          showDescription: true,
          showCategory: true,
          showSearch: true,
          scope: 'all',
          selectedModuleIds: [],
          subtitle: 'Launch and manage your accessible modules',
          emptyMessage: 'No accessible modules found.'
        };
        break;
      case 'rich-text':
        title = 'Noticeboard';
        properties = { content: '<p>Welcome to your noticeboard!</p>' };
        break;
      case 'chart':
        title = 'Volume Chart';
        properties = { moduleId: '', chartType: 'bar' };
        break;
      case 'report':
        title = 'BI Report Dashboard';
        properties = { reportId: '' };
        break;
      case 'standalone-form':
        title = 'Standalone Form Embed';
        properties = { subtitle: 'Please complete the details below.' };
        break;
      case 'hero':
        title = 'Welcome to Aurora Platform';
        properties = { subtitle: 'Empowering operational excellence with modular low-code engines.' };
        break;
      case 'faq':
        title = 'Frequently Asked Questions';
        properties = {};
        break;
    }

    const dims = getWidgetDefaultDimensions(type);
    const maxY = widgets.reduce((max, w) => {
      const wY = w.y !== undefined ? w.y : 0;
      const wH = w.h !== undefined ? w.h : getWidgetDefaultDimensions(w.type).h;
      return Math.max(max, wY + wH);
    }, 0);

    const newWidget = {
      id: `${type}-${Date.now()}`,
      type,
      title,
      x: 0,
      y: maxY,
      w: dims.w,
      h: dims.h,
      properties
    };

    setWidgets(prev => [...prev, newWidget]);
    setSelectedWidgetId(newWidget.id);
    toast.success(`Added ${title} widget`);
  };

  const handleDeleteWidget = (widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
    if (selectedWidgetId === widgetId) {
      setSelectedWidgetId(null);
    }
  };

  const handleUpdateWidgetTitle = (widgetId: string, title: string) => {
    setWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, title } : w));
  };

  const handleAISuggestedLayout = (suggestedWidgets: any[]) => {
    const positioned = suggestedWidgets.map((w, index) => {
      const dims = getWidgetDefaultDimensions(w.type);
      return {
        ...w,
        x: w.x !== undefined ? w.x : (index % 2 === 0 ? 0 : 6),
        y: w.y !== undefined ? w.y : Math.floor(index / 2) * dims.h,
        w: w.w !== undefined ? w.w : dims.w,
        h: w.h !== undefined ? w.h : dims.h
      };
    });
    setWidgets(positioned);
    toast.success('AI layout applied to canvas!');
  };

  const { width, containerRef, mounted } = useMyContainerWidth(loading);

  const layout = useMemo(() => {
    return widgets.map((w, index) => {
      const dims = getWidgetDefaultDimensions(w.type);
      return {
        i: w.id,
        x: (w.x !== undefined && w.x !== null) ? w.x : (index % 2 === 0 ? 0 : 6),
        y: (w.y !== undefined && w.y !== null) ? w.y : Math.floor(index / 2) * dims.h,
        w: (w.w !== undefined && w.w !== null) ? w.w : dims.w,
        h: (w.h !== undefined && w.h !== null) ? w.h : dims.h,
        minW: dims.minW,
        minH: dims.minH
      };
    });
  }, [widgets]);

  const handleLayoutChange = (newLayout: any[]) => {
    let hasChanged = false;
    const updatedWidgets = widgets.map(w => {
      const match = newLayout.find(l => l.i === w.id);
      if (match) {
        if (w.x !== match.x || w.y !== match.y || w.w !== match.w || w.h !== match.h) {
          hasChanged = true;
          return {
            ...w,
            x: match.x,
            y: match.y,
            w: match.w,
            h: match.h
          };
        }
      }
      return w;
    });

    if (hasChanged) {
      setWidgets(updatedWidgets);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-zinc-500 text-sm">Loading visual builder...</p>
      </div>
    );
  }

  const PageIcon = (Icons as any)[iconName] || Icons.Layout;

  return (
    <div className={cn(
      "flex flex-col w-full bg-transparent overflow-hidden transition-all duration-300",
      isBuilderFullscreen ? "h-screen" : "h-[calc(100vh-4rem)]"
    )}>
      {/* Top Header */}
      <div className={cn(
        "px-6 lg:px-12 py-5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 flex items-center justify-between z-10 relative transition-all duration-300",
        isBuilderFullscreen && "py-2 px-4 lg:px-6 bg-white dark:bg-zinc-900 shadow-sm"
      )}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (isDirty) {
                setShowUnsavedConfirm(true);
              } else {
                setIsBuilderFullscreen(false);
                if (returnUrl) {
                  navigate(returnUrl);
                } else {
                  navigate('/workspace/settings/pages');
                }
              }
            }}
            className={cn(
              "rounded-xl border border-zinc-200 dark:border-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors bg-white/50 dark:bg-white/[0.01]",
              isBuilderFullscreen ? "p-1.5" : "p-2.5"
            )}
            title={returnUrl ? "Back to Workspace" : "Back to Pages"}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <PageIcon className="text-indigo-500" size={isBuilderFullscreen ? 16 : 18} />
              <input
                type="text"
                placeholder="Enter Page Name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={cn(
                  "font-black text-zinc-900 dark:text-white bg-transparent border-none outline-none focus:ring-1 focus:ring-indigo-500/20 rounded px-1 transition-all",
                  isBuilderFullscreen ? "text-sm font-bold" : "text-lg"
                )}
              />
            </div>
            {!isBuilderFullscreen && (
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Visual Page Builder</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">

          <Button 
            onClick={() => setShowAIModal(true)}
            variant="secondary"
            className={cn(
              "gap-2 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 font-bold",
              isBuilderFullscreen && "py-1.5 px-3 text-xs"
            )}
          >
            <Sparkles size={16} />
            Build with AI
          </Button>

          <Button 
            onClick={() => navigate(`/workspace/pages/${slugify(name)}`)}
            variant="secondary"
            className={cn("gap-2 font-bold", isBuilderFullscreen && "py-1.5 px-3 text-xs")}
          >
            <Eye size={16} />
            Preview Page
          </Button>

          <Button 
            onClick={handleSave} 
            loading={saving} 
            className={cn("gap-2 shadow-lg shadow-indigo-500/10 font-bold", isBuilderFullscreen && "py-1.5 px-3 text-xs")}
          >
            <Save size={16} />
            Save Layout
          </Button>
        </div>
      </div>

      {/* Main Split Screen Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Left Sidebar (Widget Toolbox) */}
        <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900 flex flex-col gap-4 overflow-y-auto shrink-0 z-20">
          <div>
            <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-250 uppercase tracking-widest">Widget Toolbox</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">Click a widget to place it on the layout canvas.</p>
          </div>

          <div className="grid grid-cols-1 gap-2 text-xs">
            {[
              { type: 'accessible-modules', label: 'Module Directory', icon: Icons.Boxes, desc: 'List modules accessible to the current user with custom card/list layouts.' },
              { type: 'stats-grid', label: 'Stats Metrics Grid', icon: Cpu, desc: 'Display summaries of key tenant parameters.' },
              { type: 'active-workflows', label: 'Active Workflows', icon: Icons.Workflow, desc: 'Show currently executing workflows.' },
              { type: 'queue', label: 'Work Queue Embed', icon: Icons.ListOrdered, desc: 'Embed any standalone or unified queue from your library.' },
              { type: 'work-queue', label: 'My Work Inbox', icon: Icons.ClipboardList, desc: 'Embed the personal work inbox for cases.' },
              { type: 'module-table', label: 'Module Records Table', icon: Icons.Database, desc: 'Display a paginated list of records from a module.' },
              { type: 'module-creator', label: 'Module Submission Form', icon: Icons.FileText, desc: 'Render a form to create entries in a module.' },
              { type: 'rich-text', label: 'Noticeboard / Rich Text', icon: Layout, desc: 'Provide HTML or instruction text blocks.' },
              { type: 'chart', label: 'Volume Chart', icon: Icons.BarChart, desc: 'Visualize case volume charts.' },
              { type: 'report', label: 'BI Report Dashboard', icon: Icons.BarChart3, desc: 'Embed a published visual report.' },
              { type: 'standalone-form', label: 'Standalone Form Embed', icon: Icons.FileText, desc: 'Embed a standalone form from your library.' },
            ].map((item) => {
              return (
                <button
                  key={item.type}
                  onClick={() => handleAddWidget(item.type)}
                  className="flex items-start gap-3 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-500/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-all text-left group shadow-2xs"
                >
                  <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:text-indigo-500 group-hover:scale-105 transition-all">
                    {React.createElement(item.icon, { size: 16 })}
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-850 dark:text-white">{item.label}</h4>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-normal mt-0.5">{item.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Canvas */}
        <div 
          ref={containerRef} 
          className="flex-1 p-6 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950 relative custom-scrollbar select-none z-10"
          onClick={() => setSelectedWidgetId(null)}
        >
          {widgets.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl text-center space-y-3 p-6 bg-white dark:bg-zinc-900 mt-10 shadow-2xs">
              <Layout size={40} className="text-zinc-300 dark:text-zinc-700" />
              <div>
                <h4 className="text-sm font-bold text-zinc-650 dark:text-zinc-350">Canvas is empty</h4>
                <p className="text-xs text-zinc-500 mt-0.5">Use the widget toolbox on the left to add cards onto this page.</p>
              </div>
            </div>
          ) : (
            mounted && (
              <ReactGridLayout
              className="layout"
                layout={layout}
                width={width}
                onLayoutChange={handleLayoutChange}
                gridConfig={{
                  cols: 12,
                  rowHeight: 50,
                  margin: [24, 24],
                  containerPadding: [0, 0]
                }}
                dragConfig={{
                  enabled: true,
                  handle: ".drag-handle"
                }}
                resizeConfig={{
                  enabled: true
                }}
              >
                {widgets.map((widget) => {
                  const isSelected = selectedWidgetId === widget.id;

                  return (
                    <div 
                      key={widget.id} 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedWidgetId(widget.id);
                      }}
                      className={cn(
                        "p-4 bg-white dark:bg-zinc-900 border rounded-2xl flex flex-col justify-between transition-all relative group shadow-2xs overflow-hidden",
                        isSelected ? "border-indigo-500 ring-2 ring-indigo-500/10" : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                      )}
                    >
                      {/* Widget Actions Top Panel */}
                      <div className="flex items-center justify-between mb-3 shrink-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="drag-handle text-zinc-400 hover:text-zinc-600 dark:text-zinc-550 dark:hover:text-zinc-400 cursor-grab active:cursor-grabbing p-0.5 rounded flex items-center shrink-0">
                            <GripVertical size={12} />
                          </div>
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-500 dark:text-zinc-400">
                            {widget.type}
                          </span>
                          <input
                            type="text"
                            value={widget.title}
                            onChange={(e) => handleUpdateWidgetTitle(widget.id, e.target.value)}
                            className="bg-transparent border-none outline-none font-bold text-xs text-zinc-850 dark:text-white w-40 focus:ring-1 focus:ring-indigo-500/30 rounded"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Delete */}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteWidget(widget.id);
                            }}
                            className="p-1 rounded text-zinc-450 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Preview Layout Placeholder / Live Preview */}
                      <div className="w-full flex-1 min-h-0 relative">
                        <BuilderWidgetPreviewRenderer 
                          widget={widget} 
                          tenant={tenant} 
                          session={session} 
                          modules={modules} 
                        />
                      </div>
                    </div>
                  );
                })}
              </ReactGridLayout>
            )
          )}
        </div>

        {/* Right Sidebar (Properties Panel) */}
        <div className="w-80 border-l border-zinc-200 dark:border-zinc-800 p-5 bg-white dark:bg-zinc-900 flex flex-col gap-4 overflow-y-auto shrink-0 z-20">
          {selectedWidget ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-2">
                <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-1.5">
                  <SlidersHorizontal size={13} className="text-indigo-500" />
                  Widget Properties
                </h3>
              </div>

              <div className="space-y-4 text-xs">
                {/* Visual Title */}
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-500 uppercase tracking-wider block">Widget Title</label>
                  <input
                    type="text"
                    value={selectedWidget.title}
                    onChange={(e) => handleUpdateWidgetTitle(selectedWidget.id, e.target.value)}
                    className="w-full bg-zinc-50/50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 outline-none focus:ring-1 focus:ring-indigo-500/30"
                  />
                </div>

                {/* Module selection for module-based widgets */}
                {['module-table', 'module-creator', 'chart'].includes(selectedWidget.type) && (
                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-500 uppercase tracking-wider block">Target Custom Module</label>
                    <select
                      value={selectedWidget.properties?.moduleId || ''}
                      onChange={(e) => {
                        const mId = e.target.value;
                        setWidgets(prev => prev.map(w => {
                          if (w.id === selectedWidget.id) {
                            return { ...w, properties: { ...w.properties, moduleId: mId } };
                          }
                          return w;
                        }));
                      }}
                      className="w-full bg-zinc-55 dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 outline-none text-zinc-850 dark:text-white focus:border-indigo-500/50"
                    >
                      <option value="">Select custom module...</option>
                      {modules
                        .filter((m: any) => {
                          if (m.type === 'PAGE') return false;
                          const isPlatform = PLATFORM_MODULES.some(pm => pm.id === m.id || pm.id === m.templateId || pm.name === m.name || pm.slug === m.templateId);
                          if (isPlatform) return false;
                          if (m.isGlobal || m.isIntakeTriage || m.config?.isIntakeTriage) return false;
                          return true;
                        })
                        .map((m: any) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Report selection properties */}
                {selectedWidget.type === 'report' && (
                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-500 uppercase tracking-wider block">Select BI Report</label>
                    <ReportDropdown 
                      selectedWidget={selectedWidget} 
                      setWidgets={setWidgets}
                      tenant={tenant}
                      session={session}
                    />
                  </div>
                )}

                {/* Work Queue selection & rich configuration properties */}
                {(selectedWidget.type === 'work-queue' || selectedWidget.type === 'queue') && (
                  <div className="space-y-3.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-zinc-500 uppercase tracking-wider block">Bound Work Queue</label>
                        <button
                          type="button"
                          onClick={() => navigate('/workspace/settings/platform-modules/queues-management')}
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                        >
                          Manage Queues
                        </button>
                      </div>
                      <QueueDropdown 
                        selectedWidget={selectedWidget} 
                        setWidgets={setWidgets}
                        tenant={tenant}
                        modules={modules}
                        menuConfig={menuConfig}
                        session={session}
                      />
                      <p className="text-[10px] text-zinc-400">
                        Bind to a configured queue or use Personal Unified Inbox.
                      </p>
                    </div>

                    {/* View Mode */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-zinc-500 uppercase tracking-wider block">Default View Layout</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'split', label: 'Split Pane' },
                          { id: 'list', label: 'Feed List' },
                          { id: 'kanban', label: 'Kanban' }
                        ].map((mode) => (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => {
                              setWidgets(prev => prev.map(w => {
                                if (w.id === selectedWidget.id) {
                                  return { ...w, properties: { ...w.properties, viewMode: mode.id } };
                                }
                                return w;
                              }));
                            }}
                            className={cn(
                              "py-1.5 px-2 rounded-lg border text-center font-bold text-[10px] transition-all",
                              (selectedWidget.properties?.viewMode || 'split') === mode.id
                                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                                : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                            )}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Default Filter Tab */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-zinc-500 uppercase tracking-wider block">Default Filter Tab</label>
                      <select
                        value={selectedWidget.properties?.defaultFilter || 'mine'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWidgets(prev => prev.map(w => {
                            if (w.id === selectedWidget.id) {
                              return { ...w, properties: { ...w.properties, defaultFilter: val } };
                            }
                            return w;
                          }));
                        }}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="mine">Assigned to Me</option>
                        <option value="urgent">Urgent & High SLA</option>
                        <option value="due_today">Due Soon / Backlog</option>
                        <option value="unassigned">Unassigned Pool</option>
                        <option value="in_progress">In Progress</option>
                        <option value="all">All Cases</option>
                      </select>
                    </div>

                    {/* Module Scope */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-zinc-500 uppercase tracking-wider block">Module Scope</label>
                      <select
                        value={selectedWidget.properties?.moduleId || 'all'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWidgets(prev => prev.map(w => {
                            if (w.id === selectedWidget.id) {
                              return { ...w, properties: { ...w.properties, moduleId: val === 'all' ? undefined : val } };
                            }
                            return w;
                          }));
                        }}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="all">All Active Modules</option>
                        {modules.map((m: any) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* KPI Ribbon Toggle */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <label className="font-bold text-zinc-700 dark:text-zinc-300 text-xs block">Show KPI Ribbon</label>
                        <p className="text-[10px] text-zinc-400">Display summary counters at top</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedWidget.properties?.showKpiRibbon !== false}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setWidgets(prev => prev.map(w => {
                            if (w.id === selectedWidget.id) {
                              return { ...w, properties: { ...w.properties, showKpiRibbon: checked } };
                            }
                            return w;
                          }));
                        }}
                        className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* Accessible Modules / Module Directory properties */}
                {(selectedWidget.type === 'accessible-modules' || selectedWidget.type === 'module-directory') && (
                  <div className="space-y-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    {/* Subtitle */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-zinc-500 uppercase tracking-wider block">Subtitle / Description</label>
                      <input
                        type="text"
                        placeholder="e.g. Launch and manage your accessible modules"
                        value={selectedWidget.properties?.subtitle || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWidgets((prev: any[]) => prev.map(w => w.id === selectedWidget.id ? { ...w, properties: { ...w.properties, subtitle: val } } : w));
                        }}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 outline-none text-zinc-850 dark:text-white focus:border-indigo-500/50 text-xs"
                      />
                    </div>

                    {/* Display Style Selector */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-zinc-500 uppercase tracking-wider block">Display Style</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: 'cards', label: 'Bento Cards', icon: Icons.LayoutGrid },
                          { id: 'tiles', label: 'Compact Tiles', icon: Icons.Grid },
                          { id: 'list', label: 'Detailed List', icon: Icons.List },
                          { id: 'compact-list', label: 'Compact Rows', icon: Icons.Menu },
                          { id: 'grouped', label: 'By Category', icon: Icons.Layers }
                        ].map((mode) => {
                          const isSelected = (selectedWidget.properties?.displayStyle || 'cards') === mode.id;
                          const ModeIcon = mode.icon;
                          return (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => {
                                setWidgets((prev: any[]) => prev.map(w => w.id === selectedWidget.id ? { ...w, properties: { ...w.properties, displayStyle: mode.id } } : w));
                              }}
                              className={cn(
                                "flex items-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition-all text-left cursor-pointer",
                                isSelected
                                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                              )}
                            >
                              <ModeIcon size={13} className={isSelected ? "text-indigo-500" : "text-zinc-400"} />
                              <span>{mode.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Grid Columns Selector (for cards & grouped) */}
                    {['cards', 'grouped'].includes(selectedWidget.properties?.displayStyle || 'cards') && (
                      <div className="space-y-1.5">
                        <label className="font-bold text-zinc-500 uppercase tracking-wider block">Grid Columns</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[2, 3, 4].map((cols) => {
                            const isSelected = (Number(selectedWidget.properties?.columns) || 3) === cols;
                            return (
                              <button
                                key={cols}
                                type="button"
                                onClick={() => {
                                  setWidgets((prev: any[]) => prev.map(w => w.id === selectedWidget.id ? { ...w, properties: { ...w.properties, columns: cols } } : w));
                                }}
                                className={cn(
                                  "py-1.5 px-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer",
                                  isSelected
                                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                                    : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                                )}
                              >
                                {cols} Columns
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Module Scope Selection */}
                    <div className="space-y-2">
                      <label className="font-bold text-zinc-500 uppercase tracking-wider block">Module Scope</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: 'all', label: 'All Accessible' },
                          { id: 'curated', label: 'Curated Selection' }
                        ].map((sc) => {
                          const isSelected = (selectedWidget.properties?.scope || 'all') === sc.id;
                          return (
                            <button
                              key={sc.id}
                              type="button"
                              onClick={() => {
                                setWidgets((prev: any[]) => prev.map(w => w.id === selectedWidget.id ? { ...w, properties: { ...w.properties, scope: sc.id } } : w));
                              }}
                              className={cn(
                                "p-2 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer",
                                isSelected
                                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 text-zinc-600 dark:text-zinc-400"
                              )}
                            >
                              {sc.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Curated Module Multi-Select Checkboxes */}
                      {selectedWidget.properties?.scope === 'curated' && (
                        <div className="mt-2 p-2.5 bg-zinc-50/70 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Select modules to include:</p>
                          {modules
                            .filter((m: any) => m.type !== 'PAGE' && !m.isGlobal && !m.isIntakeTriage)
                            .map((m: any) => {
                              const selectedIds: string[] = selectedWidget.properties?.selectedModuleIds || [];
                              const isChecked = selectedIds.includes(m.id);
                              return (
                                <label
                                  key={m.id}
                                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-xs"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const nextIds = e.target.checked
                                        ? [...selectedIds, m.id]
                                        : selectedIds.filter(id => id !== m.id);
                                      setWidgets((prev: any[]) => prev.map(w => w.id === selectedWidget.id ? { ...w, properties: { ...w.properties, selectedModuleIds: nextIds } } : w));
                                    }}
                                    className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{m.name}</span>
                                  {m.category && (
                                    <span className="ml-auto text-[9px] text-zinc-400 px-1 rounded bg-zinc-100 dark:bg-zinc-800">{m.category}</span>
                                  )}
                                </label>
                              );
                            })}
                        </div>
                      )}
                    </div>

                    {/* Feature Toggles */}
                    <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <label className="font-bold text-zinc-500 uppercase tracking-wider block">Visual Elements</label>
                      
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 dark:text-zinc-300">
                        <input
                          type="checkbox"
                          checked={selectedWidget.properties?.showDescription !== false}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setWidgets((prev: any[]) => prev.map(w => w.id === selectedWidget.id ? { ...w, properties: { ...w.properties, showDescription: val } } : w));
                          }}
                          className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Show Module Descriptions</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 dark:text-zinc-300">
                        <input
                          type="checkbox"
                          checked={selectedWidget.properties?.showCategory !== false}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setWidgets((prev: any[]) => prev.map(w => w.id === selectedWidget.id ? { ...w, properties: { ...w.properties, showCategory: val } } : w));
                          }}
                          className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Show Category Badges</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 dark:text-zinc-300">
                        <input
                          type="checkbox"
                          checked={selectedWidget.properties?.showSearch !== false}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setWidgets((prev: any[]) => prev.map(w => w.id === selectedWidget.id ? { ...w, properties: { ...w.properties, showSearch: val } } : w));
                          }}
                          className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Show In-Widget Search & Filter Bar</span>
                      </label>
                    </div>

                    {/* Empty Message */}
                    <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <label className="font-bold text-zinc-500 uppercase tracking-wider block">Empty State Message</label>
                      <input
                        type="text"
                        placeholder="No accessible modules found."
                        value={selectedWidget.properties?.emptyMessage || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWidgets((prev: any[]) => prev.map(w => w.id === selectedWidget.id ? { ...w, properties: { ...w.properties, emptyMessage: val } } : w));
                        }}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 outline-none text-zinc-850 dark:text-white focus:border-indigo-500/50 text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Chart type properties */}
                {selectedWidget.type === 'chart' && (
                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-500 uppercase tracking-wider block">Chart Type</label>
                    <div className="flex gap-2">
                      {['bar', 'line'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setWidgets(prev => prev.map(w => {
                              if (w.id === selectedWidget.id) {
                                  return { ...w, properties: { ...w.properties, chartType: t } };
                              }
                              return w;
                            }));
                          }}
                          className={cn(
                            "flex-1 py-1 px-3 rounded-lg border text-center uppercase font-bold text-[10px]",
                            selectedWidget.properties?.chartType === t
                              ? "border-indigo-500 bg-indigo-50/10 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                              : "border-zinc-200 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 text-zinc-500"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rich text properties */}
                {selectedWidget.type === 'rich-text' && (
                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-500 uppercase tracking-wider block">Rich HTML Content</label>
                    <textarea
                      placeholder="Type HTML / Markdown content here..."
                      value={selectedWidget.properties?.content || ''}
                      onChange={(e) => {
                        const txt = e.target.value;
                        setWidgets((prev: any[]) => prev.map(w => {
                          if (w.id === selectedWidget.id) {
                            return { ...w, properties: { ...w.properties, content: txt } };
                          }
                          return w;
                        }));
                      }}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 outline-none font-mono resize-none h-40 text-zinc-850 dark:text-white focus:border-indigo-500/50"
                    />
                  </div>
                )}

                {/* Standalone Form properties */}
                {selectedWidget.type === 'standalone-form' && (
                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-500 uppercase tracking-wider block">Subtitle / Description</label>
                    <input
                      type="text"
                      placeholder="Please fill out the information below..."
                      value={selectedWidget.properties?.subtitle || ''}
                      onChange={(e) => {
                        const txt = e.target.value;
                        setWidgets((prev: any[]) => prev.map(w => {
                          if (w.id === selectedWidget.id) {
                            return { ...w, properties: { ...w.properties, subtitle: txt } };
                          }
                          return w;
                        }));
                      }}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 outline-none text-zinc-850 dark:text-white focus:border-indigo-500/50"
                    />
                  </div>
                )}

                {/* Hero section properties */}
                {selectedWidget.type === 'hero' && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="font-bold text-zinc-500 uppercase tracking-wider block">Hero Subtitle</label>
                      <input
                        type="text"
                        placeholder="Hero subtitle text..."
                        value={selectedWidget.properties?.subtitle || ''}
                        onChange={(e) => {
                          const txt = e.target.value;
                          setWidgets((prev: any[]) => prev.map(w => {
                            if (w.id === selectedWidget.id) {
                              return { ...w, properties: { ...w.properties, subtitle: txt } };
                            }
                            return w;
                          }));
                        }}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 outline-none text-zinc-850 dark:text-white focus:border-indigo-500/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-bold text-zinc-500 uppercase tracking-wider block">Button Label</label>
                      <input
                        type="text"
                        placeholder="Explore Portal"
                        value={selectedWidget.properties?.buttonLabel || ''}
                        onChange={(e) => {
                          const txt = e.target.value;
                          setWidgets((prev: any[]) => prev.map(w => {
                            if (w.id === selectedWidget.id) {
                              return { ...w, properties: { ...w.properties, buttonLabel: txt } };
                            }
                            return w;
                          }));
                        }}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 outline-none text-zinc-850 dark:text-white focus:border-indigo-500/50"
                      />
                    </div>
                  </div>
                )}

                {/* Grid Position Coordinates Info */}
                <div className="border-t border-zinc-200/50 dark:border-white/5 pt-3 mt-3 space-y-1 text-[10px] text-zinc-400">
                  <span className="font-bold uppercase tracking-widest text-zinc-450 block">Layout Geometry</span>
                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <div>X Pos: {selectedWidget.x}</div>
                    <div>Y Pos: {selectedWidget.y}</div>
                    <div>Width: {selectedWidget.w}</div>
                    <div>Height: {selectedWidget.h}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
              <Settings size={28} className="text-zinc-300 dark:text-zinc-650" />
              <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">No Widget Selected</h4>
              <p className="text-[10px] text-zinc-500 leading-normal">Click on any widget on the canvas to configure its settings.</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Page Builder Modal */}
      <PageAIBuilderModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onLayoutGenerated={handleAISuggestedLayout}
        modules={modules}
      />

      {showUnsavedConfirm && (
        <UnsavedChangesModal
          isOpen={showUnsavedConfirm}
          entityName="page"
          isSaving={saving}
          onSaveAndExit={async () => {
            await handleSave();
            setIsDirty(false);
            setShowUnsavedConfirm(false);
            setIsBuilderFullscreen(false);
            if (returnUrl) {
              navigate(returnUrl);
            } else {
              navigate('/workspace/settings/pages');
            }
          }}
          onDiscardAndExit={() => {
            setIsDirty(false);
            setShowUnsavedConfirm(false);
            setIsBuilderFullscreen(false);
            if (returnUrl) {
              navigate(returnUrl);
            } else {
              navigate('/workspace/settings/pages');
            }
          }}
          onCancel={() => setShowUnsavedConfirm(false)}
        />
      )}
    </div>
  );
};

const ReportDropdown = ({ selectedWidget, setWidgets, tenant, session }: any) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReportsList = async () => {
      if (!tenant?.id) return;
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const res = await fetch(`${API_BASE_URL}/api/reports`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant.id
          }
        });
        if (res.ok) {
          const data = await res.json();
          setReports(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to fetch reports list', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReportsList();
  }, [tenant?.id, session?.access_token]);

  return (
    <select
      value={selectedWidget.properties?.reportId || ''}
      onChange={async (e) => {
        const rId = e.target.value;
        const targetReport = reports.find((r: any) => r.id === rId);

        // If report is in Draft, publish it so it renders properly in workspace view
        if (targetReport && targetReport.status === 'Draft' && tenant?.id) {
          try {
            const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
            await fetch(`${API_BASE_URL}/api/reports/${rId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-tenant-id': tenant.id
              },
              body: JSON.stringify({ status: 'Published' })
            });
            targetReport.status = 'Published';
          } catch (err) {
            console.error('Failed to auto-publish selected draft report:', err);
          }
        }

        setWidgets((prev: any[]) => prev.map(w => {
          if (w.id === selectedWidget.id) {
            return { 
              ...w, 
              title: w.title === 'BI Report Dashboard' || !w.title ? (targetReport?.name || 'BI Report Dashboard') : w.title,
              properties: { ...w.properties, reportId: rId } 
            };
          }
          return w;
        }));
      }}
      disabled={loading}
      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
    >
      {loading ? (
        <option className="bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">Loading reports...</option>
      ) : reports.length === 0 ? (
        <option value="" className="bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">No reports found</option>
      ) : (
        <>
          <option value="" className="bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">Select report...</option>
          {reports.map((r: any) => (
            <option key={r.id} value={r.id} className="bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
              {r.name} {r.status === 'Draft' ? '(Draft)' : ''}
            </option>
          ))}
        </>
      )}
    </select>
  );
};

const QueueDropdown = ({ selectedWidget, setWidgets, tenant, modules, menuConfig, session }: any) => {
  const [apiQueues, setApiQueues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQueuesList = async () => {
      if (!tenant?.id) return;
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const res = await fetch(`${API_BASE_URL}/api/queues`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant.id
          }
        });
        if (res.ok) {
          const data = await res.json();
          setApiQueues(data || []);
        }
      } catch (err) {
        console.error('Failed to fetch queues list for builder', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQueuesList();
  }, [tenant?.id, session?.access_token]);

  const allAvailableQueues = useMemo(() => {
    const extracted: any[] = [];

    const walk = (items: any[]) => {
      if (!Array.isArray(items)) return;
      for (const item of items) {
        const isDemo = item.id === 'queue_support_priority' || item.id === 'queue_global_triage';
        const isGenericPersonal = (item.to === '/workspace/my-work' || item.to === '/workspace/queue') && !item.queueConfig && !item.moduleId && (!item.moduleIds || item.moduleIds.length === 0);

        const isQ = !isDemo && !isGenericPersonal && Boolean(
          item.queueConfig ||
          item.isUnifiedQueue ||
          (item.moduleIds && item.moduleIds.length > 0) ||
          item.to?.startsWith('/workspace/queues/') ||
          item.to?.includes('queueId=') ||
          (item.moduleId && item.to?.includes('queue'))
        );

        if (isQ) {
          extracted.push({
            id: item.id || `queue_${slugify(item.label || 'queue')}`,
            name: item.label || 'Work Queue',
            isUnifiedQueue: Boolean(item.isUnifiedQueue || item.to?.startsWith('/workspace/queues/') || (item.moduleIds && item.moduleIds.length > 1)),
            moduleId: item.moduleId,
            moduleIds: item.moduleIds || (item.moduleId ? [item.moduleId] : []),
            queueConfig: item.queueConfig
          });
        }
        if (item.children) walk(item.children);
      }
    };

    if (menuConfig?.sections) {
      menuConfig.sections.forEach((sec: any) => walk(sec.items || []));
    }
    if ((tenant?.menuConfig as any)?.sections) {
      (tenant.menuConfig as any).sections.forEach((sec: any) => walk(sec.items || []));
    }

    // Also check modules
    (modules || []).forEach((m: any) => {
      if (m.config?.queues && Array.isArray(m.config.queues)) {
        m.config.queues.forEach((q: any) => {
          extracted.push({
            id: q.id || `mod_queue_${m.id}`,
            name: q.name || `${m.name} Queue`,
            isUnifiedQueue: false,
            moduleId: m.id,
            moduleIds: [m.id],
            queueConfig: q.queueConfig
          });
        });
      }
    });

    const list: any[] = [];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    apiQueues
      .filter((q: any) => q.id !== 'queue_support_priority' && q.id !== 'queue_global_triage')
      .forEach((q: any) => {
        const nameKey = (q.name || '').trim().toLowerCase();
        if (!seenIds.has(q.id) && !seenNames.has(nameKey)) {
          seenIds.add(q.id);
          if (nameKey) seenNames.add(nameKey);
          list.push(q);
        }
      });

    extracted.forEach((q: any) => {
      const nameKey = (q.name || '').trim().toLowerCase();
      if (!seenIds.has(q.id) && !seenNames.has(nameKey)) {
        seenIds.add(q.id);
        if (nameKey) seenNames.add(nameKey);
        list.push(q);
      }
    });

    return list;
  }, [apiQueues, menuConfig, tenant?.menuConfig, modules]);

  return (
    <select
      value={selectedWidget.properties?.queueId || ''}
      onChange={(e) => {
        const qId = e.target.value;
        const selectedQ = allAvailableQueues.find(q => q.id === qId);
        setWidgets((prev: any[]) => prev.map(w => {
          if (w.id === selectedWidget.id) {
            return {
              ...w,
              title: selectedQ ? selectedQ.name : (w.title || 'Work Queue'),
              properties: { 
                ...w.properties, 
                queueId: qId || undefined, 
                queueConfig: selectedQ?.queueConfig,
                moduleId: selectedQ?.moduleId,
                moduleIds: selectedQ?.moduleIds
              }
            };
          }
          return w;
        }));
      }}
      disabled={loading}
      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
    >
      <option value="">Personal Inbox (Default My Work)</option>
      {loading ? (
        <option disabled>Loading queues from library...</option>
      ) : (
        allAvailableQueues.map((q: any) => (
          <option key={q.id} value={q.id}>
            {q.name} ({q.isUnifiedQueue ? 'Unified Multi-Module' : 'Single Module'})
          </option>
        ))
      )}
    </select>
  );
};


