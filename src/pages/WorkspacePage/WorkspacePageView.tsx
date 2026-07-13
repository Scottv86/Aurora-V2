import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { 
  Layout, Database, Cpu, ShieldCheck, Globe, Workflow, 
  ChevronRight, Loader2
} from 'lucide-react';
import ReactGridLayout from 'react-grid-layout';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/UI/Primitives';
import { PageWrapper } from '../../components/Common/PageWrapper';
import { Skeleton } from '../../components/UI/Skeleton';
import { WorkQueue } from '../../components/WorkQueue';
import { fetchModule, fetchRecords } from '../../services/dataService';
import { API_BASE_URL, DATA_API_URL } from '../../config';
import { cn, slugify } from '../../lib/utils';
import { toast } from 'sonner';
import { createFormulaContext } from '../../lib/formulaEngine';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend } from 'recharts';
import { getWidgetDefaultDimensions } from './PageBuilder';

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

export const VisualSkeleton: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'kpi':
      return (
        <div className="w-full flex flex-col items-center justify-center space-y-3 animate-pulse">
          <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
          <div className="h-10 w-28 bg-zinc-300 dark:bg-zinc-700 rounded-2xl" />
        </div>
      );
    case 'table':
      return (
        <div className="w-full h-full flex flex-col space-y-3.5 p-1 animate-pulse">
          <div className="flex justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
            <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
          </div>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex justify-between items-center">
              <div className="h-3.5 w-24 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
              <div className="h-3 w-10 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
            </div>
          ))}
        </div>
      );
    case 'bar':
    case 'line':
    case 'area':
      return (
        <div className="w-full h-full flex flex-col justify-end space-y-4 p-2 animate-pulse">
          <div className="flex-1 flex items-end gap-5 px-4">
            <div className="w-full h-[60%] bg-zinc-200 dark:bg-zinc-800 rounded-t-lg" />
            <div className="w-full h-[35%] bg-zinc-300 dark:bg-zinc-700 rounded-t-lg" />
            <div className="w-full h-[80%] bg-zinc-200 dark:bg-zinc-800 rounded-t-lg" />
            <div className="w-full h-[50%] bg-zinc-300 dark:bg-zinc-700 rounded-t-lg" />
            <div className="w-full h-[95%] bg-zinc-200 dark:bg-zinc-800 rounded-t-lg" />
          </div>
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2 flex justify-between">
            <div className="h-2 w-8 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
            <div className="h-2 w-8 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
            <div className="h-2 w-8 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
            <div className="h-2 w-8 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
            <div className="h-2 w-8 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
          </div>
        </div>
      );
    case 'pie':
      return (
        <div className="w-full h-full flex items-center justify-center gap-6 p-2 animate-pulse">
          <div className="relative w-28 h-28 rounded-full border-8 border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-t-8 border-r-8 border-zinc-300 dark:border-zinc-750 rotate-45" />
          </div>
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <div className="h-2.5 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-2.5 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
            </div>
          </div>
        </div>
      );
    default:
      return (
        <div className="w-full h-full flex flex-col space-y-4 p-4 animate-pulse">
          <div className="h-4 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
          <div className="h-8 w-full bg-zinc-300 dark:bg-zinc-750 rounded-2xl" />
          <div className="h-24 w-full bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
        </div>
      );
  }
};

