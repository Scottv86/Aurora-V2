import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { 
  ArrowLeft, Save, Trash2, ArrowUp, ArrowDown, Settings, 
  Sparkles, Layout, Eye, Columns, Loader2, Cpu
} from 'lucide-react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/UI/Primitives';
import { toast } from 'sonner';
import { fetchModule } from '../../services/dataService';
import { PageAIBuilderModal } from './PageAIBuilderModal';
import { PLATFORM_MODULES } from '../../config/platformModules';
import { cn } from '../../lib/utils';

export const PageBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tenant, refreshModules, modules } = usePlatform();
  const { session } = useAuth();

  const [name, setName] = useState('');
  const [iconName, setIconName] = useState('Layers');
  const [widgets, setWidgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Widget settings editing state
  const [editingWidget, setEditingWidget] = useState<any | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);

  // Fetch existing layout
  useEffect(() => {
    const loadPage = async () => {
      if (!tenant?.id || !id) return;
      setLoading(true);
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const pageMod = await fetchModule(id, tenant.id, token, modules);
        setName(pageMod.name || '');
        setIconName(pageMod.iconName || pageMod.icon || 'Layers');
        setWidgets(pageMod.config?.widgets || []);
      } catch (err) {
        console.error('Failed to fetch page config for builder', err);
        toast.error('Failed to fetch page configuration');
      } finally {
        setLoading(false);
      }
    };
    loadPage();
  }, [id, tenant?.id, session?.access_token, modules]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Page name cannot be empty.');
      return;
    }
    if (!tenant?.id || !id) return;

    setSaving(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      
      const response = await fetch(`http://localhost:3001/api/data/modules/${id}`, {
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
      toast.success('Page layout saved successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const handleAddWidget = (type: string) => {
    let title = 'New Widget';
    let defaultW = 12;
    let properties: any = {};

    switch (type) {
      case 'stats-grid':
        title = 'Overview Statistics';
        break;
      case 'active-workflows':
        title = 'Running Workflows';
        break;
      case 'work-queue':
        title = 'My Work Inbox';
        break;
      case 'module-table':
        title = 'Recent Records';
        defaultW = 6;
        properties = { moduleId: '' };
        break;
      case 'module-creator':
        title = 'Submit Record Form';
        defaultW = 6;
        properties = { moduleId: '' };
        break;
      case 'rich-text':
        title = 'Noticeboard';
        defaultW = 12;
        properties = { content: '<p>Welcome to your noticeboard!</p>' };
        break;
      case 'chart':
        title = 'Volume Chart';
        defaultW = 6;
        properties = { moduleId: '', chartType: 'bar' };
        break;
      case 'report':
        title = 'BI Report Dashboard';
        defaultW = 12;
        properties = { reportId: '' };
        break;

    }

    const newWidget = {
      id: `${type}-${Date.now()}`,
      type,
      title,
      w: defaultW,
      properties
    };

    setWidgets(prev => [...prev, newWidget]);
    toast.success(`Added ${title} widget`);
  };

  const handleDeleteWidget = (widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
    if (editingWidget?.id === widgetId) {
      setEditingWidget(null);
    }
  };

  const handleMoveWidget = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === widgets.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    setWidgets(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[newIndex];
      copy[newIndex] = temp;
      return copy;
    });
  };

  const handleUpdateWidgetWidth = (index: number, width: number) => {
    setWidgets(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], w: width };
      return copy;
    });
  };

  const handleUpdateWidgetTitle = (index: number, title: string) => {
    setWidgets(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], title };
      return copy;
    });
  };

  const handleAISuggestedLayout = (suggestedWidgets: any[]) => {
    setWidgets(suggestedWidgets);
    toast.success('AI layout applied to canvas!');
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
    <div className="flex flex-col w-full h-[calc(100vh-4rem)] bg-transparent overflow-hidden">
      {/* Top Header */}
      <div className="px-6 lg:px-12 py-5 border-b border-zinc-200 dark:border-white/5 bg-white/50 dark:bg-white/[0.02] backdrop-blur-xl shrink-0 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/workspace/settings/pages')}
            className="p-2.5 rounded-xl border border-zinc-200 dark:border-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors bg-white/50 dark:bg-white/[0.01]"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <PageIcon className="text-indigo-500" size={18} />
              <input
                type="text"
                placeholder="Enter Page Name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-lg font-black text-zinc-900 dark:text-white bg-transparent border-none outline-none focus:ring-1 focus:ring-indigo-500/20 rounded px-1"
              />
            </div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Visual Page Builder</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setShowAIModal(true)}
            variant="secondary"
            className="gap-2 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 font-bold"
          >
            <Sparkles size={16} />
            Build with AI
          </Button>

          <Button 
            onClick={() => navigate(`/workspace/pages/${id}`)}
            variant="secondary"
            className="gap-2 font-bold"
          >
            <Eye size={16} />
            Preview Page
          </Button>

          <Button onClick={handleSave} loading={saving} className="gap-2 shadow-lg shadow-indigo-500/10 font-bold">
            <Save size={16} />
            Save Layout
          </Button>
        </div>
      </div>

      {/* Main Builder Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 lg:p-8 overflow-hidden min-h-0 relative">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/[0.02] rounded-full blur-[100px] pointer-events-none" />
        
        {/* Left: Widgets Canvas (Cols 8/12) */}
        <div className="lg:col-span-8 flex flex-col h-full bg-white/50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm backdrop-blur-xl">
          <div className="p-4 border-b border-zinc-100 dark:border-white/5 shrink-0 bg-zinc-50/10 dark:bg-white/[0.01]">
            <h2 className="text-xs font-bold text-zinc-850 dark:text-zinc-250 uppercase tracking-widest">Layout Canvas</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {widgets.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center border border-dashed border-zinc-300 dark:border-white/10 rounded-3xl text-center space-y-3 p-6 bg-white/20 dark:bg-white/[0.005]">
                <Layout size={40} className="text-zinc-300 dark:text-zinc-700" />
                <div>
                  <h4 className="text-sm font-bold text-zinc-650 dark:text-zinc-350">Canvas is empty</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">Use the widget toolbox on the right to add cards onto this page.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-4">
                {widgets.map((widget, index) => {
                  const widthClass = widget.w === 6 ? 'col-span-12 lg:col-span-6' : 
                                     widget.w === 4 ? 'col-span-12 lg:col-span-4' :
                                     widget.w === 8 ? 'col-span-12 lg:col-span-8' :
                                     'col-span-12';
                  
                  const isEditing = editingWidget?.id === widget.id;

                  return (
                    <div 
                      key={widget.id} 
                      className={cn(
                        "p-4 bg-white/40 dark:bg-white/[0.01] border rounded-2xl flex flex-col justify-between transition-all relative group shadow-sm",
                        widthClass,
                        isEditing ? "border-indigo-500 bg-indigo-500/[0.01]" : "border-zinc-200/50 dark:border-white/5 hover:border-zinc-300/80 dark:hover:border-white/10"
                      )}
                    >
                      {/* Widget Actions Top Panel */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black uppercase tracking-wider bg-zinc-150 dark:bg-white/5 px-2 py-0.5 rounded text-zinc-500 dark:text-zinc-400">
                            {widget.type}
                          </span>
                          <input
                            type="text"
                            value={widget.title}
                            onChange={(e) => handleUpdateWidgetTitle(index, e.target.value)}
                            className="bg-transparent border-none outline-none font-bold text-xs text-zinc-850 dark:text-white w-40 focus:ring-1 focus:ring-indigo-500/30 rounded"
                          />
                        </div>

                        <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          {/* Order actions */}
                          <button 
                            disabled={index === 0} 
                            onClick={() => handleMoveWidget(index, 'up')}
                            className="p-1 rounded text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button 
                            disabled={index === widgets.length - 1} 
                            onClick={() => handleMoveWidget(index, 'down')}
                            className="p-1 rounded text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30"
                          >
                            <ArrowDown size={12} />
                          </button>

                          {/* Width selections */}
                          <button 
                            onClick={() => handleUpdateWidgetWidth(index, widget.w === 12 ? 6 : widget.w === 6 ? 4 : widget.w === 4 ? 8 : 12)}
                            className="p-1 rounded text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            title={`Change width (currently: ${widget.w}/12)`}
                          >
                            <Columns size={12} />
                          </button>

                          {/* Edit Properties settings */}
                          {['module-table', 'module-creator', 'rich-text', 'chart'].includes(widget.type) && (
                            <button 
                              onClick={() => setEditingWidget(widget)}
                              className="p-1 rounded text-zinc-400 hover:text-indigo-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                              <Settings size={12} />
                            </button>
                          )}

                          {/* Delete */}
                          <button 
                            onClick={() => handleDeleteWidget(widget.id)}
                            className="p-1 rounded text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Preview Layout Placeholder */}
                      <div className="h-16 flex items-center justify-center border border-dashed border-zinc-200/50 dark:border-white/5 rounded-xl bg-white/30 dark:bg-white/[0.01] text-[10px] text-zinc-450 dark:text-zinc-500 font-medium">
                        Widget Preview
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Sidebar Toolbox & Properties (Cols 4/12) */}
        <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-1">
          {/* Properties Panel (conditional) */}
          {editingWidget && (
            <div className="bg-white/50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-3xl p-5 space-y-4 shadow-sm backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-2">
                <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-1.5">
                  <Settings size={14} className="text-indigo-500" />
                  Widget Settings
                </h3>
                <button 
                  onClick={() => setEditingWidget(null)}
                  className="text-[10px] font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-white uppercase"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Module selection for module-based widgets */}
                {['module-table', 'module-creator', 'chart'].includes(editingWidget.type) && (
                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-500 uppercase tracking-wider block">Target Custom Module</label>
                    <select
                      value={editingWidget.properties?.moduleId || ''}
                      onChange={(e) => {
                        const mId = e.target.value;
                        setWidgets(prev => prev.map(w => {
                          if (w.id === editingWidget.id) {
                            return { ...w, properties: { ...w.properties, moduleId: mId } };
                          }
                          return w;
                        }));
                        setEditingWidget((prev: any) => ({ ...prev, properties: { ...prev.properties, moduleId: mId } }));
                      }}
                      className="w-full bg-zinc-50/50 dark:bg-white/[0.01] border border-zinc-200 dark:border-white/5 rounded-lg px-2.5 py-1.5 outline-none text-zinc-850 dark:text-white focus:border-indigo-500/50"
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
                {editingWidget.type === 'report' && (
                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-500 uppercase tracking-wider block">Select BI Report</label>
                    <ReportDropdown 
                      editingWidget={editingWidget} 
                      setWidgets={setWidgets}
                      setEditingWidget={setEditingWidget}
                      tenant={tenant}
                      session={session}
                    />
                  </div>
                )}

                {/* Chart type properties */}
                {editingWidget.type === 'chart' && (
                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-500 uppercase tracking-wider block">Chart Type</label>
                    <div className="flex gap-2">
                      {['bar', 'line'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setWidgets(prev => prev.map(w => {
                              if (w.id === editingWidget.id) {
                                return { ...w, properties: { ...w.properties, chartType: t } };
                              }
                              return w;
                            }));
                            setEditingWidget((prev: any) => ({ ...prev, properties: { ...prev.properties, chartType: t } }));
                          }}
                          className={cn(
                            "flex-1 py-1 px-3 rounded-lg border text-center uppercase font-bold text-[10px]",
                            editingWidget.properties?.chartType === t
                              ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
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
                {editingWidget.type === 'rich-text' && (
                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-500 uppercase tracking-wider block">Rich HTML Content</label>
                    <textarea
                      placeholder="Type HTML / Markdown content here..."
                      value={editingWidget.properties?.content || ''}
                      onChange={(e) => {
                        const txt = e.target.value;
                        setWidgets((prev: any[]) => prev.map(w => {
                          if (w.id === editingWidget.id) {
                            return { ...w, properties: { ...w.properties, content: txt } };
                          }
                          return w;
                        }));
                        setEditingWidget((prev: any) => ({ ...prev, properties: { ...prev.properties, content: txt } }));
                      }}
                      className="w-full bg-zinc-50/50 dark:bg-white/[0.01] border border-zinc-200 dark:border-white/5 rounded-lg p-2.5 outline-none font-mono resize-none h-40 text-zinc-850 dark:text-white focus:border-indigo-500/50"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Toolbox Panel */}
          <div className="bg-white/50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 rounded-3xl p-5 space-y-4 shadow-sm backdrop-blur-xl">
            <div>
              <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-250 uppercase tracking-widest">Widget Toolbox</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">Click a widget to place it on the layout canvas.</p>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs">
              {[
                { type: 'stats-grid', label: 'Stats Metrics Grid', icon: Cpu, desc: 'Display summaries of key tenant parameters.' },
                { type: 'active-workflows', label: 'Active Workflows', icon: Icons.Workflow, desc: 'Show currently executing workflows.' },
                { type: 'work-queue', label: 'My Work Inbox', icon: Icons.ClipboardList, desc: 'Embed the personal work queue for cases.' },
                { type: 'module-table', label: 'Module Records Table', icon: Icons.Database, desc: 'Display a paginated list of records from a module.' },
                { type: 'module-creator', label: 'Module Submission Form', icon: Icons.FileText, desc: 'Render a form to create entries in a module.' },
                { type: 'rich-text', label: 'Noticeboard / Rich Text', icon: Layout, desc: 'Provide HTML or instruction text blocks.' },
                { type: 'chart', label: 'Volume Chart', icon: Icons.BarChart, desc: 'Visualize case volume charts.' },
                { type: 'report', label: 'BI Report Dashboard', icon: Icons.BarChart3, desc: 'Embed a published visual report.' },
              ].map((item) => {
                return (
                  <button
                    key={item.type}
                    onClick={() => handleAddWidget(item.type)}
                    className="flex items-start gap-3 p-3 rounded-2xl border border-zinc-200 dark:border-white/5 bg-white/40 dark:bg-white/[0.01] hover:border-indigo-500/40 hover:bg-indigo-500/[0.01] transition-all text-left group"
                  >
                    <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-white/5 text-zinc-400 group-hover:text-indigo-500 group-hover:scale-105 transition-all">
                      {React.createElement(item.icon, { size: 16 })}
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-850 dark:text-white">{item.label}</h4>
                      <p className="text-[10px] text-zinc-450 dark:text-zinc-500 leading-normal mt-0.5">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* AI Page Builder Modal */}
      <PageAIBuilderModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onLayoutGenerated={handleAISuggestedLayout}
        modules={modules}
      />
    </div>
  );
};

const ReportDropdown = ({ editingWidget, setWidgets, setEditingWidget, tenant, session }: any) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublishedReports = async () => {
      if (!tenant?.id) return;
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const res = await fetch(`http://localhost:3001/api/reports`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant.id
          }
        });
        if (res.ok) {
          const data = await res.json();
          setReports(data.filter((r: any) => r.status === 'Published'));
        }
      } catch (err) {
        console.error('Failed to fetch reports list', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPublishedReports();
  }, [tenant?.id, session?.access_token]);

  return (
    <select
      value={editingWidget.properties?.reportId || ''}
      onChange={(e) => {
        const rId = e.target.value;
        setWidgets((prev: any[]) => prev.map(w => {
          if (w.id === editingWidget.id) {
            return { ...w, properties: { ...w.properties, reportId: rId } };
          }
          return w;
        }));
        setEditingWidget((prev: any) => ({ ...prev, properties: { ...prev.properties, reportId: rId } }));
      }}
      disabled={loading}
      className="w-full bg-zinc-50/50 dark:bg-white/[0.01] border border-zinc-200 dark:border-white/5 rounded-lg px-2.5 py-1.5 outline-none text-zinc-850 dark:text-white focus:border-indigo-500/50 text-xs"
    >
      {loading ? (
        <option>Loading reports...</option>
      ) : reports.length === 0 ? (
        <option value="">No published reports found</option>
      ) : (
        <>
          <option value="">Select report...</option>
          {reports.map((r: any) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </>
      )}
    </select>
  );
};

