import { 
  Terminal, 
  Zap, 
  Clock, 
  Plus, 
  Search, 
  Code2, 
  Variable, 
  Play, 
  History,
  Trash2,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { PageHeader } from './UI/PageHeader';

const VARIABLES = [
  { name: 'API_KEY', value: 'sk_test_••••••••', type: 'Secret' },
  { name: 'MAX_RETRIES', value: '3', type: 'Number' },
  { name: 'TIMEOUT', value: '5000', type: 'Number' },
  { name: 'BASE_URL', value: 'https://api.acme.com', type: 'String' },
];

import { usePlatform } from '../hooks/usePlatform';
import { DeleteConfirmationModal } from './Common/DeleteConfirmationModal';

export const LogicBuilder = () => {
  const { tenant } = usePlatform();
  const [activeTab, setActiveTab] = useState<'ASSETS' | 'VARIABLES'>('ASSETS');
  const [assets, setAssets] = useState<any[]>([]);
  const [modules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<any | null>(null);

  useEffect(() => {
    if (!tenant?.id) {
      setLoading(false);
      return;
    }
    
    // NOTE: Logic asset fetching from Firestore has been removed 
    // during the Supabase migration. This will be replaced by Prisma/API calls.
    setAssets([]);
    setLoading(false);
  }, [tenant?.id]);

  const handleDeleteAsset = (asset: any) => {
    setAssetToDelete(asset);
  };

  const confirmDelete = async () => {
    if (!tenant?.id || !assetToDelete) return;
    
    setDeletingId(assetToDelete.id);
    try {
      // NOTE: Database deletion is disabled during the Supabase migration.
      toast.success(`${assetToDelete.name} deleted locally`);
      setAssets(prev => prev.filter(a => a.id !== assetToDelete.id));
      setAssetToDelete(null);
    } catch (error) {
      console.error("Delete Error:", error);
      toast.error(`Failed to delete ${assetToDelete.name}`);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8">
      <PageHeader 
        title="Business Logic"
        description="Manage formulas, variables, and automated procedures."
        actions={
          <button className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20">
            <Plus size={18} />
            <span>New Logic Asset</span>
          </button>
        }
      />

      <div className="flex items-center gap-6 border-b border-zinc-200 dark:border-zinc-800">
        <button 
          onClick={() => setActiveTab('ASSETS')}
          className={cn("pb-4 text-sm font-bold transition-all relative", activeTab === 'ASSETS' ? "text-zinc-900 dark:text-white" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300")}
        >
          Logic Assets
          {activeTab === 'ASSETS' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
        </button>
        <button 
          onClick={() => setActiveTab('VARIABLES')}
          className={cn("pb-4 text-sm font-bold transition-all relative", activeTab === 'VARIABLES' ? "text-zinc-900 dark:text-white" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300")}
        >
          Global Variables
          {activeTab === 'VARIABLES' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'ASSETS' ? (
          <motion.div 
            key="assets"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Search assets..." 
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-10 pr-4 py-1.5 text-sm text-zinc-900 dark:text-zinc-300 focus:outline-none focus:border-indigo-500 w-64 shadow-sm dark:shadow-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {assets.length > 0 ? assets.map((asset) => (
                <div key={asset.id} className="p-6 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group shadow-sm dark:shadow-none">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 text-indigo-600 dark:text-indigo-400">
                        {asset.type === 'FORMULA' ? <Code2 size={20} /> : 
                         asset.type === 'TRIGGER' ? <Zap size={20} /> : 
                         asset.type === 'SCHEDULE' ? <Clock size={20} /> : <Terminal size={20} />}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                          {asset.id} • {asset.type}
                          {asset.targetModuleId && ` • Bound to: ${asset.targetModuleId}`}
                        </p>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{asset.name}</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", 
                         asset.status === 'Active' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                      )}>
                        {asset.status}
                      </span>
                      {asset.targetModuleId && !modules.find(m => m.id === asset.targetModuleId) && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-full text-[10px] font-bold uppercase tracking-widest animate-pulse">
                          <AlertTriangle size={10} />
                          Orphaned
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
                    {asset.description}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
                      <History size={12} />
                      <span>Last run: {asset.lastRun?.toDate ? asset.lastRun.toDate().toLocaleString() : 'Never'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDeleteAsset(asset)}
                        disabled={deletingId === asset.id}
                        className="p-1.5 text-zinc-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                        title="Delete Asset"
                      >
                        {deletingId === asset.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                      <button className="p-1.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                        <Play size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="col-span-2 p-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl text-center">
                  <p className="text-zinc-500 dark:text-zinc-400">No logic assets found.</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="variables"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="p-6 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm dark:shadow-none">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800">
                      <th className="pb-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-4">Variable Name</th>
                      <th className="pb-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-4">Value</th>
                      <th className="pb-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-4">Type</th>
                      <th className="pb-4 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
                    {VARIABLES.map((v, i) => (
                      <tr key={i} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <Variable size={16} className="text-indigo-600 dark:text-indigo-400" />
                            <span className="text-sm font-bold text-zinc-900 dark:text-white font-mono">{v.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-zinc-600 dark:text-zinc-300 font-mono">{v.value}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                            {v.type}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DeleteConfirmationModal 
        isOpen={!!assetToDelete}
        onClose={() => setAssetToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Logic Asset?"
        description="Are you sure you want to delete this logic asset? This action is permanent and will remove all associated configurations."
        itemName={assetToDelete?.name}
        moduleName={assetToDelete?.targetModuleId ? modules.find(m => m.id === assetToDelete.targetModuleId)?.name : undefined}
        moduleId={assetToDelete?.targetModuleId}
        isDeleting={deletingId === assetToDelete?.id}
      />
    </div>
  );
};
