import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart2, Plus, ArrowLeft, Trash2, Edit2, Eye, Share2, 
  Sparkles, Save, Check, RefreshCw, FileText, BarChart, LineChart, 
  PieChart, Layers, Table, Activity, TrendingUp, Info, User, AlertTriangle, Printer,
  GripVertical
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart as ReBarChart, Bar, 
  LineChart as ReLineChart, Line, AreaChart as ReAreaChart, Area,
  PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import ReactGridLayout, { useContainerWidth } from 'react-grid-layout';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { Button } from '../../../components/UI/Primitives';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn, flattenFields } from '../../../lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';
import { createFormulaContext } from '../../../lib/formulaEngine';
import { VisualSkeleton } from '../../WorkspacePage/WorkspacePageView';

// Types
export interface ReportWidget {
  id: string;
  type: 'bar' | 'line' | 'area' | 'pie' | 'kpi' | 'table';
  title: string;
  w: number; // 4 (1/3), 6 (1/2), 8 (2/3), 12 (full)
  h?: number;
  x?: number;
  y?: number;
  properties: {
    xAxisKey: string;
    yAxisKey: string;
    aggregate: 'count' | 'sum' | 'avg' | 'min' | 'max';
    color?: string;
    showGridlines?: boolean;
    showLegend?: boolean;
    showTooltip?: boolean;
  };
}

export interface TableRelationship {
  id: string;
  joinTable: string; // e.g. "tenant_members"
  primaryKey: string; // e.g. "member_id" or "id"
  foreignKey: string; // e.g. "id" or "role_id"
  type: 'left' | 'inner';
}

export interface CalculatedField {
  id: string;
  name: string; // e.g. "age_days"
  formula: string; // e.g. "TIMESPAN(\"days\", {created_at}, TODAY())"
}

export interface ReportConfig {
  dataSource: {
    type: 'local' | 'external';
    connectorId?: string;
    tables: string[];
    relationships?: TableRelationship[];
  };
  widgets: ReportWidget[];
  slicers?: string[];
  calculatedFields?: CalculatedField[];
}

export interface Report {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  config: ReportConfig;
  status: 'Draft' | 'Published';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// Templates Definitions
const REPORT_TEMPLATES = [
  {
    id: 'case_backlog',
    name: 'Case Backlog & SLA Performance',
    description: 'Visualise active case distributions, resolution times, and current backlog status.',
    config: {
      dataSource: { type: 'local', tables: ['records'] },
      widgets: [
        {
          id: 'widget-1',
          type: 'kpi',
          title: 'Total Active Cases',
          w: 4,
          properties: { xAxisKey: 'status', yAxisKey: 'id', aggregate: 'count', color: '#6366f1' }
        },
        {
          id: 'widget-2',
          type: 'bar',
          title: 'Cases by Status',
          w: 8,
          properties: { xAxisKey: 'status', yAxisKey: 'id', aggregate: 'count', color: '#6366f1' }
        },
        {
          id: 'widget-3',
          type: 'table',
          title: 'Recent Cases Log',
          w: 12,
          properties: { xAxisKey: 'module_id', yAxisKey: 'status', aggregate: 'count', color: '#8b5cf6' }
        }
      ]
    }
  },
  {
    id: 'workforce_allocation',
    name: 'Workforce Allocation & Teams',
    description: 'Overview of team sizes, role distributions, and staff license status.',
    config: {
      dataSource: { type: 'local', tables: ['tenant_members'] },
      widgets: [
        {
          id: 'widget-wf-1',
          type: 'kpi',
          title: 'Total Active Staff',
          w: 4,
          properties: { xAxisKey: 'status', yAxisKey: 'id', aggregate: 'count', color: '#10b981' }
        },
        {
          id: 'widget-wf-2',
          type: 'pie',
          title: 'Staff by Role ID',
          w: 8,
          properties: { xAxisKey: 'role_id', yAxisKey: 'id', aggregate: 'count', color: '#3b82f6' }
        }
      ]
    }
  },
  {
    id: 'automation_success',
    name: 'Workflow Automation Audit',
    description: 'Audit log summary of automated rules, triggers, and runs performance.',
    config: {
      dataSource: { type: 'local', tables: ['automations', 'automation_runs'] },
      widgets: [
        {
          id: 'widget-auto-1',
          type: 'kpi',
          title: 'Configured Automations',
          w: 4,
          properties: { xAxisKey: 'enabled', yAxisKey: 'id', aggregate: 'count', color: '#f59e0b' }
        },
        {
          id: 'widget-auto-2',
          type: 'area',
          title: 'Automation Success Rate',
          w: 8,
          properties: { xAxisKey: 'status', yAxisKey: 'id', aggregate: 'count', color: '#8b5cf6' }
        }
      ]
    }
  },
  {
    id: 'external_pipeline',
    name: 'Salesforce Connector pipeline',
    description: 'Simulated dashboard connected to Salesforce external records leads pipeline.',
    config: {
      dataSource: { type: 'external', connectorId: 'salesforce', tables: ['leads'] },
      widgets: [
        {
          id: 'widget-ext-1',
          type: 'kpi',
          title: 'Total Pipelines Deal Size',
          w: 4,
          properties: { xAxisKey: 'status', yAxisKey: 'value', aggregate: 'sum', color: '#10b981' }
        },
        {
          id: 'widget-ext-2',
          type: 'bar',
          title: 'Deals by Lead Source',
          w: 8,
          properties: { xAxisKey: 'source', yAxisKey: 'value', aggregate: 'sum', color: '#3b82f6' }
        }
      ]
    }
  }
];

const COLORS = ['#6366f1', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

interface ReportBuilderCanvasProps {
  currentReport: any;
  isPreview: boolean;
  selectedWidgetId: string | null;
  setSelectedWidgetId: (id: string | null) => void;
  layout: any[];
  handleLayoutChange: (newLayout: any[]) => void;
  getAggregatedData: (widget: any) => any[];
  handleDeleteWidget: (widgetId: string) => void;
  COLORS: string[];
  handleChartElementClick: (field: string, value: any) => void;
  activeFilters: Record<string, any>;
  handleSlicerChange: (field: string, value: any) => void;
  getUniqueValuesForField: (field: string) => any[];
  handleClearFilters: () => void;
  sourcesLoading: boolean;
}

const ReportBuilderCanvas = ({
  currentReport,
  isPreview,
  selectedWidgetId,
  setSelectedWidgetId,
  layout,
  handleLayoutChange,
  getAggregatedData,
  handleDeleteWidget,
  COLORS,
  handleChartElementClick,
  activeFilters,
  handleSlicerChange,
  getUniqueValuesForField,
  handleClearFilters,
  sourcesLoading
}: ReportBuilderCanvasProps) => {
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });
  const activeSlicers = currentReport.config.slicers || [];

