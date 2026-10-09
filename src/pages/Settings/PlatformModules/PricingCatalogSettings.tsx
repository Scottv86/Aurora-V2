import React, { useState, useEffect, useMemo } from 'react';
import { 
  Tag, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Package, 
  Clock, 
  DollarSign, 
  Loader2,
  RefreshCw,
  Gift,
  Barcode,
  Layers,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Image as ImageIcon,
  Upload,
  X,
  Folder,
  FolderPlus,
  FolderMinus,
  Check,
  CheckSquare,
  Square,
  ArrowRight
} from 'lucide-react';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { API_BASE_URL } from '../../../config';
import { Modal } from '../../../components/UI/TabsAndModal';
import { Button, Input } from '../../../components/UI/Primitives';
import { SettingsSubNavLayout, SettingsSubNavItem } from '../../../components/Settings/SettingsSubNavLayout';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

interface CatalogVariant {
  id?: string;
  sku: string;
  barcode?: string | null;
  title: string;
  priceOverride?: number | null;
  unitCost?: number;
  attributes?: any;
}

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
  defaultTaxRateId?: string | null;
  revenueAccountId?: string | null;
  cogsAccountId?: string | null;
  inventoryAssetAccountId?: string | null;
  variants?: CatalogVariant[];
  metadata: any;
  status: 'active' | 'draft' | 'archived';
  createdAt: string;
  updatedAt: string;
}

interface VoucherRecord {
  id: string;
  code: string;
  type: 'GIFT_CARD' | 'DISCOUNT_PROMO' | 'STORE_CREDIT';
  status: 'ACTIVE' | 'DEPLETED' | 'EXPIRED' | 'REVOKED';
  initialBalance: number;
  currentBalance: number;
  discountPercent?: number | null;
  currency: string;
  expiresAt?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface TaxRateOption {
  id: string;
  code: string;
  name: string;
  rate: number;
}

export const PricingCatalogSettings = () => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [vouchers, setVouchers] = useState<VoucherRecord[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRateOption[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { tenant } = usePlatform();
  const { session } = useAuth();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({});

  // Computed distinct categories across all catalog items
  const distinctCategories = useMemo(() => {
    const cats = new Set<string>();
    items.forEach(i => {
      const c = i.metadata?.category?.trim();
      if (c) cats.add(c);
    });
    return Array.from(cats).sort((a, b) => a.localeCompare(b));
  }, [items]);

  // Category Manager Modal State
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [renamingCategory, setRenamingCategory] = useState<{ old: string; new: string } | null>(null);
  const [categoryActionLoading, setCategoryActionLoading] = useState(false);

  // Dedicated Category Tab State
  const [selectedCategoryInTab, setSelectedCategoryInTab] = useState<string>('');
  const [categoryListSearch, setCategoryListSearch] = useState<string>('');
  const [categoryItemsSearch, setCategoryItemsSearch] = useState<string>('');
  const [selectedItemIdsInWorkspace, setSelectedItemIdsInWorkspace] = useState<string[]>([]);
  const [isAssignItemsModalOpen, setIsAssignItemsModalOpen] = useState(false);
  const [itemIdsToAssignChecklist, setItemIdsToAssignChecklist] = useState<string[]>([]);
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  const [assignTypeFilter, setAssignTypeFilter] = useState<string>('ALL');
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
  const [newCategoryNameInput, setNewCategoryNameInput] = useState('');

  // Catalog Item Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);

  // Voucher Modal State
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [voucherFormData, setVoucherFormData] = useState({
    code: '',
    type: 'GIFT_CARD' as 'GIFT_CARD' | 'DISCOUNT_PROMO' | 'STORE_CREDIT',
    initialBalance: 50,
    discountPercent: 10,
    currency: 'AUD',
    expiresAt: '',
    notes: '',
  });
  
  // Item Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: '',
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
    defaultTaxRateId: '',
    revenueAccountId: '',
    cogsAccountId: '',
    inventoryAssetAccountId: '',
    metadataStr: '{}',
    imageUrl: '',
    status: 'active' as CatalogItem['status'],
    variants: [] as CatalogVariant[],
  });

  const getAuthHeaders = () => {
    const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
    return {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenant?.id || ''
    };
  };

  useEffect(() => {
    fetchItems();
    fetchFinancialMeta();
  }, [tenant?.id]);

