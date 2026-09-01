import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Layout, 
  Plus, 
  ArrowRight, 
  Check, 
  Loader2, 
  Sparkles,
  ExternalLink,
  SlidersHorizontal,
  BarChart3
} from 'lucide-react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL, DATA_API_URL } from '../../config';
import { slugify, cn } from '../../lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Report } from '../../pages/Settings/PlatformModules/ReportManagementSettings';

export interface EmbedReportInPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report | null;
  onReportUpdated?: (updatedReport: Report) => void;
}

export const EmbedReportInPageModal: React.FC<EmbedReportInPageModalProps> = ({
  isOpen,
  onClose,
  report,
  onReportUpdated
}) => {
  const navigate = useNavigate();
  const { tenant, modules, refreshModules } = usePlatform();
  const { session } = useAuth();

  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [newPageName, setNewPageName] = useState<string>('');
  const [newPageIcon, setNewPageIcon] = useState<string>('LayoutDashboard');
  const [widgetTitle, setWidgetTitle] = useState<string>('');
  const [widgetWidth, setWidgetWidth] = useState<number>(12);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successPage, setSuccessPage] = useState<{ id: string; name: string } | null>(null);

  // Filter workspace pages
  const workspacePages = useMemo(() => {
    return modules.filter((m: any) => m.type === 'PAGE');
  }, [modules]);

  // Reset form when report changes / modal opens
  React.useEffect(() => {
    if (isOpen && report) {
      setWidgetTitle(report.name || 'Report Dashboard');
      setWidgetWidth(12);
      setSuccessPage(null);
      if (workspacePages.length > 0) {
        setSelectedPageId(workspacePages[0].id);
        setMode('existing');
      } else {
        setMode('new');
        setNewPageName(`${report.name} Dashboard`);
      }
    }
  }, [isOpen, report, workspacePages]);

  if (!report) return null;

  const handleEmbed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !report) return;

    const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
    setIsSubmitting(true);

    try {
      // 1. If report is draft, publish it so it renders properly in workspace view
      if (report.status === 'Draft') {
        const pubRes = await fetch(`${API_BASE_URL}/api/reports/${report.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant.id
          },
          body: JSON.stringify({
            status: 'Published'
          })
        });
        if (pubRes.ok) {
          const updated = await pubRes.json();
          onReportUpdated?.(updated);
        }
      }

      const newWidget = {
        id: `report-${Date.now()}`,
        type: 'report',
        title: widgetTitle.trim() || report.name,
        w: widgetWidth,
        h: 8,
        x: 0,
        y: 0,
        properties: {
          reportId: report.id
        }
      };

      let targetPageId = selectedPageId;
      let targetPageName = '';

      if (mode === 'new') {
        const trimmedName = newPageName.trim();
        if (!trimmedName) {
          toast.error('Please enter a name for the new workspace page.');
          setIsSubmitting(false);
          return;
        }

        const newSlug = slugify(trimmedName);
        const isDuplicate = workspacePages.some((p: any) => slugify(p.name) === newSlug);
        if (isDuplicate) {
          toast.error(`A workspace page with name "${trimmedName}" already exists. Please pick a unique name.`);
          setIsSubmitting(false);
          return;
        }

        // Create new page with report widget
        const createRes = await fetch(`${DATA_API_URL}/modules`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant.id
          },
          body: JSON.stringify({
            name: trimmedName,
            category: 'Workspace Pages',
            iconName: newPageIcon,
            type: 'PAGE',
            enabled: true,
            status: 'ACTIVE',
            config: {
              widgets: [newWidget]
            }
          })
        });

        if (!createRes.ok) {
          throw new Error('Failed to create new workspace page');
        }

        const createdData = await createRes.json();
        targetPageId = createdData.id || createdData.module?.id;
        targetPageName = trimmedName;
      } else {
        // Embed into existing page
        const existingPage = workspacePages.find((p: any) => p.id === selectedPageId);
        if (!existingPage) {
          toast.error('Please select an existing workspace page.');
          setIsSubmitting(false);
          return;
        }

        targetPageName = existingPage.name;
        const currentWidgets = existingPage.config?.widgets || existingPage.widgets || [];
        
        // Calculate next y offset
        const maxY = currentWidgets.reduce((max: number, w: any) => {
          const wY = w.y !== undefined ? w.y : 0;
          const wH = w.h !== undefined ? w.h : 6;
          return Math.max(max, wY + wH);
        }, 0);

        newWidget.y = maxY;
        const updatedWidgets = [...currentWidgets, newWidget];

        const updateRes = await fetch(`${DATA_API_URL}/modules/${existingPage.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant.id
          },
          body: JSON.stringify({
            name: existingPage.name,
            category: 'Workspace Pages',
            iconName: existingPage.iconName || existingPage.icon || 'Layers',
            type: 'PAGE',
            enabled: true,
            status: 'ACTIVE',
            config: {
              ...existingPage.config,
              widgets: updatedWidgets
            }
          })
        });

        if (!updateRes.ok) {
          throw new Error('Failed to update workspace page');
        }
      }

      await refreshModules();
      setSuccessPage({ id: targetPageId, name: targetPageName });
      toast.success(`Successfully embedded "${report.name}" into "${targetPageName}"!`);
    } catch (err: any) {
      console.error('Embed report error:', err);
      toast.error(err.message || 'Failed to embed report in page');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalNode = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div key="embed-report-modal-container" className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950/70 backdrop-blur-xl"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[28px] shadow-2xl overflow-hidden z-10 flex flex-col my-auto max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-3 relative z-10 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-zinc-900 dark:text-white tracking-tight">
                    Embed Report in Workspace Page
                  </h2>
                  <p className="text-xs text-zinc-500 font-medium">
                    Display &quot;{report.name}&quot; as an interactive live dashboard widget.
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-5 flex-1 overflow-y-auto custom-scrollbar relative z-10">
              {successPage ? (
                <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
                    <Check size={28} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white">Report Successfully Embedded!</h3>
                    <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                      &quot;{report.name}&quot; is now active on <span className="font-semibold text-zinc-800 dark:text-zinc-200">&quot;{successPage.name}&quot;</span>.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-3">
                    <button
                      onClick={() => {
                        onClose();
                        navigate(`/workspace/pages/${slugify(successPage.name)}`);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                    >
                      <ExternalLink size={14} />
                      <span>View Workspace Page</span>
                    </button>

                    <button
                      onClick={() => {
                        onClose();
                        navigate(`/workspace/settings/builder/page/${successPage.id}`);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      <SlidersHorizontal size={14} />
                      <span>Customize in Builder</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleEmbed} className="space-y-4">
                  {/* Mode Selector */}
                  <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setMode('existing')}
                      disabled={workspacePages.length === 0}
                      className={cn(
                        "flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2",
                        mode === 'existing'
                          ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white disabled:opacity-40"
                      )}
                    >
                      <Layout size={14} />
                      <span>Existing Page ({workspacePages.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode('new')}
                      className={cn(
                        "flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2",
                        mode === 'new'
                          ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                      )}
                    >
                      <Plus size={14} />
                      <span>Create New Page</span>
                    </button>
                  </div>

                  {/* Target Page Selection */}
                  {mode === 'existing' ? (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                        Select Workspace Page
                      </label>
                      <select
                        value={selectedPageId}
                        onChange={(e) => setSelectedPageId(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        {workspacePages.map((page: any) => (
                          <option key={page.id} value={page.id}>
                            {page.name} ({page.config?.widgets?.length || page.widgets?.length || 0} widgets)
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                        New Page Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Executive Analytics"
                        value={newPageName}
                        onChange={(e) => setNewPageName(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
                        required
                      />
                    </div>
                  )}

                  {/* Widget Title & Dimensions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                        Widget Display Title
                      </label>
                      <input
                        type="text"
                        value={widgetTitle}
                        onChange={(e) => setWidgetTitle(e.target.value)}
                        placeholder="Widget title..."
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                        Widget Width
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setWidgetWidth(12)}
                          className={cn(
                            "py-2 px-2 text-center rounded-xl border text-[11px] font-bold transition-all",
                            widgetWidth === 12
                              ? "border-indigo-500 bg-indigo-50/20 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                              : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          )}
                        >
                          Full (12 cols)
                        </button>
                        <button
                          type="button"
                          onClick={() => setWidgetWidth(6)}
                          className={cn(
                            "py-2 px-2 text-center rounded-xl border text-[11px] font-bold transition-all",
                            widgetWidth === 6
                              ? "border-indigo-500 bg-indigo-50/20 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                              : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          )}
                        >
                          Half (6 cols)
                        </button>
                      </div>
                    </div>
                  </div>

                  {report.status === 'Draft' && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                      <Sparkles size={16} className="shrink-0 mt-0.5" />
                      <span>This report is in <strong>Draft</strong>. Embedding it will automatically mark it as <strong>Published</strong> so it displays live data on the workspace page.</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || (mode === 'existing' && !selectedPageId)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Embedding...</span>
                        </>
                      ) : (
                        <>
                          <Layout size={14} />
                          <span>Embed on Page</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : null;
};
