import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { usePositions } from '../../hooks/usePositions';
import { API_BASE_URL } from '../../config';
import { 
  Zap, Plus, Trash2, CheckCircle2, XCircle, 
  Mail, MessageSquare, ChevronDown, ChevronUp, RefreshCw, Database,
  ArrowRight, ToggleLeft, ToggleRight, Clock, HelpCircle, Search, Sparkles, Code, Play, Layers,
  Copy, GripVertical, UserCheck, GitFork, Route, RotateCw, FileText, Grid, CreditCard,
  Bell, CheckSquare, StickyNote, Pin, Bot, Globe, ChevronLeft, ChevronRight, X, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, flattenFields } from '../../lib/utils';
import { PLATFORM_MODULES } from '../../config/platformModules';
import { DeleteConfirmationModal } from '../Common/DeleteConfirmationModal';

interface AutomationsTabProps {
  moduleId: string | undefined;
  fields?: any[];
}

interface VisualConditionRow {
  id: string;
  fieldId: string;
  operator: string;
  value: string;
}

const getFieldOperators = (field: any) => {
  if (!field) return [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'does not equal' }
  ];
  const type = field.type;
  if (type === 'number' || type === 'currency') {
    return [
      { value: 'equals', label: 'equals' },
      { value: 'not_equals', label: 'does not equal' },
      { value: 'greater_than', label: 'is greater than' },
      { value: 'less_than', label: 'is less than' },
      { value: 'is_empty', label: 'is empty' },
      { value: 'is_not_empty', label: 'is not empty' }
    ];
  }
  if (type === 'checkbox' || type === 'boolean') {
    return [
      { value: 'equals', label: 'is' },
      { value: 'not_equals', label: 'is not' }
    ];
  }
  return [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'does not equal' },
    { value: 'contains', label: 'contains' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' }
  ];
};

const compileVisualConditions = (rows: VisualConditionRow[], matchType: 'AND' | 'OR', fields: any[]): string => {
  if (!rows || rows.length === 0) return '';
  
  const compiledRows = rows
    .map(row => {
      if (!row.fieldId) return null;
      
      const fieldDef = fields.find(f => f.id === row.fieldId || f.name === row.fieldId);
      if (!fieldDef) return null;

      const variableName = fieldDef.name || fieldDef.id;
      let val = row.value ?? '';
      
      const isNumber = !isNaN(Number(val)) && val.trim() !== '';
      const formattedValue = (val === 'true' || val === 'false') 
        ? val 
        : (isNumber ? val : `'${val.replace(/'/g, "\\'")}'`);
      
      switch (row.operator) {
        case 'equals':
          return `${variableName} === ${formattedValue}`;
        case 'not_equals':
          return `${variableName} !== ${formattedValue}`;
        case 'greater_than':
          return `${variableName} > ${isNumber ? val : formattedValue}`;
        case 'less_than':
          return `${variableName} < ${isNumber ? val : formattedValue}`;
        case 'contains':
          return `String(${variableName}).includes(${formattedValue})`;
        case 'is_empty':
          return `(!${variableName} || ${variableName} === '')`;
        case 'is_not_empty':
          return `(!!${variableName} && ${variableName} !== '')`;
        default:
          return `${variableName} === ${formattedValue}`;
      }
    })
    .filter(Boolean);
    
  if (compiledRows.length === 0) return '';
  const delimiter = matchType === 'OR' ? ' || ' : ' && ';
  return compiledRows.join(delimiter);
};

const renderVariablePreviews = (
  value: string,
  triggerModuleId: string | undefined,
  triggerFields: any[],
  modules: any[],
  actions: any[]
) => {
  if (!value) return null;

  const regex = /\{\{\s*([^}]+)\s*\}\}/g;
  const parts: { type: 'text' | 'var'; content: string; key?: string }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(value)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: value.substring(lastIndex, match.index),
      });
    }
    parts.push({
      type: 'var',
      content: match[0],
      key: match[1].trim(),
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < value.length) {
    parts.push({
      type: 'text',
      content: value.substring(lastIndex),
    });
  }

  const triggerModule = triggerModuleId ? modules.find(m => m.id === triggerModuleId) : null;
  const triggerModuleName = triggerModule ? triggerModule.name : 'Trigger';

  return (
    <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/60 rounded-lg text-[9px] w-full mt-1.5">
      <span className="text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider select-none px-1">Display:</span>
      <div className="flex flex-wrap items-center gap-1 flex-1">
        {parts.map((part, idx) => {
          if (part.type === 'text') {
            return (
              <span key={idx} className="text-zinc-700 dark:text-zinc-300 font-medium px-0.5 whitespace-pre-wrap break-all max-w-full">
                {part.content}
              </span>
            );
          }

          const varKey = part.key || '';
          
          // Case 1: trigger.user
          if (varKey.startsWith('trigger.user.')) {
            const sub = varKey.replace('trigger.user.', '');
            const label = sub === 'email' ? 'Triggering User Email' : sub === 'id' ? 'Triggering User ID' : sub;
            return (
              <span 
                key={idx} 
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/60 font-semibold select-none cursor-help text-[8px]" 
                title={part.content}
              >
                <span>👤</span>
                <span>{label}</span>
              </span>
            );
          }

          // Case 2: trigger.record
          if (varKey.startsWith('trigger.record.')) {
            const fieldKey = varKey.replace('trigger.record.', '');
            if (fieldKey === 'id') {
              return (
                <span 
                  key={idx} 
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/60 font-semibold select-none cursor-help text-[8px]" 
                  title={part.content}
                >
                  <span>⚡</span>
                  <span>{triggerModuleName} → Record ID</span>
                </span>
              );
            }
            const fieldDef = triggerFields.find(f => f.id === fieldKey || f.name === fieldKey);
            const fieldLabel = fieldDef ? (fieldDef.label || fieldDef.name || fieldDef.id) : fieldKey;
            return (
              <span 
                key={idx} 
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/60 font-semibold select-none cursor-help text-[8px]" 
                title={part.content}
              >
                <span>⚡</span>
                <span>{triggerModuleName} → {fieldLabel}</span>
              </span>
            );
          }

          // Case 3: steps
          if (varKey.startsWith('steps.')) {
            const stepMatch = varKey.match(/^steps\.(\d+)\.output\.(.*)$/);
            if (stepMatch) {
              const stepIdx = parseInt(stepMatch[1], 10);
              const fieldKey = stepMatch[2];
              const stepAction = actions[stepIdx];
              
              if (stepAction) {
                let stepModName = `Step ${stepIdx + 1} (${stepAction.type.replace(/_/g, ' ')})`;
                let fieldLabel = fieldKey;

                if (stepAction.config.targetModuleId) {
                  const m = modules.find(x => x.id === stepAction.config.targetModuleId);
                  if (m) {
                    stepModName = m.name;
                    const fs = flattenFields(m.layout || []);
                    const fd = fs.find(f => f.id === fieldKey || f.name === fieldKey);
                    if (fd) {
                      fieldLabel = fd.label || fd.name || fd.id;
                    }
                  }
                } else if (stepAction.config.targetType === 'TRIGGERING') {
                  stepModName = triggerModuleName;
                  const fd = triggerFields.find(f => f.id === fieldKey || f.name === fieldKey);
                  if (fd) {
                    fieldLabel = fd.label || fd.name || fd.id;
                  }
                }

                if (fieldKey === 'id') {
                  fieldLabel = 'Record ID';
                }

                return (
                  <span 
                    key={idx} 
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200/60 dark:border-purple-900/60 font-semibold select-none cursor-help text-[8px]" 
                    title={part.content}
                  >
                    <span>🔄</span>
                    <span>{stepModName} → {fieldLabel}</span>
                  </span>
                );
              }
            }
          }

          // Case 4: kpi token preview
          if (varKey.startsWith('kpi.')) {
            const kpiSub = varKey.replace('kpi.', '');
            return (
              <span 
                key={idx} 
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/60 font-semibold select-none cursor-help text-[8px]" 
                title={part.content}
              >
                <span>🎯</span>
                <span>KPI → {kpiSub}</span>
              </span>
            );
          }

          // Fallback
          return (
            <span 
              key={idx} 
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-semibold font-mono select-none text-[8px]" 
              title={part.content}
            >
              {varKey}
            </span>
          );
        })}
      </div>
    </div>
  );
};

interface VisualFieldsMapperProps {
  fieldsObj: Record<string, string>;
  onChange: (updated: Record<string, string>) => void;
  targetModuleId?: string;
  triggerModuleId?: string;
  actionIdx: number;
  triggerFields: any[];
  modules: any[];
  actions: any[];
}

