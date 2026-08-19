import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as LucideIcons from 'lucide-react';
import { toast } from 'sonner';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { DATA_API_URL, API_BASE_URL } from '../../../config';
import { fetchRecords } from '../../../services/dataService';
import { checkCondition, getFieldValue, cn, flattenFields, slugify } from '../../../lib/utils';
import { DynamicIcon } from '../../UI/DynamicIcon';
import { Skeleton } from '../../UI/Skeleton';
import { UserAvatarWithPresence } from '../../Common/UserPresenceBadge';
import { QueueEntity } from '../../../types/platform';
import { PLATFORM_MODULES } from '../../../config/platformModules';
import { builderCache } from '../../../utils/builderCache';

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
  name: propName
}) => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { tenant, modules, menuConfig, members, user: platformUser, isLoading: platformLoading } = usePlatform();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = customPageSize;
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const hasInlineConfig = Boolean(overrideConfig || propModuleId || (propModuleIds && propModuleIds.length > 0));

  // 1. Fetch queue entity by queueId only if not passed directly and not already configured inline
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
    enabled: !!queueId && !initialQueue && !hasInlineConfig && !!tenant?.id,
    staleTime: 60000,
    gcTime: 300000
  });

  // 2. Search menuConfig / modules for navigation queue definition
  const navExtractedQueue = useMemo<QueueEntity | null>(() => {
    if (!queueId || initialQueue || fetchedQueue) return null;

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
  }, [queueId, initialQueue, fetchedQueue, menuConfig, tenant?.menuConfig, tenant?.id]);

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
        isUnifiedQueue: propIsUnified ?? overrideConfig?.isUnifiedQueue ?? (explicitModuleIds.length > 1),
        moduleId: propModuleId || overrideConfig?.moduleId,
        moduleIds: explicitModuleIds.length > 0 ? explicitModuleIds : (fallbackModId ? [fallbackModId] : []),
        queueConfig: overrideConfig || {
          conditions: { type: 'group', logicalOperator: 'AND', rules: [] },
          columns: ['id', 'moduleId', 'title', 'status', 'priority', 'assigneeId', 'createdAt']
        },
        status: 'PUBLISHED'
      };
    }
    return null;
  }, [initialQueue, fetchedQueue, navExtractedQueue, overrideConfig, propModuleId, propModuleIds, propIsUnified, queueId, tenant?.id, modules, propName]);

  const targetModuleIds = useMemo(() => {
    if (!activeQueue) return [];
    if (activeQueue.isUnifiedQueue && activeQueue.moduleIds?.length) {
      return activeQueue.moduleIds.filter(Boolean);
    }
    if (activeQueue.moduleId) {
      return [activeQueue.moduleId];
    }
    if (activeQueue.moduleIds?.length) {
      return activeQueue.moduleIds.filter(Boolean);
    }
    // Fallback to all custom modules if unified queue without explicit moduleIds
    if (activeQueue.isUnifiedQueue) {
      return (modules || []).filter((m: any) => m.type !== 'PAGE').map((m: any) => m.id);
    }
    // Fallback to first custom module
    const firstCustomMod = (modules || []).find((m: any) => m.type !== 'PAGE');
    if (firstCustomMod) return [firstCustomMod.id];
    return [];
  }, [activeQueue, modules]);

  const recordsCacheKey = `queue_records_${tenant?.id || 't1'}_${targetModuleIds.join('_')}_${activeQueue?.id || 'default'}`;

  // Fetch all records for target modules with instant cache hydration
  const { data: rawRecords = [], isLoading: recordsQueryLoading } = useQuery({
    queryKey: ['queue-renderer-records', tenant?.id, targetModuleIds, activeQueue?.id],
    queryFn: async () => {
      if (!tenant?.id || targetModuleIds.length === 0) return [];
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;

      const promises = targetModuleIds.map((mId: string) =>
        fetchRecords(mId, tenant.id, token, 1, 100).catch(() => ({ records: [] as any[] }))
      );
      const results = await Promise.all(promises);

      const combined = results.flatMap((res: any, idx) => {
        const mId = targetModuleIds[idx];
        const mod = getRecordModule(mId);
        return (res?.records || []).map((r: any) => ({
          ...r,
          moduleId: r.moduleId || mId,
          _moduleName: r.moduleName || mod?.name || getRecordModuleName(r.moduleId || mId),
          _moduleIcon: r.moduleIcon || mod?.icon || mod?.iconName || 'Box'
        }));
      });

      builderCache.set(recordsCacheKey, combined);
      return combined;
    },
    placeholderData: () => {
      const cached = builderCache.get<any[]>(recordsCacheKey);
      return Array.isArray(cached) && cached.length > 0 ? cached : undefined;
    },
    enabled: !!tenant?.id && targetModuleIds.length > 0 && !!(session?.access_token || (import.meta as any).env.VITE_DEV_TOKEN),
    staleTime: 10000,
    gcTime: 300000
  });

  const visibilityContext = useMemo(() => ({
    user: platformUser,
    tenant,
    session
  }), [platformUser, tenant, session]);

  // Filter records based on condition and search query
  const filteredRecords = useMemo(() => {
    let result = Array.isArray(rawRecords) ? rawRecords : [];

    const conditions = activeQueue?.queueConfig?.conditions;
    if (conditions && conditions.rules && conditions.rules.length > 0) {
      result = result.filter(record =>
        checkCondition(conditions, record, visibilityContext)
      );
    }

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(record =>
        Object.entries(record).some(([key, val]) => {
          if (key.startsWith('_') || val === null || val === undefined) return false;
          if (typeof val === 'object') return false;
          return String(val).toLowerCase().includes(query);
        })
      );
    }

    if (sortConfig) {
      const { key, direction } = sortConfig;
      result = [...result].sort((a, b) => {
        let valA = a[key];
        let valB = b[key];

        if (key === 'moduleId') {
          valA = getRecordModuleName(a);
          valB = getRecordModuleName(b);
        } else if (key === 'assigneeId') {
          const userA = members.find((m: any) => m.cuid === a.assigneeId || m.memberId === a.assigneeId);
          const userB = members.find((m: any) => m.cuid === b.assigneeId || m.memberId === b.assigneeId);
          valA = userA ? userA.name : '';
          valB = userB ? userB.name : '';
        } else if (key === 'title') {
          valA = a.data?.title || a.data?.name || a.title || a.name || a.id;
          valB = b.data?.title || b.data?.name || b.title || b.name || b.id;
        } else if (key === 'createdAt' || key === 'updatedAt') {
          valA = new Date(valA || 0).getTime();
          valB = new Date(valB || 0).getTime();
        } else if (valA === undefined || valA === null) {
          valA = a.data?.[key];
          valB = b.data?.[key];
        }

        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        if (typeof valA === 'string' && typeof valB === 'string') {
          return direction === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [rawRecords, activeQueue, searchQuery, visibilityContext, sortConfig, members, modules]);

  // Paginated records
  const totalRecords = Array.isArray(filteredRecords) ? filteredRecords.length : 0;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    if (!Array.isArray(filteredRecords)) return [];
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

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

  const handleClaim = (record: any) => {
    const me = platformUser?.memberId || platformUser?.cuid || platformUser?.id;
    if (!me) return;
    updateMutation.mutate({ recordId: record.id, moduleId: record.moduleId, assigneeId: me });
  };

  const handleRelease = (record: any) => {
    updateMutation.mutate({ recordId: record.id, moduleId: record.moduleId, assigneeId: null });
  };

  const handleSort = (colId: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === colId && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: colId, direction });
  };

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
      return <span className="text-zinc-300 dark:text-zinc-700 font-medium">-</span>;
    }

    switch (colId) {
      case 'id':
        return <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{String(value).slice(-6)}</span>;
      case 'moduleId':
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-500">
              <DynamicIcon name={getRecordModuleIcon(record)} size={11} />
            </div>
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{getRecordModuleName(record)}</span>
          </div>
        );
      case 'title':
        return <span className="text-xs font-extrabold text-zinc-900 dark:text-white line-clamp-1">{String(value)}</span>;
      case 'status':
        return (
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block",
            String(value).toLowerCase().includes('complete') || String(value).toLowerCase().includes('closed')
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : String(value).toLowerCase().includes('progress') || String(value).toLowerCase().includes('active')
              ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
              : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20"
          )}>
            {String(value)}
          </span>
        );
      case 'priority':
        return (
          <span className={cn(
            "text-[10px] font-extrabold tracking-tight",
            String(value).toLowerCase().includes('high') || String(value).toLowerCase().includes('critical') ? "text-rose-600 dark:text-rose-400" :
            String(value).toLowerCase().includes('med') ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"
          )}>
            {String(value)}
          </span>
        );
      case 'assigneeId': {
        const userObj = members.find((m: any) => m.id === value || m.cuid === value || m.memberId === value);
        const me = platformUser?.memberId || platformUser?.cuid || platformUser?.id;
        const isMe = value === me;

        if (userObj) {
          return (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <UserAvatarWithPresence
                avatarUrl={userObj.avatarUrl}
                name={userObj.name}
                status={(userObj as any).status || (userObj as any).presenceStatus}
                size="xs"
              />
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate max-w-[90px]">{userObj.name}</span>
              {isMe && !readOnly && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleRelease(record); }}
                  className="text-[9px] font-black uppercase text-rose-500 hover:underline ml-1 cursor-pointer"
                >
                  Release
                </button>
              )}
            </div>
          );
        }
        if (readOnly) {
          return <span className="text-xs text-zinc-400 italic">Unassigned</span>;
        }
        return (
          <button
            onClick={(e) => { e.stopPropagation(); handleClaim(record); }}
            className="text-[10px] font-extrabold uppercase text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer"
          >
            Claim Case
          </button>
        );
      }
      case 'createdAt':
      case 'updatedAt':
        return <span className="text-xs text-zinc-500">{new Date(value).toLocaleDateString()}</span>;
      default:
        return <span className="text-xs text-zinc-700 dark:text-zinc-300 line-clamp-1">{String(value)}</span>;
    }
  };

  if (platformLoading || (recordsQueryLoading && rawRecords.length === 0)) {
    return (
      <div className={cn("space-y-4 p-4 bg-white/60 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200 dark:border-zinc-800", className)}>
        <div className="flex items-center justify-between">
          <Skeleton width={180} height={24} variant="rounded" />
          <Skeleton width={120} height={32} variant="rounded" />
        </div>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} width="100%" height={40} variant="rounded" />
        ))}
      </div>
    );
  }

  if (!activeQueue || targetModuleIds.length === 0) {
    return (
      <div className={cn("p-8 text-center bg-white/40 dark:bg-zinc-900/30 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-2", className)}>
        <LucideIcons.Layers className="mx-auto text-zinc-400 dark:text-zinc-600" size={32} />
        <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">No Target Modules Assigned</h4>
        <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">Select at least one module in the Queue configuration to populate records.</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col bg-white/60 dark:bg-zinc-900/35 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-sm overflow-hidden", className)}>
      {/* Header & Search */}
      {showHeader && (
        <div className="p-4 border-b border-zinc-200/50 dark:border-zinc-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/30 dark:bg-zinc-900/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <DynamicIcon name={activeQueue.iconName || 'ListOrdered'} size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                {activeQueue.name}
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {totalRecords} records
                </span>
              </h3>
              {activeQueue.description && (
                <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">{activeQueue.description}</p>
              )}
            </div>
          </div>

          <div className="relative w-full sm:w-56">
            <LucideIcons.Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
            <input
              type="text"
              placeholder="Search queue records..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto custom-scrollbar flex-1">
        {paginatedRecords.length > 0 ? (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/40 dark:bg-zinc-900/30">
                {columnsToRender.map((colId: string) => {
                  const isSorted = sortConfig?.key === colId;
                  return (
                    <th
                      key={colId}
                      onClick={() => handleSort(colId)}
                      className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 cursor-pointer hover:bg-zinc-100/30 dark:hover:bg-white/[0.02] select-none transition-colors group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{columnLabel(colId)}</span>
                        {isSorted ? (
                          sortConfig.direction === 'asc' ? (
                            <LucideIcons.ChevronUp size={11} className="text-indigo-500 shrink-0" />
                          ) : (
                            <LucideIcons.ChevronDown size={11} className="text-indigo-500 shrink-0" />
                          )
                        ) : (
                          <LucideIcons.ArrowUpDown size={10} className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/30 dark:divide-zinc-800/40">
              {paginatedRecords.map((record) => (
                <tr
                  key={record.id}
                  onClick={() => {
                    if (onRowClick) {
                      onRowClick(record);
                    } else if (!readOnly) {
                      navigate(`/workspace/modules/${record.moduleId}/records/${record.id}`);
                    }
                  }}
                  className="hover:bg-zinc-50/60 dark:hover:bg-white/[0.02] cursor-pointer transition-all group"
                >
                  {columnsToRender.map((colId: string) => (
                    <td key={colId} className="px-4 py-3 align-middle">
                      {renderCell(record, colId)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center p-4">
            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-2">
              <LucideIcons.Inbox size={18} />
            </div>
            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">No records found</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">All matching queue items have been cleared or filter conditions returned zero results.</p>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-4 py-2.5 border-t border-zinc-200/40 dark:border-zinc-800/40 flex items-center justify-between bg-zinc-50/20 dark:bg-zinc-900/10 text-xs">
          <span className="text-[10px] text-zinc-400 font-bold uppercase">
            Page {page} of {totalPages} ({totalRecords} records)
          </span>
          <div className="flex gap-1.5">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-500 disabled:opacity-40 hover:bg-zinc-50"
            >
              <LucideIcons.ChevronLeft size={13} />
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-500 disabled:opacity-40 hover:bg-zinc-50"
            >
              <LucideIcons.ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
