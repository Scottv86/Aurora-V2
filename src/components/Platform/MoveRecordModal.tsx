import React, { useState, useEffect, useMemo } from 'react';
import { 
  GitFork, 
  ArrowRight, 
  Sparkles, 
  Check, 
  X, 
  Search, 
  Layers, 
  ArrowRightLeft, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  Trash2,
  RefreshCw,
  FolderInput
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { DATA_API_URL } from '../../config';
import { cn, flattenFields } from '../../lib/utils';
import { DynamicIcon } from '../UI/DynamicIcon';

export interface MoveRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceRecords: any[];
  sourceModuleId: string;
  sourceModuleName?: string;
  sourceFields?: any[];
  onSuccess?: (result: { targetModuleId: string; targetModuleName: string; count: number }) => void;
}

// Synonyms map for smart matching
const SEMANTIC_SYNONYMS: Record<string, string[]> = {
  name: ['title', 'subject', 'label', 'summary', 'record_name', 'application_name', 'item_name', 'entity_name'],
  title: ['name', 'subject', 'label', 'summary', 'headline'],
  description: ['notes', 'details', 'comments', 'remarks', 'content', 'body', 'memo'],
  notes: ['description', 'details', 'comments', 'remarks', 'memo'],
  value: ['amount', 'cost', 'price', 'total', 'fee', 'rate', 'budget'],
  amount: ['value', 'cost', 'price', 'total', 'fee', 'rate'],
  type: ['category', 'kind', 'classification', 'application_type', 'license_type', 'record_type'],
  category: ['type', 'kind', 'classification', 'group'],
  email: ['work_email', 'contact_email', 'personal_email', 'email_address'],
  phone: ['mobile', 'telephone', 'contact_number', 'phone_number'],
  status: ['stage', 'state', 'workflow_state', 'condition'],
  assignee: ['assigneeid', 'assigned_to', 'owner', 'member_id', 'responsible'],
  assigneeId: ['assignee', 'assigned_to', 'owner', 'member_id'],
  date: ['created_date', 'effective_date', 'start_date', 'due_date', 'target_date']
};

const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