export const WorkspacePageView = () => {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { tenant, modules } = usePlatform();
  const { session } = useAuth();

  const [pageData, setPageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch Page Config
  useEffect(() => {
    const getPageConfig = async () => {
      if (!tenant?.id || !pageId) return;
      setLoading(true);
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        
        // Resolve slugified pageName to actual page ID
        let targetId = pageId;
        const matchedPage = modules.find(
          (m: any) => m.type === 'PAGE' && (slugify(m.name) === pageId || m.name.toLowerCase() === pageId.toLowerCase())
        );
        if (matchedPage) {
          targetId = matchedPage.id;
        }

        const pageMod = await fetchModule(targetId, tenant.id, token, modules);
        setPageData(pageMod);
      } catch (err) {
        console.error('Failed to load page config', err);
        toast.error('Failed to load page configuration');
      } finally {
        setLoading(false);
      }
    };
    getPageConfig();
  }, [pageId, tenant?.id, session?.access_token, modules]);

  const widgets = useMemo(() => {
    return (pageData?.config?.widgets || pageData?.widgets || []).map((w: any, index: number) => {
      const dims = getWidgetDefaultDimensions(w.type);
      return {
        ...w,
        x: (w.x !== undefined && w.x !== null) ? w.x : (index % 2 === 0 ? 0 : 6),
        y: (w.y !== undefined && w.y !== null) ? w.y : Math.floor(index / 2) * dims.h,
        w: (w.w !== undefined && w.w !== null) ? w.w : dims.w,
        h: (w.h !== undefined && w.h !== null) ? w.h : dims.h
      };
    });
  }, [pageData?.config?.widgets, pageData?.widgets]);

  const { width, containerRef, mounted } = useMyContainerWidth(loading);

  const layout = useMemo(() => {
    return widgets.map((w: any) => ({
      i: w.id,
      x: w.x,
      y: w.y,
      w: w.w,
      h: w.h
    }));
  }, [widgets]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-zinc-500 text-sm">Loading workspace page layout...</p>
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 text-center">
        <Layout size={48} className="text-zinc-300 dark:text-zinc-700" />
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Page Not Found</h2>
          <p className="text-zinc-500 max-w-sm mt-1">The page you are looking for does not exist or has been deleted.</p>
        </div>
        <Button onClick={() => navigate('/workspace')} variant="secondary">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  const PageIcon = (Icons as any)[pageData.iconName] || (Icons as any)[pageData.icon] || Layout;

  return (
    <PageWrapper className="flex flex-col w-full h-[calc(100vh-4rem)] bg-transparent overflow-hidden relative">
      {/* Dynamic backgrounds */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] -ml-48 -mb-48 pointer-events-none" />

      {/* Page Header */}
      <div className="px-6 lg:px-12 py-6 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-900/10 backdrop-blur-md shrink-0 flex items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
            <PageIcon size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-950 dark:text-white">{pageData.name}</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-450 mt-0.5">Workspace Page</p>
          </div>
        </div>
      </div>

      {/* Widgets Grid */}
      <div className="flex-1 p-6 lg:p-8 overflow-y-auto min-h-0 flex flex-col custom-scrollbar relative z-10">
        <div ref={containerRef} className="w-full relative">
        {widgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white/40 dark:bg-white/[0.03] border border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl text-center space-y-3">
            <Layout size={32} className="text-zinc-400" />
            <div>
              <p className="text-sm font-bold text-zinc-650 dark:text-zinc-300">This page has no widgets</p>
              <p className="text-xs text-zinc-400">Click &quot;Edit Page Layout&quot; on the top right to start adding components.</p>
            </div>
          </div>
        ) : (
          mounted && (
            <ReactGridLayout
              className="layout read-only-layout"
              layout={layout}
              width={width}
              gridConfig={{
                cols: 12,
                rowHeight: 50,
                margin: [24, 24]
              }}
              dragConfig={{
                enabled: false
              }}
              resizeConfig={{
                enabled: false
              }}
            >
              {widgets.map((widget: any) => (
                <div 
                  key={widget.id} 
                  className="w-full h-full [&>div]:h-full"
                >
                  <WidgetRenderer widget={widget} tenant={tenant} session={session} />
                </div>
              ))}
            </ReactGridLayout>
          )
        )}
      </div>
      </div>
    </PageWrapper>
  );

};

