import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield, Plus, Search, Trash2, Copy, Users, Layers, GitBranch,
  Sparkles, Link2, Lock, Globe
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Primitives';
import { EmptyState } from '../../components/UI/EmptyState';
import { DeleteConfirmationModal } from '../../components/Common/DeleteConfirmationModal';
import { DependencyDrawer, DependencyItem } from '../../components/Builders/Common/DependencyDrawer';
import { usePermissionGroups } from '../../hooks/usePermissionGroups';
import { RolePolicy, RoleType } from '../../types/roles';

const ROLE_TYPE_BADGE: Record<RoleType, { label: string; className: string }> = {
  SYSTEM: {
    label: 'System',
    className: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
  },
  SOLUTION: {
    label: 'Solution',
    className: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/60',
  },
  CUSTOM: {
    label: 'Custom',
    className: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60',
  },
  PORTAL: {
    label: 'Portal',
    className: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60',
  },
};

export const RolesLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { groups, loading, cloneGroup, deleteGroup, fetchDependencies } = usePermissionGroups();

  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | RoleType | 'DRAFT'>('ALL');
  const [roleToDelete, setRoleToDelete] = useState<RolePolicy | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [depRole, setDepRole] = useState<RolePolicy | null>(null);
  const [depItems, setDepItems] = useState<DependencyItem[]>([]);

  // Handle handoff from Solutions Blueprint (PERMISSION artifact)
  useEffect(() => {
    const draftArtifact = (location.state as any)?.draftArtifact;
    if (draftArtifact) {
      navigate('/workspace/settings/builder/role/new', {
        replace: true,
        state: { draftArtifact },
      });
    }
  }, [location.state, navigate]);

  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter((role) => {
      const matchesSearch =
        !q ||
        role.name.toLowerCase().includes(q) ||
        (role.description || '').toLowerCase().includes(q) ||
        (role.slug || '').toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (filterTab === 'ALL') return true;
      if (filterTab === 'DRAFT') return role.status === 'DRAFT';
      return (role.type || 'CUSTOM') === filterTab;
    });
  }, [groups, search, filterTab]);

  const handleOpenDependencies = async (e: React.MouseEvent, role: RolePolicy) => {
    e.stopPropagation();
    setDepRole(role);
    try {
      const res = await fetchDependencies(role.id);
      const mapped: DependencyItem[] = (res?.dependencies || []).map((d: any) => ({
        id: d.id,
        name: `${d.name} (${d.type})`,
        type: d.type === 'Data Module' ? 'module' : d.type === 'External Portal' ? 'site' : 'workspace',
        url: d.path,
      }));
      setDepItems(mapped);
    } catch {
      setDepItems([]);
    }
  };

  const handleClone = async (e: React.MouseEvent, role: RolePolicy) => {
    e.stopPropagation();
    try {
      const cloned = await cloneGroup(role.id);
      toast.success(`Cloned "${role.name}" as draft`);
      if (cloned?.id) {
        navigate(`/workspace/settings/builder/role/${cloned.id}`);
      }
    } catch {
      // handled in hook
    }
  };

  const handleDelete = async () => {
    if (!roleToDelete) return;
    setIsDeleting(true);
    try {
      await deleteGroup(roleToDelete.id);
      toast.success(`Deleted role "${roleToDelete.name}"`);
      setRoleToDelete(null);
    } catch {
      // handled in hook
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col w-full relative min-h-[calc(100vh-4rem)] bg-zinc-50/50 dark:bg-zinc-950/50 overflow-y-auto">
      <PageHeader
        title="Roles"
        description="Design reusable access blueprints covering platform capabilities, module CRUD, field masking, workflow approvals, and AI guardrails."
        actions={
          <Button
            onClick={() => navigate('/workspace/settings/builder/role/new')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Create</span>
          </Button>
        }
      />

      {/* Main Content Area — matches Rules, Queues, Forms, and Searches libraries */}
      <div className="flex-1 px-6 lg:px-12 pt-8 pb-20 relative z-10 space-y-6">
        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search roles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-indigo-500 transition-colors text-zinc-900 dark:text-zinc-100 font-medium"
            />
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'CUSTOM', label: 'Custom' },
              { id: 'SOLUTION', label: 'Solution' },
              { id: 'PORTAL', label: 'Portal' },
              { id: 'DRAFT', label: 'Drafts' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id as any)}
                className={`flex-1 sm:flex-initial px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  filterTab === tab.id
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Standardized 3-Column Builder Grid */}
        {loading && groups.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl min-h-[176px] flex flex-col justify-between animate-pulse"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                    <div className="w-16 h-5 rounded-md bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                  <div className="h-4 w-2/3 bg-zinc-100 dark:bg-zinc-800 rounded mb-2" />
                  <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded mb-1" />
                  <div className="h-3 w-4/5 bg-zinc-100 dark:bg-zinc-800 rounded" />
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <div className="h-3 w-16 bg-zinc-100 dark:bg-zinc-800 rounded" />
                  <div className="h-3 w-10 bg-zinc-100 dark:bg-zinc-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredRoles.length === 0 ? (
          <EmptyState
            icon={Shield}
            title={search || filterTab !== 'ALL' ? 'No roles match your search' : 'No roles found'}
            description={
              search || filterTab !== 'ALL'
                ? 'Try searching for a different keyword or switching the filter tab.'
                : 'Create reusable role blueprints to govern module CRUD, field masking, workflow approvals, and AI guardrails.'
            }
            action={{
              label: 'Create Role',
              onClick: () => navigate('/workspace/settings/builder/role/new'),
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoles.map((role, i) => {
              const typeMeta = ROLE_TYPE_BADGE[role.type || 'CUSTOM'] || ROLE_TYPE_BADGE.CUSTOM;
              const modCount = Object.keys(role.modulePolicies || {}).length;
              const capCount = (role.capabilities || []).length;
              const aiCount = Object.values(role.aiPolicies || {}).filter((v) => v && v !== 'INHERIT').length;

              return (
                <motion.div
                  key={role.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.02, ease: 'easeOut' }}
                  onClick={() => navigate(`/workspace/settings/builder/role/${role.id}`)}
                  className="group p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-500/60 rounded-xl transition-colors duration-150 cursor-pointer flex flex-col justify-between h-full relative min-h-[176px]"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-xs"
                        style={{ backgroundColor: role.color || '#4f46e5' }}
                      >
                        {role.type === 'PORTAL' ? <Globe size={17} /> : role.type === 'SYSTEM' ? <Lock size={17} /> : <Shield size={17} />}
                      </div>

                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${typeMeta.className}`}>
                          {typeMeta.label}
                        </span>
                        {role.status === 'DRAFT' && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60">
                            Draft
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleOpenDependencies(e, role)}
                          title="Dependencies"
                          className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Link2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleClone(e, role)}
                          title="Clone Role"
                          className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRoleToDelete(role);
                          }}
                          title="Delete Role"
                          className="p-1 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                      {role.name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {role.description || 'Reusable access policy governing workspace capabilities and module data.'}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <Layers size={11} className="text-zinc-400" />
                        {modCount} {modCount === 1 ? 'module' : 'modules'}
                      </span>
                      <span>{capCount} caps</span>
                      {aiCount > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Sparkles size={11} className="text-amber-500" />
                          {aiCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {role.parentGroup && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400" title={`Inherits from ${role.parentGroup.name}`}>
                          <GitBranch size={11} />
                          {role.parentGroup.name}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 font-medium">
                        <Users size={11} className="text-zinc-400" />
                        {role.memberCount || 0}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <DependencyDrawer
        isOpen={Boolean(depRole)}
        onClose={() => setDepRole(null)}
        entityName={depRole?.name || ''}
        entityType="Role"
        dependencies={depItems}
      />

      <DeleteConfirmationModal
        isOpen={Boolean(roleToDelete)}
        onClose={() => setRoleToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Role"
        description={`Are you sure you want to delete "${roleToDelete?.name}"? Roles with active Workforce members cannot be deleted until members are reassigned.`}
        isDeleting={isDeleting}
      />
    </div>
  );
};
