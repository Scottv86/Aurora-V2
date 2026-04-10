import * as LucideIcons from 'lucide-react';
import { 
  Search,
  Plus,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Trash2,
  XCircle,
  Settings2
} from 'lucide-react';
import { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { usePlatform } from '../hooks/usePlatform';
import { toast } from 'sonner';

import { useNavigate } from 'react-router-dom';
import { MODULES } from '../constants/modules';
import { DATA_API_URL } from '../config';
import { DeleteModuleModal } from './DeleteModuleModal';
import { ModuleType } from '../types/platform';

const CATEGORIES = [
  'All',
  'CRM & People',
  'Intake & Requests',
  'Finance',
  'Operations',
  'HR & People',
  'Risk & Compliance',
  'Custom'
];

const MODULE_TYPES: (ModuleType | 'All')[] = [
  'All',
  'RECORD',
  'WORK_ITEM',
  'REGISTRY',
  'LOG',
  'FINANCIAL'
];

export const ModuleCatalog = () => {
  const { session } = useAuth();
  const { tenant, modules, refreshModules } = usePlatform();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState<ModuleType | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [enabling, setEnabling] = useState<string | null>(null);
  const [moduleToDelete, setModuleToDelete] = useState<any>(null);

  const handleEnable = async (mod: any) => {
    if (!tenant?.id) return;
    setEnabling(mod.id);
    
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const response = await fetch(`${DATA_API_URL}/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({
          ...mod,
          status: 'ACTIVE'
        })
      });

      if (!response.ok) throw new Error('Failed to enable module');
      
      await refreshModules();
      toast.success(`${mod.name} module enabled!`);
    } catch (error: any) {
      toast.error(error.message || `Failed to enable ${mod.name}`);
    } finally {
      setEnabling(null);
    }
  };

  const handleDisable = async (mod: any) => {
    if (!tenant?.id) return;
    setEnabling(mod.id);
    
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      
      // If it's a standard module (not custom), we UNINSTALL it (delete from DB)
      // If it's custom, we just mark it INACTIVE to hide it from the menu
      if (!mod.isCustom) {
        const response = await fetch(`${DATA_API_URL}/modules/${mod.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant.id
          }
        });
        if (!response.ok) throw new Error('Failed to uninstall module');
        toast.success(`${mod.name} module uninstalled.`);
      } else {
        const response = await fetch(`${DATA_API_URL}/modules/${mod.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant.id
          },
          body: JSON.stringify({
            ...mod,
            status: 'INACTIVE'
          })
        });
        if (!response.ok) throw new Error('Failed to disable module');
        toast.success(`${mod.name} module disabled.`);
      }
      
      await refreshModules();
    } catch (error: any) {
      toast.error(error.message || `Failed to disable ${mod.name}`);
    } finally {
      setEnabling(null);
    }
  };

  const handleDeleteCustom = async (mod: any) => {
    if (!tenant?.id || !mod.isCustom) return;
    
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

  // Merge prebuilt MODULES with custom modules
  const allModules: any[] = [...MODULES];
  
  modules.forEach(cm => {
    const idx = allModules.findIndex(m => m.id === cm.id || m.id === cm.templateId);
    const IconComponent = (LucideIcons as any)[cm.iconName] || (LucideIcons as any)[cm.icon] || LucideIcons.Layers;
    
    if (idx >= 0) {
      // Update existing prebuilt module with DB data (e.g. status)
      allModules[idx] = { 
        ...allModules[idx], 
        ...cm, 
        icon: allModules[idx].icon, // Keep prebuilt icon if available
        isEnabled: cm.status === 'ACTIVE' 
      };
    } else {
      // Add new custom module
      allModules.push({
        ...cm,
        icon: IconComponent,
        isCustom: true,
        isEnabled: cm.status !== 'INACTIVE'
      });
    }
  });

  const filteredModules = allModules.filter(m => 
    (selectedCategory === 'All' || m.category === selectedCategory) &&
    (selectedType === 'All' || m.type === selectedType) &&
    ((m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (m.description || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Module Catalog</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Browse and enable prebuilt business capabilities.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/workspace/settings/builder')}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20"
          >
            <Plus size={18} />
            <span>Create Custom Module</span>
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="Search modules..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-600 dark:text-zinc-300 focus:outline-none focus:border-indigo-500 w-full md:w-80 shadow-sm dark:shadow-none"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-4 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all border uppercase tracking-wider",
              selectedCategory === cat 
                ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20" 
                : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mr-2 ml-1">Type</span>
        {MODULE_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={cn(
              "px-4 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all border uppercase tracking-wider",
              selectedType === type 
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-lg shadow-zinc-500/20" 
                : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
            )}
          >
            {type.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredModules.map((mod, i) => (
          <motion.div
            key={mod.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="group p-6 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-zinc-300 dark:hover:border-zinc-600 transition-all flex flex-col shadow-sm dark:shadow-none"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 group-hover:border-zinc-200 dark:group-hover:border-zinc-700 transition-colors text-indigo-600 dark:text-indigo-400">
                <mod.icon size={24} />
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => navigate(`/workspace/settings/builder/${mod.id}`)}
                  className="p-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors shadow-sm dark:shadow-none"
                  title="Edit Module Definition"
                >
                  <Settings2 size={16} />
                </button>
                <button className="p-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors shadow-sm dark:shadow-none">
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{mod.name}</h3>
                {mod.isCustom && (
                  <span className="text-[8px] px-1.5 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-full font-bold uppercase tracking-widest">Custom</span>
                )}
              </div>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{mod.category}</p>
                <div className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <span className={cn(
                  "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border",
                  mod.type === 'WORK_ITEM' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                  mod.type === 'RECORD' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                  mod.type === 'FINANCIAL' ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                  "bg-zinc-500/10 text-zinc-600 border-zinc-500/20"
                )}>
                  {mod.type || 'RECORD'}
                </span>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{mod.description}</p>
            </div>
            <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">v1.2.0</span>
                {mod.isCustom && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setModuleToDelete(mod)}
                      className="p-1 text-zinc-400 dark:text-zinc-600 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                      title="Delete Custom Module"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                )}
              </div>
              {mod.isEnabled ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={14} />
                    <span>Enabled</span>
                  </div>
                  <button 
                    onClick={() => handleDisable(mod)}
                    disabled={enabling === mod.id}
                    className="p-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-500/30 transition-all disabled:opacity-50 shadow-sm dark:shadow-none"
                    title="Disable Module"
                  >
                    {enabling === mod.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <XCircle size={14} />
                    )}
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => handleEnable(mod)}
                  disabled={enabling === mod.id}
                  className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50"
                >
                  {enabling === mod.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <span>Enable</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {filteredModules.length === 0 && (
        <div className="py-20 text-center">
          <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-100 dark:border-zinc-800">
            <Search size={24} className="text-zinc-400 dark:text-zinc-600" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No modules found</h3>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Try adjusting your search or category filters.</p>
        </div>
      )}

      {moduleToDelete && tenant?.id && (
        <DeleteModuleModal 
          isOpen={true}
          module={moduleToDelete}
          tenantId={tenant?.id || ''}
          onClose={() => setModuleToDelete(null)}
          onConfirm={() => handleDeleteCustom(moduleToDelete)}
        />
      )}
    </div>

  );
};
