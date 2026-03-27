import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import { 
  motion, 
  AnimatePresence 
} from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Loader2, 
  AlertCircle,
  ArrowLeft,
  Check,
  X,
  Sparkles
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  collection, 
  onSnapshot, 
  query, 
  where,
  orderBy,
  addDoc
} from 'firebase/firestore';
import { toast } from 'sonner';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { usePlatform } from '../../hooks/usePlatform';
import { MODULES } from '../../constants/modules';
import { FieldInput } from '../../components/FieldInput';
import { generateAISummary, evaluateCalculations } from '../../services/aiService';
import { cn, isFieldVisible, flattenFields, stripUndefined } from '../../lib/utils';
import { Module, ModuleField, ModuleLayout, ModuleColumn } from '../../types/platform';

export const RecordDetailView = () => {
  const { moduleId, recordId } = useParams();
  const navigate = useNavigate();
  const { tenant, isLoading: platformLoading } = usePlatform();
  const [moduleData, setModuleData] = useState<Module | null>(null);
  const [record, setRecord] = useState<Record<string, any> | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [usersData, setUsersData] = useState<any[]>([]);
  const [lookupData, setLookupData] = useState<Record<string, any[]>>({});

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
          fields.push(...flattenFields(col.fields as any)); // flattenFields expects any[]/Field[]
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

    const fetchMod = async () => {
      setLoading(true);
      try {
        const modRef = doc(db, 'tenants', tenant.id, 'modules', moduleId);
        const modSnap = await getDoc(modRef);
        
        let data: any = null;
        const prebuilt = MODULES.find(m => m.id === moduleId);

        if (modSnap.exists()) {
          data = modSnap.data();
          if (prebuilt) {
            data = { ...prebuilt, ...data };
          } else {
            const IconComponent = (LucideIcons as any)[data.iconName || data.icon] || LucideIcons.Layers;
            data = { ...data, icon: IconComponent };
          }
        } else if (prebuilt) {
          data = prebuilt;
        }

        setModuleData(data);
      } catch (error) {
        console.error("Error fetching module:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMod();

    const recordRef = doc(db, 'tenants', tenant.id, 'modules', moduleId, 'records', recordId);
    const unsubscribeRecord = onSnapshot(recordRef, (doc) => {
      if (doc.exists()) {
        setRecord({ ...doc.data(), id: doc.id });
      } else {
        toast.error("Record not found");
        navigate(`/workspace/modules/${moduleId}`);
      }
    });

    const historyRef = collection(db, 'tenants', tenant.id, 'modules', moduleId, 'records', recordId, 'history');
    const qHistory = query(historyRef, orderBy('timestamp', 'desc'));
    const unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    });

    return () => {
      unsubscribeRecord();
      unsubscribeHistory();
    };
  }, [tenant?.id, moduleId, recordId, platformLoading, navigate]);

  useEffect(() => {
    if (platformLoading || !tenant?.id || allFields.length === 0) return;

    let unsubscribeUsers = () => {};
    if (allFields.some(f => f.type === 'user')) {
      const usersRef = collection(db, 'users');
      const usersQuery = query(usersRef, where('tenantId', '==', tenant.id));
      unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
        setUsersData(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      });
    }

    const lookupFields = allFields.filter(f => f.type === 'lookup' && f.targetModuleId);
    const lookupUnsubscribes = lookupFields.map(field => {
      const targetRef = collection(db, 'tenants', tenant.id, 'modules', field.targetModuleId, 'records');
      return onSnapshot(targetRef, (snapshot) => {
        setLookupData(prev => ({
          ...prev,
          [field.targetModuleId]: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))
        }));
      });
    });

    return () => {
      unsubscribeUsers();
      lookupUnsubscribes.forEach(unsub => unsub());
    };
  }, [tenant?.id, platformLoading, allFields]);

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

      const recordRef = doc(db, 'tenants', tenant.id, 'modules', moduleId, 'records', recordId);
      await updateDoc(recordRef, stripUndefined({
        ...finalData,
        updatedAt: serverTimestamp()
      }));
      
      toast.success("Record updated successfully");
      setShowEditModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tenants/${tenant.id}/modules/${moduleId}/records/${recordId}`);
      toast.error("Failed to update record");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusTransition = async (newStatus: string) => {
    if (!tenant?.id || !moduleId || !recordId || !record) return;
    
    try {
      const recordRef = doc(db, 'tenants', tenant.id, 'modules', moduleId, 'records', recordId);
      await updateDoc(recordRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, 'tenants', tenant.id, 'modules', moduleId, 'records', recordId, 'history'), {
        from: record.status,
        to: newStatus,
        timestamp: serverTimestamp(),
        user: tenant?.name || 'System'
      });

      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tenants/${tenant.id}/modules/${moduleId}/records/${recordId}`);
      toast.error("Failed to update status");
    }
  };

  const handleDeleteEntry = async () => {
    if (!tenant?.id || !moduleId || !recordId) return;

    try {
      const recordRef = doc(db, 'tenants', tenant.id, 'modules', moduleId, 'records', recordId);
      await deleteDoc(recordRef);
      toast.success("Record deleted successfully");
      navigate(`/workspace/modules/${moduleId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tenants/${tenant.id}/modules/${moduleId}/records/${recordId}`);
      toast.error("Failed to delete record");
    }
  };

  if (loading || platformLoading) return (
    <div className="h-64 flex items-center justify-center">
      <Loader2 className="animate-spin text-indigo-500" size={32} />
    </div>
  );

  if (!moduleData || !record) return <Navigate to="/workspace" replace />;

  const Icon = moduleData.icon || LucideIcons.Layers;

  return (
    <div className="space-y-8 pb-20">
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
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
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
                                  field.options?.[0] === 'h1' ? "text-3xl" :
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
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] px-1">Actions & Status</h3>
              <div className="space-y-3">
                {moduleData.workflow?.statuses?.map((st: any) => (
                  <button
                    key={st.name}
                    onClick={() => handleStatusTransition(st.name)}
                    disabled={record.status === st.name}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 group",
                      record.status === st.name
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                        : "bg-white dark:bg-zinc-950/30 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-indigo-500/50 hover:text-zinc-900 dark:hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {record.status === st.name ? (
                        <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                          <Check size={12} className="text-white" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 bg-zinc-100 dark:bg-zinc-800 rounded-full group-hover:bg-indigo-500/20 transition-colors" />
                      )}
                      <span className="text-sm font-bold">{st.name}</span>
                    </div>
                    {record.status === st.name && <Sparkles size={14} className="text-white/50" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] px-1">History</h3>
              <div className="space-y-6 relative before:absolute before:inset-0 before:left-3 before:w-px before:bg-zinc-200 dark:before:bg-zinc-800 py-2">
                {history.map((h, i) => (
                  <div key={i} className="relative pl-10">
                    <div className="absolute left-1 top-1.5 w-4 h-4 rounded-full bg-white dark:bg-zinc-950 border-2 border-indigo-500 z-10" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                        Status changed to <span className="text-indigo-500">{h.to}</span>
                      </p>
                      <p className="text-[10px] text-zinc-500 font-medium">
                        {h.timestamp?.toDate ? h.timestamp.toDate().toLocaleString() : 'Just now'} • {h.user}
                      </p>
                    </div>
                  </div>
                ))}
                {history.length === 0 && (
                  <p className="text-[10px] text-zinc-400 italic pl-10">No history available.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Entry Modal (Reuse New Entry logic but for specific record) */}
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
                                    field.options?.[0] === 'h1' ? "text-3xl" :
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
                                      {(!editData[field.id] || editData[field.id].length === 0) && (
                                        <p className="text-xs text-zinc-500 italic text-center py-2">No items added.</p>
                                      )}
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
                                    {field.helperText && (
                                      <p className="text-xs text-zinc-500 mt-1.5">{field.helperText}</p>
                                    )}
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

      {/* Delete Confirmation Modal */}
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
