import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  UserCheck, 
  Loader2, 
  Building,
  Mail,
  Lock,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { Table } from '../../components/UI/Table';
import { PageHeader } from '../../components/UI/PageHeader';

const API_BASE = 'http://localhost:3001/api/admin';

export const UserManagementPage = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [deletingUser, setDeletingUser] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    isSuperAdmin: false,
    tenantId: '',
    roleId: 'Admin',
    licenceType: 'Developer'
  });

  const [editForm, setEditForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    isSuperAdmin: false,
    tenantId: '',
    roleId: 'Admin',
    licenceType: 'Developer'
  });

  const fetchUsersAndTenants = async () => {
    try {
      if (!session?.access_token) return;
      const [usersRes, tenantsRes] = await Promise.all([
        fetch(`${API_BASE}/users`, {
          headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE}/tenants`, {
          headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
        })
      ]);

      const usersData = await usersRes.json();
      const tenantsData = await tenantsRes.json();

      if (Array.isArray(usersData)) setUsers(usersData);
      if (Array.isArray(tenantsData)) setTenants(tenantsData);
    } catch (error) {
      toast.error('Failed to sync global user directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndTenants();
  }, [session?.access_token]);

  // CREATE User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createForm)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create user');
      }
      toast.success('New user created successfully!');
      setIsCreatingUser(false);
      setCreateForm({ email: '', firstName: '', lastName: '', isSuperAdmin: false, tenantId: '', roleId: 'Admin', licenceType: 'Developer' });
      fetchUsersAndTenants();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // UPDATE User
  const openEditUserModal = (user: any) => {
    setEditingUser(user);
    const primaryMembership = user.memberships?.[0];
    
    // Normalize role_id and licence_type from DB
    const rawRole = (primaryMembership?.roleId || 'USER').toLowerCase();
    const normalizedRole = (rawRole === 'admin' || rawRole === 'tenant admin') ? 'Admin' : (rawRole === 'developer' || rawRole === 'dev') ? 'Developer' : 'USER';
    
    const rawLicence = (primaryMembership?.licenceType || (user.isSuperAdmin ? 'Developer' : 'Standard')).toLowerCase();
    const normalizedLicence = rawLicence === 'developer' ? 'Developer' : rawLicence === 'growth' ? 'Growth' : 'Standard';

    setEditForm({
      email: user.email || '',
      firstName: primaryMembership?.firstName || '',
      lastName: primaryMembership?.familyName || '',
      isSuperAdmin: !!user.isSuperAdmin,
      tenantId: primaryMembership?.tenantId || '',
      roleId: normalizedRole,
      licenceType: normalizedLicence
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update user');
      }
      toast.success(`User ${editForm.email} updated`);
      setEditingUser(null);
      fetchUsersAndTenants();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // DELETE User
  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/users/${deletingUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('Failed to delete user');
      toast.success(`User ${deletingUser.email} deleted permanently`);
      setDeletingUser(null);
      fetchUsersAndTenants();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleSuperAdmin = async (userId: string, currentVal: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isSuperAdmin: !currentVal })
      });
      if (!res.ok) throw new Error('Update failed');
      toast.success(`SuperAdmin privilege ${!currentVal ? 'granted' : 'revoked'}`);
      fetchUsersAndTenants();
    } catch (error) {
      toast.error('Failed to update privileges');
    }
  };

  const handleImpersonateUser = async (user: any) => {
    try {
      await fetch(`${API_BASE}/impersonate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: user.id })
      });
      toast.success(`Session started for ${user.email}`);
      navigate('/workspace');
    } catch (error) {
      toast.error('User impersonation failed');
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-12rem)] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin opacity-50" />
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8">
      {/* Page Header */}
      <PageHeader 
        title="Users & Access"
        description="View and manage user accounts, tenant memberships, workspace roles, and admin access."
        icon={Users}
        actions={
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input 
                type="text" 
                placeholder="Search users by email..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/40 dark:bg-white/[0.02] border border-zinc-250/20 dark:border-white/5 rounded-2xl pl-11 pr-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-indigo-500/50 w-72 backdrop-blur-xl"
              />
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsCreatingUser(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-2xl font-bold text-xs hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/30 shrink-0"
            >
              <Plus size={16} />
              <span>Add User</span>
            </motion.button>
          </div>
        }
      />

      {/* User Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-white/40 dark:bg-white/[0.03] border border-white/20 dark:border-white/5 rounded-3xl backdrop-blur-xl shadow-xl"
      >
        <Table 
          data={filteredUsers}
          noContainer={true}
          className="bg-transparent dark:bg-transparent border-none"
          columns={[
            {
              header: 'User Identity',
              sortable: true,
              accessor: (user: any) => {
                const primaryMembership = user.memberships?.[0];
                const name = (primaryMembership?.firstName || primaryMembership?.familyName) 
                  ? `${primaryMembership?.firstName || ''} ${primaryMembership?.familyName || ''}`.trim() 
                  : null;
                return (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/20 shrink-0">
                      <Mail size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{user.email}</p>
                      <p className="text-[10px] font-mono text-zinc-500 flex items-center gap-2">
                        <span>{user.id.substring(0, 18)}...</span>
                        {name && <span className="font-sans text-indigo-500 font-bold">• {name}</span>}
                      </p>
                    </div>
                  </div>
                );
              },
              sortKey: 'email'
            },
            {
              header: 'Workspace Role',
              sortable: true,
              accessor: (user: any) => {
                const primaryMembership = user.memberships?.[0];
                const rawRole = (primaryMembership?.roleId || 'USER').toLowerCase();
                const isTenantAdmin = rawRole === 'admin' || rawRole === 'tenant admin';
                const isDev = rawRole === 'developer' || rawRole === 'dev';

                const roleBadgeText = user.isSuperAdmin 
                  ? 'SUPER ADMIN' 
                  : isTenantAdmin 
                    ? 'TENANT ADMIN' 
                    : isDev 
                      ? 'DEVELOPER' 
                      : 'STANDARD USER';

                return (
                  <span className={cn(
                    "text-[9px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider inline-flex items-center gap-1.5 border shadow-sm",
                    user.isSuperAdmin 
                      ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                      : isTenantAdmin
                        ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
                        : isDev
                          ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                  )}>
                    <ShieldCheck size={12} />
                    {roleBadgeText}
                  </span>
                );
              },
              sortKey: 'isSuperAdmin'
            },
            {
              header: 'License Tier',
              sortable: true,
              accessor: (user: any) => {
                const primaryMembership = user.memberships?.[0];
                const licence = primaryMembership?.licenceType || (user.isSuperAdmin ? 'Developer' : 'Standard');
                return (
                  <span className={cn(
                    "text-[9px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider inline-flex items-center gap-1.5 border shadow-sm",
                    licence.toLowerCase() === 'developer' ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" :
                    licence.toLowerCase() === 'growth' ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" :
                    "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                  )}>
                    <Zap size={10} />
                    {licence} Seat
                  </span>
                );
              }
            },
            {
              header: 'Tenant Memberships',
              sortable: true,
              accessor: (user: any) => (
                <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                  {user.memberships?.map((m: any) => (
                    <span key={m.id} className="text-[9px] font-bold px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 rounded border border-zinc-200 dark:border-zinc-700 flex items-center gap-1">
                      <Building size={10} />
                      {m.tenant?.name || 'Tenant'}
                    </span>
                  ))}
                  {(!user.memberships || user.memberships.length === 0) && (
                    <span className="text-[10px] text-zinc-400 italic">Global Root Account</span>
                  )}
                </div>
              )
            },
            {
              header: 'Actions',
              className: 'text-right',
              accessor: (user: any) => (
                <div className="flex items-center justify-end gap-2">
                  <button 
                    onClick={() => handleToggleSuperAdmin(user.id, user.isSuperAdmin)}
                    className={cn(
                      "px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1",
                      user.isSuperAdmin
                        ? "bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20"
                        : "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 hover:bg-indigo-500/20"
                    )}
                    title={user.isSuperAdmin ? "Revoke SuperAdmin" : "Grant SuperAdmin"}
                  >
                    <Lock size={10} />
                    <span>{user.isSuperAdmin ? 'Revoke SuperAdmin' : 'Grant SuperAdmin'}</span>
                  </button>

                  <button 
                    onClick={() => openEditUserModal(user)}
                    className="p-1.5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-xl transition-all"
                    title="Edit User Role & License"
                  >
                    <Pencil size={14} />
                  </button>

                  <button 
                    onClick={() => handleImpersonateUser(user)}
                    className="flex items-center gap-1 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl text-[10px] font-bold transition-all border border-zinc-200 dark:border-zinc-700"
                    title="Impersonate User Session"
                  >
                    <UserCheck size={11} />
                    <span>Impersonate</span>
                  </button>

                  <button 
                    onClick={() => setDeletingUser(user)}
                    className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
                    title="Delete User"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            }
          ]}
        />
      </motion.div>

      {/* CREATE User Modal */}
      <AnimatePresence>
        {isCreatingUser && (
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
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Create New User Account</h3>
                    <p className="text-xs text-zinc-500 font-mono">Register user, assign tenant, role authority & license seat</p>
                  </div>
                </div>
                <button onClick={() => setIsCreatingUser(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Email Address</label>
                  <input 
                    required
                    type="email" 
                    placeholder="user@company.com"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                    value={createForm.email}
                    onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">First Name</label>
                    <input 
                      type="text" 
                      placeholder="Jane"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                      value={createForm.firstName}
                      onChange={e => setCreateForm({ ...createForm, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Last Name</label>
                    <input 
                      type="text" 
                      placeholder="Doe"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                      value={createForm.lastName}
                      onChange={e => setCreateForm({ ...createForm, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Assign Primary Tenant</label>
                  <select
                    value={createForm.tenantId}
                    onChange={e => setCreateForm({ ...createForm, tenantId: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Global User (No Primary Tenant)</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.subdomain})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Workspace Role</label>
                    <select
                      value={createForm.roleId}
                      onChange={e => setCreateForm({ ...createForm, roleId: e.target.value })}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Admin">Tenant Admin</option>
                      <option value="Developer">Developer Role</option>
                      <option value="USER">Standard User</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">License Tier</label>
                    <select
                      value={createForm.licenceType}
                      onChange={e => setCreateForm({ ...createForm, licenceType: e.target.value })}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Developer">Developer (Full Access)</option>
                      <option value="Growth">Growth Seat</option>
                      <option value="Standard">Standard Seat</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input 
                    type="checkbox"
                    id="isSuperAdminCreate"
                    checked={createForm.isSuperAdmin}
                    onChange={e => setCreateForm({ ...createForm, isSuperAdmin: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="isSuperAdminCreate" className="text-xs font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer">
                    Grant SuperAdmin Root Privileges
                  </label>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-indigo-600 text-white text-xs font-bold rounded-xl uppercase tracking-wider hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Create Account</span>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT User Modal */}
      <AnimatePresence>
        {editingUser && (
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
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Edit User Account</h3>
                    <p className="text-xs text-zinc-500 font-mono">Modifying profile, role authority & license seat for {editingUser.email}</p>
                  </div>
                </div>
                <button onClick={() => setEditingUser(null)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Email Address</label>
                  <input 
                    required
                    type="email" 
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">First Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                      value={editForm.firstName}
                      onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Last Name</label>
                    <input 
                      type="text" 
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                      value={editForm.lastName}
                      onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Primary Tenant</label>
                  <select
                    value={editForm.tenantId}
                    onChange={e => setEditForm({ ...editForm, tenantId: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Global User (No Tenant)</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.subdomain})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Workspace Role</label>
                    <select
                      value={editForm.roleId}
                      onChange={e => setEditForm({ ...editForm, roleId: e.target.value })}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Admin">Tenant Admin</option>
                      <option value="Developer">Developer Role</option>
                      <option value="USER">Standard User</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">License Tier</label>
                    <select
                      value={editForm.licenceType}
                      onChange={e => setEditForm({ ...editForm, licenceType: e.target.value })}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Developer">Developer (Full Access)</option>
                      <option value="Growth">Growth Seat</option>
                      <option value="Standard">Standard Seat</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input 
                    type="checkbox"
                    id="isSuperAdminEdit"
                    checked={editForm.isSuperAdmin}
                    onChange={e => setEditForm({ ...editForm, isSuperAdmin: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="isSuperAdminEdit" className="text-xs font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer">
                    Grant SuperAdmin Root Privileges
                  </label>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-indigo-600 text-white text-xs font-bold rounded-xl uppercase tracking-wider hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save User Changes</span>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE User Modal */}
      <AnimatePresence>
        {deletingUser && (
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
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Delete User?</h3>
                  <p className="text-xs text-zinc-500 font-mono">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Are you sure you want to permanently delete user <strong className="text-zinc-900 dark:text-white">{deletingUser.email}</strong>? All workspace memberships and permissions associated with this account will be revoked.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button 
                  onClick={() => setDeletingUser(null)}
                  className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteUser}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-500 transition-all shadow-lg shadow-rose-500/30 flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Delete Account</span>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