  return (
    <div ref={containerRef} className="w-full space-y-6">
      {/* Global Slicers Filter Bar */}
      {activeSlicers.length > 0 && (
        <div className="p-4 bg-white/50 dark:bg-zinc-950/20 border border-zinc-200/30 dark:border-white/5 rounded-3xl flex flex-wrap gap-4 items-center justify-between shadow-sm">
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
                    onChange={(e) => handleSlicerChange(field, e.target.value)}
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
              onClick={() => handleClearFilters()}
              className="text-[10px] text-red-550 hover:text-red-450 dark:text-red-400 dark:hover:text-red-300 font-bold px-3 py-1 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-xl cursor-pointer transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {mounted && (
        <ReactGridLayout
          className="layout"
          layout={layout}
          width={width}
          onLayoutChange={handleLayoutChange}
          gridConfig={{
            cols: 12,
            rowHeight: 50,
            margin: [24, 24]
          }}
          dragConfig={{
            enabled: !isPreview,
            handle: ".drag-handle"
          }}
          resizeConfig={{
            enabled: !isPreview
          }}
        >
          {currentReport.config.widgets.map((widget: any) => {
            const isSelected = selectedWidgetId === widget.id;
            const aggData = getAggregatedData(widget);

            return (
              <div
                key={widget.id}
                onClick={() => {
                  if (!isPreview) setSelectedWidgetId(widget.id);
                }}
                className={cn(
                  "p-5 rounded-3xl border flex flex-col justify-between relative group shadow-sm bg-white/40 dark:bg-white/[0.02] overflow-hidden select-none",
                  !isPreview && isSelected ? "border-indigo-500 ring-2 ring-indigo-500/10" : "border-zinc-200/50 dark:border-white/5",
                  !isPreview && "cursor-pointer hover:border-indigo-500/40"
                )}
              >
                {/* Widget Header Controls */}
                <div className="flex justify-between items-center pb-2 border-b border-zinc-100/50 dark:border-white/5 shrink-0 select-none">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {!isPreview && (
                      <div className="drag-handle text-zinc-400 hover:text-zinc-600 dark:text-zinc-550 dark:hover:text-zinc-400 cursor-grab active:cursor-grabbing p-0.5 rounded flex items-center shrink-0">
                        <GripVertical size={11} />
                      </div>
                    )}
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{widget.title}</span>
                  </div>
                  {!isPreview && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWidget(widget.id);
                      }}
                      className="print-hide p-1 rounded bg-zinc-100 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 dark:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>

                {/* Widget Chart Content */}
                <div className="flex-1 w-full flex items-center justify-center min-h-0 pt-4">
                  {sourcesLoading ? (
                    <VisualSkeleton type={widget.type} />
                  ) : aggData.length === 0 ? (
                    <div className="text-[10px] text-zinc-400 italic flex items-center gap-1.5">
                      <Info size={12} /> Map visual properties to generate charts.
                    </div>
                  ) : widget.type === 'kpi' ? (
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        {widget.properties.aggregate === 'count' ? 'Total Count' :
                         widget.properties.aggregate === 'sum' ? `Total Sum (${widget.properties.yAxisKey})` :
                         widget.properties.aggregate === 'avg' ? `Average (${widget.properties.yAxisKey})` :
                         widget.properties.aggregate === 'min' ? `Min (${widget.properties.yAxisKey})` :
                         `Max (${widget.properties.yAxisKey})`}
                      </p>
                      <p className="text-4xl font-black text-zinc-950 dark:text-white mt-1">
                        {aggData.reduce((acc, d) => acc + d.value, 0).toLocaleString()}
                      </p>
                    </div>
                  ) : widget.type === 'table' ? (
                    <div className="w-full h-full overflow-y-auto text-[10px]">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-200/50 dark:border-white/5 text-zinc-400 uppercase font-black">
                            <th className="py-1.5 pl-1">Dimension</th>
                            <th className="py-1.5 text-right pr-1">Aggregated Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aggData.map((d: any) => (
                            <tr key={d.name} className="border-b border-zinc-200/20 dark:border-white/5 text-zinc-700 dark:text-zinc-300">
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
                        {widget.type === 'bar' ? (
                          <ReBarChart 
                            data={aggData}
                            className="cursor-pointer"
                            onClick={(state) => {
                              if (state && state.activeLabel) {
                                handleChartElementClick(widget.properties.xAxisKey, state.activeLabel);
                              }
                            }}
                          >
                            {(widget.properties.showGridlines ?? true) && <CartesianGrid strokeDasharray="3 3" stroke="#88888820" />}
                            <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} />
                            <YAxis stroke="#888888" fontSize={9} tickLine={false} />
                            {(widget.properties.showTooltip ?? true) && <Tooltip contentStyle={{ background: '#18181b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }} />}
                            {(widget.properties.showLegend ?? false) && <Legend wrapperStyle={{ fontSize: '9px' }} />}
                            <Bar dataKey="value" fill={widget.properties.color || '#6366f1'} radius={[4, 4, 0, 0]} animationDuration={300} />
                          </ReBarChart>
                        ) : widget.type === 'line' ? (
                          <ReLineChart 
                            data={aggData}
                            className="cursor-pointer"
                            onClick={(state) => {
                              if (state && state.activeLabel) {
                                handleChartElementClick(widget.properties.xAxisKey, state.activeLabel);
                              }
                            }}
                          >
                            {(widget.properties.showGridlines ?? true) && <CartesianGrid strokeDasharray="3 3" stroke="#88888820" />}
                            <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} />
                            <YAxis stroke="#888888" fontSize={9} tickLine={false} />
                            {(widget.properties.showTooltip ?? true) && <Tooltip contentStyle={{ background: '#18181b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }} />}
                            {(widget.properties.showLegend ?? false) && <Legend wrapperStyle={{ fontSize: '9px' }} />}
                            <Line type="monotone" dataKey="value" stroke={widget.properties.color || '#6366f1'} strokeWidth={2} animationDuration={300} />
                          </ReLineChart>
                        ) : widget.type === 'area' ? (
                          <ReAreaChart 
                            data={aggData}
                            className="cursor-pointer"
                            onClick={(state) => {
                              if (state && state.activeLabel) {
                                handleChartElementClick(widget.properties.xAxisKey, state.activeLabel);
                              }
                            }}
                          >
                            {(widget.properties.showGridlines ?? true) && <CartesianGrid strokeDasharray="3 3" stroke="#88888820" />}
                            <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} />
                            <YAxis stroke="#888888" fontSize={9} tickLine={false} />
                            {(widget.properties.showTooltip ?? true) && <Tooltip contentStyle={{ background: '#18181b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }} />}
                            {(widget.properties.showLegend ?? false) && <Legend wrapperStyle={{ fontSize: '9px' }} />}
                            <Area type="monotone" dataKey="value" fill={widget.properties.color || '#6366f1'} stroke={widget.properties.color || '#6366f1'} fillOpacity={0.15} animationDuration={300} />
                          </ReAreaChart>
                        ) : (
                          <RePieChart>
                            <Pie
                              data={aggData}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={65}
                              paddingAngle={3}
                              dataKey="value"
                              onClick={(data) => {
                                if (data && data.name) {
                                  handleChartElementClick(widget.properties.xAxisKey, data.name);
                                }
                              }}
                              className="cursor-pointer"
                              animationDuration={300}
                            >
                              {aggData.map((_: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            {(widget.properties.showTooltip ?? true) && <Tooltip contentStyle={{ background: '#18181b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }} />}
                            {(widget.properties.showLegend ?? false) && <Legend wrapperStyle={{ fontSize: '9px' }} />}
                          </RePieChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </ReactGridLayout>
      )}
    </div>
  );
};

export const ReportManagementSettings = () => {
  const { tenant, modules, setBreadcrumbOverride } = usePlatform();
  const { session, user } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  // Views: 'LIST' | 'BUILDER'
  const [view, setView] = useState<'LIST' | 'BUILDER'>('LIST');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('mode') === 'builder') {
      setView('BUILDER');
    } else {
      setView('LIST');
    }
  }, [location.search]);

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PUBLISHED' | 'DRAFTS'>('ALL');

  // Creator Modal State
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);

  // Builder States
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [deletingReport, setDeletingReport] = useState<Report | null>(null);

  // Update breadcrumb override when currentReport changes
  useEffect(() => {
    if (currentReport) {
      setBreadcrumbOverride('active-report', currentReport.name);
    }
  }, [currentReport, setBreadcrumbOverride]);

  // Slicers & Filtering States
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [isAddingSlicer, setIsAddingSlicer] = useState(false);
  const [newSlicerField, setNewSlicerField] = useState('');

  // Formula / Calculated Fields States
  const [isAddingFormula, setIsAddingFormula] = useState(false);
  const [newFormulaName, setNewFormulaName] = useState('');
  const [newFormulaBody, setNewFormulaBody] = useState('');

  // Relationship Creator States
  const [isAddingRel, setIsAddingRel] = useState(false);
  const [newRelJoinTable, setNewRelJoinTable] = useState('');
  const [newRelPrimaryKey, setNewRelPrimaryKey] = useState('');
  const [newRelForeignKey, setNewRelForeignKey] = useState('');
  const [newRelType, setNewRelType] = useState<'left' | 'inner'>('left');

  // Live Database Datasets (Local Cache)
  const [records, setRecords] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [automations, setAutomations] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);


  // Fetch all reports
  const fetchReports = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`http://localhost:3001/api/reports`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (!res.ok) throw new Error('Failed to load reports');
      const data = await res.json();
      setReports(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  // Fetch helper datasets for charting preview
  const fetchDataSources = async () => {
    if (!tenant?.id) return;
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
    } finally {
      setSourcesLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchDataSources();
  }, [tenant?.id]);

  const filteredReports = useMemo(() => {
    if (activeTab === 'PUBLISHED') return reports.filter(r => r.status === 'Published');
    if (activeTab === 'DRAFTS') return reports.filter(r => r.status === 'Draft');
    return reports;
  }, [reports, activeTab]);

  // Create report handlers
  const handleCreateBlank = async () => {
    if (!tenant?.id) return;
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`http://localhost:3001/api/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({
          name: 'Untitled Report',
          description: 'Custom report built from scratch.',
          status: 'Draft',
          config: {
            dataSource: { type: 'local', tables: ['records'] },
            widgets: []
          },
          createdBy: user?.email || 'Admin'
        })
      });
      if (!res.ok) throw new Error('Failed to create report');
      const newReport = await res.json();
      setReports(prev => [newReport, ...prev]);
      setCurrentReport(newReport);
      setSelectedWidgetId(null);
      setIsPreview(false);
      navigate('?mode=builder');
      setShowCreatorModal(false);
      toast.success('Blank report created!');
    } catch (err: any) {
      toast.error(err.message || 'Error creating report');
    }
  };

  const handleCreateTemplate = async (template: typeof REPORT_TEMPLATES[0]) => {
    if (!tenant?.id) return;
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`http://localhost:3001/api/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          status: 'Draft',
          config: template.config,
          createdBy: user?.email || 'Admin'
        })
      });
      if (!res.ok) throw new Error('Failed to create template report');
      const newReport = await res.json();
      setReports(prev => [newReport, ...prev]);
      setCurrentReport(newReport);
      setSelectedWidgetId(null);
      setIsPreview(false);
      navigate('?mode=builder');
      setShowCreatorModal(false);
      toast.success(`Report created from template: ${template.name}`);
    } catch (err: any) {
      toast.error(err.message || 'Error creating report from template');
    }
  };

  const handleCreateAI = async () => {
    if (!tenant?.id || !aiPrompt.trim()) return;
    setGeneratingAI(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      
      // 1. Ask server to generate using Gemini
      const aiResponse = await fetch(`http://localhost:3001/api/reports/ai-builder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      if (!aiResponse.ok) throw new Error('AI builder failed to generate report');
      
      const aiResult = await aiResponse.json();
      
      // 2. Save generated report to DB
      const res = await fetch(`http://localhost:3001/api/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({
          name: aiResult.name || 'AI Generated Report',
          description: aiResult.description || 'Report automatically drafted by AI.',
          status: 'Draft',
          config: aiResult.config,
          createdBy: 'Aurora AI Builder'
        })
      });
      if (!res.ok) throw new Error('Failed to save AI report');
      const newReport = await res.json();
      setReports(prev => [newReport, ...prev]);
      setCurrentReport(newReport);
      setSelectedWidgetId(null);
      setIsPreview(false);
      navigate('?mode=builder');
      setShowAIModal(false);
      setShowCreatorModal(false);
      setAiPrompt('');
      toast.success('AI Report built and loaded!');
    } catch (err: any) {
      toast.error(err.message || 'Error generating AI report');
    } finally {
      setGeneratingAI(false);
    }
  };

  // Delete report confirmation handler
  const confirmDeleteReport = async () => {
    if (!tenant?.id || !deletingReport) return;
    const { id } = deletingReport;
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`http://localhost:3001/api/reports/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (!res.ok) throw new Error('Failed to delete report');
      setReports(prev => prev.filter(r => r.id !== id));
      toast.success('Report deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete report');
    } finally {
      setDeletingReport(null);
    }
  };


  // Save Report changes from Builder Canvas
  const handleSaveReport = async (statusOverride?: 'Draft' | 'Published') => {
    if (!tenant?.id || !currentReport) return;
    setSavingReport(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const updatedStatus = statusOverride || currentReport.status;
      const res = await fetch(`http://localhost:3001/api/reports/${currentReport.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({
          name: currentReport.name,
          description: currentReport.description,
          config: currentReport.config,
          status: updatedStatus
        })
      });
      if (!res.ok) throw new Error('Failed to save report');
      const updatedReport = await res.json();
      setCurrentReport(updatedReport);
      // Update reports list state
      setReports(prev => prev.map(r => r.id === updatedReport.id ? updatedReport : r));
      toast.success(statusOverride ? `Report published!` : 'Report draft saved successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save report changes');
    } finally {
      setSavingReport(false);
    }
  };

  // Embed copy handler
  const handleCopyEmbed = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const embedCode = `<ReportWidget id="${id}" />`;
    navigator.clipboard.writeText(embedCode);
    toast.success('Widget embed code copied to clipboard!');
  };

  // Evaluate user formulas against active row database fields
  const evaluateFormulaOnRow = (formula: string, row: any): any => {
    try {
      // Replace {field_id} references in the formula with values from the row
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
      console.error("Formula eval error:", err);
      return '#ERROR!';
    }
  };

  // Retrieve raw data array based on active table config (including relationships)
  const getRawDataset = (tables: string[]): any[] => {
    if (!tables || tables.length === 0) return [];
    const t = tables[0];
    
    // Get primary table dataset
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
      
      // Fallback: Mock external source pipeline if external
      if (currentReport?.config.dataSource.type === 'external') {
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

    const relationships = currentReport?.config.dataSource.relationships || [];
    if (relationships.length === 0 || rawData.length === 0) {
      return rawData;
    }

    // Helper to get dataset of a joined table
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

    // Perform joins
    let joinedData = [...rawData];

    relationships.forEach(rel => {
      const joinDataset = getJoinDataset(rel.joinTable);
      
      let tableKey = rel.joinTable;
      if (tableKey.startsWith('module:')) {
        const moduleId = tableKey.split(':')[1];
        const m = modules.find((mod: any) => mod.id === moduleId);
        tableKey = m ? m.name.toLowerCase().replace(/\s+/g, '_') : moduleId;
      }

      joinedData = joinedData.map(primaryRow => {
        // Find matching record in joinDataset
        const primaryVal = primaryRow[rel.primaryKey];
        const matchingRecord = joinDataset.find(joinRow => {
          const joinVal = joinRow[rel.foreignKey];
          if (primaryVal === undefined || primaryVal === null || joinVal === undefined || joinVal === null) return false;
          return String(primaryVal).trim() === String(joinVal).trim();
        });

        // Merge fields with prefix, e.g. tenant_members.first_name
        const mergedFields: Record<string, any> = {};
        if (matchingRecord) {
          Object.entries(matchingRecord).forEach(([k, v]) => {
            mergedFields[`${tableKey}.${k}`] = v;
          });
        } else {
          // LEFT join initialization with null values
          const joinFields = getAvailableFields([rel.joinTable]);
          joinFields.forEach(f => {
            mergedFields[`${tableKey}.${f.name}`] = null;
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
    const calculatedFields = currentReport?.config.calculatedFields || [];
    if (calculatedFields.length > 0) {
      joinedData = joinedData.map(row => {
        const evaluatedRow = { ...row };
        calculatedFields.forEach(cf => {
          evaluatedRow[cf.name] = evaluateFormulaOnRow(cf.formula, row);
        });
        return evaluatedRow;
      });
    }

    return joinedData;
  };

  // Returns matching fields list for selected database tables (including relationships)
  const getAvailableFields = (tables: string[], relationships: TableRelationship[] = []): Array<{ name: string; type: string }> => {
    if (!tables || tables.length === 0) return [];
    
    const getFieldsForTable = (t: string): Array<{ name: string; type: string }> => {
      if (t.startsWith('module:')) {
        const moduleId = t.split(':')[1];
        const targetModule = modules.find((m: any) => m.id === moduleId);
        if (targetModule) {
          const flat = flattenFields(targetModule.layout || []);
          return [
            { name: 'id', type: 'text' },
            { name: 'status', type: 'text' },
            { name: 'created_at', type: 'date' },
            ...flat.map((f: any) => ({ name: f.name || f.id || '', type: f.type || 'text' }))
          ];
        }
      }
      if (t === 'records') {
        return [
          { name: 'id', type: 'text' },
          { name: 'status', type: 'text' },
          { name: 'module_id', type: 'text' },
          { name: 'created_at', type: 'date' }
        ];
      }
      if (t === 'tenant_members') {
        return [
          { name: 'id', type: 'text' },
          { name: 'first_name', type: 'text' },
          { name: 'family_name', type: 'text' },
          { name: 'role_id', type: 'text' },
          { name: 'status', type: 'text' }
        ];
      }
      if (t === 'teams') {
        return [
          { name: 'id', type: 'text' },
          { name: 'name', type: 'text' },
          { name: 'description', type: 'text' }
        ];
      }
      if (t === 'automations') {
        return [
          { name: 'id', type: 'text' },
          { name: 'name', type: 'text' },
          { name: 'trigger_type', type: 'text' },
          { name: 'enabled', type: 'boolean' }
        ];
      }
      if (t === 'catalog_items') {
        return [
          { name: 'id', type: 'text' },
          { name: 'name', type: 'text' },
          { name: 'type', type: 'text' },
          { name: 'base_price', type: 'number' }
        ];
      }
      // External source mock fields
      return [
        { name: 'id', type: 'text' },
        { name: 'status', type: 'text' },
        { name: 'source', type: 'text' },
        { name: 'value', type: 'number' },
        { name: 'date', type: 'date' }
      ];
    };

    const primaryFields = getFieldsForTable(tables[0]);
    const joinedFields: Array<{ name: string; type: string }> = [];

    relationships.forEach(rel => {
      const relFields = getFieldsForTable(rel.joinTable);
      relFields.forEach(f => {
        let tableKey = rel.joinTable;
        if (tableKey.startsWith('module:')) {
          const moduleId = tableKey.split(':')[1];
          const m = modules.find((mod: any) => mod.id === moduleId);
          tableKey = m ? m.name.toLowerCase().replace(/\s+/g, '_') : moduleId;
        }
        joinedFields.push({
          name: `${tableKey}.${f.name}`,
          type: f.type
        });
      });
    });

    const calculatedFields = currentReport?.config.calculatedFields || [];
    const calculatedSchemaFields = calculatedFields.map(cf => ({
      name: cf.name,
      type: 'number (calculated)'
    }));

    return [...primaryFields, ...joinedFields, ...calculatedSchemaFields];
  };

  // Retrieve distinct values for a database field (slicer values)
  const getUniqueValuesForField = (field: string): any[] => {
    if (!currentReport) return [];
    const rawData = getRawDataset(currentReport.config.dataSource.tables);
    const values = rawData.map(row => row[field]).filter(val => val !== undefined && val !== null && val !== '');
    return Array.from(new Set(values));
  };

  // Compute aggregation data array for Recharts
  const getAggregatedData = (widget: ReportWidget): any[] => {
    const rawData = getRawDataset(currentReport?.config.dataSource.tables || []);
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
      // Resolve value safely
      let keyVal = item[xAxisKey];
      if (keyVal === undefined || keyVal === null) keyVal = 'Unspecified';
      if (typeof keyVal === 'boolean') keyVal = keyVal ? 'True' : 'False';
      
      if (!groupMap[keyVal]) groupMap[keyVal] = [];
      groupMap[keyVal].push(item);
    });

    const aggregated = Object.entries(groupMap).map(([key, items]) => {
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

      return {
        name: key,
        value: metricValue
      };
    });

    return aggregated;
  };

  // Widget management in Builder
  const handleAddWidget = (type: ReportWidget['type']) => {
    if (!currentReport) return;
    const fields = getAvailableFields(
      currentReport.config.dataSource.tables,
      currentReport.config.dataSource.relationships || []
    );
    const defaultX = fields[0]?.name || 'id';
    const defaultY = fields[1]?.name || 'id';

    const newWidget: ReportWidget = {
      id: `widget-${Date.now()}`,
      type,
      title: `New ${type.toUpperCase()} Visual`,
      w: type === 'table' || type === 'area' ? 12 : 6,
      h: type === 'kpi' ? 3 : type === 'table' ? 6 : 5,
      x: 0,
      y: Infinity,
      properties: {
        xAxisKey: defaultX,
        yAxisKey: defaultY,
        aggregate: 'count',
        color: COLORS[currentReport.config.widgets.length % COLORS.length],
        showGridlines: true,
        showLegend: false,
        showTooltip: true
      }
    };

    setCurrentReport(prev => {
      if (!prev) return null;
      return {
        ...prev,
        config: {
          ...prev.config,
          widgets: [...prev.config.widgets, newWidget]
        }
      };
    });
    setSelectedWidgetId(newWidget.id);
    toast.success(`${type} widget added to layout.`);
  };

  const handleUpdateWidget = (widgetId: string, updatedProps: Partial<ReportWidget>) => {
    setCurrentReport(prev => {
      if (!prev) return null;
      const widgets = prev.config.widgets.map(w => {
        if (w.id === widgetId) {
          return { ...w, ...updatedProps };
        }
        return w;
      });
      return {
        ...prev,
        config: { ...prev.config, widgets }
      };
    });
  };

  const handleDeleteWidget = (widgetId: string) => {
    setCurrentReport(prev => {
      if (!prev) return null;
      return {
        ...prev,
        config: {
          ...prev.config,
          widgets: prev.config.widgets.filter(w => w.id !== widgetId)
        }
      };
    });
    if (selectedWidgetId === widgetId) {
      setSelectedWidgetId(null);
    }
    toast.success('Widget removed from layout.');
  };

  const handleAddRelationship = (joinTable: string, primaryKey: string, foreignKey: string, type: 'left' | 'inner') => {
    if (!currentReport) return;
    const newRel: TableRelationship = {
      id: `rel-${Date.now()}`,
      joinTable,
      primaryKey,
      foreignKey,
      type
    };

    setCurrentReport(prev => {
      if (!prev) return null;
      const relationships = prev.config.dataSource.relationships || [];
      return {
        ...prev,
        config: {
          ...prev.config,
          dataSource: {
            ...prev.config.dataSource,
            relationships: [...relationships, newRel]
          }
        }
      };
    });
    toast.success('Join relationship added.');
  };

  const handleDeleteRelationship = (relId: string) => {
    if (!currentReport) return;
    setCurrentReport(prev => {
      if (!prev) return null;
      const relationships = prev.config.dataSource.relationships || [];
      return {
        ...prev,
        config: {
          ...prev.config,
          dataSource: {
            ...prev.config.dataSource,
            relationships: relationships.filter(r => r.id !== relId)
          }
        }
      };
    });
    toast.success('Join relationship removed.');
  };
  const handleAddSlicer = (field: string) => {
    if (!currentReport || !field) return;
    const slicers = currentReport.config.slicers || [];
    if (slicers.includes(field)) {
      toast.error('This field is already added as a slicer.');
      return;
    }
    setCurrentReport(prev => {
      if (!prev) return null;
      return {
        ...prev,
        config: {
          ...prev.config,
          slicers: [...slicers, field]
        }
      };
    });
    setIsAddingSlicer(false);
    toast.success('Slicer added to dashboard.');
  };

  const handleDeleteSlicer = (field: string) => {
    if (!currentReport) return;
    const slicers = currentReport.config.slicers || [];
    
    // Clear its active filter if it exists
    if (activeFilters[field]) {
      setActiveFilters(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }

    setCurrentReport(prev => {
      if (!prev) return null;
      return {
        ...prev,
        config: {
          ...prev.config,
          slicers: slicers.filter(s => s !== field)
        }
      };
    });
    toast.success('Slicer removed from dashboard.');
  };

  const handleSlicerChange = (field: string, value: any) => {
    setActiveFilters(prev => {
      if (!value) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return {
        ...prev,
        [field]: value
      };
    });
  };

  const handleChartElementClick = (field: string, value: any) => {
    setActiveFilters(prev => {
      if (prev[field] === value) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return {
        ...prev,
        [field]: value
      };
    });
    toast.success(`Filtered dashboard by ${field.split('.').pop()}: ${value}`);
  };
  const handleAddCalculatedField = (name: string, formula: string) => {
    if (!currentReport || !name || !formula) return;
    const sanitizedName = name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '');
    if (!sanitizedName) {
      toast.error('Invalid calculated field name.');
      return;
    }

    const calculatedFields = currentReport.config.calculatedFields || [];
    if (calculatedFields.some(cf => cf.name === sanitizedName)) {
      toast.error('A calculated field with this name already exists.');
      return;
    }

    // Basic dry-run validation on mock row
    try {
      const formulaContext = createFormulaContext();
      // Replace {fieldId} with mock value 0/empty to verify syntax compiles
      const testExpression = formula.replace(/\{([\w\.\:-]+)\}/g, '0');
      const func = new Function(...Object.keys(formulaContext), `return ${testExpression}`);
      func(...Object.values(formulaContext));
    } catch (err: any) {
      toast.error(`Formula validation failed: ${err.message}`);
      return;
    }

    const newCF: CalculatedField = {
      id: `cf-${Date.now()}`,
      name: sanitizedName,
      formula
    };

    setCurrentReport(prev => {
      if (!prev) return null;
      return {
        ...prev,
        config: {
          ...prev.config,
          calculatedFields: [...calculatedFields, newCF]
        }
      };
    });
    setIsAddingFormula(false);
    setNewFormulaName('');
    setNewFormulaBody('');
    toast.success(`Calculated field ${sanitizedName} created.`);
  };

  const handleDeleteCalculatedField = (cfId: string) => {
    if (!currentReport) return;
    const calculatedFields = currentReport.config.calculatedFields || [];
    const fieldToDelete = calculatedFields.find(cf => cf.id === cfId);

    setCurrentReport(prev => {
      if (!prev) return null;
      return {
        ...prev,
        config: {
          ...prev.config,
          calculatedFields: calculatedFields.filter(cf => cf.id !== cfId)
        }
      };
    });
    
    // Clear selectedWidgetId if it depends on this calculated field
    if (selectedWidget && (selectedWidget.properties.xAxisKey === fieldToDelete?.name || selectedWidget.properties.yAxisKey === fieldToDelete?.name)) {
      setSelectedWidgetId(null);
    }

    toast.success('Calculated field removed.');
  };

  const selectedWidget = currentReport?.config.widgets.find(w => w.id === selectedWidgetId);
  const availableFields = getAvailableFields(
    currentReport?.config.dataSource.tables || [],
    currentReport?.config.dataSource.relationships || []
  );

  const layout = useMemo(() => {
    return (currentReport?.config.widgets || []).map((w, index) => {
      const defaultH = w.type === 'kpi' ? 3 : w.type === 'table' ? 6 : 5;
      const x = w.x !== undefined ? w.x : (index % 2 === 0 ? 0 : 6);
      const y = w.y !== undefined ? w.y : Math.floor(index / 2) * 5;
      const h = w.h !== undefined ? w.h : defaultH;

      return {
        i: w.id,
        x,
        y,
        w: w.w || 6,
        h,
        minW: w.type === 'kpi' ? 2 : 4,
        minH: w.type === 'kpi' ? 2 : 3
      };
    });
  }, [currentReport?.config.widgets]);

  const handleLayoutChange = (newLayout: any[]) => {
    if (!currentReport) return;
    
    let hasChanged = false;
    const updatedWidgets = currentReport.config.widgets.map(w => {
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
      setCurrentReport(prev => {
        if (!prev) return null;
        return {
          ...prev,
          config: {
            ...prev.config,
            widgets: updatedWidgets
          }
        };
      });
    }
  };

  return (
    <div className="w-full h-full relative z-10 flex flex-col min-h-0">
      {view === 'LIST' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            {/* List Tab Switcher */}
            <div className="flex bg-zinc-100/30 dark:bg-white/[0.02] border border-zinc-200/20 dark:border-white/5 rounded-2xl p-1 w-fit">
              {(['ALL', 'PUBLISHED', 'DRAFTS'] as const).map(tabOpt => (
                <button
                  key={tabOpt}
                  onClick={() => setActiveTab(tabOpt)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    activeTab === tabOpt 
                      ? "bg-indigo-600 text-white shadow-lg" 
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  {tabOpt}
                </button>
              ))}
            </div>

            <Button onClick={() => setShowCreatorModal(true)} className="gap-2 shadow-lg shadow-indigo-500/10">
              <Plus size={16} /> Create Report
            </Button>
          </div>

          {/* Reports Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCw className="animate-spin text-indigo-500" size={28} />
              <span className="text-zinc-500 text-xs">Loading tenant report registry...</span>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-16 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl text-center space-y-4 bg-white/20 dark:bg-white/[0.005]">
              <BarChart2 size={36} className="text-zinc-400 mx-auto" />
              <div>
                <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No reports found</h4>
                <p className="text-xs text-zinc-500 mt-1">Generate a report by clicking &quot;New Report&quot;.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => {
                    setCurrentReport(report);
                    setSelectedWidgetId(null);
                    setIsPreview(true);
                    navigate('?mode=builder');
                  }}
                  className="group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl transition-all shadow-xl hover:border-indigo-500/50 hover:shadow-indigo-500/10 cursor-pointer flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        <BarChart2 size={20} />
                      </div>
                      <span className={cn(
                        "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                        report.status === 'Published' 
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}>
                        {report.status}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {report.name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
                      {report.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs relative z-20">
                    {(() => {
                      const creatorMember = members.find(m => m.email?.toLowerCase() === report.createdBy?.toLowerCase());
                      const displayName = creatorMember ? creatorMember.name : report.createdBy;
                      const avatarUrl = creatorMember?.avatarUrl;
                      
                      return (
                        <span className="text-[10px] text-zinc-450 dark:text-zinc-500 flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-zinc-150 dark:bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                              <User size={10} className="text-zinc-500" />
                            )}
                          </div>
                          <span className="font-semibold">{displayName}</span>
                        </span>
                      );
                    })()}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {report.status === 'Published' && (
                        <button 
                          onClick={(e) => handleCopyEmbed(e, report.id)}
                          title="Copy embed snippet"
                          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                        >
                          <Share2 size={12} />
                        </button>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingReport(report);
                        }}
                        className="p-1.5 rounded-lg border border-red-500/10 hover:bg-red-500/10 text-red-500 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Dash creator card */}
              <div 
                onClick={() => setShowCreatorModal(true)}
                className="group p-6 border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-indigo-500/50 rounded-3xl cursor-pointer flex flex-col items-center justify-center h-full min-h-[220px] transition-all text-center hover:bg-indigo-500/[0.01] bg-white/20 dark:bg-white/[0.005]"
              >
                <Plus size={32} className="text-zinc-400 group-hover:text-indigo-500 group-hover:scale-110 transition-all mb-3" />
                <span className="text-sm font-bold text-zinc-500 group-hover:text-indigo-500 transition-colors">Create Report</span>
              </div>
            </div>
          )}

          {/* Creation modal options */}
          <AnimatePresence>
            {showCreatorModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white/90 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10 rounded-[2.5rem] w-full max-w-4xl p-8 space-y-6 shadow-2xl relative"
                >
                  <div className="flex justify-between items-center pb-4 border-b border-zinc-100/50 dark:border-white/5">
                    <div>
                      <h3 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-wider">Create New Report</h3>
                      <p className="text-xs text-zinc-500 mt-1">Select one of the three creation mechanisms to formulate your dashboard.</p>
                    </div>
                    <button onClick={() => setShowCreatorModal(false)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white">✕</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    {/* Blank option */}
                    <div 
                      onClick={handleCreateBlank}
                      className="p-6 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 rounded-3xl cursor-pointer bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-indigo-500/[0.01] transition-all flex flex-col justify-between text-left h-56"
                    >
                      <div className="p-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-xl w-fit">
                        <FileText size={20} />
                      </div>
                      <div>
                        <span className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider block">Start From Blank</span>
                        <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">Begin with a clean canvas, connect to any database tables or connectors, and design manually.</p>
                      </div>
                    </div>

                    {/* Template Option */}
                    <div 
                      onClick={() => {
                        setShowCreatorModal(false);
                        // Trigger simple templates select view or select standard template directly
                        handleCreateTemplate(REPORT_TEMPLATES[0]);
                      }}
                      className="p-6 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 rounded-3xl cursor-pointer bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-indigo-500/[0.01] transition-all flex flex-col justify-between text-left h-56"
                    >
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl w-fit">
                        <Layers size={20} />
                      </div>
                      <div>
                        <span className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider block">Choose from Template</span>
                        <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">Deploy preconfigured, beautiful dashboard layouts for workforce distribution, records activity, or audit logs.</p>
                      </div>
                    </div>

                    {/* AI Prompt Option */}
                    <div 
                      onClick={() => {
                        setShowCreatorModal(false);
                        setShowAIModal(true);
                      }}
                      className="p-6 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 rounded-3xl cursor-pointer bg-indigo-500/5 hover:bg-indigo-500/10 transition-all flex flex-col justify-between text-left h-56 border-indigo-500/20"
                    >
                      <div className="p-3 bg-indigo-600 text-white rounded-xl w-fit animate-pulse">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">AI Dashboard Builder</span>
                        <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">Write a prompt (e.g. &quot;active cases by status&quot;) and let Gemini craft the dataset mappings and charts automatically.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* AI prompt modal */}
          <AnimatePresence>
            {showAIModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white/90 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10 rounded-[2.5rem] w-full max-w-lg p-6 space-y-6 shadow-2xl relative"
                >
                  <div className="flex justify-between items-center pb-3 border-b border-zinc-100/50 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <Sparkles size={18} className="text-indigo-500" />
                      <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider">AI Report Architect</h3>
                    </div>
                    <button onClick={() => setShowAIModal(false)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white">✕</button>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Describe what you want to analyse</label>
                    <textarea
                      placeholder="e.g. Create a workforce overview dashboard showing staff role distributions, team memberships, and active status..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="w-full bg-zinc-55/10 dark:bg-zinc-900 border border-zinc-200/30 dark:border-white/5 rounded-2xl p-4 text-xs text-zinc-800 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20 h-28 resize-none"
                    />
                    <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 text-[10px] text-zinc-500 leading-normal flex gap-2">
                      <Info size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                      <span>The AI builder will automatically identify the local database tables, configure the appropriate chart dimensions, and construct the widgets for you.</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100/50 dark:border-white/5">
                    <Button variant="secondary" size="sm" onClick={() => setShowAIModal(false)}>Cancel</Button>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={handleCreateAI} 
                      disabled={generatingAI || !aiPrompt.trim()}
                      className="gap-2 font-bold"
                    >
                      {generatingAI ? 'Assembling Dashboard...' : (
                        <>
                          <Sparkles size={14} /> Generate Report
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Premium Delete Confirmation Modal */}
          <AnimatePresence>
            {deletingReport && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setDeletingReport(null)}
                  className="absolute inset-0"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="relative w-full max-w-md bg-white/90 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
                >
                  {/* Header */}
                  <div className="p-6 border-b border-zinc-200/30 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center gap-4">
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl">
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-wider">Delete Report?</h3>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Permanent Deletion</p>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Are you sure you want to delete report <span className="font-bold text-zinc-900 dark:text-white">&quot;{deletingReport.name}&quot;</span>? This will permanently remove the configuration and all embedded instances. This action cannot be undone.
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="p-6 border-t border-zinc-200/30 dark:border-white/5 flex gap-3">
                    <button 
                      onClick={() => setDeletingReport(null)}
                      className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-2xl font-bold text-xs text-zinc-600 dark:text-zinc-300 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={confirmDeleteReport}
                      className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-xs shadow-xl shadow-red-500/25 transition-all"
                    >
                      Delete Report
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* VISUAL BUILDER CANVAS (PowerBI / Tableau inspired layout) */
        currentReport && (
          <div className="flex flex-col h-full w-full bg-white/40 dark:bg-white/[0.02] backdrop-blur-xl rounded-none border-none overflow-hidden animate-fade-in">
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #report-print-area, #report-print-area * {
                  visibility: visible !important;
                }
                #report-print-area {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  padding: 24px !important;
                  background: white !important;
                  color: black !important;
                  overflow: visible !important;
                }
                .print-hide {
                  display: none !important;
                }
                .dark #report-print-area {
                  background: white !important;
                  color: black !important;
                }
              }
            ` }} />
            {/* Top Toolbar */}
            <div className="px-6 py-4 border-b border-zinc-200/50 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] backdrop-blur-xl flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    navigate('?');
                    fetchReports();
                  }}
                  className="p-2 rounded-xl border border-zinc-200/50 dark:border-white/10 hover:bg-zinc-150 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={currentReport.name}
                      onChange={(e) => setCurrentReport(prev => prev ? { ...prev, name: e.target.value } : null)}
                      className="text-sm font-bold text-zinc-950 dark:text-white bg-transparent outline-none border-b border-transparent hover:border-zinc-300 focus:border-indigo-500 px-1"
                    />
                    <span className={cn(
                      "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                      currentReport.status === 'Published' 
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    )}>
                      {currentReport.status}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={currentReport.description || ''}
                    placeholder="Add report description..."
                    onChange={(e) => setCurrentReport(prev => prev ? { ...prev, description: e.target.value } : null)}
                    className="text-[10px] text-zinc-450 dark:text-zinc-500 bg-transparent outline-none w-80 block px-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsPreview(!isPreview)}
                  className="gap-1.5 font-bold print-hide"
                >
                  {isPreview ? <Edit2 size={14} /> : <Eye size={14} />}
                  {isPreview ? 'Design Mode' : 'Preview Mode'}
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.print()}
                  className="gap-1.5 font-bold print-hide"
                >
                  <Printer size={14} /> Export PDF
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSaveReport('Draft')}
                  loading={savingReport}
                  className="font-bold"
                >
                  <Save size={14} className="mr-1.5" /> Save Draft
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSaveReport('Published')}
                  loading={savingReport}
                  className="font-bold shadow-lg shadow-indigo-500/10"
                >
                  <Check size={14} className="mr-1.5" /> Publish
                </Button>
              </div>
            </div>

            {/* Split Screen Workspace */}
            <div className="flex flex-1 overflow-hidden min-h-0">
              
              {/* Left Sidebar (Data Schema Selection) */}
              {!isPreview && (() => {
                const primaryTable = currentReport.config.dataSource.tables[0] || 'records';
                const activeRelationships = currentReport.config.dataSource.relationships || [];

                const ALL_LOCAL_TABLES = [
                  { value: 'records', label: 'records (Module items)' },
                  { value: 'tenant_members', label: 'tenant_members (Workforce)' },
                  { value: 'teams', label: 'teams (Tenant Teams)' },
                  { value: 'automations', label: 'automations (Workflows)' },
                  { value: 'catalog_items', label: 'catalog_items (Pricing Catalog)' },
                  ...modules
                    .filter((m: any) => m.type !== 'PAGE' && !m.isGlobal && !m.isIntakeTriage && !m.config?.isIntakeTriage)
                    .map((m: any) => ({ value: `module:${m.id}`, label: `${m.name} (Custom Module)` }))
                ];

                const availableTablesToJoin = ALL_LOCAL_TABLES.filter(t => t.value !== primaryTable && !activeRelationships.some(r => r.joinTable === t.value));
                const primaryKeyFields = getAvailableFields([primaryTable]);
                const joinKeyFields = newRelJoinTable ? getAvailableFields([newRelJoinTable]) : [];

                return (
                  <div className="w-64 border-r border-zinc-200/50 dark:border-white/10 p-4 bg-white/20 dark:bg-zinc-900/10 flex flex-col gap-4 overflow-y-auto shrink-0">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Dataset Origin</label>
                      <select
                        value={currentReport.config.dataSource.type}
                        onChange={(e) => {
                          const typeVal = e.target.value as 'local' | 'external';
                          const defaultTable = typeVal === 'local' ? ['records'] : ['leads'];
                          setCurrentReport(prev => {
                            if (!prev) return null;
                            return {
                              ...prev,
                              config: {
                                ...prev.config,
                                dataSource: { type: typeVal, tables: defaultTable, relationships: [] }
                              }
                            };
                          });
                          setSelectedWidgetId(null);
                          toast.success(`Data source changed to ${typeVal}`);
                        }}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 outline-none"
                      >
                        <option value="local">Local Tenant Tables</option>
                        <option value="external">External Connector API</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Source Database Table</label>
                      {currentReport.config.dataSource.type === 'local' ? (
                        <select
                          value={currentReport.config.dataSource.tables[0] || 'records'}
                          onChange={(e) => {
                            setCurrentReport(prev => {
                              if (!prev) return null;
                              return {
                                ...prev,
                                config: {
                                  ...prev.config,
                                  dataSource: { ...prev.config.dataSource, tables: [e.target.value], relationships: [] }
                                }
                              };
                            });
                            setSelectedWidgetId(null);
                          }}
                          className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 outline-none"
                        >
                          <optgroup label="Standard System Tables">
                            <option value="records">records (Module items)</option>
                            <option value="tenant_members">tenant_members (Workforce)</option>
                            <option value="teams">teams (Tenant Teams)</option>
                            <option value="automations">automations (Workflows)</option>
                            <option value="catalog_items">catalog_items (Pricing Catalog)</option>
                          </optgroup>
                          <optgroup label="Database Modules">
                            {modules
                              .filter((m: any) => m.type !== 'PAGE' && !m.isGlobal && !m.isIntakeTriage && !m.config?.isIntakeTriage)
                              .map((m: any) => (
                                <option key={m.id} value={`module:${m.id}`}>
                                  {m.name} (Custom Module)
                                </option>
                              ))}
                          </optgroup>
                        </select>
                      ) : (
                        <select
                          value={currentReport.config.dataSource.connectorId || 'salesforce'}
                          onChange={(e) => {
                            setCurrentReport(prev => {
                              if (!prev) return null;
                              return {
                                ...prev,
                                config: {
                                  ...prev.config,
                                  dataSource: { ...prev.config.dataSource, connectorId: e.target.value, tables: ['leads'], relationships: [] }
                                }
                              };
                            });
                            setSelectedWidgetId(null);
                          }}
                          className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 outline-none"
                        >
                          <option value="salesforce">Salesforce Leads Pipeline</option>
                          <option value="postgres">PostgreSQL (MySQL Database)</option>
                          <option value="sheets">Google Sheets Sync</option>
                        </select>
                      )}
                    </div>

                    {/* Relational Joins & Data Modeling Panel */}
                    {currentReport.config.dataSource.type === 'local' && (
                      <div className="border-t border-zinc-200/50 dark:border-white/5 pt-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Data Relationships</span>
                          {!isAddingRel && availableTablesToJoin.length > 0 && (
                            <button
                              onClick={() => {
                                const nextJoinTable = availableTablesToJoin[0]?.value || '';
                                setNewRelJoinTable(nextJoinTable);
                                const pFields = getAvailableFields([primaryTable]);
                                const jFields = nextJoinTable ? getAvailableFields([nextJoinTable]) : [];
                                setNewRelPrimaryKey(pFields[0]?.name || 'id');
                                setNewRelForeignKey(jFields[0]?.name || 'id');
                                setNewRelType('left');
                                setIsAddingRel(true);
                              }}
                              className="text-[10px] text-indigo-500 hover:text-indigo-400 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Plus size={10} /> Add Join
                            </button>
                          )}
                        </div>

                        {/* Active Joins List */}
                        {activeRelationships.length > 0 && (
                          <div className="space-y-1.5">
                            {activeRelationships.map(rel => {
                              let tableLabel = rel.joinTable;
                              if (tableLabel.startsWith('module:')) {
                                const moduleId = tableLabel.split(':')[1];
                                const m = modules.find((mod: any) => mod.id === moduleId);
                                tableLabel = m ? m.name : moduleId;
                              } else {
                                tableLabel = tableLabel.replace('tenant_members', 'workforce');
                              }
                              return (
                                <div key={rel.id} className="p-2 bg-white/40 dark:bg-zinc-955/20 border border-zinc-200/20 dark:border-white/5 rounded-xl text-[10px] flex justify-between items-center group/join">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1 font-bold text-zinc-700 dark:text-zinc-300">
                                      <span className="capitalize text-zinc-450 dark:text-zinc-550 text-[9px] font-black">{rel.type} Join</span>
                                      <span>➔</span>
                                      <span className="text-indigo-500">{tableLabel}</span>
                                    </div>
                                    <div className="text-[9px] text-zinc-450 dark:text-zinc-550 font-mono">
                                      {rel.primaryKey} = {tableLabel.toLowerCase().replace(/\s+/g, '_')}.{rel.foreignKey}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteRelationship(rel.id)}
                                    className="text-zinc-400 hover:text-red-500 opacity-0 group-hover/join:opacity-100 transition-opacity p-1 cursor-pointer"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Add Join Form */}
                        {isAddingRel && (
                          <div className="p-3 bg-zinc-50/50 dark:bg-zinc-950/30 border border-zinc-200/50 dark:border-zinc-800/80 rounded-2xl space-y-3">
                            <span className="text-[9px] font-black uppercase text-zinc-400 block">Configure Join</span>
                            
                            <div className="space-y-1">
                              <label className="text-[9px] text-zinc-450 dark:text-zinc-550 uppercase font-black">Target Table</label>
                              <select
                                value={newRelJoinTable}
                                onChange={(e) => {
                                  setNewRelJoinTable(e.target.value);
                                  const jFields = getAvailableFields([e.target.value]);
                                  setNewRelForeignKey(jFields[0]?.name || 'id');
                                }}
                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 outline-none"
                              >
                                {availableTablesToJoin.map(t => (
                                  <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                              </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[9px] text-zinc-450 dark:text-zinc-550 uppercase font-black">Primary Key</label>
                                <select
                                  value={newRelPrimaryKey}
                                  onChange={(e) => setNewRelPrimaryKey(e.target.value)}
                                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 outline-none"
                                >
                                  {primaryKeyFields.map(f => (
                                    <option key={f.name} value={f.name}>{f.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-zinc-450 dark:text-zinc-550 uppercase font-black">Foreign Key</label>
                                <select
                                  value={newRelForeignKey}
                                  onChange={(e) => setNewRelForeignKey(e.target.value)}
                                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 outline-none"
                                >
                                  {joinKeyFields.map(f => (
                                    <option key={f.name} value={f.name}>{f.name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] text-zinc-450 dark:text-zinc-550 uppercase font-black">Join Type</label>
                              <select
                                value={newRelType}
                                onChange={(e) => setNewRelType(e.target.value as 'left' | 'inner')}
                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 outline-none"
                              >
                                <option value="left">Left Join (Keep all primary rows)</option>
                                <option value="inner">Inner Join (Only matching rows)</option>
                              </select>
                            </div>

                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => {
                                  handleAddRelationship(newRelJoinTable, newRelPrimaryKey, newRelForeignKey, newRelType);
                                  setIsAddingRel(false);
                                }}
                                className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg py-1 text-[10px] font-bold text-center cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setIsAddingRel(false)}
                                className="flex-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg py-1 text-[10px] font-bold text-center cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Dashboard Slicers Config Panel */}
                    <div className="border-t border-zinc-200/50 dark:border-white/5 pt-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Dashboard Slicers</span>
                        {!isAddingSlicer && availableFields.length > 0 && (
                          <button
                            onClick={() => {
                              setNewSlicerField(availableFields[0]?.name || '');
                              setIsAddingSlicer(true);
                            }}
                            className="text-[10px] text-indigo-500 hover:text-indigo-400 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={10} /> Add Slicer
                          </button>
                        )}
                      </div>

                      {/* Active Slicers List */}
                      {(currentReport.config.slicers || []).length > 0 && (
                        <div className="space-y-1.5">
                          {(currentReport.config.slicers || []).map(field => {
                            return (
                              <div key={field} className="p-2 bg-white/40 dark:bg-zinc-955/20 border border-zinc-200/20 dark:border-white/5 rounded-xl text-[10px] flex justify-between items-center group/slicer">
                                <div className="space-y-0.5">
                                  <div className="font-bold text-zinc-700 dark:text-zinc-300">
                                    <span className="text-indigo-500 capitalize">{field.split('.').pop()}</span>
                                  </div>
                                  <div className="text-[9px] text-zinc-450 dark:text-zinc-550 font-mono">
                                    {field}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDeleteSlicer(field)}
                                  className="text-zinc-400 hover:text-red-500 opacity-0 group-hover/slicer:opacity-100 transition-opacity p-1 cursor-pointer"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Add Slicer Form */}
                      {isAddingSlicer && (
                        <div className="p-3 bg-zinc-50/50 dark:bg-zinc-950/30 border border-zinc-200/50 dark:border-zinc-800/80 rounded-2xl space-y-3">
                          <span className="text-[9px] font-black uppercase text-zinc-400 block">Configure Slicer</span>
                          
                          <div className="space-y-1">
                            <label className="text-[9px] text-zinc-450 dark:text-zinc-550 uppercase font-black">Filter Field</label>
                            <select
                              value={newSlicerField}
                              onChange={(e) => setNewSlicerField(e.target.value)}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 outline-none"
                            >
                              {availableFields.map(f => (
                                <option key={f.name} value={f.name}>{f.name} ({f.type})</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleAddSlicer(newSlicerField)}
                              className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg py-1 text-[10px] font-bold text-center cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setIsAddingSlicer(false)}
                              className="flex-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg py-1 text-[10px] font-bold text-center cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Calculated Fields / Formulas Panel */}
                    <div className="border-t border-zinc-200/50 dark:border-white/5 pt-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Calculated Fields</span>
                        {!isAddingFormula && (
                          <button
                            onClick={() => {
                              setNewFormulaName('');
                              setNewFormulaBody('');
                              setIsAddingFormula(true);
                            }}
                            className="text-[10px] text-indigo-500 hover:text-indigo-400 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={10} /> Add Formula
                          </button>
                        )}
                      </div>

                      {/* Active Calculated Fields List */}
                      {(currentReport.config.calculatedFields || []).length > 0 && (
                        <div className="space-y-1.5">
                          {(currentReport.config.calculatedFields || []).map(cf => {
                            return (
                              <div key={cf.id} className="p-2 bg-white/40 dark:bg-zinc-955/20 border border-zinc-200/20 dark:border-white/5 rounded-xl text-[10px] flex justify-between items-center group/cf">
                                <div className="space-y-0.5">
                                  <div className="font-bold text-zinc-700 dark:text-zinc-300">
                                    <span className="text-indigo-500 font-mono">{cf.name}</span>
                                  </div>
                                  <div className="text-[9px] text-zinc-450 dark:text-zinc-550 font-mono truncate max-w-[180px]" title={cf.formula}>
                                    {cf.formula}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDeleteCalculatedField(cf.id)}
                                  className="text-zinc-400 hover:text-red-500 opacity-0 group-hover/cf:opacity-100 transition-opacity p-1 cursor-pointer"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Add Calculated Field Form */}
                      {isAddingFormula && (
                        <div className="p-3 bg-zinc-50/50 dark:bg-zinc-950/30 border border-zinc-200/50 dark:border-zinc-800/80 rounded-2xl space-y-3">
                          <span className="text-[9px] font-black uppercase text-zinc-400 block">Create Formula</span>
                          
                          <div className="space-y-1">
                            <label className="text-[9px] text-zinc-450 dark:text-zinc-550 uppercase font-black">Field Name</label>
                            <input
                              type="text"
                              value={newFormulaName}
                              onChange={(e) => setNewFormulaName(e.target.value)}
                              placeholder="e.g. backlog_days"
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] text-zinc-450 dark:text-zinc-550 uppercase font-black">Formula Expression</label>
                            <textarea
                              value={newFormulaBody}
                              onChange={(e) => setNewFormulaBody(e.target.value)}
                              placeholder="e.g. TIMESPAN('days', {created_at}, TODAY())"
                              rows={3}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 outline-none font-mono focus:ring-2 focus:ring-indigo-500/20"
                            />
                          </div>

                          {/* Quick syntax reference guide */}
                          <div className="p-2 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-[9px] text-zinc-500 space-y-1">
                            <span className="font-bold text-indigo-500 block">Syntax Cheat Sheet:</span>
                            <div className="font-mono space-y-0.5">
                              <div>• {`{field}`} = Field reference</div>
                              <div>• IF(cond, t, e) = Ternary logic</div>
                              <div>• TIMESPAN('days', t1, t2) = Diff</div>
                              <div>• CONCAT(a, b, ...) = Concatenate</div>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleAddCalculatedField(newFormulaName, newFormulaBody)}
                              className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg py-1 text-[10px] font-bold text-center cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setIsAddingFormula(false)}
                              className="flex-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg py-1 text-[10px] font-bold text-center cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-zinc-200/50 dark:border-white/5 pt-4 space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Available Schema Fields</span>
                      <div className="space-y-1.5">
                        {availableFields.map(f => (
                          <div key={f.name} className="flex items-center justify-between p-2 bg-white/40 dark:bg-zinc-900/30 border border-zinc-200/30 dark:border-white/5 rounded-xl text-[11px] text-zinc-650 dark:text-zinc-350">
                            <span className="font-mono text-zinc-700 dark:text-zinc-300">{f.name}</span>
                            <span className="text-[9px] text-zinc-400 uppercase font-black">{f.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Center Canvas (Dashboard Rendering Layout) */}
              <div id="report-print-area" className="flex-1 p-6 overflow-y-auto bg-zinc-50/10 dark:bg-white/[0.005]">
                {/* Visual Widgets Toolbar */}
                {!isPreview && (
                  <div className="print-hide mb-6 p-4 bg-white/50 dark:bg-zinc-950/20 border border-zinc-200/30 dark:border-white/5 rounded-3xl flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mr-2">Visual toolbox:</span>
                    <button 
                      onClick={() => handleAddWidget('kpi')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[10px] font-bold text-indigo-600 dark:text-indigo-400"
                    >
                      <TrendingUp size={12} /> KPI Card
                    </button>
                    <button 
                      onClick={() => handleAddWidget('bar')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[10px] font-bold text-indigo-600 dark:text-indigo-400"
                    >
                      <BarChart size={12} /> Bar Chart
                    </button>
                    <button 
                      onClick={() => handleAddWidget('line')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[10px] font-bold text-indigo-600 dark:text-indigo-400"
                    >
                      <LineChart size={12} /> Line Chart
                    </button>
                    <button 
                      onClick={() => handleAddWidget('area')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[10px] font-bold text-indigo-600 dark:text-indigo-400"
                    >
                      <Activity size={12} /> Area Chart
                    </button>
                    <button 
                      onClick={() => handleAddWidget('pie')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[10px] font-bold text-indigo-600 dark:text-indigo-400"
                    >
                      <PieChart size={12} /> Pie Chart
                    </button>
                    <button 
                      onClick={() => handleAddWidget('table')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[10px] font-bold text-indigo-600 dark:text-indigo-400"
                    >
                      <Table size={12} /> Data Table
                    </button>
                  </div>
                )}

                {/* Dashboard layout */}
                {currentReport.config.widgets.length === 0 ? (
                  <div className="h-64 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl flex flex-col justify-center items-center gap-2 text-center p-6 bg-white/20 dark:bg-white/[0.005]">
                    <Layers size={32} className="text-zinc-400" />
                    <div>
                      <h4 className="text-xs font-bold text-zinc-750 dark:text-zinc-300">Canvas is empty</h4>
                      <p className="text-[10px] text-zinc-550 dark:text-zinc-500">Add visuals from the toolbox above to formulate your dashboard.</p>
                    </div>
                  </div>
                ) : (
                  <ReportBuilderCanvas
                    currentReport={currentReport}
                    isPreview={isPreview}
                    selectedWidgetId={selectedWidgetId}
                    setSelectedWidgetId={setSelectedWidgetId}
                    layout={layout}
                    handleLayoutChange={handleLayoutChange}
                    getAggregatedData={getAggregatedData}
                    handleDeleteWidget={handleDeleteWidget}
                    COLORS={COLORS}
                    handleChartElementClick={handleChartElementClick}
                    activeFilters={activeFilters}
                    handleSlicerChange={handleSlicerChange}
                    getUniqueValuesForField={getUniqueValuesForField}
                    handleClearFilters={() => setActiveFilters({})}
                    sourcesLoading={sourcesLoading}
                  />
                )}
              </div>

              {/* Right Sidebar (Widget Properties & Dimension Mapping) */}
              {!isPreview && selectedWidget && (
                <div className="w-80 border-l border-zinc-200/50 dark:border-white/10 p-5 bg-white/20 dark:bg-zinc-900/10 flex flex-col gap-4 overflow-y-auto shrink-0">
                  <div>
                    <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider">Visual Properties</h3>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Map local database fields to dimensions.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Visual Title</label>
                    <input
                      type="text"
                      value={selectedWidget.title}
                      onChange={(e) => handleUpdateWidget(selectedWidget.id, { title: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 outline-none focus:ring-1 focus:ring-indigo-500/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Layout Width</label>
                    <select
                      value={selectedWidget.w}
                      onChange={(e) => handleUpdateWidget(selectedWidget.id, { w: parseInt(e.target.value) })}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 outline-none"
                    >
                      <option value={4}>4 Columns (1/3 Width)</option>
                      <option value={6}>6 Columns (1/2 Width)</option>
                      <option value={8}>8 Columns (2/3 Width)</option>
                      <option value={12}>12 Columns (Full Width)</option>
                    </select>
                  </div>

                  {(() => {
                    const xLabel = selectedWidget.type === 'bar' || selectedWidget.type === 'line' || selectedWidget.type === 'area' ? 'Dimension (X-Axis)' :
                                   selectedWidget.type === 'pie' ? 'Slice Dimension (Category)' :
                                   selectedWidget.type === 'table' ? 'Row Grouping (Dimension)' :
                                   null;

                    const yLabel = selectedWidget.type === 'bar' || selectedWidget.type === 'line' || selectedWidget.type === 'area' ? 'Metric Value Field (Y-Axis)' :
                                   selectedWidget.type === 'pie' ? 'Slice Value Field' :
                                   selectedWidget.type === 'table' ? 'Column Value Field' :
                                   selectedWidget.type === 'kpi' ? 'Target Value Field' :
                                   'Metric Value Field';
                    
                    return (
                      <div className="border-t border-zinc-200/50 dark:border-white/5 pt-4 space-y-4">
                        {xLabel && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">{xLabel}</label>
                            <select
                              value={selectedWidget.properties.xAxisKey}
                              onChange={(e) => handleUpdateWidget(selectedWidget.id, {
                                properties: { ...selectedWidget.properties, xAxisKey: e.target.value }
                              })}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 outline-none focus:ring-1 focus:ring-indigo-500/30"
                            >
                              {availableFields.map(f => (
                                <option key={f.name} value={f.name}>{f.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Aggregation Metric</label>
                          <select
                            value={selectedWidget.properties.aggregate}
                            onChange={(e) => handleUpdateWidget(selectedWidget.id, {
                              properties: { ...selectedWidget.properties, aggregate: e.target.value as any }
                            })}
                            className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 outline-none focus:ring-1 focus:ring-indigo-500/30"
                          >
                            <option value="count">Count (Number of items)</option>
                            <option value="sum">Sum (Add values)</option>
                            <option value="avg">Average value</option>
                            <option value="min">Minimum value</option>
                            <option value="max">Maximum value</option>
                          </select>
                        </div>

                        {yLabel && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">{yLabel}</label>
                            {selectedWidget.properties.aggregate === 'count' ? (
                              <div className="w-full bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-xl px-3 py-2 text-xs text-zinc-400 dark:text-zinc-500 cursor-not-allowed select-none">
                                Record Count (Calculated)
                              </div>
                            ) : (
                              <select
                                value={selectedWidget.properties.yAxisKey}
                                onChange={(e) => handleUpdateWidget(selectedWidget.id, {
                                  properties: { ...selectedWidget.properties, yAxisKey: e.target.value }
                                })}
                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 outline-none focus:ring-1 focus:ring-indigo-500/30"
                              >
                                {availableFields.filter(f => f.type === 'number').map(f => (
                                  <option key={f.name} value={f.name}>{f.name}</option>
                                ))}
                                {availableFields.filter(f => f.type !== 'number').map(f => (
                                  <option key={f.name} value={f.name}>{f.name} (Non-numeric)</option>
                                ))}
                              </select>
                            )}
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Chart Color</label>
                          <div className="flex gap-2">
                            {COLORS.map(color => (
                              <button
                                key={color}
                                onClick={() => handleUpdateWidget(selectedWidget.id, {
                                  properties: { ...selectedWidget.properties, color }
                                })}
                                style={{ backgroundColor: color }}
                                className={cn(
                                  "w-6 h-6 rounded-full border-2",
                                  selectedWidget.properties.color === color ? "border-zinc-950 dark:border-white scale-110" : "border-transparent"
                                )}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Display toggles for chart types */}
                        {['bar', 'line', 'area', 'pie'].includes(selectedWidget.type) && (
                          <div className="border-t border-zinc-200/50 dark:border-white/5 pt-4 space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Display Options</label>
                            <div className="space-y-2">
                              {['bar', 'line', 'area'].includes(selectedWidget.type) && (
                                <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedWidget.properties.showGridlines ?? true}
                                    onChange={(e) => handleUpdateWidget(selectedWidget.id, {
                                      properties: { ...selectedWidget.properties, showGridlines: e.target.checked }
                                    })}
                                    className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 bg-transparent"
                                  />
                                  <span>Show Gridlines</span>
                                </label>
                              )}
                              <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedWidget.properties.showLegend ?? false}
                                  onChange={(e) => handleUpdateWidget(selectedWidget.id, {
                                    properties: { ...selectedWidget.properties, showLegend: e.target.checked }
                                  })}
                                  className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 bg-transparent"
                                />
                                <span>Show Legend</span>
                              </label>
                              <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedWidget.properties.showTooltip ?? true}
                                  onChange={(e) => handleUpdateWidget(selectedWidget.id, {
                                    properties: { ...selectedWidget.properties, showTooltip: e.target.checked }
                                  })}
                                  className="rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 bg-transparent"
                                />
                                <span>Show Hover Tooltips</span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
};
