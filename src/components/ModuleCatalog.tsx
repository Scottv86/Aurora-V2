import * as LucideIcons from 'lucide-react';
import { 
  Search,
  Plus,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Trash2,
  Settings2,
  LayoutGrid,
  List as ListIcon
} from 'lucide-react';
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { List } from 'react-window';
import { cn } from '../lib/utils';
import { PageHeader } from './UI/PageHeader';
import { useAuth } from '../hooks/useAuth';
import { usePlatform } from '../hooks/usePlatform';
import { toast } from 'sonner';

import { useNavigate, useSearchParams } from 'react-router-dom';
import { MODULES } from '../constants/modules';
import { BLUEPRINTS } from '../constants/blueprints';
import { DATA_API_URL } from '../config';
import { DeleteModuleModal } from './DeleteModuleModal';
import { ModuleType, Module } from '../types/platform';

// --- CONSTANTS REMOVED ---


// Row renderer for the virtualized list view
interface RowProps {
  index?: number;
  style?: React.CSSProperties;
  ariaAttributes?: any;
  filteredModules: Module[];
  navigate: (path: string) => void;
  handleEnable: (mod: Module) => void;
  enabling: string | null;
}

const Row = ({ 
  index, 
  style, 
  ariaAttributes, 
  filteredModules, 
  navigate, 
  handleEnable, 
  enabling
}: RowProps) => {
  const mod = filteredModules[index];
  if (!mod) return null;

  return (
    <div style={style} className="px-6 py-1" {...ariaAttributes}>
      <div className="flex items-center gap-6 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-indigo-500/30 transition-all group relative overflow-hidden h-full">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-zinc-900 dark:text-white group-hover:text-indigo-600 transition-colors">
          <mod.icon size={20} />
        </div>
        
        <div className="flex-1 flex items-center justify-between min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-black text-zinc-900 dark:text-white truncate tracking-tight">{mod.name}</h3>
              {mod.isGlobal && <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-[8px] font-black text-indigo-600 uppercase tracking-widest border border-indigo-500/20">Global</span>}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-widest mt-0.5">{mod.category}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:block max-w-md truncate">
              <p className="text-xs text-zinc-400 dark:text-zinc-500">{mod.description}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigate(`/workspace/settings/builder/${mod.id}`)}
                className="p-2 rounded-xl text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all"
              >
                <Settings2 size={16} />
              </button>
              {mod.enabled ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-xl border border-emerald-500/20">
                  <CheckCircle2 size={12} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Active</span>
                </div>
              ) : (
                <button 
                  onClick={() => handleEnable(mod)}
                  disabled={enabling === mod.id}
                  className="flex items-center gap-2 px-5 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 dark:hover:bg-white transition-all shadow-lg"
                >
                  <span>{enabling === mod.id ? 'Installing...' : (mod.isTemplate ? 'Install' : 'Enable')}</span>
                  {enabling === mod.id ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ModuleCatalog = () => {
  const { session } = useAuth();
  const { tenant, modules, refreshModules } = usePlatform();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'INSTALLED' | 'LIBRARY'>(
    (searchParams.get('tab')?.toUpperCase() as any) === 'LIBRARY' ? 'LIBRARY' : 'INSTALLED'
  );
  const [selectedCategories] = useState<string[]>(['All']);
  const [selectedType] = useState<ModuleType | 'All'>('All');
  const [selectedStatus] = useState<'All' | 'Installed' | 'Available'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>(() => {
    return (localStorage.getItem('module_catalog_view_mode') as 'GRID' | 'LIST') || 'GRID';
  });
  const [libraryType, setLibraryType] = useState<'MODULES' | 'BLUEPRINTS'>('MODULES');
  const [previewBlueprint, setPreviewBlueprint] = useState<any>(null);
  const [enabling, setEnabling] = useState<string | null>(null);
  const [moduleToDelete, setModuleToDelete] = useState<any>(null);
  const [previewModule, setPreviewModule] = useState<any>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem('module_catalog_view_mode', viewMode);
  }, [viewMode]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleEnable = async (mod: any, extraDeps: string[] = []) => {
    if (!tenant?.id) return;
    setEnabling(mod.id);
    
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      
      if (mod.id && !mod.isTemplate && extraDeps.length === 0) {
        // Module already exists as an instance, just re-enable it
        const response = await fetch(`${DATA_API_URL}/modules/${mod.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant.id
          },
          body: JSON.stringify({
            ...mod,
            enabled: true,
            status: 'ACTIVE'
          })
        });
        if (!response.ok) throw new Error('Failed to enable module');
      } else {
        // Batch install missing dependencies + primary module
        const toInstall = [mod];
        if (extraDeps.length > 0) {
          extraDeps.forEach(depId => {
            const depMod = MODULES.find(m => m.id === depId);
            if (depMod) toInstall.unshift(depMod); // Install deps first
          });
        }

        for (const targetMod of toInstall) {
          const { icon, isEnabled, ...serializableMod } = targetMod;
          
          const response = await fetch(`${DATA_API_URL}/modules`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'x-tenant-id': tenant.id
            },
            body: JSON.stringify({
              ...serializableMod,
              id: undefined,
              templateId: targetMod.id,
              isTemplate: false,
              isGlobal: targetMod.id === 'people_org',
              category: targetMod.category || 'Custom',
              enabled: true,
              status: 'ACTIVE'
            })
          });

          if (!response.ok) {
            const errData = await response.json();
            // If it already exists (e.g. people_org), skip and continue
            if (response.status !== 409 && !errData.error?.includes('unique constraint')) {
              throw new Error(`Failed to provision ${targetMod.name}`);
            }
          }
        }
      }

      await refreshModules();
      toast.success(extraDeps.length > 0 ? `Module and ${extraDeps.length} dependencies provisioned!` : `${mod.name} enabled!`);
    } catch (error: any) {
      toast.error(error.message || `Failed to enable ${mod.name}`);
    } finally {
      setEnabling(null);
    }
  };

  const handleDeleteCustom = async (mod: any) => {
    if (!tenant?.id || mod.isTemplate) return;
    
    setEnabling(mod.id);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const response = await fetch(`http://localhost:3001/api/data/modules/${mod.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        }
      });

      if (!response.ok) throw new Error('Failed to delete module');
      
      await refreshModules();
      toast.success(`${mod.name} module deleted.`);
    } catch (error: any) {
      toast.error(error.message || `Failed to delete ${mod.name}`);
    } finally {
      setEnabling(null);
      setModuleToDelete(null);
    }
  };

  const allModules: any[] = useMemo(() => {
    // 1. Start with the core library (templates)
    const combined = MODULES.map(m => ({
      ...m,
      isTemplate: true,
      enabled: false, // Templates themselves aren't 'active' instances
      isGlobal: m.id === 'people_org' // Core modules are global
    }));

    // 2. Add all installed instances from the database
    modules.forEach((cm: any) => {
      const IconComponent = (LucideIcons as any)[cm.iconName] || (LucideIcons as any)[cm.icon] || LucideIcons.Layers;
      
      combined.push({
        ...cm,
        icon: IconComponent,
        isCustom: true, // All tenant-specific modules are deletable/custom
        enabled: cm.status !== 'INACTIVE',
        isTemplate: false // This is an active instance
      });
    });
    
    return combined;
  }, [modules]);

  const handleInstallBlueprint = async (blueprint: any) => {
    if (!tenant?.id) return;
    setEnabling(blueprint.id);
    toast.info(`Installing ${blueprint.name} Blueprint...`);

    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      
      // Install each module in the blueprint
      for (const modConfig of blueprint.config.modules) {
        const template = MODULES.find(m => m.id === modConfig.templateId);
        if (!template) continue;

        await fetch(`${DATA_API_URL}/modules`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant.id
          },
          body: JSON.stringify({
            ...template,
            id: undefined,
            templateId: template.id,
            blueprintId: blueprint.id,
            category: modConfig.category || template.category,
            enabled: true,
            status: 'ACTIVE'
          })
        });
      }

      await refreshModules();
      toast.success(`${blueprint.name} blueprint installed successfully!`);
      setActiveTab('INSTALLED');
    } catch (error: any) {
      toast.error(`Failed to install blueprint: ${error.message}`);
    } finally {
      setEnabling(null);
    }
  };

  const filteredModules = useMemo(() => {
    return allModules.filter((m: Module) => {
      // Tab filtering
      if (activeTab === 'INSTALLED') {
        // Must be an installed instance (not a template)
        if (m.isTemplate) return false;
        // Hide inactive unless toggled on
        if (!m.enabled && !showInactive) return false;
      }
      if (activeTab === 'LIBRARY' && !m.isTemplate) return false;

      const categoryMatch = selectedCategories.includes('All') || (m.category && selectedCategories.includes(m.category));
      const typeMatch = selectedType === 'All' || m.type === selectedType;
      const statusMatch = selectedStatus === 'All' || (selectedStatus === 'Installed' ? m.enabled : !m.enabled);
      const searchMatch = (m.name || '').toLowerCase().includes(debouncedQuery.toLowerCase()) || 
                         (m.description || '').toLowerCase().includes(debouncedQuery.toLowerCase());

      return categoryMatch && typeMatch && statusMatch && searchMatch;
    });
  }, [allModules, selectedCategories, selectedType, selectedStatus, debouncedQuery, activeTab, showInactive]);

  const rowProps = useMemo(() => ({
    filteredModules,
    navigate,
    handleEnable,
    enabling
  }), [filteredModules, navigate, handleEnable, enabling]);

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8 relative">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] -ml-48 -mb-48 pointer-events-none" />

      <div className="relative z-10 space-y-8 flex flex-col flex-1">
      <div className="relative z-10 space-y-6 flex flex-col flex-1 pb-10">
        <PageHeader 
          title={activeTab === 'INSTALLED' ? 'Workspace Modules' : 'Solution Library'}
          description={activeTab === 'INSTALLED' 
            ? `${modules.filter(m => m.enabled).length} ${modules.filter(m => m.enabled).length === 1 ? 'module' : 'modules'} active in your workspace.` 
            : 'Explore pre-configured templates and industry blueprints to accelerate your workflow.'
          }
          actions={
            <button 
              onClick={() => navigate('/workspace/settings/builder')}
              className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-black/5"
            >
              <Plus size={14} />
              <span>Create Custom</span>
            </button>
          }
        />

        {/* Dense Navigation & Toolbar */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-4 p-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-[20px] shadow-sm sticky top-0 z-50">
          <div className="flex items-center gap-1 p-1 bg-zinc-100/50 dark:bg-zinc-950/50 rounded-xl">
            <button
              onClick={() => setActiveTab('INSTALLED')}
              className={cn(
                "px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'INSTALLED' 
                  ? "bg-white dark:bg-zinc-800 text-indigo-600 shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              Installed
            </button>
            <button
              onClick={() => { setActiveTab('LIBRARY'); setLibraryType('MODULES'); }}
              className={cn(
                "px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'LIBRARY' && libraryType === 'MODULES'
                  ? "bg-white dark:bg-zinc-800 text-amber-600 shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              Templates
            </button>
            <button
              onClick={() => { setActiveTab('LIBRARY'); setLibraryType('BLUEPRINTS'); }}
              className={cn(
                "px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'LIBRARY' && libraryType === 'BLUEPRINTS'
                  ? "bg-white dark:bg-zinc-800 text-indigo-600 shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              Blueprints
            </button>
          </div>

          <div className="flex items-center gap-4 flex-1 w-full xl:max-w-md px-4 border-l border-zinc-200 dark:border-zinc-800">
            <Search className="text-zinc-400" size={14} />
            <input 
              type="text" 
              placeholder="Filter solutions..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none p-0 text-xs font-bold focus:outline-none w-full dark:text-white"
            />
          </div>

          <div className="flex items-center gap-3 pr-2 border-l border-zinc-200 dark:border-zinc-800 pl-4">

            {/* Show Inactive Toggle — only on Installed tab */}
            {activeTab === 'INSTALLED' && (
              <button
                onClick={() => setShowInactive(v => !v)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border",
                  showInactive
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent"
                    : "bg-transparent text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:text-zinc-600 dark:hover:text-zinc-300"
                )}
              >
                <LucideIcons.EyeOff size={11} />
                Inactive
              </button>
            )}

            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800" />

            <div className="flex items-center bg-zinc-50 dark:bg-zinc-950 rounded-lg p-1">
               <button 
                onClick={() => setViewMode('GRID')}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  viewMode === 'GRID' ? "bg-white dark:bg-zinc-800 text-indigo-600 shadow-sm border border-zinc-100 dark:border-zinc-700" : "text-zinc-400 hover:text-zinc-600"
                )}
              >
                <LayoutGrid size={14} />
              </button>
              <button 
                onClick={() => setViewMode('LIST')}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  viewMode === 'LIST' ? "bg-white dark:bg-zinc-800 text-indigo-600 shadow-sm border border-zinc-100 dark:border-zinc-700" : "text-zinc-400 hover:text-zinc-600"
                )}
              >
                <ListIcon size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <main className="min-h-screen">
          <AnimatePresence mode="wait">
            {activeTab === 'LIBRARY' && libraryType === 'BLUEPRINTS' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-20">
                {BLUEPRINTS.map(bp => (
                  <motion.div
                    key={bp.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[24px] transition-all hover:shadow-xl hover:border-indigo-500/30 cursor-pointer flex flex-col relative overflow-hidden h-full"
                  >
                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-5">
                        <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white transition-all text-indigo-600 shadow-sm">
                          {(LucideIcons as any)[bp.icon] ? React.createElement((LucideIcons as any)[bp.icon], { size: 20 }) : <LucideIcons.Package size={20} />}
                        </div>
                        <span className="px-2 py-0.5 bg-zinc-50 dark:bg-zinc-800 rounded-full text-[7px] font-black text-zinc-500 uppercase tracking-widest border border-zinc-100 dark:border-zinc-700">
                          {bp.industry}
                        </span>
                      </div>

                      <div className="flex-1 mb-5">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight truncate">{bp.name}</h3>
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-[7px] font-black text-amber-600 uppercase tracking-tighter border border-amber-500/20">Blueprint</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug line-clamp-2">
                          {bp.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                         <div className="flex -space-x-2">
                           {bp.config.modules.slice(0, 3).map((m, i) => {
                             const tm = MODULES.find(mod => mod.id === m.templateId);
                             return (
                               <div key={i} title={tm?.name || m.templateId} className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-zinc-400">
                                 {tm?.icon ? React.createElement(tm.icon, { size: 10 }) : <LucideIcons.Box size={10} />}
                               </div>
                             );
                           })}
                         </div>

                         <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPreviewBlueprint(bp)}
                              className="text-[9px] font-black text-zinc-400 hover:text-indigo-600 uppercase tracking-widest transition-colors mr-1"
                            >
                              Preview
                            </button>
                            <button 
                              onClick={() => handleInstallBlueprint(bp)}
                              disabled={enabling === bp.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-md"
                            >
                              <span>{enabling === bp.id ? 'Deploying...' : 'Deploy'}</span>
                              {enabling === bp.id ? <LucideIcons.Loader2 size={10} className="animate-spin" /> : <LucideIcons.Sparkles size={10} />}
                            </button>
                         </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : filteredModules.length > 0 ? (
              <motion.div 
                key={viewMode}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {viewMode === 'GRID' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-20">
                    {filteredModules.map((mod, i) => (
                      <motion.div
                        key={mod.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.005 }}
                        className={cn(
                          "group p-5 border rounded-[24px] transition-all cursor-pointer flex flex-col relative overflow-hidden h-full",
                          mod.enabled
                            ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:shadow-xl hover:border-indigo-500/30"
                            : "bg-zinc-50/60 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800/50 opacity-60 hover:opacity-80"
                        )}
                      >
                        <div className="relative z-10 flex flex-col h-full">
                          <div className="flex items-start justify-between mb-5">
                            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 group-hover:border-indigo-500/20 group-hover:bg-indigo-500/5 transition-all text-zinc-900 dark:text-white group-hover:text-indigo-600">
                              <mod.icon size={20} />
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button 
                                onClick={() => navigate(`/workspace/settings/builder/${mod.id}`)}
                                className="p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-indigo-600 transition-colors shadow-sm"
                              >
                                <Settings2 size={12} />
                              </button>
                              {mod.isCustom && !mod.isTemplate && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setModuleToDelete(mod); }}
                                  className="p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-rose-600 transition-colors shadow-sm"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex-1 mb-5">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight truncate">{mod.name}</h3>
                              {mod.isGlobal && (
                                <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-[7px] font-black text-indigo-600 uppercase tracking-tighter border border-indigo-500/20">Global</span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug line-clamp-2">
                              {mod.description}
                            </p>
                          </div>

                          <div className="flex items-center justify-between">
                             <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{mod.category}</span>

                             <div className="flex items-center gap-2">
                                {mod.isTemplate && !mod.enabled && (
                                  <button
                                    onClick={() => setPreviewModule(mod)}
                                    className="text-[9px] font-black text-zinc-400 hover:text-indigo-600 uppercase tracking-widest transition-colors mr-1"
                                  >
                                    Preview
                                  </button>
                                )}
                                {mod.enabled ? (
                                   <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg border border-emerald-500/20">
                                     <CheckCircle2 size={10} />
                                     <span className="text-[9px] font-black uppercase tracking-tighter">Active</span>
                                   </div>
                                 ) : activeTab === 'INSTALLED' ? (
                                   // Inactive installed module — show re-enable button
                                   <button
                                     onClick={() => handleEnable(mod)}
                                     disabled={enabling === mod.id}
                                     className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
                                   >
                                     <span>{enabling === mod.id ? 'Enabling...' : 'Re-enable'}</span>
                                     {enabling === mod.id ? <LucideIcons.Loader2 size={10} className="animate-spin" /> : <LucideIcons.RotateCw size={10} />}
                                   </button>
                                 ) : (
                                   <button 
                                     onClick={() => handleEnable(mod)}
                                     disabled={enabling === mod.id}
                                     className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-md"
                                   >
                                     <span>{enabling === mod.id ? 'Installing...' : (mod.isTemplate ? 'Install' : 'Add')}</span>
                                     {enabling === mod.id ? <LucideIcons.Loader2 size={10} className="animate-spin" /> : <ArrowRight size={10} />}
                                   </button>
                                 )}
                             </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-[32px] overflow-hidden">
                    <List
                      style={{ height: 800, width: '100%' }}
                      rowCount={filteredModules.length}
                      rowHeight={80}
                      rowComponent={Row}
                      rowProps={rowProps}
                    />
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="h-96 flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400">
                  <Search size={32} />
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">No matches found for your search.</p>
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {moduleToDelete && tenant?.id && createPortal(
        <DeleteModuleModal 
          isOpen={true}
          module={moduleToDelete}
          tenantId={tenant?.id || ''}
          onClose={() => setModuleToDelete(null)}
          onConfirm={() => handleDeleteCustom(moduleToDelete)}
        />,
        document.body
      )}

      {previewModule && createPortal(
        <TemplatePreviewModal 
          isOpen={true}
          module={previewModule}
          modules={modules}
          onClose={() => setPreviewModule(null)}
          onInstall={(deps: string[]) => {
            handleEnable(previewModule, deps);
            setPreviewModule(null);
          }}
          isInstalling={enabling === previewModule.id}
        />,
        document.body
      )}

      {previewBlueprint && createPortal(
        <BlueprintPreviewModal 
          isOpen={true}
          blueprint={previewBlueprint}
          modules={modules}
          onClose={() => setPreviewBlueprint(null)}
          onInstall={() => {
            handleInstallBlueprint(previewBlueprint);
            setPreviewBlueprint(null);
          }}
          isInstalling={enabling === previewBlueprint.id}
        />,
        document.body
      )}
      </div>
    </div>
  );
};

interface TemplatePreviewModalProps {
  isOpen: boolean;
  module: Module;
  modules: Module[];
  onClose: () => void;
  onInstall: (deps: string[]) => void;
  isInstalling: boolean;
}

const TemplatePreviewModal = ({ isOpen, module, modules, onClose, onInstall, isInstalling }: TemplatePreviewModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400">
              {React.createElement(module.icon || LucideIcons.Layers, { size: 32 })}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{module.name}</h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20 uppercase tracking-wider">
                  Template
                </span>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">{module.category} Module</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors"
          >
            <LucideIcons.X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto space-y-8">
          <section>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
              <LucideIcons.Info size={16} className="text-amber-500" />
              Description
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {module.description}
            </p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <LucideIcons.Layout size={16} className="text-amber-500" />
              Included Blocks ({module.layout?.length || 0})
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {module.layout?.map((field: any) => (
                <div 
                  key={field.id}
                  className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-xl flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-700 flex items-center justify-center text-zinc-400">
                    <LucideIcons.Box size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">{field.label}</p>
                    <p className="text-[10px] text-zinc-500 uppercase font-medium">{field.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {(module.dependencies?.length > 0) && (
            <section>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <LucideIcons.Link2 size={16} className="text-amber-500" />
                Required Dependencies ({module.dependencies.length})
              </h3>
              <div className="space-y-2">
                {module.dependencies.map((depId: string) => {
                  const dep = MODULES.find(m => m.id === depId);
                  const isInstalled = modules.some(m => m.templateId === depId || m.id === depId);
                  return (
                    <div 
                      key={depId}
                      className={cn(
                        "p-4 rounded-2xl border transition-all",
                        isInstalled 
                          ? "bg-emerald-500/5 border-emerald-500/10" 
                          : "bg-amber-500/5 border-amber-500/10"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                            isInstalled ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                          )}>
                            {dep?.icon ? React.createElement(dep.icon, { size: 18 }) : <LucideIcons.Box size={18} />}
                          </div>
                          <div>
                            <p className="text-sm font-black text-zinc-900 dark:text-white">{dep?.name || depId}</p>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                              {isInstalled ? 'Core Link Active' : 'Automatic Provisioning Required'}
                            </p>
                          </div>
                        </div>
                        {isInstalled ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg border border-emerald-500/20">
                            <LucideIcons.CheckCircle2 size={12} />
                            <span className="text-[9px] font-black uppercase tracking-tighter">Connected</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 rounded-lg border border-amber-500/20 animate-pulse">
                            <LucideIcons.Zap size={12} />
                            <span className="text-[9px] font-black uppercase tracking-tighter">Auto-Provision</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="p-6 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100 dark:border-indigo-500/10">
            <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-400 mb-2">Cloning Behavior</h3>
            <p className="text-xs text-indigo-700/70 dark:text-indigo-400/60 leading-relaxed">
              When you install this template, a copy of it will be created as a **Custom Module** in your workspace. 
              You will have full access to edit fields, change layouts, and customize workflows.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const missingDeps = module.dependencies?.filter((depId: string) => 
                !modules.some((m: Module) => m.templateId === depId || m.id === depId)
              ) || [];
              onInstall(missingDeps);
            }}
            disabled={isInstalling}
            className="px-8 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isInstalling ? <LucideIcons.Loader2 size={16} className="animate-spin" /> : <LucideIcons.Download size={16} />}
            <span>Install Template</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

interface BlueprintPreviewModalProps {
  isOpen: boolean;
  blueprint: any;
  modules: Module[];
  onClose: () => void;
  onInstall: () => void;
  isInstalling: boolean;
}

const BlueprintPreviewModal = ({ isOpen, blueprint, modules, onClose, onInstall, isInstalling }: BlueprintPreviewModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
              {(LucideIcons as any)[blueprint.icon] ? React.createElement((LucideIcons as any)[blueprint.icon], { size: 32 }) : <LucideIcons.Package size={32} />}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{blueprint.name}</h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-500/20 uppercase tracking-wider">
                  Industry Blueprint
                </span>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">{blueprint.industry} Ecosystem</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors"
          >
            <LucideIcons.X size={20} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8">
          <section>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
              <LucideIcons.Info size={16} className="text-indigo-600" />
              Manifest Overview
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {blueprint.description}
            </p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <LucideIcons.Layers size={16} className="text-indigo-600" />
              Modules Included ({blueprint.config.modules.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {blueprint.config.modules.map((m: any, i: number) => {
                const tm = MODULES.find(mod => mod.id === m.templateId);
                return (
                  <div 
                    key={i}
                    className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-xl flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-700 flex items-center justify-center text-zinc-400">
                      {tm?.icon ? React.createElement(tm.icon, { size: 14 }) : <LucideIcons.Box size={14} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">{tm?.name || m.templateId}</p>
                      <p className="text-[10px] text-zinc-500 uppercase font-medium">{tm?.category || 'Module'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {(blueprint.dependencies?.length > 0) && (
            <section>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <LucideIcons.Link2 size={16} className="text-indigo-600" />
                Required Dependencies ({blueprint.dependencies.length})
              </h3>
              <div className="space-y-2">
                {blueprint.dependencies.map((depId: string) => {
                  const dep = MODULES.find(m => m.id === depId);
                  const isInstalled = modules.some((m: Module) => m.templateId === depId || m.id === depId);
                  return (
                    <div 
                      key={depId}
                      className={cn(
                        "p-3 rounded-xl border flex items-center justify-between",
                        isInstalled 
                          ? "bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20" 
                          : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-700/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          isInstalled ? "bg-white dark:bg-emerald-500/20 text-emerald-600" : "bg-white dark:bg-zinc-700 text-zinc-400"
                        )}>
                          {dep?.icon ? React.createElement(dep.icon, { size: 14 }) : <LucideIcons.Box size={14} />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-900 dark:text-white">{dep?.name || depId}</p>
                          <p className="text-[10px] text-zinc-500 uppercase font-medium">Core Dependency</p>
                        </div>
                      </div>
                      {isInstalled ? (
                        <div className="flex items-center gap-1 text-emerald-600">
                          <LucideIcons.CheckCircle2 size={12} />
                          <span className="text-[9px] font-black uppercase tracking-tighter">Connected</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-400/10 text-zinc-400 rounded-lg border border-zinc-400/20">
                          <LucideIcons.AlertCircle size={12} />
                          <span className="text-[9px] font-black uppercase tracking-tighter">Auto-Provision</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="p-6 bg-amber-50/50 dark:bg-amber-500/5 rounded-2xl border border-amber-100 dark:border-amber-500/10">
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-400 mb-2">Automated Deployment</h3>
            <p className="text-xs text-amber-700/70 dark:text-amber-400/60 leading-relaxed">
              This blueprint will automatically provision multiple modules and establish the necessary connections between them. 
              Once deployed, you can customize each module individually within the builder.
            </p>
          </section>
        </div>

        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onInstall}
            disabled={isInstalling}
            className="px-8 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isInstalling ? <LucideIcons.Loader2 size={16} className="animate-spin" /> : <LucideIcons.Sparkles size={16} />}
            <span>Deploy Blueprint</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
