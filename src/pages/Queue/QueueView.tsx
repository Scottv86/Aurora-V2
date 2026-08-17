import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as LucideIcons from 'lucide-react';
import { toast } from 'sonner';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { DATA_API_URL } from '../../config';
import { fetchRecords } from '../../services/dataService';
import { checkCondition, getFieldValue, cn, flattenFields, slugify } from '../../lib/utils';
import { DynamicIcon } from '../../components/UI/DynamicIcon';
import { UserAvatarWithPresence } from '../../components/Common/UserPresenceBadge';
import { PLATFORM_MODULES } from '../../config/platformModules';
import { builderCache, workspaceMotion } from '../../utils/builderCache';
import { motion } from 'motion/react';

export const QueueView = () => {
  const { queueId } = useParams<{ queueId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { tenant, menuConfig, modules, members, user: platformUser, isLoading: platformLoading } = usePlatform();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Helper to dynamically resolve module metadata (by id, slug, table name, or platform module)
  const getRecordModule = (recOrId: any) => {
    if (!recOrId) return null;
    const mId = typeof recOrId === 'string' ? recOrId : (recOrId.moduleId || recOrId._moduleId || recOrId.module_id);
    if (!mId) return null;

    const match = (modules || []).find((m: any) => 
      m.id === mId || 
      m.slug === mId || 
      slugify(m.name || '') === slugify(mId) || 
      m.tableName === mId || 
      m.name?.toLowerCase() === mId.toLowerCase()
    );
    if (match) return match;

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
    if (activeQueue?.moduleIds?.length === 1) {
      const singleMod = getRecordModule(activeQueue.moduleIds[0]);
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

  const handleSort = (colId: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === colId && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: colId, direction });
  };

  // Find the active Queue MenuItem in the menu tree configuration
  const activeQueue = useMemo(() => {
    if (!menuConfig?.sections || !queueId) return null;

    const findItem = (items: any[]): any => {
      for (const item of items) {
        if (item.id === queueId || slugify(item.label) === queueId || item.label.toLowerCase() === queueId.toLowerCase()) return item;
        if (item.children) {
          const found = findItem(item.children);
          if (found) return found;
        }
      }
      return null;
    };

    for (const section of menuConfig.sections) {
      const found = findItem(section.items || []);
      if (found) return found;
    }
    return null;
  }, [menuConfig, queueId]);

  // Fetch all records for the target modules of this unified queue
  const { data: rawRecords = [], isLoading: recordsQueryLoading } = useQuery({
    queryKey: ['queue-records', tenant?.id, queueId, activeQueue?.moduleIds, modules?.length],
    queryFn: async () => {
      if (!tenant?.id || !activeQueue?.moduleIds || activeQueue.moduleIds.length === 0) return [];
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      
      const promises = activeQueue.moduleIds.map((mId: string) => 
        fetchRecords(mId, tenant.id, token, 1, 1000)
      );
      const results = await Promise.all(promises);
      
      return results.flatMap((res: any, idx) => {
        const mId = activeQueue.moduleIds![idx];
        const mod = getRecordModule(mId);
        return (res?.records || []).map((r: any) => ({
          ...r,
          moduleId: r.moduleId || mId,
          _moduleName: r.moduleName || mod?.name || getRecordModuleName(r.moduleId || mId),
          _moduleIcon: r.moduleIcon || mod?.icon || mod?.iconName || 'Box'
        }));
      });
    },
    enabled: !!tenant?.id && !!activeQueue?.moduleIds && activeQueue.moduleIds.length > 0 && !!(session?.access_token || (import.meta as any).env.VITE_DEV_TOKEN)
  });

  const visibilityContext = useMemo(() => {
    return {
      user: platformUser,
      tenant,
      session
    };
  }, [platformUser, tenant, session]);

  // Filter records based on condition and search query
  const filteredRecords = useMemo(() => {
    let result = rawRecords;

    // Apply Queue conditions
    if (activeQueue?.queueConfig?.conditions) {
      result = result.filter(record => 
        checkCondition(activeQueue.queueConfig.conditions, record, visibilityContext)
      );
    }

    // Apply Local Search query
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

    // Apply Sorting if configured
    if (sortConfig) {
      const { key, direction } = sortConfig;
      result = [...result].sort((a, b) => {
        let valA = a[key];
        let valB = b[key];

        // Custom getters for special columns
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
  const totalRecords = filteredRecords.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
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
      queryClient.invalidateQueries({ queryKey: ['queue-records'] });
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

  // Columns definition: use activeQueue config or default
  const columnsToRender = useMemo(() => {
    const configCols = activeQueue?.queueConfig?.columns;
    if (configCols && configCols.length > 0) return configCols;
    
    // Default columns
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
        // Search custom field labels
        for (const mId of activeQueue?.moduleIds || []) {
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
    const value = getFieldValue(record, colId) ?? record[colId];

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
            "text-[10px] font-bold px-2 py-0.5 rounded-full border",
            value === 'Completed' || value === 'Closed'
              ? "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/10"
              : value === 'In Progress' || value === 'Active'
              ? "bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 border-indigo-500/10"
              : "bg-zinc-500/5 text-zinc-600 dark:text-zinc-400 border-zinc-500/10"
          )}>
            {String(value)}
          </span>
        );
      case 'priority':
        return (
          <span className={cn(
            "text-[10px] font-extrabold tracking-tight",
            value === 'High' || value === 'Critical' ? "text-rose-600 dark:text-rose-400" :
            value === 'Medium' ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"
          )}>
            {String(value)}
          </span>
        );
      case 'assigneeId': {
        const userObj = members.find(m => m.id === value);
        const me = platformUser?.memberId || platformUser?.cuid;
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
              {isMe && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleRelease(record); }}
                  className="text-[9px] font-black uppercase text-rose-500 hover:underline ml-1"
                >
                  Release
                </button>
              )}
            </div>
          );
        }
        return (
          <button
            onClick={(e) => { e.stopPropagation(); handleClaim(record); }}
            className="text-[10px] font-extrabold uppercase text-indigo-650 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
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

  if (platformLoading && !activeQueue) {
    return null;
  }

  if (!activeQueue) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="p-6 bg-zinc-100 dark:bg-zinc-900 rounded-full text-zinc-400">
          <LucideIcons.AlertTriangle size={48} />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Queue Not Found</h2>
          <p className="text-zinc-500 dark:text-zinc-450 mt-1 max-w-sm">The requested workspace queue does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-[calc(100vh-4rem)] bg-transparent overflow-hidden">
      
      {/* Header */}
      <div className="px-6 lg:px-12 py-6 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-900/10 backdrop-blur-md shrink-0 flex items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
            <DynamicIcon name={activeQueue.iconName || 'ClipboardList'} size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-950 dark:text-white">{activeQueue.label || activeQueue.name}</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-450 mt-0.5">{activeQueue.description || 'Workspace Work Queue'}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-64">
          <LucideIcons.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search in queue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl text-xs outline-none focus:border-indigo-500/50 transition-colors shadow-xs"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 lg:p-12 overflow-hidden flex flex-col">
        <div className="flex-1 bg-white/60 dark:bg-zinc-900/30 backdrop-blur-xl border border-zinc-200/60 dark:border-white/5 rounded-3xl overflow-hidden flex flex-col shadow-xl shadow-black/5">
          
          {/* Table Container */}
          <div className="flex-1 overflow-auto custom-scrollbar">
            {recordsQueryLoading && rawRecords.length === 0 ? null : paginatedRecords.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-zinc-50/90 dark:bg-zinc-900/90 backdrop-blur-md z-10 border-b border-zinc-200/40 dark:border-zinc-800/40">
                  <tr>
                    {columnsToRender.map((colId: string) => {
                      const isSorted = sortConfig?.key === colId;
                      return (
                        <th
                          key={colId}
                          onClick={() => handleSort(colId)}
                          className="px-5 py-3 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider cursor-pointer select-none hover:text-zinc-900 dark:hover:text-white transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            <span>{colId === 'id' ? 'ID' : colId === 'moduleId' ? 'Module' : colId.replace(/([A-Z])/g, ' $1')}</span>
                            {isSorted && (
                              sortConfig.direction === 'asc' ? <LucideIcons.ArrowUp size={10} /> : <LucideIcons.ArrowDown size={10} />
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/30 dark:divide-zinc-800/40">
                  {paginatedRecords.map((record, i) => (
                    <motion.tr
                      key={record.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(i, 8) * 0.02, ease: 'easeOut' }}
                      onClick={() => navigate(`/workspace/modules/${record.moduleId}/records/${record.id}`)}
                      className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] cursor-pointer transition-all group"
                    >
                      {columnsToRender.map((colId: string) => (
                        <td key={colId} className="px-5 py-3.5 align-middle">
                          {renderCell(record, colId)}
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-300 dark:text-zinc-700 shadow-inner mb-4">
                  <LucideIcons.Inbox size={20} />
                </div>
                <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No records found</h4>
                <p className="text-xs text-zinc-450 mt-1 max-w-xs">All records have been cleared or do not match the queue filters.</p>
              </div>
            )}
          </div>

          {/* Table Footer / Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-zinc-200/40 dark:border-zinc-800/40 shrink-0 flex items-center justify-between bg-zinc-50/10 dark:bg-zinc-900/5">
              <span className="text-[10px] text-zinc-400 font-bold uppercase">
                Page {page} of {totalPages} ({totalRecords} records)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={(e) => { e.stopPropagation(); setPage(page - 1); }}
                  className="p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 transition-colors"
                >
                  <LucideIcons.ChevronLeft size={14} />
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={(e) => { e.stopPropagation(); setPage(page + 1); }}
                  className="p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 transition-colors"
                >
                  <LucideIcons.ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
