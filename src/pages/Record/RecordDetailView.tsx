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
  Plus,
  X,
  Zap,
  RefreshCw,
  Search,
  CheckCircle2
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { toast } from 'sonner';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { MODULES } from '../../constants/modules';
import { DATA_API_URL } from '../../config';
import { FieldInput } from '../../components/FieldInput';
import { generateAISummary, evaluateCalculations } from '../../services/aiService';
import { cn, isFieldVisible, flattenFields } from '../../lib/utils';
import { Module, ModuleField, ModuleLayout, ModuleColumn } from '../../types/platform';
import { WorkflowState } from '../../../server/services/workflowEngine';

export const RecordDetailView = () => {
  const { moduleId, recordId } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { tenant, isLoading: platformLoading } = usePlatform();
  const [moduleData, setModuleData] = useState<Module | null>(null);
  const [record, setRecord] = useState<Record<string, any> | null>(null);

  const Icon = useMemo(() => {
    if (!moduleData) return LucideIcons.Layers;
    const iconSource = (moduleData as any).iconName || (moduleData as any).icon;
    
    // If it's a string, look it up in LucideIcons
    if (typeof iconSource === 'string' && iconSource.trim() !== '') {
      return (LucideIcons as any)[iconSource] || LucideIcons.Layers;
    }
    
    // If it's a component (function or object with $$typeof)
    if (typeof iconSource === 'function' || (typeof iconSource === 'object' && iconSource !== null && (iconSource as any).$$typeof)) {
      return iconSource;
    }
    
    // Fallback for empty objects or other invalid data
    return LucideIcons.Layers;
  }, [moduleData]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [usersData] = useState<any[]>([]);
  const [lookupData] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (moduleData?.tabs && moduleData.tabs.length > 0 && !activeTabId) {
      setActiveTabId(moduleData.tabs[0].id);
    }
  }, [moduleData, activeTabId]);

  const allFields = useMemo(() => {
    if (moduleData?.layout) {
      const fields: ModuleField[] = [];
      moduleData.layout.forEach((row: ModuleLayout) => {
        row.columns.forEach((col: ModuleColumn) => {
          fields.push(...flattenFields(col.fields as any));
        });
      });
      return fields;
    }
    return flattenFields((moduleData as any)?.fields || []) as ModuleField[];
  }, [moduleData]);

  useEffect(() => {
    if (platformLoading) return;
    if (!tenant?.id || !moduleId || !recordId) {
      setLoading(false);
      return;
    }

    const fetchModAndRecord = async () => {
      setLoading(true);
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || (session as any)?.access_token;
        
        // 1. Fetch Module
        const prebuilt = MODULES.find(m => m.id === moduleId);
        if (prebuilt) {
          setModuleData(prebuilt as any);
        } else {
          const modRes = await fetch(`${DATA_API_URL}/modules/${moduleId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'x-tenant-id': tenant.id
            }
          });
          if (modRes.ok) {
            setModuleData(await modRes.json());
          }
        }
        
        // 2. Fetch Record
        const recRes = await fetch(`${DATA_API_URL}/records/${recordId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant.id
          }
        });
        
        if (recRes.ok) {
          const recData = await recRes.json();
          setRecord(recData);
          setEditData(recData);
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
  }, [tenant?.id, moduleId, recordId, platformLoading]);

  const handleUpdateEntry = async () => {
    if (!tenant?.id || !moduleId || !recordId || !moduleData) return;
    
    setIsSubmitting(true);
    try {
      let finalData = evaluateCalculations(editData, allFields);
      
      const hasAISummary = allFields.some(f => f.type === 'ai_summary');
      if (hasAISummary) {
        toast.info("Updating AI Summary...");
        const aiSummaryField = allFields.find(f => f.type === 'ai_summary');
        if (aiSummaryField) {
          finalData[aiSummaryField.id] = await generateAISummary(finalData, allFields);
        }
      }

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
      setShowEditModal(false);
      toast.success("Record updated successfully");
    } catch (error: any) {
      console.error("Update Error:", error);
      toast.error(error.message || "Failed to update record");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusTransition = async (newStatus: string) => {
    if (!tenant?.id || !moduleId || !recordId || !record) return;
    
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
          status: newStatus
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
    }
  };
  
  const [syncingConnectors, setSyncingConnectors] = useState<Record<string, boolean>>({});

  const handleSyncConnector = async (field: any) => {
    if (!tenant?.id || !moduleId || !recordId || !field.connectorId) return;
    
    setSyncingConnectors(prev => ({ ...prev, [field.id]: true }));
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || (session as any)?.access_token;
      
      // We pass the moduleId and recordId so the proxy knows how to map the response back to this record
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
          // You could also pass specific field values as inputs here if the connector requires them
        })
      });

      if (!res.ok) throw new Error("Sync failed");
      
      const data = await res.json();
      
      // Update local record state with the reshaped data
      setRecord(prev => ({ ...prev, ...data }));
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
    <div className="flex flex-col w-full px-6 lg:px-12 pt-6 pb-10 space-y-8 pb-20">
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
                {record.name || record.title || record.id || 'Record Details'}
              </h1>
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20 shadow-sm">
                {record.status}
              </span>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-2">
              <span className="font-medium">{moduleData.name}</span>
              <span className="w-1 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
              <span>Created {record.createdAt?.toDate ? record.createdAt.toDate().toLocaleDateString() : 'Just now'}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowDeleteModal(true)}
            className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-rose-500 rounded-xl transition-all"
          >
            <Trash2 size={20} />
          </button>
          <button 
            onClick={() => {
              setEditData(record);
              setShowEditModal(true);
            }}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-2"
          >
            <Edit2 size={16} />
            <span>Edit Record</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[32px] overflow-hidden shadow-sm">
            {moduleData.tabs && moduleData.tabs.length > 0 && (
              <div className="flex gap-2 p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 overflow-x-auto no-scrollbar">
                {moduleData.tabs.map((tab: any) => (
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
              {moduleData.layout ? (
                <div className="space-y-12">
                  {moduleData.layout
                    .filter((row: any) => {
                      if (!moduleData.tabs || moduleData.tabs.length === 0) return true;
                      const rowTabId = row.tabId || moduleData.tabs[0].id;
                      return rowTabId === activeTabId;
                    })
                    .map((row: any) => (
                    <div key={row.id} className="flex flex-wrap lg:flex-nowrap gap-8">
                      {row.columns.map((col: any) => (
                        <div key={col.id} className="flex-1 space-y-6">
                          {col.fields.map((field: any) => {
                            if (!isFieldVisible(field, record)) return null;
                            return (
                            <div key={field.id} className="space-y-2 group">
                              {field.type === 'heading' ? (
                                <h4 className={cn(
                                  "font-bold text-zinc-900 dark:text-white mt-4 first:mt-0",
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
                                  "p-4 rounded-2xl border text-sm shadow-sm",
                                  field.options?.[0] === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" :
                                  field.options?.[0] === 'warning' ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" :
                                  field.options?.[0] === 'error' ? "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400" :
                                  "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                                )}>
                                  {field.label}
                                </div>
                              ) : field.type === 'repeatableGroup' ? (
                                <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 shadow-inner">
                                  <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{field.label}</h5>
                                  <div className="space-y-4">
                                    {(record[field.id] || []).map((item: any, idx: number) => (
                                      <div key={idx} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-4 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50" />
                                        <div className="text-[10px] font-bold text-zinc-400 uppercase">Item {idx + 1}</div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                          {(field.fields || []).map((nestedField: any) => {
                                            if (!isFieldVisible(nestedField, item)) return null;
                                            return (
                                            <div key={nestedField.id} className="space-y-1">
                                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{nestedField.label}</label>
                                              <p className="text-sm text-zinc-900 dark:text-white font-medium">
                                                {item[nestedField.id] || '-'}
                                              </p>
                                            </div>
                                          )})}
                                        </div>
                                      </div>
                                    ))}
                                    {(!record[field.id] || record[field.id].length === 0) && (
                                      <p className="text-sm text-zinc-500 italic text-center py-4 bg-white/50 dark:bg-white/5 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">No items recorded.</p>
                                    )}
                                  </div>
                                </div>
                              ) : field.type === 'fieldGroup' ? (
                                <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
                                  <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{field.label}</h5>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {(field.fields || []).map((nestedField: any) => {
                                      if (!isFieldVisible(nestedField, record[field.id] || {})) return null;
                                      return (
                                      <div key={nestedField.id} className="space-y-1">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{nestedField.label}</label>
                                        <p className="text-sm text-zinc-900 dark:text-white font-medium">
                                          {record[field.id]?.[nestedField.id] || '-'}
                                        </p>
                                      </div>
                                    )})}
                                  </div>
                                </div>
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
                                      onClick={() => handleSyncConnector(field)}
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
                                  
                                  {/* Sync Status Badge */}
                                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/50 dark:bg-black/20 rounded-lg border border-zinc-100 dark:border-white/5 w-fit">
                                    <CheckCircle2 size={12} className="text-emerald-500" />
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Reshaping Engine Engaged</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    {field.label}
                                  </label>
                                  <div className="text-base text-zinc-900 dark:text-zinc-100 font-medium">
                                    {['rich_text', 'long_text'].includes(field.type) ? (
                                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:text-zinc-600 dark:prose-p:text-zinc-400" dangerouslySetInnerHTML={{ __html: record[field.id] || '-' }} />
                                    ) : (
                                      record[field.id] || '-'
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )})}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {allFields.map((field: any) => (
                    <div key={field.id} className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{field.label || field.name}</label>
                      <p className="text-zinc-900 dark:text-white font-medium">
                        {record[field.id] || record[field.name] || '-'}
                      </p>
                    </div>
                  ))}
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
                <div className="flex items-center gap-2 px-2 py-1 bg-indigo-500/10 rounded-lg text-indigo-400 text-[10px] font-bold border border-indigo-500/20">
                  <GitFork size={12} />
                  Graph Active
                </div>
              </div>

              {/* Current Node Display */}
              {(() => {
                const wState = record.workflowState as WorkflowState | undefined;
                const currentNode = moduleData.workflow?.nodes.find((n: any) => n.id === wState?.currentNodeId);
                
                if (!currentNode) return (
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-950/30 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-center">
                    <p className="text-xs text-zinc-500 italic">No active workflow state found.</p>
                  </div>
                );

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

              {/* Available Transitions */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] px-1">Available Transitions</h3>
                <div className="space-y-2">
                  {(() => {
                    const wState = record.workflowState as WorkflowState | undefined;
                    const edges = moduleData.workflow?.edges.filter((e: any) => e.source === wState?.currentNodeId) || [];
                    
                    if (edges.length === 0) return (
                      <p className="text-[10px] text-zinc-500 italic px-1">No further transitions available from this node.</p>
                    );

                    return edges.map((edge: any) => {
                      const targetNode = moduleData.workflow?.nodes.find((n: any) => n.id === edge.target);
                      if (!targetNode) return null;

                      return (
                        <button
                          key={edge.id}
                          onClick={() => handleStatusTransition(targetNode.name)} // Update this to handle graph transitions properly
                          className="w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-950/30 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-indigo-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-indigo-500 transition-colors">
                              <ArrowRight size={14} />
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-bold text-zinc-900 dark:text-white">{targetNode.name}</p>
                              {edge.condition && <p className="text-[9px] text-zinc-500 truncate max-w-[150px]">{edge.condition}</p>}
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
                <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Execution Audit</h3>
                <History size={12} className="text-zinc-600" />
              </div>
              <div className="space-y-6 relative before:absolute before:inset-0 before:left-3 before:w-px before:bg-zinc-200 dark:before:bg-zinc-800 py-2">
                {(() => {
                  const wState = record.workflowState as WorkflowState | undefined;
                  const history = wState?.history || [];

                  if (history.length === 0) return (
                    <p className="text-[10px] text-zinc-400 italic pl-10">No execution history available.</p>
                  );

                  return history.map((h, i) => {
                    const node = moduleData.workflow?.nodes.find((n: any) => n.id === h.nodeId);
                    return (
                      <div key={i} className="relative pl-10">
                        <div className={cn(
                          "absolute left-1 top-1.5 w-4 h-4 rounded-full bg-white dark:bg-zinc-950 border-2 z-10 transition-colors",
                          i === history.length - 1 ? "border-indigo-500 scale-110 shadow-lg shadow-indigo-500/20" : "border-zinc-300 dark:border-zinc-700"
                        )} />
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                            {node?.name || 'Unknown Node'}
                            {node?.type === 'ACTION' && <span className="ml-2 text-[8px] px-1 bg-emerald-500/10 text-emerald-400 rounded">ACTION EXECUTED</span>}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-medium">
                            {new Date(h.timestamp).toLocaleString()}
                          </p>
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
        {showEditModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                    <Edit2 size={20} />
                  </div>
                  Edit {moduleData.name} Record
                </h2>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {moduleData.tabs && moduleData.tabs.length > 0 && (
                  <div className="flex gap-2 mb-8 p-1.5 bg-zinc-100 dark:bg-zinc-950/50 rounded-2xl overflow-x-auto no-scrollbar">
                    {moduleData.tabs.map((tab: any) => (
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
                {moduleData.layout ? (
                  <div className="space-y-10">
                    {moduleData.layout
                      .filter((row: any) => {
                        if (!moduleData.tabs || moduleData.tabs.length === 0) return true;
                        const rowTabId = row.tabId || moduleData.tabs[0].id;
                        return rowTabId === activeTabId;
                      })
                      .map((row: any) => (
                      <div key={row.id} className="space-y-8">
                        {row.columns.map((col: any) => (
                          <div key={col.id} className="space-y-6">
                            {col.fields.map((field: any) => {
                              if (!isFieldVisible(field, editData)) return null;
                              return (
                              <div key={field.id} className="space-y-2">
                                {field.type === 'heading' ? (
                                  <h4 className={cn(
                                    "font-bold text-zinc-900 dark:text-white",
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
                                ) : field.type === 'repeatableGroup' ? (
                                  <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                      <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{field.label}</h5>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const currentList = editData[field.id] || [];
                                          setEditData({
                                            ...editData,
                                            [field.id]: [...currentList, {}]
                                          });
                                        }}
                                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-1"
                                      >
                                        <Plus size={12} /> Add
                                      </button>
                                    </div>
                                    <div className="space-y-4">
                                      {(editData[field.id] || []).map((item: any, idx: number) => (
                                        <div key={idx} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4 relative">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const currentList = [...editData[field.id]];
                                              currentList.splice(idx, 1);
                                              setEditData({
                                                ...editData,
                                                [field.id]: currentList
                                              });
                                            }}
                                            className="absolute top-3 right-3 text-zinc-500 hover:text-rose-500 transition-colors"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                          <div className="text-xs font-bold text-zinc-600 uppercase">Item {idx + 1}</div>
                                          {(field.fields || []).map((nestedField: any) => {
                                            if (!isFieldVisible(nestedField, item)) return null;
                                            return (
                                            <div key={nestedField.id} className="space-y-1">
                                              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                                                {nestedField.label}
                                              </label>
                                              <FieldInput 
                                                field={nestedField}
                                                value={item[nestedField.id]}
                                                onChange={(val) => {
                                                  const currentList = [...editData[field.id]];
                                                  currentList[idx] = {
                                                    ...currentList[idx],
                                                    [nestedField.id]: val
                                                  };
                                                  setEditData({
                                                    ...editData,
                                                    [field.id]: currentList
                                                  });
                                                }}
                                                usersData={usersData}
                                                lookupData={lookupData}
                                              />
                                            </div>
                                          )})}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : field.type === 'fieldGroup' ? (
                                  <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{field.label || field.name}</p>
                                  </div>
                                ) : (
                                  <>
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                                      {field.label}
                                      {field.required && <span className="text-rose-500">*</span>}
                                    </label>
                                    <FieldInput 
                                      field={field}
                                      value={editData[field.id]}
                                      onChange={(val) => setEditData({...editData, [field.id]: val})}
                                      usersData={usersData}
                                      lookupData={lookupData}
                                    />
                                  </>
                                )}
                              </div>
                            )})}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-zinc-500 text-sm">
                    This record uses an older layout format. Please edit the module in the builder to upgrade to the new layout system.
                  </div>
                )}
              </div>
              
              <div className="p-8 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex gap-4 shrink-0">
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdateEntry}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] shadow-2xl p-8 space-y-6"
            >
              <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center text-rose-500 mx-auto">
                <AlertCircle size={32} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Delete Record?</h3>
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
                  className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-50 transition-all shadow-xl shadow-rose-500/20 flex items-center justify-center gap-2"
                >
                  <span>Delete Record</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
