import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Layers, 
  Database, 
  Plus, 
  Trash2, 
  Check, 
  ArrowRight, 
  Settings2, 
  Table, 
  LayoutGrid, 
  ShieldAlert,
  Sliders,
  Columns
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

export interface RelationshipConfig {
  cardinality: '1:1' | '1:N' | 'N:N';
  targetModuleId: string;
  targetModuleName?: string;
  junctionTableName?: string;
  foreignKeyField?: string;
  cascadeBehavior: 'restrict' | 'cascade' | 'set_null';
  displayMode: 'table' | 'cards';
  visibleColumns: string[];
  columnWidths?: Record<string, number>;
  allowInlineCreate: boolean;
  allowInlineEdit: boolean;
  pageSize: number;
}

interface RelationshipConfigDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: RelationshipConfig) => void;
  initialConfig?: Partial<RelationshipConfig>;
  availableModules: any[];
  currentModuleId: string;
  fieldLabel?: string;
}

export const RelationshipConfigDrawer: React.FC<RelationshipConfigDrawerProps> = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  availableModules,
  currentModuleId,
  fieldLabel = 'Relationship'
}) => {
  const [cardinality, setCardinality] = useState<RelationshipConfig['cardinality']>(
    initialConfig?.cardinality || '1:N'
  );
  const [targetModuleId, setTargetModuleId] = useState<string>(
    initialConfig?.targetModuleId || ''
  );
  const [cascadeBehavior, setCascadeBehavior] = useState<RelationshipConfig['cascadeBehavior']>(
    initialConfig?.cascadeBehavior || 'restrict'
  );
  const [displayMode, setDisplayMode] = useState<'table' | 'cards'>(
    initialConfig?.displayMode || 'table'
  );
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    initialConfig?.visibleColumns || []
  );
  const [allowInlineCreate, setAllowInlineCreate] = useState<boolean>(
    initialConfig?.allowInlineCreate !== false
  );
  const [allowInlineEdit, setAllowInlineEdit] = useState<boolean>(
    initialConfig?.allowInlineEdit !== false
  );
  const [pageSize, setPageSize] = useState<number>(
    initialConfig?.pageSize || 10
  );

  // Eligible modules to link with
  const eligibleModules = useMemo(() => {
    return availableModules.filter(m => m.id !== currentModuleId && (m.status === 'ACTIVE' || m.enabled !== false));
  }, [availableModules, currentModuleId]);

  const targetModule = useMemo(() => {
    return availableModules.find(m => m.id === targetModuleId);
  }, [availableModules, targetModuleId]);

  // Target module field options
  const targetModuleFields = useMemo(() => {
    if (!targetModule?.layout) {
      return [
        { id: '_record_key', label: 'Record Key', type: 'text' },
        { id: 'name', label: 'Name / Title', type: 'text' },
        { id: 'status', label: 'Status', type: 'select' },
        { id: 'amount', label: 'Amount', type: 'currency' },
        { id: 'createdAt', label: 'Created Date', type: 'date' }
      ];
    }
    const extract = (items: any[]): any[] => {
      let res: any[] = [];
      items.forEach(item => {
        if (item.id && !['heading', 'divider', 'spacer', 'card', 'group'].includes(item.type)) {
          res.push(item);
        }
        if (item.fields && Array.isArray(item.fields)) {
          res = res.concat(extract(item.fields));
        }
      });
      return res;
    };
    return extract(targetModule.layout);
  }, [targetModule]);

  // Initialize visible columns if empty
  React.useEffect(() => {
    if (visibleColumns.length === 0 && targetModuleFields.length > 0) {
      setVisibleColumns(targetModuleFields.slice(0, 4).map(f => f.id));
    }
  }, [targetModuleFields, visibleColumns.length]);

  const toggleColumn = (colId: string) => {
    setVisibleColumns(prev => 
      prev.includes(colId) ? prev.filter(c => c !== colId) : [...prev, colId]
    );
  };

  const handleSave = () => {
    if (!targetModuleId) {
      toast.error('Please select a target module to establish relationship');
      return;
    }

    const config: RelationshipConfig = {
      cardinality,
      targetModuleId,
      targetModuleName: targetModule?.name || 'Related Module',
      cascadeBehavior,
      displayMode,
      visibleColumns: visibleColumns.length > 0 ? visibleColumns : targetModuleFields.slice(0, 3).map(f => f.id),
      allowInlineCreate,
      allowInlineEdit,
      pageSize
    };

    onSave(config);
    toast.success('Relationship configured successfully');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-zinc-950/70 backdrop-blur-md transition-opacity"
        />

        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="relative w-full max-w-xl bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl h-full flex flex-col z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                <Layers size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">
                  Configure Relationship
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Connect <strong>{fieldLabel}</strong> to other tenant data models.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
            {/* Cardinality Selection */}
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">
                1. Relationship Cardinality
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: '1:N', label: 'One-to-Many', desc: 'Parent has multiple child records (e.g. Project -> Tasks)' },
                  { id: 'N:N', label: 'Many-to-Many', desc: 'Junction link between records (e.g. Products <-> Tags)' },
                  { id: '1:1', label: 'One-to-One', desc: 'Single exclusive linked record (e.g. User -> Profile)' }
                ].map((card) => {
                  const isSelected = cardinality === card.id;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setCardinality(card.id as any)}
                      className={cn(
                        "p-4 rounded-2xl border text-left flex flex-col justify-between transition-all",
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20"
                          : "bg-zinc-50/50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      <div className="font-black text-xs">{card.label}</div>
                      <div className={cn(
                        "text-[9px] mt-1.5 leading-relaxed",
                        isSelected ? "text-white/80" : "text-zinc-400"
                      )}>
                        {card.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Module Selection */}
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">
                2. Target Module
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar p-1">
                {eligibleModules.map((mod) => {
                  const isSelected = targetModuleId === mod.id;
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => setTargetModuleId(mod.id)}
                      className={cn(
                        "p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all",
                        isSelected
                          ? "bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm ring-2 ring-indigo-500/20"
                          : "bg-zinc-50/50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                          isSelected ? "bg-indigo-600 text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                        )}>
                          <Database size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs truncate">{mod.name}</div>
                          <div className="text-[9px] text-zinc-400 truncate">{mod.category || 'Custom Module'}</div>
                        </div>
                      </div>
                      {isSelected && <Check size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subgrid Columns */}
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                <span>3. Subgrid Visible Columns in Parent View</span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                  {visibleColumns.length} Selected
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/40">
                {targetModuleFields.map((f) => {
                  const isChecked = visibleColumns.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleColumn(f.id)}
                      className={cn(
                        "p-2.5 rounded-xl border text-left flex items-center justify-between transition-all text-xs",
                        isChecked
                          ? "bg-white dark:bg-zinc-800 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm"
                          : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      )}
                    >
                      <span className="font-bold truncate">{f.label || f.name}</span>
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center shrink-0 ml-1.5",
                        isChecked ? "bg-indigo-600 border-indigo-600 text-white" : "border-zinc-300 dark:border-zinc-700"
                      )}>
                        {isChecked && <Check size={10} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cascade & Deletion Policy */}
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">
                4. Foreign Key & Deletion Behavior
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'restrict', label: 'Restrict', desc: 'Prevent deleting parent if related records exist' },
                  { id: 'cascade', label: 'Cascade Delete', desc: 'Automatically delete related records with parent' },
                  { id: 'set_null', label: 'Set Null', desc: 'Unlink child records, keeping them orphaned' }
                ].map((rule) => {
                  const isSelected = cascadeBehavior === rule.id;
                  return (
                    <button
                      key={rule.id}
                      type="button"
                      onClick={() => setCascadeBehavior(rule.id as any)}
                      className={cn(
                        "p-3 rounded-2xl border text-left transition-all flex flex-col justify-between",
                        isSelected
                          ? "bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm"
                          : "bg-zinc-50/50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                      )}
                    >
                      <div className="text-xs font-bold">{rule.label}</div>
                      <div className="text-[9px] text-zinc-400 mt-1 line-clamp-2">{rule.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subgrid Interactive Controls */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                5. Inline Actions & Display Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowInlineCreate}
                    onChange={(e) => setAllowInlineCreate(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Inline Record Creation</div>
                    <div className="text-[9px] text-zinc-400">Show "+ Add Entry" in parent view</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowInlineEdit}
                    onChange={(e) => setAllowInlineEdit(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Inline Cell Editing</div>
                    <div className="text-[9px] text-zinc-400">Allow editing subgrid cells directly</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-white dark:bg-zinc-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
            >
              <Layers size={15} />
              <span>Save Relationship</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
