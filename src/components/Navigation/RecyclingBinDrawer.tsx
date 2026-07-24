import { useState, useEffect } from 'react';
import { 
  Trash2, 
  X, 
  RotateCcw, 
  FileText, 
  Folder, 
  Zap, 
  Plug, 
  MessageSquare, 
  Clock, 
  Search, 
  AlertTriangle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { toast } from 'sonner';

export interface TrashItem {
  id: string;
  tenantId: string;
  itemType: 'RECORD' | 'MODULE' | 'AUTOMATION' | 'CONNECTOR' | 'CHAT_SESSION' | 'SCHEDULED_TASK' | string;
  itemId: string;
  title: string;
  subtitle?: string;
  payload: any;
  deletedBy?: string;
  deletedAt: string;
  expiresAt: string;
}

export const RecyclingBinDrawer = () => {
  const { setIsRecyclingBinOpen, tenant, modules = [] } = usePlatform();
  const { session } = useAuth();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEmptying, setIsEmptying] = useState(false);

  const getRecordKey = (item: TrashItem) => {
    if (item.itemType !== 'RECORD') return null;
    const payloadData = item.payload?.data || item.payload || {};
    const key = payloadData._record_key || payloadData.recordKey || payloadData.key || payloadData._key || payloadData.record_key || payloadData.code || item.payload?._record_key;
    if (key && typeof key === 'string' && key.trim().length > 0 && !key.startsWith('cmnx') && !key.startsWith('cmr')) {
      return key.trim();
    }
    const rawId = item.itemId || item.id || '';
    if (rawId) {
      return `#${rawId.slice(-6)}`;
    }
    return null;
  };

  const getDisplayTitle = (item: TrashItem) => {
    const payloadData = item.payload?.data || item.payload || {};
    const foundTitle = payloadData.name || payloadData.title || payloadData.subject || 
                       payloadData.applicationName || payloadData.application_name || 
                       payloadData.applicantName || payloadData.companyName || payloadData.summary;
    if (foundTitle && typeof foundTitle === 'string' && foundTitle.trim().length > 0) {
      return foundTitle;
    }

    if (item.title && !item.title.startsWith('cmnx') && !item.title.startsWith('cmr') && item.title.length > 2 && !item.title.startsWith('cm')) {
      return item.title;
    }

    const stringVals = Object.values(payloadData).filter((v: any) => typeof v === 'string' && v.trim().length > 0 && !v.startsWith('http') && !v.startsWith('cmr') && !v.startsWith('cmnx'));
    if (stringVals.length > 0) return stringVals[0] as string;

    const recKey = getRecordKey(item);
    if (recKey) return recKey;

    return item.title || `Record #${String(item.itemId || item.id).slice(-6)}`;
  };

  const getDisplaySubtitle = (item: TrashItem) => {
    let sub = item.subtitle || '';
    if (sub.includes('Module: cmp') || sub.includes('Module: mod_') || sub.startsWith('Module: ')) {
      const rawModuleId = sub.replace('Module: ', '').trim();
      const modObj = modules.find((m: any) => m.id === rawModuleId || m.name === rawModuleId);
      if (modObj?.name) {
        sub = `Module: ${modObj.name}`;
      } else if (item.payload?.moduleId) {
        const modObj2 = modules.find((m: any) => m.id === item.payload.moduleId);
        if (modObj2?.name) sub = `Module: ${modObj2.name}`;
      }
    }
    return sub || `Type: ${item.itemType}`;
  };

  const fetchTrashItems = async () => {
    if (!tenant?.id) return;
    try {
      setLoading(true);
      const token = session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/trash`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'x-tenant-id': tenant.id
        }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('[RecyclingBin] Failed to fetch trash items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrashItems();
  }, [tenant?.id, session?.access_token]);

  const handleRestore = async (id: string, title: string) => {
    try {
      const token = session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/trash/${id}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'x-tenant-id': tenant?.id || ''
        }
      });
      if (res.ok) {
        toast.success(`✓ Restored "${title}" successfully`);
        setItems(prev => prev.filter(i => i.id !== id));
      } else {
        toast.error(`Failed to restore "${title}"`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error restoring item');
    }
  };

  const handleDeletePermanently = async (id: string, title: string) => {
    try {
      const token = session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/trash/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'x-tenant-id': tenant?.id || ''
        }
      });
      if (res.ok) {
        toast.success(`Permanently deleted "${title}"`);
        setItems(prev => prev.filter(i => i.id !== id));
      } else {
        toast.error(`Failed to delete "${title}"`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting item');
    }
  };

  const handleEmptyTrash = async () => {
    if (items.length === 0) return;
    if (!window.confirm('Are you sure you want to permanently delete all items in the Recycling Bin? This cannot be undone.')) {
      return;
    }
    try {
      setIsEmptying(true);
      const token = session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/trash`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
          'x-tenant-id': tenant?.id || ''
        }
      });
      if (res.ok) {
        toast.success('Recycling bin emptied');
        setItems([]);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error emptying trash');
    } finally {
      setIsEmptying(false);
    }
  };

  const getItemIcon = (itemType: string) => {
    switch (itemType) {
      case 'RECORD': return <FileText size={16} className="text-blue-500" />;
      case 'MODULE': return <Folder size={16} className="text-amber-500" />;
      case 'AUTOMATION': return <Zap size={16} className="text-purple-500" />;
      case 'CONNECTOR': return <Plug size={16} className="text-emerald-500" />;
      case 'CHAT_SESSION': return <MessageSquare size={16} className="text-indigo-500" />;
      case 'CHAT_MESSAGE': return <MessageSquare size={16} className="text-cyan-500" />;
      default: return <Trash2 size={16} className="text-zinc-400" />;
    }
  };

  const getDaysRemaining = (expiresAtStr: string) => {
    try {
      const expiresAt = new Date(expiresAtStr);
      const diffMs = expiresAt.getTime() - Date.now();
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return Math.max(0, days);
    } catch {
      return 30;
    }
  };

  const filteredItems = items.filter(item => {
    const matchesTab = activeTab === 'ALL' || item.itemType === activeTab;
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.subtitle && item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  return (
    <motion.aside
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-16 bottom-0 w-96 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-l border-zinc-200 dark:border-zinc-800 flex flex-col z-40 shadow-2xl shadow-black/20"
    >
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-500/20">
              <Trash2 size={18} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                Recycling Bin
                <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded-full border border-indigo-500/20">
                  {items.length}
                </span>
              </h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                Items sit for 30 days before permanent deletion
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchTrashItems}
              className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-all"
              title="Refresh Recycling Bin"
            >
              <RefreshCw size={16} className={cn(loading && "animate-spin")} />
            </button>
            <button 
              onClick={() => setIsRecyclingBinOpen(false)}
              className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search soft-deleted items..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-8 pr-3 py-1 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-3 overflow-x-auto scrollbar-none pb-0.5">
          {['ALL', 'CHAT_SESSION', 'CHAT_MESSAGE', 'RECORD', 'MODULE', 'AUTOMATION', 'CONNECTOR'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-2 py-1 text-[10px] font-bold rounded-md whitespace-nowrap transition-colors uppercase tracking-wider",
                activeTab === tab 
                  ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20" 
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              {tab === 'ALL' ? 'All' : tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="h-full flex items-center justify-center p-8 text-zinc-400">
            <Loader2 size={24} className="animate-spin text-indigo-500" />
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {filteredItems.map(item => {
              const daysLeft = getDaysRemaining(item.expiresAt);
              const recordKey = getRecordKey(item);
              return (
                <div 
                  key={item.id}
                  className="p-4 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors group/trash"
                >
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0">
                      {getItemIcon(item.itemType)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          {recordKey && (
                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 font-mono shrink-0">
                              {recordKey}
                            </span>
                          )}
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                            {getDisplayTitle(item)}
                          </h4>
                        </div>
                        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 border border-amber-500/20">
                          <Clock size={9} />
                          {daysLeft}d left
                        </span>
                      </div>

                      <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 truncate mb-2">
                        {getDisplaySubtitle(item)} • Deleted by {item.deletedBy || 'User'}
                      </p>

                      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-900">
                        <button
                          onClick={() => handleRestore(item.id, item.title)}
                          className="flex items-center gap-1 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-md transition-all shadow-sm"
                        >
                          <RotateCcw size={11} />
                          <span>Restore</span>
                        </button>

                        <button
                          onClick={() => handleDeletePermanently(item.id, item.title)}
                          className="flex items-center gap-1 text-[10.5px] font-bold text-rose-500 hover:text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 rounded-md transition-all"
                        >
                          <Trash2 size={11} />
                          <span>Delete Permanently</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-4 text-zinc-400">
              <Trash2 size={32} />
            </div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">Recycling bin is empty</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Soft-deleted items will appear here for recovery before permanent deletion.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
          <button 
            onClick={handleEmptyTrash}
            disabled={isEmptying}
            className="flex items-center gap-1.5 text-[10px] font-bold text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-widest disabled:opacity-50"
          >
            {isEmptying ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} />}
            Empty Trash
          </button>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            {items.length} Items Total
          </span>
        </div>
      )}
    </motion.aside>
  );
};
