import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  Search, 
  Package, 
  Loader2, 
  Plus, 
  AlertTriangle,
  ArrowUpDown,
  Warehouse,
  History,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { API_BASE_URL } from '../../../config';
import { SettingsSubNavLayout, SettingsSubNavItem } from '../../../components/Settings/SettingsSubNavLayout';
import { Modal } from '../../../components/UI/TabsAndModal';
import { Button, Input } from '../../../components/UI/Primitives';
import { toast } from 'sonner';

interface StockAllocation {
  locationId: string;
  locationName: string;
  locationCode: string;
  variantId?: string | null;
  onHandQuantity: number;
  allocatedQuantity: number;
  reorderPoint: number;
}

interface InventoryItem {
  id: string;
  name: string;
  code: string;
  type: string;
  basePrice: number;
  trackInventory: boolean;
  stockLevel: number;
  reorderPoint: number;
  isLowStock: boolean;
  variants?: Array<{ id: string; sku: string; title: string; priceOverride?: number; unitCost: number }>;
  allocations: StockAllocation[];
  metadata?: any;
}

interface InventoryLocation {
  id: string;
  code: string;
  name: string;
  isDefault: boolean;
  address?: string | null;
}

interface InventoryMovementRecord {
  id: string;
  catalogItemId: string;
  movementType: string;
  quantityDelta: number;
  unitCost: number;
  notes?: string | null;
  createdAt: string;
  location?: { code: string; name: string };
  catalogItem?: { code: string; name: string };
}

