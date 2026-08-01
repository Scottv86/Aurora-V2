import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Globe, 
  Search, 
  Plus, 
  Zap, 
  ShieldCheck, 
  ChevronRight, 
  UserCheck, 
  Layers, 
  Loader2, 
  X,
  Power,
  Pencil,
  Trash2,
  AlertTriangle,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { Table } from '../../components/UI/Table';
import { PageHeader } from '../../components/UI/PageHeader';

const API_BASE = 'http://localhost:3001/api/admin';

export const TenantManagementPage = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // File upload ref & mode
  const tenantFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetMode, setUploadTargetMode] = useState<'create' | 'edit'>('create');

  // Modals state
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Provision Form Data
  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    adminEmail: '',
    plan: 'standard',
    logoUrl: ''
  });

  // Edit Form Data
  const [editFormData, setEditFormData] = useState({
    name: '',
    subdomain: '',
    planTier: 'standard',
    status: 'active',
    dbConnectionString: '',
    logoUrl: ''
  });

  const fetchTenants = async () => {
    try {
      if (!session?.access_token) return;
      const res = await fetch(`${API_BASE}/tenants`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      const resData = await res.json();
      if (Array.isArray(resData)) {
        setTenants(resData);
      }
    } catch (error) {
      toast.error('Failed to sync tenant registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [session?.access_token]);

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo file size must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        if (uploadTargetMode === 'create') {
          setFormData(prev => ({ ...prev, logoUrl: result }));
        } else {
          setEditFormData(prev => ({ ...prev, logoUrl: result }));
        }
        toast.success('Tenant logo loaded! Save changes to apply.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStatusToggle = async (tenantId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`${API_BASE}/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Status update failed');
      toast.success(`Tenant status updated to ${newStatus}`);
      fetchTenants();
    } catch (error) {
      toast.error('Failed to update tenant status');
    }
  };

  const handleImpersonation = async (tenant: any) => {
    try {
      await fetch(`${API_BASE}/impersonate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tenantId: tenant.id })
      });
      toast.success(`Impersonating ${tenant.name} as Tenant Admin`);
      navigate(`/workspace`);
    } catch (error) {
      toast.error('Impersonation failed');
    }
  };

  // CREATE (Provisioning)
  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/tenants`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(formData)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Provisioning failed');
      }
      toast.success('New Tenant Provisioned Successfully');
      setIsProvisioning(false);
      setFormData({ name: '', subdomain: '', adminEmail: '', plan: 'standard', logoUrl: '' });
      fetchTenants();
    } catch (error: any) {
      toast.error(error.message || 'Provisioning failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // UPDATE (Edit)
  const openEditModal = (tenant: any) => {
    setEditingTenant(tenant);
    setEditFormData({
      name: tenant.name || '',
      subdomain: tenant.subdomain || '',
      planTier: tenant.planTier || 'standard',
      status: tenant.status || 'active',
      dbConnectionString: tenant.dbConnectionString || '',
      logoUrl: tenant.branding?.logoUrl || ''
    });
  };

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/tenants/${editingTenant.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Update failed');
      }
      toast.success(`Tenant ${editFormData.name} updated successfully`);
      setEditingTenant(null);
      fetchTenants();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update tenant');
    } finally {
      setIsSubmitting(false);
    }
  };

  // DELETE
  const handleDeleteTenant = async () => {
    if (!deletingTenant) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/tenants/${deletingTenant.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('Deletion failed');
      toast.success(`Tenant "${deletingTenant.name}" deleted permanently`);
      setDeletingTenant(null);
      fetchTenants();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete tenant');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-12rem)] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin opacity-50" />
      </div>
    );
  }

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.subdomain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8">
      {/* Hidden Global File Input */}
      <input 
        type="file" 
        ref={tenantFileInputRef} 
        accept="image/*" 
        className="hidden" 
        onChange={handleLogoFileSelect} 
      />

      {/* Page Header */}
      <PageHeader 
        title="Tenants & Organizations"
        description="Manage customer organizations, subscription plans, database setup, and tenant logos."
        icon={Globe}
        actions={
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input 
                type="text" 
                placeholder="Search tenants..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/40 dark:bg-white/[0.02] border border-zinc-250/20 dark:border-white/5 rounded-2xl pl-11 pr-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500/50 w-72 backdrop-blur-xl"
              />
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setUploadTargetMode('create');
                setIsProvisioning(true);
              }}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-2xl font-bold text-xs hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/30 shrink-0"
            >
              <Plus size={16} />
              <span>Create New Tenant</span>
            </motion.button>
          </div>
        }
      />

      {/* Tenant Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl"
      >
        <Table 
          data={filteredTenants}
          noContainer={true}
          className="bg-transparent dark:bg-transparent border-none"
          columns={[
            {
              header: 'Tenant Entity',
              sortable: true,
              accessor: (tenant: any) => {
                const logoUrl = tenant.branding?.logoUrl;
                return (
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-sm overflow-hidden shrink-0">
                      {logoUrl ? (
                        <img src={logoUrl} alt={tenant.name} className="w-full h-full object-cover" />
                      ) : (
                        tenant.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{tenant.name}</p>
                      <p className="text-[10px] font-mono text-zinc-500 flex items-center gap-1.5 uppercase tracking-widest mt-0.5">
                        {tenant.subdomain}.aurora.app
                      </p>
                    </div>
                  </div>
                );
              },
              sortKey: 'name'
            },
            {
              header: 'Plan Tier',
              sortable: true,
              accessor: (tenant: any) => (
                <span className={cn("text-[9px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider w-fit inline-flex items-center gap-1.5 shadow-sm", 
                  tenant.planTier === 'enterprise' ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20" :
                  tenant.planTier === 'growth' ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" :
                  "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                )}>
                  <Zap size={10} />
                  {tenant.planTier}
                </span>
              ),
              sortKey: 'planTier'
            },
            {
              header: 'Status',
              sortable: true,
              accessor: (tenant: any) => (
                <div className="flex items-center gap-2.5">
                  <div className={cn("w-2 h-2 rounded-full", 
                    tenant.status === 'active' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)] animate-pulse" : "bg-rose-500"
                  )} />
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-200 capitalize">{tenant.status}</span>
                </div>
              ),
              sortKey: 'status'
            },
            {
              header: 'Database Setup',
              sortable: true,
              accessor: (tenant: any) => (
                <div className="flex items-center gap-2">
                  {tenant.dbConnectionString ? <ShieldCheck size={14} className="text-purple-500" /> : <Layers size={14} className="text-zinc-400" />}
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">
                    {tenant.dbConnectionString ? 'DEDICATED DATABASE' : 'SHARED DATABASE'}
                  </span>
                </div>
              ),
              sortKey: 'dbConnectionString'
            },
            {
              header: 'Actions',
              className: 'text-right',
              accessor: (tenant: any) => (
                <div className="flex items-center justify-end gap-2">
                  <button 
                    onClick={() => handleImpersonation(tenant)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-bold transition-all border border-indigo-500/20"
                    title="Sign In As Tenant Admin"
                  >
                    <UserCheck size={12} />
                    <span>Impersonate</span>
                  </button>

                  <button 
                    onClick={() => {
                      setUploadTargetMode('edit');
                      openEditModal(tenant);
                    }}
                    className="p-1.5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-xl transition-all"
                    title="Edit Tenant Details & Logo"
                  >
                    <Pencil size={14} />
                  </button>
                  
                  <button 
                    onClick={() => handleStatusToggle(tenant.id, tenant.status)}
                    className={cn(
                      "p-1.5 rounded-xl transition-colors text-xs font-bold",
                      tenant.status === 'active' 
                        ? "text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10" 
                        : "text-zinc-400 hover:text-emerald-500 hover:bg-emerald-500/10"
                    )}
                    title={tenant.status === 'active' ? "Suspend Tenant" : "Activate Tenant"}
                  >
                    <Power size={14} />
                  </button>

                  <button 
                    onClick={() => setDeletingTenant(tenant)}
                    className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
                    title="Delete Tenant"
                  >
                    <Trash2 size={14} />
                  </button>

                  <button 
                    onClick={() => navigate(`/admin/tenants/${tenant.id}`)}
                    className="p-1.5 text-zinc-400 hover:text-indigo-500 transition-colors"
                    title="View Briefing"
                  >
                     <ChevronRight size={16} />
                  </button>
                </div>
              )
            }
          ]}
        />
      </motion.div>

      {/* CREATE (Provision) Modal */}
      <AnimatePresence>
        {isProvisioning && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 dark:bg-zinc-950/80 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg">
                    <Plus size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Create New Tenant</h3>
                    <p className="text-xs text-zinc-500 font-mono">Set up organization name, subdomain, admin email, logo, and plan</p>
                  </div>
                </div>
                <button onClick={() => setIsProvisioning(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleProvision} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Tenant Name</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. Acme Corp"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Subdomain</label>
                    <input 
                      required
                      type="text" 
                      placeholder="acme"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-indigo-500"
                      value={formData.subdomain}
                      onChange={e => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Admin Email</label>
                  <input 
                    required
                    type="email" 
                    placeholder="admin@acme.com"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                    value={formData.adminEmail}
                    onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
                  />
                </div>

                {/* Tenant Logo Picker */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Tenant Profile Picture / Logo</label>
                  <div className="flex items-center gap-3">
                    <div 
                      onClick={() => {
                        setUploadTargetMode('create');
                        tenantFileInputRef.current?.click();
                      }}
                      className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow-md overflow-hidden shrink-0 cursor-pointer group relative"
                    >
                      {formData.logoUrl ? (
                        <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <span>{formData.name ? formData.name.charAt(0) : 'T'}</span>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera size={16} className="text-white" />
                      </div>
                    </div>
                    <div className="relative flex-1">
                      <input 
                        type="text" 
                        placeholder="https://... or click Upload Logo"
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500"
                        value={formData.logoUrl}
                        onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadTargetMode('create');
                        tenantFileInputRef.current?.click();
                      }}
                      className="px-3 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5"
                    >
                      <Camera size={14} />
                      <span>Upload Logo</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Priority Tier</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['standard', 'growth', 'enterprise'].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFormData({ ...formData, plan: p })}
                        className={cn(
                          "py-2.5 rounded-xl text-[10px] font-bold border uppercase tracking-widest transition-all",
                          formData.plan === p 
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20" 
                            : "bg-zinc-50 dark:bg-zinc-950 text-zinc-500 border-zinc-200 dark:border-zinc-800"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-indigo-600 text-white text-xs font-bold rounded-xl uppercase tracking-wider hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Create Tenant</span>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT Modal */}
      <AnimatePresence>
        {editingTenant && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 dark:bg-zinc-950/80 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg">
                    <Pencil size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Edit Tenant Instance</h3>
                    <p className="text-xs text-zinc-500 font-mono">Update properties & logo for {editingTenant.name}</p>
                  </div>
                </div>
                <button onClick={() => setEditingTenant(null)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateTenant} className="p-6 space-y-5">
                {/* Logo Section */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Tenant Profile Picture / Logo</label>
                  <div className="flex items-center gap-3">
                    <div 
                      onClick={() => {
                        setUploadTargetMode('edit');
                        tenantFileInputRef.current?.click();
                      }}
                      className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-md overflow-hidden shrink-0 cursor-pointer group relative"
                    >
                      {editFormData.logoUrl ? (
                        <img src={editFormData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <span>{editFormData.name ? editFormData.name.charAt(0) : 'T'}</span>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                        <Camera size={16} />
                        <span className="text-[7px] font-bold uppercase">Upload</span>
                      </div>
                    </div>
                    <div className="relative flex-1">
                      <input 
                        type="text" 
                        placeholder="https://... or click Upload Logo"
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500"
                        value={editFormData.logoUrl}
                        onChange={e => setEditFormData({ ...editFormData, logoUrl: e.target.value })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadTargetMode('edit');
                        tenantFileInputRef.current?.click();
                      }}
                      className="px-3 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5"
                    >
                      <Camera size={14} />
                      <span>Upload Logo</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Tenant Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                      value={editFormData.name}
                      onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Subdomain</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-indigo-500"
                      value={editFormData.subdomain}
                      onChange={e => setEditFormData({ ...editFormData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Plan Tier</label>
                    <select
                      value={editFormData.planTier}
                      onChange={e => setEditFormData({ ...editFormData, planTier: e.target.value })}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 capitalize"
                    >
                      <option value="standard">Standard</option>
                      <option value="growth">Growth</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Status</label>
                    <select
                      value={editFormData.status}
                      onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 capitalize"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Database Connection String (Optional Dedicated DB Cell)</label>
                  <input 
                    type="text" 
                    placeholder="postgresql://user:pass@host:5432/dbname"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-indigo-500"
                    value={editFormData.dbConnectionString}
                    onChange={e => setEditFormData({ ...editFormData, dbConnectionString: e.target.value })}
                  />
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-indigo-600 text-white text-xs font-bold rounded-xl uppercase tracking-wider hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save Tenant Changes</span>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE Confirmation Modal */}
      <AnimatePresence>
        {deletingTenant && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 dark:bg-zinc-950/80 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-6"
            >
              <div className="flex items-center gap-3 text-rose-500">
                <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Delete Tenant?</h3>
                  <p className="text-xs text-zinc-500 font-mono">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-zinc-900 dark:text-white">{deletingTenant.name}</strong> ({deletingTenant.subdomain}.aurora.app)? All associated workspaces, memberships, and records will be removed.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button 
                  onClick={() => setDeletingTenant(null)}
                  className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteTenant}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-500 transition-all shadow-lg shadow-rose-500/30 flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Confirm Deletion</span>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
