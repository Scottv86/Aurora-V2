
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { 
  ArrowLeft, Save, Trash2, Settings, 
  Sparkles, Layout, Eye, Loader2, Cpu, GripVertical
} from 'lucide-react';
import ReactGridLayout from 'react-grid-layout';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/UI/Primitives';
import { toast } from 'sonner';
import { fetchModule } from '../../services/dataService';
import { PageAIBuilderModal } from './PageAIBuilderModal';
import { PLATFORM_MODULES } from '../../config/platformModules';
import { cn, slugify } from '../../lib/utils';
import { ReportWidgetEmbed } from './WorkspacePageView';

export const getWidgetDefaultDimensions = (type: string) => {
  switch (type) {
    case 'stats-grid': return { w: 12, h: 2, minW: 6, minH: 2 };
    case 'active-workflows': return { w: 6, h: 5, minW: 4, minH: 3 };
    case 'work-queue': return { w: 12, h: 6, minW: 6, minH: 4 };
    case 'module-table': return { w: 6, h: 6, minW: 4, minH: 3 };
    case 'module-creator': return { w: 6, h: 6, minW: 4, minH: 3 };
    case 'rich-text': return { w: 12, h: 4, minW: 4, minH: 2 };
    case 'chart': return { w: 6, h: 5, minW: 4, minH: 3 };
    case 'report': return { w: 12, h: 8, minW: 6, minH: 4 };
    default: return { w: 6, h: 5, minW: 4, minH: 3 };
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
  const { tenant, refreshModules, modules } = usePlatform();
  const { session } = useAuth();

  const [name, setName] = useState('');
  const [iconName, setIconName] = useState('Layers');
  const [widgets, setWidgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Widget settings editing state
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);

  const selectedWidget = widgets.find(w => w.id === selectedWidgetId);

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
        
        const loadedWidgets = (pageMod.config?.widgets || pageMod.widgets || []).map((w: any, index: number) => {
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
      
      const response = await fetch(`http://localhost:3001/api/data/modules/${actualId}`, {
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
        properties = { moduleId: '' };
        break;
      case 'module-creator':
        title = 'Submit Record Form';
        properties = { moduleId: '' };
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
            onClick={() => navigate(`/workspace/pages/${slugify(name)}`)}
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

      {/* Main Split Screen Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/[0.02] rounded-full blur-[100px] pointer-events-none" />
        
        {/* Left Sidebar (Widget Toolbox) */}
        <div className="w-64 border-r border-zinc-200/50 dark:border-white/10 p-4 bg-white/20 dark:bg-zinc-900/10 flex flex-col gap-4 overflow-y-auto shrink-0 z-20">
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
                    <p className="text-[10px] text-zinc-450 dark:text-zinc-550 leading-normal mt-0.5">{item.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Canvas */}
        <div 
          ref={containerRef} 
          className="flex-1 p-6 overflow-y-auto bg-zinc-50/10 dark:bg-white/[0.005] relative custom-scrollbar select-none z-10"
          onClick={() => setSelectedWidgetId(null)}
        >
          {widgets.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center border border-dashed border-zinc-300 dark:border-white/10 rounded-3xl text-center space-y-3 p-6 bg-white/20 dark:bg-white/[0.005] mt-10">
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
                  margin: [24, 24]
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
                        "p-4 bg-white/40 dark:bg-white/[0.01] border rounded-2xl flex flex-col justify-between transition-all relative group shadow-sm overflow-hidden",
                        isSelected ? "border-indigo-500 bg-indigo-500/[0.01] ring-2 ring-indigo-500/10" : "border-zinc-200/50 dark:border-white/5 hover:border-zinc-300/80 dark:hover:border-white/10"
                      )}
                    >
                      {/* Widget Actions Top Panel */}
                      <div className="flex items-center justify-between mb-3 shrink-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="drag-handle text-zinc-400 hover:text-zinc-600 dark:text-zinc-550 dark:hover:text-zinc-400 cursor-grab active:cursor-grabbing p-0.5 rounded flex items-center shrink-0">
                            <GripVertical size={12} />
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-wider bg-zinc-150 dark:bg-white/5 px-2 py-0.5 rounded text-zinc-500 dark:text-zinc-400">
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
                        {widget.type === 'report' ? (
                          widget.properties?.reportId ? (
                            <div className="w-full h-full pointer-events-none scale-[0.95] origin-top bg-zinc-50/50 dark:bg-white/[0.01] rounded-2xl p-4 border border-zinc-200/30 dark:border-white/5 overflow-hidden">
                              <ReportWidgetEmbed widget={widget} tenant={tenant} session={session} />
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center border border-dashed border-zinc-200/50 dark:border-white/5 rounded-xl bg-white/30 dark:bg-white/[0.01] text-[10px] text-zinc-450 dark:text-zinc-500 font-medium">
                              Configure Embedded BI Report...
                            </div>
                          )
                        ) : (
                          <div className="h-full flex items-center justify-center border border-dashed border-zinc-200/50 dark:border-white/5 rounded-xl bg-white/30 dark:bg-white/[0.01] text-[10px] text-zinc-450 dark:text-zinc-500 font-medium">
                            Widget Preview ({widget.w}x{widget.h})
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </ReactGridLayout>
            )
          )}
        </div>

        {/* Right Sidebar (Properties Panel) */}
        <div className="w-80 border-l border-zinc-200/50 dark:border-white/10 p-5 bg-white/20 dark:bg-zinc-900/10 flex flex-col gap-4 overflow-y-auto shrink-0 z-20">
          {selectedWidget ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-2">
                <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-1.5">
                  <Settings size={14} className="text-indigo-500" />
                  Widget Settings
                </h3>
                <button 
                  onClick={() => setSelectedWidgetId(null)}
                  className="text-[10px] font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-white uppercase"
                >
                  Deselect
                </button>
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
    </div>
  );
};

const ReportDropdown = ({ selectedWidget, setWidgets, tenant, session }: any) => {
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
      value={selectedWidget.properties?.reportId || ''}
      onChange={(e) => {
        const rId = e.target.value;
        setWidgets((prev: any[]) => prev.map(w => {
          if (w.id === selectedWidget.id) {
            return { ...w, properties: { ...w.properties, reportId: rId } };
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
        <option value="" className="bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">No published reports found</option>
      ) : (
        <>
          <option value="" className="bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">Select report...</option>
          {reports.map((r: any) => (
            <option key={r.id} value={r.id} className="bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
              {r.name}
            </option>
          ))}
        </>
      )}
    </select>
  );
};


