import * as LucideIcons from 'lucide-react';
import { 
  Users, 
  Globe, 
  Layers, 
  Zap, 
  Database,
  Workflow,
  FileText,
  BarChart3,
  Cpu,
  ShieldCheck,
  CreditCard,
  ShoppingCart,
  Briefcase,
  HeartHandshake,
  Search,
  Plus,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Trash2,
  XCircle,
  Settings2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, setDoc, onSnapshot, query, serverTimestamp, getDoc, deleteDoc } from 'firebase/firestore';
import { useFirebase } from '../hooks/useFirebase';
import { toast } from 'sonner';

import { useNavigate } from 'react-router-dom';

import { MODULES } from '../constants/modules';

const CATEGORIES = [
  'All',
  'CRM & People',
  'Intake & Requests',
  'Finance',
  'Operations',
  'HR & People',
  'Risk & Compliance'
];

export const ModuleCatalog = () => {
  const { user } = useFirebase();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [configuredModules, setConfiguredModules] = useState<any[]>([]);
  const [enabling, setEnabling] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [customModules, setCustomModules] = useState<any[]>([]);

  useEffect(() => {
    // Listen for global custom modules
    const globalModulesRef = collection(db, 'modules');
    const unsub = onSnapshot(globalModulesRef, (snapshot) => {
      setCustomModules(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, isCustom: true })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'modules');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchUserTenant = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const tid = userSnap.data().tenantId;
          setTenantId(tid);

          // Listen for enabled modules
          const modulesRef = collection(db, 'tenants', tid, 'modules');
          return onSnapshot(modulesRef, (snapshot) => {
            setConfiguredModules(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, `tenants/${tid}/modules`);
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      }
    };

    let unsubscribe: any;
    fetchUserTenant().then(unsub => unsubscribe = unsub);
    return () => unsubscribe?.();
  }, [user]);

  const handleEnable = async (mod: any) => {
    if (!tenantId) return;
    setEnabling(mod.id);
    
    try {
      // Strip non-serializable properties like 'icon' (React component)
      const { icon, isEnabled, ...serializableMod } = mod;
      
      await setDoc(doc(db, 'tenants', tenantId, 'modules', mod.id), {
        ...serializableMod,
        enabledAt: serverTimestamp(),
        status: 'ACTIVE'
      }, { merge: true });
      toast.success(`${mod.name} module enabled successfully!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tenants/${tenantId}/modules/${mod.id}`);
      toast.error(`Failed to enable ${mod.name}`);
    } finally {
      setEnabling(null);
    }
  };

  const handleDisable = async (mod: any) => {
    if (!tenantId) return;
    setEnabling(mod.id);
    
    try {
      // Always mark as INACTIVE to preserve any custom configurations or overrides
      await setDoc(doc(db, 'tenants', tenantId, 'modules', mod.id), {
        status: 'INACTIVE'
      }, { merge: true });
      toast.success(`${mod.name} module disabled.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tenants/${tenantId}/modules/${mod.id}`);
      toast.error(`Failed to disable ${mod.name}`);
    } finally {
      setEnabling(null);
    }
  };

  const handleDeleteCustom = async (mod: any) => {
    if (!tenantId || !mod.isCustom) return;
    
    setEnabling(mod.id);
    try {
      await deleteDoc(doc(db, 'tenants', tenantId, 'modules', mod.id));
      toast.success(`${mod.name} module deleted.`);
      setDeleteConfirm(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tenants/${tenantId}/modules/${mod.id}`);
      toast.error(`Failed to delete ${mod.name}`);
    } finally {
      setEnabling(null);
    }
  };

  // Merge prebuilt MODULES with custom modules from Firestore
  const allModules: any[] = [...MODULES];
  
  // Add global custom modules
  customModules.forEach(cm => {
    if (!allModules.find(m => m.id === cm.id)) {
      const IconComponent = (LucideIcons as any)[cm.icon] || LucideIcons.Layers;
      allModules.push({
        ...cm,
        icon: IconComponent,
        isCustom: true
      });
    }
  });

  // Update status from tenant-specific configuredModules
  configuredModules.forEach(cm => {
    const idx = allModules.findIndex(m => m.id === cm.id);
    if (idx >= 0) {
      allModules[idx] = { 
        ...allModules[idx], 
        ...cm, 
        isEnabled: cm.status === 'ACTIVE' 
      };
    } else {
      // This shouldn't happen if custom modules are global, but just in case
      const IconComponent = (LucideIcons as any)[cm.iconName || cm.icon] || LucideIcons.Layers;
      allModules.push({
        ...cm,
        icon: IconComponent,
        isEnabled: cm.status === 'ACTIVE',
        isCustom: true
      });
    }
  });

  const filteredModules = allModules.filter(m => 
    (selectedCategory === 'All' || m.category === selectedCategory) &&
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
            onClick={() => navigate('/workspace/builder-choice')}
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
              "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
              selectedCategory === cat 
                ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20" 
                : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
            )}
          >
            {cat}
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
                  onClick={() => navigate(`/workspace/builder/${mod.id}`)}
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
              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-3 uppercase tracking-wider">{mod.category}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{mod.description}</p>
            </div>
            <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">v1.2.0</span>
                {mod.isCustom && (
                  <div className="flex items-center gap-2">
                    {deleteConfirm === mod.id ? (
                      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1 animate-in fade-in slide-in-from-left-2">
                        <span className="text-[10px] font-bold text-red-600 dark:text-red-400">Delete?</span>
                        <button 
                          onClick={() => handleDeleteCustom(mod)}
                          className="text-[10px] font-bold text-red-600 dark:text-white hover:text-red-700 dark:hover:text-red-300 transition-colors"
                        >
                          Yes
                        </button>
                        <button 
                          onClick={() => setDeleteConfirm(null)}
                          className="text-[10px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setDeleteConfirm(mod.id)}
                        className="p-1 text-zinc-400 dark:text-zinc-600 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                        title="Delete Custom Module"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
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
    </div>
  );
};
