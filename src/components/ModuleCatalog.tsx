import * as LucideIcons from 'lucide-react';
import { 
  Search,
  Plus,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Trash2,
  XCircle,
  Settings2,
  LayoutGrid,
  List as ListIcon,
  Sparkles,
  Database,
  Users,
  Briefcase,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { List } from 'react-window';
import { cn } from '../lib/utils';
import { PageHeader } from './UI/PageHeader';
import { useAuth } from '../hooks/useAuth';
import { usePlatform } from '../hooks/usePlatform';
import { toast } from 'sonner';

import { useNavigate } from 'react-router-dom';
import { MODULES } from '../constants/modules';
import { DATA_API_URL } from '../config';
import { DeleteModuleModal } from './DeleteModuleModal';
import { ModuleType } from '../types/platform';

const CATEGORIES = [
  { id: 'All', label: 'All Modules', icon: LucideIcons.Layers },
  { id: 'CRM & People & Organisations', label: 'CRM & People', icon: Users },
  { id: 'Intake & Requests', label: 'Intake', icon: LucideIcons.ClipboardList },
  { id: 'Finance', label: 'Finance', icon: CreditCard },
  { id: 'Platform', label: 'Platform', icon: Database },
  { id: 'HR & People & Organisations', label: 'Workforce', icon: Briefcase },
  { id: 'Risk & Compliance', label: 'Risk', icon: ShieldCheck },
  { id: 'Custom', label: 'Custom', icon: LucideIcons.Cpu }
];

const MODULE_TYPES: (ModuleType | 'All')[] = [
  'All',
  'RECORD',
  'WORK_ITEM',
  'REGISTRY',
  'LOG',
  'FINANCIAL'
];


// Row renderer for the virtualized list view
const Row = ({ 
  index, 
  style, 
  ariaAttributes, 
  filteredModules, 
  navigate, 
  handleEnable, 
  handleDisable, 
  enabling,
  setModuleToDelete
}: any) => {
  const mod = filteredModules[index];
  if (!mod) return null;

  return (
    <div style={style} className="px-1" {...ariaAttributes}>
      <div className="flex items-center gap-4 p-4 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-2xl hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all shadow-xl shadow-black/5 dark:shadow-none group relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
          <mod.icon size={20} />
        </div>
        <div className="flex-1 flex items-center justify-between min-w-0">
          <div className="flex items-center gap-6 min-w-0">
            <div className="w-64 min-w-0">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate">{mod.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">v1.2.0</span>
                {mod.isCustom && <span className="text-[8px] px-1.5 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-full font-bold uppercase tracking-widest">Custom</span>}
              </div>
            </div>
            <div className="hidden xl:flex items-center gap-2 w-48 overflow-hidden">
               <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[9px] font-bold uppercase tracking-wider truncate">{mod.category}</span>
            </div>
            <div className="hidden lg:block w-96 truncate">
              <p className="text-[10px] text-zinc-500">{mod.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-6 flex-shrink-0">
            <div className={cn(
              "hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest",
              mod.isEnabled ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" : "bg-zinc-50 text-zinc-400 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-500 dark:border-zinc-800"
            )}>
              {mod.isEnabled ? <CheckCircle2 size={10} /> : <div className="h-1.5 w-1.5 rounded-full bg-zinc-400" />}
              {mod.isEnabled ? 'Enabled' : 'Disabled'}
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => navigate(`/workspace/settings/builder/${mod.id}`)}
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              >
                <Settings2 size={16} />
              </button>
              {mod.isCustom && (
                <button
                  onClick={() => setModuleToDelete(mod)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              )}
              {!mod.isEnabled ? (
                <button 
                  onClick={() => handleEnable(mod)}
                  disabled={enabling === mod.id}
                  className="flex items-center gap-2 h-8 px-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-800 dark:hover:bg-white transition-all disabled:opacity-50"
                >
                  {enabling === mod.id ? <Loader2 size={12} className="animate-spin" /> : <span>Enable</span>}
                </button>
              ) : (
                 <button 
                  onClick={() => handleDisable(mod)}
                  disabled={enabling === mod.id}
                  className="p-2 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                >
                  {enabling === mod.id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
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
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState<ModuleType | 'All'>('All');
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'Installed' | 'Available'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>(() => {
    return (localStorage.getItem('module_catalog_view_mode') as 'GRID' | 'LIST') || 'GRID';
  });
  const [enabling, setEnabling] = useState<string | null>(null);
  const [moduleToDelete, setModuleToDelete] = useState<any>(null);

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

  const handleEnable = async (mod: any) => {
    if (!tenant?.id) return;
    setEnabling(mod.id);
    
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      
      if (mod.templateId) {
        // Module exists in the DB (was previously disabled), just mark ACTIVE
        const response = await fetch(`${DATA_API_URL}/modules/${mod.id}`, {
          method: 'PUT',
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
      } else {
        // Module does not exist in DB yet, create it
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
      }

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
      
      // Soft disable for both standard and custom modules
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

  const allModules: any[] = useMemo(() => {
    const combined = [...MODULES];
    modules.forEach(cm => {
      const idx = combined.findIndex(m => m.id === cm.id || m.id === cm.templateId);
      const IconComponent = (LucideIcons as any)[cm.iconName] || (LucideIcons as any)[cm.icon] || LucideIcons.Layers;
      
      if (idx >= 0) {
        combined[idx] = { 
          ...combined[idx], 
          ...cm, 
          icon: combined[idx].icon, 
          isEnabled: cm.status === 'ACTIVE' 
        };
      } else {
        combined.push({
          ...cm,
          icon: IconComponent,
          isCustom: true,
          isEnabled: cm.status !== 'INACTIVE'
        });
      }
    });
    return combined;
  }, [modules]);

  const filteredModules = useMemo(() => {
    return allModules.filter(m => 
      (selectedCategory === 'All' || m.category === selectedCategory) &&
      (selectedType === 'All' || m.type === selectedType) &&
      (selectedStatus === 'All' || (selectedStatus === 'Installed' ? m.isEnabled : !m.isEnabled)) &&
      ((m.name || '').toLowerCase().includes(debouncedQuery.toLowerCase()) || (m.description || '').toLowerCase().includes(debouncedQuery.toLowerCase()))
    );
  }, [allModules, selectedCategory, selectedType, selectedStatus, debouncedQuery]);

  const rowProps = useMemo(() => ({
    filteredModules,
    navigate,
    handleEnable,
    handleDisable,
    enabling,
    setModuleToDelete
  }), [filteredModules, navigate, handleEnable, handleDisable, enabling]);

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8 relative">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] -ml-48 -mb-48 pointer-events-none" />

      <div className="relative z-10 space-y-8 flex flex-col flex-1">
      <PageHeader 
        title="Module Catalog"
        description="Browse and enable prebuilt business capabilities. Extend your workspace with records, workflows, and custom data models."
      />

      {/* Utility Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search modules..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full md:w-80 rounded-2xl border border-zinc-200 bg-white/80 pl-10 pr-4 text-xs font-bold outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm"
              />
            </div>
            
            <div className="h-6 w-[1px] bg-zinc-200 dark:bg-zinc-800 mx-2 hidden md:block" />

            <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-xl p-1">
              <button 
                onClick={() => setViewMode('GRID')}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  viewMode === 'GRID' ? "bg-white dark:bg-zinc-800 text-indigo-600 shadow-sm" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                )}
              >
                <LayoutGrid size={16} />
              </button>
              <button 
                onClick={() => setViewMode('LIST')}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  viewMode === 'LIST' ? "bg-white dark:bg-zinc-800 text-indigo-600 shadow-sm" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                )}
              >
                <ListIcon size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/workspace/settings/builder')}
              className="flex h-10 items-center gap-2 px-6 bg-indigo-600 text-white rounded-2xl font-bold text-xs hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              <Plus size={16} />
              <span>Create Custom Module</span>
            </button>
          </div>
        </div>

      {/* Two Column Layout */}
      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 py-4 pr-6 hidden lg:block">
          <div className="space-y-8">
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-4 px-3">
                Discovery
              </h3>
              <nav className="space-y-1">
                {['All', 'Installed', 'Available'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status as any)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all",
                      selectedStatus === status 
                        ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold" 
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 font-medium"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {status === 'All' ? <Sparkles size={16} /> : status === 'Installed' ? <CheckCircle2 size={16} /> : <Plus size={16} />}
                      <span className="text-sm">{status}</span>
                    </div>
                  </button>
                ))}
              </nav>
            </div>

            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-4 px-3">
                Categories
              </h3>
              <nav className="space-y-1">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon || LucideIcons.Layers;
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group",
                        isActive 
                          ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold" 
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 font-medium"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={18} className={cn("transition-colors", isActive ? "text-indigo-600" : "text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200")} />
                        <span className="text-sm">{cat.label}</span>
                      </div>
                      {isActive && <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-4 px-3">
                Module Type
              </h3>
              <div className="grid grid-cols-1 gap-1">
                {MODULE_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all",
                      selectedType === type
                        ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                    )}
                  >
                    <div className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      type === 'All' ? "bg-zinc-400" :
                      type === 'RECORD' ? "bg-emerald-500" :
                      type === 'WORK_ITEM' ? "bg-amber-500" :
                      "bg-blue-500"
                    )} />
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 py-4">
          <AnimatePresence mode="wait">
              {filteredModules.length > 0 ? (
                <motion.div 
                  key={viewMode}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-sm font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">
                      {filteredModules.length} {filteredModules.length === 1 ? 'Module' : 'Modules'} available
                    </h2>
                  </div>
                  
                  {viewMode === 'GRID' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                      {filteredModules.map((mod, i) => (
                        <motion.div
                          key={mod.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl transition-all shadow-xl shadow-black/5 dark:shadow-none hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-indigo-500/10 cursor-pointer flex flex-col relative overflow-hidden h-full"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="relative z-10 flex flex-col h-full">
                          <div className="flex items-start justify-between mb-4">
                            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 group-hover:border-zinc-200 dark:group-hover:border-zinc-700 transition-colors text-indigo-600 dark:text-indigo-400">
                              <mod.icon size={24} />
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => navigate(`/workspace/settings/builder/${mod.id}`)}
                                className="p-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                              >
                                <Settings2 size={16} />
                              </button>
                              {mod.isCustom && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setModuleToDelete(mod); }}
                                  className="p-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
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
                              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{mod.category}</p>
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
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">{mod.description}</p>
                          </div>
                          <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">v1.2.0</span>
                            <div className="flex items-center gap-4">
                              {mod.isEnabled ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 size={14} />
                                    <span>Enabled</span>
                                  </div>
                                  <button
                                    onClick={() => handleDisable(mod)}
                                    disabled={enabling === mod.id}
                                    className="p-1.5 ml-1 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all disabled:opacity-50"
                                  >
                                    {enabling === mod.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => handleEnable(mod)}
                                  disabled={enabling === mod.id}
                                  className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white hover:text-indigo-600 transition-colors"
                                >
                                  <span>Enable</span>
                                  <ArrowRight size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full">
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
                <div className="h-96 flex items-center justify-center">
                  <p className="text-zinc-500 dark:text-zinc-400">No modules found matching your search.</p>
                </div>
              )}
            </AnimatePresence>
        </main>
      </div>

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
    </div>
  );
};
