import { useState, useEffect, useMemo } from 'react';
import { useParams, Navigate, useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '../../components/UI/PageHeader';
import { 
  motion, 
  AnimatePresence 
} from 'motion/react';
import { 
  Plus, 
  Trash2,
  Search,
  Filter,
  X
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { toast } from 'sonner';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { MODULES } from '../../constants/modules';
import { DATA_API_URL } from '../../config';
import { FieldInput } from '../../components/FieldInput';
import { Skeleton } from '../../components/UI/Skeleton';
import { generateAISummary, evaluateCalculations } from '../../services/aiService';
import { cn, isFieldVisible, flattenFields } from '../../lib/utils';
import { Module, ModuleField } from '../../types/platform';

import { useModalStack } from '../../context/ModalStackContext';

export const ModuleView = () => {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { tenant, isLoading: platformLoading } = usePlatform();
  useModalStack();
  const [moduleData, setModuleData] = useState<Module | null>(null);
  const [records, setRecords] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [newEntryData, setNewEntryData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const Icon = useMemo(() => {
    if (!moduleData) return LucideIcons.Layers;
    const iconSource = (moduleData as any).iconName || (moduleData as any).icon;
    
    if (typeof iconSource === 'string' && iconSource.trim() !== '') {
      return (LucideIcons as any)[iconSource] || LucideIcons.Layers;
    }
    
    if (typeof iconSource === 'function' || (typeof iconSource === 'object' && iconSource !== null && (iconSource as any).$$typeof)) {
      return iconSource;
    }
    
    return LucideIcons.Layers;
  }, [moduleData]);

  const allFields = useMemo(() => {
    return flattenFields(moduleData?.layout || []) as ModuleField[];
  }, [moduleData]);

  const displayFields = useMemo(() => {
    return allFields.filter((f: ModuleField) => 
      !['heading', 'divider', 'spacer', 'alert', 'fieldGroup', 'repeatableGroup'].includes(f.type)
    );
  }, [allFields]);

  const fieldToGroupMap = useMemo(() => {
    const map: Record<string, string> = {};
    (moduleData?.layout || []).forEach((f: any) => {
      if (f.type === 'fieldGroup' && f.fields) {
        f.fields.forEach((nf: any) => {
          map[nf.id] = f.id;
        });
      }
    });
    return map;
  }, [moduleData]);

  useEffect(() => {
    if (platformLoading) return;
    if (!tenant?.id || !moduleId) {
      setLoading(false);
      return;
    }

    // Guard: Don't re-fetch if we already have this module loaded
    if (moduleData?.id === moduleId && records.length > 0) {
      setLoading(false);
      return;
    }

    const fetchModAndRecords = async () => {
      setLoading(true);
      try {
        const prebuilt = MODULES.find(m => m.id === moduleId);
        if (prebuilt) {
          setModuleData(prebuilt as any);
        } else {
          const token = (import.meta as any).env.VITE_DEV_TOKEN || (session as any)?.access_token;
          const res = await fetch(`${DATA_API_URL}/modules/${moduleId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'x-tenant-id': tenant.id
            }
          });
          
          if (res.ok) {
            const customMod = await res.json();
            setModuleData(customMod);
          }
        }
        
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const recordsRes = await fetch(`${DATA_API_URL}/records?moduleId=${moduleId}&page=${page}&limit=${pageSize}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant.id
          }
        });

        if (recordsRes.ok) {
          const result = await recordsRes.json();
          setRecords(result.records);
          setTotalRecords(result.total);
          setTotalPages(result.totalPages);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load module data");
      } finally {
        setLoading(false);
      }
    };

    fetchModAndRecords();
  }, [tenant?.id, moduleId, platformLoading, session?.access_token, page, pageSize]);

  const handleCreateEntry = async () => {
    if (!tenant?.id || !moduleId || !moduleData) return;
    
    setIsSubmitting(true);
    try {
      let finalData = evaluateCalculations(newEntryData, allFields);
      
      const hasAISummary = allFields.some(f => f.type === 'ai_summary');
      if (hasAISummary) {
        toast.info("Generating AI Summary...");
        const aiSummaryField = allFields.find(f => f.type === 'ai_summary');
        if (aiSummaryField) {
          finalData[aiSummaryField.id] = await generateAISummary(finalData, allFields);
        }
      }

      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      
      const res = await fetch(`${DATA_API_URL}/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({
          moduleId: moduleId,
          ...finalData
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save record');
      }

      const savedRecord = await res.json();
      
      setRecords(prev => [savedRecord, ...prev]);
      toast.success("Record created successfully");
      
      setShowNewEntryModal(false);
      setNewEntryData({});
    } catch (error: any) {
      console.error("Save Error:", error);
      toast.error(error.message || (editingRecord ? "Failed to update record" : "Failed to create record"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (fieldId: string, val: any, metadata?: any) => {
    setNewEntryData(prev => {
      let updatedData = { ...prev };
      
      const groupId = fieldToGroupMap[fieldId];
      if (groupId) {
        updatedData[groupId] = { ...(prev[groupId] || {}), [fieldId]: val };
      } else {
        updatedData[fieldId] = val;
      }
      
      // Execute Lookup Output Mappings
      const field = allFields.find(f => f.id === fieldId);
      if (field?.type === 'lookup' && field.lookupOutputMappings?.length) {
        // First, null out all target fields to clear any previously mapped values
        field.lookupOutputMappings.forEach(mapping => {
          if (mapping.targetFieldId) {
            const targetFieldId = mapping.targetFieldId;
            const targetGroupId = fieldToGroupMap[targetFieldId];
            
            if (targetGroupId) {
              updatedData[targetGroupId] = { 
                ...(updatedData[targetGroupId] || {}), 
                [targetFieldId]: null 
              };
            } else {
              updatedData[targetFieldId] = null;
            }
          }
        });

        // Then, map the new values from metadata if available
        if (metadata) {
          field.lookupOutputMappings.forEach(mapping => {
            if (mapping.sourceFieldId && mapping.targetFieldId) {
              const sourceValue = metadata[mapping.sourceFieldId];
              if (sourceValue !== undefined) {
                const targetFieldId = mapping.targetFieldId;
                const targetGroupId = fieldToGroupMap[targetFieldId];
                
                if (targetGroupId) {
                  updatedData[targetGroupId] = { 
                    ...(updatedData[targetGroupId] || {}), 
                    [targetFieldId]: sourceValue 
                  };
                } else {
                  updatedData[targetFieldId] = sourceValue;
                }
              }
            }
          });
        }
      }
      
      return updatedData;
    });
  };

  const handleDeleteEntry = async (recordId: string) => {
    if (!tenant?.id || !moduleId) return;

    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || (session as any)?.access_token;
      const res = await fetch(`${DATA_API_URL}/records/${recordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete record');
      }

      toast.success("Record deleted successfully");
      setRecords(prev => prev.filter(r => r.id !== recordId));
      setRecordToDelete(null);
    } catch (error: any) {
      console.error("Delete Error:", error);
      toast.error(error.message || "Failed to delete record");
    }
  };

  if (loading || platformLoading) return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton width={180} height={32} variant="rounded" />
          <Skeleton width={350} height={20} variant="text" />
        </div>
        <div className="flex gap-4">
          <Skeleton width={100} height={40} variant="rounded" />
          <Skeleton width={120} height={40} variant="rounded" />
        </div>
      </div>

      <div className="space-y-4 pt-6">
        <div className="flex items-center gap-4">
          <Skeleton width={200} height={40} variant="rounded" />
          <Skeleton width={40} height={40} variant="rounded" />
        </div>
        <Skeleton height={400} variant="rounded" className="rounded-[2.5rem]" />
      </div>
    </div>
  );

  if (!moduleData) return <Navigate to="/workspace" replace />;

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8">
      <PageHeader 
        title={moduleData.name}
        description={moduleData.description}
        icon={Icon}
        iconClassName="bg-indigo-600 shadow-indigo-500/20"
        actions={
          <div className="flex gap-4">
            <Link 
              to={`/workspace/settings/builder/${moduleId}`}
              className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2"
            >
              <LucideIcons.Settings size={16} />
              Configure
            </Link>
            <button 
              onClick={() => {
                const initialDefaults = {};
                allFields.forEach((f: any) => {
                  if (f.defaultValue !== undefined && f.defaultValue !== '') {
                    (initialDefaults as any)[f.id] = f.defaultValue;
                  }
                });
                setNewEntryData(initialDefaults);
                setEditingRecord(null);
                if (moduleData.tabs && moduleData.tabs.length > 0) {
                  setActiveTabId(moduleData.tabs[0].id);
                } else {
                  setActiveTabId(null);
                }
                setShowNewEntryModal(true);
              }}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-2"
            >
              <Plus size={18} />
              New Entry
            </button>
          </div>
        }
      />



      {records.length > 0 ? (
        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[32px] shadow-sm">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Search records..." 
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <button className="p-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors rounded-xl">
                <Filter size={18} />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/30">
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Key</th>
                  {displayFields.slice(0, 4).map((field: any, i: number) => (
                    <th key={i} className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{field.label || field.name}</th>
                  ))}
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Created</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                {records.map((record) => (
                  <tr 
                    key={record.id} 
                    onClick={() => navigate(`/workspace/modules/${moduleId}/records/${record.id}`)}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4 text-sm font-bold text-indigo-500">
                      {record._record_key || '-'}
                    </td>
                    {displayFields.slice(0, 4).map((field: any, j: number) => (
                      <td key={j} className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-300">
                        {(() => {
                          const val = record[field.id] || record[field.name];
                          if (field.type === 'checkbox') return val ? 'Yes' : 'No';
                          if (Array.isArray(val)) {
                            if (val.length === 0) return '-';
                            return (
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {val.map((v: string, k: number) => (
                                  <span key={k} className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-[9px] font-bold rounded border border-zinc-200 dark:border-zinc-700 uppercase">
                                    {v}
                                  </span>
                                ))}
                              </div>
                            );
                          }
                          return val || '-';
                        })()}
                      </td>
                    ))}
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/20">
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'Just now'}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setRecordToDelete(record.id)}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination UI */}
          <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-950/30 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Showing <span className="text-zinc-900 dark:text-white">{totalRecords > 0 ? (page - 1) * pageSize + 1 : 0}</span> to <span className="text-zinc-900 dark:text-white">{Math.min(page * pageSize, totalRecords)}</span> of <span className="text-zinc-900 dark:text-white">{totalRecords}</span> records
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest hover:text-zinc-900 dark:hover:text-white disabled:opacity-50 transition-all"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {totalPages > 0 && [...Array(totalPages)].map((_, i) => {
                  const pNum = i + 1;
                  // Only show first 3, last 3, and current +- 1 if many pages
                  if (totalPages > 7 && pNum > 2 && pNum < totalPages - 1 && Math.abs(pNum - page) > 1) {
                    if (pNum === 3 || pNum === totalPages - 2) return <span key={pNum} className="text-zinc-400 px-1">...</span>;
                    return null;
                  }
                  return (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={cn(
                        "w-8 h-8 rounded-lg text-[10px] font-bold transition-all",
                        page === pNum 
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                          : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      )}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
                className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest hover:text-zinc-900 dark:hover:text-white disabled:opacity-50 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl text-center space-y-4">
          <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto border border-zinc-200 dark:border-zinc-800">
            <Icon size={24} className="text-zinc-400 dark:text-zinc-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No data found in {moduleData.name}</h3>
            <p className="text-zinc-500 mt-1">Start by creating your first entry or importing data.</p>
          </div>
          <button 
            onClick={() => {
              const initialDefaults = {};
              allFields.forEach((f: any) => {
                if (f.defaultValue !== undefined && f.defaultValue !== '') {
                  (initialDefaults as any)[f.id] = f.defaultValue;
                }
              });
              setNewEntryData(initialDefaults);
              setEditingRecord(null);
              if (moduleData?.tabs && moduleData.tabs.length > 0) {
                setActiveTabId(moduleData.tabs[0].id);
              } else {
                setActiveTabId(null);
              }
              setShowNewEntryModal(true);
            }}
            className="px-6 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Create First Entry
          </button>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showNewEntryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowNewEntryModal(false);
                setEditingRecord(null);
                setNewEntryData({});
              }}
              className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                    <Plus size={20} />
                  </div>
                  New {moduleData?.name || 'Record'} Entry
                </h2>
                <button 
                  onClick={() => {
                    setShowNewEntryModal(false);
                    setEditingRecord(null);
                    setNewEntryData({});
                  }}
                  className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar w-full">
                {moduleData?.tabs && moduleData.tabs.length > 0 && (
                  <div className="flex gap-2 mb-8 p-1.5 bg-zinc-100 dark:bg-zinc-950/50 rounded-2xl overflow-x-auto no-scrollbar">
                    {(moduleData.tabs || []).map((tab: any) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTabId(tab.id)}
                        className={cn(
                          "px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                          activeTabId === tab.id
                            ? "bg-white dark:bg-zinc-900 text-indigo-500 shadow-xl shadow-indigo-500/5"
                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}
                {moduleData?.layout ? (
                  <div className="grid grid-cols-12 gap-x-8 gap-y-8 w-full">
                    {(moduleData.layout || [])
                      .filter((field: ModuleField) => {
                        if (!moduleData.tabs || moduleData.tabs.length === 0) return true;
                        const firstTabId = moduleData.tabs[0]?.id;
                        const fieldTabId = field.tabId || firstTabId;
                        return fieldTabId === activeTabId;
                      })
                      .sort((a, b) => ((a.rowIndex || 0) - (b.rowIndex || 0)) || ((a.startCol || 0) - (b.startCol || 0)))
                      .map((field: ModuleField) => {
                        if (!isFieldVisible(field, newEntryData)) return null;
                        
                        return (
                            <div 
                              key={field.id} 
                              className={cn(
                                "space-y-2",
                                field.colSpan === 1 ? "col-span-1" :
                                field.colSpan === 2 ? "col-span-2" :
                                field.colSpan === 3 ? "col-span-3" :
                                field.colSpan === 4 ? "col-span-4" :
                                field.colSpan === 5 ? "col-span-5" :
                                field.colSpan === 6 ? "col-span-6" :
                                field.colSpan === 7 ? "col-span-7" :
                                field.colSpan === 8 ? "col-span-8" :
                                field.colSpan === 9 ? "col-span-9" :
                                field.colSpan === 10 ? "col-span-10" :
                                field.colSpan === 11 ? "col-span-11" : "col-span-12"
                              )}
                              style={{
                                gridColumnStart: field.startCol ? field.startCol + 1 : 'auto',
                                gridRowStart: (field.rowIndex !== undefined) ? field.rowIndex + 1 : 'auto'
                              }}
                            >
                            {field.type === 'heading' ? (
                              <h4 className={cn(
                                "font-bold text-zinc-900 dark:text-white mt-2",
                                field.options?.[0] === 'h1' ? "text-2xl" :
                                field.options?.[0] === 'h3' ? "text-lg" :
                                field.options?.[0] === 'h4' ? "text-base" : "text-xl"
                              )}>{field.label}</h4>
                            ) : field.type === 'divider' ? (
                              <div className="w-full h-px bg-zinc-200 dark:bg-zinc-800 my-2" />
                            ) : field.type === 'spacer' ? (
                              <div className="w-full h-8" />
                            ) : field.type === 'alert' ? (
                              <div className={cn(
                                "p-4 rounded-xl border text-sm",
                                field.options?.[0] === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
                                field.options?.[0] === 'warning' ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" :
                                field.options?.[0] === 'error' ? "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400" :
                                "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                              )}>
                                {field.label}
                              </div>
                            ) : field.type === 'fieldGroup' ? (
                              <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 space-y-6">
                                <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{field.label}</h5>
                                <div className="space-y-4">
                                  {(field.fields || []).map((nestedField: any) => {
                                    if (!isFieldVisible(nestedField, newEntryData[field.id] || {})) return null;
                                    return (
                                    <div key={nestedField.id} className="space-y-2">
                                      <label className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 relative group/label">
                                        {nestedField.label}
                                        {nestedField.tooltip && (
                                          <div className="relative cursor-help">
                                            <LucideIcons.HelpCircle size={10} className="text-zinc-400 hover:text-indigo-500 transition-colors" />
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 text-white text-[10px] rounded-lg opacity-0 group-hover/label:opacity-100 pointer-events-none transition-all duration-200 whitespace-pre-wrap w-48 shadow-xl border border-white/10 z-50">
                                              {nestedField.tooltip}
                                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-900" />
                                            </div>
                                          </div>
                                        )}
                                      </label>
                                      <FieldInput 
                                        field={nestedField}
                                        value={newEntryData[field.id]?.[nestedField.id] ?? nestedField.defaultValue}
                                        onChange={(val, metadata) => handleFieldChange(nestedField.id, val, metadata)}
                                        usersData={[]}
                                        lookupData={{}}
                                      />
                                    </div>
                                  )})}
                                </div>
                              </div>
                            ) : (
                              <>
                                <label className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mb-2 relative group/label">
                                  {field.label}
                                  {field.required && <span className="text-rose-500">*</span>}
                                  {field.tooltip && (
                                    <div className="relative cursor-help">
                                      <LucideIcons.HelpCircle size={10} className="text-zinc-400 hover:text-indigo-500 transition-colors" />
                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 text-white text-[10px] rounded-lg opacity-0 group-hover/label:opacity-100 pointer-events-none transition-all duration-200 whitespace-pre-wrap w-48 shadow-xl border border-white/10 z-50">
                                        {field.tooltip}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-900" />
                                      </div>
                                    </div>
                                  )}
                                </label>
                                <FieldInput 
                                  field={field}
                                  value={newEntryData[field.id] ?? field.defaultValue}
                                  onChange={(val, metadata) => handleFieldChange(field.id, val, metadata)}
                                  usersData={[]}
                                  lookupData={{}}
                                />
                                {field.helperText && (
                                  <p className="text-[10px] text-zinc-500 mt-1.5 font-medium">{field.helperText}</p>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-zinc-500 text-sm italic">
                    No fields configured for this layout.
                  </div>
                )}
              </div>
              <div className="p-8 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex gap-4">
                <button 
                  onClick={() => {
                    setShowNewEntryModal(false);
                    setEditingRecord(null);
                    setNewEntryData({});
                  }}
                  className="flex-1 py-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateEntry}
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting && <LucideIcons.Loader2 size={18} className="animate-spin" />}
                  {isSubmitting ? 'Saving...' : 'Create Entry'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {recordToDelete && (
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRecordToDelete(null)}
              className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm"
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
                  Are you sure you want to delete this record? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setRecordToDelete(null)}
                  className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl font-bold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDeleteEntry(recordToDelete)}
                  className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition-all shadow-xl shadow-rose-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