export const InventoryManagerSettings = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [movements, setMovements] = useState<InventoryMovementRecord[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const { tenant } = usePlatform();
  const { session } = useAuth();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'LOW_STOCK' | 'MOVEMENTS' | 'LOCATIONS'>('ALL');

  // Adjust / Write-Off Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustFormData, setAdjustFormData] = useState({
    catalogItemId: '',
    variantId: '',
    locationId: '',
    quantityDelta: 1,
    movementType: 'ADJUSTMENT_WRITE_OFF' as 'PURCHASE_RECEIPT' | 'ADJUSTMENT_WRITE_OFF' | 'SHRINKAGE' | 'TRANSFER_IN' | 'TRANSFER_OUT',
    unitCost: 10,
    notes: '',
    postToGeneralLedger: true
  });

  // Location Modal State
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationFormData, setLocationFormData] = useState({
    code: '',
    name: '',
    isDefault: false
  });

  const getAuthHeaders = () => {
    const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
    return {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenant?.id || ''
    };
  };

  useEffect(() => {
    fetchInventory();
    fetchLocations();
  }, [tenant?.id]);

  useEffect(() => {
    if (selectedTab === 'MOVEMENTS') {
      fetchMovements();
    }
  }, [selectedTab]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/inventory/status`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        setItems(data.filter((item: InventoryItem) => item.type === 'PRODUCT' || item.trackInventory));
      } else {
        toast.error(data.error || 'Failed to load inventory status');
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
      toast.error('Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/inventory/locations`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        setLocations(data);
        if (data.length > 0 && !adjustFormData.locationId) {
          const def = data.find((l: any) => l.isDefault) || data[0];
          setAdjustFormData(prev => ({ ...prev, locationId: def.id }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    }
  };

  const fetchMovements = async () => {
    try {
      setMovementsLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/inventory/movements?limit=100`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        setMovements(data);
      }
    } catch (err) {
      console.error('Failed to fetch movements:', err);
    } finally {
      setMovementsLoading(false);
    }
  };

  const handleOpenAdjustModal = (item?: InventoryItem) => {
    setAdjustFormData({
      catalogItemId: item?.id || (items[0]?.id || ''),
      variantId: item?.variants?.[0]?.id || '',
      locationId: locations[0]?.id || '',
      quantityDelta: -1,
      movementType: 'ADJUSTMENT_WRITE_OFF',
      unitCost: item?.variants?.[0]?.unitCost || 10,
      notes: '',
      postToGeneralLedger: true
    });
    setIsAdjustModalOpen(true);
  };

  const handleExecuteAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isNegative = ['ADJUSTMENT_WRITE_OFF', 'SHRINKAGE', 'TRANSFER_OUT'].includes(adjustFormData.movementType);
      const absQty = Math.abs(Number(adjustFormData.quantityDelta));
      const delta = isNegative ? -absQty : absQty;

      const res = await fetch(`${API_BASE_URL}/api/inventory/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          catalogItemId: adjustFormData.catalogItemId,
          variantId: adjustFormData.variantId || null,
          locationId: adjustFormData.locationId || undefined,
          quantityDelta: delta,
          movementType: adjustFormData.movementType,
          unitCost: Number(adjustFormData.unitCost),
          notes: adjustFormData.notes || null,
          postToGeneralLedger: adjustFormData.postToGeneralLedger
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Inventory adjustment posted: ${delta > 0 ? '+' : ''}${delta} units`);
        setIsAdjustModalOpen(false);
        fetchInventory();
        if (selectedTab === 'MOVEMENTS') fetchMovements();
      } else {
        throw new Error(data.error || 'Failed to adjust inventory');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/inventory/locations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(locationFormData)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Location created: ${data.name}`);
        setIsLocationModalOpen(false);
        setLocationFormData({ code: '', name: '', isDefault: false });
        fetchLocations();
      } else {
        throw new Error(data.error || 'Failed to create location');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Filter logic
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.code.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedTab === 'LOW_STOCK') return item.isLowStock;
    return true;
  });

  const filteredMovements = movements.filter(m => {
    return (
      (m.catalogItem?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.catalogItem?.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.notes || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.movementType.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // KPI Computations
  const totalTracked = items.length;
  const lowStockCount = items.filter(i => i.isLowStock).length;
  const totalLocations = locations.length;
  const totalUnitsOnHand = items.reduce((sum, item) => sum + (item.stockLevel || 0), 0);

  const subNavItems: SettingsSubNavItem[] = [
    { id: 'ALL', label: 'All Stock & Locations', icon: Boxes, description: 'Multi-location inventory balances' },
    { id: 'LOW_STOCK', label: 'Low Stock Alerts', icon: AlertTriangle, description: 'SKUs at or below threshold' },
    { id: 'MOVEMENTS', label: 'Movement Audit Log', icon: History, description: 'Real-time perpetual ledger' },
    { id: 'LOCATIONS', label: 'Storage Locations', icon: Warehouse, description: 'Warehouses, hubs & storefronts' }
  ];

  return (
    <SettingsSubNavLayout
      title="Perpetual Inventory Manager"
      description="Location-aware stock control, real-time perpetual movement journal entries, and automated COGS relief."
      icon={Boxes}
      items={subNavItems}
      activeId={selectedTab}
      onTabChange={(id) => setSelectedTab(id as any)}
      actions={
        <div className="flex items-center gap-2">
          {selectedTab === 'LOCATIONS' ? (
            <Button 
              onClick={() => setIsLocationModalOpen(true)}
              className="gap-2 font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              <Plus size={16} /> New Location
            </Button>
          ) : (
            <Button 
              onClick={() => handleOpenAdjustModal()}
              className="gap-2 font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-500/20"
            >
              <ArrowUpDown size={16} /> Stock Adjustment / Write-Off
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6 text-left">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
              <Boxes size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tracked Products</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{totalTracked}</p>
            </div>
          </div>

          <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${lowStockCount > 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500' : 'bg-zinc-100 dark:bg-white/5 text-zinc-400'}`}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Low Stock SKUs</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{lowStockCount}</p>
            </div>
          </div>

          <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
              <Package size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Units On Hand</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{totalUnitsOnHand}</p>
            </div>
          </div>

          <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center">
              <Warehouse size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Active Locations</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{totalLocations}</p>
            </div>
          </div>
        </div>

        {/* Search Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl p-4 border border-white/20 dark:border-white/5 rounded-3xl shadow-xl">
          <div className="relative flex-1 w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="text"
              placeholder="Filter by product name, SKU or reference..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* TAB 1 & 2: STOCK BALANCES */}
        {(selectedTab === 'ALL' || selectedTab === 'LOW_STOCK') && (
          <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl overflow-hidden shadow-xl min-h-[300px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
                <Loader2 className="animate-spin mb-2" size={32} />
                <p className="text-sm">Loading perpetual stock status...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
                <Boxes size={48} className="mb-4 opacity-20" />
                <p className="text-base font-bold">No inventory items found</p>
                <p className="text-xs max-w-xs text-center mt-1">Make sure you have catalog items configured with stock tracking enabled.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800/80 text-[10px] uppercase tracking-wider text-zinc-400 font-bold bg-zinc-50/50 dark:bg-zinc-900/20">
                      <th className="py-4 px-6">Product & SKU</th>
                      <th className="py-4 px-4">Total Stock</th>
                      <th className="py-4 px-4">Threshold</th>
                      <th className="py-4 px-4">Location Allocations</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-6 text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                    {filteredItems.map(item => (
                      <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            {item.metadata?.imageUrl ? (
                              <img
                                src={item.metadata.imageUrl}
                                alt={item.name}
                                className="w-10 h-10 rounded-xl object-cover border border-zinc-200 dark:border-zinc-800 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                                <Package size={18} />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-bold text-zinc-900 dark:text-white leading-snug">{item.name}</p>
                              <span className="text-[10px] font-mono bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-md uppercase">
                                {item.code}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm font-bold text-zinc-900 dark:text-white">
                          <span className={item.stockLevel <= item.reorderPoint ? 'text-amber-500' : 'text-emerald-500'}>
                            {item.stockLevel} units
                          </span>
                        </td>
                        <td className="py-4 px-4 text-xs text-zinc-400">
                          {item.reorderPoint} units
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {item.allocations.length > 0 ? (
                              item.allocations.map((alloc, idx) => (
                                <span key={idx} className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-300">
                                  {alloc.locationCode}: <strong className="text-white">{alloc.onHandQuantity}</strong>
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] font-mono text-zinc-500">Unallocated (Global: {item.stockLevel})</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {item.stockLevel === 0 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              OUT OF STOCK
                            </span>
                          ) : item.stockLevel <= item.reorderPoint ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              LOW STOCK ALERT
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              OPTIMAL LEVEL
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleOpenAdjustModal(item)}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                          >
                            <ArrowUpDown size={13} /> Adjust
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MOVEMENTS AUDIT LOG */}
        {selectedTab === 'MOVEMENTS' && (
          <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl overflow-hidden shadow-xl min-h-[300px]">
            {movementsLoading ? (
              <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
                <Loader2 className="animate-spin mb-2" size={32} />
                <p className="text-sm">Loading inventory movements ledger...</p>
              </div>
            ) : filteredMovements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
                <History size={48} className="mb-4 opacity-20" />
                <p className="text-base font-bold">No movement records recorded yet</p>
                <p className="text-xs max-w-xs text-center mt-1">Movements are automatically logged on POS sales, returns, and inventory write-offs.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800/80 text-[10px] uppercase tracking-wider text-zinc-400 font-bold bg-zinc-50/50 dark:bg-zinc-900/20">
                      <th className="py-4 px-6">Timestamp</th>
                      <th className="py-4 px-4">Item & SKU</th>
                      <th className="py-4 px-4">Movement Event</th>
                      <th className="py-4 px-4">Location</th>
                      <th className="py-4 px-4">Quantity Delta</th>
                      <th className="py-4 px-6 text-right">Unit Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                    {filteredMovements.map(m => (
                      <tr key={m.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="py-4 px-6 text-xs text-zinc-400 font-mono">
                          {new Date(m.createdAt).toLocaleString()}
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-xs font-bold text-white">{m.catalogItem?.name || 'Catalog Item'}</p>
                          <span className="text-[10px] font-mono text-zinc-500">{m.catalogItem?.code}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            m.quantityDelta > 0 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {m.quantityDelta > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                            {m.movementType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-xs font-mono text-zinc-300">
                          {m.location?.code || 'MAIN'}
                        </td>
                        <td className="py-4 px-4 text-sm font-bold">
                          <span className={m.quantityDelta > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right text-xs font-mono text-zinc-400">
                          ${Number(m.unitCost).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: LOCATIONS */}
        {selectedTab === 'LOCATIONS' && (
          <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl overflow-hidden shadow-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map(loc => (
                <div key={loc.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                      <Warehouse size={20} />
                    </div>
                    {loc.isDefault && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        DEFAULT SITE
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{loc.name}</h4>
                    <p className="text-xs font-mono text-zinc-400 mt-0.5">Code: {loc.code}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal: Adjust / Write-Off Stock */}
        <Modal
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          title="Stock Adjustment & Perpetual GL Write-Off"
        >
          <form onSubmit={handleExecuteAdjustment} className="space-y-4 py-2 text-left">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Catalog Item</label>
              <select
                value={adjustFormData.catalogItemId}
                onChange={e => {
                  const itm = items.find(i => i.id === e.target.value);
                  setAdjustFormData({
                    ...adjustFormData,
                    catalogItemId: e.target.value,
                    variantId: itm?.variants?.[0]?.id || '',
                    unitCost: itm?.variants?.[0]?.unitCost || 10
                  });
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
                required
              >
                {items.map(item => (
                  <option key={item.id} value={item.id}>{item.name} ({item.code}) - On Hand: {item.stockLevel}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Adjustment Movement Type</label>
                <select
                  value={adjustFormData.movementType}
                  onChange={e => setAdjustFormData({ ...adjustFormData, movementType: e.target.value as any })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
                >
                  <option value="ADJUSTMENT_WRITE_OFF">Write-Off (Damaged / Spoiled Stock)</option>
                  <option value="SHRINKAGE">Shrinkage (Missing Stock / Theft)</option>
                  <option value="PURCHASE_RECEIPT">Purchase Receipt (Stock Inbound)</option>
                  <option value="TRANSFER_IN">Transfer Inbound</option>
                  <option value="TRANSFER_OUT">Transfer Outbound</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Storage Location</label>
                <select
                  value={adjustFormData.locationId}
                  onChange={e => setAdjustFormData({ ...adjustFormData, locationId: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name} ({loc.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input 
                label="Adjustment Quantity" 
                type="number"
                min="1"
                value={adjustFormData.quantityDelta}
                onChange={e => setAdjustFormData({ ...adjustFormData, quantityDelta: Number(e.target.value) })}
                required
              />
              <Input 
                label="Unit Cost ($ AUD)" 
                type="number"
                step="0.01"
                value={adjustFormData.unitCost}
                onChange={e => setAdjustFormData({ ...adjustFormData, unitCost: Number(e.target.value) })}
                required
              />
            </div>

            <Input 
              label="Audit Note / Reason" 
              placeholder="e.g. Expired shelf goods or cycle count variance"
              value={adjustFormData.notes}
              onChange={e => setAdjustFormData({ ...adjustFormData, notes: e.target.value })}
            />

            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Post to General Ledger</p>
                <p className="text-[11px] text-zinc-400">Debits 5050 Shrinkage and credits 1020 Inventory Asset in real time.</p>
              </div>
              <input 
                type="checkbox"
                checked={adjustFormData.postToGeneralLedger}
                onChange={e => setAdjustFormData({ ...adjustFormData, postToGeneralLedger: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded bg-zinc-950 border-zinc-700"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button variant="ghost" type="button" onClick={() => setIsAdjustModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-amber-600 hover:bg-amber-500 text-white">
                {saving ? 'Posting...' : 'Commit Movement'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Create Location */}
        <Modal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          title="Add New Inventory Location"
        >
          <form onSubmit={handleCreateLocation} className="space-y-4 py-2 text-left">
            <Input 
              label="Location Name"
              placeholder="e.g. Secondary Warehouse B"
              value={locationFormData.name}
              onChange={e => setLocationFormData({ ...locationFormData, name: e.target.value })}
              required
            />
            <Input 
              label="Location Code"
              placeholder="e.g. WH-02"
              value={locationFormData.code}
              onChange={e => setLocationFormData({ ...locationFormData, code: e.target.value.toUpperCase().replace(/\s+/g, '-') })}
              required
            />
            <div className="flex items-center gap-2">
              <input 
                type="checkbox"
                id="isDef"
                checked={locationFormData.isDefault}
                onChange={e => setLocationFormData({ ...locationFormData, isDefault: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded bg-zinc-950 border-zinc-700"
              />
              <label htmlFor="isDef" className="text-xs text-zinc-300">Set as default fulfillment storefront</label>
            </div>
            <div className="flex justify-end gap-3 pt-3">
              <Button variant="ghost" type="button" onClick={() => setIsLocationModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Creating...' : 'Create Location'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </SettingsSubNavLayout>
  );
};
