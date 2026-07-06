import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Package, 
  Clock, 
  DollarSign, 
  Loader2
} from 'lucide-react';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { API_BASE_URL } from '../../../config';
import { Modal } from '../../../components/UI/TabsAndModal';
import { Button, Input } from '../../../components/UI/Primitives';
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
  billingInterval: 'day' | 'week' | 'month' | 'year' | null;
  billingIntervalCount: number | null;
  billingBlockMinutes: number | null;
  trackInventory: boolean;
  stockLevel: number;
  reorderPoint: number;
  metadata: any;
  status: 'active' | 'draft' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export const PricingCatalogSettings = () => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { tenant } = usePlatform();
  const { session } = useAuth();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'PRODUCT' as CatalogItem['type'],
    description: '',
    priceType: 'FLAT' as CatalogItem['priceType'],
    basePrice: 0,
    currency: 'AUD',
    billingInterval: '' as string,
    billingIntervalCount: 1,
    billingBlockMinutes: 15,
    trackInventory: false,
    stockLevel: 0,
    reorderPoint: 0,
    metadataStr: '{}',
    status: 'active' as CatalogItem['status'],
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
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
        setItems(data);
      } else {
        toast.error(data.error || 'Failed to load catalog');
      }
    } catch (err) {
      console.error('Failed to fetch pricing catalog:', err);
      toast.error('Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item?: CatalogItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        code: item.code,
        type: item.type,
        description: item.description || '',
        priceType: item.priceType,
        basePrice: item.basePrice,
        currency: item.currency,
        billingInterval: item.billingInterval || '',
        billingIntervalCount: item.billingIntervalCount || 1,
        billingBlockMinutes: item.billingBlockMinutes || 15,
        trackInventory: item.trackInventory,
        stockLevel: item.stockLevel,
        reorderPoint: item.reorderPoint,
        metadataStr: JSON.stringify(item.metadata || {}, null, 2),
        status: item.status,
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        code: '',
        type: 'PRODUCT',
        description: '',
        priceType: 'FLAT',
        basePrice: 0,
        currency: 'AUD',
        billingInterval: '',
        billingIntervalCount: 1,
        billingBlockMinutes: 15,
        trackInventory: false,
        stockLevel: 0,
        reorderPoint: 0,
        metadataStr: '{}',
        status: 'active',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let metadata = {};
      try {
        metadata = JSON.parse(formData.metadataStr);
      } catch (err) {
        toast.error('Invalid JSON structure in Custom Metadata');
        setSaving(false);
        return;
      }

      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const method = editingItem ? 'PUT' : 'POST';
      const url = editingItem 
        ? `${API_BASE_URL}/api/pricing-catalog/${editingItem.id}` 
        : `${API_BASE_URL}/api/pricing-catalog`;

      const payload = {
        name: formData.name,
        code: formData.code.toUpperCase().replace(/\s+/g, '-'),
        type: formData.type,
        description: formData.description || null,
        priceType: formData.priceType,
        basePrice: Number(formData.basePrice),
        currency: formData.currency,
        billingInterval: formData.type === 'RECURRING' ? (formData.billingInterval || 'month') : null,
        billingIntervalCount: formData.type === 'RECURRING' ? Number(formData.billingIntervalCount) : null,
        billingBlockMinutes: formData.type === 'SERVICE' && formData.priceType === 'TIME' ? Number(formData.billingBlockMinutes) : null,
        trackInventory: formData.type === 'PRODUCT' ? formData.trackInventory : false,
        stockLevel: formData.type === 'PRODUCT' && formData.trackInventory ? Number(formData.stockLevel) : 0,
        reorderPoint: formData.type === 'PRODUCT' && formData.trackInventory ? Number(formData.reorderPoint) : 0,
        metadata,
        status: formData.status,
      };

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Catalog item ${editingItem ? 'updated' : 'created'} successfully`);
        setIsModalOpen(false);
        fetchItems();
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this catalog item? This cannot be undone.')) return;

    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/pricing-catalog/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        }
      });

      if (res.ok) {
        toast.success('Catalog item deleted');
        fetchItems();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Filter logic
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = selectedTypeFilter === 'ALL' || item.type === selectedTypeFilter;
    return matchesSearch && matchesType;
  });

  // KPI Computations
  const totalCount = items.length;
  const lowStockCount = items.filter(i => i.type === 'PRODUCT' && i.trackInventory && i.stockLevel <= i.reorderPoint).length;
  const subscriptionCount = items.filter(i => i.type === 'RECURRING').length;
  const servicesFeesCount = items.filter(i => i.type === 'SERVICE' || i.type === 'FEE' || i.type === 'FINE').length;

  return (
    <div className="space-y-6 text-left">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
            <Tag size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Catalog Items</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${lowStockCount > 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500' : 'bg-zinc-100 dark:bg-white/5 text-zinc-455'}`}>
            <Package size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Low Stock Alerts</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{lowStockCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-2xl flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Recurring & Subs</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{subscriptionCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-pink-500/10 text-pink-600 dark:text-pink-400 rounded-2xl flex items-center justify-center">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Services, Fees & Fines</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{servicesFeesCount}</p>
          </div>
        </div>
      </div>

      {/* List Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/40 dark:bg-zinc-900/20 backdrop-blur-xl p-4 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="text"
              placeholder="Search name, code, SKU..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {['ALL', 'PRODUCT', 'SERVICE', 'FEE', 'RECURRING', 'FINE'].map(type => (
            <button
              key={type}
              onClick={() => setSelectedTypeFilter(type)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                selectedTypeFilter === type 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 border border-zinc-200/50 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:text-zinc-800 dark:hover:text-white font-semibold'
              }`}
            >
              {type === 'RECURRING' ? 'SUBS' : type}
            </button>
          ))}
          
          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all shadow-md shadow-indigo-500/10"
          >
            <Plus size={16} />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Catalog Items Table */}
      <div className="bg-white dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm min-h-[300px] relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p className="text-sm">Loading Pricing Catalog...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-zinc-450">
            <Tag size={48} className="mb-4 opacity-20" />
            <p className="text-base font-bold">No catalog items found</p>
            <p className="text-xs max-w-xs text-center mt-1">Try refining your search or add a new pricing catalog item to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800/80 text-[10px] uppercase tracking-wider text-zinc-400 font-bold bg-zinc-50/50 dark:bg-zinc-900/20">
                  <th className="py-4 px-6">Name & SKU</th>
                  <th className="py-4 px-4">Type</th>
                  <th className="py-4 px-4">Structure & Rate</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <p className="text-sm font-bold text-zinc-900 dark:text-white leading-snug">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-md uppercase">
                            {item.code}
                          </span>
                          {item.description && (
                            <span className="text-[11px] text-zinc-450 truncate max-w-[240px] md:max-w-[400px]">
                              • {item.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        item.type === 'PRODUCT' ? 'bg-blue-500/5 border-blue-500/20 text-blue-600 dark:text-blue-400' :
                        item.type === 'SERVICE' ? 'bg-purple-500/5 border-purple-500/20 text-purple-600 dark:text-purple-400' :
                        item.type === 'FEE' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                        item.type === 'RECURRING' ? 'bg-teal-500/5 border-teal-500/20 text-teal-600 dark:text-teal-400' :
                        'bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-455'
                      }`}>
                        {item.type === 'RECURRING' ? 'SUBSCRIPTION' : item.type}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm font-bold text-zinc-800 dark:text-zinc-200">
                      <div>
                        <span>{new Intl.NumberFormat('en-AU', { style: 'currency', currency: item.currency }).format(item.basePrice)}</span>
                        <span className="text-xs text-zinc-450 font-semibold ml-1">
                          {item.type === 'SERVICE' && item.priceType === 'TIME' ? `/ ${item.billingBlockMinutes || 15} mins` :
                           item.type === 'RECURRING' ? `/ ${item.billingIntervalCount && item.billingIntervalCount > 1 ? item.billingIntervalCount + ' ' : ''}${item.billingInterval}` :
                           item.priceType === 'UNIT' ? '/ unit' : 'Flat Fee'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                        item.status === 'active' ? 'bg-green-500' :
                        item.status === 'draft' ? 'bg-zinc-400' : 'bg-red-500'
                      }`} />
                      <span className="text-xs capitalize text-zinc-550">{item.status}</span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => handleOpenModal(item)}
                          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl text-zinc-400 hover:text-indigo-500 transition-colors"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-red-550/10 rounded-xl text-zinc-400 hover:text-red-555 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Item Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Catalog Item' : 'Register New Pricing Item'}
      >
        <form onSubmit={handleSave} className="space-y-5 py-4 text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input 
              label="Item Name" 
              placeholder="e.g. Senior Partner Consulting" 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input 
              label="SKU / Unique Code" 
              placeholder="e.g. SRV-CONS-01" 
              value={formData.code} 
              onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '-') })}
              required
              disabled={!!editingItem}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Catalog Type</label>
              <select
                value={formData.type}
                onChange={e => {
                  const newType = e.target.value as CatalogItem['type'];
                  const priceType = 
                    newType === 'PRODUCT' ? 'UNIT' :
                    newType === 'SERVICE' ? 'TIME' : 'FLAT';
                  setFormData({ ...formData, type: newType, priceType });
                }}
                className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-zinc-900 dark:text-white"
              >
                <option value="PRODUCT" className="bg-white text-zinc-900 dark:bg-zinc-950 dark:text-white">PRODUCT (Physical/Digital Item)</option>
                <option value="SERVICE" className="bg-white text-zinc-900 dark:bg-zinc-955 dark:text-white">SERVICE (Billed Time/Labor)</option>
                <option value="FEE" className="bg-white text-zinc-900 dark:bg-zinc-950 dark:text-white">FEE (Procedural Lodgment/Access charge)</option>
                <option value="RECURRING" className="bg-white text-zinc-900 dark:bg-zinc-950 dark:text-white">RECURRING (Subscription/Retainer/Annual fee)</option>
                <option value="FINE" className="bg-white text-zinc-900 dark:bg-zinc-950 dark:text-white">FINE (Penalty/Late citation charge)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Pricing Structure</label>
              <select
                value={formData.priceType}
                onChange={e => setFormData({ ...formData, priceType: e.target.value as CatalogItem['priceType'] })}
                className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-zinc-900 dark:text-white"
              >
                <option value="FLAT" className="bg-white text-zinc-900 dark:bg-zinc-950 dark:text-white">FLAT (Fixed cost item)</option>
                <option value="UNIT" className="bg-white text-zinc-900 dark:bg-zinc-950 dark:text-white">UNIT (Quantity-based scale)</option>
                <option value="TIME" className="bg-white text-zinc-900 dark:bg-zinc-950 dark:text-white">TIME (Duration billing schedule)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input 
              label="Base Rate / Cost" 
              type="number"
              step="0.01"
              placeholder="0.00" 
              value={formData.basePrice} 
              onChange={e => setFormData({ ...formData, basePrice: Number(e.target.value) })}
              required
            />
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Currency</label>
              <select
                value={formData.currency}
                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-zinc-900 dark:text-white"
              >
                <option value="AUD" className="bg-white text-zinc-900 dark:bg-zinc-955 dark:text-white">AUD ($)</option>
                <option value="USD" className="bg-white text-zinc-900 dark:bg-zinc-955 dark:text-white">USD ($)</option>
                <option value="EUR" className="bg-white text-zinc-900 dark:bg-zinc-955 dark:text-white">EUR (€)</option>
                <option value="GBP" className="bg-white text-zinc-900 dark:bg-zinc-955 dark:text-white">GBP (£)</option>
                <option value="NZD" className="bg-white text-zinc-900 dark:bg-zinc-955 dark:text-white">NZD ($)</option>
              </select>
            </div>
          </div>

          {formData.type === 'SERVICE' && formData.priceType === 'TIME' && (
            <div className="space-y-1">
              <Input 
                label="Billing Block (Minutes)" 
                type="number"
                placeholder="e.g. 15 for 15-minute blocks" 
                value={formData.billingBlockMinutes} 
                onChange={e => setFormData({ ...formData, billingBlockMinutes: Number(e.target.value) })}
                required
              />
            </div>
          )}

          {formData.type === 'RECURRING' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Recurrence Cycle</label>
                <select
                  value={formData.billingInterval}
                  onChange={e => setFormData({ ...formData, billingInterval: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-zinc-900 dark:text-white"
                  required
                >
                  <option value="month" className="bg-white text-zinc-900 dark:bg-zinc-950 dark:text-white">Monthly</option>
                  <option value="year" className="bg-white text-zinc-900 dark:bg-zinc-955 dark:text-white">Annually</option>
                  <option value="week" className="bg-white text-zinc-900 dark:bg-zinc-955 dark:text-white">Weekly</option>
                  <option value="day" className="bg-white text-zinc-900 dark:bg-zinc-955 dark:text-white">Daily</option>
                </select>
              </div>
              <Input 
                label="Cycle Interval Frequency" 
                type="number"
                placeholder="e.g. 1 for every cycle, 3 for quarterly" 
                value={formData.billingIntervalCount} 
                onChange={e => setFormData({ ...formData, billingIntervalCount: Number(e.target.value) })}
                required
              />
            </div>
          )}

          {formData.type === 'PRODUCT' && (
            <div className="space-y-4 bg-zinc-50 dark:bg-white/5 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-800/80">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200">Track Stock Inventory</p>
                  <p className="text-[11px] text-zinc-450">Enable real-time warnings when quantities drop below limit.</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.trackInventory}
                  onChange={e => setFormData({ ...formData, trackInventory: e.target.checked })}
                  className="w-4 h-4 text-indigo-650 border-zinc-300 rounded focus:ring-indigo-500/20"
                />
              </div>

              {formData.trackInventory && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <Input 
                    label="Current Stock Level" 
                    type="number"
                    value={formData.stockLevel} 
                    onChange={e => setFormData({ ...formData, stockLevel: Number(e.target.value) })}
                  />
                  <Input 
                    label="Reorder Threshold" 
                    type="number"
                    value={formData.reorderPoint} 
                    onChange={e => setFormData({ ...formData, reorderPoint: Number(e.target.value) })}
                  />
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Item Description</label>
            <textarea 
              className="w-full bg-zinc-50 dark:bg-white/5 dark:backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              rows={2}
              placeholder="Enter brief description of this pricing element..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Custom Metadata (JSON)</label>
            <textarea 
              className="w-full bg-zinc-50 dark:bg-white/5 dark:backdrop-blur-md border border-zinc-205 dark:border-zinc-800 rounded-2xl p-4 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              rows={3}
              placeholder='{"key": "value"}'
              value={formData.metadataStr}
              onChange={e => setFormData({ ...formData, metadataStr: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Lifecycle Status</label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-zinc-900 dark:text-white"
            >
              <option value="active" className="bg-white text-zinc-900 dark:bg-zinc-950 dark:text-white">Active (Available for API queries)</option>
              <option value="draft" className="bg-white text-zinc-900 dark:bg-zinc-950 dark:text-white">Draft (Private, not queryable)</option>
              <option value="archived" className="bg-white text-zinc-900 dark:bg-zinc-950 dark:text-white">Archived (Deprecating SKU)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Item'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
