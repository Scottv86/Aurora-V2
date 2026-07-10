import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Trash2, Plus, Loader2, Layout, ChevronRight } from 'lucide-react';
import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Primitives';
import { motion, AnimatePresence } from 'motion/react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

const COMMON_ICONS = [
  'LayoutDashboard', 'ClipboardList', 'Layers', 'Database', 'Globe', 'Cpu', 'ShieldCheck', 'Inbox', 'BookOpen', 'BarChart'
];

export const PagesManagementPage = () => {
  const navigate = useNavigate();
  const { tenant, modules, refreshModules } = usePlatform();
  const { session } = useAuth();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pageToDelete, setPageToDelete] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPageIcon, setNewPageIcon] = useState('Layers');
  const [selectedTemplate, setSelectedTemplate] = useState<'blank' | 'dashboard' | 'my-work'>('blank');
  const [creating, setCreating] = useState(false);

  // Filter modules to only show workspace pages (type === 'PAGE')
  const pages = modules.filter((mod: any) => mod.type === 'PAGE');

  const confirmDeletePage = async () => {
    if (!pageToDelete || !tenant?.id) return;
    const targetPage = pageToDelete;
    setPageToDelete(null);
    setDeletingId(targetPage.id);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const response = await fetch(`http://localhost:3001/api/data/modules/${targetPage.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete page');
      }

      await refreshModules();
      toast.success(`"${targetPage.name}" page deleted successfully`);
    } catch (error: any) {
      toast.error(error.message || `Failed to delete ${targetPage.name}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageName.trim()) {
      toast.error('Please enter a page name.');
      return;
    }
    if (!tenant?.id) return;

    setCreating(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;

      // Seed widgets depending on template
      let widgets: any[] = [];
      if (selectedTemplate === 'dashboard') {
        widgets = [
          { id: `stats-grid-${Date.now()}`, type: 'stats-grid', title: 'Stats Overview', w: 12 },
          { id: `active-workflows-${Date.now()}`, type: 'active-workflows', title: 'Active Workflows', w: 12 }
        ];
      } else if (selectedTemplate === 'my-work') {
        widgets = [
          { id: `work-queue-${Date.now()}`, type: 'work-queue', title: 'My Work Inbox', w: 12 }
        ];
      }

      const response = await fetch(`http://localhost:3001/api/data/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({
          name: newPageName,
          category: 'Workspace Pages',
          iconName: newPageIcon,
          type: 'PAGE',
          enabled: true,
          status: 'ACTIVE',
          widgets
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create workspace page');
      }

      const createdPage = await response.json();
      await refreshModules();
      toast.success(`Page "${newPageName}" created successfully!`);
      setShowCreateModal(false);
      setNewPageName('');
      
      // Navigate to the visual builder
      navigate(`/workspace/settings/builder/page/${createdPage.id || createdPage.module?.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create page');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] -ml-48 -mb-48 pointer-events-none" />

      <PageHeader 
        title="Workspace Pages"
        description="Design and manage responsive workspace dashboards, personal queues, or custom workflow tracking pages."
        actions={
          <Button onClick={() => setShowCreateModal(true)} className="gap-2 shadow-lg shadow-indigo-500/10">
            <Plus size={16} />
            Create Workspace Page
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {pages.map((page: any, i: number) => {
          const IconComponent = (Icons as any)[page.iconName] || (Icons as any)[page.icon] || Layout;
          const widgetsCount = page.config?.widgets?.length || 0;

          return (
            <motion.div
              key={page.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => navigate(`/workspace/settings/builder/page/${page.id}`)}
              className="group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl transition-all shadow-xl shadow-black/5 dark:shadow-none hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-indigo-500/10 cursor-pointer flex flex-col h-full relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              {/* Delete page */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPageToDelete(page);
                }}
                disabled={deletingId === page.id}
                className="absolute top-4 right-4 p-2 rounded-xl bg-zinc-100/80 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 dark:bg-zinc-800/80 dark:hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100 z-20"
              >
                {deletingId === page.id ? <Loader2 size={14} className="animate-spin text-red-500" /> : <Trash2 size={14} />}
              </button>

              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                      <IconComponent size={24} />
                    </div>
                    <span className="text-[9px] px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-500 font-extrabold uppercase tracking-wider group-hover:opacity-0 transition-opacity duration-300">
                      {widgetsCount} {widgetsCount === 1 ? 'Widget' : 'Widgets'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {page.name}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Custom workspace page. Accessible at <code className="text-xs text-indigo-500 dark:text-indigo-400">/workspace/pages/{page.id}</code>.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0 transform duration-300">
                  Open Page Builder <ChevronRight size={16} className="ml-1" />
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Dash creator card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: pages.length * 0.03 }}
          onClick={() => setShowCreateModal(true)}
          className="group p-6 border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-indigo-500/50 rounded-3xl cursor-pointer flex flex-col items-center justify-center h-full min-h-[220px] transition-all text-center hover:bg-indigo-500/[0.01]"
        >
          <Plus size={32} className="text-zinc-400 group-hover:text-indigo-500 group-hover:scale-110 transition-all mb-3" />
          <span className="text-sm font-bold text-zinc-500 group-hover:text-indigo-500 transition-colors">Create Workspace Page</span>
        </motion.div>
      </div>

      {/* Creation Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Layout className="text-indigo-500" />
                  New Workspace Page
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                >
                  <Icons.X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreatePage} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Page Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Executive Dashboard"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                    value={newPageName}
                    onChange={(e) => setNewPageName(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Select Icon</label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_ICONS.map((iconName) => {
                      const IconComponent = (Icons as any)[iconName] || Icons.HelpCircle;
                      return (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setNewPageIcon(iconName)}
                          className={cn(
                            "p-2.5 rounded-xl border transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800",
                            newPageIcon === iconName 
                              ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 scale-105" 
                              : "border-zinc-200 dark:border-zinc-700 text-zinc-500"
                          )}
                        >
                          <IconComponent size={18} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Choose Template</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedTemplate('blank')}
                      className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all space-y-2",
                        selectedTemplate === 'blank'
                          ? "border-indigo-500 bg-indigo-500/[0.02] text-indigo-600 dark:text-indigo-400"
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700"
                      )}
                    >
                      <Layout size={20} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Blank Page</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedTemplate('dashboard')}
                      className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all space-y-2",
                        selectedTemplate === 'dashboard'
                          ? "border-indigo-500 bg-indigo-500/[0.02] text-indigo-600 dark:text-indigo-400"
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700"
                      )}
                    >
                      <Icons.LayoutDashboard size={20} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Dashboard</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedTemplate('my-work')}
                      className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all space-y-2",
                        selectedTemplate === 'my-work'
                          ? "border-indigo-500 bg-indigo-500/[0.02] text-indigo-600 dark:text-indigo-400"
                          : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700"
                      )}
                    >
                      <Icons.ClipboardList size={20} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">My Work</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={creating}>
                    Create & Customize
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {pageToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-500">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                    Delete Page
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-sm text-zinc-650 dark:text-zinc-350 leading-relaxed">
                Are you sure you want to delete <strong className="text-zinc-900 dark:text-white font-extrabold">&quot;{pageToDelete.name}&quot;</strong>? This will permanently delete the page configuration.
              </p>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-850">
                <Button type="button" variant="secondary" onClick={() => setPageToDelete(null)}>
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={confirmDeletePage}
                  className="bg-rose-600 hover:bg-rose-700 text-white border-transparent shadow-lg shadow-rose-500/10 font-bold"
                >
                  Delete Page
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