const VisualFieldsMapper: React.FC<VisualFieldsMapperProps> = ({
  fieldsObj,
  onChange,
  targetModuleId,
  triggerModuleId,
  actionIdx,
  triggerFields,
  modules,
  actions
}) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Resolve target fields if targetModuleId is provided
  const targetModule = useMemo(() => {
    return modules?.find(m => m.id === targetModuleId);
  }, [modules, targetModuleId]);

  const targetFields = useMemo(() => {
    return targetModule ? flattenFields(targetModule.layout || []) : [];
  }, [targetModule]);

  // entries array representing the active mappings
  const entries = useMemo(() => {
    return Object.entries(fieldsObj || {}).map(([key, value]) => ({ key, value }));
  }, [fieldsObj]);

  const handleAddRow = () => {
    const unmapped = targetFields.find(tf => tf.id && !fieldsObj[tf.id]);
    const newKey = unmapped ? unmapped.id : `custom_field_${Object.keys(fieldsObj || {}).length + 1}`;
    onChange({ ...fieldsObj, [newKey]: '' });
  };

  const handleRemoveRow = (keyToRemove: string) => {
    const updated = { ...fieldsObj };
    delete updated[keyToRemove];
    onChange(updated);
  };

  const handleKeyChange = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;
    const updated = { ...fieldsObj };
    updated[newKey] = updated[oldKey];
    delete updated[oldKey];
    onChange(updated);
  };

  const handleValueChange = (key: string, value: string) => {
    onChange({ ...fieldsObj, [key]: value });
  };

  // Build variable suggestions list
  const variableGroups = useMemo(() => {
    const groups: { label: string; items: { label: string; value: string }[] }[] = [];

    // Trigger details
    groups.push({
      label: 'Trigger Event Details',
      items: [
        { label: 'Triggering User ID', value: '{{ trigger.user.id }}' },
        { label: 'Triggering User Email', value: '{{ trigger.user.email }}' },
        { label: 'Triggering Record ID', value: '{{ trigger.record.id }}' }
      ]
    });

    // Trigger Record Fields
    if (triggerFields && triggerFields.length > 0) {
      groups.push({
        label: 'Trigger Record Fields',
        items: triggerFields
          .filter(f => f.id)
          .map(f => ({
            label: `${f.label || f.name || f.id} (${f.id})`,
            value: `{{ trigger.record.${f.id} }}`
          }))
      });
    }

    // Preceding Step Outputs
    actions.slice(0, actionIdx).forEach((prevAction, prevIdx) => {
      const stepItems: { label: string; value: string }[] = [];
      stepItems.push({
        label: `Step ${prevIdx + 1} (${prevAction.type}) Record ID`,
        value: `{{ steps.${prevIdx}.output.id }}`
      });

      if (prevAction.config.targetModuleId) {
        const prevMod = modules?.find(m => m.id === prevAction.config.targetModuleId);
        const prevFields = prevMod ? flattenFields(prevMod.layout || []) : [];
        prevFields.filter(f => f.id).forEach(f => {
          stepItems.push({
            label: `${f.label || f.name || f.id} (${f.id})`,
            value: `{{ steps.${prevIdx}.output.${f.id} }}`
          });
        });
      }

      groups.push({
        label: `Step ${prevIdx + 1} Outputs (${prevAction.type.replace(/_/g, ' ')})`,
        items: stepItems
      });
    });

    return groups;
  }, [triggerFields, actions, actionIdx, modules]);

  return (
    <div className="space-y-3">
      {entries.length > 0 ? (
        <div className="space-y-2">
          {/* Header Row explaining what the fields are */}
          <div className="flex gap-2 items-start px-2 py-1.5 border-b border-zinc-200/60 dark:border-zinc-800/80 mb-1 select-none">
            <div className="w-1/3 min-w-[120px]">
              <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 block uppercase tracking-wider">Field to Populate</span>
              <span className="text-[8px] font-normal text-zinc-400 dark:text-zinc-400 block leading-tight">The field to fill in the record.</span>
            </div>
            <div className="w-[10px]" /> {/* Spacer matching arrow right */}
            <div className="flex-1">
              <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 block uppercase tracking-wider">Value / Source Data</span>
              <span className="text-[8px] font-normal text-zinc-400 dark:text-zinc-400 block leading-tight">Static text or dynamic trigger fields (⚡).</span>
            </div>
            <div className="w-[19px]" /> {/* Spacer matching trash icon */}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
            {entries.map(({ key, value }) => {
              const fieldId = `val-input-${actionIdx}-${key}`;
               const targetFieldDef = targetFields.find(tf => tf.id === key || tf.name === key);
              const isStandard = targetFields.some(tf => tf.id === key || tf.name === key);

              return (
                <div key={key} className="flex gap-2 items-start bg-zinc-50/30 dark:bg-zinc-950/20 p-2 border border-zinc-200/80 dark:border-zinc-800/85 rounded-xl animate-in fade-in duration-100 w-full">
                  {/* Field Selection / Key Input */}
                  <div className="w-1/3 min-w-[120px] space-y-1.5">
                    {targetFields.length > 0 && (
                      <select
                        value={isStandard ? (targetFields.find(tf => tf.id === key)?.id || targetFields.find(tf => tf.name === key)?.id || key) : '__custom__'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__custom__') {
                            handleKeyChange(key, `custom_field_${Date.now()}`);
                          } else {
                            handleKeyChange(key, val);
                          }
                        }}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-[10px] text-zinc-900 dark:text-white cursor-pointer focus:outline-none"
                      >
                        {targetFields.filter(f => f.id).map(f => (
                          <option key={f.id} value={f.id}>{f.label || f.name || f.id}</option>
                        ))}
                        <option value="__custom__">+ Custom Field Key...</option>
                      </select>
                    )}
                    
                    {(!isStandard || targetFields.length === 0) && (
                      <input
                        type="text"
                        value={key}
                        onChange={(e) => handleKeyChange(key, e.target.value)}
                        placeholder="field_key"
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-[10px] text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    )}

                    {targetFieldDef && (
                      <span className="text-[8px] text-zinc-400 block px-1 truncate">{targetFieldDef.type}</span>
                    )}
                  </div>

                  {/* Arrow indicator */}
                  <div className="pt-1 text-zinc-300 dark:text-zinc-700 flex items-center justify-center">
                    <ArrowRight size={10} />
                  </div>

                  {/* Value Input and Variable Helper */}
                  <div className="flex-1 relative space-y-1">
                    <div className="flex items-center relative">
                      <input
                        id={fieldId}
                        type="text"
                        value={value}
                        onChange={(e) => handleValueChange(key, e.target.value)}
                        placeholder="Enter value or use ⚡"
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-2 pr-7 py-1 text-[10px] text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                      
                      <button
                        type="button"
                        onClick={() => setActiveDropdown(activeDropdown === key ? null : key)}
                        className={cn(
                          "absolute right-1 p-1 text-zinc-400 hover:text-indigo-500 rounded-md transition-all",
                          activeDropdown === key && "text-indigo-500 bg-indigo-500/10"
                        )}
                        title="Insert dynamic value"
                      >
                        <Sparkles size={10} />
                      </button>
                    </div>

                    {value && value.includes('{{') && (
                      <div className="mt-1">
                        {renderVariablePreviews(value, triggerModuleId, triggerFields, modules, actions)}
                      </div>
                    )}

                    {activeDropdown === key && (
                      <div className="relative w-full mt-1.5 bg-zinc-50/50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-inner max-h-40 overflow-y-auto custom-scrollbar p-1 text-[10px] animate-in fade-in duration-100 z-10">
                        <div className="px-2 py-1 text-[8.5px] font-bold text-zinc-400 border-b border-zinc-200/50 dark:border-zinc-800/50 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span>Insert Variable</span>
                          <button 
                            type="button"
                            onClick={() => setActiveDropdown(null)} 
                            className="hover:text-zinc-600 dark:hover:text-white bg-transparent border-0 cursor-pointer text-[9px]"
                          >
                            Close
                          </button>
                        </div>
                        
                        {variableGroups.map((group, gIdx) => (
                          <div key={gIdx} className="space-y-0.5 mt-1.5 first:mt-0">
                            <div className="px-2 py-0.5 text-[8px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800/40 rounded">{group.label}</div>
                            {group.items.map((item, iIdx) => (
                              <button
                                key={iIdx}
                                type="button"
                                onClick={() => {
                                  const currentValue = value || '';
                                  const inputElement = document.getElementById(fieldId) as HTMLInputElement;
                                  let newValue = currentValue + item.value;
                                  let insertPos = currentValue.length;

                                  if (inputElement) {
                                    const start = inputElement.selectionStart || 0;
                                    const end = inputElement.selectionEnd || 0;
                                    newValue = currentValue.substring(0, start) + item.value + currentValue.substring(end);
                                    insertPos = start + item.value.length;
                                  }

                                  handleValueChange(key, newValue);
                                  setActiveDropdown(null);

                                  if (inputElement) {
                                    setTimeout(() => {
                                      inputElement.focus();
                                      inputElement.setSelectionRange(insertPos, insertPos);
                                    }, 50);
                                  }
                                }}
                                className="w-full text-left px-2.5 py-1 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-all text-zinc-600 dark:text-zinc-300 font-mono text-[9px] truncate bg-transparent border-0 cursor-pointer block"
                                title={item.value}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveRow(key)}
                    className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-500/5 rounded transition-all mt-0.5 shrink-0"
                    title="Remove property"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-center">
          <p className="text-[10px] text-zinc-400 italic">No field mappings configured. Record will be created empty.</p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={handleAddRow}
          className="flex items-center gap-1 px-2.5 py-1 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/30 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg text-[9px] font-bold text-zinc-500 transition-all cursor-pointer bg-transparent"
        >
          <Plus size={10} />
          Add Field to Populate
        </button>
      </div>
    </div>
  );
};

interface AssigneeSelectProps {
  value: string;
  onChange: (val: string) => void;
  members: any[];
}

const AssigneeSelect: React.FC<AssigneeSelectProps> = ({ value, onChange, members }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClose = () => setIsOpen(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [isOpen]);

  const selectedMember = members.find(m => m.id === value);
  const displayName = selectedMember
    ? (selectedMember.name || selectedMember.email.split('@')[0])
    : 'Select Member...';
    
  const getInitials = (nameStr: string) => {
    if (!nameStr || nameStr === 'Select Member...') return '?';
    const parts = nameStr.split(/[\s._-]+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nameStr.substring(0, 2).toUpperCase();
  };

  const selectedInitials = getInitials(displayName);

  return (
    <div className="relative w-full" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 focus:outline-none transition-all"
      >
        <div className="flex items-center gap-2">
          {selectedMember && selectedMember.avatarUrl ? (
            <img 
              src={selectedMember.avatarUrl} 
              alt={displayName} 
              className="w-5 h-5 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 shrink-0"
            />
          ) : selectedMember ? (
            <div className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[8px] font-black text-indigo-600">
              {selectedInitials}
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-[8px] font-black text-zinc-400">
              ?
            </div>
          )}
          <span className="font-medium text-zinc-900 dark:text-white">{displayName}</span>
        </div>
        <ChevronDown size={14} className={cn("text-zinc-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar py-1">
          {members.length === 0 ? (
            <div className="px-3 py-2 text-[10px] text-zinc-400">No members found</div>
          ) : (
            members.map((m: any) => {
              const mName = m.name || m.email.split('@')[0];
              const initials = getInitials(mName);
              const isSelected = m.id === value;
              
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onChange(m.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors cursor-pointer",
                    isSelected 
                      ? "bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300"
                  )}
                >
                  {m.avatarUrl ? (
                    <img 
                      src={m.avatarUrl} 
                      alt={mName} 
                      className="w-5 h-5 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 shrink-0"
                    />
                  ) : (
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black shrink-0",
                      isSelected
                        ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                        : "bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500"
                    )}>
                      {initials}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="font-bold">{mName}</span>
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-500">{m.email}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

const TRIGGER_CATALOG = [
  { id: 'RECORD_CREATED', label: 'Record Created', category: 'Record Events', desc: 'When a new record is added to this module' },
  { id: 'RECORD_UPDATED', label: 'Record Updated', category: 'Record Events', desc: 'When any field on a record changes' },
  { id: 'STATUS_CHANGED', label: 'Status Changed', category: 'Record Events', desc: 'When a record transitions between statuses' },
  { id: 'ASSIGNEE_CHANGED', label: 'Assignee Changed', category: 'Record Events', desc: 'When record ownership is reassigned' },
  { id: 'PARTICIPANTS_CHANGED', label: 'Participants Changed', category: 'Record Events', desc: 'When record participants are updated' },
  { id: 'RELATION_LINKED', label: 'Relation Linked', category: 'Record Events', desc: 'When a related record is linked' },
  { id: 'USER_MENTIONED', label: 'User Mentioned', category: 'Collaboration', desc: 'When a user is @mentioned in comments' },
  { id: 'FORM_SUBMITTED', label: 'Form Submitted', category: 'Intake & Schedules', desc: 'When a public or internal form is submitted' },
  { id: 'CRON', label: 'Scheduled (Cron)', category: 'Intake & Schedules', desc: 'Run automatically on a recurring time schedule' },
  { id: 'SLA_AGE', label: 'SLA Age Limit', category: 'Intake & Schedules', desc: 'When an open record exceeds an age threshold' },
  { id: 'QUICK_ACTION', label: 'Quick Action Button', category: 'Manual & API', desc: 'Triggered manually from a record detail button' },
  { id: 'CALL_ONLY', label: 'Callable / Workflow Only', category: 'Manual & API', desc: 'Invoked from another workflow or API call' },
  { id: 'SERVICE_DESK_SESSION_STARTED', label: 'Service Desk Started', category: 'Service Desk', desc: 'When a new chat or call session begins' },
  { id: 'SERVICE_DESK_ALLOCATED', label: 'Service Desk Allocated', category: 'Service Desk', desc: 'When a session is assigned to AI or Human' },
  { id: 'SERVICE_DESK_ESCALATED', label: 'Service Desk Escalated', category: 'Service Desk', desc: 'When a session is handed off to a human queue' },
  { id: 'SERVICE_DESK_RESOLVED', label: 'Service Desk Resolved', category: 'Service Desk', desc: 'When a chat or call session is closed' },
];

const ACTION_CATALOG = [
  { id: 'CREATE_RECORD', label: 'Create Record', category: 'Records & Data', desc: 'Insert a new record into any module', icon: Database },
  { id: 'UPDATE_RECORD', label: 'Update Record', category: 'Records & Data', desc: 'Modify fields on the triggering or target record', icon: RefreshCw },
  { id: 'GET_RECORD', label: 'Fetch Record', category: 'Records & Data', desc: 'Look up a record by field value', icon: ArrowRight },
  { id: 'SET_ASSIGNEE', label: 'Set Assignee', category: 'Records & Data', desc: 'Assign record ownership to a user', icon: UserCheck },
  { id: 'ADD_PARTICIPANT', label: 'Add Participant', category: 'Records & Data', desc: 'Add a collaborator to the record', icon: UserCheck },
  { id: 'REMOVE_PARTICIPANT', label: 'Remove Participant', category: 'Records & Data', desc: 'Remove a collaborator from the record', icon: UserCheck },
  { id: 'ROUTE_TO_MODULE', label: 'Route to Module', category: 'Records & Data', desc: 'Move or copy record data to another module', icon: GitFork },
  { id: 'SEND_EMAIL', label: 'Send Email', category: 'Communication', desc: 'Dispatch a templated email via SMTP', icon: Mail },
  { id: 'SEND_INTERNAL_PING', label: 'Internal Ping', category: 'Communication', desc: 'Post a notification to an internal channel', icon: MessageSquare },
  { id: 'CREATE_NOTE', label: 'Create Note', category: 'Communication', desc: 'Log an operational note on the record', icon: StickyNote },
  { id: 'PIN_RECORD_NOTE', label: 'Pin Alert Note', category: 'Communication', desc: 'Pin a high-visibility banner note on the record', icon: Pin },
  { id: 'CREATE_REMINDER', label: 'Create Reminder', category: 'Communication', desc: 'Schedule a follow-up reminder task', icon: Bell },
  { id: 'COMPLETE_REMINDER', label: 'Complete Reminder', category: 'Communication', desc: 'Mark matching record reminders as done', icon: CheckSquare },
  { id: 'IF_CONDITION', label: 'Condition Branch', category: 'Logic & Flow', desc: 'Branch execution with If / Else rules', icon: GitFork },
  { id: 'SWITCH_CASE', label: 'Switch Path', category: 'Logic & Flow', desc: 'Route based on matching field values', icon: Route },
  { id: 'LOOP_FOREACH', label: 'Loop (For Each)', category: 'Logic & Flow', desc: 'Iterate over a list of items', icon: RotateCw },
  { id: 'DELAY', label: 'Wait / Delay', category: 'Logic & Flow', desc: 'Pause execution for a set number of seconds', icon: Clock },
  { id: 'GEMINI_PROMPT', label: 'Gemini AI Prompt', category: 'AI & Documents', desc: 'Run a Gemini prompt and capture structured output', icon: Sparkles },
  { id: 'INVOKE_AGENT', label: 'Invoke AI Agent', category: 'AI & Documents', desc: 'Delegate work to an autonomous AI coworker', icon: Bot },
  { id: 'GENERATE_PDF', label: 'Generate PDF', category: 'AI & Documents', desc: 'Create a PDF document from a template', icon: FileText },
  { id: 'WEBHOOK', label: 'Outbound Webhook', category: 'Integrations', desc: 'Send an HTTP request to an external API', icon: Globe },
  { id: 'GOOGLE_SHEETS_SYNC', label: 'Google Sheets Sync', category: 'Integrations', desc: 'Append record data to a Google Sheet', icon: Grid },
  { id: 'STRIPE_PAYMENT_LINK', label: 'Stripe Payment Link', category: 'Integrations', desc: 'Generate a Stripe checkout payment link', icon: CreditCard },
  { id: 'ALLOCATE_SERVICE_DESK_SESSION', label: 'Allocate Service Desk', category: 'Service Desk', desc: 'Route chat or call to an AI or human agent', icon: UserCheck },
  { id: 'SEND_SERVICE_DESK_MESSAGE', label: 'Service Desk Reply', category: 'Service Desk', desc: 'Send an automated Service Desk message', icon: MessageSquare },
];

interface AutomationsTabProps {
  moduleId: string | undefined;
  fields?: any[];
  automations: any[];
  setAutomations: React.Dispatch<React.SetStateAction<any[]>>;
  deletedAutomationIds: string[];
  setDeletedAutomationIds: React.Dispatch<React.SetStateAction<string[]>>;
  mode?: 'module' | 'global';
  initialSelectedRuleId?: string | null;
  onSaveRule?: (rule: any) => Promise<void>;
  isSaving?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

export const AutomationsTab: React.FC<AutomationsTabProps> = ({
  moduleId,
  fields = [],
  automations,
  setAutomations,
  deletedAutomationIds,
  setDeletedAutomationIds,
  mode = 'module',
  initialSelectedRuleId,
  onSaveRule,
  isSaving = false,
  onDirtyChange
}) => {
  const { tenant, modules: customModules = [], members = [], teams = [] } = usePlatform();
  const modules = useMemo(() => {
    const existingIds = new Set((customModules || []).map((m: any) => m.id));
    const platformEntries = PLATFORM_MODULES.filter(pm => !existingIds.has(pm.id)).map(pm => ({
      id: pm.id,
      name: `${pm.name} (Platform)`,
      type: 'REGISTRY',
      isPlatformModule: true,
      layout: [
        { id: 'name', name: 'name', label: 'Name / Title', type: 'text' },
        { id: 'status', name: 'status', label: 'Status', type: 'select' },
        { id: 'email', name: 'email', label: 'Email', type: 'email' },
        { id: 'amount', name: 'amount', label: 'Amount', type: 'number' },
        { id: 'assigneeId', name: 'assigneeId', label: 'Assignee', type: 'user' }
      ]
    }));
    return [...(customModules || []), ...platformEntries];
  }, [customModules]);
  const { positions } = usePositions();
  const { session } = useAuth();
  const triageModule = modules.find((m: any) => m.isIntakeTriage === true || m.config?.isIntakeTriage === true);
  if (deletedAutomationIds.length < 0) {
    console.log(deletedAutomationIds);
  }
  const loading = false; // loader state handled by parent module editor
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(initialSelectedRuleId ?? null);

  useEffect(() => {
    if (initialSelectedRuleId !== undefined) {
      setSelectedRuleId(initialSelectedRuleId);
    }
  }, [initialSelectedRuleId]);
  
  // Runs list states
  const [runs, setRuns] = useState<any[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  // Available AI Agents for invocation
  const [agentsList, setAgentsList] = useState<any[]>([]);
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
        const res = await fetch(`${API_BASE_URL}/api/agents`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenant?.id || 'default'
          }
        });
        if (res.ok) {
          const data = await res.json();
          setAgentsList(Array.isArray(data) ? data : []);
        }
      } catch {
        setAgentsList([
          { id: 'agent-triage', name: 'Intake Triage Copilot', roleTitle: 'Triage Specialist' },
          { id: 'agent-compliance', name: 'Document Compliance Auditor', roleTitle: 'Auditor' }
        ]);
      }
    };
    fetchAgents();
  }, [session?.access_token, tenant?.id]);

  // Form states for rule editing
  // Derived active rule object
  const selectedRule = useMemo(() => {
    return automations.find(a => a.id === selectedRuleId) || null;
  }, [automations, selectedRuleId]);

  // Derived properties from active selectedRule
  const name = selectedRule ? selectedRule.name : '';
  const description = selectedRule ? selectedRule.description || '' : '';
  const isActive = selectedRule ? selectedRule.isActive : true;
  const conditions = selectedRule ? selectedRule.conditions || '' : '';
  const actions = selectedRule ? selectedRule.actions || [] : [];
  
  const inputsPayload = selectedRule?.inputs || {};
  const visualConditions = inputsPayload.visualConditions || [];
  const conditionMatchType = inputsPayload.conditionMatchType || 'AND';

  const triggerConfig = selectedRule?.triggers?.[0];
  const triggerType = triggerConfig 
    ? (triggerConfig.type === 'MODULE_EVENT' ? triggerConfig.on : triggerConfig.type)
    : 'RECORD_CREATED';

  // Local UI only states
  const [expandedActionIdx, setExpandedActionIdx] = useState<number | null>(null);
  const [fieldsEditorModes, setFieldsEditorModes] = useState<Record<number, 'visual' | 'json'>>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isAdvancedCondition, setIsAdvancedCondition] = useState(false);
  const [rightSidebarTab, setRightSidebarTab] = useState<'properties' | 'runs'>('properties');
  const [searchQuery, setSearchQuery] = useState('');
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(256);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(320);

  const startSidebarResize = (side: 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = side === 'left' ? leftSidebarWidth : rightSidebarWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      if (side === 'left') {
        setLeftSidebarWidth(Math.max(220, Math.min(380, startWidth + delta)));
      } else {
        setRightSidebarWidth(Math.max(260, Math.min(460, startWidth - delta)));
      }
    };

    const onMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };
  const [isTestingRun, setIsTestingRun] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<any | null>(null);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [triggerSearch, setTriggerSearch] = useState('');
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionSearch, setActionSearch] = useState('');
  const [actionCategory, setActionCategory] = useState('All');
  const preconditionsRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showTriggerModal && !showActionModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowTriggerModal(false);
        setShowActionModal(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showTriggerModal, showActionModal]);

  // Reactive property update helpers
  const handleUpdateRuleProperty = (updates: Partial<any>) => {
    if (!selectedRuleId) return;
    onDirtyChange?.(true);
    setAutomations(prev => prev.map(a => a.id === selectedRuleId ? { ...a, ...updates } : a));
  };

  const handleUpdateInputs = (updates: Partial<any>) => {
    handleUpdateRuleProperty({
      inputs: {
        ...inputsPayload,
        ...updates
      }
    });
  };

  // State wrappers for full compatibility with nested card fields
  const setName = (val: string) => handleUpdateRuleProperty({ name: val });
  const setDescription = (val: string) => handleUpdateRuleProperty({ description: val });
  const setConditions = (val: string) => handleUpdateRuleProperty({ conditions: val });

  const setActions = (newActionsOrFn: any[] | ((prev: any[]) => any[])) => {
    if (typeof newActionsOrFn === 'function') {
      const nextActions = newActionsOrFn(actions);
      handleUpdateRuleProperty({ actions: nextActions });
    } else {
      handleUpdateRuleProperty({ actions: newActionsOrFn });
    }
  };

  const setVisualConditions = (newValOrFn: any[] | ((prev: any[]) => any[])) => {
    if (typeof newValOrFn === 'function') {
      const nextVal = newValOrFn(visualConditions);
      handleUpdateInputs({ visualConditions: nextVal });
    } else {
      handleUpdateInputs({ visualConditions: newValOrFn });
    }
  };

  const setConditionMatchType = (newValOrFn: 'AND' | 'OR' | ((prev: 'AND' | 'OR') => 'AND' | 'OR')) => {
    if (typeof newValOrFn === 'function') {
      const nextVal = newValOrFn(conditionMatchType);
      handleUpdateInputs({ conditionMatchType: nextVal });
    } else {
      handleUpdateInputs({ conditionMatchType: newValOrFn });
    }
  };

  const setTriggerType = (newType: string) => {
    let triggersPayload = [];
    if (newType === 'RECORD_CREATED' || newType === 'RECORD_UPDATED') {
      triggersPayload.push({
        type: 'MODULE_EVENT',
        on: newType,
        moduleId: moduleId
      });
    } else if (newType === 'QUICK_ACTION') {
      triggersPayload.push({
        type: 'QUICK_ACTION',
        label: selectedRule?.name || '',
        icon: 'Play'
      });
    } else if (newType === 'STATUS_CHANGED') {
      triggersPayload.push({
        type: 'STATUS_CHANGED',
        fromStatus: '',
        toStatus: ''
      });
    } else if (newType === 'ASSIGNEE_CHANGED') {
      triggersPayload.push({
        type: 'ASSIGNEE_CHANGED'
      });
    } else if (newType === 'PARTICIPANTS_CHANGED') {
      triggersPayload.push({
        type: 'PARTICIPANTS_CHANGED'
      });
    } else if (newType === 'RELATION_LINKED') {
      triggersPayload.push({
        type: 'RELATION_LINKED',
        linkedModuleId: ''
      });
    } else if (newType === 'USER_MENTIONED') {
      triggersPayload.push({
        type: 'USER_MENTIONED'
      });
    } else if (newType === 'FORM_SUBMITTED') {
      triggersPayload.push({
        type: 'FORM_SUBMITTED',
        formId: 'public_form'
      });
    } else if (newType === 'CALL_ONLY') {
      triggersPayload.push({
        type: 'CALL_ONLY'
      });
    } else if (newType === 'CRON') {
      triggersPayload.push({
        type: 'CRON',
        cronExpression: '*/5 * * * *',
        moduleId: moduleId
      });
    } else if (newType === 'SLA_AGE') {
      triggersPayload.push({
        type: 'SLA_AGE',
        ageLimitHours: 24,
        moduleId: moduleId
      });
    }
    handleUpdateRuleProperty({ triggers: triggersPayload });
  };

  const handleToggleAdvanced = () => {
    const nextVal = !isAdvancedCondition;
    setIsAdvancedCondition(nextVal);
    if (nextVal) {
      const compiled = compileVisualConditions(visualConditions, conditionMatchType, fields);
      handleUpdateRuleProperty({ conditions: compiled });
    } else {
      handleUpdateRuleProperty({ conditions: null });
    }
  };

  // Auto-selection of first rule on load
  useEffect(() => {
    if (selectedRuleId === null && automations.length > 0) {
      setSelectedRuleId(automations[0].id);
    }
  }, [automations, selectedRuleId]);

  // Selection initialization effect (load runs and advanced condition toggle)
  useEffect(() => {
    if (selectedRule) {
      if (selectedRule.id && !String(selectedRule.id).startsWith('temp-')) {
        viewRuns(selectedRule);
      } else {
        setRuns([]);
      }
      
      const inputsPayload = selectedRule.inputs || {};
      if (inputsPayload.visualConditions && Array.isArray(inputsPayload.visualConditions)) {
        setIsAdvancedCondition(false);
      } else {
        setIsAdvancedCondition(!!selectedRule.conditions);
      }
      setExpandedActionIdx(null);
      setFieldsEditorModes({});
    }
  }, [selectedRuleId]);

  // fetchAutomations is handled by the parent ModuleEditor

  const handleToggleActive = (rule: any, event: React.MouseEvent) => {
    event.stopPropagation();
    const updatedActive = !rule.isActive;
    const updated = automations.map(a => a.id === rule.id ? { ...a, isActive: updatedActive } : a);
    setAutomations(updated);
    toast.success(`Automation is now ${updatedActive ? 'active' : 'inactive'} (click Save to persist)`);
  };

  const handleDeleteRule = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const target = automations.find(a => a.id === id) || { id, name: 'this automation' };
    setRuleToDelete(target);
  };

  const confirmDeleteRule = () => {
    if (!ruleToDelete) return;
    const id = ruleToDelete.id;
    if (!String(id).startsWith('temp-')) {
      setDeletedAutomationIds(prev => [...prev, id]);
    }
    setAutomations(prev => prev.filter(a => a.id !== id));
    if (selectedRuleId === id) setSelectedRuleId(null);
    setRuleToDelete(null);
    toast.success('Automation marked for deletion (click Save to persist)');
  };

  const handleCreateRule = () => {
    const tempId = `temp-${Date.now()}`;
    const newRule = {
      id: tempId,
      name: 'New Automation',
      description: '',
      moduleId,
      inputs: {} as any,
      actions: [] as any[],
      triggers: [
        {
          type: 'MODULE_EVENT',
          on: 'RECORD_CREATED',
          moduleId
        }
      ],
      isActive: true,
      conditions: null as string | null
    };
    setAutomations([...automations, newRule]);
    setSelectedRuleId(tempId);
  };

  const handleAddAction = (type: string) => {
    const defaultConfigs: Record<string, any> = {
      CREATE_RECORD: { targetModuleId: '', fields: {} },
      UPDATE_RECORD: { targetType: 'TRIGGERING', recordId: '', fields: {} },
      GET_RECORD: { targetModuleId: '', queryField: '', queryValue: '' },
      SEND_EMAIL: { to: '', subject: '', body: '' },
      SEND_INTERNAL_PING: { channel: 'general', message: '' },
      SET_ASSIGNEE: { targetType: 'TRIGGERING', recordId: '', assigneeId: '' },
      ADD_PARTICIPANT: { targetType: 'TRIGGERING', recordId: '', participantId: '' },
      REMOVE_PARTICIPANT: { targetType: 'TRIGGERING', recordId: '', participantId: '' },
      IF_CONDITION: { condition: '', thenSteps: [], elseSteps: [] },
      SWITCH_CASE: { switchValue: '', cases: {}, defaultSteps: [] },
      LOOP_FOREACH: { arrayPath: '', loopSteps: [] },
      DELAY: { delaySeconds: '5' },
      GEMINI_PROMPT: { prompt: '' },
      GENERATE_PDF: { template: 'Default Invoice' },
      GOOGLE_SHEETS_SYNC: { sheetId: '' },
      STRIPE_PAYMENT_LINK: { amount: 1000 },
      ROUTE_TO_MODULE: { targetModuleId: '', fieldMapping: {}, archiveSource: true },
      CREATE_REMINDER: { title: 'Follow up on {{name}}', dueOffset: '+3 days at 09:00', priority: 'MEDIUM', assignedTo: '{{ownerId}}', description: '' },
      COMPLETE_REMINDER: { match: 'ALL_ON_RECORD', titleContains: '' },
      CREATE_NOTE: { title: 'Operational Note', body: '', color: 'zinc', isPinned: false },
      PIN_RECORD_NOTE: { title: 'Important Alert', body: '', color: 'amber' },
      INVOKE_AGENT: { agentId: '', promptTemplate: 'Evaluate record {{id}} and execute required task', outputVariable: 'agent_result' },
      WEBHOOK: { url: '', method: 'POST', headers: {} }
    };

    const newActions = [...actions, { type, config: defaultConfigs[type] || {} }];
    setActions(newActions);
    setExpandedActionIdx(newActions.length - 1);
  };

  const handleRemoveAction = (idx: number) => {
    const newActions = [...actions];
    newActions.splice(idx, 1);
    setActions(newActions);
    setExpandedActionIdx(null);
  };

  const handleDuplicateAction = (idx: number) => {
    const cloned = JSON.parse(JSON.stringify(actions[idx]));
    const newActions = [...actions];
    newActions.splice(idx + 1, 0, cloned);
    setActions(newActions);
    setExpandedActionIdx(idx + 1);
    toast.success('Step duplicated');
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const reordered = [...actions];
      const [dragged] = reordered.splice(draggedIndex, 1);
      reordered.splice(dragOverIndex, 0, dragged);
      setActions(reordered);
      
      if (expandedActionIdx !== null) {
        const target = actions[expandedActionIdx];
        const newIdx = reordered.indexOf(target);
        setExpandedActionIdx(newIdx !== -1 ? newIdx : null);
      }
      toast.success('Steps reordered');
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // handleSaveRule removed, changes are bound reactively

  const viewRuns = async (rule: any) => {
    if (!rule || rule.id === 'new') return;
    setLoadingRuns(true);
    setRuns([]);
    setExpandedRunId(null);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || '';
      const res = await fetch(`${API_BASE_URL}/api/automations/${rule.id}/runs`, {
        headers: {
          'x-tenant-id': tenant.id || '',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRuns(data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load execution logs');
    } finally {
      setLoadingRuns(false);
    }
  };

  const handleTestRun = async () => {
    if (!selectedRule) return;
    if (String(selectedRule.id).startsWith('temp-')) {
      toast.info('Save the module first before running a test execution.');
      return;
    }
    if (!selectedRule.isActive) {
      toast.info('Enable this automation before running a test.');
      return;
    }
    setIsTestingRun(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || '';
      const res = await fetch(`${API_BASE_URL}/api/automations/${selectedRule.id}/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant.id || '',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ inputs: {} })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to trigger test run');
      }
      toast.success('Test run triggered');
      setRightSidebarCollapsed(false);
      setRightSidebarTab('runs');
      setTimeout(() => viewRuns(selectedRule), 500);
    } catch (err: any) {
      toast.error(err?.message || 'Test run failed');
    } finally {
      setIsTestingRun(false);
    }
  };

  const handleAddConditionRow = () => {
    const defaultField = fields[0]?.id || '';
    setVisualConditions(prev => [
      ...prev,
      {
        id: `cond-${Math.random().toString(36).substring(2, 9)}`,
        fieldId: defaultField,
        operator: 'equals',
        value: ''
      }
    ]);
  };

  const handleUpdateConditionRow = (id: string, updates: Partial<VisualConditionRow>) => {
    setVisualConditions(prev => prev.map(row => {
      if (row.id === id) {
        const updated = { ...row, ...updates };
        if (updates.fieldId !== undefined) {
          const newField = fields.find(f => f.id === updates.fieldId || f.name === updates.fieldId);
          const ops = getFieldOperators(newField);
          updated.operator = ops[0]?.value || 'equals';
          updated.value = newField?.type === 'checkbox' || newField?.type === 'boolean' ? 'true' : '';
        }
        return updated;
      }
      return row;
    }));
  };

  const handleRemoveConditionRow = (id: string) => {
    setVisualConditions(prev => prev.filter(row => row.id !== id));
  };

  const filteredAutomations = useMemo(() => {
    return automations.filter(rule => 
      rule.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (rule.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [automations, searchQuery]);

  return (
    <div className="flex h-full w-full bg-zinc-50/40 dark:bg-zinc-950 overflow-hidden">
      
      {/* COLUMN 1: Rules Directory Sidebar */}
      {!leftSidebarCollapsed && (
      <aside
        style={{ width: leftSidebarWidth }}
        className="relative flex-shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col"
      >
        <div
          onMouseDown={(e) => startSidebarResize('left', e)}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500/40 active:bg-indigo-500/60 transition-colors z-30"
          title="Drag to resize automations panel"
        />
        <div className="h-11 px-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Zap size={14} className="text-indigo-500 shrink-0" />
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">Automations</span>
            <span className="px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-medium text-zinc-500">
              {automations.length}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleCreateRule}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium transition-colors cursor-pointer"
              title="New automation"
            >
              <Plus size={12} />
              New
            </button>
            <button
              type="button"
              onClick={() => setLeftSidebarCollapsed(true)}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Collapse automations list"
            >
              <ChevronLeft size={14} />
            </button>
          </div>
        </div>
        
        {/* Search */}
        <div className="p-3 pb-2 shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search automations..."
              className="w-full h-8 bg-zinc-100/80 dark:bg-zinc-800/80 border border-transparent rounded-lg pl-8 pr-3 text-xs focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:border-indigo-500 transition-all dark:text-white"
            />
          </div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5 custom-scrollbar">
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="animate-spin text-indigo-500 w-4 h-4" />
              <p className="text-[11px] text-zinc-400">Loading...</p>
            </div>
          ) : filteredAutomations.map((rule) => {
            const isSelected = selectedRuleId === rule.id;
            const triggers = rule.triggers || [];
            const isQuickAction = triggers.some((t: any) => t.type === 'QUICK_ACTION');
            
            return (
              <button
                key={rule.id}
                onClick={() => setSelectedRuleId(rule.id)}
                className={cn(
                  "w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1.5 group select-none relative cursor-pointer",
                  isSelected
                    ? "bg-indigo-50/80 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/40 text-zinc-900 dark:text-white"
                    : "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                )}
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="text-xs font-medium truncate">{rule.name}</span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0",
                    rule.isActive
                      ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                  )}>
                    {rule.isActive ? 'Active' : 'Paused'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between w-full pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                  <span className="text-[10px] text-zinc-400">
                    {isQuickAction ? 'Quick Action' : `${(rule.actions || []).length} steps`}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <div 
                      onClick={(e) => handleToggleActive(rule, e)}
                      className="p-0.5 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-colors"
                      title={rule.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {rule.isActive ? <ToggleRight size={13} className="text-emerald-500" /> : <ToggleLeft size={13} />}
                    </div>
                    <div 
                      onClick={(e) => handleDeleteRule(rule.id, e)}
                      className="p-0.5 rounded text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
          {!loading && filteredAutomations.length === 0 && (
            <p className="text-xs text-zinc-400 text-center py-8">No automations found</p>
          )}
        </div>
      </aside>
      )}

      {selectedRuleId !== null ? (
        <>
          {/* COLUMN 2 (Center): Zapier/Jira-Style Vertical Flow Pipeline */}
          <main className="flex-1 bg-zinc-50/70 dark:bg-zinc-950 bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:20px_20px] flex flex-col min-w-0 overflow-hidden">
            {/* Aligned h-11 Top Bar */}
            <div className="h-11 px-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {leftSidebarCollapsed && (
                  <button
                    type="button"
                    onClick={() => setLeftSidebarCollapsed(false)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 transition-colors cursor-pointer shrink-0"
                  >
                    <ChevronRight size={13} />
                    <span>Automations</span>
                  </button>
                )}
                <Zap size={14} className="text-indigo-500 shrink-0" />
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {name || 'Untitled Automation'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 shrink-0">
                  {actions.length} {actions.length === 1 ? 'action' : 'actions'}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActionSearch('');
                    setActionCategory('All');
                    setShowActionModal(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Add Action</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestRun}
                  disabled={isTestingRun}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors cursor-pointer"
                  title="Trigger a test run"
                >
                  <Play size={12} className="text-indigo-500" />
                  <span>{isTestingRun ? 'Running...' : 'Test Run'}</span>
                </button>
                {onSaveRule && selectedRule && (
                  <button
                    type="button"
                    onClick={() => onSaveRule(selectedRule)}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 size={12} />
                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
                  </button>
                )}
                {rightSidebarCollapsed && (
                  <button
                    type="button"
                    onClick={() => setRightSidebarCollapsed(false)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={13} />
                    <span>Settings</span>
                  </button>
                )}
              </div>
            </div>

            {/* Vertical Pipeline Canvas */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-7 custom-scrollbar">
              <div className="max-w-2xl mx-auto flex flex-col items-center">
                {/* 1. WHEN — Trigger Card */}
                {(() => {
                  const activeTrigger = TRIGGER_CATALOG.find(t => t.id === triggerType) || {
                    id: triggerType,
                    label: triggerType,
                    category: 'Event',
                    desc: 'Triggers this automation flow'
                  };
                  return (
                    <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <Zap size={17} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold uppercase tracking-wide">
                              When
                            </span>
                            <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                              {activeTrigger.label}
                            </h3>
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                            {activeTrigger.desc}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTriggerSearch('');
                          setShowTriggerModal(true);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer shrink-0"
                      >
                        Change
                      </button>
                    </div>
                  );
                })()}

                <div className="w-px h-5 bg-zinc-300 dark:bg-zinc-700" />

                {/* 2. IF — Filter Conditions Card */}
                <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xs px-4 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Filter size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-semibold uppercase tracking-wide">
                          If
                        </span>
                        <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {isAdvancedCondition && conditions
                            ? 'Custom expression filter'
                            : visualConditions.length > 0
                              ? `Match ${conditionMatchType === 'OR' ? 'ANY' : 'ALL'} of ${visualConditions.length} condition${visualConditions.length === 1 ? '' : 's'}`
                              : 'All matching records (no filter)'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (visualConditions.length === 0 && !isAdvancedCondition) {
                        handleAddConditionRow();
                      }
                      setRightSidebarCollapsed(false);
                      setRightSidebarTab('properties');
                      setTimeout(() => {
                        preconditionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 60);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer shrink-0"
                  >
                    {visualConditions.length > 0 || conditions ? 'Edit' : '+ Filter'}
                  </button>
                </div>

                <div className="w-px h-5 bg-zinc-300 dark:bg-zinc-700" />

                {/* 3. THEN — Action Steps */}
                <div className="w-full space-y-3">
              {actions.map((action: any, idx: number) => (
                <div 
                  key={idx}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "bg-white dark:bg-zinc-900 border rounded-2xl shadow-sm transition-all duration-200",
                    draggedIndex === idx ? "opacity-35 border-dashed border-indigo-400" : "border-zinc-200 dark:border-zinc-800",
                    dragOverIndex === idx && draggedIndex !== idx ? "border-t-4 border-t-indigo-500 scale-[0.99] translate-y-1" : ""
                  )}
                >
                  <div 
                    onClick={() => setExpandedActionIdx(expandedActionIdx === idx ? null : idx)}
                    className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors select-none rounded-t-2xl"
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical size={14} className="text-zinc-400 cursor-grab active:cursor-grabbing shrink-0" />
                      <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                      <div>
                        <p className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
                          {action.config?.stepName || action.type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-[8px] text-zinc-400 mt-0.5">
                          {action.config?.stepName ? action.type.replace(/_/g, ' ') : 'Configure step details'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateAction(idx);
                        }}
                        className="p-1.5 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-500/5 rounded-lg transition-all cursor-pointer"
                        title="Duplicate Step"
                      >
                        <Copy size={12} />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveAction(idx);
                        }}
                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all cursor-pointer"
                        title="Remove Step"
                      >
                        <Trash2 size={12} />
                      </button>
                      {expandedActionIdx === idx ? <ChevronUp size={14} className="text-zinc-400" /> : <ChevronDown size={14} className="text-zinc-400" />}
                    </div>
                  </div>

                  {expandedActionIdx === idx && (
                    <div className="px-6 pb-6 pt-4 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/20 space-y-4">
                      {/* Step Name / Label Input */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400">Step Custom Label</label>
                        <input
                          type="text"
                          placeholder="e.g. Send manager approval alert"
                          value={action.config?.stepName || ''}
                          onChange={(e) => {
                            const updated = [...actions];
                            if (!updated[idx].config) updated[idx].config = {};
                            updated[idx].config.stepName = e.target.value;
                            setActions(updated);
                          }}
                          className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                                           {/* Create Record Form */}
                      {action.type === 'CREATE_RECORD' && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Target Module</label>
                            <select 
                              value={action.config.targetModuleId || ''}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.targetModuleId = e.target.value;
                                setActions(updated);
                              }}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white cursor-pointer"
                            >
                              <option value="">Select a Module...</option>
                              {modules?.map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between mb-1">
                              <div>
                                <label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Set Field Values</label>
                                <p className="text-[8px] text-zinc-400">Specify what information should be filled into the record.</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setFieldsEditorModes(prev => ({
                                    ...prev,
                                    [idx]: prev[idx] === 'json' ? 'visual' : 'json'
                                  }));
                                }}
                                className={cn(
                                  "p-1 rounded text-zinc-400 hover:text-indigo-500 hover:bg-indigo-500/5 transition-all text-[8px] font-bold flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 cursor-pointer",
                                  fieldsEditorModes[idx] === 'json' && "text-indigo-500 border-indigo-500/20 bg-indigo-500/5"
                                )}
                                title="Toggle JSON Editor"
                              >
                                <Code size={9} />
                                {fieldsEditorModes[idx] === 'json' ? 'Visual Builder' : 'Developer Syntax'}
                              </button>
                            </div>

                            {fieldsEditorModes[idx] === 'json' ? (
                              <textarea 
                                value={action.config.fields_raw_text !== undefined ? action.config.fields_raw_text : JSON.stringify(action.config.fields || {}, null, 2)}
                                onChange={(e) => {
                                  const updated = [...actions];
                                  updated[idx].config.fields_raw_text = e.target.value;
                                  try {
                                    updated[idx].config.fields = JSON.parse(e.target.value);
                                  } catch (err) {
                                    // Parse failed, don't update structured fields yet
                                  }
                                  setActions(updated);
                                }}
                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 font-mono text-[9px] text-zinc-900 dark:text-white h-28 focus:outline-none focus:border-indigo-500/50"
                                placeholder={`{\n  "fieldName": "{{ trigger.record.sourceField }}",\n  "status": "Active"\n}`}
                              />
                            ) : (
                              <VisualFieldsMapper
                                fieldsObj={action.config.fields || {}}
                                onChange={(updatedFields) => {
                                  const updated = [...actions];
                                  updated[idx].config.fields = updatedFields;
                                  // Clean raw text cache
                                  delete updated[idx].config.fields_raw_text;
                                  setActions(updated);
                                }}
                                targetModuleId={action.config.targetModuleId}
                                triggerModuleId={moduleId}
                                actionIdx={idx}
                                triggerFields={fields}
                                modules={modules || []}
                                actions={actions}
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Set Assignee Form */}
                      {action.type === 'SET_ASSIGNEE' && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Target Record Type</label>
                            <select 
                              value={action.config.targetType || 'TRIGGERING'}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.targetType = e.target.value;
                                setActions(updated);
                              }}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white cursor-pointer"
                            >
                              <option value="TRIGGERING">Triggering Record</option>
                              <option value="SPECIFIC">Specific Record ID Reference</option>
                            </select>
                          </div>
                          {action.config.targetType === 'SPECIFIC' && (
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400">Record ID Reference</label>
                              <input 
                                type="text"
                                value={action.config.recordId || ''}
                                onChange={(e) => {
                                  const updated = [...actions];
                                  updated[idx].config.recordId = e.target.value;
                                  setActions(updated);
                                }}
                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
                                placeholder="e.g. {{ steps.0.output.id }}"
                              />
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400">Assignment Type</label>
                              <select
                                value={action.config.assignmentType || 'USER'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const updated = [...actions];
                                  updated[idx].config.assignmentType = val;
                                  // Clear other values when changing type
                                  if (val === 'USER') {
                                    updated[idx].config.teamId = '';
                                    updated[idx].config.positionId = '';
                                  } else if (val === 'TEAM') {
                                    updated[idx].config.assigneeId = '';
                                    updated[idx].config.positionId = '';
                                    updated[idx].config.strategy = 'ROUND_ROBIN';
                                  } else if (val === 'POSITION') {
                                    updated[idx].config.assigneeId = '';
                                    updated[idx].config.teamId = '';
                                    updated[idx].config.strategy = 'ROUND_ROBIN';
                                  }
                                  setActions(updated);
                                }}
                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white cursor-pointer focus:outline-none"
                              >
                                <option value="USER">Specific User</option>
                                <option value="TEAM">Team (Workforce)</option>
                                <option value="POSITION">Position (Role)</option>
                              </select>
                            </div>

                            {(!action.config.assignmentType || action.config.assignmentType === 'USER') ? (
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-400">Assign To User</label>
                                <AssigneeSelect
                                  value={action.config.assigneeId || ''}
                                  onChange={(val) => {
                                    const updated = [...actions];
                                    updated[idx].config.assigneeId = val;
                                    setActions(updated);
                                  }}
                                  members={members}
                                />
                              </div>
                            ) : action.config.assignmentType === 'TEAM' ? (
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-400">Select Team</label>
                                <select
                                  value={action.config.teamId || ''}
                                  onChange={(e) => {
                                    const updated = [...actions];
                                    updated[idx].config.teamId = e.target.value;
                                    setActions(updated);
                                  }}
                                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white cursor-pointer focus:outline-none"
                                >
                                  <option value="">Select Team...</option>
                                  {teams?.map((t: any) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-400">Select Position</label>
                                <select
                                  value={action.config.positionId || ''}
                                  onChange={(e) => {
                                    const updated = [...actions];
                                    updated[idx].config.positionId = e.target.value;
                                    setActions(updated);
                                  }}
                                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white cursor-pointer focus:outline-none"
                                >
                                  <option value="">Select Position...</option>
                                  {positions?.map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.title}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>

                          {(action.config.assignmentType === 'TEAM' || action.config.assignmentType === 'POSITION') && (
                            <div className="bg-zinc-900/10 dark:bg-zinc-950/20 border border-zinc-200/20 dark:border-zinc-900/40 p-2.5 rounded-xl text-[9px] text-zinc-500 flex items-center gap-2">
                              <Sparkles size={11} className="text-indigo-400 shrink-0" />
                              <span>
                                <strong>Round-Robin Auto-balancing:</strong> The system will assign new records to the active member who was assigned a record least recently.
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Update Record Form */}
                      {action.type === 'UPDATE_RECORD' && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Target Record Type</label>
                            <select 
                              value={action.config.targetType || 'TRIGGERING'}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.targetType = e.target.value;
                                setActions(updated);
                              }}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white cursor-pointer"
                            >
                              <option value="TRIGGERING">Triggering Record</option>
                              <option value="SPECIFIC">Specific Record ID Reference</option>
                            </select>
                          </div>
                          {action.config.targetType === 'SPECIFIC' && (
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400">Record ID Reference</label>
                              <input 
                                type="text"
                                value={action.config.recordId || ''}
                                onChange={(e) => {
                                  const updated = [...actions];
                                  updated[idx].config.recordId = e.target.value;
                                  setActions(updated);
                                }}
                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
                                placeholder="e.g. {{ steps.0.output.id }}"
                              />
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between mb-1">
                              <div>
                                <label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Set Field Values</label>
                                <p className="text-[8px] text-zinc-400">Specify what fields to update on the record.</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setFieldsEditorModes(prev => ({
                                    ...prev,
                                    [idx]: prev[idx] === 'json' ? 'visual' : 'json'
                                  }));
                                }}
                                className={cn(
                                  "p-1 rounded text-zinc-400 hover:text-indigo-500 hover:bg-indigo-500/5 transition-all text-[8px] font-bold flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 cursor-pointer",
                                  fieldsEditorModes[idx] === 'json' && "text-indigo-500 border-indigo-500/20 bg-indigo-500/5"
                                )}
                                title="Toggle JSON Editor"
                              >
                                <Code size={9} />
                                {fieldsEditorModes[idx] === 'json' ? 'Visual Builder' : 'Developer Syntax'}
                              </button>
                            </div>

                            {fieldsEditorModes[idx] === 'json' ? (
                              <textarea 
                                value={action.config.fields_raw_text !== undefined ? action.config.fields_raw_text : JSON.stringify(action.config.fields || {}, null, 2)}
                                onChange={(e) => {
                                  const updated = [...actions];
                                  updated[idx].config.fields_raw_text = e.target.value;
                                  try {
                                    updated[idx].config.fields = JSON.parse(e.target.value);
                                  } catch (err) {
                                    // Parse failed, don't update structured fields yet
                                  }
                                  setActions(updated);
                                }}
                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 font-mono text-[9px] text-zinc-900 dark:text-white h-28 focus:outline-none focus:border-indigo-500/50"
                                placeholder={`{\n  "status": "Paid"\n}`}
                              />
                            ) : (
                              <VisualFieldsMapper
                                fieldsObj={action.config.fields || {}}
                                onChange={(updatedFields) => {
                                  const updated = [...actions];
                                  updated[idx].config.fields = updatedFields;
                                  // Clean raw text cache
                                  delete updated[idx].config.fields_raw_text;
                                  setActions(updated);
                                }}
                                targetModuleId={action.config.targetType === 'TRIGGERING' ? (moduleId || undefined) : undefined}
                                triggerModuleId={moduleId}
                                actionIdx={idx}
                                triggerFields={fields}
                                modules={modules || []}
                                actions={actions}
                              />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Get Record Form */}
                      {action.type === 'GET_RECORD' && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Fetch Module Source</label>
                            <select 
                              value={action.config.targetModuleId || ''}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.targetModuleId = e.target.value;
                                setActions(updated);
                              }}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white cursor-pointer"
                            >
                              <option value="">Select Module...</option>
                              {modules?.map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400">Query Field Key</label>
                              <input 
                                type="text"
                                value={action.config.queryField || ''}
                                onChange={(e) => {
                                  const updated = [...actions];
                                  updated[idx].config.queryField = e.target.value;
                                  setActions(updated);
                                }}
                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
                                placeholder="e.g. email"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400">Query Match Value</label>
                              <input 
                                type="text"
                                value={action.config.queryValue || ''}
                                onChange={(e) => {
                                  const updated = [...actions];
                                  updated[idx].config.queryValue = e.target.value;
                                  setActions(updated);
                                }}
                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
                                placeholder="e.g. {{ trigger.record.applicantEmail }}"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Delay Form */}
                      {action.type === 'DELAY' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-400">Delay Duration (Seconds)</label>
                          <input 
                            type="number"
                            value={action.config.delaySeconds || ''}
                            onChange={(e) => {
                              const updated = [...actions];
                              updated[idx].config.delaySeconds = e.target.value;
                              setActions(updated);
                            }}
                            className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
                            placeholder="e.g. 5"
                          />
                        </div>
                      )}

                      {/* Gemini Prompt Form */}
                      {action.type === 'GEMINI_PROMPT' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-400">Prompt Template</label>
                          <textarea 
                            value={action.config.prompt || ''}
                            onChange={(e) => {
                              const updated = [...actions];
                              updated[idx].config.prompt = e.target.value;
                              setActions(updated);
                            }}
                            className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white h-24 focus:outline-none focus:border-indigo-500/50"
                            placeholder="Analyze: {{ trigger.record.description }}"
                          />
                        </div>
                      )}

                      {/* Generate PDF Form */}
                      {action.type === 'GENERATE_PDF' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-400">PDF Template Identifier</label>
                          <input 
                            type="text"
                            value={action.config.template || ''}
                            onChange={(e) => {
                              const updated = [...actions];
                              updated[idx].config.template = e.target.value;
                              setActions(updated);
                            }}
                            className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
                            placeholder="e.g. Invoice Template"
                          />
                        </div>
                      )}

                      {/* Google Sheets Sync Form */}
                      {action.type === 'GOOGLE_SHEETS_SYNC' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-400">Google Sheet ID</label>
                          <input 
                            type="text"
                            value={action.config.sheetId || ''}
                            onChange={(e) => {
                              const updated = [...actions];
                              updated[idx].config.sheetId = e.target.value;
                              setActions(updated);
                            }}
                            className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
                            placeholder="e.g. 1a2b3c4d5e6f"
                          />
                        </div>
                      )}

                      {/* Stripe Payment Link Form */}
                      {action.type === 'STRIPE_PAYMENT_LINK' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-400">Charge Amount (in Cents)</label>
                          <input 
                            type="number"
                            value={action.config.amount || ''}
                            onChange={(e) => {
                              const updated = [...actions];
                              updated[idx].config.amount = parseInt(e.target.value, 10) || 0;
                              setActions(updated);
                            }}
                            className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
                            placeholder="e.g. 1000 for $10.00"
                          />
                        </div>
                      )}

                      {/* Route To Module Form */}
                      {action.type === 'ROUTE_TO_MODULE' && (
                        <div className="space-y-3 text-left">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Destination Module</label>
                            <select 
                              value={action.config.targetModuleId || ''}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.targetModuleId = e.target.value;
                                setActions(updated);
                              }}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white cursor-pointer"
                            >
                              <option value="">Select Target Module...</option>
                              {modules?.filter((m: any) => m.id !== moduleId).map((m: any) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Fields Mapping Template (JSON)</label>
                            <textarea 
                              value={typeof action.config.fieldMapping === 'object' ? JSON.stringify(action.config.fieldMapping, null, 2) : action.config.fieldMapping || ''}
                              onChange={(e) => {
                                const updated = [...actions];
                                try {
                                  updated[idx].config.fieldMapping = JSON.parse(e.target.value);
                                } catch {
                                  updated[idx].config.fieldMapping = e.target.value;
                                }
                                setActions(updated);
                              }}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 font-mono text-[10px] text-zinc-900 dark:text-white h-24 focus:outline-none"
                              placeholder='{\n  "target_field": "{{ trigger.record.source_field }}"\n}'
                            />
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer text-[10px] text-zinc-400 font-bold select-none pt-1">
                            <input 
                              type="checkbox"
                              checked={action.config.archiveSource !== false}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.archiveSource = e.target.checked;
                                setActions(updated);
                              }}
                              className="rounded border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-indigo-600"
                            />
                            Archive source Intake record automatically upon routing
                          </label>
                        </div>
                      )}

                      {/* Create Reminder Form */}
                      {action.type === 'CREATE_REMINDER' && (
                        <div className="space-y-3 text-left">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Reminder Title / Task</label>
                            <input 
                              type="text"
                              value={action.config.title || ''}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.title = e.target.value;
                                setActions(updated);
                              }}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
                              placeholder="e.g. Follow up on proposal with {{clientName}}"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400">Due Date / Relative Offset</label>
                              <input 
                                type="text"
                                value={action.config.dueOffset || ''}
                                onChange={(e) => {
                                  const updated = [...actions];
                                  updated[idx].config.dueOffset = e.target.value;
                                  setActions(updated);
                                }}
                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
                                placeholder="+3 days at 09:00"
                              />
                              <p className="text-[8px] text-zinc-400">e.g. +1 day, +3 days at 09:00, +2 hours, or tomorrow</p>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400">Priority Level</label>
                              <select 
                                value={action.config.priority || 'MEDIUM'}
                                onChange={(e) => {
                                  const updated = [...actions];
                                  updated[idx].config.priority = e.target.value;
                                  setActions(updated);
                                }}
                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white cursor-pointer"
                              >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Assigned To (Member ID or Token)</label>
                            <input 
                              type="text"
                              value={action.config.assignedTo || ''}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.assignedTo = e.target.value;
                                setActions(updated);
                              }}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
                              placeholder="e.g. {{ownerId}}, {{assignedToId}}, or leave blank for record creator"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Additional Instructions / Context</label>
                            <textarea 
                              value={action.config.description || ''}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.description = e.target.value;
                                setActions(updated);
                              }}
                              rows={2}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
                              placeholder="Optional context for the assignee..."
                            />
                          </div>
                        </div>
                      )}

                      {/* Complete Reminder Form */}
                      {action.type === 'COMPLETE_REMINDER' && (
                        <div className="space-y-3 text-left">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Match Mode</label>
                            <select 
                              value={action.config.match || 'ALL_ON_RECORD'}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.match = e.target.value;
                                setActions(updated);
                              }}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white cursor-pointer"
                            >
                              <option value="ALL_ON_RECORD">Complete All Open Reminders on Record</option>
                              <option value="BY_TITLE">Complete Reminders Matching Title</option>
                            </select>
                          </div>

                          {action.config.match === 'BY_TITLE' && (
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400">Title Contains</label>
                              <input 
                                type="text"
                                value={action.config.titleContains || ''}
                                onChange={(e) => {
                                  const updated = [...actions];
                                  updated[idx].config.titleContains = e.target.value;
                                  setActions(updated);
                                }}
                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
                                placeholder="e.g. Follow up on payment"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Create Note Form */}
                      {action.type === 'CREATE_NOTE' && (
                        <div className="space-y-3 text-left">
                          <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2 space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400">Note Title (Optional)</label>
                              <input 
                                type="text"
                                value={action.config.title || ''}
                                onChange={(e) => {
                                  const updated = [...actions];
                                  updated[idx].config.title = e.target.value;
                                  setActions(updated);
                                }}
                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
                                placeholder="e.g. Automated Triage Note"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400">Badge Color</label>
                              <select 
                                value={action.config.color || 'zinc'}
                                onChange={(e) => {
                                  const updated = [...actions];
                                  updated[idx].config.color = e.target.value;
                                  setActions(updated);
                                }}
                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white cursor-pointer"
                              >
                                <option value="zinc">Zinc (Neutral)</option>
                                <option value="yellow">Yellow (Attention)</option>
                                <option value="blue">Blue (Info)</option>
                                <option value="emerald">Emerald (Success)</option>
                                <option value="purple">Purple (Special)</option>
                                <option value="rose">Rose (Urgent)</option>
                                <option value="amber">Amber (Warning)</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Note Body (Supports Markdown & Tokens)</label>
                            <textarea 
                              value={action.config.body || ''}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.body = e.target.value;
                                setActions(updated);
                              }}
                              rows={3}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50 font-mono"
                              placeholder="e.g. Stage updated to **{{status}}** by {{updatedBy}}."
                            />
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700 dark:text-zinc-300">
                            <input 
                              type="checkbox"
                              checked={Boolean(action.config.isPinned)}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.isPinned = e.target.checked;
                                setActions(updated);
                              }}
                              className="rounded border-zinc-700 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>Pin this note to the top of the record view</span>
                          </label>
                        </div>
                      )}

                      {/* Pin Record Note Form */}
                      {action.type === 'PIN_RECORD_NOTE' && (
                        <div className="space-y-3 text-left">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Banner Alert Title</label>
                            <input 
                              type="text"
                              value={action.config.title || ''}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.title = e.target.value;
                                setActions(updated);
                              }}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
                              placeholder="e.g. High Priority Customer Alert"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Banner Notice Content</label>
                            <textarea 
                              value={action.config.body || ''}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.body = e.target.value;
                                setActions(updated);
                              }}
                              rows={2}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
                              placeholder="e.g. Requires executive sign-off before discount approval."
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Alert Color</label>
                            <select 
                              value={action.config.color || 'amber'}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.color = e.target.value;
                                setActions(updated);
                              }}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white cursor-pointer"
                            >
                              <option value="amber">Amber (Warning)</option>
                              <option value="rose">Rose (Urgent / Danger)</option>
                              <option value="indigo">Indigo (Information)</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {/* If Condition Form */}
                      {action.type === 'IF_CONDITION' && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">JavaScript Condition</label>
                            <input 
                              type="text"
                              value={action.config.condition || ''}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.condition = e.target.value;
                                setActions(updated);
                              }}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
                              placeholder="e.g. score > 80"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Nested Steps Config (JSON)</label>
                            <textarea 
                              value={JSON.stringify({ thenSteps: action.config.thenSteps || [], elseSteps: action.config.elseSteps || [] }, null, 2)}
                              onChange={(e) => {
                                try {
                                  const parsed = JSON.parse(e.target.value);
                                  const updated = [...actions];
                                  updated[idx].config.thenSteps = parsed.thenSteps || [];
                                  updated[idx].config.elseSteps = parsed.elseSteps || [];
                                  setActions(updated);
                                } catch (err) {}
                              }}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 font-mono text-[9px] text-zinc-900 dark:text-white h-36 focus:outline-none focus:border-indigo-500/50"
                            />
                          </div>
                        </div>
                      )}

                      {/* Switch Case Form */}
                      {action.type === 'SWITCH_CASE' && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Switch Variable/Value</label>
                            <input 
                              type="text"
                              value={action.config.switchValue || ''}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.switchValue = e.target.value;
                                setActions(updated);
                              }}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
                              placeholder="e.g. {{ trigger.record.status }}"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Cases and Nested Steps (JSON)</label>
                            <textarea 
                              value={JSON.stringify({ cases: action.config.cases || {}, defaultSteps: action.config.defaultSteps || [] }, null, 2)}
                              onChange={(e) => {
                                try {
                                  const parsed = JSON.parse(e.target.value);
                                  const updated = [...actions];
                                  updated[idx].config.cases = parsed.cases || {};
                                  updated[idx].config.defaultSteps = parsed.defaultSteps || [];
                                  setActions(updated);
                                } catch (err) {}
                              }}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 font-mono text-[9px] text-zinc-900 dark:text-white h-36 focus:outline-none focus:border-indigo-500/50"
                            />
                          </div>
                        </div>
                      )}

                      {/* Loop For Each Form */}
                      {action.type === 'LOOP_FOREACH' && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Array Path Reference</label>
                            <input 
                              type="text"
                              value={action.config.arrayPath || ''}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.arrayPath = e.target.value;
                                setActions(updated);
                              }}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
                              placeholder="e.g. trigger.record.items"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Loop Steps Config (JSON)</label>
                            <textarea 
                              value={JSON.stringify({ loopSteps: action.config.loopSteps || [] }, null, 2)}
                              onChange={(e) => {
                                try {
                                  const parsed = JSON.parse(e.target.value);
                                  const updated = [...actions];
                                  updated[idx].config.loopSteps = parsed.loopSteps || [];
                                  setActions(updated);
                                } catch (err) {}
                              }}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 font-mono text-[9px] text-zinc-900 dark:text-white h-36 focus:outline-none focus:border-indigo-500/50"
                            />
                          </div>
                        </div>
                      )}

                      {/* Send Email Form */}
                      {action.type === 'SEND_EMAIL' && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Recipient Email (To)</label>
                            <input 
                              type="text"
                              value={action.config.to || ''}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.to = e.target.value;
                                setActions(updated);
                              }}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
                              placeholder="e.g. {{ trigger.record.email }}"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Subject</label>
                            <input 
                              type="text"
                              value={action.config.subject || ''}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.subject = e.target.value;
                                setActions(updated);
                              }}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
                              placeholder="e.g. Receipt for Application {{ trigger.record.id }}"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Body</label>
                            <textarea 
                              value={action.config.body || ''}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.body = e.target.value;
                                setActions(updated);
                              }}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white h-24 focus:outline-none focus:border-indigo-500/50"
                              placeholder="Hi {{ trigger.record.firstName }},\n\nYour application has been received."
                            />
                          </div>
                        </div>
                      )}

                      {/* Send Internal Ping Form */}
                      {action.type === 'SEND_INTERNAL_PING' && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Notification Channel</label>
                            <input 
                              type="text"
                              value={action.config.channel || ''}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.channel = e.target.value;
                                setActions(updated);
                              }}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
                              placeholder="e.g. billing-alerts"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Ping Message</label>
                            <textarea 
                              value={action.config.message || ''}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.message = e.target.value;
                                setActions(updated);
                              }}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white h-16 focus:outline-none focus:border-indigo-500/50"
                              placeholder="High value application received: {{ trigger.record.id }} amount: {{ trigger.record.amount }}"
                            />
                          </div>
                        </div>
                      )}

                      {/* Invoke AI Agent Form */}
                      {action.type === 'INVOKE_AGENT' && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Select Digital Coworker</label>
                            <select
                              value={action.config.agentId || ''}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.agentId = e.target.value;
                                setActions(updated);
                              }}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
                            >
                              <option value="">-- Choose an Agent --</option>
                              {agentsList.map(ag => (
                                <option key={ag.id} value={ag.id}>
                                  {ag.name} {ag.role ? `(${ag.role})` : ''}
                                </option>
                              ))}
                              {agentsList.length === 0 && (
                                <option value="default_agent">General Platform Assistant</option>
                              )}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Prompt / Task Directives</label>
                            <textarea 
                              value={action.config.promptTemplate || ''}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.promptTemplate = e.target.value;
                                setActions(updated);
                              }}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white h-20 focus:outline-none focus:border-indigo-500/50 font-mono"
                              placeholder="Review record {{record.title}} and draft a compliance summary..."
                            />
                            <p className="text-[9px] text-zinc-400">Supports variable injection like `{'{{record.field}}'}` or `{'{{trigger.id}}'}`.</p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Result Output Variable</label>
                            <input 
                              type="text"
                              value={action.config.outputVariable || 'agent_result'}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.outputVariable = e.target.value;
                                setActions(updated);
                              }}
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500/50"
                              placeholder="agent_result"
                            />
                          </div>
                        </div>
                      )}

                      {/* Allocate Service Desk Session Form */}
                      {action.type === 'ALLOCATE_SERVICE_DESK_SESSION' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400">Owner Type</label>
                              <select
                                value={action.config.ownerType || 'AI_AGENT'}
                                onChange={(e) => {
                                  const updated = [...actions];
                                  updated[idx].config.ownerType = e.target.value;
                                  setActions(updated);
                                }}
                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white"
                              >
                                <option value="AI_AGENT">AI Agent (Agent Builder)</option>
                                <option value="HUMAN">Human Operator</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400">Target Owner / Agent ID</label>
                              <input
                                type="text"
                                value={action.config.ownerId || ''}
                                onChange={(e) => {
                                  const updated = [...actions];
                                  updated[idx].config.ownerId = e.target.value;
                                  setActions(updated);
                                }}
                                placeholder="Agent or Member ID"
                                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Send Service Desk Message Form */}
                      {action.type === 'SEND_SERVICE_DESK_MESSAGE' && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">Message Content</label>
                            <textarea
                              value={action.config.message || ''}
                              onChange={(e) => {
                                const updated = [...actions];
                                updated[idx].config.message = e.target.value;
                                setActions(updated);
                              }}
                              placeholder="Hello {{ trigger.record.visitorName }}, your specialist has been notified..."
                              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-900 dark:text-white h-20"
                            />
                          </div>
                        </div>
                      )}
                      {/* Outbound Webhook Form */}
                      {action.type === 'WEBHOOK' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                            <div className="space-y-1">
                              <label className="text-[11px] font-medium text-zinc-500">Method</label>
                              <select
                                value={action.config.method || 'POST'}
                                onChange={(e) => {
                                  const updated = [...actions];
                                  updated[idx].config.method = e.target.value;
                                  setActions(updated);
                                }}
                                className="w-full h-8 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 text-xs text-zinc-900 dark:text-white"
                              >
                                <option value="POST">POST</option>
                                <option value="PUT">PUT</option>
                                <option value="PATCH">PATCH</option>
                                <option value="GET">GET</option>
                              </select>
                            </div>
                            <div className="sm:col-span-3 space-y-1">
                              <label className="text-[11px] font-medium text-zinc-500">Endpoint URL</label>
                              <input
                                type="url"
                                value={action.config.url || ''}
                                onChange={(e) => {
                                  const updated = [...actions];
                                  updated[idx].config.url = e.target.value;
                                  setActions(updated);
                                }}
                                placeholder="https://api.example.com/webhook"
                                className="w-full h-8 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-xs font-mono text-zinc-900 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step Error Policy */}
                      <div className="pt-2.5 mt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-zinc-500">On step failure</span>
                        <select
                          value={action.onError || 'stop'}
                          onChange={(e) => {
                            const updated = [...actions];
                            updated[idx] = { ...updated[idx], onError: e.target.value };
                            setActions(updated);
                          }}
                          className="h-7 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 text-[11px] text-zinc-700 dark:text-zinc-300 cursor-pointer"
                        >
                          <option value="stop">Stop automation</option>
                          <option value="continue">Continue to next step</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ))}
                </div>

                {actions.length > 0 && <div className="w-px h-5 bg-zinc-300 dark:bg-zinc-700" />}

                {/* Add Action CTA */}
                <button
                  type="button"
                  onClick={() => {
                    setActionSearch('');
                    setActionCategory('All');
                    setShowActionModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-medium text-zinc-700 dark:text-zinc-200 shadow-2xs transition-colors cursor-pointer"
                >
                  <Plus size={14} className="text-indigo-500" />
                  <span>{actions.length === 0 ? 'Add first action' : 'Add action'}</span>
                </button>
              </div>
            </div>
          </main>

          {/* COLUMN 4: Properties Sidebar & Logs History */}
          {!rightSidebarCollapsed && (
          <aside
            style={{ width: rightSidebarWidth }}
            className="relative flex-shrink-0 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col"
          >
            <div
              onMouseDown={(e) => startSidebarResize('right', e)}
              className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500/40 active:bg-indigo-500/60 transition-colors z-30"
              title="Drag to resize properties panel"
            />
            
            {/* Aligned h-11 Header Settings vs Runs History Tabs */}
            <div className="h-11 px-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5 shrink-0">
              <div className="flex-1 grid grid-cols-2 gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg">
                <button
                  onClick={() => setRightSidebarTab('properties')}
                  className={cn(
                    "py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                    rightSidebarTab === 'properties'
                      ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  Settings
                </button>
                <button
                  onClick={() => {
                    setRightSidebarTab('runs');
                    viewRuns(selectedRule);
                  }}
                  className={cn(
                    "py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5",
                    rightSidebarTab === 'runs'
                      ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  <Clock size={12} />
                  Runs
                </button>
              </div>
              <button
                type="button"
                onClick={() => setRightSidebarCollapsed(true)}
                className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                title="Collapse settings"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="flex-1 p-4 flex flex-col gap-5 overflow-y-auto custom-scrollbar">

            {rightSidebarTab === 'properties' ? (
              <div className="space-y-6 flex-1">
                
                {/* Properties form */}
                <div className="space-y-3.5">
                  <h4 className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Properties</h4>
                  
                  <div className="space-y-3 bg-zinc-50/35 dark:bg-zinc-900/10 p-4 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500">Automation Name</label>
                      <input 
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Automation Name"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500">Description</label>
                      <input 
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Description"
                      />
                    </div>
                    {mode === 'global' && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500">Target Module</label>
                        <select
                          value={selectedRule?.moduleId || ''}
                          onChange={(e) => handleUpdateRuleProperty({ moduleId: e.target.value || null })}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">Global (Tenant-wide)</option>
                          {modules.map((m: any) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <label className="text-[10px] font-bold text-zinc-500 cursor-pointer select-none" htmlFor="activeToggle">Enabled</label>
                      <button
                        id="activeToggle"
                        type="button"
                        onClick={(e) => handleToggleActive(selectedRuleId === 'new' ? { isActive } : selectedRule, e)}
                        className="text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        {isActive ? (
                          <ToggleRight className="w-8 h-8 text-indigo-500" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Trigger configuration details */}
                {selectedRule && (
                  <div className="space-y-3">
                    <h4 className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Trigger Config</h4>
                    <div className="space-y-3 bg-zinc-50/35 dark:bg-zinc-900/10 p-4 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-500">Trigger Type</label>
                        <div className="text-xs font-bold text-indigo-655 dark:text-indigo-400 capitalize bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg max-w-max">
                          {triggerType.replace(/_/g, ' ')}
                        </div>
                      </div>

                      {/* If triggerType is FORM_SUBMITTED or CRON (Scheduled Interval) */}
                      {((moduleId && triageModule && moduleId === triageModule.id) || triggerType === 'FORM_SUBMITTED' || triggerType === 'CRON') && (
                        <div className="space-y-3 pt-1.5 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-500">Trigger Mode</label>
                            <select
                              value={
                                triggerType === 'CRON'
                                  ? (triggerConfig?.cronExpression === 'GLOBAL' ? 'GLOBAL_SCHEDULE' : 'CUSTOM_SCHEDULE')
                                  : 'IMMEDIATE'
                              }
                              onChange={(e) => {
                                const mode = e.target.value;
                                if (mode === 'IMMEDIATE') {
                                  setTriggerType('FORM_SUBMITTED');
                                } else if (mode === 'GLOBAL_SCHEDULE') {
                                  const updatedTrigger = {
                                    type: 'CRON',
                                    cronExpression: 'GLOBAL',
                                    moduleId: moduleId
                                  };
                                  handleUpdateRuleProperty({ triggers: [updatedTrigger] });
                                } else {
                                  const updatedTrigger = {
                                    type: 'CRON',
                                    cronExpression: '*/5 * * * *',
                                    moduleId: moduleId
                                  };
                                  handleUpdateRuleProperty({ triggers: [updatedTrigger] });
                                }
                              }}
                              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white cursor-pointer focus:outline-none focus:border-indigo-500"
                            >
                              <option value="IMMEDIATE">Immediately (On Form Submission)</option>
                              <option value="GLOBAL_SCHEDULE">Use Global Queue Schedule</option>
                              <option value="CUSTOM_SCHEDULE">Custom Schedule</option>
                            </select>
                          </div>

                          {triggerType === 'CRON' && triggerConfig?.cronExpression !== 'GLOBAL' && (
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-500">Distribution Schedule</label>
                                <select
                                  value={
                                    ['*/5 * * * *', '*/15 * * * *', '0 * * * *', '0 0 * * *'].includes(triggerConfig?.cronExpression || '')
                                      ? (triggerConfig?.cronExpression || '*/5 * * * *')
                                      : 'CUSTOM'
                                  }
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const updatedTrigger = { ...triggerConfig, type: 'CRON', moduleId: moduleId };
                                    if (val !== 'CUSTOM') {
                                      updatedTrigger.cronExpression = val;
                                    } else {
                                      updatedTrigger.cronExpression = '*/5 9-17 * * 1-5'; // Default custom cron
                                    }
                                    handleUpdateRuleProperty({ triggers: [updatedTrigger] });
                                  }}
                                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-white cursor-pointer focus:outline-none focus:border-indigo-500"
                                >
                                  <option value="*/5 * * * *">Every 5 Minutes</option>
                                  <option value="*/15 * * * *">Every 15 Minutes</option>
                                  <option value="0 * * * *">Hourly</option>
                                  <option value="0 0 * * *">Daily at Midnight</option>
                                  <option value="CUSTOM">Custom Cron Expression</option>
                                </select>
                              </div>

                              {(!['*/5 * * * *', '*/15 * * * *', '0 * * * *', '0 0 * * *'].includes(triggerConfig?.cronExpression || '') || triggerConfig?.cronExpression === 'CUSTOM') && (
                                <div className="space-y-1 animate-in fade-in duration-100">
                                  <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-500">Cron Expression</label>
                                  <input
                                    type="text"
                                    value={triggerConfig?.cronExpression || ''}
                                    onChange={(e) => {
                                      const updatedTrigger = {
                                        ...triggerConfig,
                                        type: 'CRON',
                                        cronExpression: e.target.value,
                                        moduleId: moduleId
                                      };
                                      handleUpdateRuleProperty({ triggers: [updatedTrigger] });
                                    }}
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 font-mono text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                                    placeholder="e.g. */5 9-17 * * 1-5"
                                  />
                                  <p className="text-[8px] text-zinc-400 leading-normal px-1">Five space-separated values: minute hour day-of-month month day-of-week.</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Preconditions visual editor */}
                <div ref={preconditionsRef} className="space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-1.5">
                    <h4 className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Precondition Gates</h4>
                    <button
                      type="button"
                      onClick={handleToggleAdvanced}
                      className="text-[8px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {isAdvancedCondition ? <Sparkles size={8} /> : <Code size={8} />}
                      <span>{isAdvancedCondition ? "Visual" : "Developer"}</span>
                    </button>
                  </div>

                  {isAdvancedCondition ? (
                    <div className="space-y-2">
                      <textarea 
                        value={conditions}
                        onChange={(e) => setConditions(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 font-mono text-[9.5px] text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 h-20"
                        placeholder="e.g. amount &gt; 5000"
                      />
                      <p className="text-[8px] text-zinc-400 leading-normal px-1">Write Javascript logical criteria. E.g. `amount &gt; 5000`.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {visualConditions.length > 0 && (
                        <div className="flex items-center gap-1 p-1 text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                          <span>Match</span>
                          <select
                            value={conditionMatchType}
                            onChange={(e) => setConditionMatchType(e.target.value as any)}
                            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-1.5 py-0.5 text-[9px] text-indigo-600 cursor-pointer"
                          >
                            <option value="AND">ALL (AND)</option>
                            <option value="OR">ANY (OR)</option>
                          </select>
                          <span>of:</span>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        {visualConditions.map((row: any) => {
                          const selectedField = fields.find(f => f.id === row.fieldId || f.name === row.fieldId);
                          const operators = getFieldOperators(selectedField);
                          
                          return (
                            <div key={row.id} className="p-3 bg-zinc-50/40 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800/80 rounded-xl flex flex-col gap-2 relative group animate-in fade-in duration-100">
                              <select
                                value={selectedField?.id || row.fieldId}
                                onChange={(e) => handleUpdateConditionRow(row.id, { fieldId: e.target.value })}
                                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-[10.5px] text-zinc-900 dark:text-white cursor-pointer"
                              >
                                <option value="">Select Field...</option>
                                {fields.filter(f => f.id).map(f => (
                                  <option key={f.id} value={f.id}>{f.label || f.name || f.id}</option>
                                ))}
                              </select>
                              
                              <div className="flex gap-2">
                                <select
                                  value={row.operator}
                                  onChange={(e) => handleUpdateConditionRow(row.id, { operator: e.target.value })}
                                  className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-[10.5px] text-zinc-900 dark:text-white cursor-pointer"
                                >
                                  {operators.map(op => (
                                    <option key={op.value} value={op.value}>{op.label}</option>
                                  ))}
                                </select>
                                
                                <button
                                  type="button"
                                  onClick={() => handleRemoveConditionRow(row.id)}
                                  className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-500/5 rounded transition-all shrink-0 cursor-pointer"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                              
                              {!['is_empty', 'is_not_empty'].includes(row.operator) && (
                                <div>
                                  {(selectedField?.type === 'checkbox' || selectedField?.type === 'boolean') ? (
                                    <select
                                      value={row.value}
                                      onChange={(e) => handleUpdateConditionRow(row.id, { value: e.target.value })}
                                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-[10.5px] text-zinc-900 dark:text-white cursor-pointer"
                                    >
                                      <option value="true">True</option>
                                      <option value="false">False</option>
                                    </select>
                                  ) : (
                                    <input
                                      type={(selectedField?.type === 'number' || selectedField?.type === 'currency') ? 'number' : 'text'}
                                      value={row.value}
                                      onChange={(e) => handleUpdateConditionRow(row.id, { value: e.target.value })}
                                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-[10.5px] text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                                      placeholder="Match value..."
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {visualConditions.length === 0 && (
                          <p className="text-[9px] text-zinc-400 italic text-center py-2">Automation will run unconditionally.</p>
                        )}
                        
                        <button
                          type="button"
                          onClick={handleAddConditionRow}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl text-[10px] font-bold transition-all w-full justify-center cursor-pointer"
                        >
                          <Plus size={11} />
                          Add Condition Row
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Variable tags helper */}
                <div className="bg-gradient-to-br from-indigo-500/5 via-violet-500/5 to-transparent border border-indigo-500/10 rounded-2xl p-4 flex-shrink-0 mt-auto">
                  <h5 className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                    <HelpCircle size={10} />
                    Context Variables
                  </h5>
                  <p className="text-[8px] text-zinc-500 leading-relaxed mt-1">
                    Reference properties with double curly braces `{"{{ ... }}"}`:
                  </p>
                  <ul className="text-[7.5px] text-zinc-400 mt-1.5 space-y-1 list-disc list-inside">
                    <li>`{"{{ trigger.record.field }}"}` - Trigger field</li>
                    <li>`{"{{ trigger.record.id }}"}` - Trigger ID</li>
                    <li>`{"{{ steps.0.output.id }}"}` - Action ID output</li>
                  </ul>
                </div>
              </div>
            ) : (
              /* Diagnostic Runs Log list */
              <div className="flex-grow flex flex-col gap-4 min-h-0">
                <div className="flex items-center justify-between flex-shrink-0">
                  <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Runs Audit Logs</h4>
                  <button 
                    onClick={() => viewRuns(selectedRule)}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                    title="Refresh logs"
                  >
                    <RefreshCw size={11} className={loadingRuns ? 'animate-spin' : ''} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {loadingRuns ? (
                    <div className="py-10 flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="animate-spin text-indigo-500 w-4 h-4" />
                      <span className="text-[10px] text-zinc-400">Loading runs...</span>
                    </div>
                  ) : runs.length === 0 ? (
                    <p className="text-[10.5px] text-zinc-400 italic text-center py-8">No execution history found.</p>
                  ) : (
                    runs.map((run) => (
                      <div 
                        key={run.id}
                        className="bg-zinc-50/20 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden"
                      >
                        <div 
                          onClick={() => setExpandedRunId(expandedRunId === run.id ? null : run.id)}
                          className="p-3 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50 select-none"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {run.status === 'SUCCESS' ? (
                              <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                            ) : (
                              <XCircle size={12} className="text-red-500 shrink-0" />
                            )}
                            <span className="text-[9.5px] font-bold text-zinc-700 dark:text-zinc-300 truncate">
                              ID: {run.id.substring(0, 8)}...
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            {run.completedAt && (
                              <span className="text-[8px] text-zinc-400 font-mono">
                                {Math.max(0, new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime())}ms
                              </span>
                            )}
                            {expandedRunId === run.id ? <ChevronUp size={12} className="text-zinc-400" /> : <ChevronDown size={12} className="text-zinc-400" />}
                          </div>
                        </div>

                        {expandedRunId === run.id && (
                          <div className="px-3 pb-3 pt-1 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/20 space-y-3">
                            <p className="text-[8px] text-zinc-400 leading-normal">
                              Triggered: {run.triggerSource} | {new Date(run.startedAt).toLocaleTimeString()}
                            </p>
                            
                            {run.errorMessage && (
                              <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-[8px] font-mono leading-normal break-all">
                                {run.errorMessage}
                              </div>
                            )}

                            <div className="space-y-1.5">
                              {((run.stepLogs as any[]) || []).map((step, sIdx) => (
                                <div key={sIdx} className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg flex flex-col gap-1">
                                  <div className="flex items-center justify-between text-[9px]">
                                    <span className="font-bold text-zinc-700 dark:text-zinc-300">{sIdx + 1}. {step.actionType}</span>
                                    <span className={cn(
                                      "font-semibold uppercase tracking-tighter text-[7.5px]",
                                      step.status === 'SUCCESS' ? 'text-emerald-500' : 'text-red-500'
                                    )}>{step.status}</span>
                                  </div>
                                  {step.output && (
                                    <pre className="p-1 bg-zinc-50 dark:bg-zinc-950 rounded text-[7.5px] font-mono text-zinc-500 max-h-16 overflow-y-auto">
                                      {JSON.stringify(step.output)}
                                    </pre>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            </div>
          </aside>
          )}
        </>
      ) : (
        /* Empty Workspace State */
        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50/40 dark:bg-zinc-950">
          <div className="h-11 px-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2 shrink-0">
            {leftSidebarCollapsed && (
              <button
                type="button"
                onClick={() => setLeftSidebarCollapsed(false)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 transition-colors cursor-pointer"
              >
                <ChevronRight size={13} />
                <span>Automations</span>
              </button>
            )}
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Automation Workspace</span>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-sm text-center space-y-4">
              <div className="w-12 h-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <Zap size={22} className="text-indigo-500" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Automation Workspace</h3>
                <p className="text-zinc-500 text-xs leading-relaxed">
                  Select an automation from the left sidebar or create a new one to design event-driven background flows.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateRule}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                <Plus size={14} />
                New Automation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trigger Picker Modal */}
      <AnimatePresence>
      {showTriggerModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs"
          onClick={() => setShowTriggerModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[82vh] overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Zap size={18} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Choose Trigger</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Select the event that starts this automation.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTriggerModal(false)}
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-3 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 shrink-0">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  autoFocus
                  value={triggerSearch}
                  onChange={(e) => setTriggerSearch(e.target.value)}
                  placeholder="Search triggers (e.g. Created, Status, Cron, SLA...)"
                  className="w-full h-9 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-9 pr-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TRIGGER_CATALOG.filter(t => {
                  const q = triggerSearch.trim().toLowerCase();
                  return !q || t.label.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
                }).map(trig => {
                  const active = triggerType === trig.id;
                  return (
                    <button
                      key={trig.id}
                      type="button"
                      onClick={() => {
                        setTriggerType(trig.id);
                        setShowTriggerModal(false);
                      }}
                      className={cn(
                        'p-4 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer',
                        active
                          ? 'bg-indigo-50/70 dark:bg-indigo-500/10 border-indigo-400 dark:border-indigo-500/50 ring-1 ring-indigo-500/30'
                          : 'bg-white dark:bg-zinc-900/60 border-zinc-200/90 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-500/50'
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Zap size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{trig.label}</span>
                          <span className="text-[10px] text-zinc-400 shrink-0">{trig.category}</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">{trig.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Action Picker Modal */}
      <AnimatePresence>
      {showActionModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs"
          onClick={() => setShowActionModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[84vh] overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Plus size={18} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Add Automation Action</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Choose an action step to append to this automation.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowActionModal(false)}
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-3.5 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 space-y-3 shrink-0">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  autoFocus
                  value={actionSearch}
                  onChange={(e) => setActionSearch(e.target.value)}
                  placeholder="Search actions (e.g. Create record, Email, Webhook, AI...)"
                  className="w-full h-9 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-9 pr-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {['All', 'Records & Data', 'Communication', 'Logic & Flow', 'AI & Documents', 'Integrations', 'Service Desk'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActionCategory(cat)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap border transition-colors cursor-pointer',
                      actionCategory === cat
                        ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/40'
                        : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ACTION_CATALOG.filter(a => {
                  const matchesCat = actionCategory === 'All' || a.category === actionCategory;
                  const q = actionSearch.trim().toLowerCase();
                  const matchesQ = !q || a.label.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q) || a.category.toLowerCase().includes(q);
                  return matchesCat && matchesQ;
                }).map(act => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => {
                        handleAddAction(act.id);
                        setShowActionModal(false);
                      }}
                      className="group p-4 rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-zinc-50/60 dark:hover:bg-zinc-900 text-left transition-all flex flex-col gap-2.5 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <Icon size={16} />
                        </div>
                        <span className="text-[10px] font-medium text-zinc-400">{act.category}</span>
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {act.label}
                        </h3>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                          {act.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <DeleteConfirmationModal
        isOpen={Boolean(ruleToDelete)}
        onClose={() => setRuleToDelete(null)}
        onConfirm={confirmDeleteRule}
        title="Delete Automation"
        description="Are you sure you want to remove this automation rule? Changes take effect when you save the module."
        itemName={ruleToDelete?.name}
      />

    </div>
  );
};
