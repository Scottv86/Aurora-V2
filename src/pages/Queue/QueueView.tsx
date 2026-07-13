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
import { Skeleton } from '../../components/UI/Skeleton';

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
    queryKey: ['queue-records', tenant?.id, queueId, activeQueue?.moduleIds],
    queryFn: async () => {
      if (!tenant?.id || !activeQueue?.moduleIds || activeQueue.moduleIds.length === 0) return [];
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      
      const promises = activeQueue.moduleIds.map((mId: string) => 
        fetchRecords(mId, tenant.id, token, 1, 1000)
      );
      const results = await Promise.all(promises);
      
      return results.flatMap((res: any, idx) => {
        const mId = activeQueue.moduleIds![idx];
        const mod = modules.find(m => m.id === mId);
        return (res?.records || []).map((r: any) => ({
          ...r,
          moduleId: mId,
          _moduleName: mod?.name || 'Unknown Module',
          _moduleIcon: mod?.icon || 'Box'
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
          valA = a._moduleName;
          valB = b._moduleName;
        } else if (key === 'assigneeId') {
          const userA = members.find((m: any) => m.cuid === a.assigneeId || m.memberId === a.assigneeId);
          const userB = members.find((m: any) => m.cuid === b.assigneeId || m.memberId === b.assigneeId);
          valA = userA ? userA.name : '';
          valB = userB ? userB.name : '';
        } else if (key === 'title') {
          valA = a.data?.title || a.data?.name || a.id;
          valB = b.data?.title || b.data?.name || b.id;
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
  }, [rawRecords, activeQueue, searchQuery, visibilityContext, sortConfig, members]);

  // Paginated Slicing
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
        body: JSON.stringify({
          moduleId,
          assigneeId
        })
      });
      if (!res.ok) throw new Error('Failed to update assignee');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue-records', tenant?.id, queueId] });
      toast.success('Assignee updated successfully');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update assignee');
    }
  });

  const handleClaim = (record: any) => {
    const me = platformUser?.memberId || platformUser?.cuid;
    if (!me) return;
    updateMutation.mutate({ recordId: record.id, moduleId: record.moduleId, assigneeId: me });
  };

  const handleRelease = (record: any) => {
    updateMutation.mutate({ recordId: record.id, moduleId: record.moduleId, assigneeId: null });
  };

  // Columns definition mapping
  const columnsToRender = useMemo(() => {
    const configCols = activeQueue?.queueConfig?.columns || [];
    if (configCols.length > 0) return configCols;
    
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
          const mod = modules.find(m => m.id === mId);
          if (mod?.layout) {
            const flat = flattenFields(mod.layout);
            const field = flat.find(f => f.id === colId);
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
              <DynamicIcon name={record._moduleIcon} size={11} />
            </div>
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{record._moduleName}</span>
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
              {userObj.avatarUrl ? (
                <img src={userObj.avatarUrl} alt={userObj.name} className="w-5 h-5 rounded-full object-cover border border-zinc-200 dark:border-zinc-800" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-[9px] font-black text-indigo-500">
                  {userObj.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
              )}
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

  if (platformLoading || recordsQueryLoading) {
    return (
      <div className="flex flex-col w-full h-[calc(100vh-4rem)] p-6 lg:p-12 space-y-6 bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
        <div className="flex items-center justify-between shrink-0">
          <div className="space-y-2">
            <Skeleton width={200} height={28} variant="rounded" />
            <Skeleton width={320} height={16} variant="text" />
          </div>
          <Skeleton width={250} height={40} variant="rounded" />
        </div>
        <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4">
          <Skeleton width="100%" height={40} variant="rounded" />
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} width="100%" height={56} variant="rounded" />
          ))}
        </div>
      </div>
    );
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
      
      {/* Header Panel */}
      <div className="px-6 lg:px-12 py-6 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-900/10 backdrop-blur-md shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
            <DynamicIcon name={activeQueue.iconName || 'ClipboardList'} size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-950 dark:text-white">{activeQueue.label}</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-450 mt-0.5">
              Unified Queue containing records across {activeQueue.moduleIds?.length || 0} modules.
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <LucideIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
            <input 
              type="text" 
              placeholder="Search in queue..." 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="bg-white/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-450 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 w-60 transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
        <div className="flex-1 bg-white/60 dark:bg-zinc-900/35 backdrop-blur-xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto custom-scrollbar">
            {paginatedRecords.length > 0 ? (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/20 dark:bg-zinc-900/10 sticky top-0 z-10">
                    {columnsToRender.map((colId: string) => {
                      const isSorted = sortConfig?.key === colId;
                      return (
                        <th 
                          key={colId} 
                          onClick={() => handleSort(colId)}
                          className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 cursor-pointer hover:bg-zinc-100/10 dark:hover:bg-white/[0.02] select-none transition-colors group"
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
                              <LucideIcons.ArrowUpDown size={10} className="text-zinc-400 dark:text-zinc-650 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/30 dark:divide-zinc-800/40">
                  {paginatedRecords.map(record => (
                    <tr
                      key={record.id}
                      onClick={() => navigate(`/workspace/modules/${record.moduleId}/records/${record.id}`)}
                      className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] cursor-pointer transition-all group"
                    >
                      {columnsToRender.map((colId: string) => (
                        <td key={colId} className="px-5 py-3.5 align-middle">
                          {renderCell(record, colId)}
                        </td>
                      ))}
                    </tr>
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
