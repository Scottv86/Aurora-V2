import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as LucideIcons from 'lucide-react';
import { toast } from 'sonner';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { DATA_API_URL, API_BASE_URL } from '../../../config';
import { fetchRecords } from '../../../services/dataService';
import { checkCondition, getFieldValue, cn, flattenFields, slugify } from '../../../lib/utils';
import { UserAvatarWithPresence } from '../../Common/UserPresenceBadge';
import { QueueEntity } from '../../../types/platform';
import { PLATFORM_MODULES } from '../../../config/platformModules';
import { Table, Column } from '../../UI/Table';
import { ShareRecordModal } from '../../Platform/ShareRecordModal';

const InlineAssigneeCell = ({
  record,
  members = [],
  platformUser,
  updateMutation
}: {
  record: any;
  members?: any[];
  platformUser: any;
  updateMutation: any;
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [coords, setCoords] = useState<{ buttonTop: number; buttonBottom: number; left: number; width: number; openUpward: boolean; maxHeight: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const clickedInsideButton = menuRef.current && menuRef.current.contains(target);
      const clickedInsideDropdown = dropdownRef.current && dropdownRef.current.contains(target);
      if (!clickedInsideButton && !clickedInsideDropdown) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showMenu]);

  useEffect(() => {
    if (!showMenu || !buttonRef.current) return;

    const updateCoords = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const headerHeight = 110;
      const spaceBelow = window.innerHeight - rect.bottom - 16;
      const spaceAbove = rect.top - headerHeight;
      const dropdownHeight = 240;
      
      let openUp = false;
      let maxHeight = dropdownHeight;

      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow && spaceAbove >= 120) {
        openUp = true;
        maxHeight = Math.min(dropdownHeight, spaceAbove - 10);
      } else {
        openUp = false;
        maxHeight = Math.max(120, Math.min(dropdownHeight, spaceBelow - 10));
      }
      
      setCoords({
        buttonTop: rect.top,
        buttonBottom: rect.bottom,
        left: rect.left,
        width: Math.max(rect.width, 224),
        openUpward: openUp,
        maxHeight
      });
    };

    updateCoords();
    window.addEventListener('scroll', updateCoords, true);
    window.addEventListener('resize', updateCoords);
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [showMenu]);

  const val = record.assigneeId;
  const resolvedUser = members?.find((m: any) => m.id === val || m.cuid === val || m.memberId === val);

  const handleUpdate = (newId: string | null) => {
    updateMutation.mutate({
      recordId: record.id,
      moduleId: record.moduleId,
      assigneeId: newId
    });
  };

  const filteredMembers = (members || []).filter((m: any) => 
    !search.trim() || m.name?.toLowerCase().includes(search.toLowerCase().trim())
  );

  return (
    <div className="relative inline-block text-left" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-xl transition-all border text-left group",
          showMenu 
            ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500/50 text-indigo-900 dark:text-indigo-100" 
            : "bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-800 border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
        )}
      >
        {resolvedUser ? (
          <>
            <UserAvatarWithPresence
              avatarUrl={resolvedUser.avatarUrl}
              name={resolvedUser.name}
              status={(resolvedUser as any).status || (resolvedUser as any).presenceStatus}
              size="xs"
            />
            <span className="text-[11px] font-bold truncate max-w-[80px]">
              {resolvedUser.name}
            </span>
          </>
        ) : (
          <>
            <div className="w-5 h-5 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-400 dark:text-zinc-500 group-hover:text-indigo-500 group-hover:border-indigo-500 transition-colors">
              <LucideIcons.User size={10} />
            </div>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-bold group-hover:text-zinc-900 dark:group-hover:text-zinc-300 transition-colors">
              Unassigned
            </span>
          </>
        )}
        <LucideIcons.ChevronDown size={12} className="text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors shrink-0" />
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showMenu && coords && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: coords.openUpward ? -4 : 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: coords.openUpward ? -4 : 4, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                left: `${Math.max(16, Math.min(coords.left, window.innerWidth - coords.width - 16))}px`,
                width: `${coords.width}px`,
                zIndex: 99999,
                maxHeight: `${coords.maxHeight}px`,
                ...(coords.openUpward 
                  ? { bottom: `${window.innerHeight - coords.buttonTop + 4}px` } 
                  : { top: `${coords.buttonBottom + 4}px` })
              }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden flex flex-col"
            >
              {/* Quick Actions */}
              <div className="p-1 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const me = members.find(m => m.id === platformUser?.memberId || m.id === platformUser?.cuid || m.id === platformUser?.id);
                    if (me) handleUpdate(me.id);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-2 py-1 rounded-lg text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <LucideIcons.UserCheck size={10} />
                  <span>Assign to me</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleUpdate(null);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-2 py-1 rounded-lg text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <LucideIcons.UserMinus size={10} />
                  <span>Clear Assignee</span>
                </button>
              </div>

              {/* Search Input */}
              <div className="p-1 border-b border-zinc-100 dark:border-zinc-800 relative">
                <LucideIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={10} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-7 pr-2 py-1 text-[10px] text-zinc-900 dark:text-zinc-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Members List */}
              <div className="overflow-y-auto max-h-40 p-1 divide-y divide-zinc-100/50 dark:divide-zinc-800/50">
                {filteredMembers.map((m: any) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      handleUpdate(m.id);
                      setShowMenu(false);
                    }}
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded-lg text-[10px] flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer",
                      m.id === val ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-bold" : "text-zinc-700 dark:text-zinc-300"
                    )}
                  >
                    <UserAvatarWithPresence
                      avatarUrl={m.avatarUrl}
                      name={m.name}
                      status={(m as any).status || (m as any).presenceStatus}
                      size="xs"
                    />
                    <span className="truncate flex-1">{m.name}</span>
                    {m.id === val && <LucideIcons.Check size={10} className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export interface QueueRendererProps {
  queue?: QueueEntity | null;
  queueId?: string;
  queueConfig?: any;
  moduleId?: string;
  moduleIds?: string[];
  isUnifiedQueue?: boolean;
  showHeader?: boolean;
  pageSize?: number;
  className?: string;
  onRowClick?: (record: any) => void;
  readOnly?: boolean;
  name?: string;
  noContainer?: boolean;
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  density?: 'compact' | 'standard' | 'spacious';
}

export const QueueRenderer: React.FC<QueueRendererProps> = ({
  queue: initialQueue,
  queueId,
  queueConfig: overrideConfig,
  moduleId: propModuleId,
  moduleIds: propModuleIds,
  isUnifiedQueue: propIsUnified,
  showHeader = true,
  pageSize: customPageSize = 10,
  className,
  onRowClick,
  readOnly = false,
  name: propName,
  noContainer = false,
  searchable = true,
  searchValue: controlledSearchValue,
  onSearchChange: controlledOnSearchChange,
  density = 'standard'
}) => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { tenant, modules, menuConfig, members, user: platformUser, isLoading: platformLoading } = usePlatform();
  const { pageId: routePageId, queueId: routeQueueId } = useParams<{ pageId?: string; queueId?: string }>();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const searchQuery = controlledSearchValue !== undefined ? controlledSearchValue : internalSearchQuery;
  const setSearchQuery = controlledOnSearchChange || setInternalSearchQuery;
  const [recordToDelete, setRecordToDelete] = useState<any | null>(null);
  const [recordToShare, setRecordToShare] = useState<any | null>(null);
  const [pageSize, setPageSize] = useState<number>(customPageSize || 10);

  const hasInlineConfig = Boolean(overrideConfig || propModuleId || (propModuleIds && propModuleIds.length > 0));

  // 1. Search menuConfig / modules synchronously first for navigation queue definition
  const navExtractedQueue = useMemo<QueueEntity | null>(() => {
    if (!queueId || initialQueue) return null;

    let foundItem: any = null;
    const walk = (items: any[]) => {
      for (const it of items || []) {
        if (it.id === queueId || it.queueId === queueId || it.to?.includes(queueId) || (it.label && slugify(it.label) === queueId)) {
          foundItem = it;
          return;
        }
        if (it.children) walk(it.children);
      }
    };
    if (menuConfig?.sections) {
      for (const sec of menuConfig.sections) {
        walk(sec.items);
        if (foundItem) break;
      }
    }
    if ((tenant?.menuConfig as any)?.sections && !foundItem) {
      for (const sec of (tenant.menuConfig as any).sections) {
        walk(sec.items);
        if (foundItem) break;
      }
    }

    if (foundItem) {
      return {
        id: foundItem.id,
        tenantId: tenant?.id || 't1',
        name: foundItem.label || 'Work Queue',
        isUnifiedQueue: Boolean(foundItem.isUnifiedQueue),
        moduleId: foundItem.moduleId,
        moduleIds: foundItem.moduleIds || (foundItem.moduleId ? [foundItem.moduleId] : []),
        queueConfig: foundItem.queueConfig || {
          conditions: { type: 'group', logicalOperator: 'AND', rules: [] },
          columns: ['id', 'moduleId', 'title', 'status', 'priority', 'assigneeId', 'createdAt']
        },
        status: 'PUBLISHED'
      };
    }
    return null;
  }, [queueId, initialQueue, menuConfig, tenant?.menuConfig, tenant?.id]);

  // 2. Fetch queue entity by queueId only if not passed directly, not in menuConfig, and not configured inline
  const { data: fetchedQueue } = useQuery<QueueEntity | null>({
    queryKey: ['queue-renderer-entity', tenant?.id, queueId, session?.access_token],
    queryFn: async () => {
      if (!queueId || !tenant?.id) return null;
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch(`${API_BASE_URL}/api/queues/${queueId}`, {
          headers: { 'x-tenant-id': tenant.id, ...authHeader }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) return data;
        }
        // Fallback: list all queues
        const allRes = await fetch(`${API_BASE_URL}/api/queues`, {
          headers: { 'x-tenant-id': tenant.id, ...authHeader }
        });
        if (allRes.ok) {
          const allData = await allRes.json();
          const match = (allData || []).find((q: any) => q.id === queueId || q.slug === queueId);
          if (match) return match;
        }
      } catch (err) {
        console.error('Failed to fetch queue in QueueRenderer:', err);
      }
      return null;
    },
    enabled: !!queueId && !initialQueue && !hasInlineConfig && !navExtractedQueue && !!tenant?.id,
    staleTime: 60000,
    gcTime: 300000
  });

  // Helper to dynamically resolve module metadata (by id, slug, table name, or platform module)
  const getRecordModule = (recOrId: any) => {
    if (!recOrId) return null;
    const mId = typeof recOrId === 'string' ? recOrId : (recOrId.moduleId || recOrId._moduleId || recOrId.module_id);
    if (!mId) return null;

    // 1. Match from tenant modules (from usePlatform)
    const match = (modules || []).find((m: any) => 
      m.id === mId || 
      m.slug === mId || 
      slugify(m.name || '') === slugify(mId) || 
      m.tableName === mId || 
      m.name?.toLowerCase() === mId.toLowerCase()
    );
    if (match) return match;

    // 2. Match from PLATFORM_MODULES
    const platMatch = (PLATFORM_MODULES as any[] || []).find((m: any) => 
      m.id === mId || 
      m.slug === mId || 
      slugify(m.name || '') === slugify(mId) || 
      m.name?.toLowerCase() === mId.toLowerCase()
    );
    if (platMatch) return platMatch;

    return null;
  };

  const getRecordModuleName = (rec: any) => {
    if (!rec) return 'Module';
    const mod = getRecordModule(rec);
    if (mod?.name) return mod.name;
    if (rec.moduleName && rec.moduleName !== 'Unknown Module') return rec.moduleName;
    if (rec._moduleName && rec._moduleName !== 'Unknown Module') return rec._moduleName;
    if (targetModuleIds.length === 1) {
      const singleMod = getRecordModule(targetModuleIds[0]);
      if (singleMod?.name) return singleMod.name;
    }
    const mId = typeof rec === 'string' ? rec : (rec.moduleId || rec._moduleId);
    if (mId && typeof mId === 'string' && !mId.startsWith('cm_') && !mId.startsWith('mod_')) {
      return mId.charAt(0).toUpperCase() + mId.slice(1).replace(/[-_]/g, ' ');
    }
    return 'Module';
  };

  const getRecordModuleIcon = (rec: any) => {
    if (!rec) return 'Box';
    const mod = getRecordModule(rec);
    return mod?.icon || mod?.iconName || rec.moduleIcon || rec._moduleIcon || 'Box';
  };

  // 3. Active queue resolution
  const activeQueue = useMemo<QueueEntity | null>(() => {
    if (initialQueue) return initialQueue;
    if (fetchedQueue) return fetchedQueue;
    if (navExtractedQueue) return navExtractedQueue;
    if (overrideConfig || propModuleId || propModuleIds) {
      const explicitModuleIds = propModuleIds || overrideConfig?.moduleIds || (propModuleId || overrideConfig?.moduleId ? [propModuleId || overrideConfig?.moduleId] : []);
      const fallbackModId = (modules || []).find((m: any) => m.type !== 'PAGE')?.id || (modules || [])[0]?.id;
      const queueName = propName || overrideConfig?.name || 'Work Queue';
      return {
        id: queueId || 'custom-queue',
        tenantId: tenant?.id || 't1',
        name: queueName,
        isUnifiedQueue: propIsUnified ?? Boolean(overrideConfig?.isUnifiedQueue),
        moduleId: propModuleId || overrideConfig?.moduleId || (explicitModuleIds.length === 1 ? explicitModuleIds[0] : fallbackModId),
        moduleIds: explicitModuleIds.length > 0 ? explicitModuleIds : (fallbackModId ? [fallbackModId] : []),
        queueConfig: overrideConfig || {
          conditions: { type: 'group', logicalOperator: 'AND', rules: [] },
          columns: ['id', 'moduleId', 'title', 'status', 'priority', 'assigneeId', 'createdAt']
        },
        status: 'PUBLISHED'
      };
    }
    return null;
  }, [initialQueue, fetchedQueue, navExtractedQueue, overrideConfig, propModuleId, propModuleIds, propIsUnified, propName, queueId, tenant?.id, modules]);

  // Target module IDs
  const targetModuleIds = useMemo(() => {
    if (!activeQueue) return [];
    if (activeQueue.isUnifiedQueue) {
      return (activeQueue.moduleIds && activeQueue.moduleIds.length > 0)
        ? activeQueue.moduleIds
        : (modules || []).filter((m: any) => m.type !== 'PAGE').map((m: any) => m.id);
    }
    if (activeQueue.moduleId) return [activeQueue.moduleId];
    if (activeQueue.moduleIds && activeQueue.moduleIds.length > 0) return activeQueue.moduleIds;
    return [];
  }, [activeQueue, modules]);

  // Fetch records across all target modules
  const { data: rawRecords = [], isLoading: recordsQueryLoading } = useQuery<any[]>({
    queryKey: ['queue-renderer-records', tenant?.id, targetModuleIds.sort().join(','), session?.access_token],
    queryFn: async () => {
      if (!tenant?.id || targetModuleIds.length === 0) return [];
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      
      const promises = targetModuleIds.map(async (mId) => {
        try {
          const res = await fetchRecords(mId, tenant.id, token, 1, 100);
          const records = res?.records || [];
          return records.map((r: any) => ({
            ...r,
            moduleId: r.moduleId || mId,
            moduleName: getRecordModuleName(mId),
            moduleIcon: getRecordModuleIcon(mId)
          }));
        } catch (err) {
          console.error(`Failed to fetch records for module ${mId} in QueueRenderer:`, err);
          return [];
        }
      });

      const results = await Promise.all(promises);
      return results.flat();
    },
    enabled: targetModuleIds.length > 0 && !!tenant?.id,
    staleTime: 30000,
    gcTime: 120000
  });

  // Evaluate queue condition groups
  const visibilityContext = useMemo(() => ({
    user: platformUser,
    currentUser: platformUser,
    tenant
  }), [platformUser, tenant]);

  const filteredRecords = useMemo(() => {
    if (!Array.isArray(rawRecords)) return [];

    let result = rawRecords.filter((record: any) => {
      // 1. Evaluate queue conditions
      if (activeQueue?.queueConfig?.conditions) {
        const cond = activeQueue.queueConfig.conditions;
        const matches = checkCondition(cond, record, visibilityContext);
        if (!matches) return false;
      }

      // 2. Client-side search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const title = record.title || record.data?.title || record.name || record.data?.name || record.id || '';
        const status = record.status || record.data?.status || '';
        const priority = record.priority || record.data?.priority || '';
        const modName = getRecordModuleName(record);

        const matchesSearch = 
          String(title).toLowerCase().includes(query) ||
          String(status).toLowerCase().includes(query) ||
          String(priority).toLowerCase().includes(query) ||
          String(modName).toLowerCase().includes(query) ||
          String(record.id).toLowerCase().includes(query);

        if (!matchesSearch) return false;
      }

      return true;
    });

    return result;
  }, [rawRecords, activeQueue, searchQuery, visibilityContext, members, modules]);

  // Inline Assignee Claim/Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ recordId, moduleId, assigneeId }: { recordId: string; moduleId: string; assigneeId: string | null }) => {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${DATA_API_URL}/records/${recordId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify({ moduleId, assigneeId })
      });
      if (!res.ok) throw new Error('Failed to update assignee');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-renderer-records'] });
      toast.success('Assignee updated');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update assignee');
    }
  });

  // Bulk records mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ records, patchData }: { records: any[]; patchData: any }) => {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      await Promise.all(records.map(async (r) => {
        const mId = r.moduleId || activeQueue?.moduleId || (activeQueue?.moduleIds && activeQueue.moduleIds[0]);
        return fetch(`${DATA_API_URL}/records/${r.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant?.id || ''
          },
          body: JSON.stringify({ moduleId: mId, ...patchData })
        });
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-renderer-records'] });
      toast.success('Updated selected records');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update selected records');
    }
  });

  // Single delete mutation
  const singleDeleteMutation = useMutation({
    mutationFn: async (record: any) => {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const mId = record.moduleId || activeQueue?.moduleId || (activeQueue?.moduleIds && activeQueue.moduleIds[0]);
      const res = await fetch(`${DATA_API_URL}/records/${record.id}?moduleId=${mId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete record');
      }
      return record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-renderer-records'] });
      queryClient.invalidateQueries({ queryKey: ['records'] });
      toast.success('Record moved to Recycling Bin');
      setRecordToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete record');
    }
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ records }: { records: any[] }) => {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      await Promise.all(records.map(async (r) => {
        const mId = r.moduleId || activeQueue?.moduleId || (activeQueue?.moduleIds && activeQueue.moduleIds[0]);
        return fetch(`${DATA_API_URL}/records/${r.id}?moduleId=${mId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant?.id || ''
          }
        });
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-renderer-records'] });
      queryClient.invalidateQueries({ queryKey: ['records'] });
      toast.success('Moved selected records to Recycling Bin');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete selected records');
    }
  });

  // Columns definition
  const columnsToRender = useMemo(() => {
    const configCols = activeQueue?.queueConfig?.columns;
    if (configCols && configCols.length > 0) return configCols;
    return ['id', 'moduleId', 'title', 'status', 'priority', 'assigneeId', 'createdAt'];
  }, [activeQueue]);

  const columnLabel = (colId: string) => {
    switch (colId) {
      case 'id': return 'Record ID';
      case 'moduleId': return 'Module';
      case 'title': return 'Title/Key';
      case 'status': return 'Status';
      case 'priority': return 'Priority';
      case 'assigneeId': return 'Assignee';
      case 'createdAt': return 'Created';
      case 'updatedAt': return 'Updated';
      default: {
        for (const mId of targetModuleIds) {
          const mod = getRecordModule(mId);
          if (mod?.layout) {
            const flat = flattenFields(mod.layout);
            const field = flat.find((f: any) => f.id === colId);
            if (field) return field.label || field.name;
          }
        }
        return colId.charAt(0).toUpperCase() + colId.slice(1);
      }
    }
  };

  const renderCell = (record: any, colId: string) => {
    let value = getFieldValue(record, colId) ?? record[colId];
    if (colId === 'title' && (value === undefined || value === null || value === '')) {
      value = record.title || record.data?.title || record.name || record.data?.name || record._record_key || record.id;
    }

    if (value === undefined || value === null || value === '') {
      return <span className="text-zinc-400 dark:text-zinc-600">-</span>;
    }

    switch (colId) {
      case 'id':
      case '_record_key':
      case 'key':
        return (
          <span className="text-xs font-normal text-zinc-600 dark:text-zinc-400 font-mono">
            {record._record_key || record.key || record.id || '-'}
          </span>
        );
      case 'moduleId':
        return (
          <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate">
            {getRecordModuleName(record)}
          </span>
        );
      case 'title':
        return <span className="text-xs text-zinc-800 dark:text-zinc-200 line-clamp-1">{String(value)}</span>;
      case 'status':
        return (
          <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/20 inline-block">
            {String(value)}
          </span>
        );
      case 'priority':
        return (
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-bold border inline-block",
            String(value).toLowerCase().includes('high') || String(value).toLowerCase().includes('critical')
              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
              : String(value).toLowerCase().includes('med')
              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
              : "bg-blue-500/10 text-blue-400 border-blue-500/20"
          )}>
            {String(value)}
          </span>
        );
      case 'assigneeId': {
        return (
          <InlineAssigneeCell
            record={record}
            members={members}
            platformUser={platformUser}
            updateMutation={updateMutation}
          />
        );
      }
      case 'createdAt':
        return (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {value ? new Date(value).toLocaleDateString() : 'Just now'}
          </span>
        );
      case 'updatedAt':
        return (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {value ? new Date(value).toLocaleDateString() : 'Just now'}
          </span>
        );
      default:
        return <span className="text-xs text-zinc-700 dark:text-zinc-300">{valOrDash(value)}</span>;
    }
  };

  const valOrDash = (v: any) => {
    if (v === undefined || v === null || v === '') return '-';
    return String(v);
  };

  const densityClass = useMemo(() => {
    if (density === 'compact') return 'px-3.5 py-1.5 text-[11px] leading-normal font-medium';
    if (density === 'spacious') return 'px-6 py-4 text-sm leading-relaxed';
    return 'px-4 py-2 text-xs';
  }, [density]);

  // Dynamic filter fields schema for Queues
  const queueFilterFields = useMemo(() => {
    const systemFields = [
      { id: 'id', label: 'Record ID / Key', type: 'text' as const },
      ...(targetModuleIds.length > 1 || activeQueue?.isUnifiedQueue ? [{
        id: 'moduleId',
        label: 'Module',
        type: 'select' as const,
        options: targetModuleIds.map(mId => {
          const mod = getRecordModule(mId);
          return {
            label: mod?.name || mod?.label || mId,
            value: mId
          };
        })
      }] : []),
      { id: 'title', label: 'Title / Summary', type: 'text' as const },
      { 
        id: 'status', 
        label: 'Status', 
        type: 'status' as const, 
        options: ['Open', 'In Progress', 'Under Review', 'Completed', 'Closed'] 
      },
      { 
        id: 'priority', 
        label: 'Priority', 
        type: 'select' as const, 
        options: ['Low', 'Medium', 'High', 'Critical'] 
      },
      { 
        id: 'assigneeId', 
        label: 'Assignee', 
        type: 'user' as const, 
        userOptions: members 
      },
      { id: 'createdAt', label: 'Created At', type: 'date' as const },
      { id: 'updatedAt', label: 'Updated At', type: 'date' as const }
    ];

    // Extract custom fields from target modules
    const customFieldsMap = new Map<string, any>();
    targetModuleIds.forEach(mId => {
      const mod = getRecordModule(mId);
      if (mod) {
        const rawFields = mod.fields || mod.config?.fields || (mod.layout ? flattenFields(mod.layout) : []) || mod.tabs?.flatMap((t: any) => t.fields || []) || [];
        rawFields.forEach((f: any) => {
          if (f.id && !customFieldsMap.has(f.id) && !systemFields.some(sf => sf.id === f.id)) {
            customFieldsMap.set(f.id, {
              id: f.id,
              label: f.label || f.name || f.id,
              type: f.type || 'text',
              options: f.options,
              userOptions: ['user', 'member', 'assignee'].includes(f.type) || f.id === 'assigneeId' || f.id === 'assignee' ? members : undefined
            });
          }
        });
      }
    });

    return [...systemFields, ...Array.from(customFieldsMap.values())];
  }, [targetModuleIds, activeQueue, modules, members]);

  const tableColumns: Column<any>[] = useMemo(() => {
    const cols: Column<any>[] = columnsToRender.map((colId: string) => ({
      header: columnLabel(colId),
      accessor: (record: any) => renderCell(record, colId),
      sortable: true,
      sortKey: colId,
      filterKey: colId,
      className: densityClass
    }));

    if (!readOnly) {
      cols.push({
        header: 'Actions',
        align: 'right',
        filterable: false,
        className: cn('text-right', densityClass),
        accessor: (record: any) => (
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setRecordToShare(record)}
              className="p-1.5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-all cursor-pointer"
              title="Share Record"
            >
              <LucideIcons.Share2 size={14} />
            </button>
            <button
              onClick={() => setRecordToDelete(record)}
              className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-400/10 rounded-lg transition-all cursor-pointer"
              title="Move to Recycling Bin"
            >
              <LucideIcons.Trash2 size={14} />
            </button>
          </div>
        )
      });
    }

    return cols;
  }, [columnsToRender, members, platformUser, readOnly, densityClass]);

  return (
    <div className={cn("w-full h-full flex flex-col min-h-0", className)}>
      <Table
        key={`queue_table_${activeQueue?.id || queueId || 'queue'}`}
        filterScopeId={activeQueue?.id || queueId || 'queue'}
        enableSavedViews={true}
        scopeType="QUEUE"
        scopeId={activeQueue?.id || queueId || 'queue'}
        tenantId={tenant?.id}
        token={(session as any)?.access_token}
        className="h-full flex-1 w-full"
        data={filteredRecords}
        columns={tableColumns}
        loading={recordsQueryLoading || platformLoading}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[10, 25, 50, 100]}
        density={density}
        enableSelection={!readOnly}
        enableFilters={true}
        filterFields={queueFilterFields}
        currentUserId={(platformUser as any)?.memberId || (platformUser as any)?.cuid || (platformUser as any)?.id || (session?.user as any)?.id}
        currentUserName={(platformUser as any)?.name || (session?.user as any)?.user_metadata?.full_name || (session?.user as any)?.email}
        assigneeOptions={members}
        statusOptions={['Open', 'In Progress', 'Under Review', 'Completed', 'Closed']}
        title={showHeader ? activeQueue?.name : undefined}
        subtitle={showHeader ? activeQueue?.description : undefined}
        searchable={searchable}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search queue records..."
        noContainer={noContainer}
        onRowClick={(record) => {
          if (onRowClick) {
            onRowClick(record);
          } else if (!readOnly) {
            const effectivePageId = routePageId || (location.pathname.startsWith('/workspace/pages/') ? location.pathname.split('/')[3] : null);
            const effectiveQueueId = routeQueueId || queueId || (location.pathname.startsWith('/workspace/queues/') ? location.pathname.split('/')[3] : null);
            
            if (effectivePageId) {
              navigate(`/workspace/pages/${effectivePageId}/modules/${record.moduleId}/records/${record.id}`);
            } else if (effectiveQueueId) {
              navigate(`/workspace/queues/${effectiveQueueId}/modules/${record.moduleId}/records/${record.id}`);
            } else {
              navigate(`/workspace/modules/${record.moduleId}/records/${record.id}`);
            }
          }
        }}
        onBulkAssign={(_selectedIds, selectedItems, assigneeId, clearSelection) => {
          bulkUpdateMutation.mutate({ records: selectedItems, patchData: { assigneeId } });
          clearSelection();
        }}
        onBulkStatusChange={(_selectedIds, selectedItems, status, clearSelection) => {
          bulkUpdateMutation.mutate({ records: selectedItems, patchData: { status } });
          clearSelection();
        }}
        onBulkDelete={(_selectedIds, selectedItems, clearSelection) => {
          bulkDeleteMutation.mutate({ records: selectedItems });
          clearSelection();
        }}
        bulkActions={(_selectedIds, selectedItems, clearSelection) => {
          const me = platformUser?.memberId || platformUser?.cuid || platformUser?.id;
          if (!me) return null;
          return (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  bulkUpdateMutation.mutate({ records: selectedItems, patchData: { assigneeId: me } });
                  clearSelection();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
              >
                Claim All
              </button>
            </div>
          );
        }}
      />

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {recordToDelete && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setRecordToDelete(null)}
                className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-[440px] max-w-[95vw] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl p-10 space-y-8"
              >
                <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-500 mx-auto">
                  <LucideIcons.AlertCircle size={32} />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Delete Entry?</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                    Are you sure you want to delete this record? This record will be moved to the Recycling Bin and can be restored at any time.
                  </p>
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setRecordToDelete(null)}
                    className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl font-bold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => singleDeleteMutation.mutate(recordToDelete)}
                    disabled={singleDeleteMutation.isPending}
                    className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition-all shadow-xl shadow-rose-500/20 cursor-pointer disabled:opacity-50"
                  >
                    {singleDeleteMutation.isPending ? 'Moving...' : 'Move to Recycling Bin'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Share Record Modal */}
      {recordToShare && (
        <ShareRecordModal
          isOpen={!!recordToShare}
          onClose={() => setRecordToShare(null)}
          record={recordToShare}
          moduleId={recordToShare?.moduleId || activeQueue?.moduleId}
          moduleName={getRecordModuleName(recordToShare)}
        />
      )}
    </div>
  );
};
