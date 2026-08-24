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
  FolderInput,
  GripVertical,
  Link2,
  Unlink,
  CheckCircle2,
  Filter,
  MousePointerClick,
  Info,
  ChevronDown
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

const getTypeBadgeColor = (type?: string) => {
  const t = (type || 'text').toLowerCase();
  if (['text', 'textarea', 'rich_text', 'richtext'].includes(t)) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
  if (['number', 'currency', 'percentage', 'decimal'].includes(t)) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  if (['date', 'datetime', 'time'].includes(t)) return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
  if (['select', 'multiselect', 'radio', 'dropdown'].includes(t)) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
  if (['user', 'member', 'assignee'].includes(t)) return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
  if (['boolean', 'checkbox', 'switch'].includes(t)) return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
  if (['file', 'image', 'attachment', 'media'].includes(t)) return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
  return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700';
};

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

  // DnD & Quick-Connect state
  const [draggingSourceId, setDraggingSourceId] = useState<string | null>(null);
  const [activeDropTargetId, setActiveDropTargetId] = useState<string | null>(null);
  const [selectedSourceForConnect, setSelectedSourceForConnect] = useState<string | null>(null);

  // Filter & Search state for mapping canvas
  const [targetFilterTab, setTargetFilterTab] = useState<'all' | 'unmapped' | 'mapped' | 'required'>('all');
  const [targetFieldSearch, setTargetFieldSearch] = useState('');
  const [sourceFieldSearch, setSourceFieldSearch] = useState('');
  const [sourceFilterTab, setSourceFilterTab] = useState<'all' | 'unmapped' | 'mapped'>('all');

  const sourceModule = useMemo(() => {
    return modules.find(m => m.id === sourceModuleId);
  }, [modules, sourceModuleId]);

  const sourceModuleName = explicitSourceModuleName || sourceModule?.name || 'Source Module';

  // Available target modules (excluding the current source module, static pages, and intake triage inbox)
  const availableTargetModules = useMemo(() => {
    return (modules || []).filter(m => {
      if (!m || m.id === sourceModuleId) return false;
      if (m.type === 'PAGE' || m.type === 'SYSTEM') return false;
      if (m.isGlobal && !m.layout && !m.config?.layout && !m.fields) return false;
      if (m.isIntakeTriage || m.config?.isIntakeTriage) return false;
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

// Helper to robustly extract all custom data fields from any module configuration structure
const extractModuleFields = (mod?: any): any[] => {
  if (!mod) return [];
  
  let raw: any[] = [];
  
  if (Array.isArray(mod.layout) && mod.layout.length > 0) {
    raw = flattenFields(mod.layout);
  } else if (Array.isArray(mod.config?.layout) && mod.config.layout.length > 0) {
    raw = flattenFields(mod.config.layout);
  } else if (Array.isArray(mod.fields) && mod.fields.length > 0) {
    raw = flattenFields(mod.fields);
  } else if (Array.isArray(mod.config?.fields) && mod.config.fields.length > 0) {
    raw = flattenFields(mod.config.fields);
  } else if (Array.isArray(mod.tabs) && mod.tabs.length > 0) {
    raw = flattenFields(mod.tabs.flatMap((t: any) => t.fields || []));
  } else if (Array.isArray(mod.config?.tabs) && mod.config.tabs.length > 0) {
    raw = flattenFields(mod.config.tabs.flatMap((t: any) => t.fields || []));
  } else if (Array.isArray(mod.schema?.fields) && mod.schema.fields.length > 0) {
    raw = flattenFields(mod.schema.fields);
  } else if (Array.isArray(mod.config?.schema?.fields) && mod.config.schema.fields.length > 0) {
    raw = flattenFields(mod.config.schema.fields);
  }

  // Filter out non-data visual elements and ensure valid id
  const map = new Map<string, any>();
  raw.forEach(f => {
    if (!f || !f.id) return;
    const id = String(f.id);
    if (id.startsWith('visual-') || id.startsWith('section-') || f.type === 'section' || f.type === 'divider' || f.type === 'heading' || f.type === 'spacer') {
      return;
    }
    if (!map.has(id)) {
      map.set(id, f);
    }
  });

  return Array.from(map.values());
};

  const selectedTargetModule = useMemo(() => {
    return availableTargetModules.find(m => m.id === selectedTargetModuleId);
  }, [availableTargetModules, selectedTargetModuleId]);

  // Extract source fields
  const sourceFields = useMemo(() => {
    if (explicitSourceFields && explicitSourceFields.length > 0) {
      return explicitSourceFields;
    }
    const fields = extractModuleFields(sourceModule);
    
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

  // Map of source fields by ID for instant lookups
  const sourceFieldsMap = useMemo(() => {
    const map = new Map<string, any>();
    sourceFields.forEach(f => {
      if (f.id) map.set(f.id, f);
    });
    return map;
  }, [sourceFields]);

  // Extract target fields
  const targetFields = useMemo(() => {
    if (!selectedTargetModule) return [];
    return extractModuleFields(selectedTargetModule);
  }, [selectedTargetModule]);

  // Set of mapped source field IDs
  const mappedSourceFieldIds = useMemo(() => {
    const set = new Set<string>();
    Object.values(fieldMapping).forEach(sId => {
      if (sId) set.add(sId);
    });
    return set;
  }, [fieldMapping]);

  // Filtered target fields based on search and tab
  const filteredTargetFields = useMemo(() => {
    return targetFields.filter(tf => {
      const isMapped = !!fieldMapping[tf.id];
      if (targetFilterTab === 'unmapped' && isMapped) return false;
      if (targetFilterTab === 'mapped' && !isMapped) return false;
      if (targetFilterTab === 'required' && !tf.required) return false;

      if (targetFieldSearch.trim()) {
        const q = targetFieldSearch.toLowerCase();
        const labelMatch = (tf.label || tf.name || '').toLowerCase().includes(q);
        const idMatch = tf.id.toLowerCase().includes(q);
        const typeMatch = (tf.type || '').toLowerCase().includes(q);
        return labelMatch || idMatch || typeMatch;
      }
      return true;
    });
  }, [targetFields, fieldMapping, targetFilterTab, targetFieldSearch]);

  // Filtered source fields based on search and tab
  const filteredSourceFields = useMemo(() => {
    return sourceFields.filter(sf => {
      const isMapped = mappedSourceFieldIds.has(sf.id);
      if (sourceFilterTab === 'unmapped' && isMapped) return false;
      if (sourceFilterTab === 'mapped' && !isMapped) return false;

      if (sourceFieldSearch.trim()) {
        const q = sourceFieldSearch.toLowerCase();
        const labelMatch = (sf.label || sf.name || '').toLowerCase().includes(q);
        const idMatch = sf.id.toLowerCase().includes(q);
        const typeMatch = (sf.type || '').toLowerCase().includes(q);
        return labelMatch || idMatch || typeMatch;
      }
      return true;
    });
  }, [sourceFields, mappedSourceFieldIds, sourceFilterTab, sourceFieldSearch]);

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
    setFieldMapping(prev => {
      const next = { ...prev };
      if (!sourceFieldId) {
        delete next[targetFieldId];
      } else {
        next[targetFieldId] = sourceFieldId;
      }
      return next;
    });
    setAutoMatchedKeys(prev => {
      const next = new Set(prev);
      next.delete(targetFieldId);
      return next;
    });
  };

  const handleUnmap = (targetFieldId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    handleFieldMappingChange(targetFieldId, '');
  };

  const handleClearAll = () => {
    setFieldMapping({});
    setAutoMatchedKeys(new Set());
    setSelectedSourceForConnect(null);
    toast.info('Cleared all field mappings');
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, sourceFieldId: string) => {
    e.dataTransfer.setData('text/plain', sourceFieldId);
    e.dataTransfer.effectAllowed = 'copyMove';
    setDraggingSourceId(sourceFieldId);
  };

  const handleDragEnd = () => {
    setDraggingSourceId(null);
    setActiveDropTargetId(null);
  };

  const handleDragOver = (e: React.DragEvent, targetFieldId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (activeDropTargetId !== targetFieldId) {
      setActiveDropTargetId(targetFieldId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, targetFieldId: string) => {
    // Only clear if actually leaving target element
    if (activeDropTargetId === targetFieldId) {
      setActiveDropTargetId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetFieldId: string) => {
    e.preventDefault();
    const sourceFieldId = e.dataTransfer.getData('text/plain') || draggingSourceId;
    if (sourceFieldId) {
      handleFieldMappingChange(targetFieldId, sourceFieldId);
      const sourceField = sourceFieldsMap.get(sourceFieldId);
      const targetField = targetFields.find(f => f.id === targetFieldId);
      toast.success(`Mapped "${sourceField?.label || sourceFieldId}" to "${targetField?.label || targetFieldId}"`);
    }
    setActiveDropTargetId(null);
    setDraggingSourceId(null);
    setSelectedSourceForConnect(null);
  };

  // Click-to-Connect Handler
  const handleTargetSlotClick = (targetFieldId: string) => {
    if (selectedSourceForConnect) {
      handleFieldMappingChange(targetFieldId, selectedSourceForConnect);
      const sourceField = sourceFieldsMap.get(selectedSourceForConnect);
      const targetField = targetFields.find(f => f.id === targetFieldId);
      toast.success(`Linked "${sourceField?.label || selectedSourceForConnect}" to "${targetField?.label || targetFieldId}"`);
      setSelectedSourceForConnect(null);
    }
  };

  const handleSourceChipClick = (sourceFieldId: string) => {
    if (selectedSourceForConnect === sourceFieldId) {
      setSelectedSourceForConnect(null);
    } else {
      setSelectedSourceForConnect(sourceFieldId);
    }
  };

  // Mapping Stats
  const totalTargetFields = targetFields.length;
  const mappedCount = Object.keys(fieldMapping).filter(k => !!fieldMapping[k]).length;
  const requiredTargetFields = targetFields.filter(f => f.required);
  const requiredMappedCount = requiredTargetFields.filter(f => !!fieldMapping[f.id]).length;
  const isAllRequiredMapped = requiredTargetFields.length === 0 || requiredMappedCount === requiredTargetFields.length;

  const handleExecuteMove = async () => {
    if (!selectedTargetModuleId) {
      toast.error('Please select a destination module');
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
          className="relative w-full max-w-5xl max-h-[92vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10"
        >
          {/* Header */}
          <div className="px-6 py-4 sm:py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
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
                  Migrate record data from <span className="font-semibold text-zinc-700 dark:text-zinc-300">{sourceModuleName}</span> with drag-and-drop & smart field mapping
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
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
            {/* Step 1: Select Target Module */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black">1</span>
                  <span>Select Destination Module</span>
                </label>

                {availableTargetModules.length > 6 && (
                  <div className="relative w-48">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      value={targetSearchQuery}
                      onChange={(e) => setTargetSearchQuery(e.target.value)}
                      placeholder="Search destination..."
                      className="w-full pl-7 pr-2.5 py-1 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                )}
              </div>

              {availableTargetModules.length === 0 ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>No other modules found in this workspace to move records to.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-44 overflow-y-auto custom-scrollbar p-1">
                  {filteredTargetModules.map(mod => {
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
                            {(() => {
                              const count = extractModuleFields(mod).length;
                              return count > 0 ? `${count} field${count > 1 ? 's' : ''}` : 'Module';
                            })()}
                          </div>
                        </div>
                        {isSelected && <Check size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 2: Interactive DnD & Field Mapping Canvas */}
            {selectedTargetModule && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {/* Section Header & Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black">2</span>
                      <span>Field Mapping Canvas</span>
                    </label>

                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <Sparkles size={10} />
                        {autoMatchedKeys.size} Auto-Matched
                      </span>

                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-semibold border flex items-center gap-1",
                        isAllRequiredMapped 
                          ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      )}>
                        {requiredTargetFields.length > 0 ? (
                          <>
                            {isAllRequiredMapped ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                            {requiredMappedCount}/{requiredTargetFields.length} Required Mapped
                          </>
                        ) : (
                          <span>{mappedCount}/{totalTargetFields} Mapped</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Buttons */}
                  <div className="flex items-center gap-2">
                    {mappedCount > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                        title="Clear all field mappings"
                      >
                        <Unlink size={12} />
                        <span>Clear All</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        runSmartAutoMapping(targetFields, sourceFields);
                        toast.success('Smart auto-mapping re-executed');
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <RefreshCw size={12} />
                      <span>Re-run Auto-Map</span>
                    </button>
                  </div>
                </div>

                {/* Helpful Instruction Tip */}
                <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs">
                  <div className="flex items-center gap-2">
                    <MousePointerClick size={14} className="shrink-0 text-indigo-500" />
                    <span>
                      <strong>Quick Map:</strong> Drag source fields from the left palette and drop onto any destination field on the right, or click a source field and then click a destination slot.
                    </span>
                  </div>
                  {selectedSourceForConnect && (
                    <button
                      type="button"
                      onClick={() => setSelectedSourceForConnect(null)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-200/60 dark:bg-indigo-800/60 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-300 dark:hover:bg-indigo-700 flex items-center gap-1"
                    >
                      <span>Cancel selection</span>
                      <X size={10} />
                    </button>
                  )}
                </div>

                {/* Dual Column Layout: Source Fields Palette (Left) & Destination Drop Zones (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  
                  {/* Left Column: Draggable Source Fields Palette (5 cols on lg) */}
                  <div className="lg:col-span-5 flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900/60 shadow-sm">
                    {/* Palette Header & Controls */}
                    <div className="p-3 bg-zinc-50/80 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
                          <Layers size={13} className="text-indigo-500" />
                          <span>Source Fields</span>
                          <span className="text-[10px] text-zinc-400 font-normal">({sourceModuleName})</span>
                        </span>

                        {/* Filter Tabs */}
                        <div className="flex items-center gap-1 bg-zinc-200/60 dark:bg-zinc-800/80 p-0.5 rounded-lg text-[10px] font-semibold">
                          <button
                            type="button"
                            onClick={() => setSourceFilterTab('all')}
                            className={cn(
                              "px-2 py-0.5 rounded-md transition-all",
                              sourceFilterTab === 'all' 
                                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs" 
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                            )}
                          >
                            All ({sourceFields.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setSourceFilterTab('unmapped')}
                            className={cn(
                              "px-2 py-0.5 rounded-md transition-all",
                              sourceFilterTab === 'unmapped' 
                                ? "bg-white dark:bg-zinc-700 text-amber-600 dark:text-amber-400 shadow-xs" 
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                            )}
                          >
                            Unmapped ({sourceFields.length - mappedSourceFieldIds.size})
                          </button>
                          <button
                            type="button"
                            onClick={() => setSourceFilterTab('mapped')}
                            className={cn(
                              "px-2 py-0.5 rounded-md transition-all",
                              sourceFilterTab === 'mapped' 
                                ? "bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-xs" 
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                            )}
                          >
                            Mapped ({mappedSourceFieldIds.size})
                          </button>
                        </div>
                      </div>

                      {/* Search Source Fields */}
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          value={sourceFieldSearch}
                          onChange={(e) => setSourceFieldSearch(e.target.value)}
                          placeholder="Filter source fields..."
                          className="w-full pl-7 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                        />
                        {sourceFieldSearch && (
                          <button
                            type="button"
                            onClick={() => setSourceFieldSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Draggable Cards List */}
                    <div className="max-h-80 overflow-y-auto custom-scrollbar p-2.5 space-y-2">
                      {filteredSourceFields.length === 0 ? (
                        <div className="p-8 text-center text-xs text-zinc-400">
                          No source fields match your search.
                        </div>
                      ) : (
                        filteredSourceFields.map(sField => {
                          const isMapped = mappedSourceFieldIds.has(sField.id);
                          const isSelectedForConnect = selectedSourceForConnect === sField.id;
                          const isBeingDragged = draggingSourceId === sField.id;

                          // Find which target fields this source field is mapped to
                          const mappedTargets = Object.entries(fieldMapping)
                            .filter(([_, sId]) => sId === sField.id)
                            .map(([tId]) => targetFields.find(tf => tf.id === tId)?.label || tId);

                          return (
                            <div
                              key={sField.id}
                              draggable={true}
                              onDragStart={(e) => handleDragStart(e, sField.id)}
                              onDragEnd={handleDragEnd}
                              onClick={() => handleSourceChipClick(sField.id)}
                              className={cn(
                                "p-2.5 rounded-xl border transition-all select-none cursor-grab active:cursor-grabbing relative",
                                isBeingDragged
                                  ? "opacity-40 border-indigo-400 scale-95"
                                  : isSelectedForConnect
                                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 ring-2 ring-indigo-500 shadow-md"
                                    : isMapped
                                      ? "border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700"
                                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-400 hover:shadow-xs"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                                  <GripVertical size={14} />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                      {sField.label || sField.name || sField.id}
                                    </span>
                                    <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-mono border font-semibold", getTypeBadgeColor(sField.type))}>
                                      {sField.type || 'text'}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-0.5">
                                    <span className="font-mono truncate">{sField.id}</span>
                                    {isMapped && (
                                      <span className="text-emerald-600 dark:text-emerald-400 font-medium truncate ml-1">
                                        → {mappedTargets.join(', ')}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="shrink-0">
                                  {isSelectedForConnect ? (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-600 text-white animate-pulse">
                                      Connecting
                                    </span>
                                  ) : isMapped ? (
                                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px]">
                                      <Check size={11} />
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-zinc-400 font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                                      Drag / Click
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right Column: Destination Fields Drop Zones (7 cols on lg) */}
                  <div className="lg:col-span-7 flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900/60 shadow-sm">
                    {/* Destination Fields Header & Filter Bar */}
                    <div className="p-3 bg-zinc-50/80 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
                          <span>Destination Fields</span>
                          <span className="text-[10px] text-zinc-400 font-normal">({selectedTargetModule.name})</span>
                        </span>

                        {/* Filter Tabs */}
                        <div className="flex items-center gap-1 bg-zinc-200/60 dark:bg-zinc-800/80 p-0.5 rounded-lg text-[10px] font-semibold">
                          <button
                            type="button"
                            onClick={() => setTargetFilterTab('all')}
                            className={cn(
                              "px-2 py-0.5 rounded-md transition-all",
                              targetFilterTab === 'all' 
                                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs" 
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                            )}
                          >
                            All ({targetFields.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setTargetFilterTab('unmapped')}
                            className={cn(
                              "px-2 py-0.5 rounded-md transition-all",
                              targetFilterTab === 'unmapped' 
                                ? "bg-white dark:bg-zinc-700 text-amber-600 dark:text-amber-400 shadow-xs" 
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                            )}
                          >
                            Unmapped ({targetFields.length - mappedCount})
                          </button>
                          <button
                            type="button"
                            onClick={() => setTargetFilterTab('mapped')}
                            className={cn(
                              "px-2 py-0.5 rounded-md transition-all",
                              targetFilterTab === 'mapped' 
                                ? "bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-xs" 
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                            )}
                          >
                            Mapped ({mappedCount})
                          </button>
                          {requiredTargetFields.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setTargetFilterTab('required')}
                              className={cn(
                                "px-2 py-0.5 rounded-md transition-all",
                                targetFilterTab === 'required' 
                                  ? "bg-white dark:bg-zinc-700 text-rose-600 dark:text-rose-400 shadow-xs" 
                                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                              )}
                            >
                              Req ({requiredMappedCount}/{requiredTargetFields.length})
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Search Target Fields */}
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                          type="text"
                          value={targetFieldSearch}
                          onChange={(e) => setTargetFieldSearch(e.target.value)}
                          placeholder="Filter destination fields by name or type..."
                          className="w-full pl-7 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                        />
                        {targetFieldSearch && (
                          <button
                            type="button"
                            onClick={() => setTargetFieldSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Target Fields List / Drop Targets */}
                    <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-zinc-100 dark:divide-zinc-800/60 p-2 space-y-2">
                      {filteredTargetFields.length === 0 ? (
                        <div className="p-8 text-center text-xs text-zinc-400">
                          No destination fields match your filter.
                        </div>
                      ) : (
                        filteredTargetFields.map(tField => {
                          const mappedSourceId = fieldMapping[tField.id] || '';
                          const mappedSourceField = mappedSourceId ? sourceFieldsMap.get(mappedSourceId) : null;
                          const isAutoMatched = autoMatchedKeys.has(tField.id);
                          const isDropActive = activeDropTargetId === tField.id;
                          const isConnectTargetActive = !!selectedSourceForConnect;

                          return (
                            <div
                              key={tField.id}
                              onDragOver={(e) => handleDragOver(e, tField.id)}
                              onDragLeave={(e) => handleDragLeave(e, tField.id)}
                              onDrop={(e) => handleDrop(e, tField.id)}
                              onClick={() => {
                                if (isConnectTargetActive) {
                                  handleTargetSlotClick(tField.id);
                                }
                              }}
                              className={cn(
                                "p-3 rounded-xl border transition-all duration-150 relative",
                                isDropActive 
                                  ? "border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30 scale-[1.01]" 
                                  : isConnectTargetActive
                                    ? "border-dashed border-indigo-400/80 dark:border-indigo-600/80 bg-indigo-50/40 dark:bg-indigo-950/20 hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                                    : mappedSourceId
                                      ? "border-zinc-200 dark:border-zinc-800/90 bg-zinc-50/40 dark:bg-zinc-900/40"
                                      : "border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30"
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                {/* Destination Field Meta */}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                      {tField.label || tField.name || tField.id}
                                    </span>
                                    {tField.required && (
                                      <span className="text-rose-500 text-xs font-black" title="Required Destination Field">*</span>
                                    )}
                                    <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-mono border font-semibold", getTypeBadgeColor(tField.type))}>
                                      {tField.type || 'text'}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-zinc-400 font-mono truncate mt-0.5">
                                    {tField.id}
                                  </div>
                                </div>

                                {/* Status / Indicator */}
                                <div className="shrink-0 flex items-center gap-1">
                                  {isAutoMatched && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                      <Sparkles size={9} />
                                      <span>Auto</span>
                                    </span>
                                  )}
                                  {mappedSourceId && !isAutoMatched && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                                      <Link2 size={9} />
                                      <span>Mapped</span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Drop Target Slot / Mapped Badge */}
                              <div className="mt-2.5">
                                {mappedSourceId ? (
                                  /* Currently Mapped Badge */
                                  <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 shadow-xs">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                        <ArrowRightLeft size={12} />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-xs font-semibold text-zinc-900 dark:text-white truncate flex items-center gap-1.5">
                                          <span>{mappedSourceField?.label || mappedSourceField?.name || mappedSourceId}</span>
                                          <span className={cn("px-1 py-0.2 rounded text-[8px] font-mono border", getTypeBadgeColor(mappedSourceField?.type))}>
                                            {mappedSourceField?.type || 'field'}
                                          </span>
                                        </div>
                                        <div className="text-[9px] text-zinc-400 font-mono truncate">
                                          source: {mappedSourceId}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0 ml-2">
                                      {/* Quick Dropdown select to switch if desired */}
                                      <select
                                        value={mappedSourceId}
                                        onChange={(e) => handleFieldMappingChange(tField.id, e.target.value)}
                                        aria-label="Change mapped source field"
                                        className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 bg-transparent border-0 focus:ring-0 p-1 cursor-pointer"
                                      >
                                        <option value="">Change...</option>
                                        {sourceFields.map(s => (
                                          <option key={s.id} value={s.id}>
                                            {s.label || s.name || s.id}
                                          </option>
                                        ))}
                                      </select>

                                      <button
                                        type="button"
                                        onClick={(e) => handleUnmap(tField.id, e)}
                                        className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                        title="Unmap field"
                                      >
                                        <X size={13} />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  /* Empty Drop Zone */
                                  <div className={cn(
                                    "p-2.5 rounded-xl border border-dashed text-center transition-all flex items-center justify-between gap-2",
                                    isDropActive
                                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 font-bold text-xs"
                                      : isConnectTargetActive
                                        ? "border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-medium text-xs animate-pulse"
                                        : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-400 text-xs"
                                  )}>
                                    <span className="truncate flex items-center gap-1.5">
                                      <GripVertical size={12} className="shrink-0 text-zinc-300 dark:text-zinc-600" />
                                      {isDropActive ? (
                                        <span>Release to map to {tField.label || tField.id}</span>
                                      ) : isConnectTargetActive ? (
                                        <span>Click here to map selected source field</span>
                                      ) : (
                                        <span>Drop source field here or choose</span>
                                      )}
                                    </span>

                                    {/* Fallback Selector */}
                                    <select
                                      value=""
                                      onChange={(e) => handleFieldMappingChange(tField.id, e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      aria-label={`Select source field for ${tField.label || tField.id}`}
                                      className="text-xs py-1 px-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 focus:outline-none shrink-0 cursor-pointer"
                                    >
                                      <option value="">Select...</option>
                                      {sourceFields.map(s => (
                                        <option key={s.id} value={s.id}>
                                          {s.label || s.name || s.id} ({s.type || 'field'})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Step 3: Migration Options */}
            {selectedTargetModule && (
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-3 animate-in fade-in duration-200">
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center text-[10px] font-black">3</span>
                  <span>Migration Options</span>
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
              disabled={!selectedTargetModuleId || isSubmitting || !isAllRequiredMapped}
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

