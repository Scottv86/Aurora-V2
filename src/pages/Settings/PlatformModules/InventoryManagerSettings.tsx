import { useState, useEffect } from 'react';
import { 
  Boxes, 
  Search, 
  Package, 
  Loader2,
  Plus,
  Minus,
  AlertTriangle,
  FolderLock
} from 'lucide-react';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { API_BASE_URL } from '../../../config';
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
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenant } = usePlatform();
  const { session } = useAuth();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'UNTRACKED'>('ALL');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/pricing-catalog?type=PRODUCT`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        }
      });
      const data = await res.json();
      if (res.ok) {
        setItems(data);
      } else {
        toast.error(data.error || 'Failed to load inventory items');
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
      toast.error('Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  const adjustStock = async (item: CatalogItem, amount: number) => {
    try {
      const newStock = Math.max(0, item.stockLevel + amount);
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      
      const payload = {
        ...item,
        stockLevel: newStock,
      };

      const res = await fetch(`${API_BASE_URL}/api/pricing-catalog/${item.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(`Adjusted stock for ${item.name} to ${newStock}`);
        setItems(items.map(i => i.id === item.id ? { ...i, stockLevel: newStock } : i));
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to adjust stock');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleTracking = async (item: CatalogItem) => {
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const newTrackValue = !item.trackInventory;
      
      const payload = {
        ...item,
        trackInventory: newTrackValue,
        stockLevel: newTrackValue ? item.stockLevel : 0,
        reorderPoint: newTrackValue ? 10 : 0
      };

      const res = await fetch(`${API_BASE_URL}/api/pricing-catalog/${item.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(`Inventory tracking ${newTrackValue ? 'enabled' : 'disabled'} for ${item.name}`);
        setItems(items.map(i => i.id === item.id ? { 
          ...i, 
          trackInventory: newTrackValue, 
          stockLevel: newTrackValue ? i.stockLevel : 0,
          reorderPoint: newTrackValue ? 10 : 0
        } : i));
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update tracking');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const adjustThreshold = async (item: CatalogItem, amount: number) => {
    try {
      const newThreshold = Math.max(0, item.reorderPoint + amount);
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      
      const payload = {
        ...item,
        reorderPoint: newThreshold,
      };

      const res = await fetch(`${API_BASE_URL}/api/pricing-catalog/${item.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(`Adjusted alert threshold for ${item.name} to ${newThreshold}`);
        setItems(items.map(i => i.id === item.id ? { ...i, reorderPoint: newThreshold } : i));
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to adjust threshold');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Filter Logic
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.code.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (stockFilter === 'ALL') return true;
    if (stockFilter === 'UNTRACKED') return !item.trackInventory;
    if (!item.trackInventory) return false;

    if (stockFilter === 'OUT_OF_STOCK') return item.stockLevel === 0;
    if (stockFilter === 'LOW_STOCK') return item.stockLevel > 0 && item.stockLevel <= item.reorderPoint;
    if (stockFilter === 'IN_STOCK') return item.stockLevel > item.reorderPoint;
    
    return true;
  });

  // Stats Counters
  const totalProducts = items.length;
  const trackedProducts = items.filter(i => i.trackInventory).length;
  const lowStockCount = items.filter(i => i.trackInventory && i.stockLevel > 0 && i.stockLevel <= i.reorderPoint).length;
  const outOfStockCount = items.filter(i => i.trackInventory && i.stockLevel === 0).length;

  return (
    <div className="space-y-6 text-left">
      {/* KPI stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
            <Package size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Products</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{totalProducts}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-2xl flex items-center justify-center">
            <Boxes size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tracked Stock</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{trackedProducts}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${lowStockCount > 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500' : 'bg-zinc-100 dark:bg-white/5 text-zinc-400'}`}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Low Stock Warnings</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{lowStockCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${outOfStockCount > 0 ? 'bg-red-500/10 text-red-650 dark:text-red-400 animate-pulse' : 'bg-zinc-100 dark:bg-white/5 text-zinc-400'}`}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Out of Stock</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{outOfStockCount}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/40 dark:bg-zinc-900/20 backdrop-blur-xl p-4 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
        <div className="relative flex-1 w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input
            type="text"
            placeholder="Search products by name or SKU..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 justify-end w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Products' },
            { id: 'IN_STOCK', label: 'In Stock' },
            { id: 'LOW_STOCK', label: 'Low Stock' },
            { id: 'OUT_OF_STOCK', label: 'Out of Stock' },
            { id: 'UNTRACKED', label: 'Not Tracked' }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setStockFilter(filter.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                stockFilter === filter.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 border border-zinc-200/50 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:text-zinc-800 dark:hover:text-white font-semibold'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm min-h-[300px] relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p className="text-sm">Loading stock levels...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-zinc-450">
            <Boxes size={48} className="mb-4 opacity-20" />
            <p className="text-base font-bold">No product items found</p>
            <p className="text-xs max-w-sm text-center mt-1">Make sure you have items of type PRODUCT created in your Pricing Catalog.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800/80 text-[10px] uppercase tracking-wider text-zinc-400 font-bold bg-zinc-50/50 dark:bg-zinc-900/20">
                  <th className="py-4 px-6">Product Details</th>
                  <th className="py-4 px-4">Tracking Status</th>
                  <th className="py-4 px-4">Alert Threshold</th>
                  <th className="py-4 px-6 text-center">Stock Level & Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                {filteredItems.map(item => {
                  const isLowStock = item.trackInventory && item.stockLevel > 0 && item.stockLevel <= item.reorderPoint;
                  const isOutOfStock = item.trackInventory && item.stockLevel === 0;

                  return (
                    <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="py-4 px-6">
                        <div>
                          <p className="text-sm font-bold text-zinc-900 dark:text-white leading-snug">{item.name}</p>
                          <span className="inline-block text-[10px] font-mono bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-md mt-1 uppercase">
                            {item.code}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleTracking(item)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                              item.trackInventory
                                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-450 hover:bg-emerald-500/10'
                                : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 border-zinc-200/50 dark:border-white/10 text-zinc-500 dark:text-zinc-400'
                            }`}
                          >
                            {item.trackInventory ? 'Active Tracking' : 'Disabled'}
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {item.trackInventory ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => adjustThreshold(item, -5)}
                              disabled={item.reorderPoint < 5}
                              className="p-1 hover:bg-zinc-100 dark:hover:bg-white/5 disabled:opacity-40 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="text-sm font-bold text-zinc-850 dark:text-zinc-200 w-8 text-center">{item.reorderPoint}</span>
                            <button
                              onClick={() => adjustThreshold(item, 5)}
                              className="p-1 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {item.trackInventory ? (
                          <div className="flex items-center justify-center gap-6">
                            <div className="flex-1 max-w-[200px] space-y-1.5">
                              <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isOutOfStock ? 'bg-red-500' :
                                    isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, (item.stockLevel / (item.reorderPoint * 3 || 1)) * 100)}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-zinc-450 font-semibold">
                                <span className={isOutOfStock ? 'text-red-550' : isLowStock ? 'text-amber-600' : 'text-emerald-600'}>
                                  {isOutOfStock ? 'OUT OF STOCK' : isLowStock ? 'LOW STOCK' : 'IN STOCK'}
                                </span>
                                <span>{item.stockLevel} units</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => adjustStock(item, -1)}
                                disabled={item.stockLevel === 0}
                                className="p-1.5 border border-zinc-200/50 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 disabled:opacity-40 rounded-xl text-zinc-500 dark:text-zinc-400 transition-colors"
                              >
                                <Minus size={12} />
                              </button>
                              <button
                                onClick={() => adjustStock(item, 1)}
                                className="p-1.5 border border-zinc-200/50 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl text-zinc-500 dark:text-zinc-400 transition-colors"
                              >
                                <Plus size={12} />
                              </button>
                              <button
                                onClick={() => adjustStock(item, 10)}
                                className="px-2.5 py-1 text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-500/10"
                              >
                                +10
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center text-xs text-zinc-400 gap-1.5">
                            <FolderLock size={12} />
                            <span>Stock levels not monitored</span>
                          </div>
                        )}
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
  );
};
