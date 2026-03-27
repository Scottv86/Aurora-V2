import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  AlertTriangle, 
  Workflow, 
  Trash2, 
  Database, 
  Link, 
  Zap, 
  Terminal, 
  Code2,
  CheckCircle2,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface Asset {
  id: string;
  name: string;
  type: string;
}

interface DeleteModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteLogic: boolean) => void;
  module: any;
  tenantId: string;
}

export const DeleteModuleModal = ({ isOpen, onClose, onConfirm, module, tenantId }: DeleteModuleModalProps) => {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [recordCount, setRecordCount] = useState(0);
  const [referencingModules, setReferencingModules] = useState<string[]>([]);
  const [deleteLogic, setDeleteLogic] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && module?.id && tenantId) {
      fetchDependencies();
    }
  }, [isOpen, module?.id, tenantId]);

  const fetchDependencies = async () => {
    setLoading(true);
    try {
      // 1. Fetch Workflows & Logic
      const logicRef = collection(db, 'tenants', tenantId, 'logic');
      const q = query(logicRef, where('targetModuleId', '==', module.id));
      const logicSnap = await getDocs(q);
      const logicAssets = logicSnap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || 'Unnamed Asset',
        type: doc.data().type || 'LOGIC'
      }));
      setAssets(logicAssets);

      // 2. Fetch Record Count
      const recordsRef = collection(db, 'tenants', tenantId, 'modules', module.id, 'records');
      const recordsSnap = await getDocs(recordsRef);
      setRecordCount(recordsSnap.size);

      // 3. Fetch Lookup Dependencies (scan other modules)
      const modulesRef = collection(db, 'tenants', tenantId, 'modules');
      const modulesSnap = await getDocs(modulesRef);
      const refs: string[] = [];
      
      modulesSnap.forEach(docSnap => {
        const modData = docSnap.data();
        if (docSnap.id === module.id) return;
        
        // Check fields for lookups
        const fields = modData.fields || [];
        const hasLookup = fields.some((f: any) => f.type === 'lookup' && f.targetModuleId === module.id);
        
        if (hasLookup) {
          refs.push(modData.name || docSnap.id);
        }
      });
      setReferencingModules(refs);

    } catch (error) {
      console.error("Error fetching dependencies:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    setIsDeleting(true);
    onConfirm(deleteLogic);
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'WORKFLOW': return <Workflow size={14} />;
      case 'FORMULA': return <Code2 size={14} />;
      case 'TRIGGER': return <Zap size={14} />;
      case 'SCHEDULE': return <Terminal size={14} />;
      default: return <Info size={14} />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-8 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl shadow-inner">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white leading-tight">Delete {module.name}?</h2>
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mt-0.5">Custom Module Deletion</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-8">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                  <p className="text-sm font-bold text-zinc-500 animate-pulse">Scanning dependencies...</p>
                </div>
              ) : (
                <>
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <Database size={12} />
                        Data Persistence
                      </h3>
                      <span className="text-[10px] font-bold text-zinc-900 dark:text-white px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                        {recordCount} Records
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      This module contains <span className="font-bold text-zinc-900 dark:text-white">{recordCount} records</span> that will be permanently removed. This action cannot be undone.
                    </p>
                  </section>

                  {assets.length > 0 && (
                    <section className="space-y-4">
                      <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <Workflow size={12} />
                        Business Logic Assets
                      </h3>
                      <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800/50 rounded-2xl p-4 grid grid-cols-1 gap-2">
                        {assets.map(asset => (
                          <div key={asset.id} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                {getAssetIcon(asset.type)}
                              </div>
                              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{asset.name}</span>
                            </div>
                            <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-tighter">{asset.type}</span>
                          </div>
                        ))}
                      </div>
                      <label className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/10 rounded-2xl cursor-pointer group hover:bg-red-500/10 transition-all">
                        <div className="relative flex items-center">
                          <input 
                            type="checkbox" 
                            checked={deleteLogic}
                            onChange={(e) => setDeleteLogic(e.target.checked)}
                            className="peer sr-only"
                          />
                          <div className="w-10 h-5 bg-zinc-200 dark:bg-zinc-800 rounded-full peer peer-checked:bg-red-500 transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5 shadow-inner" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-red-600 dark:group-hover:text-red-400">Also delete logic assets</p>
                          <p className="text-[10px] text-zinc-500 group-hover:text-zinc-600">Cleanup associated workflows and formulas</p>
                        </div>
                      </label>
                    </section>
                  )}

                  {referencingModules.length > 0 && (
                    <section className="space-y-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                      <h3 className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-2">
                        <Link size={12} />
                        Lookup Impacts
                      </h3>
                      <p className="text-[11px] text-amber-500 font-medium leading-relaxed">
                        The following modules have lookup fields pointing here. They may experience errors after deletion:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {referencingModules.map(m => (
                          <span key={m} className="px-2 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-lg border border-amber-500/20">
                            {m}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/50 flex gap-4">
              <button 
                onClick={onClose}
                disabled={isDeleting}
                className="flex-1 py-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirm}
                disabled={loading || isDeleting}
                className={cn(
                  "flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2",
                  isDeleting && "animate-pulse"
                )}
              >
                {isDeleting ? (
                  <>
                    <Trash2 size={18} className="animate-bounce" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    <span>Delete Module</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
