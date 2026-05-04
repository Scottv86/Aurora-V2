import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import { 
  motion, 
  AnimatePresence 
} from 'motion/react';
import { 
  Trash2, 
  Edit2, 
  Loader2,
  ArrowLeft, 
  ChevronRight,
  Sparkles, 
  History, 
  AlertCircle, 
  GitFork,
  ArrowRight,
  X,
  Zap,
  RefreshCw,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { toast } from 'sonner';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { MODULES } from '../../constants/modules';
import { DATA_API_URL } from '../../config';
import { FieldInput } from '../../components/FieldInput';
import { generateAISummary, evaluateCalculations } from '../../services/aiService';
import { cn, isFieldVisible, flattenFields, calculateHeight } from '../../lib/utils';
import { Module, ModuleField } from '../../types/platform';
import { WorkflowPreview } from '../../components/Builder/Workflow/WorkflowPreview';
import { RepeatableGroupBlock } from '../../components/Platform/RepeatableGroupBlock';

interface WorkflowState {
  currentNodeId: string;
  history: {
    nodeId: string;
    timestamp: string;
    action?: string;
    triggeredBy?: string;
  }[];
}

export const RecordDetailView = () => {
  const { moduleId, recordId } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { tenant, isLoading: platformLoading, setBreadcrumbOverride } = usePlatform();
  const [moduleData, setModuleData] = useState<Module | null>(null);
  const [record, setRecord] = useState<Record<string, any> | null>(null);
  const [syncingConnectors, setSyncingConnectors] = useState<Record<string, boolean>>({});

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

  const [loading, setLoading] = useState(true);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [savingFieldId, setSavingFieldId] = useState<string | null>(null);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [usersData] = useState<any[]>([]);
  const [lookupData] = useState<Record<string, any[]>>({});

  // Global click-away handler
  useEffect(() => {
    if (!activeFieldId) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // If we're clicking something that should NOT trigger a save (like a modal or toast), skip
      if (target.closest('.sonner-toast') || target.closest('[role="dialog"]')) return;
      
      const fieldContainer = document.querySelector(`[data-active-field="${activeFieldId}"]`);
      if (fieldContainer && !fieldContainer.contains(target)) {
        handleUpdateEntry();
      }
    };

    // Use mousedown instead of click to fire before any other click handlers
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeFieldId, editData]);

  useEffect(() => {
    if (moduleData?.tabs && moduleData.tabs.length > 0 && !activeTabId) {
      setActiveTabId(moduleData.tabs[0].id);
    }
  }, [moduleData, activeTabId]);

  const allFields = useMemo(() => {
    return flattenFields(moduleData?.layout || []) as ModuleField[];
  }, [moduleData]);

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

  const recordTitle = useMemo(() => {
    if (!moduleData || (!record && Object.keys(editData).length === 0)) return 'Record Details';
    
    const titleFieldId = moduleData.config?.titleFieldId || (moduleData as any).titleFieldId;
    
    if (titleFieldId) {
      const val = editData[titleFieldId] ?? record?.[titleFieldId];
      if (val) return val;
    }

    return (
      editData._record_key || record?._record_key || 
      editData.name || record?.name || 
      editData.title || record?.title || 
      record?.id || 'Record Details'
    );
  }, [moduleData, editData, record]);

  const activeWorkflow = useMemo(() => {
    if (!moduleData) return null;
    return moduleData.workflow || (moduleData.workflows && moduleData.workflows[0]) || null;
  }, [moduleData]);

  useEffect(() => {
    if (platformLoading) return;
    if (!tenant?.id || !moduleId || !recordId) {
      setLoading(false);
      return;
    }

    // Guard: Don't re-fetch if we already have this specific record and module loaded
    if (record?.id === recordId && moduleData?.id === moduleId) {
      setLoading(false);
      return;
    }

    const fetchModAndRecord = async () => {
      setLoading(true);
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        
        const prebuilt = MODULES.find(m => m.id === moduleId);
        let currentModule = moduleData;
        if (prebuilt) {
          currentModule = prebuilt as any;
          setModuleData(currentModule);
        } else {
          const modRes = await fetch(`${DATA_API_URL}/modules/${moduleId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'x-tenant-id': tenant.id
            }
          });
          if (modRes.ok) {
            currentModule = await modRes.json();
            setModuleData(currentModule);
          }
        }
        
        const recRes = await fetch(`${DATA_API_URL}/records/${recordId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant.id
          }
        });
        
        if (recRes.ok) {
          const recData = await recRes.json();
          setRecord(recData);
          
          // CRITICAL: Compute flat fields from the actual module we just fetched
          // to avoid using stale allFields memo during this effect execution.
          const currentFlatFields = flattenFields(currentModule?.layout || []) as ModuleField[];
          
          const withCalculations = evaluateCalculations(recData, currentFlatFields);
          setEditData(withCalculations);
          
          if (recordId && recData._record_key) {
            setBreadcrumbOverride(recordId, recData._record_key);
          }

          // Trigger AI summary update once on load if field exists
          const aiField = currentFlatFields.find(f => f.type === 'ai_summary');
          
          if (aiField) {
            (async () => {
              try {
                const summary = await generateAISummary(withCalculations, currentFlatFields);
                const aiRes = await fetch(`${DATA_API_URL}/records/${recordId}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-tenant-id': tenant.id!
                  },
                  body: JSON.stringify({ moduleId, ...recData, [aiField.id]: summary })
                });
                if (aiRes.ok) {
                  const updated = await aiRes.json();
                  setRecord(updated);
                  setEditData(updated);
                }
              } catch (e) {
                console.error("Load-time AI Summary failed:", e);
              }
            })();
          }
        } else if (recRes.status === 404) {
          toast.error("Record not found");
        } else {
          throw new Error(`Failed to fetch record: ${recRes.statusText}`);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchModAndRecord();
  }, [tenant?.id, moduleId, recordId, platformLoading, session?.access_token]);

  const handleFieldChange = (fieldId: string, val: any, metadata?: any) => {
    let updatedData = { ...editData };
    
    const groupId = fieldToGroupMap[fieldId];
    if (groupId) {
      updatedData[groupId] = { ...(editData[groupId] || {}), [fieldId]: val };
    } else {
      updatedData[fieldId] = val;
    }
    
    // Execute Lookup Output Mappings
    const field = allFields.find(f => f.id === fieldId);
    if (field?.type === 'lookup' && field.lookupOutputMappings?.length && metadata) {
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
    
    const withCalculations = evaluateCalculations(updatedData, allFields);
    setEditData(withCalculations);
    
    // For certain field types, we trigger an immediate save because they are discrete actions
    if (['lookup', 'radio', 'toggle', 'rating', 'select', 'duallist', 'checkboxGroup', 'buttonGroup', 'progress', 'tag'].includes(field?.type)) {
      handleUpdateEntry(updatedData, fieldId);
    }
    
    return updatedData;
  };

  const handleUpdateEntry = async (dataToSave?: any, specificFieldId?: string) => {
    if (!tenant?.id || !moduleId || !recordId || !moduleData) return;
    
    // Guard to prevent concurrent saves which can cause race conditions and state reverts
    if (savingFieldId && !dataToSave) return;
    
    const fieldIdBeingSaved = specificFieldId || activeFieldId;
    setSavingFieldId(fieldIdBeingSaved || 'global');
    try {
      let finalData = evaluateCalculations(dataToSave || editData, allFields);
      
      const token = (import.meta as any).env.VITE_DEV_TOKEN || (session as any)?.access_token;
      
      // Perform main save first
      const res = await fetch(`${DATA_API_URL}/records/${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({
          moduleId,
          ...finalData
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update record');
      }

      const updatedRecord = await res.json();
      setRecord(updatedRecord);
      setEditData(updatedRecord);

      if (recordId && updatedRecord._record_key) {
        setBreadcrumbOverride(recordId, updatedRecord._record_key);
      }
      setActiveFieldId(null);
      toast.success("Record updated successfully");
    } catch (error: any) {
      console.error("Update Error:", error);
      toast.error(error.message || "Failed to update record");
    } finally {
      setSavingFieldId(null);
      setActiveFieldId(null);
    }
  };

  const handleStatusTransition = async (newStatus: string, transitionTo?: string) => {
    if (!tenant?.id || !moduleId || !recordId || !record || isTransitioning) return;
    
    setIsTransitioning(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || (session as any)?.access_token;
      const res = await fetch(`${DATA_API_URL}/records/${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({
          moduleId,
          status: newStatus,
          transitionTo
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update status');
      }

      const updatedRecord = await res.json();
      setRecord(updatedRecord);
      toast.success(`Status updated to ${newStatus}`);
    } catch (error: any) {
      console.error("Status Update Error:", error);
      toast.error(error.message || "Failed to update status");
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleStartWorkflow = async () => {
    if (!tenant?.id || !moduleId || !recordId || !activeWorkflow || isTransitioning) return;
    
    const startNode = activeWorkflow.nodes.find((n: any) => n.type === 'START') || activeWorkflow.nodes[0];
    if (!startNode) {
      toast.error("No start node found in workflow.");
      return;
    }

    setIsTransitioning(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || (session as any)?.access_token;
      const res = await fetch(`${DATA_API_URL}/records/${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({
          moduleId,
          transitionTo: startNode.id
        })
      });

      if (!res.ok) throw new Error("Failed to start workflow");
      
      const updatedRecord = await res.json();
      setRecord(updatedRecord);
      toast.success("Workflow started!");
    } catch (err: any) {
      toast.error(err.message || "Failed to start workflow");
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleSyncConnector = async (field: any) => {
    if (!tenant?.id || !moduleId || !recordId || !field.connectorId) return;
    
    setSyncingConnectors(prev => ({ ...prev, [field.id]: true }));
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || (session as any)?.access_token;
      
      const res = await fetch(`${DATA_API_URL}/nexus/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({
          connectorId: field.connectorId,
          moduleId: moduleId,
          recordId: recordId,
        })
      });

      if (!res.ok) throw new Error("Sync failed");
      
      const data = await res.json();
      setRecord(data);
        
      // Update breadcrumb override
      if (recordId && data._record_key) {
        setBreadcrumbOverride(recordId, data._record_key);
      }
      setEditData(prev => ({ ...prev, ...data }));
      toast.success("Data synced successfully via " + (field.label || 'Connector'));
    } catch (err) {
      console.error("Sync Error:", err);
      toast.error("Failed to sync data from external source");
    } finally {
      setSyncingConnectors(prev => ({ ...prev, [field.id]: false }));
    }
  };

  const handleDeleteEntry = async () => {
    if (!tenant?.id || !moduleId || !recordId) return;

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
      navigate(`/workspace/modules/${moduleId}`);
    } catch (error: any) {
      console.error("Delete Error:", error);
      toast.error(error.message || "Failed to delete record");
    }
  };

  if (loading || platformLoading) return (
    <div className="h-64 flex items-center justify-center">
      <Loader2 className="animate-spin text-indigo-500" size={32} />
    </div>
  );

  if (!moduleData || !record) return <Navigate to="/workspace" replace />;

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 pt-6 pb-20 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            to={`/workspace/modules/${moduleId}`}
            className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20">
            <Icon size={24} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                {recordTitle}
              </h1>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-2">
              <span className="font-medium">{moduleData.name}</span>
              <span className="w-1 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
              <span>Created {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'Just now'}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowDeleteModal(true)}
            className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-rose-500 rounded-xl transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-widest"
          >
            <Trash2 size={16} />
            <span>Delete Record</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[32px] shadow-sm">
            {moduleData?.tabs && moduleData.tabs.length > 0 && (
              <div className="flex gap-2 p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 overflow-x-auto no-scrollbar">
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

            <div className="p-8">
              {moduleData?.layout ? (
                <div 
                  className="grid grid-cols-12 w-full"
                  style={{ gap: '16px' }}
                >
                  {(moduleData.layout || [])
                    .filter((field: ModuleField) => {
                      if (!moduleData.tabs || moduleData.tabs.length === 0) return true;
                      const firstTabId = moduleData.tabs[0]?.id;
                      const fieldTabId = field.tabId || firstTabId;
                      return fieldTabId === activeTabId;
                    })
                    .sort((a, b) => ((a.rowIndex || 0) - (b.rowIndex || 0)) || ((a.startCol || 0) - (b.startCol || 0)))
                    .map((field: ModuleField) => {
                      if (!isFieldVisible(field, record)) return null;
                      
                      return (
                        <div 
                          key={field.id} 
                          data-field-id={field.id}
                          data-active-field={activeFieldId === field.id ? field.id : undefined}
                          className={cn(
                            "group/field transition-all relative min-w-0",
                            !activeFieldId && !['heading', 'divider', 'spacer', 'alert', 'connector', 'fieldGroup', 'calculation', 'ai_summary', 'autonumber', 'automation', 'datatable', 'duallist'].includes(field.type) && "cursor-pointer"
                          )}
                          style={{
                            gridColumn: `${field.startCol || 1} / span ${field.colSpan || 12}`,
                            gridRow: `${(field.rowIndex || 0) + 1} / span ${calculateHeight(field)}`
                          }}
                          onClick={() => {
                            if (!activeFieldId && !['heading', 'divider', 'spacer', 'alert', 'connector', 'fieldGroup', 'calculation', 'ai_summary', 'autonumber', 'automation', 'datatable', 'duallist'].includes(field.type)) {
                              setEditData(record);
                              setActiveFieldId(field.id);
                            }
                          }}
                        >
                          <div className={cn(
                            "w-full transition-all duration-200 rounded-2xl p-4 -m-4 border-2 relative",
                            activeFieldId === field.id 
                              ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-500/5 ring-4 ring-indigo-500/10 z-10"
                              : !activeFieldId && !['heading', 'divider', 'spacer', 'alert', 'connector', 'fieldGroup', 'calculation', 'ai_summary', 'autonumber', 'automation', 'datatable', 'duallist'].includes(field.type) 
                                ? "hover:bg-indigo-500/5 hover:border-indigo-500/10 border-transparent"
                                : "border-transparent"
                          )}>
                            {activeFieldId === field.id && (
                              <div className="absolute -top-3 left-6 px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg z-20 animate-in zoom-in-50 duration-300">
                                Editing
                              </div>
                            )}
                          {field.type === 'heading' ? (
                            <h4 className={cn(
                              "font-bold text-zinc-900 dark:text-white mt-4",
                              field.options?.[0] === 'h1' ? "text-2xl" :
                              field.options?.[0] === 'h3' ? "text-lg" :
                              field.options?.[0] === 'h4' ? "text-base" : "text-xl"
                            )}>{field.label}</h4>
                          ) : field.type === 'divider' ? (
                            <div className="w-full h-px bg-zinc-200 dark:bg-zinc-800 my-4" />
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
                            <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-6">
                              <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{field.label}</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {(field.fields || []).map((nestedField: any) => {
                                  if (!isFieldVisible(nestedField, record[field.id] || {})) return null;
                                  return (
                                  <div 
                                    key={nestedField.id} 
                                    className={cn(
                                      "space-y-1 rounded-xl transition-all relative border-2",
                                      activeFieldId === nestedField.id
                                        ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-500/5 ring-4 ring-indigo-500/10 z-10 p-2 -m-2"
                                        : !activeFieldId && !['calculation', 'ai_summary', 'autonumber', 'automation'].includes(nestedField.type) 
                                          ? "cursor-pointer hover:bg-indigo-500/5 p-2 -m-2 border-transparent"
                                          : "border-transparent"
                                    )}
                                    data-field-id={nestedField.id}
                                    data-active-field={activeFieldId === nestedField.id ? nestedField.id : undefined}
                                    onClick={(e) => {
                                      if (!activeFieldId && !['calculation', 'ai_summary', 'autonumber', 'automation'].includes(nestedField.type)) {
                                        e.stopPropagation();
                                        setEditData(record);
                                        setActiveFieldId(nestedField.id);
                                      }
                                    }}
                                  >
                                    {activeFieldId === nestedField.id && (
                                      <div className="absolute -top-3 left-6 px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg z-20 animate-in zoom-in-50 duration-300">
                                        Editing
                                      </div>
                                    )}
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                      {nestedField.label}
                                      {savingFieldId === nestedField.id && <Loader2 size={10} className="animate-spin text-indigo-500" />}
                                    </label>
                                    <FieldInput 
                                      field={nestedField}
                                      value={editData[field.id]?.[nestedField.id] ?? record[field.id]?.[nestedField.id]}
                                      onChange={(val, metadata) => handleFieldChange(nestedField.id, val, metadata)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleUpdateEntry();
                                        if (e.key === 'Escape') setActiveFieldId(null);
                                      }}
                                      readonly={savingFieldId === nestedField.id || activeFieldId !== nestedField.id}
                                      usersData={usersData}
                                    />
                                  </div>
                                )})}
                              </div>
                            </div>
                          ) : field.type === 'repeatableGroup' ? (
                            <RepeatableGroupBlock 
                               field={field}
                               value={record?.[field.id] || []}
                               onChange={(newVal) => handleUpdateEntry({ ...record, [field.id]: newVal })}
                            />
                          ) : field.type === 'connector' ? (
                            <div className="p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-3xl space-y-4 shadow-inner relative overflow-hidden group/connector">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16 group-hover/connector:scale-150 transition-transform duration-1000" />
                              <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-2xl flex items-center justify-center text-indigo-500 shadow-xl shadow-indigo-500/10 border border-indigo-500/20">
                                    <Zap size={24} />
                                  </div>
                                  <div>
                                    <h5 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight">{field.label}</h5>
                                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Nexus Connector Active</p>
                                  </div>
                                </div>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSyncConnector(field);
                                  }}
                                  disabled={syncingConnectors[field.id]}
                                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                                >
                                  {syncingConnectors[field.id] ? (
                                    <RefreshCw size={14} className="animate-spin" />
                                  ) : (
                                    <RefreshCw size={14} />
                                  )}
                                  {syncingConnectors[field.id] ? 'Syncing...' : 'Sync Data'}
                                </button>
                              </div>
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/50 dark:bg-black/20 rounded-lg border border-zinc-100 dark:border-white/5 w-fit">
                                <CheckCircle2 size={12} className="text-emerald-500" />
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Reshaping Engine Engaged</span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                {field.label}
                                {savingFieldId === field.id ? (
                                  <Loader2 size={10} className="animate-spin text-indigo-500" />
                                ) : (
                                  !activeFieldId && (
                                    ['calculation', 'ai_summary', 'autonumber', 'automation'].includes(field.type) ? (
                                      <Lock size={8} className="opacity-0 group-hover/field:opacity-100 transition-opacity text-zinc-400" />
                                    ) : (
                                      !['datatable', 'duallist'].includes(field.type) && (
                                        <Edit2 size={8} className="opacity-0 group-hover/field:opacity-100 transition-opacity text-indigo-500" />
                                      )
                                    )
                                  )
                                )}
                              </label>
                              <FieldInput 
                                field={field}
                                value={editData[field.id] ?? record[field.id]}
                                onChange={(val, metadata) => handleFieldChange(field.id, val, metadata)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleUpdateEntry();
                                  if (e.key === 'Escape') setActiveFieldId(null);
                                }}
                                readonly={savingFieldId === field.id || (activeFieldId !== field.id && !['datatable', 'duallist'].includes(field.type))}
                                usersData={usersData}
                              />
                            </div>
                          )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-zinc-500 text-sm">
                  Layout configuration is missing for this module.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-8 space-y-8 shadow-sm">
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Current State</h3>
                <button 
                  onClick={() => setShowVisualizer(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg text-indigo-400 text-[10px] font-bold border border-indigo-500/20 transition-all active:scale-95 group/graph"
                >
                  <GitFork size={12} className="group-hover:rotate-12 transition-transform" />
                  View Workflow
                </button>
              </div>

              {(() => {
                const wState = record.workflowState as WorkflowState | undefined;
                const currentNode = activeWorkflow?.nodes.find((n: any) => n.id === wState?.currentNodeId);
                
                if (!currentNode) {
                  if (activeWorkflow) {
                    return (
                      <button 
                        onClick={handleStartWorkflow}
                        disabled={isTransitioning}
                        className="w-full p-8 bg-indigo-500/5 border border-dashed border-indigo-500/20 rounded-[32px] flex flex-col items-center justify-center gap-4 group hover:bg-indigo-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                          {isTransitioning ? <Loader2 size={24} className="animate-spin" /> : <Zap size={24} fill="currentColor" />}
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-tight">Initialize Workflow</p>
                          <p className="text-[10px] text-zinc-500 mt-1">This record has no active state. Click to begin the journey.</p>
                        </div>
                      </button>
                    );
                  }
                  return (
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-950/30 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-center">
                      <p className="text-xs text-zinc-500 italic">No active workflow state found.</p>
                    </div>
                  );
                }

                return (
                  <div className="p-5 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                      <Sparkles size={48} className="text-white" />
                    </div>
                    <div className="relative z-10 space-y-1">
                      <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Active Node</p>
                      <h4 className="text-xl font-black text-white">{currentNode.name}</h4>
                      <p className="text-[11px] text-white/70 font-medium">{currentNode.type} State</p>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] px-1">Available Transitions</h3>
                <div className="space-y-2">
                  {(() => {
                    const wState = record.workflowState as any;
                    const transitions = wState?.transitions || activeWorkflow?.edges?.filter((e: any) => e.source === wState?.currentNodeId) || [];
                    
                    if (transitions.length === 0) {
                      return (
                        <p className="text-[10px] text-zinc-500 italic px-1">No further transitions available.</p>
                      );
                    }

                    return transitions.map((edge: any) => {
                      const targetNode = activeWorkflow?.nodes.find((n: any) => n.id === edge.target);
                      if (!targetNode) return null;

                      return (
                        <button
                          key={edge.id}
                          onClick={() => handleStatusTransition(targetNode.name, targetNode.id)}
                          disabled={isTransitioning}
                          className="w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-950/30 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-indigo-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-indigo-500 transition-colors">
                              {isTransitioning ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-bold text-zinc-900 dark:text-white">{targetNode.name}</p>
                            </div>
                          </div>
                          <ChevronRight size={14} className="text-zinc-400" />
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">History</h3>
                <History size={12} className="text-zinc-600" />
              </div>
              <div className="space-y-6 relative before:absolute before:inset-0 before:left-3 before:w-px before:bg-zinc-200 dark:before:bg-zinc-800 py-2">
                {(() => {
                  const wState = record.workflowState as WorkflowState | undefined;
                  const history = wState?.history || [];

                  if (history.length === 0) return (
                    <p className="text-[10px] text-zinc-400 italic pl-10">No history available.</p>
                  );

                  return history.map((h, i) => {
                    const node = activeWorkflow?.nodes?.find((n: any) => n.id === h.nodeId);
                    return (
                      <div key={i} className="relative pl-10">
                        <div className={cn(
                          "absolute left-1 top-1.5 w-4 h-4 rounded-full bg-white dark:bg-zinc-950 border-2 z-10 transition-colors",
                          i === history.length - 1 ? "border-indigo-500 scale-110 shadow-lg shadow-indigo-500/20" : "border-zinc-300 dark:border-zinc-700"
                        )} />
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                            {node?.name || 'Unknown Node'}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-medium">
                            <span>{new Date(h.timestamp).toLocaleString()}</span>
                            {h.triggeredBy && (
                              <>
                                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                                <span className="text-indigo-500/80">{h.triggeredBy}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>



      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-6">
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
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Delete Entry?</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                  Are you sure you want to delete this record? This action cannot be undone.
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
                  onClick={handleDeleteEntry} 
                  className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition-all shadow-xl shadow-rose-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Workflow Visualizer Modal */}
      <AnimatePresence>
        {showVisualizer && activeWorkflow && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowVisualizer(false)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full h-full max-w-6xl bg-zinc-950 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                    <GitFork size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight">Workflow Visualizer</h2>
                    <p className="text-xs text-zinc-500 font-medium">Visualizing the path for {record?._record_key || 'this record'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowVisualizer(false)}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-zinc-400 hover:text-white transition-all active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 p-8">
                <WorkflowPreview 
                  workflow={activeWorkflow} 
                  activeNodeId={(record?.workflowState as any)?.currentNodeId} 
                />
              </div>

              <div className="px-8 py-6 bg-white/5 border-t border-white/5 flex items-center justify-between">
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Active State</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-500/20 border border-indigo-500/50" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Planned Path</span>
                  </div>
                </div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                  {activeWorkflow.nodes.length} Nodes • {activeWorkflow.edges.length} Transitions
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