export const MoveRecordModal: React.FC<MoveRecordModalProps> = ({
  isOpen,
  onClose,
  sourceRecords,
  sourceModuleId,
  sourceModuleName: explicitSourceModuleName,
  sourceFields: explicitSourceFields,
  onSuccess
}) => {
  const { modules = [], tenant } = usePlatform();
  const { session } = useAuth();

  const [selectedTargetModuleId, setSelectedTargetModuleId] = useState<string>('');
  const [targetSearchQuery, setTargetSearchQuery] = useState('');
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [autoMatchedKeys, setAutoMatchedKeys] = useState<Set<string>>(new Set());
  const [archiveSource, setArchiveSource] = useState<boolean>(true);
  const [preserveAssignee, setPreserveAssignee] = useState<boolean>(true);
  const [preserveStatus, setPreserveStatus] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const sourceModule = useMemo(() => {
    return modules.find(m => m.id === sourceModuleId);
  }, [modules, sourceModuleId]);

  const sourceModuleName = explicitSourceModuleName || sourceModule?.name || 'Source Module';

  // Available target modules (excluding the current source module and internal system services)
  const availableTargetModules = useMemo(() => {
    return (modules || []).filter(m => {
      if (!m || m.id === sourceModuleId) return false;
      if (m.type === 'PAGE' || m.type === 'SYSTEM') return false;
      if (m.isGlobal || m.isSystem) return false;
      if (m.isIntakeTriage || m.config?.isIntakeTriage) return false;
      if (
        m.name === 'Work Distribution' || 
        m.name === 'Automations' || 
        m.category === 'Intake & Requests' || 
        m.category === 'System' || 
        m.category === 'Platform'
      ) return false;
      return true;
    });
  }, [modules, sourceModuleId]);

  const filteredTargetModules = useMemo(() => {
    if (!targetSearchQuery.trim()) return availableTargetModules;
    const q = targetSearchQuery.toLowerCase();
    return availableTargetModules.filter(m => 
      m.name?.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q)
    );
  }, [availableTargetModules, targetSearchQuery]);

  const selectedTargetModule = useMemo(() => {
    return availableTargetModules.find(m => m.id === selectedTargetModuleId);
  }, [availableTargetModules, selectedTargetModuleId]);

  // Extract source fields
  const sourceFields = useMemo(() => {
    if (explicitSourceFields && explicitSourceFields.length > 0) {
      return explicitSourceFields;
    }
    const layout = sourceModule?.config?.layout || [];
    const fields = flattenFields(layout);
    
    // Add default system fields
    const systemFields = [
      { id: '_record_key', label: 'Record Key', type: 'text' },
      { id: 'status', label: 'Status', type: 'select' },
      { id: 'assigneeId', label: 'Assignee', type: 'user' }
    ];

    const map = new Map();
    [...systemFields, ...fields].forEach(f => {
      if (f.id && !map.has(f.id)) map.set(f.id, f);
    });
    return Array.from(map.values());
  }, [sourceModule, explicitSourceFields]);

  // Extract target fields
  const targetFields = useMemo(() => {
    if (!selectedTargetModule) return [];
    const layout = selectedTargetModule?.config?.layout || [];
    const fields = flattenFields(layout);

    return fields.filter(f => f.id && !f.id.startsWith('visual-') && f.type !== 'section');
  }, [selectedTargetModule]);

  // Smart Auto-Mapping Engine
  const runSmartAutoMapping = (tFields: any[], sFields: any[]) => {
    const mapping: Record<string, string> = {};
    const autoMatched = new Set<string>();

    tFields.forEach(targetField => {
      const targetIdNorm = normalize(targetField.id);
      const targetLabelNorm = normalize(targetField.label || targetField.name || targetField.id);

      // 1. Exact ID match
      const exactIdMatch = sFields.find(s => normalize(s.id) === targetIdNorm);
      if (exactIdMatch) {
        mapping[targetField.id] = exactIdMatch.id;
        autoMatched.add(targetField.id);
        return;
      }

      // 2. Exact Label match
      const exactLabelMatch = sFields.find(s => normalize(s.label || s.name || s.id) === targetLabelNorm);
      if (exactLabelMatch) {
        mapping[targetField.id] = exactLabelMatch.id;
        autoMatched.add(targetField.id);
        return;
      }

      // 3. Semantic Synonyms match
      for (const [key, synonyms] of Object.entries(SEMANTIC_SYNONYMS)) {
        const isTargetMatch = targetIdNorm.includes(key) || targetLabelNorm.includes(key) || synonyms.some(syn => targetIdNorm.includes(syn) || targetLabelNorm.includes(syn));
        if (isTargetMatch) {
          const synonymMatch = sFields.find(s => {
            const sIdNorm = normalize(s.id);
            const sLabelNorm = normalize(s.label || s.name || s.id);
            return sIdNorm.includes(key) || sLabelNorm.includes(key) || synonyms.some(syn => sIdNorm.includes(syn) || sLabelNorm.includes(syn));
          });
          if (synonymMatch) {
            mapping[targetField.id] = synonymMatch.id;
            autoMatched.add(targetField.id);
            return;
          }
        }
      }

      // 4. Same Type fallback if single candidate exists
      const sameTypeCandidates = sFields.filter(s => s.type === targetField.type && !s.id.startsWith('_'));
      if (sameTypeCandidates.length === 1 && !targetField.required) {
        mapping[targetField.id] = sameTypeCandidates[0].id;
        autoMatched.add(targetField.id);
      }
    });

    setFieldMapping(mapping);
    setAutoMatchedKeys(autoMatched);
  };

  // Run auto mapping when target module changes
  useEffect(() => {
    if (selectedTargetModule && targetFields.length > 0 && sourceFields.length > 0) {
      runSmartAutoMapping(targetFields, sourceFields);
    } else {
      setFieldMapping({});
      setAutoMatchedKeys(new Set());
    }
  }, [selectedTargetModuleId, targetFields, sourceFields]);

  const handleFieldMappingChange = (targetFieldId: string, sourceFieldId: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [targetFieldId]: sourceFieldId
    }));
    setAutoMatchedKeys(prev => {
      const next = new Set(prev);
      next.delete(targetFieldId);
      return next;
    });
  };

  const handleExecuteMove = async () => {
    if (!selectedTargetModuleId) {
      toast.error('Please select a target module');
      return;
    }
    if (!sourceRecords || sourceRecords.length === 0) {
      toast.error('No records selected to move');
      return;
    }

    // Validate required target fields
    const missingRequired = targetFields.filter(f => f.required && !fieldMapping[f.id]);
    if (missingRequired.length > 0) {
      toast.error(`Please map required field: ${missingRequired[0].label || missingRequired[0].id}`);
      return;
    }

    const count = sourceRecords.length;
    const targetName = selectedTargetModule?.name || 'Target Module';
    const toastId = toast.loading(`Moving ${count} record${count > 1 ? 's' : ''} to ${targetName}...`);

    setIsSubmitting(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${DATA_API_URL}/records/move-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        },
        body: JSON.stringify({
          sourceRecordIds: sourceRecords.map(r => r.id || r),
          sourceModuleId,
          targetModuleId: selectedTargetModuleId,
          fieldMapping,
          archiveSource,
          preserveAssignee,
          preserveStatus
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to move records');
      }

      const result = await res.json();

      toast.success(
        `Successfully moved ${result.movedCount || count} record${count > 1 ? 's' : ''} to ${targetName}`,
        { id: toastId }
      );

      onSuccess?.({
        targetModuleId: selectedTargetModuleId,
        targetModuleName: targetName,
        count: result.movedCount || count
      });

      onClose();
    } catch (err: any) {
      console.error('Move records error:', err);
      toast.error(err.message || 'Failed to move records', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <FolderInput size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  Move Record{sourceRecords.length > 1 ? 's' : ''} to Another Module
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    {sourceRecords.length} selected
                  </span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Migrate record data from <span className="font-semibold text-zinc-700 dark:text-zinc-300">{sourceModuleName}</span> with smart field mapping
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {/* Step 1: Select Target Module */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <span>1. Select Destination Module</span>
              </label>

              {availableTargetModules.length === 0 ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>No other modules found in this workspace to move records to.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {availableTargetModules.map(mod => {
                    const isSelected = selectedTargetModuleId === mod.id;
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => setSelectedTargetModuleId(mod.id)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-2xl border text-left transition-all cursor-pointer",
                          isSelected 
                            ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-white shadow-sm ring-2 ring-indigo-500/20" 
                            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/50 text-zinc-800 dark:text-zinc-200"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                          isSelected ? "bg-indigo-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                        )}>
                          <DynamicIcon name={mod.icon || 'Folder'} size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold truncate">{mod.name}</div>
                          <div className="text-[10px] text-zinc-400 truncate">
                            {mod.config?.layout ? `${flattenFields(mod.config.layout).length} fields` : 'Module'}
                          </div>
                        </div>
                        {isSelected && <Check size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 2: Field Mapping Section */}
            {selectedTargetModule && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      2. Smart Field Mapping
                    </label>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <Sparkles size={10} />
                      {autoMatchedKeys.size} Auto-Matched
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => runSmartAutoMapping(targetFields, sourceFields)}
                    className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    <span>Re-run Smart Auto-Map</span>
                  </button>
                </div>

                {targetFields.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic py-2">No configurable custom fields found in the destination module.</p>
                ) : (
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/80">
                    <div className="grid grid-cols-12 bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      <div className="col-span-5">Target Field ({selectedTargetModule.name})</div>
                      <div className="col-span-2 text-center">Transfer</div>
                      <div className="col-span-5">Source Field ({sourceModuleName})</div>
                    </div>

                    <div className="max-h-64 overflow-y-auto custom-scrollbar divide-y divide-zinc-100 dark:divide-zinc-800/50">
                      {targetFields.map(tField => {
                        const isAutoMatched = autoMatchedKeys.has(tField.id);
                        const mappedSourceId = fieldMapping[tField.id] || '';

                        return (
                          <div key={tField.id} className="grid grid-cols-12 items-center px-4 py-2.5 gap-2 hover:bg-zinc-50/50 dark:hover:bg-white/[0.01]">
                            {/* Target Field Info */}
                            <div className="col-span-5 min-w-0 flex items-center gap-2">
                              <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                {tField.label || tField.name || tField.id}
                              </span>
                              {tField.required && (
                                <span className="text-rose-500 text-xs font-bold" title="Required field">*</span>
                              )}
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-500 uppercase">
                                {tField.type || 'text'}
                              </span>
                            </div>

                            {/* Center Arrow / Smart indicator */}
                            <div className="col-span-2 flex items-center justify-center">
                              {isAutoMatched ? (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <Sparkles size={9} />
                                  <span>Auto</span>
                                </span>
                              ) : (
                                <ArrowRight size={14} className="text-zinc-400" />
                              )}
                            </div>

                            {/* Source Field Selector */}
                            <div className="col-span-5">
                              <select
                                value={mappedSourceId}
                                onChange={(e) => handleFieldMappingChange(tField.id, e.target.value)}
                                className={cn(
                                  "w-full text-xs rounded-xl px-2.5 py-1.5 border bg-white dark:bg-zinc-950 focus:outline-none transition-colors",
                                  mappedSourceId 
                                    ? "border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100" 
                                    : "border-zinc-200 dark:border-zinc-800 text-zinc-400 italic"
                                )}
                              >
                                <option value="">-- Don't map (Leave blank) --</option>
                                {sourceFields.map(sField => (
                                  <option key={sField.id} value={sField.id}>
                                    {sField.label || sField.name || sField.id} ({sField.type || 'field'})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Migration Options */}
            {selectedTargetModule && (
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-3 animate-in fade-in duration-200">
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Migration Options
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={archiveSource}
                      onChange={(e) => setArchiveSource(e.target.checked)}
                      className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Archive / Delete source record(s) from <span className="font-semibold">{sourceModuleName}</span> after move</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={preserveStatus}
                      onChange={(e) => setPreserveStatus(e.target.checked)}
                      className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Preserve current record status if valid in destination workflow</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={preserveAssignee}
                      onChange={(e) => setPreserveAssignee(e.target.checked)}
                      className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Preserve assigned team member</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExecuteMove}
              disabled={!selectedTargetModuleId || isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Moving...</span>
                </>
              ) : (
                <>
                  <FolderInput size={14} />
                  <span>
                    Move {sourceRecords.length > 1 ? `${sourceRecords.length} Records` : 'Record'}
                  </span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