// --- WIDGET RENDERER CONTROLLER ---
const WidgetRenderer = ({ widget, tenant, session }: { widget: any, tenant: any, session: any }) => {
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Stats Grid Widget Fetcher
  useEffect(() => {
    if (widget.type !== 'stats-grid' || !tenant?.id) return;
    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const res = await fetch(`${API_BASE_URL}/api/data/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant.id
          }
        });
        if (res.ok) {
          const json = await res.json();
          setStats(json);
        }
      } catch (err) {
        console.error('Failed to fetch widget stats', err);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, [widget.type, tenant?.id, session?.access_token]);

  switch (widget.type) {
    case 'stats-grid':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsLoading || !stats ? (
            [1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height={110} variant="rounded" className="rounded-3xl" />
            ))
          ) : (
            [
              { label: 'Active Cases', value: stats.activeRecords?.toString() || '0', icon: <Database size={20} />, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
              { label: 'Portal Submissions', value: stats.totalRecords?.toString() || '0', icon: <Globe size={20} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'AI Automations', value: stats.aiAutomations?.toString() || '0', icon: <Cpu size={20} />, color: 'text-purple-400', bg: 'bg-purple-500/10' },
              { label: 'System Health', value: stats.health || '99.9%', icon: <ShieldCheck size={20} />, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            ].map((stat, i) => (
              <div 
                key={i}
                className="p-5 bg-white/50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-3xl group shadow-sm flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{stat.label}</span>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.bg} ${stat.color}`}>
                    {stat.icon}
                  </div>
                </div>
                <p className="text-2xl font-black text-zinc-950 dark:text-white">{stat.value}</p>
              </div>
            ))
          )}
        </div>
      );

    case 'active-workflows':
      return (
        <div className="p-6 bg-white/50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-150 dark:border-zinc-800 pb-3">
            <Workflow size={18} className="text-indigo-500" />
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">{widget.title || 'Active Workflows'}</h3>
          </div>
          <div className="space-y-3">
            {[
              { name: 'Customer Onboarding', status: 'Running', health: 'Healthy', items: 42 },
              { name: 'Invoice Approval', status: 'Running', health: 'Healthy', items: 128 },
              { name: 'Support Triage', status: 'Paused', health: 'Warning', items: 15 },
            ].map((wf, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                    <Workflow size={16} className="text-zinc-400 dark:text-zinc-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">{wf.name}</p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{wf.items} items in queue</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Status</p>
                    <p className={cn("text-[10px] font-medium", wf.status === 'Running' ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>{wf.status}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Health</p>
                    <p className={cn("text-[10px] font-medium", wf.health === 'Healthy' ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-400")}>{wf.health}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case 'work-queue':
      return (
        <div className="bg-white/50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-3xl shadow-sm p-4 overflow-hidden">
          <WorkQueue />
        </div>
      );

    case 'module-table':
      return <ModuleTableWidget widget={widget} tenant={tenant} session={session} />;

    case 'module-creator':
      return <ModuleCreatorWidget widget={widget} tenant={tenant} session={session} />;

    case 'rich-text':
      return (
        <div className="p-6 bg-white/50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-3xl shadow-sm">
          {widget.title && (
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider mb-3 border-b border-zinc-150 dark:border-zinc-800 pb-2">
              {widget.title}
            </h3>
          )}
          <div 
            className="prose dark:prose-invert max-w-none text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: widget.properties?.content || '<p className="italic text-zinc-400">No content configured.</p>' }}
          />
        </div>
      );

    case 'chart':
      return <ChartWidget widget={widget} tenant={tenant} session={session} />;

    case 'report':
      return <ReportWidgetEmbed widget={widget} tenant={tenant} session={session} />;


    default:
      return (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-3xl text-xs font-bold">
          Unknown Widget Type: {widget.type}
        </div>
      );
  }
};

// --- WIDGET: MODULE TABLE ---
const ModuleTableWidget: React.FC<{ widget: any, tenant: any, session: any }> = ({ widget, tenant, session }) => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const moduleId = widget.properties?.moduleId;

  useEffect(() => {
    const loadRecords = async () => {
      if (!tenant?.id || !moduleId) return;
      setLoading(true);
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const res = await fetchRecords(moduleId, tenant.id, token, 1, 10);
        setRecords(res.records || []);
      } catch (err) {
        console.error('Failed to fetch widget records', err);
      } finally {
        setLoading(false);
      }
    };
    loadRecords();
  }, [moduleId, tenant?.id, session?.access_token]);

  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const s = search.toLowerCase();
    return records.filter((r: any) => {
      return Object.values(r.data || {}).some(val => 
        val && val.toString().toLowerCase().includes(s)
      );
    });
  }, [records, search]);

  return (
    <div className="p-6 bg-white/50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-3xl shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-800 pb-3">
        <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">{widget.title || 'Record List'}</h3>
        {moduleId && (
          <input
            type="text"
            placeholder="Search records..."
            className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-indigo-500/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
      </div>

      {!moduleId ? (
        <p className="text-xs text-zinc-400 italic">No module selected. Please configure in settings.</p>
      ) : loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} height={40} className="rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-zinc-400 italic py-4 text-center">No records found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider">
                <th className="py-2 pl-2">Record ID</th>
                <th className="py-2">Summary</th>
                <th className="py-2">Created At</th>
                <th className="py-2 pr-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => {
                const keys = Object.keys(record.data || {});
                const summary = keys.length > 0 
                  ? `${record.data[keys[0]]} ${keys[1] ? `(${record.data[keys[1]]})` : ''}`
                  : 'Empty Record';

                return (
                  <tr key={record.id} className="border-b border-zinc-100/50 dark:border-zinc-800/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 text-zinc-700 dark:text-zinc-300 transition-colors">
                    <td className="py-2.5 pl-2 font-mono text-[10px] text-zinc-400">#{record.id.substring(0, 8)}</td>
                    <td className="py-2.5 font-bold truncate max-w-xs">{summary}</td>
                    <td className="py-2.5 text-zinc-500">{new Date(record.createdAt).toLocaleDateString()}</td>
                    <td className="py-2.5 pr-2 text-right">
                      <Link 
                        to={`/workspace/modules/${moduleId}/records/${record.id}`}
                        className="text-indigo-500 hover:text-indigo-600 font-bold flex items-center gap-0.5 justify-end"
                      >
                        Details <ChevronRight size={12} />
                      </Link>
                    </td>
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

// --- WIDGET: MODULE RECORD CREATOR ---
const ModuleCreatorWidget: React.FC<{ widget: any, tenant: any, session: any }> = ({ widget, tenant, session }) => {
  const { modules } = usePlatform();
  const [fields, setFields] = useState<any[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const moduleId = widget.properties?.moduleId;

  useEffect(() => {
    const loadModule = async () => {
      if (!tenant?.id || !moduleId) return;
      setLoading(true);
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const mod = await fetchModule(moduleId, tenant.id, token, modules);
        const layout = mod?.config?.layout || [];
        // Flatten layout to find actual inputs
        const inputs = layout.filter((item: any) => item && item.id && !['heading', 'divider', 'spacer'].includes(item.type));
        setFields(inputs);
        // Pre-fill initial defaults
        const defaults: Record<string, any> = {};
        inputs.forEach((f: any) => {
          if (f.type === 'checkbox') defaults[f.name] = false;
        });
        setFormData(defaults);
      } catch (err) {
        console.error('Failed to fetch creator widget module config', err);
      } finally {
        setLoading(false);
      }
    };
    loadModule();
  }, [moduleId, tenant?.id, session?.access_token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !moduleId) return;

    setSubmitting(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      
      const res = await fetch(`${DATA_API_URL}/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({
          moduleId,
          ...formData
        })
      });

      if (!res.ok) {
        throw new Error('Failed to submit record');
      }

      toast.success('Record submitted successfully!');
      
      // Reset form
      const reset: Record<string, any> = {};
      fields.forEach((f: any) => {
        reset[f.name] = f.type === 'checkbox' ? false : '';
      });
      setFormData(reset);
    } catch (err: any) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFieldChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="p-6 bg-white/50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-3xl shadow-sm space-y-4">
      <div className="border-b border-zinc-150 dark:border-zinc-800 pb-3">
        <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">{widget.title || 'Submit New Item'}</h3>
      </div>

      {!moduleId ? (
        <p className="text-xs text-zinc-400 italic">No module selected. Please configure in settings.</p>
      ) : loading ? (
        <div className="space-y-3">
          <Skeleton height={35} className="rounded-xl" />
          <Skeleton height={35} className="rounded-xl" />
          <Skeleton height={45} className="rounded-xl animate-pulse" />
        </div>
      ) : fields.length === 0 ? (
        <p className="text-xs text-zinc-400 italic text-center">Module has no fields to input.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => {
              const val = formData[field.name] || '';
              return (
                <div key={field.id} className={cn("space-y-1.5", field.colSpan === 12 ? "col-span-2" : "col-span-1")}>
                  <label className="font-bold text-zinc-500 uppercase tracking-wider">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                  
                  {field.type === 'checkbox' ? (
                    <div className="flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        checked={!!val}
                        onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-200 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-zinc-500 text-xs">Yes / Enabled</span>
                    </div>
                  ) : field.type === 'select' ? (
                    <select
                      required={field.required}
                      value={val}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 focus:border-indigo-500/50 outline-none"
                    >
                      <option value="">Select option...</option>
                      {(field.options || []).map((o: string) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : field.type === 'longText' ? (
                    <textarea
                      required={field.required}
                      placeholder={field.placeholder || `Enter ${field.label}...`}
                      value={val}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 focus:border-indigo-500/50 outline-none resize-none h-20"
                    />
                  ) : field.type === 'date' ? (
                    <input
                      type="date"
                      required={field.required}
                      value={val}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 focus:border-indigo-500/50 outline-none"
                    />
                  ) : (
                    <input
                      type={field.type === 'number' || field.type === 'currency' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                      required={field.required}
                      placeholder={field.placeholder || `Enter ${field.label}...`}
                      value={val}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 focus:border-indigo-500/50 outline-none"
                    />
                  )}

                  {field.helperText && <p className="text-[10px] text-zinc-400 leading-normal">{field.helperText}</p>}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end border-t border-zinc-100 dark:border-zinc-800 pt-3">
            <Button type="submit" loading={submitting} size="sm" className="w-full md:w-auto">
              Submit Form
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

// --- WIDGET: CHART ---
const ChartWidget: React.FC<{ widget: any, tenant: any, session: any }> = ({ widget, tenant, session }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const moduleId = widget.properties?.moduleId;
  const chartType = widget.properties?.chartType || 'bar';

  useEffect(() => {
    const loadChartData = async () => {
      if (!tenant?.id || !moduleId) return;
      setLoading(true);
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const res = await fetchRecords(moduleId, tenant.id, token, 1, 100);
        const recs = res.records || [];
        
        // Group by creation date
        const grouped: Record<string, number> = {};
        recs.forEach((r: any) => {
          const dateStr = new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          grouped[dateStr] = (grouped[dateStr] || 0) + 1;
        });

        const formatted = Object.entries(grouped).map(([date, count]) => ({
          date,
          volume: count
        })).reverse(); // Oldest first

        setChartData(formatted);
      } catch (err) {
        console.error('Failed to load chart records', err);
      } finally {
        setLoading(false);
      }
    };
    loadChartData();
  }, [moduleId, tenant?.id, session?.access_token]);

  return (
    <div className="p-6 bg-white/50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-3xl shadow-sm space-y-4">
      <div className="border-b border-zinc-150 dark:border-zinc-800 pb-3">
        <h3 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">{widget.title || 'Volume Chart'}</h3>
      </div>

      {!moduleId ? (
        <p className="text-xs text-zinc-400 italic">No module selected for chart. Please configure in settings.</p>
      ) : loading ? (
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
        </div>
      ) : chartData.length === 0 ? (
        <p className="text-xs text-zinc-400 italic py-10 text-center">No record data found to display.</p>
      ) : (
        <div className="h-48 w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#88888820" />
                <XAxis dataKey="date" stroke="#888888" tickLine={false} />
                <YAxis stroke="#888888" tickLine={false} />
                <Tooltip contentStyle={{ background: '#1c1917', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Line type="monotone" dataKey="volume" stroke="#6366f1" strokeWidth={2.5} activeDot={{ r: 6 }} animationDuration={300} />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#88888820" />
                <XAxis dataKey="date" stroke="#888888" tickLine={false} />
                <YAxis stroke="#888888" tickLine={false} />
                <Tooltip contentStyle={{ background: '#1c1917', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="volume" fill="#6366f1" radius={[4, 4, 0, 0]} animationDuration={300} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

const COLORS_PALETTE = ['#6366f1', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

export interface ReportEmbedWidget {
  id: string;
  type: 'bar' | 'line' | 'area' | 'pie' | 'kpi' | 'table';
  title: string;
  w: number;
  properties: {
    xAxisKey: string;
    yAxisKey: string;
    aggregate: 'count' | 'sum' | 'avg' | 'min' | 'max';
    color?: string;
  };
}

export const ReportWidgetEmbed: React.FC<{ widget: any, tenant: any, session: any }> = ({ widget, tenant, session }) => {
  const { modules } = usePlatform();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  
  // Database datasets cache
  const [records, setRecords] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [automations, setAutomations] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);

  // Filtering states
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});

  const reportId = widget.properties?.reportId;

  // 1. Fetch report configuration
  useEffect(() => {
    const fetchReportConfig = async () => {
      if (!tenant?.id || !reportId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const res = await fetch(`http://localhost:3001/api/reports/${reportId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant.id
          }
        });
        if (res.ok) {
          const data = await res.json();
          setReport(data);
        }
      } catch (err) {
        console.error('Failed to load report embed configuration', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReportConfig();
  }, [reportId, tenant?.id, session?.access_token]);

  // 2. Fetch cache database source datasets
  useEffect(() => {
    if (!tenant?.id || !report) return;
    const fetchSources = async () => {
      setSourcesLoading(true);
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const headers = { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenant.id };

        const [recsRes, memsRes, teamsRes, autosRes, catalogRes] = await Promise.all([
          fetch(`http://localhost:3001/api/data/records`, { headers }).then(res => res.json()).catch(() => ({ records: [] as any[] })),
          fetch(`http://localhost:3001/api/members`, { headers }).then(res => res.json()).catch(() => [] as any[]),
          fetch(`http://localhost:3001/api/teams`, { headers }).then(res => res.json()).catch(() => [] as any[]),
          fetch(`http://localhost:3001/api/automations`, { headers }).then(res => res.json()).catch(() => [] as any[]),
          fetch(`http://localhost:3001/api/pricing-catalog`, { headers }).then(res => res.json()).catch(() => [] as any[])
        ]);

        setRecords(recsRes.records || []);
        setMembers(memsRes || []);
        setTeams(teamsRes || []);
        setAutomations(autosRes || []);
        setCatalogItems(catalogRes || []);
      } catch (err) {
        console.error("Failed to load source datasets for report embed", err);
      } finally {
        setSourcesLoading(false);
      }
    };
    fetchSources();
  }, [report, tenant?.id, session?.access_token]);

  // Formula evaluation engine
  const evaluateFormulaOnRow = (formula: string, row: any): any => {
    try {
      const expression = formula.replace(/\{([\w\.\:-]+)\}/g, (_, fieldId) => {
        const val = row[fieldId];
        if (val === undefined || val === null) return '""';
        if (typeof val === 'number' || typeof val === 'boolean') return String(val);
        return `"${String(val).replace(/"/g, '\\"')}"`;
      });

      const formulaContext = createFormulaContext();
      const func = new Function(...Object.keys(formulaContext), `return ${expression}`);
      const result = func(...Object.values(formulaContext));
      
      if (typeof result === 'number') {
        return Number.isInteger(result) ? result : Number(result.toFixed(2));
      }
      return result ?? '';
    } catch (err) {
      return '#ERROR!';
    }
  };

  // 3. Compile full relational dataset
  const getRawDataset = (tables: string[]): any[] => {
    if (!tables || tables.length === 0) return [];
    const t = tables[0];
    
    const rawData = (() => {
      if (t === 'records') return records;
      if (t.startsWith('module:')) {
        const moduleId = t.split(':')[1];
        return records.filter(r => r.moduleId === moduleId).map(r => {
          return {
            id: r.id,
            status: r.status,
            created_at: r.createdAt || r.created_at,
            ...(r.data || {})
          };
        });
      }
      if (t === 'tenant_members') return members;
      if (t === 'teams') return teams;
      if (t === 'automations') return automations;
      if (t === 'catalog_items') return catalogItems;
      
      if (report?.config?.dataSource?.type === 'external') {
        return [
          { id: '1', status: 'Prospecting', source: 'Webinar', value: 12000, date: 'Jul 1' },
          { id: '2', status: 'Qualification', source: 'Cold Outbound', value: 18000, date: 'Jul 3' },
          { id: '3', status: 'Closed Won', source: 'Webinar', value: 45000, date: 'Jul 5' },
          { id: '4', status: 'Negotiation', source: 'Partner Referral', value: 25000, date: 'Jul 8' },
          { id: '5', status: 'Closed Won', source: 'Google Ads', value: 30000, date: 'Jul 10' }
        ];
      }
      return [];
    })();

    const relationships = report?.config?.dataSource?.relationships || [];
    if (relationships.length === 0 || rawData.length === 0) {
      return rawData;
    }

    const getJoinDataset = (joinTable: string): any[] => {
      if (joinTable === 'records') return records;
      if (joinTable.startsWith('module:')) {
        const moduleId = joinTable.split(':')[1];
        return records.filter(r => r.moduleId === moduleId).map(r => {
          return {
            id: r.id,
            status: r.status,
            created_at: r.createdAt || r.created_at,
            ...(r.data || {})
          };
        });
      }
      if (joinTable === 'tenant_members') return members;
      if (joinTable === 'teams') return teams;
      if (joinTable === 'automations') return automations;
      if (joinTable === 'catalog_items') return catalogItems;
      return [];
    };

    let joinedData = [...rawData];

    relationships.forEach((rel: any) => {
      const joinDataset = getJoinDataset(rel.joinTable);
      let tableKey = rel.joinTable;
      if (tableKey.startsWith('module:')) {
        const moduleId = tableKey.split(':')[1];
        const m = modules.find((mod: any) => mod.id === moduleId);
        tableKey = m ? m.name.toLowerCase().replace(/\s+/g, '_') : moduleId;
      }

      joinedData = joinedData.map(primaryRow => {
        const primaryVal = primaryRow[rel.primaryKey];
        const matchingRecord = joinDataset.find(joinRow => {
          const joinVal = joinRow[rel.foreignKey];
          if (primaryVal === undefined || primaryVal === null || joinVal === undefined || joinVal === null) return false;
          return String(primaryVal).trim() === String(joinVal).trim();
        });

        const mergedFields: Record<string, any> = {};
        if (matchingRecord) {
          Object.entries(matchingRecord).forEach(([k, v]) => {
            mergedFields[`${tableKey}.${k}`] = v;
          });
        }
        return {
          ...primaryRow,
          ...mergedFields,
          __hadMatch: !!matchingRecord
        };
      });

      if (rel.type === 'inner') {
        joinedData = joinedData.filter(row => (row as any).__hadMatch);
      }
    });

    // Evaluate calculated fields
    const calculatedFields = report?.config?.calculatedFields || [];
    if (calculatedFields.length > 0) {
      joinedData = joinedData.map(row => {
        const evaluatedRow = { ...row };
        calculatedFields.forEach((cf: any) => {
          evaluatedRow[cf.name] = evaluateFormulaOnRow(cf.formula, row);
        });
        return evaluatedRow;
      });
    }

    return joinedData;
  };

  const getUniqueValuesForField = (field: string): any[] => {
    if (!report) return [];
    const rawData = getRawDataset(report.config.dataSource.tables);
    const values = rawData.map(row => row[field]).filter(val => val !== undefined && val !== null && val !== '');
    return Array.from(new Set(values));
  };

  // Compile visual metric aggregates (including filters)
  const getAggregatedData = (widget: any): any[] => {
    const rawData = getRawDataset(report?.config?.dataSource?.tables || []);
    if (!rawData || rawData.length === 0) return [];

    // Apply active global filters
    const filteredData = rawData.filter(row => {
      return Object.entries(activeFilters).every(([field, selectedValue]) => {
        if (selectedValue === undefined || selectedValue === null || selectedValue === '') return true;
        return String(row[field]) === String(selectedValue);
      });
    });

    const xAxisKey = widget.properties.xAxisKey || 'id';
    const { yAxisKey, aggregate } = widget.properties;

    const groupMap: Record<string, any[]> = {};
    filteredData.forEach(item => {
      let keyVal = item[xAxisKey];
      if (keyVal === undefined || keyVal === null) keyVal = 'Unspecified';
      if (typeof keyVal === 'boolean') keyVal = keyVal ? 'True' : 'False';
      
      if (!groupMap[keyVal]) groupMap[keyVal] = [];
      groupMap[keyVal].push(item);
    });

    return Object.entries(groupMap).map(([key, items]) => {
      let metricValue = 0;
      if (aggregate === 'count') {
        metricValue = items.length;
      } else {
        const numericValues = items
          .map(item => {
            const val = parseFloat(item[yAxisKey]);
            return isNaN(val) ? 0 : val;
          });

        if (aggregate === 'sum') {
          metricValue = numericValues.reduce((acc, v) => acc + v, 0);
        } else if (aggregate === 'avg') {
          metricValue = numericValues.length > 0 
            ? numericValues.reduce((acc, v) => acc + v, 0) / numericValues.length 
            : 0;
        } else if (aggregate === 'min') {
          metricValue = numericValues.length > 0 ? Math.min(...numericValues) : 0;
        } else if (aggregate === 'max') {
          metricValue = numericValues.length > 0 ? Math.max(...numericValues) : 0;
        }
      }

      return { name: key, value: metricValue };
    });
  };

  const handleChartElementClick = (field: string, value: any) => {
    setActiveFilters(prev => {
      if (prev[field] === value) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return { ...prev, [field]: value };
    });
  };

  if (loading) {
    return (
      <div className="p-12 border border-zinc-200 dark:border-white/5 bg-white/50 dark:bg-white/[0.02] rounded-3xl flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
        <span className="text-zinc-500 text-[10px] uppercase font-black tracking-wider">Syncing BI Visuals...</span>
      </div>
    );
  }

  if (!reportId || !report) {
    return (
      <div className="p-8 border border-dashed border-zinc-250 dark:border-zinc-800 rounded-3xl text-center space-y-2 bg-white/20 dark:bg-white/[0.005]">
        <Icons.TrendingUp size={24} className="text-zinc-400 mx-auto" />
        <p className="text-xs font-bold text-zinc-650 dark:text-zinc-300">BI Report Widget</p>
        <p className="text-[10px] text-zinc-550">No report configured or target report was deleted.</p>
      </div>
    );
  }

  const widgetsList = report.config?.widgets || [];
  const activeSlicers = report.config?.slicers || [];

  return (
    <div className="col-span-12 space-y-6">
      <div className="border-b border-zinc-200/50 dark:border-zinc-800/50 pb-2">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">{report.name}</h2>
        {report.description && <p className="text-[10px] text-zinc-550 dark:text-zinc-500 mt-0.5">{report.description}</p>}
      </div>

      {/* Global Slicers Toolbar inside Embed */}
      {activeSlicers.length > 0 && (
        <div className="p-4 bg-white/50 dark:bg-zinc-955/20 border border-zinc-200/30 dark:border-white/5 rounded-3xl flex flex-wrap gap-4 items-center justify-between shadow-sm">
          <div className="flex flex-wrap gap-4 items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Filters:</span>
            {activeSlicers.map((field: string) => {
              const uniqueValues = getUniqueValuesForField(field);
              const activeVal = activeFilters[field];

              return (
                <div key={field} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-550 dark:text-zinc-450 capitalize">
                    {field.split('.').pop()?.replace('_', ' ')}:
                  </span>
                  <select
                    value={activeVal || ''}
                    onChange={(e) => setActiveFilters(prev => {
                      const next = { ...prev };
                      if (!e.target.value) {
                        delete next[field];
                      } else {
                        next[field] = e.target.value;
                      }
                      return next;
                    })}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1 text-xs text-zinc-700 dark:text-zinc-300 outline-none focus:ring-1 focus:ring-indigo-500/30"
                  >
                    <option value="">All</option>
                    {uniqueValues.map(val => (
                      <option key={val} value={val}>{String(val)}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
          {Object.keys(activeFilters).length > 0 && (
            <button
              onClick={() => setActiveFilters({})}
              className="text-[10px] text-red-550 hover:text-red-450 dark:text-red-400 dark:hover:text-red-300 font-bold px-3 py-1 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-xl cursor-pointer transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {widgetsList.length === 0 ? (
        <p className="text-xs text-zinc-500 italic py-6 text-center">This published report has no configured visuals.</p>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {widgetsList.map((w: any) => {
            const widthClass = w.w === 4 ? 'col-span-12 md:col-span-4' :
                               w.w === 6 ? 'col-span-12 md:col-span-6' :
                               w.w === 8 ? 'col-span-12 md:col-span-8' :
                               'col-span-12';
            const aggData = getAggregatedData(w);

            return (
              <div 
                key={w.id} 
                className={cn(
                  "p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 h-80 flex flex-col justify-between bg-white/50 dark:bg-white/[0.02]", 
                  widthClass
                )}
              >
                <div className="border-b border-zinc-100 dark:border-zinc-800 pb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{w.title}</span>
                </div>

                <div className="flex-1 w-full flex items-center justify-center min-h-0 pt-4 text-xs">
                  {sourcesLoading ? (
                    <VisualSkeleton type={w.type} />
                  ) : aggData.length === 0 ? (
                    <span className="text-[10px] text-zinc-400 italic">No dataset rows found.</span>
                  ) : w.type === 'kpi' ? (
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Count</p>
                      <p className="text-4xl font-black text-zinc-950 dark:text-white mt-1">
                        {aggData.reduce((acc, d) => acc + d.value, 0).toLocaleString()}
                      </p>
                    </div>
                  ) : w.type === 'table' ? (
                    <div className="w-full h-full overflow-y-auto text-[10px]">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-450 uppercase font-black">
                            <th className="py-1 pl-1">Dimension</th>
                            <th className="py-1 text-right pr-1">Aggregated Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aggData.map(d => (
                            <tr key={d.name} className="border-b border-zinc-100/50 dark:border-zinc-800/50 text-zinc-700 dark:text-zinc-300">
                              <td className="py-2 pl-1 font-bold">{d.name}</td>
                              <td className="py-2 text-right pr-1 font-mono">{d.value.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="w-full h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        {w.type === 'bar' ? (
                          <BarChart 
                            data={aggData}
                            className="cursor-pointer"
                            onClick={(state) => {
                              if (state && state.activeLabel) {
                                handleChartElementClick(w.properties.xAxisKey, state.activeLabel);
                              }
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#88888820" />
                            <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} />
                            <YAxis stroke="#888888" fontSize={9} tickLine={false} />
                            <Tooltip contentStyle={{ background: '#18181b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }} />
                            {(w.properties?.showLegend ?? false) && <Legend wrapperStyle={{ fontSize: '9px' }} />}
                            <Bar dataKey="value" fill={w.properties.color || '#6366f1'} radius={[4, 4, 0, 0]} animationDuration={300} />
                          </BarChart>
                        ) : w.type === 'line' ? (
                          <LineChart 
                            data={aggData}
                            className="cursor-pointer"
                            onClick={(state) => {
                              if (state && state.activeLabel) {
                                handleChartElementClick(w.properties.xAxisKey, state.activeLabel);
                              }
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#88888820" />
                            <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} />
                            <YAxis stroke="#888888" fontSize={9} tickLine={false} />
                            <Tooltip contentStyle={{ background: '#18181b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }} />
                            {(w.properties?.showLegend ?? false) && <Legend wrapperStyle={{ fontSize: '9px' }} />}
                            <Line type="monotone" dataKey="value" stroke={w.properties.color || '#6366f1'} strokeWidth={2} animationDuration={300} />
                          </LineChart>
                        ) : w.type === 'area' ? (
                          <AreaChart 
                            data={aggData}
                            className="cursor-pointer"
                            onClick={(state) => {
                              if (state && state.activeLabel) {
                                handleChartElementClick(w.properties.xAxisKey, state.activeLabel);
                              }
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#88888820" />
                            <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} />
                            <YAxis stroke="#888888" fontSize={9} tickLine={false} />
                            <Tooltip contentStyle={{ background: '#18181b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }} />
                            {(w.properties?.showLegend ?? false) && <Legend wrapperStyle={{ fontSize: '9px' }} />}
                            <Area type="monotone" dataKey="value" fill={w.properties.color || '#6366f1'} stroke={w.properties.color || '#6366f1'} fillOpacity={0.15} animationDuration={300} />
                          </AreaChart>
                        ) : (
                          <PieChart>
                            <Pie
                              data={aggData}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={65}
                              paddingAngle={3}
                              dataKey="value"
                              className="cursor-pointer"
                              onClick={(data) => {
                                if (data && data.name) {
                                  handleChartElementClick(w.properties.xAxisKey, data.name);
                                }
                              }}
                              animationDuration={300}
                            >
                              {aggData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS_PALETTE[index % COLORS_PALETTE.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#18181b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }} />
                            {(w.properties?.showLegend ?? false) && <Legend wrapperStyle={{ fontSize: '9px' }} />}
                          </PieChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

