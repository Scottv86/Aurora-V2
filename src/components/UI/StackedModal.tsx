import { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useModalStack, ModalEntry } from '../../context/ModalStackContext';
import { X, Loader2, Layers, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { DATA_API_URL } from '../../config';
import { MODULES } from '../../constants/modules';
import { FieldInput } from '../FieldInput';
import { flattenFields, isFieldVisible } from '../../lib/utils';
import { compactLayout } from '../../lib/layoutEngine';
import { toast } from 'sonner';
import { validateRecordRules } from '../../lib/validationEngine';
import { RecursiveCollectionBlock } from '../Platform/RecursiveCollectionBlock';
import { RepeatableGroupBlock } from '../Platform/RepeatableGroupBlock';
import { RecordModalSkeleton } from '../Platform/RecordModalSkeleton';


// --- Components ---

const RecordModal = ({ 
  entry, 
  index, 
  total, 
  onClose, 
  onPop 
}: { 
  entry: ModalEntry, 
  index: number, 
  total: number, 
  onClose: () => void,
  onPop: () => void
}) => {
  const { tenant } = usePlatform();
  const { session, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [moduleData, setModuleData] = useState<any>(null);
  const [record, setRecord] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const tabs = useMemo(() => {
    return moduleData?.tabs || [{ id: 'default-tab', label: 'General' }];
  }, [moduleData]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Initialize activeTabId once moduleData is loaded
  useEffect(() => {
    if (tabs.length > 0 && !activeTabId) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, activeTabId]);

  const handleSave = async () => {
    // Validate required fields
    if (moduleData?.layout) {
      const missingFields = moduleData.layout.filter((field: any) => {
        if (!isFieldVisible(field, record, { user })) return false;
        if (!field.required) return false;
        if (['heading', 'divider', 'alert', 'html', 'button', 'autonumber', 'calculation', 'ai_summary'].includes(field.type)) return false;

        const val = record?.[field.id];
        return val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
      });

      if (missingFields.length > 0) {
        toast.error(`Please fill in required fields: ${missingFields.map((f: any) => f.label || f.id).join(', ')}`);
        return;
      }
    }

    // Validate business validation rules
    if (moduleData) {
      const allFields = flattenFields(moduleData.layout || []);
      const rules = moduleData.config?.validationRules || moduleData.validationRules || [];
      const validationErrors = validateRecordRules(record, rules, allFields);
      if (validationErrors.length > 0) {
        toast.error(validationErrors.join(' | '));
        return;
      }
    }

    if (entry.localData && entry.onSaveLocal) {
      entry.onSaveLocal(record);
      onPop();
      return;
    }

    if (!tenant?.id || !entry.moduleId) return;
    
    const isNew = !record?.id;
    setIsSaving(true);
    
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const url = isNew ? `${DATA_API_URL}/records` : `${DATA_API_URL}/records/${record.id}`;
      const method = isNew ? 'POST' : 'PUT';
      
      const payload = isNew ? { moduleId: entry.moduleId, ...record } : record;

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, 
          'x-tenant-id': tenant.id 
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const savedData = await res.json();
        toast.success(isNew ? "Record created successfully" : "Changes saved successfully");
        if (entry.onSave) {
          entry.onSave(savedData);
        }
        onPop();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
    } catch (err: any) {
      toast.error(err.message || "Error saving record");
    } finally {
      setIsSaving(false);
    }
  };

  const isActive = index === total - 1;

  useEffect(() => {
    const fetchData = async () => {
      if (entry.localData && entry.localSchema) {
        setRecord(entry.localData);
        setModuleData({
          name: entry.title || "Record Detail",
          layout: (entry.localSchema || []).map((f: any, i: number) => ({ 
            ...f, 
            rowIndex: f.rowIndex !== undefined ? f.rowIndex : i,
            startCol: f.startCol !== undefined ? f.startCol : 1,
            colSpan: f.colSpan !== undefined ? f.colSpan : 12
          }))
        });
        setLoading(false);
        return;
      }

      if (!tenant?.id || !entry.moduleId) return;
      setLoading(true);
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const prebuilt = MODULES.find(m => m.id === entry.moduleId);
        let modData = prebuilt;
        if (!modData) {
          const modRes = await fetch(`${DATA_API_URL}/modules/${entry.moduleId}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenant.id }
          });
          if (modRes.ok) modData = await modRes.json();
        }
        setModuleData(modData);

        if (entry.recordId) {
          const recRes = await fetch(`${DATA_API_URL}/records/${entry.recordId}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenant.id }
          });
          if (recRes.ok) setRecord(await recRes.json());
        } else {
          setRecord({
            moduleId: entry.moduleId,
            associations: entry.parentAssociation ? [{ record_id: entry.parentAssociation.recordId }] : [],
          });
        }
      } catch (err) {
        console.error("Failed to fetch modal data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tenant?.id, entry.moduleId, entry.recordId, entry.localData, entry.localSchema, session?.access_token]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ 
        opacity: isActive ? 1 : 0, 
        scale: isActive ? 1 : 0.95, 
        y: isActive ? 0 : 20,
        pointerEvents: isActive ? 'auto' : 'none'
      }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed inset-0 z-[1001] flex items-center justify-center p-6 pointer-events-none"
    >
      <div className="w-full max-w-4xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[40px] shadow-2xl overflow-hidden flex flex-col pointer-events-auto h-[80vh]">
        <div className="p-8 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50 shrink-0">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
              <Layers size={20} />
            </div>
            {record?.name || record?.title || moduleData?.name || 'Loading...'}
          </h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {loading ? (
            <RecordModalSkeleton />
          ) : (

            <div className="w-full">
              {(() => {
                const detailLayoutType = entry.detailLayoutType || moduleData?.interfaceSettings?.detail?.layoutType || 'sidebar';

                const renderModalFieldsGrid = (tabId: string) => {
                  if (!moduleData) return null;
                  
                  const allFields = flattenFields(moduleData.layout || []);
                  const visibleFields = compactLayout(
                    allFields.filter((field: any) => {
                      const isVisible = isFieldVisible(field, record, { user });
                      const fieldTabId = field.tabId || tabs[0]?.id;
                      return fieldTabId === tabId && isVisible;
                    })
                  );

                  if (visibleFields.length === 0) {
                    return (
                      <div className="col-span-12 text-center py-8 text-xs font-bold uppercase tracking-widest text-zinc-400">
                        No fields configured for this section
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-12 gap-x-4 gap-y-6 w-full">
                      {visibleFields.map((field: any, idx: number) => (
                        <div 
                          key={field.id} 
                          className={cn(
                            "group/field transition-all relative min-w-0 w-full",
                            (field.type === 'sub_module' || field.type === 'repeatableGroup') && "col-span-full mt-6"
                          )}
                          style={{
                            gridColumn: `${field.startCol || 1} / span ${field.colSpan || 12}`,
                            gridRowStart: (field.rowIndex !== undefined) ? field.rowIndex + 1 : 'auto'
                          }}
                        >
                          <div className="w-full transition-all duration-305 rounded-2xl p-4 -m-4 border-2 border-transparent hover:bg-zinc-500/5 hover:border-zinc-500/10 relative">
                            {field.type === 'sub_module' ? (
                              <RecursiveCollectionBlock 
                                parentRecordId={entry.recordId!}
                                moduleId={field.targetModuleId}
                                label={field.label}
                                field={field}
                              />
                            ) : field.type === 'repeatableGroup' ? (
                              <RepeatableGroupBlock 
                                 field={field}
                                 value={record?.[field.id] || []}
                                 onChange={(newVal) => setRecord({ ...record, [field.id]: newVal })}
                              />
                            ) : (
                              <div className="space-y-1 w-full">
                                <label className="text-[10px] font-bold text-zinc-550 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 relative group/label">
                                  {field.label}
                                  {field.required && <span className="text-rose-500">*</span>}
                                </label>
                                <div className="w-full">
                                  {entry.type !== 'view' && (entry.type === 'edit' || entry.moduleId === 'virtual') ? (
                                    <FieldInput 
                                      field={field}
                                      value={record?.[field.id] ?? ''}
                                      onChange={(val) => setRecord({ ...record, [field.id]: val })}
                                      autoFocus={idx === 0}
                                    />
                                  ) : (
                                    <div className="text-sm text-zinc-900 dark:text-white font-medium min-h-[1.5rem] px-1">
                                       {record?.[field.id] || '-'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                };

                // Virtual / Flat layout (e.g. repeatableGroup items)
                if (entry.moduleId === 'virtual') {
                  const visibleFields = compactLayout(
                    (moduleData.layout || []).filter((f: any) => isFieldVisible(f, record, { user }))
                  );
                  return (
                    <div className="grid grid-cols-12 gap-x-4 gap-y-6 w-full">
                      {visibleFields.map((field: any, idx: number) => (
                        <div 
                          key={field.id}
                          className="group/field transition-all relative min-w-0 w-full"
                          style={{
                            gridColumn: `${field.startCol || 1} / span ${field.colSpan || 12}`,
                            gridRowStart: (field.rowIndex !== undefined) ? field.rowIndex + 1 : 'auto'
                          }}
                        >
                          <div className="w-full transition-all duration-300 rounded-2xl p-4 -m-4 border-2 border-transparent hover:bg-zinc-500/5 hover:border-zinc-500/10 relative">
                            <div className="space-y-1 w-full">
                              <label className="text-[10px] font-bold text-zinc-550 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 relative group/label">
                                {field.label}
                                {field.required && <span className="text-rose-500">*</span>}
                              </label>
                              <div className="w-full">
                                {entry.type !== 'view' && (entry.type === 'edit' || entry.moduleId === 'virtual') ? (
                                  <FieldInput 
                                    field={field}
                                    value={record?.[field.id] ?? ''}
                                    onChange={(val) => setRecord({ ...record, [field.id]: val })}
                                    autoFocus={idx === 0}
                                  />
                                ) : (
                                  <div className="text-sm text-zinc-900 dark:text-white font-medium min-h-[1.5rem] px-1">
                                     {record?.[field.id] || '-'}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }

                // Render main workspace tabs/wizard/accordion/split view layout if configured
                const contentArea = (() => {
                  switch (detailLayoutType) {
                    case 'tabs':
                      return (
                        <div className="space-y-6">
                          <div className="flex gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-950/50 rounded-2xl overflow-x-auto no-scrollbar">
                            {tabs.map((tab: any) => (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTabId(tab.id)}
                                className={cn(
                                  "px-6 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                                  activeTabId === tab.id
                                    ? "bg-white dark:bg-zinc-900 text-indigo-500 shadow-xl"
                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                )}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>
                          {renderModalFieldsGrid(activeTabId || tabs[0]?.id)}
                        </div>
                      );
                    case 'split':
                      return (
                        <div className="grid grid-cols-12 gap-8 items-start">
                          <aside className="col-span-12 lg:col-span-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 space-y-1 shadow-inner">
                            {tabs.map((tab: any) => (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTabId(tab.id)}
                                className={cn(
                                  "w-full px-4 py-2.5 rounded-xl text-left text-xs font-bold transition-all whitespace-nowrap block",
                                  activeTabId === tab.id
                                    ? "bg-white dark:bg-zinc-900 text-indigo-500 shadow-md"
                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900/50"
                                )}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </aside>
                          <div className="col-span-12 lg:col-span-9">
                            {renderModalFieldsGrid(activeTabId || tabs[0]?.id)}
                          </div>
                        </div>
                      );
                    case 'process':
                      const activeStep = tabs[activeStepIdx] || tabs[0];
                      const isFirstStep = activeStepIdx === 0;
                      const isLastStep = activeStepIdx === tabs.length - 1;
                      return (
                        <div className="space-y-8">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-zinc-50 dark:bg-zinc-950/35 border border-zinc-150 dark:border-zinc-800 rounded-[2rem]">
                            <div>
                              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Step {activeStepIdx + 1} of {tabs.length}</span>
                              <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase mt-0.5">{activeStep?.label}</h3>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {tabs.map((step: any, idx: number) => (
                                <div key={step.id} className="flex items-center">
                                  {idx > 0 && <span className="w-3 h-px bg-zinc-200 dark:bg-zinc-800 mx-1" />}
                                  <button
                                    type="button"
                                    onClick={() => idx <= activeStepIdx && setActiveStepIdx(idx)}
                                    className={cn(
                                      "w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border transition-all",
                                      activeStepIdx === idx
                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg"
                                        : activeStepIdx > idx
                                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                                          : "bg-zinc-150 dark:bg-zinc-900 border-zinc-250 dark:border-zinc-800 text-zinc-400"
                                    )}
                                  >
                                    {idx + 1}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                          {renderModalFieldsGrid(activeStep?.id)}
                          
                          <div className="flex justify-between items-center pt-6 border-t border-zinc-150 dark:border-zinc-800">
                            <button
                              type="button"
                              onClick={() => setActiveStepIdx(p => Math.max(0, p - 1))}
                              disabled={isFirstStep}
                              className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-650 dark:text-zinc-400 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
                            >
                              Back
                            </button>
                            {!isLastStep && (
                              <button
                                type="button"
                                onClick={() => setActiveStepIdx(p => Math.min(tabs.length - 1, p + 1))}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10"
                              >
                                Next Step
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    case 'accordion':
                      return (
                        <div className="space-y-4">
                          {tabs.map((tab: any) => {
                            const isCollapsed = collapsedGroups[tab.id] ?? false;
                            return (
                              <div key={tab.id} className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white/5 dark:bg-zinc-950/20">
                                <div
                                  onClick={() => setCollapsedGroups(prev => ({ ...prev, [tab.id]: !isCollapsed }))}
                                  className="p-4 bg-zinc-55/50 dark:bg-zinc-900/30 border-b border-zinc-150 dark:border-zinc-800 flex items-center justify-between cursor-pointer select-none"
                                >
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-755 dark:text-zinc-300">{tab.label}</h4>
                                  <ChevronDown size={14} className={cn("text-zinc-400 transition-transform duration-200", isCollapsed && "rotate-180")} />
                                </div>
                                {!isCollapsed && (
                                  <div className="p-6">
                                    {renderModalFieldsGrid(tab.id)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    case 'sidebar':
                    default:
                      // Render all fields vertically (default)
                      const allFields = flattenFields(moduleData.layout || []);
                      const visibleFields = compactLayout(
                        allFields.filter((f: any) => isFieldVisible(f, record, { user }))
                      );
                      return (
                        <div className="grid grid-cols-12 gap-x-4 gap-y-6 w-full">
                          {visibleFields.map((field: any, idx: number) => (
                            <div 
                              key={field.id} 
                              className={cn(
                                "group/field transition-all relative min-w-0 w-full",
                                (field.type === 'sub_module' || field.type === 'repeatableGroup') && "col-span-full mt-6"
                              )}
                              style={{
                                gridColumn: `${field.startCol || 1} / span ${field.colSpan || 12}`,
                                gridRowStart: (field.rowIndex !== undefined) ? field.rowIndex + 1 : 'auto'
                              }}
                            >
                              <div className="w-full transition-all duration-300 rounded-2xl p-4 -m-4 border-2 border-transparent hover:bg-zinc-500/5 hover:border-zinc-500/10 relative">
                                {field.type === 'sub_module' ? (
                                  <RecursiveCollectionBlock 
                                    parentRecordId={entry.recordId!}
                                    moduleId={field.targetModuleId}
                                    label={field.label}
                                    field={field}
                                  />
                                ) : field.type === 'repeatableGroup' ? (
                                  <RepeatableGroupBlock 
                                     field={field}
                                     value={record?.[field.id] || []}
                                     onChange={(newVal) => setRecord({ ...record, [field.id]: newVal })}
                                  />
                                ) : (
                                  <div className="space-y-1 w-full">
                                    <label className="text-[10px] font-bold text-zinc-550 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 relative group/label">
                                      {field.label}
                                      {field.required && <span className="text-rose-500">*</span>}
                                    </label>
                                    <div className="w-full">
                                      {entry.type !== 'view' && (entry.type === 'edit' || entry.moduleId === 'virtual') ? (
                                        <FieldInput 
                                          field={field}
                                          value={record?.[field.id] ?? ''}
                                          onChange={(val) => setRecord({ ...record, [field.id]: val })}
                                          autoFocus={idx === 0}
                                        />
                                      ) : (
                                        <div className="text-sm text-zinc-900 dark:text-white font-medium min-h-[1.5rem] px-1">
                                           {record?.[field.id] || '-'}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                  }
                })();

                return (
                  <div className={cn(
                    "w-full space-y-12",
                    (entry.moduleId === 'virtual' || !moduleData?.nestedCollections?.length) ? "w-full" : "lg:grid lg:grid-cols-12 lg:gap-12"
                  )}>
                     <div className={cn(
                       "w-full",
                       (entry.moduleId !== 'virtual' && !!moduleData?.nestedCollections?.length) && "lg:col-span-8"
                     )}>
                       {moduleData?.layout ? (
                         contentArea
                       ) : (
                         <p className="text-zinc-500 italic">No layout defined for this module.</p>
                       )}
                     </div>

                     {entry.moduleId !== 'virtual' && !!moduleData?.nestedCollections?.length && (
                       <div className="lg:col-span-4 space-y-10">
                           {record?.associations?.length > 0 && (
                             <div className="space-y-3">
                               <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] px-1">Mirrored In</h3>
                               <div className="flex flex-wrap gap-2">
                                   {record.associations.map((assoc: any, idx: number) => (
                                     <div key={idx} className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-2">
                                       <Layers size={10} className="text-indigo-400" />
                                       <span className="text-[10px] font-bold text-indigo-400">{assoc.role || 'Parent'}</span>
                                     </div>
                                   ))}
                               </div>
                             </div>
                           )}

                           <div className="space-y-8">
                             {(moduleData?.nestedCollections || []).map((coll: any, idx: number) => (
                               <RecursiveCollectionBlock 
                                   key={idx}
                                   parentRecordId={entry.recordId!}
                                   moduleId={coll.targetModuleId}
                                   label={coll.label}
                                   field={coll}
                               />
                             ))}
                           </div>
                       </div>
                     )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 shrink-0 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-8 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl font-bold text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving && <Loader2 size={16} className="animate-spin" />}
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export const StackedModalManager = () => {
  const { stack, clearStack, popModal } = useModalStack();

  return (
    <>
      <AnimatePresence>
        {stack.length > 0 && (
          <motion.div 
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={clearStack}
            className="fixed inset-0 z-[1000] bg-zinc-950/40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stack.map((entry, index) => (
          <RecordModal 
            key={entry.id}
            entry={entry}
            index={index}
            total={stack.length}
            onClose={clearStack}
            onPop={popModal}
          />
        ))}
      </AnimatePresence>
    </>
  );
};
