import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Boxes, 
  Search, 
  Package, 
  Loader2,
  Plus,
  Minus,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { API_BASE_URL } from '../../../config';
import { SettingsSubNavLayout, SettingsSubNavItem } from '../../../components/Settings/SettingsSubNavLayout';
import { Button } from '../../../components/UI/Primitives';
import { toast } from 'sonner';

interface CatalogItem {
  id: string;
  name: string;
  code: string;
  type: 'PRODUCT' | 'SERVICE' | 'FEE' | 'RECURRING' | 'FINE';
  description: string | null;
  priceType: 'FLAT' | 'UNIT' | 'TIME';
  basePrice: number;
  currency: string;
  trackInventory: boolean;
  stockLevel: number;
  reorderPoint: number;
  status: 'active' | 'draft' | 'archived';
}

export const InventoryManagerSettings = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { tenant } = usePlatform();
  const { session } = useAuth();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'LOW_STOCK' | 'UNTRACKED'>('ALL');

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/pricing-catalog`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        }
      });
      const data = await res.json();
      if (res.ok) {
        // Filter catalog items to products or items that have trackInventory enabled
        setItems(data.filter((item: CatalogItem) => item.type === 'PRODUCT' || item.trackInventory));
      } else {
        toast.error(data.error || 'Failed to load inventory');
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
      toast.error('Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  const handleStockAdjust = async (item: CatalogItem, delta: number) => {
    const newStock = Math.max(0, item.stockLevel + delta);
    try {
      setUpdatingId(item.id);
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/pricing-catalog/${item.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify({
          stockLevel: newStock,
          trackInventory: true
        })
      });

      if (res.ok) {
        toast.success(`Stock level for ${item.name} updated to ${newStock}`);
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, stockLevel: newStock, trackInventory: true } : i));
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update stock');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleTracking = async (item: CatalogItem) => {
    try {
      setUpdatingId(item.id);
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/pricing-catalog/${item.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify({
          trackInventory: !item.trackInventory
        })
      });

      if (res.ok) {
        toast.success(`Inventory tracking ${!item.trackInventory ? 'enabled' : 'disabled'} for ${item.name}`);
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, trackInventory: !item.trackInventory } : i));
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update tracking');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter logic
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.code.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (selectedFilter === 'LOW_STOCK') {
      return item.trackInventory && item.stockLevel <= item.reorderPoint;
    }
    if (selectedFilter === 'UNTRACKED') {
      return !item.trackInventory;
    }
    return true;
  });

  // KPI Computations
  const totalTracked = items.filter(i => i.trackInventory).length;
  const lowStockCount = items.filter(i => i.trackInventory && i.stockLevel <= i.reorderPoint).length;
  const outOfStockCount = items.filter(i => i.trackInventory && i.stockLevel === 0).length;

  const subNavItems: SettingsSubNavItem[] = [
    { id: 'ALL', label: 'All Inventory', icon: Boxes, description: 'Tracked physical/digital items' },
    { id: 'LOW_STOCK', label: 'Low Stock Alerts', icon: AlertTriangle, description: 'Items needing reorder' },
    { id: 'UNTRACKED', label: 'Untracked Items', icon: Package, description: 'Catalog items with disabled stock' }
  ];

  return (
    <SettingsSubNavLayout
      title="Inventory Manager"
      description="Real-time stock tracking, alert thresholds, and quantity adjustments for catalog products."
      icon={Boxes}
      items={subNavItems}
      activeId={selectedFilter}
      onTabChange={(id) => setSelectedFilter(id as any)}
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
    >
      <div className="space-y-6 text-left">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
              <Boxes size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tracked SKUs</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{totalTracked}</p>
            </div>
          </div>

          <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${lowStockCount > 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500' : 'bg-zinc-100 dark:bg-white/5 text-zinc-455'}`}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Low Stock Warnings</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{lowStockCount}</p>
            </div>
          </div>

          <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${outOfStockCount > 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-zinc-100 dark:bg-white/5 text-zinc-455'}`}>
              <Package size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Out of Stock</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{outOfStockCount}</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl p-4 border border-white/20 dark:border-white/5 rounded-3xl shadow-xl">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="text"
              placeholder="Search SKU or product name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Stock Items Table */}
        <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl overflow-hidden shadow-xl min-h-[300px] relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p className="text-sm">Loading Stock Inventory...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-zinc-450">
              <Boxes size={48} className="mb-4 opacity-20" />
              <p className="text-base font-bold">No product inventory found</p>
              <p className="text-xs max-w-xs text-center mt-1">Make sure you have items of type 'PRODUCT' created in the Pricing Catalog.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800/80 text-[10px] uppercase tracking-wider text-zinc-400 font-bold bg-zinc-50/50 dark:bg-zinc-900/20">
                    <th className="py-4 px-6">Product & SKU</th>
                    <th className="py-4 px-4">Tracking Status</th>
                    <th className="py-4 px-4">Reorder Threshold</th>
                    <th className="py-4 px-4">Current Stock</th>
                    <th className="py-4 px-6 text-right">Adjust Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                  {filteredItems.map(item => {
                    const isLow = item.trackInventory && item.stockLevel <= item.reorderPoint;
                    const isOut = item.trackInventory && item.stockLevel === 0;

                    return (
                      <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="py-4 px-6">
                          <div>
                            <p className="text-sm font-bold text-zinc-900 dark:text-white leading-snug">{item.name}</p>
                            <span className="text-[10px] font-mono bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-md uppercase inline-block mt-1">
                              {item.code}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => handleToggleTracking(item)}
                            disabled={updatingId === item.id}
                            className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${
                              item.trackInventory 
                                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20' 
                                : 'bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-zinc-800 text-zinc-450 hover:bg-zinc-200'
                            }`}
                          >
                            {item.trackInventory ? 'Active Tracking' : 'Disabled'}
                          </button>
                        </td>
                        <td className="py-4 px-4 font-bold text-sm text-zinc-600 dark:text-zinc-400">
                          {item.trackInventory ? `${item.reorderPoint} units` : '—'}
                        </td>
                        <td className="py-4 px-4">
                          {item.trackInventory ? (
                            <div className="flex items-center gap-2">
                              <span className={`text-base font-extrabold ${
                                isOut ? 'text-rose-600 dark:text-rose-400' :
                                isLow ? 'text-amber-600 dark:text-amber-400' :
                                'text-zinc-900 dark:text-white'
                              }`}>
                                {item.stockLevel}
                              </span>
                              {isOut ? (
                                <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase">
                                  Out of Stock
                                </span>
                              ) : isLow ? (
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase">
                                  Low Stock
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-400 font-medium">Not Tracked</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleStockAdjust(item, -1)}
                              disabled={updatingId === item.id || !item.trackInventory || item.stockLevel <= 0}
                              className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-zinc-700 dark:text-zinc-300 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
                            >
                              <Minus size={14} />
                            </button>
                            <button
                              onClick={() => handleStockAdjust(item, 1)}
                              disabled={updatingId === item.id}
                              className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/10 disabled:opacity-30 transition-all active:scale-95"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </SettingsSubNavLayout>
  );
};
