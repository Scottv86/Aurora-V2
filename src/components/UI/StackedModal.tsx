import React, { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useModalStack, ModalEntry } from '../../context/ModalStackContext';
import { X, ChevronRight, Home, ArrowLeft, Loader2, Layers } from 'lucide-react';
import { cn } from '../../lib/utils';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { DATA_API_URL } from '../../config';
import { MODULES } from '../../constants/modules';
import { FieldInput } from '../FieldInput';
import { flattenFields, isFieldVisible, calculateHeight } from '../../lib/utils';
import { compactLayout } from '../../lib/layoutEngine';
import { evaluateCalculations } from '../../services/aiService';
import { toast } from 'sonner';
import { RecursiveCollectionBlock } from '../Platform/RecursiveCollectionBlock';
import { RepeatableGroupBlock } from '../Platform/RepeatableGroupBlock';

// --- Components ---

const Breadcrumbs = ({ stack, onNavigate }: { stack: ModalEntry[], onNavigate: (id: string) => void }) => {
  return (
    <div className="flex items-center gap-2 px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
      <button 
        onClick={() => onNavigate(stack[0].id)}
        className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
      >
        <Home size={14} />
      </button>
      {stack.map((entry, i) => (
        <React.Fragment key={entry.id}>
          <ChevronRight size={12} className="text-zinc-300 dark:text-zinc-700" />
          <button
            onClick={() => onNavigate(entry.id)}
            disabled={i === stack.length - 1}
            className={cn(
              "text-[10px] font-bold uppercase tracking-widest transition-colors",
              i === stack.length - 1 
                ? "text-indigo-500 cursor-default" 
                : "text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            {entry.title || (entry.type === 'view' ? 'View Record' : 'Edit Record')}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

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
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const handleSave = async () => {
    // Local save for virtual records
    if (entry.localData && entry.onSaveLocal) {
      entry.onSaveLocal(record);
      onPop();
      return;
    }

    if (!tenant?.id || !entry.moduleId || !record?.id) return;
    setIsSaving(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${DATA_API_URL}/records/${record.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, 
          'x-tenant-id': tenant.id 
        },
        body: JSON.stringify(record)
      });
      if (res.ok) {
        toast.success("Changes saved successfully");
      } else {
        throw new Error("Failed to save");
      }
    } catch (err) {
      toast.error("Error saving record");
    } finally {
      setIsSaving(false);
    }
  };

  // Depth effects
  const depth = total - 1 - index;
  const scale = 1 - (depth * 0.05);
  const blur = depth * 4;
  const opacity = 1 - (depth * 0.3);

  useEffect(() => {
    const fetchData = async () => {
      // Handle virtual/local records from Repeatable Groups
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
        
        // Fetch Module
        const prebuilt = MODULES.find(m => m.id === entry.moduleId);
        let modData = prebuilt;
        if (!modData) {
          const modRes = await fetch(`${DATA_API_URL}/modules/${entry.moduleId}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenant.id }
          });
          if (modRes.ok) modData = await modRes.json();
        }
        setModuleData(modData);

        // Fetch Record if recordId exists
        if (entry.recordId) {
          const recRes = await fetch(`${DATA_API_URL}/records/${entry.recordId}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenant.id }
          });
          if (recRes.ok) setRecord(await recRes.json());
        }
      } catch (err) {
        console.error("Failed to fetch modal data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tenant?.id, entry.moduleId, entry.recordId, entry.localData, entry.localSchema, session?.access_token]);

  useEffect(() => {
    if (moduleData?.tabs?.length > 0 && !activeTabId) {
      setActiveTabId(moduleData.tabs[0].id);
    }
  }, [moduleData, activeTabId]);

  return (
    <motion.div
      animate={{ 
        opacity, 
        scale, 
        y: 0,
        filter: `blur(${blur}px)`,
        pointerEvents: depth === 0 ? 'auto' : 'none'
      }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none"
    >
      <div className="w-full max-w-4xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-[40px] shadow-2xl overflow-hidden flex flex-col pointer-events-auto h-[80vh]">
        {/* Header */}
        <div className="p-8 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="w-full">
               {/* Main Content Area */}
               <div className={cn(
                 "w-full space-y-12",
                 (entry.moduleId === 'virtual' || !moduleData?.nestedCollections?.length) ? "w-full" : "lg:grid lg:grid-cols-12 lg:gap-12"
               )}>
                  <div className={cn(
                    "grid grid-cols-12 gap-x-4 gap-y-6 w-full",
                    (entry.moduleId !== 'virtual' && !!moduleData?.nestedCollections?.length) && "lg:col-span-8"
                  )}>
                    {moduleData?.layout ? (
                      (() => {
                        const visibleFields = compactLayout(
                          (moduleData.layout || []).filter((f: any) => isFieldVisible(f, record, { user }))
                        );

                        return visibleFields.map((field: any, idx: number) => (
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
                                />
                              ) : field.type === 'repeatableGroup' ? (
                                <RepeatableGroupBlock 
                                   field={field}
                                   value={record?.[field.id] || []}
                                   onChange={(newVal) => setRecord({ ...record, [field.id]: newVal })}
                                />
                              ) : (
                                <div className="space-y-1 w-full">
                                  <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 relative group/label">
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
                        ));
                      })()
                    ) : (
                      <p className="text-zinc-500 italic">No layout defined for this module.</p>
                    )}
                  </div>

                  {/* Right: Nested Collections & Context (Only if not virtual and has collections) */}
                  {entry.moduleId !== 'virtual' && !!moduleData?.nestedCollections?.length && (
                    <div className="lg:col-span-4 space-y-10">
                        {/* Record Context / Mirror Badges */}
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

                        {/* Recursive Collections */}
                        <div className="space-y-8">
                          {(moduleData?.nestedCollections || []).map((coll: any, idx: number) => (
                            <RecursiveCollectionBlock 
                                key={idx}
                                parentRecordId={entry.recordId!}
                                moduleId={coll.targetModuleId}
                                label={coll.label}
                            />
                          ))}
                        </div>
                    </div>
                  )}
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
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
  const { stack, popModal, clearStack, popToId } = useModalStack();

  if (stack.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={clearStack}
        className="absolute inset-0 bg-zinc-950/40 backdrop-blur-md"
      />
      
      <div className="relative w-full h-full max-w-6xl mx-auto flex items-center justify-center">
        <AnimatePresence mode="popLayout">
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
      </div>
    </div>
  );
};
