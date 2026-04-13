import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, X, Check, Fingerprint, Info, TreeDeciduous, Crown, Zap } from 'lucide-react';
import { usePermissionGroups, PermissionGroup } from '../../../hooks/usePermissionGroups';
import { Button, Badge } from '../../UI/Primitives';
import { useAuth } from '../../../hooks/useAuth';
import { usePlatform } from '../../../hooks/usePlatform';
import { API_BASE_URL } from '../../../config';
import { toast } from 'sonner';

interface PermissionsTabProps {
  memberId: string;
  assignedGroups: PermissionGroup[];
  onUpdate: (groupIds: string[]) => Promise<void>;
}

interface EffectivePermissions {
  memberId: string;
  groups: { id: string; name: string; parentGroupId?: string }[];
  effectiveCapabilities: string[];
  breakdown: Record<string, string[]>;
}

export const PermissionsTab = ({ memberId, assignedGroups, onUpdate }: PermissionsTabProps) => {
  const { groups: allGroups, loading: groupsLoading } = usePermissionGroups();
  const { tenant } = usePlatform();
  const { session } = useAuth();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [effectivePerms, setEffectivePerms] = useState<EffectivePermissions | null>(null);
  const [loadingPerms, setLoadingPerms] = useState(true);

  const fetchEffectivePerms = useCallback(async () => {
    if (!tenant?.id || !memberId) return;
    setLoadingPerms(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/members/${memberId}/effective-permissions`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (!res.ok) throw new Error('Failed to load access summary');
      const data = await res.json();
      setEffectivePerms(data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setLoadingPerms(false);
    }
  }, [memberId, tenant?.id, session?.access_token]);

  useEffect(() => {
    fetchEffectivePerms();
  }, [fetchEffectivePerms, assignedGroups]); // Refresh summary whenever groups change

  const assignedIds = new Set(assignedGroups.map(g => g.id));

  const handleToggleGroup = async (groupId: string) => {
    setIsUpdating(true);
    try {
      const newIds = assignedIds.has(groupId)
        ? assignedGroups.filter(g => g.id !== groupId).map(g => g.id)
        : [...assignedGroups.map(g => g.id), groupId];
      
      await onUpdate(newIds);
    } finally {
      setIsUpdating(false);
    }
  };

  if (groupsLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Group Management */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header Info */}
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Shield className="text-blue-500" size={20} />
              Assigned Permission Groups
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              Groups determine the total capabilities granted to this staff member.
            </p>
          </div>

          {/* Assigned Groups */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignedGroups.length > 0 ? (
              assignedGroups.map(group => (
                <div 
                  key={group.id}
                  className="group relative flex flex-col p-4 rounded-2xl border border-blue-100 bg-blue-50/20 dark:border-blue-500/10 dark:bg-blue-500/5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-900 dark:text-blue-400">{group.name}</span>
                      {group.parentGroupId && (
                        <div title="This group inherits from a parent" className="p-1 rounded bg-blue-100 dark:bg-zinc-800 text-blue-600">
                          <TreeDeciduous size={10} />
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => handleToggleGroup(group.id)}
                      className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 shadow-sm border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 rounded-xl text-zinc-400 hover:text-red-500 transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {group.description && (
                    <p className="text-xs text-blue-800/60 dark:text-blue-400/60 mt-1.5 line-clamp-2 leading-relaxed">
                      {group.description}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="md:col-span-2 flex flex-col items-center justify-center p-10 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl text-center bg-zinc-50/30 dark:bg-zinc-900/10">
                <Shield className="text-zinc-300 dark:text-zinc-700 mb-3" size={36} strokeWidth={1.5} />
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">No Groups Assigned</p>
                <p className="text-xs text-zinc-500 mt-1 max-w-[240px]">This member currently relies on the default 'Standard' role permissions.</p>
              </div>
            )}
          </div>

          {/* Available Groups Section */}
          <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-400">Add Permissions</h3>
              <Button 
                variant={isAdding ? 'secondary' : 'primary'}
                size="sm" 
                className="gap-2 h-8 px-3 rounded-lg"
                onClick={() => setIsAdding(!isAdding)}
              >
                {isAdding ? <X size={14} /> : <Plus size={14} />}
                {isAdding ? 'Done Selection' : 'Assign Group'}
              </Button>
            </div>

            {isAdding && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                {allGroups.filter(g => !assignedIds.has(g.id)).map(group => (
                  <button
                    key={group.id}
                    disabled={isUpdating}
                    onClick={() => handleToggleGroup(group.id)}
                    className="flex flex-col items-start p-4 rounded-2xl border border-zinc-200 bg-white hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 transition-all dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 text-left"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{group.name}</span>
                      <div className="p-1.5 rounded-full bg-zinc-50 dark:bg-zinc-800 text-zinc-400">
                        <Plus size={12} />
                      </div>
                    </div>
                    {group.description && (
                      <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2 leading-relaxed">{group.description}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Key Summary & Diagnostics */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50 p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                <Fingerprint size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Access Summary</h3>
                <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Effective Capabilities</p>
              </div>
            </div>

            {loadingPerms ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="h-8 w-full bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : effectivePerms ? (
              <div className="space-y-6">
                {Object.entries(effectivePerms.breakdown).map(([category, items]) => {
                  const isGlobalFullAccess = category === '*' && items.includes('*:*');
                  
                  if (isGlobalFullAccess) {
                    return (
                      <div key={category} className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 border border-blue-400/20 shadow-lg shadow-blue-500/20 text-white space-y-2 animate-in fade-in zoom-in duration-500">
                        <div className="flex items-center gap-2">
                          <Crown size={16} className="text-yellow-300" />
                          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em]">Universal Access</h4>
                        </div>
                        <p className="text-[10px] text-blue-50/80 leading-relaxed font-medium">
                          This member has unrestricted administrative control across all platform categories and system modules.
                        </p>
                      </div>
                    );
                  }

                  const hasCategoryWildcard = items.some(cap => cap.endsWith(':*'));

                  return (
                    <div key={category} className="space-y-2">
                      <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center justify-between">
                        {category}
                        {hasCategoryWildcard ? (
                          <Badge variant="blue" className="text-[8px] h-4 px-1.5 uppercase font-bold tracking-tighter">Full access</Badge>
                        ) : (
                          <span className="text-blue-500 font-mono">{items.length}</span>
                        )}
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map(cap => {
                          const isWildcard = cap.includes(':*');
                          return (
                            <div 
                              key={cap}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                                isWildcard
                                  ? 'bg-blue-500 border-blue-500 text-white shadow-sm shadow-blue-500/20'
                                  : 'bg-white border-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300'
                              }`}
                            >
                              {cap}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                
                {Object.keys(effectivePerms.breakdown).length === 0 && (
                  <div className="py-8 text-center bg-white/50 dark:bg-black/20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <p className="text-xs text-zinc-400 px-4">No active capabilities granted via permission groups.</p>
                  </div>
                )}

                <div className="p-3 bg-blue-50/50 dark:bg-blue-500/5 rounded-2xl flex items-start gap-3 border border-blue-100/50 dark:border-blue-500/10">
                  <Info className="text-blue-500 shrink-0 mt-0.5" size={14} />
                  <p className="text-[10px] leading-relaxed text-blue-900/70 dark:text-blue-300/60">
                    This summary combines permissions from all assigned groups and their parents to show the final access state for this member.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-zinc-500">Could not resolve permissions.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
