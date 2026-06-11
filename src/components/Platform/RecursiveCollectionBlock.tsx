import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Search, Eye, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNestedRecords } from '../../hooks/useNestedRecords';
import { useModalStack } from '../../context/ModalStackContext';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { DATA_API_URL } from '../../config';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { Table } from '../UI/Table';
import { Skeleton } from '../UI/Skeleton';

interface RecursiveCollectionBlockProps {
  parentRecordId: string;
  moduleId: string; // The module of the children we want to show
  label: string;
  field?: any;
}

export const RecursiveCollectionBlock: React.FC<RecursiveCollectionBlockProps> = ({ 
  parentRecordId, 
  moduleId,
  label,
  field
}) => {
  const queryClient = useQueryClient();
  const { records, loading, refetch } = useNestedRecords(parentRecordId);
  const { pushModal } = useModalStack();
  const { tenant } = usePlatform();
  const { session } = useAuth();
  
  const [showMirrorSearch, setShowMirrorSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allModuleRecords, setAllModuleRecords] = useState<any[]>([]);
  const [searchingRecords, setSearchingRecords] = useState(false);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<any>(null);

  const { data: moduleData, isLoading: moduleLoading } = useQuery({
    queryKey: ['module', tenant?.id, moduleId],
    queryFn: async () => {
      if (!tenant?.id || !moduleId) return null;
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${DATA_API_URL}/modules/${moduleId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (!res.ok) throw new Error('Failed to fetch module details');
      return res.json();
    },
    enabled: !!tenant?.id && !!moduleId,
    staleTime: 60000
  });

  // Filter records by moduleId if needed
  const filteredRecords = useMemo(() => {
    return records.filter((r: any) => r.moduleId === moduleId);
  }, [records, moduleId]);

  const fetchAvailableRecords = async () => {
    if (!tenant?.id || !moduleId) return;
    setSearchingRecords(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${DATA_API_URL}/records?moduleId=${moduleId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (res.ok) {
        const data = await res.json();
        // Filter out records that are already associated with this parent
        const unassociated = (data.records || []).filter(
          (r: any) => !records.some((ar: any) => ar.id === r.id)
        );
        setAllModuleRecords(unassociated);
      }
    } catch (err) {
      console.error("Failed to fetch available records for mirroring:", err);
    } finally {
      setSearchingRecords(false);
    }
  };

  const handleLinkRecord = async (childRecord: any) => {
    if (!tenant?.id) return;
    
    // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
    await queryClient.cancelQueries({ queryKey: ['nestedRecords', tenant.id, parentRecordId] });

    const currentAssociations = childRecord.associations || [];
    const updatedAssociations = [...currentAssociations, { record_id: parentRecordId }];
    
    const originalRecords = records;
    const originalAllModuleRecords = allModuleRecords;
    
    const updatedChildRecord = {
      ...childRecord,
      associations: updatedAssociations
    };
    
    // Optimistic UI updates
    // 1. Update React Query cache
    queryClient.setQueryData(
      ['nestedRecords', tenant?.id, parentRecordId],
      (old: any[] | undefined) => {
        const list = old || [];
        if (list.some((r: any) => r.id === childRecord.id)) return list;
        return [...list, updatedChildRecord];
      }
    );
    
    // 2. Remove from unassociated list
    setAllModuleRecords(prev => prev.filter(r => r.id !== childRecord.id));
    
    // 3. Instantly close search/input
    setShowMirrorSearch(false);
    setSearchQuery('');
    
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${DATA_API_URL}/records/${childRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({
          ...childRecord,
          associations: updatedAssociations
        })
      });
      
      if (res.ok) {
        toast.success(`Successfully linked ${childRecord.name || childRecord.title || 'record'}`);
        refetch();
      } else {
        throw new Error("Failed to link record");
      }
    } catch (err: any) {
      // Rollback on failure
      queryClient.setQueryData(['nestedRecords', tenant?.id, parentRecordId], originalRecords);
      setAllModuleRecords(originalAllModuleRecords);
      toast.error(err.message || "Error linking record");
    }
  };

  const handleUnlinkRecord = async (childRecord: any) => {
    if (!tenant?.id) return;
    
    // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
    await queryClient.cancelQueries({ queryKey: ['nestedRecords', tenant.id, parentRecordId] });

    const currentAssociations = childRecord.associations || [];
    const updatedAssociations = currentAssociations.filter(
      (assoc: any) => assoc.record_id !== parentRecordId
    );
    
    const originalRecords = records;
    const originalAllModuleRecords = allModuleRecords;
    
    // Optimistic UI updates
    // 1. Remove from query cache
    queryClient.setQueryData(
      ['nestedRecords', tenant?.id, parentRecordId],
      (old: any[] | undefined) => (old || []).filter((r: any) => r.id !== childRecord.id)
    );
    
    // 2. Add back to available unassociated list
    const unlinkedChildRecord = {
      ...childRecord,
      associations: updatedAssociations
    };
    setAllModuleRecords(prev => {
      if (prev.some(r => r.id === childRecord.id)) return prev;
      return [...prev, unlinkedChildRecord];
    });
    
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${DATA_API_URL}/records/${childRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({
          ...childRecord,
          associations: updatedAssociations
        })
      });
      
      if (res.ok) {
        toast.success(`Successfully unlinked ${childRecord.name || childRecord.title || 'record'}`);
        refetch();
      } else {
        throw new Error("Failed to unlink record");
      }
    } catch (err: any) {
      // Rollback on failure
      queryClient.setQueryData(['nestedRecords', tenant?.id, parentRecordId], originalRecords);
      setAllModuleRecords(originalAllModuleRecords);
      toast.error(err.message || "Error unlinking record");
    }
  };

  const handleRemoveClick = (record: any) => {
    setDeletingRecord(record);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (deletingRecord) {
      handleUnlinkRecord(deletingRecord);
    }
    setShowDeleteModal(false);
    setDeletingRecord(null);
  };

  const filteredAvailableRecords = useMemo(() => {
    return allModuleRecords.filter(r => 
      (r.name || r.title || r.id || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allModuleRecords, searchQuery]);

  const searchedRecords = useMemo(() => {
    if (!searchQuery) return filteredRecords;
    const q = searchQuery.toLowerCase();
    return filteredRecords.filter((record: any) => {
      const matchName = (record.name || record.title || record.id || record._record_key || '').toLowerCase().includes(q);
      if (matchName) return true;
      
      if (moduleData?.layout) {
        return moduleData.layout.some((field: any) => {
          const val = record[field.id];
          return val && String(val).toLowerCase().includes(q);
        });
      }
      return false;
    });
  }, [filteredRecords, searchQuery, moduleData]);

  // Dynamic table columns mapping
  const tableColumns = useMemo(() => {
    const buildActionsColumn = () => ({
      header: '',
      className: 'text-right w-[120px]',
      accessor: (record: any) => {
        const activeDensity = field?.density || 'standard';
        const buttonPaddingClass = activeDensity === 'compact' ? 'p-1.5' : 'p-2.5';
        return (
          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                pushModal({ 
                  moduleId: record.moduleId, 
                  recordId: record.id, 
                  type: 'view', 
                  title: record.name || record.title || record.id,
                  detailLayoutType: field?.detailLayoutType,
                  onSave: () => {
                    refetch();
                  }
                });
              }} 
              className={cn(buttonPaddingClass, "text-zinc-400 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-2xl transition-all")}
              title="View"
            >
              <Eye size={16} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                pushModal({ 
                  moduleId: record.moduleId, 
                  recordId: record.id, 
                  type: 'edit', 
                  title: record.name || record.title || record.id,
                  detailLayoutType: field?.detailLayoutType,
                  onSave: () => {
                    refetch();
                  }
                });
              }} 
              className={cn(buttonPaddingClass, "text-zinc-400 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-2xl transition-all")}
              title="Edit"
            >
              <Edit2 size={16} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveClick(record);
              }} 
              className={cn(buttonPaddingClass, "text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all")}
              title="Remove"
            >
              <Trash2 size={16} />
            </button>
          </div>
        );
      }
    });

    if (!moduleData) {
      // Fallback columns during load
      return [
        {
          header: 'Key',
          sortable: true,
          sortKey: '_record_key',
          accessor: (record: any) => (
            <span className="text-xs font-bold text-indigo-500">
              {record._record_key || '-'}
            </span>
          )
        },
        {
          header: 'Name',
          sortable: true,
          sortKey: 'name',
          accessor: (record: any) => record.name || record.title || record.id
        },
        {
          header: 'Status',
          sortable: true,
          sortKey: 'status',
          accessor: (record: any) => (
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/20">
              {record.status || 'Active'}
            </span>
          )
        },
        buildActionsColumn()
      ];
    }

    const activeCustomFields = (moduleData.layout || []).filter(
      (field: any) => field.type !== 'sub_module' && field.type !== 'repeatableGroup' && field.showInTable !== false
    );

    // Limit custom fields in submodules to keep it compact
    const builtColumns = activeCustomFields.slice(0, 3).map((field: any) => ({
      header: field.label || field.name || field.id,
      sortable: true,
      sortKey: field.id,
      accessor: (record: any) => {
        const val = record[field.id];
        if (field.type === 'checkbox') return val ? 'Yes' : 'No';
        if (Array.isArray(val)) {
          if (val.length === 0) return '-';
          return val.join(', ') || '-';
        }
        return val || '-';
      }
    }));

    return [
      {
        header: 'Key',
        sortable: true,
        sortKey: '_record_key',
        accessor: (record: any) => (
          <span className="text-xs font-bold text-indigo-500">
            {record._record_key || '-'}
          </span>
        )
      },
      ...builtColumns,
      {
        header: 'Status',
        sortable: true,
        sortKey: 'status',
        accessor: (record: any) => (
          <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/20">
            {record.status || 'Active'}
          </span>
        )
      },
      {
        header: 'Created',
        sortable: true,
        sortKey: 'createdAt',
        accessor: (record: any) => (
          <span className="text-[10px] text-zinc-500">
            {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'Just now'}
          </span>
        )
      },
      buildActionsColumn()
    ];
  }, [moduleData, field]);

  const navigate = useNavigate();
  const { 
    moduleId: routeModuleId, 
    recordId: routeRecordId, 
    parentModuleId: routeParentModuleId, 
    parentRecordId: routeParentRecordId 
  } = useParams();

  const handleRecordOpen = (childRecord: any) => {
    const detailViewMode = field?.detailViewMode || 'modal';
    const detailLayoutType = field?.detailLayoutType || 'sidebar';

    if (detailViewMode === 'page') {
      const activeParentModId = routeParentModuleId || routeModuleId;
      const activeParentRecId = routeParentRecordId || routeRecordId || parentRecordId;
      if (activeParentModId && activeParentRecId) {
        navigate(`/workspace/modules/${activeParentModId}/records/${activeParentRecId}/sub/${childRecord.moduleId}/${childRecord.id}`);
      } else {
        navigate(`/workspace/modules/${childRecord.moduleId}/records/${childRecord.id}`);
      }
    } else {
      pushModal({ 
        moduleId: childRecord.moduleId, 
        recordId: childRecord.id, 
        type: 'edit', 
        title: childRecord.name || childRecord.title || childRecord.id,
        detailLayoutType,
        onSave: () => {
          refetch();
        }
      });
    }
  };

  const renderCardsView = () => {
    return (
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {searchedRecords.map((rec: any) => {
          const titleField = moduleData?.layout?.[0];
          const recordTitle = rec[titleField?.id] || rec.name || rec.title || rec.id;
          const status = rec.status || 'Active';
          
          const customFields = (moduleData?.layout || []).filter(
            (f: any) => f.type !== 'sub_module' && f.type !== 'repeatableGroup' && f.showInTable !== false
          ).slice(0, 3);

          return (
            <div
              key={rec.id}
              onClick={() => handleRecordOpen(rec)}
              className="group relative bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 rounded-[2rem] p-6 hover:shadow-2xl hover:shadow-indigo-500/[0.03] hover:-translate-y-1 cursor-pointer transition-all duration-300 flex flex-col justify-between min-h-[190px]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{rec._record_key || 'REC'}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold uppercase tracking-wider">
                    {status}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-zinc-900 dark:text-white mt-4 line-clamp-2 leading-snug group-hover:text-indigo-500 transition-colors">
                  {recordTitle}
                </h4>

                <div className="mt-4 space-y-1.5 border-t border-zinc-100 dark:border-zinc-800/60 pt-3">
                  {customFields.map((f: any) => {
                    const val = rec[f.id];
                    if (val === undefined || val === null || val === '') return null;
                    return (
                      <div key={f.id} className="text-[10px] text-zinc-550 dark:text-zinc-400 flex items-center justify-between gap-2">
                        <span className="font-bold text-zinc-400">{f.label || f.name}:</span>
                        <span className="font-medium truncate">{String(val)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between mt-6 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
                <span className="text-[9px] text-zinc-400 font-bold">
                  {rec.createdAt ? new Date(rec.createdAt).toLocaleDateString() : 'Just now'}
                </span>

                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRecordOpen(rec);
                    }}
                    className="p-1.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-550 dark:text-zinc-455 rounded-lg transition-all"
                  >
                    <Eye size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveClick(rec);
                    }}
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 rounded-lg transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderListView = () => {
    return (
      <div className="p-6 space-y-3">
        {searchedRecords.map((rec: any) => {
          const titleField = moduleData?.layout?.[0];
          const recordTitle = rec[titleField?.id] || rec.name || rec.title || rec.id;
          const status = rec.status || 'Active';

          return (
            <div
              key={rec.id}
              onClick={() => handleRecordOpen(rec)}
              className="group relative bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 rounded-2xl p-4 hover:shadow-xl hover:shadow-indigo-500/[0.02] cursor-pointer transition-all duration-200 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest shrink-0">
                  {rec._record_key || 'REC'}
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate group-hover:text-indigo-500 transition-colors">
                    {recordTitle}
                  </h4>
                  <p className="text-[9px] text-zinc-400 mt-0.5">
                    Created {rec.createdAt ? new Date(rec.createdAt).toLocaleDateString() : 'Just now'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[8px] font-bold uppercase tracking-wider">
                  {status}
                </span>

                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRecordOpen(rec);
                    }}
                    className="p-1.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-550 dark:text-zinc-455 rounded-lg transition-all"
                  >
                    <Eye size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveClick(rec);
                    }}
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 rounded-lg transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full">
         {loading || moduleLoading ? (
          <div className="bg-white/5 dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden shadow-inner p-6 space-y-6">
            {/* Toolbar Skeleton */}
            <div className="flex items-center justify-between gap-4">
              <Skeleton variant="rounded" className="h-8 w-48" />
              <div className="flex items-center gap-2">
                <Skeleton variant="rounded" className="h-8 w-28" />
                <Skeleton variant="rounded" className="h-8 w-24" />
              </div>
            </div>
            {/* Table Header Skeleton */}
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-4 gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <Skeleton variant="text" className="h-4 w-12" />
                <Skeleton variant="text" className="h-4 w-20" />
                <Skeleton variant="text" className="h-4 w-16" />
                <Skeleton variant="text" className="h-4 w-14" />
              </div>
              {/* Table Rows Skeleton */}
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="grid grid-cols-4 gap-4 py-1">
                    <Skeleton variant="text" className="h-3 w-16" />
                    <Skeleton variant="text" className="h-3 w-28" />
                    <Skeleton variant="text" className="h-3 w-12" />
                    <Skeleton variant="text" className="h-3 w-20" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/5 dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden shadow-inner">
            {/* Inner Toolbar */}
            <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
              <div className="flex-1 max-w-xs relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                <input 
                  type="text"
                  placeholder={`Search ${label}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setShowMirrorSearch(prev => !prev);
                    if (!showMirrorSearch) {
                      fetchAvailableRecords();
                    }
                  }}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-2 border rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all active:scale-95",
                    showMirrorSearch 
                      ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" 
                      : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  )}
                  title={showMirrorSearch ? "Close link panel" : "Link Existing Record"}
                >
                  <Search size={12} />
                  Link Existing
                </button>
                <button 
                  onClick={() => pushModal({ 
                    moduleId, 
                    type: 'edit', 
                    title: `New ${label}`,
                    parentAssociation: { recordId: parentRecordId, moduleId: '' },
                    detailLayoutType: field?.detailLayoutType,
                    onSave: () => {
                      refetch();
                    }
                  })}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.15em] hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-95"
                >
                  <Plus size={14} />
                  Add Record
                </button>
              </div>
            </div>

            {/* Mirror Search Sub-panel */}
            {showMirrorSearch && (
              <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-200 dark:border-zinc-800 space-y-3 animate-in slide-in-from-top-2 duration-200">
                <div className="relative">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search records to link..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                  {searchingRecords ? (
                    <div className="py-4 text-center text-[10px] text-zinc-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                      Searching...
                    </div>
                  ) : filteredAvailableRecords.length === 0 ? (
                    <div className="py-4 text-center text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                      No unlinked records found
                    </div>
                  ) : (
                    filteredAvailableRecords.map(rec => (
                      <button
                        key={rec.id}
                        onClick={() => handleLinkRecord(rec)}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-white dark:hover:bg-zinc-950 hover:text-indigo-500 transition-all border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 flex items-center justify-between"
                      >
                        <span className="font-semibold truncate">{rec.name || rec.title || rec.id}</span>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest shrink-0 ml-2">Link</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {filteredRecords.length > 0 ? (
              field?.variant === 'cards' ? (
                renderCardsView()
              ) : field?.variant === 'list' ? (
                renderListView()
              ) : (
                <Table 
                  data={searchedRecords}
                  onRowClick={(record: any) => handleRecordOpen(record)}
                  className="bg-transparent dark:bg-transparent border-none shadow-none"
                  noContainer={true}
                  pagination={true}
                  density={field?.density || 'standard'}
                  columns={tableColumns}
                />
              )
            ) : (
              /* Empty Initialize State Card */
              <div className="p-8 flex flex-col items-center justify-center text-center">
                <button 
                  onClick={() => pushModal({ 
                    moduleId, 
                    type: 'edit', 
                    title: `New ${label}`,
                    parentAssociation: { recordId: parentRecordId, moduleId: '' },
                    detailLayoutType: field?.detailLayoutType,
                    onSave: () => {
                      refetch();
                    }
                  })}
                  className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] group hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-center w-full py-16"
                >
                  <div className="w-14 h-14 bg-zinc-50 dark:bg-zinc-900 rounded-[1.25rem] flex items-center justify-center mx-auto mb-4 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-inner">
                    <Plus size={24} className="text-zinc-400 group-hover:text-white" />
                  </div>
                  <p className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] group-hover:text-indigo-500 transition-colors">
                    Initialize {label}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-2 font-medium">Click to expand this collection.</p>
                </button>
              </div>
            )}
          </div>
        )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-[440px] max-w-[95vw] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl p-10 space-y-8"
            >
              <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-500 mx-auto">
                <AlertCircle size={32} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Unlink Record?</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                  Are you sure you want to unlink this record from the parent? This action will not delete the record, but will remove the association.
                </p>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowDeleteModal(false)} 
                  className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl font-bold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete} 
                  className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition-all shadow-xl shadow-rose-500/20"
                >
                  Unlink
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
