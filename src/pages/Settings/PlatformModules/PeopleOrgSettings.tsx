import React, { useState, useEffect } from 'react';
import { cn } from '../../../lib/utils';
import {
  Tags,
  Shapes,
  Database,
  Plus,
  Trash2,
  Edit3,
  Info,
  Loader2,
  Users,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Clock,
  Play,
} from 'lucide-react';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { API_BASE_URL } from '../../../config';
import { Modal } from '../../../components/UI/TabsAndModal';
import { Button, Input, Select, Badge } from '../../../components/UI/Primitives';
import {
  SettingsSubNavLayout,
  SettingsSubNavItem,
} from '../../../components/Settings/SettingsSubNavLayout';
import { toast } from 'sonner';

interface Taxonomy {
  id: string;
  category: string;
  name: string;
  slug: string;
  description?: string;
  usage: number;
}

export interface DirectoryCustomFieldDef {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'url' | 'currency';
  scope: 'ALL' | 'PERSON' | 'ORGANIZATION';
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export const PeopleOrgSettings = () => {
  const [activeTab, setActiveTab] = useState<'taxonomy' | 'relationships' | 'fields'>('taxonomy');
  const [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenant } = usePlatform();
  const { session } = useAuth();

  // Taxonomy modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Taxonomy | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
  });

  // Directory Config state (Custom Fields, Classifications, Governance)
  const [dirConfig, setDirConfig] = useState<{
    customFields: DirectoryCustomFieldDef[];
    classifications: string[];
    requireDeduplicationCheck: boolean;
    autoCreatePrimaryOrgRelationship: boolean;
    dedupeSchedule?: {
      enabled: boolean;
      frequency: 'OFF' | 'HOURLY' | 'EVERY_6_HOURS' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
      time?: string;
      autoMergeExact: boolean;
      sensitivity: 'STRICT' | 'BALANCED' | 'AGGRESSIVE';
      lastRunAt?: string;
      nextRunAt?: string;
      lastRunStats?: {
        clustersFound: number;
        partiesScanned: number;
        autoMergedCount: number;
        timestamp: string;
        durationMs: number;
      };
    };
  }>({
    customFields: [],
    classifications: [
      'CLIENT',
      'SUPPLIER',
      'PARTNER',
      'PROSPECT',
      'INVESTOR',
      'COMPETITOR',
      'REGULATOR',
      'CONTRACTOR',
      'SUBSIDIARY',
      'ADVISOR',
      'VIP',
    ],
    requireDeduplicationCheck: true,
    autoCreatePrimaryOrgRelationship: true,
    dedupeSchedule: {
      enabled: true,
      frequency: 'DAILY',
      time: '02:00',
      autoMergeExact: false,
      sensitivity: 'BALANCED',
    },
  });
  const [runningDedupeProcedure, setRunningDedupeProcedure] = useState(false);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<DirectoryCustomFieldDef | null>(null);
  const [fieldForm, setFieldForm] = useState({
    label: '',
    key: '',
    type: 'text' as DirectoryCustomFieldDef['type'],
    scope: 'ALL' as DirectoryCustomFieldDef['scope'],
    required: false,
    placeholder: '',
    optionsText: '',
  });
  const [newClassification, setNewClassification] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
    if (!tenant?.id || !token) return;
    if (activeTab === 'fields') {
      fetchDirConfig();
    } else {
      fetchTaxonomies();
      fetchDirConfig();
    }
  }, [activeTab, tenant?.id, session?.access_token]);

  const getHeaders = () => {
    const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-tenant-id': tenant?.id || '',
    };
  };

  const fetchDirConfig = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/people-organisations/config`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setDirConfig((prev) => ({
          ...prev,
          ...data,
          customFields: Array.isArray(data.customFields) ? data.customFields : [],
          classifications: Array.isArray(data.classifications)
            ? data.classifications
            : prev.classifications,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch directory config:', err);
    }
  };

  const saveDirConfig = async (nextConfig: typeof dirConfig, successMsg = 'Directory settings saved') => {
    try {
      setSavingConfig(true);
      const res = await fetch(`${API_BASE_URL}/api/people-organisations/config`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(nextConfig),
      });
      if (!res.ok) throw new Error('Failed to save directory config');
      const saved = await res.json();
      setDirConfig((prev) => ({ ...prev, ...saved }));
      window.dispatchEvent(new CustomEvent('aurora:directory-updated'));
      toast.success(successMsg);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save directory configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleRunDedupeProcedure = async () => {
    setRunningDedupeProcedure(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/people-organisations/dedupe-schedule/run`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to run procedure');
      toast.success(
        `Dedupe procedure completed! Scanned ${data.partiesScanned} records, auto-merged ${data.autoMergedCount || 0}, ${data.clustersFound} clusters remaining.`
      );
      fetchDirConfig();
      window.dispatchEvent(new CustomEvent('aurora:directory-updated'));
    } catch (err: any) {
      toast.error(err.message || 'Procedure run failed');
    } finally {
      setRunningDedupeProcedure(false);
    }
  };

  const fetchTaxonomies = async () => {
    try {
      setLoading(true);
      const category =
        activeTab === 'taxonomy'
          ? 'ORG_TYPE'
          : activeTab === 'relationships'
          ? 'RELATIONSHIP_TYPE'
          : null;
      if (!category) {
        setTaxonomies([]);
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/taxonomies?category=${category}`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setTaxonomies(Array.isArray(data) ? data : []);
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
      const category = activeTab === 'taxonomy' ? 'ORG_TYPE' : 'RELATIONSHIP_TYPE';
      const method = editingItem ? 'PUT' : 'POST';
      const url = editingItem
        ? `${API_BASE_URL}/api/taxonomies/${editingItem.id}`
        : `${API_BASE_URL}/api/taxonomies`;

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify({
          ...formData,
          category,
          slug: formData.slug.toUpperCase().replace(/\s+/g, '_'),
        }),
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
      const res = await fetch(`${API_BASE_URL}/api/taxonomies/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
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

  // Custom field handlers
  const handleOpenFieldModal = (field?: DirectoryCustomFieldDef) => {
    if (field) {
      setEditingField(field);
      setFieldForm({
        label: field.label,
        key: field.key,
        type: field.type,
        scope: field.scope || 'ALL',
        required: Boolean(field.required),
        placeholder: field.placeholder || '',
        optionsText: Array.isArray(field.options) ? field.options.join(', ') : '',
      });
    } else {
      setEditingField(null);
      setFieldForm({
        label: '',
        key: '',
        type: 'text',
        scope: 'ALL',
        required: false,
        placeholder: '',
        optionsText: '',
      });
    }
    setIsFieldModalOpen(true);
  };

  const handleSaveCustomField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldForm.label.trim()) {
      toast.error('Field label is required');
      return;
    }
    const cleanKey = (
      fieldForm.key.trim() ||
      fieldForm.label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
    );

    const newField: DirectoryCustomFieldDef = {
      id: editingField?.id || `cf_${Date.now()}`,
      key: cleanKey,
      label: fieldForm.label.trim(),
      type: fieldForm.type,
      scope: fieldForm.scope,
      required: fieldForm.required,
      placeholder: fieldForm.placeholder.trim() || undefined,
      options:
        fieldForm.type === 'select'
          ? fieldForm.optionsText
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
    };

    const nextFields = editingField
      ? dirConfig.customFields.map((f) => (f.id === editingField.id ? newField : f))
      : [...dirConfig.customFields, newField];

    const nextConfig = {
      ...dirConfig,
      customFields: nextFields,
    };
    await saveDirConfig(
      nextConfig,
      editingField ? 'Custom field updated' : 'Custom field added to Directory'
    );
    setIsFieldModalOpen(false);
  };

  const handleDeleteCustomField = async (fieldId: string) => {
    const nextConfig = {
      ...dirConfig,
      customFields: dirConfig.customFields.filter((f) => f.id !== fieldId),
    };
    await saveDirConfig(nextConfig, 'Custom field removed');
  };

  const handleAddClassification = async () => {
    const tag = newClassification.trim().toUpperCase().replace(/\s+/g, '_');
    if (!tag) return;
    if (dirConfig.classifications.includes(tag)) {
      toast.error('Classification already exists');
      return;
    }
    const nextConfig = {
      ...dirConfig,
      classifications: [...dirConfig.classifications, tag],
    };
    setNewClassification('');
    await saveDirConfig(nextConfig, `Added classification "${tag}"`);
  };

  const handleRemoveClassification = async (tag: string) => {
    const nextConfig = {
      ...dirConfig,
      classifications: dirConfig.classifications.filter((c) => c !== tag),
    };
    await saveDirConfig(nextConfig, `Removed classification "${tag}"`);
  };

  const subNavItems: SettingsSubNavItem[] = [
    {
      id: 'taxonomy',
      label: 'Org Types & Classifications',
      icon: Tags,
      description: 'Legal structures & CRM tags',
    },
    {
      id: 'relationships',
      label: 'Relationship Types',
      icon: Shapes,
      description: 'Entity connection rules',
    },
    {
      id: 'fields',
      label: 'Custom Metadata & Governance',
      icon: Database,
      description: 'Field extensibility & dedupe',
    },
  ];

  return (
    <SettingsSubNavLayout
      title="Directory Configuration"
      description="Manage legal entity taxonomies, relationship graphs, custom metadata fields, and deduplication rules."
      icon={Users}
      items={subNavItems}
      activeId={activeTab}
      onTabChange={(id) => setActiveTab(id as any)}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'taxonomy' && (
            <>
              <TaxonomyList
                title="Legal Organisation Structures"
                items={taxonomies}
                loading={loading}
                onAdd={() => handleOpenModal()}
                onEdit={handleOpenModal}
                onDelete={handleDelete}
                addLabel="New Legal Structure"
              />

              {/* Classification Tags Manager */}
              <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                      Directory Classification Badges
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Multi-select relationship tags available across People and Organisations (e.g. CLIENT, SUPPLIER, VIP).
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {dirConfig.classifications.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveClassification(tag)}
                        className="text-indigo-400 hover:text-rose-500 transition-colors ml-1"
                        title="Remove classification"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Add classification (e.g. CHANNEL_PARTNER, BOARD_MEMBER)..."
                    value={newClassification}
                    onChange={(e) => setNewClassification(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddClassification();
                      }
                    }}
                    className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddClassification}
                    disabled={savingConfig}
                  >
                    <Plus size={14} className="mr-1" /> Add Badge
                  </Button>
                </div>
              </div>
            </>
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

          {activeTab === 'fields' && (
            <div className="space-y-6">
              {/* Custom Metadata Fields Builder */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                      Custom Metadata Fields
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Extend Directory records with tenant-specific attributes rendered in Create Modals, Directory Profiles, and Lookup Mappings.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenFieldModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-500 transition-all shadow-md shadow-indigo-500/10"
                  >
                    <Plus size={15} />
                    <span>Define Custom Field</span>
                  </button>
                </div>

                <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl overflow-hidden shadow-xl">
                  {dirConfig.customFields.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                      <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto text-indigo-500 border border-indigo-500/20">
                        <Sparkles size={26} />
                      </div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                        No Custom Directory Fields Defined Yet
                      </h4>
                      <p className="text-xs text-zinc-500 max-w-md mx-auto">
                        Add custom fields such as "KYC Risk Tier", "Account Region", "NDA Signed Date", or "Vendor SLA Tier" to capture structured data on People and Organisations.
                      </p>
                      <Button size="sm" onClick={() => handleOpenFieldModal()} className="mt-2">
                        <Plus size={14} className="mr-1.5" /> Create First Field
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {dirConfig.customFields.map((field) => (
                        <div
                          key={field.id}
                          className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                              <Database size={18} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-zinc-900 dark:text-white">
                                  {field.label}
                                </p>
                                <Badge
                                  variant={
                                    field.scope === 'PERSON'
                                      ? 'amber'
                                      : field.scope === 'ORGANIZATION'
                                      ? 'indigo'
                                      : 'zinc'
                                  }
                                  className="text-[9px]"
                                >
                                  {field.scope}
                                </Badge>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                                  {field.type}
                                </span>
                                {field.required && (
                                  <span className="text-[10px] font-bold text-rose-500">Required</span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-500 mt-0.5 font-mono">
                                customData.{field.key}
                                {field.options && field.options.length > 0
                                  ? ` • Options: [${field.options.join(', ')}]`
                                  : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenFieldModal(field)}
                              className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomField(field.id)}
                              className="p-2 text-zinc-400 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Governance & Deduplication Switches */}
              <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-500" />
                  Automated Governance & Deduplication
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-800 cursor-pointer">
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">
                        Pre-Creation Duplicate Conflict Guardrail
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        Automatically check email, tax ID (ABN/EIN), and legal name before creating new records.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={dirConfig.requireDeduplicationCheck}
                      onChange={(e) =>
                        saveDirConfig({
                          ...dirConfig,
                          requireDeduplicationCheck: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-800 cursor-pointer">
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">
                        Auto-Synchronize Primary Organisation & Relationship Graph
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        Automatically create or update an EMPLOYEE PartyRelationship when a Person's Primary Organisation is assigned.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={dirConfig.autoCreatePrimaryOrgRelationship}
                      onChange={(e) =>
                        saveDirConfig({
                          ...dirConfig,
                          autoCreatePrimaryOrgRelationship: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                  </label>

                  {/* Automated Deduplication Procedure Schedule */}
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-indigo-500" />
                        <div>
                          <p className="text-xs font-bold text-zinc-900 dark:text-white">
                            Automated Deduplication Procedure Schedule
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            Configure how often Aurora automatically scans, flags, or merges duplicate entities.
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        loading={runningDedupeProcedure}
                        onClick={handleRunDedupeProcedure}
                        className="gap-1.5 shrink-0"
                      >
                        <Play size={12} className={cn(runningDedupeProcedure ? 'hidden' : 'fill-current')} />
                        <span>Run Now</span>
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                          Procedure Frequency
                        </label>
                        <select
                          value={dirConfig.dedupeSchedule?.frequency || 'DAILY'}
                          onChange={(e) =>
                            saveDirConfig({
                              ...dirConfig,
                              dedupeSchedule: {
                                ...(dirConfig.dedupeSchedule || {
                                  enabled: true,
                                  frequency: 'DAILY',
                                  autoMergeExact: false,
                                  sensitivity: 'BALANCED',
                                }),
                                frequency: e.target.value as any,
                                enabled: e.target.value !== 'OFF',
                              },
                            })
                          }
                          className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white cursor-pointer"
                        >
                          <option value="OFF">Disabled (Manual Only)</option>
                          <option value="HOURLY">Every Hour</option>
                          <option value="EVERY_6_HOURS">Every 6 Hours</option>
                          <option value="DAILY">Daily</option>
                          <option value="WEEKLY">Weekly (Every Sunday)</option>
                          <option value="MONTHLY">Monthly (1st of month)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                          Preferred Run Time
                        </label>
                        <input
                          type="time"
                          value={dirConfig.dedupeSchedule?.time || '02:00'}
                          onChange={(e) =>
                            saveDirConfig({
                              ...dirConfig,
                              dedupeSchedule: {
                                ...(dirConfig.dedupeSchedule || {
                                  enabled: true,
                                  frequency: 'DAILY',
                                  autoMergeExact: false,
                                  sensitivity: 'BALANCED',
                                }),
                                time: e.target.value,
                              },
                            })
                          }
                          className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                          Matching Sensitivity
                        </label>
                        <select
                          value={dirConfig.dedupeSchedule?.sensitivity || 'BALANCED'}
                          onChange={(e) =>
                            saveDirConfig({
                              ...dirConfig,
                              dedupeSchedule: {
                                ...(dirConfig.dedupeSchedule || {
                                  enabled: true,
                                  frequency: 'DAILY',
                                  autoMergeExact: false,
                                  sensitivity: 'BALANCED',
                                }),
                                sensitivity: e.target.value as any,
                              },
                            })
                          }
                          className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white cursor-pointer"
                        >
                          <option value="STRICT">Strict (Tax ID & Email Only)</option>
                          <option value="BALANCED">Balanced (+ Phone & Clean Name)</option>
                          <option value="AGGRESSIVE">Aggressive (Phonetic & Fuzzy Matching)</option>
                        </select>
                      </div>

                      <div className="flex flex-col justify-end">
                        <label className="flex items-center gap-2.5 cursor-pointer p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700">
                          <input
                            type="checkbox"
                            checked={dirConfig.dedupeSchedule?.autoMergeExact || false}
                            onChange={(e) =>
                              saveDirConfig({
                                ...dirConfig,
                                dedupeSchedule: {
                                  ...(dirConfig.dedupeSchedule || {
                                    enabled: true,
                                    frequency: 'DAILY',
                                    autoMergeExact: false,
                                    sensitivity: 'BALANCED',
                                  }),
                                  autoMergeExact: e.target.checked,
                                },
                              })
                            }
                            className="w-4 h-4 rounded text-indigo-600"
                          />
                          <div>
                            <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                              Auto-Merge Exact Matches
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              Auto-merge 98%+ confidence matches into oldest master
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Run Stats */}
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-200/40 dark:border-zinc-800/40 gap-2">
                      <span>
                        Last Procedure Run:{' '}
                        <strong className="text-zinc-700 dark:text-zinc-300">
                          {dirConfig.dedupeSchedule?.lastRunAt
                            ? new Date(dirConfig.dedupeSchedule.lastRunAt).toLocaleString()
                            : 'Never run'}
                        </strong>
                        {dirConfig.dedupeSchedule?.lastRunStats && (
                          <span className="text-zinc-400 ml-1">
                            ({dirConfig.dedupeSchedule.lastRunStats.partiesScanned} scanned,{' '}
                            {dirConfig.dedupeSchedule.lastRunStats.autoMergedCount || 0} merged,{' '}
                            {dirConfig.dedupeSchedule.lastRunStats.clustersFound} flagged)
                          </span>
                        )}
                      </span>
                      {dirConfig.dedupeSchedule?.nextRunAt &&
                        dirConfig.dedupeSchedule?.frequency !== 'OFF' && (
                          <span>
                            Next Run:{' '}
                            <strong className="text-indigo-600 dark:text-indigo-400">
                              {new Date(dirConfig.dedupeSchedule.nextRunAt).toLocaleString()}
                            </strong>
                          </span>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Info size={18} className="text-indigo-500" />
              Platform Integration Guide
            </h3>
            <div className="mt-4 space-y-4">
              <p className="text-xs text-zinc-500 leading-relaxed">
                The Aurora Directory acts as the single source of truth for People and Corporate Entities across all Dynamic Modules, Financials (AR/AP), Service Desk, Inbox, and Document Generator.
              </p>
              <div className="p-4 bg-indigo-500/5 border border-indigo-500/15 rounded-2xl space-y-1.5">
                <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> MS365-Style Hover Cards Active
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Any module field configured as a Directory Lookup automatically renders live hover profile cards and indexes into the entity's "Anything Linked" view.
                </p>
              </div>
              <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                <p className="text-[11px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider mb-1">
                  Governance Notice
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                  Deleting a Relationship Type or Custom Field key will not delete historical party data, but may hide those attributes in form layouts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Taxonomy Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Taxonomy Type' : 'Add New Taxonomy Type'}
      >
        <form onSubmit={handleSave} className="space-y-4 py-4">
          <Input
            label="Display Name"
            placeholder="e.g. Private Limited Company"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Slug / System Code"
            placeholder="e.g. PTE_LTD"
            value={formData.slug}
            onChange={(e) =>
              setFormData({
                ...formData,
                slug: e.target.value.toUpperCase().replace(/\s+/g, '_'),
              })
            }
            required
            disabled={!!editingItem}
          />
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Description
            </label>
            <textarea
              className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Custom Field Modal */}
      <Modal
        isOpen={isFieldModalOpen}
        onClose={() => setIsFieldModalOpen(false)}
        title={editingField ? 'Edit Custom Directory Field' : 'Define Custom Directory Field'}
      >
        <form onSubmit={handleSaveCustomField} className="space-y-4 py-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Field Label"
              placeholder="e.g. KYC Risk Rating"
              value={fieldForm.label}
              onChange={(e) =>
                setFieldForm({
                  ...fieldForm,
                  label: e.target.value,
                  key:
                    editingField?.key ||
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '_')
                      .replace(/^_|_$/g, ''),
                })
              }
              required
            />
            <Input
              label="JSON Field Key"
              placeholder="e.g. kyc_risk_rating"
              value={fieldForm.key}
              onChange={(e) =>
                setFieldForm({
                  ...fieldForm,
                  key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                })
              }
              required
              disabled={!!editingField}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Data Type"
              value={fieldForm.type}
              onChange={(e) => setFieldForm({ ...fieldForm, type: e.target.value as any })}
              options={[
                { label: 'Text', value: 'text' },
                { label: 'Dropdown Select', value: 'select' },
                { label: 'Number', value: 'number' },
                { label: 'Currency Amount', value: 'currency' },
                { label: 'Date', value: 'date' },
                { label: 'Boolean (Yes/No)', value: 'boolean' },
                { label: 'URL / Link', value: 'url' },
              ]}
            />
            <Select
              label="Entity Scope"
              value={fieldForm.scope}
              onChange={(e) => setFieldForm({ ...fieldForm, scope: e.target.value as any })}
              options={[
                { label: 'All Entities (People & Orgs)', value: 'ALL' },
                { label: 'People Only', value: 'PERSON' },
                { label: 'Organisations Only', value: 'ORGANIZATION' },
              ]}
            />
          </div>

          {fieldForm.type === 'select' && (
            <Input
              label="Dropdown Options (comma-separated)"
              placeholder="e.g. Low Risk, Medium Risk, High Risk, PEP"
              value={fieldForm.optionsText}
              onChange={(e) => setFieldForm({ ...fieldForm, optionsText: e.target.value })}
              required
            />
          )}

          <Input
            label="Placeholder / Help Hint (Optional)"
            placeholder="e.g. Select verified tier..."
            value={fieldForm.placeholder}
            onChange={(e) => setFieldForm({ ...fieldForm, placeholder: e.target.value })}
          />

          <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={fieldForm.required}
              onChange={(e) => setFieldForm({ ...fieldForm, required: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600"
            />
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Mark field as Required during entity creation
            </span>
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Button variant="ghost" type="button" onClick={() => setIsFieldModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={savingConfig}>
              {editingField ? 'Update Field' : 'Add Custom Field'}
            </Button>
          </div>
        </form>
      </Modal>
    </SettingsSubNavLayout>
  );
};

const TaxonomyList = ({
  title,
  items,
  loading,
  onAdd,
  onEdit,
  onDelete,
  addLabel = 'Add Schema',
}: {
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
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-500 transition-all shadow-md shadow-indigo-500/10"
      >
        <Plus size={15} />
        <span>{addLabel}</span>
      </button>
    </div>
    <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl overflow-hidden shadow-xl min-h-[200px]">
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
          {items.map((item) => (
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

const TaxonomyItem = ({
  item,
  onEdit,
  onDelete,
}: {
  item: Taxonomy;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <div className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-zinc-100 dark:bg-white/5 rounded-xl flex items-center justify-center text-zinc-500">
        <Database size={20} />
      </div>
      <div>
        <p className="text-sm font-bold text-zinc-900 dark:text-white">{item.name}</p>
        <p className="text-xs text-zinc-500 mt-0.5">
          {item.slug} • {item.usage} Records Active
        </p>
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
