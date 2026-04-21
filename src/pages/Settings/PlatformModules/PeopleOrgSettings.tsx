import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Tags, 
  Shapes, 
  Database, 
  Plus, 
  Trash2, 
  Edit3, 
  Save,
  Info,
  ChevronRight,
  AlertCircle,
  Loader2,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { API_BASE_URL } from '../../../config';
import { Modal, Tabs } from '../../../components/UI/TabsAndModal';
import { Button, Input } from '../../../components/UI/Primitives';
import { toast } from 'sonner';

interface Taxonomy {
  id: string;
  category: string;
  name: string;
  slug: string;
  description?: string;
  usage: number;
}

export const PeopleOrgSettings = () => {
  const [activeTab, setActiveTab] = useState<'taxonomy' | 'relationships' | 'fields'>('taxonomy');
  const [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenant } = usePlatform();
  const { session } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Taxonomy | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
  });

  useEffect(() => {
    fetchTaxonomies();
  }, [activeTab]);

  const fetchTaxonomies = async () => {
    try {
      setLoading(true);
      const category = activeTab === 'taxonomy' ? 'ORG_TYPE' : activeTab === 'relationships' ? 'RELATIONSHIP_TYPE' : null;
      if (!category) {
        setTaxonomies([]);
        setLoading(false);
        return;
      }

      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/taxonomies?category=${category}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        }
      });
      const data = await res.json();
      if (res.ok) {
        setTaxonomies(data);
      }
    } catch (err) {
      console.error('Failed to fetch taxonomies:', err);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item?: Taxonomy) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        slug: item.slug,
        description: item.description || '',
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const category = activeTab === 'taxonomy' ? 'ORG_TYPE' : 'RELATIONSHIP_TYPE';
      
      const method = editingItem ? 'PUT' : 'POST';
      const url = editingItem ? `${API_BASE_URL}/api/taxonomies/${editingItem.id}` : `${API_BASE_URL}/api/taxonomies`;

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify({
          ...formData,
          category,
          slug: formData.slug.toUpperCase().replace(/\s+/g, '_')
        })
      });

      if (res.ok) {
        toast.success(`Taxonomy ${editingItem ? 'updated' : 'created'} successfully`);
        setIsModalOpen(false);
        fetchTaxonomies();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this? This action cannot be undone.')) return;

    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/taxonomies/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        }
      });

      if (res.ok) {
        toast.success('Deleted successfully');
        fetchTaxonomies();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const tabs = [
    { id: 'taxonomy', label: 'Organization Types', icon: Tags },
    { id: 'relationships', label: 'Relationship Types', icon: Shapes },
    { id: 'fields', label: 'Custom Metadata', icon: Database },
  ];

  return (
    <div className="space-y-8">
      <Tabs 
        tabs={tabs} 
        activeTab={activeTab} 
        onChange={(id) => setActiveTab(id as any)} 
        firstTabPadding={false}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'taxonomy' && (
            <TaxonomyList 
              title="Active Taxonomies" 
              items={taxonomies} 
              loading={loading}
              onAdd={() => handleOpenModal()} 
              onEdit={handleOpenModal}
              onDelete={handleDelete}
            />
          )}
          {activeTab === 'relationships' && (
            <TaxonomyList 
              title="Core Relationship Rules" 
              items={taxonomies} 
              loading={loading}
              onAdd={() => handleOpenModal()} 
              onEdit={handleOpenModal}
              onDelete={handleDelete}
              addLabel="New Relation Type"
            />
          )}
          {activeTab === 'fields' && <CustomFieldsList />}
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Info size={18} className="text-indigo-500" />
              Governance Guide
            </h3>
            <div className="mt-4 space-y-4">
              <p className="text-sm text-zinc-500 leading-relaxed">
                Changes made here affect the entire tenant's people and organisation management logic. Ensure compliance with local legal structures before modifying Organization Types.
              </p>
              <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider mb-2">Warning</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                  Deleting a Relationship Type will invalidate all existing connections using that label across the global neural map.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingItem ? 'Edit Type' : 'Add New Type'}
      >
        <form onSubmit={handleSave} className="space-y-4 py-4">
          <Input 
            label="Name" 
            placeholder="e.g. Private Limited Company" 
            value={formData.name} 
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input 
            label="Slug / Code" 
            placeholder="e.g. PTE_LTD" 
            value={formData.slug} 
            onChange={e => setFormData({ ...formData, slug: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
            required
            disabled={!!editingItem}
          />
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Description</label>
            <textarea 
              className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              rows={3}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const TaxonomyList = ({ title, items, loading, onAdd, onEdit, onDelete, addLabel = "Add Schema" }: { 
  title: string; 
  items: Taxonomy[]; 
  loading: boolean;
  onAdd: () => void; 
  onEdit: (item: Taxonomy) => void;
  onDelete: (id: string) => void;
  addLabel?: string;
}) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{title}</h3>
      <button 
        onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all"
      >
        <Plus size={16} />
        <span>{addLabel}</span>
      </button>
    </div>
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm min-h-[200px]">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <Loader2 className="animate-spin mb-2" size={32} />
          <p className="text-sm">Loading taxonomies...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <Database size={40} className="mb-4 opacity-20" />
          <p className="text-sm font-bold">No records found</p>
          <p className="text-xs">Add your first type to get started</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {items.map(item => (
            <TaxonomyItem 
              key={item.id} 
              item={item} 
              onEdit={() => onEdit(item)} 
              onDelete={() => onDelete(item.id)} 
            />
          ))}
        </div>
      )}
    </div>
  </div>
);

const TaxonomyItem = ({ item, onEdit, onDelete }: { item: Taxonomy; onEdit: () => void; onDelete: () => void }) => (
  <div className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500">
        <Database size={20} />
      </div>
      <div>
        <p className="text-sm font-bold text-zinc-900 dark:text-white">{item.name}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{item.slug} • {item.usage} Records Active</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <button 
        onClick={onEdit}
        className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
      >
        <Edit3 size={16} />
      </button>
      <button 
        onClick={onDelete}
        className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
      >
        <Trash2 size={16} />
      </button>
    </div>
  </div>
);

const CustomFieldsList = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Field Extensibility</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all disabled:opacity-50" disabled>
          <Plus size={16} />
          <span>Define Field</span>
        </button>
      </div>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
         <div className="p-12 text-center">
            <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto text-zinc-300 dark:text-zinc-700 border border-zinc-200 dark:border-zinc-800 mb-4">
               <Database size={32} />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Coming Soon</h3>
            <p className="text-sm text-zinc-500 max-w-sm mx-auto">Custom metadata fields to capture tenant-specific information are currently under development.</p>
         </div>
      </div>
    </div>
);


