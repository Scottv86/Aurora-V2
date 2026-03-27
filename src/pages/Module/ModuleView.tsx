import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { 
  motion, 
  AnimatePresence 
} from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Loader2, 
  Search,
  Filter,
  X,
  Database,
  Zap,
  History
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
  orderBy,
  where,
  addDoc
} from 'firebase/firestore';
import { toast } from 'sonner';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { usePlatform } from '../../hooks/usePlatform';
import { useFirebase } from '../../hooks/useFirebase';
import { MODULES } from '../../constants/modules';
import { FieldInput } from '../../components/FieldInput';
import { generateAISummary, evaluateCalculations } from '../../services/aiService';
import { cn, isFieldVisible, flattenFields, stripUndefined } from '../../lib/utils';
import { Module, ModuleField, ModuleLayout, ModuleColumn, Workflow } from '../../types/platform';

export const ModuleView = () => {
  const { id } = useParams();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user } = useFirebase();
  const { tenant, isLoading: platformLoading } = usePlatform();
  const [moduleData, setModuleData] = useState<Module | null>(null);
  const [records, setRecords] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<Record<string, any> | null>(null);
  const [newEntryData, setNewEntryData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [usersData, setUsersData] = useState<any[]>([]);
  const [lookupData, setLookupData] = useState<Record<string, any[]>>({});
  const navigate = useNavigate();

  const allFields = useMemo(() => {
    if (moduleData?.layout) {
      const fields: ModuleField[] = [];
      moduleData.layout.forEach((row: ModuleLayout) => {
        row.columns.forEach((col: ModuleColumn) => {
          fields.push(...flattenFields(col.fields as any) as ModuleField[]);
        });
      });
      return fields;
    }
    return flattenFields((moduleData as any)?.fields || []) as ModuleField[];
  }, [moduleData]);

  const displayFields = useMemo(() => {
    return allFields.filter((f: ModuleField) => 
      !['heading', 'divider', 'spacer', 'alert', 'fieldGroup', 'repeatableGroup'].includes(f.type)
    );
  }, [allFields]);

  useEffect(() => {
    if (platformLoading) return;
    if (!tenant?.id || !id) {
      setLoading(false);
      return;
    }

    const fetchMod = async () => {
      setLoading(true);
      try {
        const modRef = doc(db, 'tenants', tenant.id, 'modules', id);
        const modSnap = await getDoc(modRef);
        
        let data: any = null;
        const prebuilt = MODULES.find(m => m.id === id);

        if (modSnap.exists()) {
          data = modSnap.data();
          if (prebuilt) {
            data = { ...prebuilt, ...data };
          } else {
            const IconComponent = (LucideIcons as any)[data.iconName || data.icon] || LucideIcons.Layers;
            data = { ...data, icon: IconComponent };
          }
        } else {
          const globalModRef = doc(db, 'modules', id);
          const globalModSnap = await getDoc(globalModRef);
          if (globalModSnap.exists()) {
            const gData = globalModSnap.data();
            const IconComponent = (LucideIcons as any)[gData.icon] || LucideIcons.Layers;
            data = { ...gData, icon: IconComponent, isCustom: true };
          } else if (prebuilt) {
            data = prebuilt;
          }
        }

        setModuleData(data);
      } catch (error) {
        console.error("Error fetching module:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMod();

    const logicRef = collection(db, 'tenants', tenant.id, 'logic');
    const workflowQuery = query(logicRef, where('type', '==', 'WORKFLOW'), where('targetModuleId', '==', id));
    const unsubscribeWorkflows = onSnapshot(workflowQuery, (snapshot: any) => {
      setWorkflows(snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as any)) as Workflow[]);
    });

    const recordsRef = collection(db, 'tenants', tenant.id, 'modules', id, 'records');
    const q = query(recordsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribeRecords = onSnapshot(q, (snapshot: any) => {
      setRecords(snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id })));
    }, (error: any) => {
      handleFirestoreError(error, OperationType.LIST, `tenants/${tenant.id}/modules/${id}/records`);
    });

    return () => {
      unsubscribeRecords();
      unsubscribeWorkflows();
    };
  }, [tenant?.id, id, platformLoading]);

  useEffect(() => {
    if (platformLoading || !tenant?.id || allFields.length === 0) return;

    let unsubscribeUsers = () => {};
    if (allFields.some(f => f.type === 'user')) {
      const usersRef = collection(db, 'users');
      const usersQuery = query(usersRef, where('tenantId', '==', tenant.id));
      unsubscribeUsers = onSnapshot(usersQuery, (snapshot: any) => {
        setUsersData(snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id })));
      });
    }

    const lookupFields = allFields.filter(f => f.type === 'lookup' && f.targetModuleId);
    const lookupUnsubscribes = lookupFields.map(field => {
      const targetRef = collection(db, 'tenants', tenant.id, 'modules', field.targetModuleId!, 'records');
      return onSnapshot(targetRef, (snapshot: any) => {
        setLookupData(prev => ({
          ...prev,
          [field.targetModuleId!]: snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id }))
        }));
      });
    });

    return () => {
      unsubscribeUsers();
      lookupUnsubscribes.forEach(unsub => unsub());
    };
  }, [tenant?.id, platformLoading, allFields]);

  const handleCreateEntry = async () => {
    if (!tenant?.id || !id || !moduleData) return;
    
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

      if (editingRecord) {
        const recordRef = doc(db, 'tenants', tenant.id, 'modules', id, 'records', editingRecord.id);
        await updateDoc(recordRef, stripUndefined({
          ...finalData,
          updatedAt: serverTimestamp()
        }));
        toast.success("Record updated successfully");
      } else {
        let initialStatus = 'Active';
        let workflowId = null;

        if (workflows.length > 0) {
          initialStatus = workflows[0].steps?.[0]?.name || 'Active';
          workflowId = workflows[0].id;
        } else if (moduleData.workflow?.statuses && moduleData.workflow.statuses.length > 0) {
          initialStatus = moduleData.workflow.statuses[0].name;
        }

        await addDoc(collection(db, 'tenants', tenant.id, 'modules', id, 'records'), stripUndefined({
          ...finalData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          status: initialStatus,
          workflowId: workflowId
        }));
        toast.success("Record created successfully");
      }
      setShowNewEntryModal(false);
      setEditingRecord(null);
      setNewEntryData({});
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tenants/${tenant.id}/modules/${id}/records`);
      toast.error(editingRecord ? "Failed to update record" : "Failed to create record");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (recordId: string) => {
    if (!tenant?.id || !id) return;

    try {
      const recordRef = doc(db, 'tenants', tenant.id, 'modules', id, 'records', recordId);
      await deleteDoc(recordRef);
      toast.success("Record deleted successfully");
      setRecordToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tenants/${tenant.id}/modules/${id}/records/${recordId}`);
      toast.error("Failed to delete record");
    }
  };

  if (loading || platformLoading) return (
    <div className="h-64 flex items-center justify-center">
      <Loader2 className="animate-spin text-indigo-500" size={32} />
    </div>
  );

  if (!moduleData) return <Navigate to="/workspace" replace />;

  const Icon = moduleData.icon || LucideIcons.Layers;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20">
            <Icon size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">{moduleData.name}</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">{moduleData.description}</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors">
            Configure
          </button>
          <button 
            onClick={() => {
              setNewEntryData({});
              setEditingRecord(null);
              if (moduleData.tabs && moduleData.tabs.length > 0) {
                setActiveTabId(moduleData.tabs[0].id);
              } else {
                setActiveTabId(null);
              }
              setShowNewEntryModal(true);
            }}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20"
          >
            New Entry
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Records', value: records.length.toString(), icon: Database, color: 'text-blue-400' },
          { label: 'Active Tasks', value: '0', icon: Zap, color: 'text-amber-400' },
          { label: 'Recent Activity', value: records.length > 0 ? 'Just now' : 'No data', icon: History, color: 'text-indigo-400' },
        ].map((stat, i) => (
          <div key={i} className="p-6 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800", stat.color)}>
                <stat.icon size={20} />
              </div>
            </div>
            <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {records.length > 0 ? (
        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
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
              <button className="p-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <Filter size={18} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                Export
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/30">
                  {displayFields.slice(0, 4).map((field: any, i: number) => (
                    <th key={i} className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{field.label || field.name}</th>
                  ))}
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Created</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
                {records.map((record, i) => (
                  <tr 
                    key={i} 
                    onClick={() => navigate(`/workspace/modules/${id}/records/${record.id}`)}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors group cursor-pointer"
                  >
                    {displayFields.slice(0, 4).map((field: any, j: number) => (
                      <td key={j} className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-300">
                        {field.type === 'checkbox' 
                          ? (record[field.id] || record[field.name] ? 'Yes' : 'No') 
                          : (record[field.id] || record[field.name] || '-')}
                      </td>
                    ))}
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/20">
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {record.createdAt?.toDate ? record.createdAt.toDate().toLocaleDateString() : 'Just now'}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingRecord(record);
                            setNewEntryData(record);
                            if (moduleData.tabs && moduleData.tabs.length > 0) {
                              setActiveTabId(moduleData.tabs[0].id);
                            } else {
                              setActiveTabId(null);
                            }
                            setShowNewEntryModal(true);
                          }}
                          className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                        >
                          <Edit2 size={14} />
                        </button>
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
              setEditingRecord(null);
              setNewEntryData({});
              if (moduleData.tabs && moduleData.tabs.length > 0) {
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

      {/* New Entry Modal */}
      <AnimatePresence>
        {showNewEntryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewEntryModal(false)}
              className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  {editingRecord ? <Edit2 size={20} className="text-indigo-400" /> : <Plus size={20} className="text-indigo-400" />}
                  {editingRecord ? 'Edit' : 'New'} {moduleData.name} Entry
                </h2>
                <button 
                  onClick={() => {
                    setShowNewEntryModal(false);
                    setEditingRecord(null);
                    setNewEntryData({});
                  }}
                  className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {moduleData.tabs && moduleData.tabs.length > 0 && (
                  <div className="flex gap-2 mb-6 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl overflow-x-auto no-scrollbar">
                    {moduleData.tabs.map((tab: any) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTabId(tab.id)}
                        className={cn(
                          "px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                          activeTabId === tab.id
                            ? "bg-white dark:bg-zinc-900 text-indigo-500 shadow-sm"
                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}
                {moduleData.layout ? (
                  <div className="space-y-6">
                    {moduleData.layout
                      .filter((row: any) => {
                        if (!moduleData.tabs || moduleData.tabs.length === 0) return true;
                        const firstTabId = moduleData.tabs[0].id;
                        const rowTabId = row.tabId || firstTabId;
                        return rowTabId === activeTabId;
                      })
                      .map((row: any) => (
                      <div key={row.id} className="flex gap-6">
                        {row.columns.map((col: any) => (
                          <div key={col.id} className="flex-1 space-y-4">
                            {col.fields.map((field: any) => {
                              if (!isFieldVisible(field, newEntryData)) return null;
                              return (
                              <div key={field.id} className="space-y-1.5">
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
                                ) : field.type === 'fieldGroup' ? (
                                  <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-4">
                                    <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{field.label}</h5>
                                    <div className="space-y-4">
                                      {(field.fields || []).map((nestedField: any) => {
                                        if (!isFieldVisible(nestedField, newEntryData[field.id] || {})) return null;
                                        return (
                                        <div key={nestedField.id} className="space-y-1">
                                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                                            {nestedField.label}
                                          </label>
                                          <FieldInput 
                                            field={nestedField}
                                            value={newEntryData[field.id]?.[nestedField.id]}
                                            onChange={(val) => {
                                              const currentGroupData = newEntryData[field.id] || {};
                                              setNewEntryData({
                                                ...newEntryData,
                                                [field.id]: {
                                                  ...currentGroupData,
                                                  [nestedField.id]: val
                                                }
                                              });
                                            }}
                                            usersData={usersData}
                                            lookupData={lookupData}
                                          />
                                        </div>
                                      )})}
                                    </div>
                                  </div>
                                ) : field.type === 'repeatableGroup' ? (
                                  <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                      <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{field.label}</h5>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const currentList = newEntryData[field.id] || [];
                                          setNewEntryData({
                                            ...newEntryData,
                                            [field.id]: [...currentList, {}]
                                          });
                                        }}
                                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 uppercase tracking-widest flex items-center gap-1"
                                      >
                                        <Plus size={12} /> Add
                                      </button>
                                    </div>
                                    <div className="space-y-4">
                                      {(newEntryData[field.id] || []).map((item: any, idx: number) => (
                                        <div key={idx} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-3 relative shadow-sm">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const currentList = [...newEntryData[field.id]];
                                              currentList.splice(idx, 1);
                                              setNewEntryData({
                                                ...newEntryData,
                                                [field.id]: currentList
                                              });
                                            }}
                                            className="absolute top-2 right-2 text-zinc-500 hover:text-rose-500 transition-colors"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                          <div className="text-[10px] font-bold text-zinc-600 uppercase">Item {idx + 1}</div>
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
                                                  const currentList = [...newEntryData[field.id]];
                                                  currentList[idx] = {
                                                    ...currentList[idx],
                                                    [nestedField.id]: val
                                                  };
                                                  setNewEntryData({
                                                    ...newEntryData,
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
                                      {(!newEntryData[field.id] || newEntryData[field.id].length === 0) && (
                                        <p className="text-[10px] text-zinc-500 italic text-center py-2">No items added.</p>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                                      {field.label}
                                      {field.required && <span className="text-rose-500">*</span>}
                                    </label>
                                    <FieldInput 
                                      field={field}
                                      value={newEntryData[field.id]}
                                      onChange={(val) => setNewEntryData({...newEntryData, [field.id]: val})}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allFields.map((field: any) => (
                      <div key={field.id} className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          {field.label || field.name}
                          {field.required && <span className="text-rose-500">*</span>}
                        </label>
                        <FieldInput 
                          field={field}
                          value={newEntryData[field.id]}
                          onChange={(val) => setNewEntryData({...newEntryData, [field.id]: val})}
                          usersData={usersData}
                          lookupData={lookupData}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex gap-4">
                <button 
                  onClick={() => {
                    setShowNewEntryModal(false);
                    setEditingRecord(null);
                    setNewEntryData({});
                  }}
                  className="flex-1 py-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold text-zinc-600 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateEntry}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingRecord ? 'Update' : 'Create'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
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
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] shadow-2xl p-8 space-y-6"
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
                  className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-50 transition-all shadow-xl shadow-rose-500/20 flex items-center justify-center gap-2"
                >
                  <span>Delete</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
