import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Trash2, Plus, Loader2, ArrowRight } from 'lucide-react';




import { PageHeader } from '../../../components/UI/PageHeader';
import { Button } from '../../../components/UI/Primitives';
import { motion } from 'motion/react';
import { PLATFORM_MODULES } from '../../../config/platformModules';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from 'sonner';
import { useNewModuleModal } from '../../../context/NewModuleModalContext';
import { cn } from '../../../lib/utils';


export const PlatformModulesSettings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { openNewModuleModal } = useNewModuleModal();
  const { tenant, modules, refreshModules } = usePlatform();
  const { session } = useAuth();
  
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('newModule') === 'true') {
      openNewModuleModal();
    }
  }, [location.search, openNewModuleModal]);

  const isIndex = location.pathname === '/workspace/settings/platform-modules' || location.pathname === '/workspace/settings/platform-modules/';
  const isBuilderActive = location.pathname.includes('report-management') && location.search.includes('mode=builder');

  // Filter out any custom database modules that represent system-level services (like Work Distribution or People & Organisations)
  const displayCustomModules = modules.filter((mod: any) => {
    if (mod.type === 'PAGE') return false;
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
    <div className={cn(
      "flex flex-col w-full relative min-h-0",
      isBuilderActive ? "h-[calc(100vh-4rem)] p-0 overflow-hidden" : "min-h-[calc(100vh-4rem)] bg-zinc-50/50 dark:bg-zinc-950/50"
    )}>
      {isIndex ? (
        <>
          <PageHeader 
            title="Modules"
            description="Build, manage, and extend tenant-specific custom data structures, data models, and schemas."

            actions={
              <Button onClick={() => openNewModuleModal()} className="gap-2 shadow-lg shadow-indigo-500/10">
                <Plus size={16} /> Create Module
              </Button>
            }
          />

          <div className="flex-1 px-6 lg:px-12 pt-8 pb-20 relative z-10">
            <div className="flex-1 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
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
                      className="group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-3xl transition-all shadow-xl shadow-black/5 dark:shadow-none hover:shadow-indigo-500/10 cursor-pointer flex flex-col h-full relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <button
                        onClick={(e) => handleDeleteCustom(e, mod)}
                        disabled={deletingId === mod.id}
                        className="absolute top-4 right-4 p-2 rounded-xl bg-zinc-100/80 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 dark:bg-zinc-800/80 dark:hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100 z-20"
                        title="Delete Module"
                      >
                        {deletingId === mod.id ? <Loader2 size={14} className="animate-spin text-red-500" /> : <Trash2 size={14} />}
                      </button>

                      <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                          <div className="flex items-start justify-between mb-4">
                            <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 group-hover:text-indigo-500 group-hover:border-indigo-500/30 transition-all">
                              <IconComponent size={22} />
                            </div>
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border bg-indigo-500/10 text-indigo-500 border-indigo-500/30">
                              Custom
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                            {mod.name}
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                            {mod.description || "No description provided."}
                          </p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
                          <div className="text-xs text-zinc-500 font-semibold">
                            Module Schema
                          </div>
                          <div className="flex items-center gap-1 text-xs font-bold text-indigo-500 group-hover:translate-x-1 transition-transform">
                            Edit in Builder <ArrowRight size={14} />

                          </div>
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
                  onClick={() => openNewModuleModal()}
                  className="group p-6 border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-indigo-500/50 rounded-3xl cursor-pointer flex flex-col items-center justify-center h-full min-h-[200px] transition-all text-center hover:bg-indigo-500/[0.01]"
                >
                  <Plus size={32} className="text-zinc-400 group-hover:text-indigo-500 group-hover:scale-110 transition-all mb-3" />
                  <span className="text-sm font-bold text-zinc-500 group-hover:text-indigo-500 transition-colors">Create Custom Module</span>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 min-h-0 w-full">
          <Outlet />
        </div>
      )}
    </div>
  );
};