  useEffect(() => {
    if (selectedTypeFilter === 'VOUCHERS') {
      fetchVouchers();
    }
  }, [selectedTypeFilter]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/pricing-catalog`, {
        headers: getAuthHeaders()
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

  const fetchFinancialMeta = async () => {
    try {
      const [accRes, taxRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/finance/chart-of-accounts`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/api/finance/tax-rates`, { headers: getAuthHeaders() })
      ]);
      if (accRes.ok) {
        const accData = await accRes.json();
        setAccounts(accData);
      }
      if (taxRes.ok) {
        const taxData = await taxRes.json();
        setTaxRates(taxData);
      }
    } catch (err) {
      console.error('Failed to load accounts/tax metadata:', err);
    }
  };

  const fetchVouchers = async () => {
    try {
      setVouchersLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/vouchers`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        setVouchers(data);
      } else {
        toast.error(data.error || 'Failed to load vouchers');
      }
    } catch (err) {
      console.error('Failed to fetch vouchers:', err);
      toast.error('Failed to connect to vouchers API');
    } finally {
      setVouchersLoading(false);
    }
  };

  const handleRenameCategory = async (oldCategory: string, newCategory: string) => {
    if (!newCategory.trim() || newCategory.trim().toLowerCase() === oldCategory.toLowerCase()) {
      setRenamingCategory(null);
      return;
    }
    try {
      setCategoryActionLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/pricing-catalog/manage-category`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'rename',
          oldCategory,
          newCategory: newCategory.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Category renamed to "${newCategory.trim()}" across ${data.updatedCount} item(s)`);
        setRenamingCategory(null);
        if (formData.category.trim().toLowerCase() === oldCategory.toLowerCase()) {
          setFormData(prev => ({ ...prev, category: newCategory.trim() }));
        }
        await fetchItems();
      } else {
        toast.error(data.error || 'Failed to rename category');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error renaming category');
    } finally {
      setCategoryActionLoading(false);
    }
  };

  const handleDeleteCategory = async (category: string) => {
    const matchingCount = items.filter(i => (i.metadata?.category || '').trim().toLowerCase() === category.toLowerCase()).length;
    if (!window.confirm(`Are you sure you want to delete the category "${category}"? It will be removed from ${matchingCount} item(s).`)) {
      return;
    }
    try {
      setCategoryActionLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/pricing-catalog/manage-category`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'delete',
          category
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Category "${category}" removed from ${data.updatedCount} item(s)`);
        if (formData.category.trim().toLowerCase() === category.toLowerCase()) {
          setFormData(prev => ({ ...prev, category: '' }));
        }
        await fetchItems();
      } else {
        toast.error(data.error || 'Failed to delete category');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting category');
    } finally {
      setCategoryActionLoading(false);
    }
  };

  const handleCreateNewCategory = async () => {
    const trimmed = newCategoryNameInput.trim();
    if (!trimmed) {
      toast.error('Category name cannot be empty');
      return;
    }
    const exists = distinctCategories.some(c => c.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      toast.error(`Category "${trimmed}" already exists`);
      setSelectedCategoryInTab(trimmed);
      setIsCreateCategoryModalOpen(false);
      return;
    }

    // Set as active category in tab and open assign modal immediately
    setSelectedCategoryInTab(trimmed);
    setIsCreateCategoryModalOpen(false);
    setNewCategoryNameInput('');
    setItemIdsToAssignChecklist([]);
    setIsAssignItemsModalOpen(true);
    toast.success(`Category "${trimmed}" created! Select items to assign.`);
  };

  const handleBulkAssign = async (targetCat: string, itemIds: string[]) => {
    if (!targetCat.trim() || itemIds.length === 0) return;
    try {
      setCategoryActionLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/pricing-catalog/manage-category`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'assign-items',
          category: targetCat.trim(),
          itemIds
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Assigned ${data.updatedCount} item(s) to "${targetCat.trim()}"`);
        setIsAssignItemsModalOpen(false);
        setSelectedItemIdsInWorkspace([]);
        setItemIdsToAssignChecklist([]);
        await fetchItems();
      } else {
        toast.error(data.error || 'Failed to assign items');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error assigning items');
    } finally {
      setCategoryActionLoading(false);
    }
  };

  const handleBulkRemoveFromCategory = async (itemIds: string[]) => {
    if (itemIds.length === 0) return;
    try {
      setCategoryActionLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/pricing-catalog/manage-category`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'remove-items',
          itemIds
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Removed category from ${data.updatedCount} item(s)`);
        setSelectedItemIdsInWorkspace([]);
        await fetchItems();
      } else {
        toast.error(data.error || 'Failed to remove category from items');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error removing items from category');
    } finally {
      setCategoryActionLoading(false);
    }
  };

  const handleSingleItemCategoryChange = async (itemId: string, newCategory: string) => {
    if (!newCategory || newCategory === 'UNCATEGORIZED') {
      await handleBulkRemoveFromCategory([itemId]);
    } else {
      await handleBulkAssign(newCategory, [itemId]);
    }
  };

  const handleOpenModal = (item?: CatalogItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        code: item.code,
        category: item.metadata?.category || '',
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
        defaultTaxRateId: item.defaultTaxRateId || '',
        revenueAccountId: item.revenueAccountId || '',
        cogsAccountId: item.cogsAccountId || '',
        inventoryAssetAccountId: item.inventoryAssetAccountId || '',
        metadataStr: JSON.stringify(item.metadata || {}, null, 2),
        imageUrl: item.metadata?.imageUrl || '',
        status: item.status,
        variants: item.variants ? [...item.variants] : [],
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        code: '',
        category: '',
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
        defaultTaxRateId: taxRates[0]?.id || '',
        revenueAccountId: accounts.find(a => a.type === 'REVENUE')?.id || '',
        cogsAccountId: accounts.find(a => a.type === 'EXPENSE')?.id || '',
        inventoryAssetAccountId: accounts.find(a => a.type === 'ASSET')?.id || '',
        metadataStr: '{}',
        imageUrl: '',
        status: 'active',
        variants: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleAddVariant = () => {
    const baseCode = formData.code || 'VAR';
    const index = formData.variants.length + 1;
    setFormData(prev => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          sku: `${baseCode}-V${index}`,
          barcode: '',
          title: `Option ${index}`,
          priceOverride: null,
          unitCost: 0,
        }
      ]
    }));
  };

  const handleRemoveVariant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter((_, idx) => idx !== index)
    }));
  };

  const handleVariantChange = (index: number, field: keyof CatalogVariant, value: any) => {
    setFormData(prev => {
      const nextVariants = [...prev.variants];
      nextVariants[index] = { ...nextVariants[index], [field]: value };
      return { ...prev, variants: nextVariants };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let metadata: any = {};
      try {
        metadata = JSON.parse(formData.metadataStr);
      } catch (err) {
        toast.error('Invalid JSON structure in Custom Metadata');
        setSaving(false);
        return;
      }
      if (formData.imageUrl && formData.imageUrl.trim()) {
        metadata = { ...metadata, imageUrl: formData.imageUrl.trim() };
      } else if (metadata.imageUrl) {
        delete metadata.imageUrl;
      }

      if (formData.category && formData.category.trim()) {
        metadata = { ...metadata, category: formData.category.trim() };
      } else if (metadata.category) {
        delete metadata.category;
      }

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
        defaultTaxRateId: formData.defaultTaxRateId || null,
        revenueAccountId: formData.revenueAccountId || null,
        cogsAccountId: formData.cogsAccountId || null,
        inventoryAssetAccountId: formData.inventoryAssetAccountId || null,
        variants: formData.variants.map(v => ({
          id: v.id,
          sku: v.sku.toUpperCase().trim(),
          barcode: v.barcode ? v.barcode.trim() : null,
          title: v.title.trim(),
          priceOverride: v.priceOverride !== null && v.priceOverride !== undefined && v.priceOverride !== ('' as any) ? Number(v.priceOverride) : null,
          unitCost: Number(v.unitCost || 0),
        })),
        metadata,
        status: formData.status,
      };

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Catalog item ${editingItem ? 'updated' : 'created'} successfully`);
        setIsModalOpen(false);
        fetchItems();
      } else {
        throw new Error(data.error || 'Failed to save item');
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
      const res = await fetch(`${API_BASE_URL}/api/pricing-catalog/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
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

  const handleIssueVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/vouchers/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          type: voucherFormData.type,
          initialBalance: Number(voucherFormData.initialBalance),
          discountPercent: voucherFormData.type === 'DISCOUNT_PROMO' ? Number(voucherFormData.discountPercent) : null,
          currency: voucherFormData.currency,
          expiresAt: voucherFormData.expiresAt ? new Date(voucherFormData.expiresAt).toISOString() : null,
          code: voucherFormData.code ? voucherFormData.code.toUpperCase().trim() : undefined,
          notes: voucherFormData.notes || null,
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Voucher issued: ${data.code}`);
        setIsVoucherModalOpen(false);
        setVoucherFormData({
          code: '',
          type: 'GIFT_CARD',
          initialBalance: 50,
          discountPercent: 10,
          currency: 'AUD',
          expiresAt: '',
          notes: '',
        });
        fetchVouchers();
      } else {
        throw new Error(data.error || 'Failed to issue voucher');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleRowExpanded = (id: string) => {
    setExpandedItemIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter logic
  const filteredItems = items.filter(item => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q ||
      item.name.toLowerCase().includes(q) || 
      item.code.toLowerCase().includes(q) ||
      ((item.metadata?.category || '').toLowerCase().includes(q)) ||
      (item.variants && item.variants.some(v => v.sku.toLowerCase().includes(q) || (v.barcode && v.barcode.includes(q)))) ||
      (item.description && item.description.toLowerCase().includes(q));
    
    const matchesType = selectedTypeFilter === 'ALL' || item.type === selectedTypeFilter;
    const matchesCategory = selectedCategoryFilter === 'ALL' || (item.metadata?.category?.trim() || '') === selectedCategoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  });

  const filteredVouchers = vouchers.filter(v => {
    return v.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.notes && v.notes.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const uncategorizedItems = useMemo(() => {
    return items.filter(i => !(i.metadata?.category?.trim()));
  }, [items]);

  const activeCategoryItems = useMemo(() => {
    let list: CatalogItem[] = [];
    if (selectedCategoryInTab === 'UNCATEGORIZED') {
      list = uncategorizedItems;
    } else if (selectedCategoryInTab) {
      list = items.filter(i => (i.metadata?.category?.trim() || '').toLowerCase() === selectedCategoryInTab.toLowerCase());
    } else if (distinctCategories.length > 0) {
      list = items.filter(i => (i.metadata?.category?.trim() || '').toLowerCase() === distinctCategories[0].toLowerCase());
    } else {
      list = items;
    }

    if (categoryItemsSearch.trim()) {
      const q = categoryItemsSearch.toLowerCase().trim();
      list = list.filter(i => 
        i.name.toLowerCase().includes(q) || 
        i.code.toLowerCase().includes(q) ||
        (i.description && i.description.toLowerCase().includes(q))
      );
    }
    return list;
  }, [items, selectedCategoryInTab, distinctCategories, uncategorizedItems, categoryItemsSearch]);

  // Ensure active category in tab defaults nicely
  useEffect(() => {
    if (!selectedCategoryInTab && distinctCategories.length > 0) {
      setSelectedCategoryInTab(distinctCategories[0]);
    }
  }, [distinctCategories, selectedCategoryInTab]);

  // KPI Computations
  const totalCount = items.length;
  const lowStockCount = items.filter(i => i.type === 'PRODUCT' && i.trackInventory && i.stockLevel <= i.reorderPoint).length;
  const activeVouchersCount = vouchers.filter(v => v.status === 'ACTIVE').length;
  const servicesFeesCount = items.filter(i => i.type === 'SERVICE' || i.type === 'FEE' || i.type === 'FINE').length;

  const subNavItems: SettingsSubNavItem[] = [
    { id: 'ALL', label: 'All Catalog Items', icon: Tag, description: 'Complete rate registry' },
    { id: 'PRODUCT', label: 'Products & Inventory', icon: Package, description: 'Physical/digital items & variants' },
    { id: 'SERVICE', label: 'Services & Labor', icon: Clock, description: 'Time & duration rates' },
    { id: 'FEE', label: 'Fees & Fines', icon: DollarSign, description: 'Procedural charges' },
    { id: 'RECURRING', label: 'Subscriptions', icon: RefreshCw, description: 'Recurring retainers' },
    { id: 'CATEGORIES', label: 'Categories & Depts', icon: Folder, description: `Organize into ${distinctCategories.length} categories` },
    { id: 'VOUCHERS', label: 'Vouchers & Gift Cards', icon: Gift, description: 'Stored-value cards & discount promos' }
  ];

  return (
    <SettingsSubNavLayout
      title="Pricing Catalog & Vouchers"
      description="Centralized registry of products, matrix variants, service rates, procedural fees, and stored-value gift vouchers."
      icon={Tag}
      items={subNavItems}
      activeId={selectedTypeFilter}
      onTabChange={setSelectedTypeFilter}
      actions={
        <div className="flex items-center gap-2">
          {selectedTypeFilter === 'VOUCHERS' ? (
            <Button 
              onClick={() => setIsVoucherModalOpen(true)} 
              className="gap-2 font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-500/20"
            >
              <Plus size={16} /> Issue Gift Card / Voucher
            </Button>
          ) : selectedTypeFilter === 'CATEGORIES' ? (
            <Button
              onClick={() => {
                setNewCategoryNameInput('');
                setIsCreateCategoryModalOpen(true);
              }}
              className="gap-2 font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
            >
              <FolderPlus size={16} /> New Category
            </Button>
          ) : (
            <Button 
              onClick={() => handleOpenModal()} 
              className="gap-2 font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
            >
              <Plus size={16} /> Add Catalog Item
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
              {selectedTypeFilter === 'CATEGORIES' ? <Folder size={24} /> : <Tag size={24} />}
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {selectedTypeFilter === 'CATEGORIES' ? 'Departments / Cats' : 'Catalog SKUs'}
              </p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
                {selectedTypeFilter === 'CATEGORIES' ? distinctCategories.length : totalCount}
              </p>
            </div>
          </div>

          <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", selectedTypeFilter === 'CATEGORIES' ? "bg-emerald-500/10 text-emerald-400" : (lowStockCount > 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500' : 'bg-zinc-100 dark:bg-white/5 text-zinc-400'))}>
              {selectedTypeFilter === 'CATEGORIES' ? <CheckSquare size={24} /> : <Package size={24} />}
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {selectedTypeFilter === 'CATEGORIES' ? 'Categorized SKUs' : 'Low Stock SKUs'}
              </p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
                {selectedTypeFilter === 'CATEGORIES' ? (items.length - uncategorizedItems.length) : lowStockCount}
              </p>
            </div>
          </div>

          <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", selectedTypeFilter === 'CATEGORIES' && uncategorizedItems.length > 0 ? "bg-amber-500/10 text-amber-500" : "bg-teal-500/10 text-teal-600 dark:text-teal-400")}>
              {selectedTypeFilter === 'CATEGORIES' ? <FolderMinus size={24} /> : <Clock size={24} />}
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {selectedTypeFilter === 'CATEGORIES' ? 'Uncategorized Items' : 'Services & Fees'}
              </p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
                {selectedTypeFilter === 'CATEGORIES' ? uncategorizedItems.length : servicesFeesCount}
              </p>
            </div>
          </div>

          <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
              {selectedTypeFilter === 'CATEGORIES' ? <Tag size={24} /> : <Gift size={24} />}
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {selectedTypeFilter === 'CATEGORIES' ? 'Total Catalog SKUs' : 'Active Vouchers'}
              </p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
                {selectedTypeFilter === 'CATEGORIES' ? totalCount : activeVouchersCount}
              </p>
            </div>
          </div>
        </div>

        {/* List Controls */}
        {selectedTypeFilter !== 'CATEGORIES' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl p-4 border border-white/20 dark:border-white/5 rounded-3xl shadow-xl">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
            <div className="relative flex-1 w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input
                type="text"
                placeholder={selectedTypeFilter === 'VOUCHERS' ? "Search voucher code or notes..." : "Search name, category, SKU, barcode..."}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {selectedTypeFilter !== 'VOUCHERS' && distinctCategories.length > 0 && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Folder size={15} className="text-zinc-400 shrink-0 hidden sm:block" />
                <select
                  value={selectedCategoryFilter}
                  onChange={e => setSelectedCategoryFilter(e.target.value)}
                  className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                >
                  <option value="ALL">All Categories ({distinctCategories.length})</option>
                  {distinctCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Content View: VOUCHERS TAB */}
        {selectedTypeFilter === 'VOUCHERS' ? (
          <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl overflow-hidden shadow-xl min-h-[300px]">
            {vouchersLoading ? (
              <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
                <Loader2 className="animate-spin mb-2" size={32} />
                <p className="text-sm">Loading Gift Cards & Vouchers...</p>
              </div>
            ) : filteredVouchers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
                <Gift size={48} className="mb-4 opacity-20" />
                <p className="text-base font-bold">No vouchers or gift cards found</p>
                <p className="text-xs max-w-xs text-center mt-1">Issue a new stored-value gift card or discount promo code to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800/80 text-[10px] uppercase tracking-wider text-zinc-400 font-bold bg-zinc-50/50 dark:bg-zinc-900/20">
                      <th className="py-4 px-6">Voucher Code</th>
                      <th className="py-4 px-4">Type</th>
                      <th className="py-4 px-4">Initial Balance</th>
                      <th className="py-4 px-4">Remaining Balance</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-6 text-right">Expires At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                    {filteredVouchers.map(v => (
                      <tr key={v.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-lg border border-amber-500/20">
                              {v.code}
                            </span>
                            {v.notes && <span className="text-xs text-zinc-400 truncate max-w-[200px]">• {v.notes}</span>}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300">
                            {v.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                          {v.type === 'DISCOUNT_PROMO' && v.discountPercent 
                            ? `${v.discountPercent}% OFF`
                            : new Intl.NumberFormat('en-AU', { style: 'currency', currency: v.currency }).format(v.initialBalance)
                          }
                        </td>
                        <td className="py-4 px-4 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {v.type === 'DISCOUNT_PROMO' 
                            ? 'Promo Rate'
                            : new Intl.NumberFormat('en-AU', { style: 'currency', currency: v.currency }).format(v.currentBalance)
                          }
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            v.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                            v.status === 'DEPLETED' ? 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20' :
                            'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          }`}>
                            {v.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right text-xs text-zinc-400">
                          {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString() : 'Never (Perpetual)'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : selectedTypeFilter === 'CATEGORIES' ? (
          /* Content View: CATEGORIES & DEPARTMENTS WORKSPACE */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
            {/* Left Column: Categories List (4 cols) */}
            <div className="lg:col-span-4 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-5 shadow-xl flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Folder size={16} className="text-indigo-400" /> Categories ({distinctCategories.length})
                  </h3>
                  <p className="text-[11px] text-zinc-400">POS menu tabs & sections</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setNewCategoryNameInput('');
                    setIsCreateCategoryModalOpen(true);
                  }}
                  className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-8"
                >
                  <Plus size={13} /> Add
                </Button>
              </div>

              {/* Search filter for categories */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filter categories..."
                  value={categoryListSearch}
                  onChange={e => setCategoryListSearch(e.target.value)}
                  className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Categories Scrollable List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[460px]">
                {distinctCategories
                  .filter(c => !categoryListSearch.trim() || c.toLowerCase().includes(categoryListSearch.toLowerCase().trim()))
                  .map(cat => {
                    const count = items.filter(i => (i.metadata?.category || '').trim().toLowerCase() === cat.toLowerCase()).length;
                    const isSelected = selectedCategoryInTab.toLowerCase() === cat.toLowerCase();

                    return (
                      <div
                        key={cat}
                        onClick={() => {
                          setSelectedCategoryInTab(cat);
                          setSelectedItemIdsInWorkspace([]);
                        }}
                        className={cn(
                          "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group",
                          isSelected
                            ? "bg-indigo-600/10 border-indigo-500/40 text-indigo-400 shadow-sm"
                            : "bg-white/30 dark:bg-zinc-900/40 border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-400 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Folder size={16} className={cn(isSelected ? "text-indigo-400" : "text-zinc-400 group-hover:text-indigo-400")} />
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate text-zinc-900 dark:text-white">{cat}</p>
                            <p className="text-[10px] text-zinc-400">{count} {count === 1 ? 'item' : 'items'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingCategory({ old: cat, new: cat });
                              setIsCategoryManagerOpen(true);
                            }}
                            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700/50 cursor-pointer"
                            title="Rename"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCategory(cat);
                            }}
                            className="p-1 rounded-md text-zinc-400 hover:text-rose-400 hover:bg-zinc-700/50 cursor-pointer"
                            title="Delete category"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                {/* Special Uncategorized Bucket */}
                <div
                  onClick={() => {
                    setSelectedCategoryInTab('UNCATEGORIZED');
                    setSelectedItemIdsInWorkspace([]);
                  }}
                  className={cn(
                    "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between mt-3",
                    selectedCategoryInTab === 'UNCATEGORIZED'
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-sm"
                      : "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40 text-zinc-600 dark:text-zinc-400"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FolderMinus size={16} className="text-amber-500" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">Uncategorized Items</p>
                      <p className="text-[10px] text-zinc-400">{uncategorizedItems.length} items to sort</p>
                    </div>
                  </div>
                  {uncategorizedItems.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-mono">
                      {uncategorizedItems.length}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Items in Selected Category Workspace (8 cols) */}
            <div className="lg:col-span-8 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-5 shadow-xl flex flex-col space-y-4">
              {/* Workspace Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                      {selectedCategoryInTab === 'UNCATEGORIZED' ? 'Uncategorized Items' : selectedCategoryInTab || 'All Items'}
                    </h2>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-semibold">
                      {activeCategoryItems.length} {activeCategoryItems.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {selectedCategoryInTab === 'UNCATEGORIZED'
                      ? 'Items not yet assigned to any category. Select items and move them to a category.'
                      : `Items assigned to "${selectedCategoryInTab}". These appear under this tab in the POS terminal.`
                    }
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedCategoryInTab !== 'UNCATEGORIZED' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRenamingCategory({ old: selectedCategoryInTab, new: selectedCategoryInTab });
                          setIsCategoryManagerOpen(true);
                        }}
                        className="gap-1.5 text-xs border-zinc-200 dark:border-zinc-800 hover:text-white h-8"
                      >
                        <Edit3 size={13} /> Rename
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteCategory(selectedCategoryInTab)}
                        className="gap-1.5 text-xs text-rose-400 border-zinc-200 dark:border-zinc-800 hover:bg-rose-500/10 hover:border-rose-500/40 h-8"
                      >
                        <Trash2 size={13} /> Delete
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setItemIdsToAssignChecklist([]);
                          setIsAssignItemsModalOpen(true);
                        }}
                        className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-500/20 h-8"
                      >
                        <Plus size={13} /> Assign Items
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Toolbar: Search + Bulk Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1 max-w-sm">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search items in this section..."
                    value={categoryItemsSearch}
                    onChange={e => setCategoryItemsSearch(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Bulk Actions when checkboxes are checked */}
                {selectedItemIdsInWorkspace.length > 0 && (
                  <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 px-3 py-1.5 rounded-xl">
                    <span className="text-xs font-bold text-indigo-400">
                      {selectedItemIdsInWorkspace.length} selected
                    </span>

                    <select
                      onChange={e => {
                        if (e.target.value) {
                          handleBulkAssign(e.target.value, selectedItemIdsInWorkspace);
                          e.target.value = '';
                        }
                      }}
                      className="bg-zinc-800 text-white text-xs rounded-lg px-2 py-1 border border-zinc-700 focus:outline-none"
                    >
                      <option value="">Move to...</option>
                      {distinctCategories
                        .filter(c => c.toLowerCase() !== selectedCategoryInTab.toLowerCase())
                        .map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                    </select>

                    {selectedCategoryInTab !== 'UNCATEGORIZED' && (
                      <button
                        type="button"
                        onClick={() => handleBulkRemoveFromCategory(selectedItemIdsInWorkspace)}
                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2 py-1 hover:bg-rose-500/10 rounded cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Items List in Selected Category */}
              <div className="flex-1 overflow-y-auto min-h-[300px]">
                {activeCategoryItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                    <Folder size={40} className="text-zinc-500 opacity-40 mb-3" />
                    <p className="text-sm font-bold text-zinc-300">
                      {selectedCategoryInTab === 'UNCATEGORIZED' ? 'No uncategorized items' : `No items in "${selectedCategoryInTab}"`}
                    </p>
                    <p className="text-xs text-zinc-500 max-w-xs mt-1 mb-4">
                      {selectedCategoryInTab === 'UNCATEGORIZED'
                        ? 'All catalog items have been assigned to a department or category!'
                        : 'Assign items to this category so they appear under its tab in POS.'
                      }
                    </p>
                    {selectedCategoryInTab !== 'UNCATEGORIZED' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setItemIdsToAssignChecklist([]);
                          setIsAssignItemsModalOpen(true);
                        }}
                        className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                      >
                        <Plus size={14} /> Assign Items Now
                      </Button>
                    )}
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-400 font-bold bg-zinc-50/50 dark:bg-zinc-900/20">
                        <th className="py-2.5 px-3 w-8">
                          <input
                            type="checkbox"
                            checked={activeCategoryItems.length > 0 && selectedItemIdsInWorkspace.length === activeCategoryItems.length}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedItemIdsInWorkspace(activeCategoryItems.map(i => i.id));
                              } else {
                                setSelectedItemIdsInWorkspace([]);
                              }
                            }}
                            className="rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-0"
                          />
                        </th>
                        <th className="py-2.5 px-3">Item Name & SKU</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Price</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/40">
                      {activeCategoryItems.map(item => {
                        const isChecked = selectedItemIdsInWorkspace.includes(item.id);

                        return (
                          <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                            <td className="py-3 px-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setSelectedItemIdsInWorkspace(prev => [...prev, item.id]);
                                  } else {
                                    setSelectedItemIdsInWorkspace(prev => prev.filter(id => id !== item.id));
                                  }
                                }}
                                className="rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-0"
                              />
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                {item.metadata?.imageUrl ? (
                                  <img
                                    src={item.metadata.imageUrl}
                                    alt={item.name}
                                    className="w-8 h-8 rounded-lg object-cover border border-zinc-200 dark:border-zinc-800 shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                                    <Package size={14} />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{item.name}</p>
                                  <p className="text-[10px] font-mono text-zinc-400">{item.code}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-zinc-100 dark:bg-white/5 text-zinc-400">
                                {item.type}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-xs text-zinc-900 dark:text-white">
                              ${Number(item.basePrice).toFixed(2)}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <select
                                  value={(item.metadata?.category || '').trim()}
                                  onChange={e => handleSingleItemCategoryChange(item.id, e.target.value)}
                                  className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-[11px] rounded-lg px-2 py-1 font-medium focus:outline-none"
                                >
                                  <option value="UNCATEGORIZED">Uncategorized</option>
                                  {distinctCategories.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                                {item.metadata?.category && (
                                  <button
                                    type="button"
                                    onClick={() => handleBulkRemoveFromCategory([item.id])}
                                    className="p-1 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded cursor-pointer transition-colors"
                                    title="Remove from category"
                                  >
                                    <X size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Content View: CATALOG ITEMS TABLE */
          <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl overflow-hidden shadow-xl min-h-[300px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
                <Loader2 className="animate-spin mb-2" size={32} />
                <p className="text-sm">Loading Pricing Catalog...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
                <Tag size={48} className="mb-4 opacity-20" />
                <p className="text-base font-bold">No catalog items found</p>
                <p className="text-xs max-w-xs text-center mt-1">Try refining your search or add a new pricing catalog item to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800/80 text-[10px] uppercase tracking-wider text-zinc-400 font-bold bg-zinc-50/50 dark:bg-zinc-900/20">
                      <th className="py-4 px-6">Name, SKU & Variants</th>
                      <th className="py-4 px-4">Type</th>
                      <th className="py-4 px-4">Rate & Structure</th>
                      <th className="py-4 px-4">GL Account</th>
                      <th className="py-4 px-4">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                    {filteredItems.map(item => {
                      const hasVariants = item.variants && item.variants.length > 0;
                      const isExpanded = !!expandedItemIds[item.id];
                      const glAccount = accounts.find(a => a.id === item.revenueAccountId);

                      return (
                        <React.Fragment key={item.id}>
                          <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                {hasVariants && (
                                  <button 
                                    onClick={() => toggleRowExpanded(item.id)}
                                    className="p-1 text-zinc-400 hover:text-white transition-colors shrink-0"
                                  >
                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </button>
                                )}
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
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-zinc-900 dark:text-white leading-snug truncate">{item.name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-mono bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-md uppercase">
                                      {item.code}
                                    </span>
                                    {item.metadata?.category && (
                                      <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                                        {item.metadata.category}
                                      </span>
                                    )}
                                    {hasVariants && (
                                      <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                        {item.variants!.length} Variants
                                      </span>
                                    )}
                                    {item.description && (
                                      <span className="text-[11px] text-zinc-400 truncate max-w-[200px] md:max-w-[320px]">
                                        • {item.description}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                item.type === 'PRODUCT' ? 'bg-blue-500/5 border-blue-500/20 text-blue-600 dark:text-blue-400' :
                                item.type === 'SERVICE' ? 'bg-purple-500/5 border-purple-500/20 text-purple-600 dark:text-purple-400' :
                                item.type === 'FEE' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                                item.type === 'RECURRING' ? 'bg-teal-500/5 border-teal-500/20 text-teal-600 dark:text-teal-400' :
                                'bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400'
                              }`}>
                                {item.type === 'RECURRING' ? 'SUBSCRIPTION' : item.type}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-sm font-bold text-zinc-800 dark:text-zinc-200">
                              <div>
                                <span>{new Intl.NumberFormat('en-AU', { style: 'currency', currency: item.currency }).format(item.basePrice)}</span>
                                <span className="text-xs text-zinc-400 font-semibold ml-1">
                                  {item.type === 'SERVICE' && item.priceType === 'TIME' ? `/ ${item.billingBlockMinutes || 15} mins` :
                                   item.type === 'RECURRING' ? `/ ${item.billingIntervalCount && item.billingIntervalCount > 1 ? item.billingIntervalCount + ' ' : ''}${item.billingInterval}` :
                                   item.priceType === 'UNIT' ? '/ unit' : 'Flat'}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              {glAccount ? (
                                <span className="text-xs font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                                  {glAccount.code} {glAccount.name}
                                </span>
                              ) : (
                                <span className="text-xs text-zinc-500 italic">4000 Sales Default</span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                item.status === 'active' ? 'bg-green-500' :
                                item.status === 'draft' ? 'bg-zinc-400' : 'bg-red-500'
                              }`} />
                              <span className="text-xs capitalize text-zinc-400">{item.status}</span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button 
                                  onClick={() => handleOpenModal(item)}
                                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl text-zinc-400 hover:text-indigo-500 transition-colors"
                                  title="Edit Item"
                                >
                                  <Edit3 size={15} />
                                </button>
                                <button 
                                  onClick={() => handleDelete(item.id)}
                                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-red-500/10 rounded-xl text-zinc-400 hover:text-red-500 transition-colors"
                                  title="Delete Item"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Matrix Variants Expandable Sub-table */}
                          {hasVariants && isExpanded && (
                            <tr className="bg-zinc-950/40 border-y border-zinc-800/40">
                              <td colSpan={6} className="py-3 px-8">
                                <div className="space-y-2">
                                  <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                                    <Barcode size={13} /> Variant Matrix ({item.variants!.length} active SKUs)
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {item.variants!.map((v, idx) => (
                                      <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 flex items-center justify-between">
                                        <div>
                                          <p className="text-xs font-bold text-white">{v.title}</p>
                                          <p className="text-[10px] font-mono text-zinc-400 mt-0.5">SKU: {v.sku} {v.barcode && `| Barcode: ${v.barcode}`}</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-xs font-bold text-emerald-400">
                                            {v.priceOverride !== null && v.priceOverride !== undefined
                                              ? new Intl.NumberFormat('en-AU', { style: 'currency', currency: item.currency }).format(v.priceOverride)
                                              : `${new Intl.NumberFormat('en-AU', { style: 'currency', currency: item.currency }).format(item.basePrice)} (Base)`
                                            }
                                          </p>
                                          <p className="text-[10px] text-zinc-500">Cost: ${(v.unitCost || 0).toFixed(2)}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal: Add/Edit Catalog Item */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingItem ? 'Edit Catalog Item & Variants' : 'Register New Pricing Item'}
        >
          <form onSubmit={handleSave} className="space-y-5 py-2 text-left max-h-[75vh] overflow-y-auto pr-1">
            {/* Product Image / Photo */}
            <div className="space-y-1.5 p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-zinc-800">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                Product Image / Photo
              </label>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 overflow-hidden flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 shrink-0 group">
                  {formData.imageUrl ? (
                    <>
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, imageUrl: '' })}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                        title="Remove Image"
                      >
                        <X size={18} />
                      </button>
                    </>
                  ) : (
                    <ImageIcon className="text-zinc-400" size={24} />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm">
                      <Upload size={14} />
                      <span>Upload Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 2 * 1024 * 1024) {
                              toast.error('Image must be under 2MB');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = ev => {
                              const base64 = ev.target?.result as string;
                              if (base64) {
                                setFormData(prev => ({ ...prev, imageUrl: base64 }));
                                toast.success('Image loaded');
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    <span className="text-[11px] text-zinc-400">or paste image link</span>
                  </div>

                  <input
                    type="url"
                    placeholder="https://... or CDN image URL"
                    value={(formData.imageUrl || '').startsWith('data:') ? 'Image uploaded from device (embedded)' : (formData.imageUrl || '')}
                    disabled={Boolean((formData.imageUrl || '').startsWith('data:'))}
                    onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input 
                label="Item Name" 
                placeholder="e.g. Tomato Basil Soup / Organic Cotton Tee" 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Input 
                label="Item Base SKU / Code" 
                placeholder="e.g. SOU-TOM-01 / APP-TEE-01" 
                value={formData.code} 
                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '-') })}
                required
                disabled={!!editingItem}
              />
            </div>

            {/* Category / Department */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Folder size={14} className="text-indigo-400" /> Category / Department
                </label>
                <button
                  type="button"
                  onClick={() => setIsCategoryManagerOpen(true)}
                  className="text-xs text-indigo-500 hover:text-indigo-400 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Folder size={12} /> Manage All Categories
                </button>
              </div>

              <div className="relative">
                <input 
                  type="text"
                  list="category-suggestions-list"
                  placeholder="e.g. Soups, Main Meals, Appetisers, Drinks, Apparel, Labour..."
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-3.5 pr-9 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                />
                {formData.category && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, category: '' }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-rose-400 p-1 rounded-md cursor-pointer transition-colors"
                    title="Remove category from this item"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <datalist id="category-suggestions-list">
                {distinctCategories.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>

              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Groups items into tabs in POS register. Clear input above to unassign.</span>
              </div>

              {distinctCategories.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-[10px] text-zinc-400 font-medium">Quick select:</span>
                  {distinctCategories.slice(0, 10).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, category: cat }))}
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer font-medium",
                        formData.category === cat 
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-sm" 
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-indigo-400 hover:text-indigo-400"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
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
                  <option value="PRODUCT">PRODUCT (Physical / Digital Merchandise)</option>
                  <option value="SERVICE">SERVICE (Billed Time / Labor Consultation)</option>
                  <option value="FEE">FEE (Procedural Lodgment / Surcharge)</option>
                  <option value="RECURRING">RECURRING (Subscription / Retainer Plan)</option>
                  <option value="FINE">FINE (Late Penalty Citation)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Pricing Structure</label>
                <select
                  value={formData.priceType}
                  onChange={e => setFormData({ ...formData, priceType: e.target.value as CatalogItem['priceType'] })}
                  className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-zinc-900 dark:text-white"
                >
                  <option value="FLAT">FLAT (Fixed cost item)</option>
                  <option value="UNIT">UNIT (Quantity scale)</option>
                  <option value="TIME">TIME (Duration interval)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input 
                label="Base Retail Price" 
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
                  <option value="AUD">AUD ($)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="NZD">NZD ($)</option>
                </select>
              </div>
            </div>

            {/* General Ledger Mapping Section */}
            <div className="bg-zinc-50 dark:bg-white/5 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <ShieldCheck size={14} /> General Ledger & Tax Mapping
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Sales / Revenue Account</label>
                  <select
                    value={formData.revenueAccountId}
                    onChange={e => setFormData({ ...formData, revenueAccountId: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="">Default 4000 (Sales Revenue)</option>
                    {accounts.filter(a => a.type === 'REVENUE').map(a => (
                      <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Default Tax Rate</label>
                  <select
                    value={formData.defaultTaxRateId}
                    onChange={e => setFormData({ ...formData, defaultTaxRateId: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="">Standard Rate</option>
                    {taxRates.map(t => (
                      <option key={t.id} value={t.id}>{t.code} ({t.rate}%) - {t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.type === 'PRODUCT' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">COGS Account</label>
                    <select
                      value={formData.cogsAccountId}
                      onChange={e => setFormData({ ...formData, cogsAccountId: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="">Default 5000 (Cost of Goods Sold)</option>
                      {accounts.filter(a => a.type === 'EXPENSE').map(a => (
                        <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Inventory Asset Account</label>
                    <select
                      value={formData.inventoryAssetAccountId}
                      onChange={e => setFormData({ ...formData, inventoryAssetAccountId: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="">Default 1020 (Inventory Stock on Hand)</option>
                      {accounts.filter(a => a.type === 'ASSET').map(a => (
                        <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Matrix Variants Authoring */}
            <div className="bg-zinc-50 dark:bg-white/5 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Layers size={14} className="text-indigo-400" /> Matrix Variants & Barcodes
                  </p>
                  <p className="text-[11px] text-zinc-400">Add SKUs for sizing, color, or packages with custom barcodes & cost.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                >
                  <Plus size={14} /> Add Variant
                </button>
              </div>

              {formData.variants.length > 0 ? (
                <div className="space-y-2 pt-2">
                  {formData.variants.map((v, idx) => (
                    <div key={idx} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                      <div className="sm:col-span-1">
                        <label className="text-[9px] text-zinc-400 font-bold uppercase">SKU</label>
                        <input
                          type="text"
                          required
                          value={v.sku}
                          onChange={e => handleVariantChange(idx, 'sku', e.target.value)}
                          className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-white"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="text-[9px] text-zinc-400 font-bold uppercase">Title / Option</label>
                        <input
                          type="text"
                          required
                          value={v.title}
                          onChange={e => handleVariantChange(idx, 'title', e.target.value)}
                          className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-white"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="text-[9px] text-zinc-400 font-bold uppercase">Barcode</label>
                        <input
                          type="text"
                          placeholder="e.g. 93123456789"
                          value={v.barcode || ''}
                          onChange={e => handleVariantChange(idx, 'barcode', e.target.value)}
                          className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-white"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="text-[9px] text-zinc-400 font-bold uppercase">Price Override ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Default base"
                          value={v.priceOverride !== null && v.priceOverride !== undefined ? v.priceOverride : ''}
                          onChange={e => handleVariantChange(idx, 'priceOverride', e.target.value === '' ? null : Number(e.target.value))}
                          className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-white"
                        />
                      </div>
                      <div className="sm:col-span-1 flex items-center justify-between gap-2 pt-3 sm:pt-0">
                        <div className="flex-1">
                          <label className="text-[9px] text-zinc-400 font-bold uppercase">Unit Cost ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={v.unitCost || 0}
                            onChange={e => handleVariantChange(idx, 'unitCost', Number(e.target.value))}
                            className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-white"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(idx)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors mt-3"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic text-center py-2">No variants created. This item will sell under its primary SKU and rate.</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Description</label>
              <textarea 
                className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                rows={2}
                placeholder="Product description, inclusions or service details..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Catalog Item'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Issue Gift Card / Voucher */}
        <Modal
          isOpen={isVoucherModalOpen}
          onClose={() => setIsVoucherModalOpen(false)}
          title="Issue Voucher or Stored-Value Gift Card"
        >
          <form onSubmit={handleIssueVoucher} className="space-y-4 py-2 text-left">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Voucher Classification</label>
              <select
                value={voucherFormData.type}
                onChange={e => setVoucherFormData({ ...voucherFormData, type: e.target.value as any })}
                className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-2.5 text-sm font-medium text-white"
              >
                <option value="GIFT_CARD">GIFT CARD (Stored-Value Prepaid Balance)</option>
                <option value="DISCOUNT_PROMO">DISCOUNT PROMO (% Percentage Rate Promotion)</option>
                <option value="STORE_CREDIT">STORE CREDIT (Customer Account Credit)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input 
                label="Custom Code (Leave blank for auto-generate)"
                placeholder="e.g. WELCOME-100"
                value={voucherFormData.code}
                onChange={e => setVoucherFormData({ ...voucherFormData, code: e.target.value.toUpperCase() })}
              />

              {voucherFormData.type === 'DISCOUNT_PROMO' ? (
                <Input 
                  label="Discount Percentage (%)"
                  type="number"
                  min="1"
                  max="100"
                  value={voucherFormData.discountPercent}
                  onChange={e => setVoucherFormData({ ...voucherFormData, discountPercent: Number(e.target.value) })}
                  required
                />
              ) : (
                <Input 
                  label="Initial Balance ($ AUD)"
                  type="number"
                  step="0.01"
                  value={voucherFormData.initialBalance}
                  onChange={e => setVoucherFormData({ ...voucherFormData, initialBalance: Number(e.target.value) })}
                  required
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input 
                label="Expiry Date (Optional)"
                type="date"
                value={voucherFormData.expiresAt}
                onChange={e => setVoucherFormData({ ...voucherFormData, expiresAt: e.target.value })}
              />
              <Input 
                label="Internal Reference / Notes"
                placeholder="e.g. VIP Customer Promo"
                value={voucherFormData.notes}
                onChange={e => setVoucherFormData({ ...voucherFormData, notes: e.target.value })}
              />
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
              <p className="font-bold flex items-center gap-1.5"><CreditCard size={14} /> General Ledger Treatment</p>
              <p className="text-[11px] text-amber-200/80 mt-1">
                Issuing a stored-value gift card credits <strong>2050 Deferred Revenue / Gift Card Liability</strong>. When redeemed in POS or Online Checkout, it reliefs liability into sales revenue.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button variant="ghost" type="button" onClick={() => setIsVoucherModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-amber-600 hover:bg-amber-500 text-white">
                {saving ? 'Issuing...' : 'Issue Voucher'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Category & Department Manager */}
        <Modal
          isOpen={isCategoryManagerOpen}
          onClose={() => {
            setIsCategoryManagerOpen(false);
            setRenamingCategory(null);
          }}
          title="Manage Categories & Departments"
        >
          <div className="space-y-4 py-1 text-left">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Categories group catalog items in POS terminal tabs and sales filters. You can rename a category across all assigned items or delete it to remove it from all items.
            </p>

            {distinctCategories.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-zinc-800 space-y-2">
                <Folder size={32} className="mx-auto text-zinc-400 dark:text-zinc-600" />
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No Categories Found</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                  To create a category, edit or create any catalog item and enter a category name (e.g. "Main Meals", "Beverages", "Soups").
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {distinctCategories.map(cat => {
                  const itemCount = items.filter(
                    i => (i.metadata?.category || '').trim().toLowerCase() === cat.toLowerCase()
                  ).length;
                  const isEditing = renamingCategory?.old === cat;

                  return (
                    <div 
                      key={cat} 
                      className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={renamingCategory.new}
                            onChange={e => setRenamingCategory({ ...renamingCategory, new: e.target.value })}
                            className="flex-1 bg-white dark:bg-zinc-800 border border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none"
                            placeholder="New category name"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                handleRenameCategory(cat, renamingCategory.new);
                              } else if (e.key === 'Escape') {
                                setRenamingCategory(null);
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            disabled={categoryActionLoading || !renamingCategory.new.trim()}
                            onClick={() => handleRenameCategory(cat, renamingCategory.new)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 h-auto font-semibold"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setRenamingCategory(null)}
                            className="text-xs px-2.5 py-1.5 h-auto text-zinc-400 hover:text-white"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm font-bold text-zinc-900 dark:text-white">{cat}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
                              {itemCount} {itemCount === 1 ? 'item' : 'items'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setRenamingCategory({ old: cat, new: cat })}
                              className="text-xs px-2.5 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-indigo-600 hover:text-white text-zinc-700 dark:text-zinc-300 font-medium transition-colors flex items-center gap-1 cursor-pointer"
                              title="Rename this category across all items"
                            >
                              <Edit3 size={12} />
                              <span>Rename</span>
                            </button>

                            <button
                              type="button"
                              disabled={categoryActionLoading}
                              onClick={() => handleDeleteCategory(cat)}
                              className="text-xs p-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-rose-600 text-zinc-500 dark:text-zinc-400 hover:text-white transition-colors cursor-pointer"
                              title="Delete this category from all items"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCategoryManagerOpen(false);
                  setRenamingCategory(null);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal: Bulk Assign Items to Category */}
        <Modal
          isOpen={isAssignItemsModalOpen}
          onClose={() => {
            setIsAssignItemsModalOpen(false);
            setItemIdsToAssignChecklist([]);
            setAssignSearchQuery('');
          }}
          title={`Assign Items to "${selectedCategoryInTab}"`}
        >
          <div className="space-y-4 py-1 text-left">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Select catalog items to assign to <strong>{selectedCategoryInTab}</strong>. Any items currently in another category will be moved.
            </p>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search by name, SKU, or type..."
                  value={assignSearchQuery}
                  onChange={e => setAssignSearchQuery(e.target.value)}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const filtered = items.filter(i => {
                    const q = assignSearchQuery.toLowerCase().trim();
                    return !q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q);
                  });
                  if (itemIdsToAssignChecklist.length === filtered.length) {
                    setItemIdsToAssignChecklist([]);
                  } else {
                    setItemIdsToAssignChecklist(filtered.map(i => i.id));
                  }
                }}
                className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 px-2 py-1 rounded cursor-pointer shrink-0"
              >
                {itemIdsToAssignChecklist.length > 0 ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="max-h-[340px] overflow-y-auto space-y-1 pr-1 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 bg-zinc-50 dark:bg-zinc-900/60">
              {items
                .filter(i => {
                  const q = assignSearchQuery.toLowerCase().trim();
                  return !q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q);
                })
                .map(item => {
                  const isChecked = itemIdsToAssignChecklist.includes(item.id);
                  const isAlreadyInThisCat = (item.metadata?.category || '').trim().toLowerCase() === selectedCategoryInTab.toLowerCase();
                  const currentCat = item.metadata?.category || 'Uncategorized';

                  return (
                    <label
                      key={item.id}
                      className={cn(
                        "p-2.5 rounded-lg border transition-all flex items-center justify-between cursor-pointer select-none",
                        isChecked
                          ? "bg-indigo-600/15 border-indigo-500/40 text-zinc-900 dark:text-white"
                          : "bg-white/40 dark:bg-zinc-800/40 border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setItemIdsToAssignChecklist(prev => [...prev, item.id]);
                            } else {
                              setItemIdsToAssignChecklist(prev => prev.filter(id => id !== item.id));
                            }
                          }}
                          className="rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate text-zinc-900 dark:text-white">{item.name}</p>
                          <p className="text-[10px] font-mono text-zinc-400">{item.code} • ${Number(item.basePrice).toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-2">
                        {isAlreadyInThisCat ? (
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Already assigned
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                            Current: {currentCat}
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                {itemIdsToAssignChecklist.length} item(s) selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setIsAssignItemsModalOpen(false);
                    setItemIdsToAssignChecklist([]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  disabled={categoryActionLoading || itemIdsToAssignChecklist.length === 0}
                  onClick={() => handleBulkAssign(selectedCategoryInTab, itemIdsToAssignChecklist)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  {categoryActionLoading ? 'Assigning...' : `Assign ${itemIdsToAssignChecklist.length} Items`}
                </Button>
              </div>
            </div>
          </div>
        </Modal>

        {/* Modal: Create New Category */}
        <Modal
          isOpen={isCreateCategoryModalOpen}
          onClose={() => {
            setIsCreateCategoryModalOpen(false);
            setNewCategoryNameInput('');
          }}
          title="Create New Category / Department"
        >
          <div className="space-y-4 py-2 text-left">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Create a category to group items on your POS terminal and sales reports (e.g. <em>Soups</em>, <em>Main Meals</em>, <em>Beverages</em>, <em>Apparel</em>).
            </p>

            <Input
              label="Category Name"
              placeholder="e.g. Desserts, Sandwiches, Legal Advisory..."
              value={newCategoryNameInput}
              onChange={e => setNewCategoryNameInput(e.target.value)}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateNewCategory();
                }
              }}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  setIsCreateCategoryModalOpen(false);
                  setNewCategoryNameInput('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateNewCategory}
                disabled={!newCategoryNameInput.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
              >
                Create Category & Assign Items
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </SettingsSubNavLayout>
  );
};
