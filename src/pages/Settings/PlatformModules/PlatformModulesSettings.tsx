import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { ArrowLeft, Trash2, Plus, Loader2 } from 'lucide-react';
import { PageHeader } from '../../../components/UI/PageHeader';
import { Button } from '../../../components/UI/Primitives';
import { motion, AnimatePresence } from 'motion/react';
import { PLATFORM_MODULES } from '../../../config/platformModules';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

export const PlatformModulesSettings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tenant, modules, refreshModules } = usePlatform();
  const { session } = useAuth();
  
  const [tab, setTab] = useState<'SYSTEM' | 'CUSTOM'>('SYSTEM');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isIndex = location.pathname === '/workspace/settings/platform-modules' || location.pathname === '/workspace/settings/platform-modules/';

  const activeModule = !isIndex ? PLATFORM_MODULES.find(m => location.pathname.includes(m.slug)) : null;

  // Filter out any custom database modules that represent system-level services (like Work Distribution or People & Organisations)
  const displayCustomModules = modules.filter((mod: any) => {
    const isPlatform = PLATFORM_MODULES.some(pm => pm.id === mod.id || pm.id === mod.templateId || pm.name === mod.name || pm.slug === mod.templateId);
    if (isPlatform) return false;
    if (mod.isGlobal || mod.isIntakeTriage || mod.config?.isIntakeTriage) return false;
    return true;
  });

  const handleDeleteCustom = async (e: React.MouseEvent, mod: any) => {
    e.stopPropagation();
    if (!tenant?.id || mod.isTemplate) return;
    
    if (!window.confirm(`Are you sure you want to delete ${mod.name}? This will permanently delete the module and all its records.`)) {
      return;
    }

    setDeletingId(mod.id);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const response = await fetch(`http://localhost:3001/api/data/modules/${mod.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete module');
      }

      await refreshModules();
      toast.success(`${mod.name} deleted successfully`);
    } catch (error: any) {
      toast.error(error.message || `Failed to delete ${mod.name}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 relative">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] -ml-48 -mb-48 pointer-events-none" />

      {isIndex ? (
        <>
          <PageHeader 
            title="Modules"
            description="Manage core platform features, prebuilt system directories, and tenant-specific custom data structures in one place."
          />

          {/* Clean Pill Tab Switcher */}
          <div className="flex bg-zinc-100/30 dark:bg-white/[0.02] border border-zinc-250/20 dark:border-white/5 rounded-2xl p-1 mb-8 w-fit shrink-0 relative z-10">
            <button
              onClick={() => setTab('SYSTEM')}
              className={cn(
                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                tab === 'SYSTEM' 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              System Modules
            </button>
            <button
              onClick={() => setTab('CUSTOM')}
              className={cn(
                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                tab === 'CUSTOM'
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              Custom Modules
            </button>
          </div>

          <div className="flex-1 relative z-10">
            <AnimatePresence mode="wait">
              {tab === 'SYSTEM' ? (
                <motion.div
                  key="system"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {PLATFORM_MODULES.map((mod, i) => (
                    <motion.div
                      key={mod.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => navigate(`/workspace/settings/platform-modules/${mod.slug}`)}
                      className="group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl transition-all shadow-xl shadow-black/5 dark:shadow-none hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-indigo-500/10 cursor-pointer flex flex-col h-full relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                          <div className="flex items-start justify-between mb-4">
                            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                              {React.createElement((Icons as any)[mod.iconName] || Icons.HelpCircle, { size: 24 })}
                            </div>
                            {mod.isCore && (
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold uppercase tracking-wider">
                                System
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {mod.name}
                          </h3>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            {mod.description}
                          </p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center text-sm font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0 transform duration-300">
                          Configure Settings <ArrowLeft size={16} className="ml-2 rotate-180" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="custom"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {displayCustomModules.map((mod: any, i: number) => {
                    const IconComponent = (Icons as any)[mod.iconName] || (Icons as any)[mod.icon] || Icons.Layers;
                    return (
                      <motion.div
                        key={mod.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => navigate(`/workspace/settings/builder/${mod.id}`)}
                        className="group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl transition-all shadow-xl shadow-black/5 dark:shadow-none hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-indigo-500/10 cursor-pointer flex flex-col h-full relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <button
                          onClick={(e) => handleDeleteCustom(e, mod)}
                          disabled={deletingId === mod.id}
                          className="absolute top-4 right-4 p-2 rounded-xl bg-zinc-100/80 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 dark:bg-zinc-800/80 dark:hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100 z-20"
                        >
                          {deletingId === mod.id ? <Loader2 size={14} className="animate-spin text-red-500" /> : <Trash2 size={14} />}
                        </button>

                        <div className="relative z-10 flex flex-col h-full justify-between">
                          <div>
                            <div className="flex items-start justify-between mb-4">
                              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                                <IconComponent size={24} />
                              </div>
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold uppercase tracking-wider">
                                Custom
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {mod.name}
                            </h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                              {mod.description || "No description provided."}
                            </p>
                          </div>
                          <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center text-sm font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0 transform duration-300">
                            Configure Module <ArrowLeft size={16} className="ml-2 rotate-180" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Create Custom dashed button */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: displayCustomModules.length * 0.03 }}
                    onClick={() => navigate('/workspace/settings/builder')}
                    className="group p-6 border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-indigo-500/50 rounded-3xl cursor-pointer flex flex-col items-center justify-center h-full min-h-[200px] transition-all text-center hover:bg-indigo-500/[0.01]"
                  >
                    <Plus size={32} className="text-zinc-400 group-hover:text-indigo-500 group-hover:scale-110 transition-all mb-3" />
                    <span className="text-sm font-bold text-zinc-500 group-hover:text-indigo-500 transition-colors">Create Custom Module</span>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      ) : (
        <>
          <PageHeader 
            title={activeModule?.name || 'Module Settings'}
            description={activeModule?.description || 'Configure module settings.'}
            actions={
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => navigate('/workspace/settings/platform-modules')}
                className="gap-2 font-bold"
              >
                <ArrowLeft size={16} /> Back to Modules
              </Button>
            }
          />
          <div className="flex-1">
            <Outlet />
          </div>
        </>
      )}
    </div>
  );
};
