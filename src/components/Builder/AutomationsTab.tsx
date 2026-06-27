import React, { useState, useEffect, useMemo } from 'react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { 
  Zap, Plus, Trash2, CheckCircle2, XCircle, 
  Mail, MessageSquare, ChevronDown, ChevronUp, RefreshCw, Database,
  ArrowRight, ToggleLeft, ToggleRight, Clock, HelpCircle, Search, Sparkles, Code, Play, Layers,
  Copy, GripVertical
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, flattenFields } from '../../lib/utils';

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
                    <span>⚙️</span>
                    <span>{stepModName} → {fieldLabel}</span>
                  </span>
                );
              }
            }
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
              <span className="text-[8px] font-normal text-zinc-450 dark:text-zinc-400 block leading-tight">The field to fill in the record.</span>
            </div>
            <div className="w-[10px]" /> {/* Spacer matching arrow right */}
            <div className="flex-1">
              <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 block uppercase tracking-wider">Value / Source Data</span>
              <span className="text-[8px] font-normal text-zinc-450 dark:text-zinc-400 block leading-tight">Static text or dynamic trigger fields (⚡).</span>
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
                            className="hover:text-zinc-650 dark:hover:text-white bg-transparent border-0 cursor-pointer text-[9px]"
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
                                className="w-full text-left px-2.5 py-1 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-all text-zinc-650 dark:text-zinc-300 font-mono text-[9px] truncate bg-transparent border-0 cursor-pointer block"
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
        <div className="py-4 border border-dashed border-zinc-250 dark:border-zinc-800 rounded-xl text-center">
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

export const AutomationsTab: React.FC<AutomationsTabProps> = ({ moduleId, fields = [] }) => {
  const { tenant, modules } = usePlatform();
  const { session } = useAuth();
  const [automations, setAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  
  // Runs list states
  const [runs, setRuns] = useState<any[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  // Form states for rule editing
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [triggerType, setTriggerType] = useState('RECORD_CREATED'); // RECORD_CREATED | RECORD_UPDATED | QUICK_ACTION
  const [conditions, setConditions] = useState('');
  const [actions, setActions] = useState<any[]>([]);
  const [expandedActionIdx, setExpandedActionIdx] = useState<number | null>(null);
  const [fieldsEditorModes, setFieldsEditorModes] = useState<Record<number, 'visual' | 'json'>>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Visual Condition states
  const [visualConditions, setVisualConditions] = useState<VisualConditionRow[]>([]);
  const [conditionMatchType, setConditionMatchType] = useState<'AND' | 'OR'>('AND');
  const [isAdvancedCondition, setIsAdvancedCondition] = useState(false);

  // Right sidebar tab toggle (Settings vs History)
  const [rightSidebarTab, setRightSidebarTab] = useState<'properties' | 'runs'>('properties');

  // Search Filter
  const [searchQuery, setSearchQuery] = useState('');

  const selectedRule = useMemo(() => {
    return automations.find(a => a.id === selectedRuleId) || null;
  }, [automations, selectedRuleId]);

  useEffect(() => {
    fetchAutomations();
  }, [moduleId, tenant?.id]);

  // Load selection state
  useEffect(() => {
    if (selectedRuleId === 'new') {
      setName('');
      setDescription('');
      setIsActive(true);
      setTriggerType('RECORD_CREATED');
      setConditions('');
      setVisualConditions([]);
      setConditionMatchType('AND');
      setIsAdvancedCondition(false);
      setActions([]);
      setExpandedActionIdx(null);
      setFieldsEditorModes({});
      setRightSidebarTab('properties');
    } else if (selectedRule) {
      setName(selectedRule.name);
      setDescription(selectedRule.description || '');
      setIsActive(selectedRule.isActive);
      setConditions(selectedRule.conditions || '');
      setActions(selectedRule.actions || []);
      
      const triggerConfig = selectedRule.triggers?.[0];
      if (triggerConfig) {
        if (triggerConfig.type === 'MODULE_EVENT') {
          setTriggerType(triggerConfig.on);
        } else if (triggerConfig.type === 'QUICK_ACTION') {
          setTriggerType('QUICK_ACTION');
        } else if (triggerConfig.type === 'CALL_ONLY') {
          setTriggerType('CALL_ONLY');
        }
      } else {
        setTriggerType('RECORD_CREATED');
      }
      
      const inputsPayload = selectedRule.inputs || {};
      if (inputsPayload.visualConditions && Array.isArray(inputsPayload.visualConditions)) {
        setVisualConditions(inputsPayload.visualConditions);
        setConditionMatchType(inputsPayload.conditionMatchType || 'AND');
        setIsAdvancedCondition(false);
      } else {
        setVisualConditions([]);
        setConditionMatchType('AND');
        setIsAdvancedCondition(!!selectedRule.conditions);
      }
      
      setExpandedActionIdx(null);
      setFieldsEditorModes({});
      setRightSidebarTab('properties');
      viewRuns(selectedRule);
    } else {
      setName('');
      setDescription('');
      setIsActive(true);
      setTriggerType('RECORD_CREATED');
      setConditions('');
      setVisualConditions([]);
      setActions([]);
    }
  }, [selectedRuleId, selectedRule]);

  const fetchAutomations = async () => {
    if (!tenant?.id || !moduleId) return;
    setLoading(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || '';
      const res = await fetch(`${API_BASE_URL}/api/automations?moduleId=${moduleId}`, {
        headers: {
          'x-tenant-id': tenant.id,
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAutomations(data);
        if (selectedRuleId === null && data.length > 0) {
          setSelectedRuleId(data[0].id);
        }
      } else {
        toast.error('Failed to load automations');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load automations');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (rule: any, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!tenant?.id) return;
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || '';
      const updatedActive = !rule.isActive;
      const res = await fetch(`${API_BASE_URL}/api/automations/${rule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant.id,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: updatedActive })
      });
      if (res.ok) {
        toast.success(`Automation is now ${updatedActive ? 'active' : 'inactive'}`);
        fetchAutomations();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to toggle automation state');
    }
  };

  const handleDeleteRule = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!tenant?.id) return;
    if (!confirm('Are you sure you want to delete this automation?')) return;
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || '';
      const res = await fetch(`${API_BASE_URL}/api/automations/${id}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': tenant.id,
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        toast.success('Automation deleted');
        if (selectedRuleId === id) setSelectedRuleId(null);
        fetchAutomations();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete automation');
    }
  };

  const handleCreateRule = () => {
    setSelectedRuleId('new');
  };

  const handleAddAction = (type: string) => {
    const defaultConfigs: Record<string, any> = {
      CREATE_RECORD: { targetModuleId: '', fields: {} },
      UPDATE_RECORD: { targetType: 'TRIGGERING', recordId: '', fields: {} },
      GET_RECORD: { targetModuleId: '', queryField: '', queryValue: '' },
      SEND_EMAIL: { to: '', subject: '', body: '' },
      SEND_INTERNAL_PING: { channel: 'general', message: '' }
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

  const handleSaveRule = async () => {
    if (!name.trim()) {
      toast.error('Rule name is required');
      return;
    }
    if (actions.length === 0) {
      toast.error('At least one action is required');
      return;
    }

    let triggersPayload = [];
    if (triggerType === 'RECORD_CREATED' || triggerType === 'RECORD_UPDATED') {
      triggersPayload.push({
        type: 'MODULE_EVENT',
        on: triggerType,
        moduleId: moduleId
      });
    } else if (triggerType === 'QUICK_ACTION') {
      triggersPayload.push({
        type: 'QUICK_ACTION',
        label: name,
        icon: 'Play'
      });
    } else if (triggerType === 'CALL_ONLY') {
      triggersPayload.push({
        type: 'CALL_ONLY'
      });
    }

    const finalConditions = isAdvancedCondition 
      ? conditions 
      : compileVisualConditions(visualConditions, conditionMatchType, fields);

    const payload = {
      name,
      description,
      moduleId,
      inputs: {
        visualConditions,
        conditionMatchType
      },
      actions,
      triggers: triggersPayload,
      isActive,
      conditions: finalConditions.trim() || null
    };

    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || '';
      const isNew = selectedRuleId === 'new';
      const url = isNew 
        ? `${API_BASE_URL}/api/automations` 
        : `${API_BASE_URL}/api/automations/${selectedRuleId}`;
      
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant.id || '',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const savedData = await res.json();
        toast.success(isNew ? 'Automation created successfully' : 'Automation updated');
        fetchAutomations();
        if (isNew && savedData?.id) {
          setSelectedRuleId(savedData.id);
        }
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Failed to save automation');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving automation');
    }
  };

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
    <div className="flex h-full w-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      
      {/* COLUMN 1: Rules Directory Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 p-5 flex flex-col gap-4">
        <div className="flex-shrink-0">
          <h3 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Automations</h3>
        </div>
        
        {/* Search */}
        <div className="relative flex-shrink-0">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scripts..."
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-4 py-2 text-xs focus:outline-none focus:border-indigo-500/55 transition-all dark:text-white"
          />
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="animate-spin text-indigo-500 w-4 h-4" />
              <p className="text-[9px] text-zinc-400">Loading...</p>
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
                  "w-full text-left p-3.5 rounded-2xl border transition-all flex flex-col gap-1 group select-none relative",
                  isSelected
                    ? "bg-indigo-650 border-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold truncate pr-2">{rule.name}</span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[7px] font-black uppercase border shrink-0",
                    rule.isActive
                      ? (isSelected ? "bg-white/20 border-white/30 text-white" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600")
                      : (isSelected ? "bg-white/10 border-white/20 text-white/60" : "bg-zinc-500/10 border-zinc-550/25 text-zinc-500")
                  )}>
                    {rule.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between w-full mt-1 pt-1.5 border-t border-dashed border-zinc-200/80 dark:border-zinc-800/80">
                  <span className="text-[7.5px] uppercase tracking-wider font-semibold opacity-70">
                    {isQuickAction ? 'Quick Action' : 'Record Event'}
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    <div 
                      onClick={(e) => handleToggleActive(rule, e)}
                      className={cn(
                        "p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors",
                        isSelected ? "text-white" : "text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200"
                      )}
                      title={rule.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {rule.isActive ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                    </div>
                    <div 
                      onClick={(e) => handleDeleteRule(rule.id, e)}
                      className={cn(
                        "p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors",
                        isSelected ? "text-white" : "text-zinc-400 hover:text-red-500"
                      )}
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
            <p className="text-[10px] text-zinc-400 text-center py-8">No automations found</p>
          )}
        </div>

        {/* New Rule Button */}
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={handleCreateRule}
            className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-755 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={12} />
            New Automation
          </button>
        </div>
      </aside>

      {selectedRuleId !== null ? (
        <>
          {/* COLUMN 2: Triggers & Actions Palette */}
          <aside className="w-60 flex-shrink-0 bg-zinc-55/35 dark:bg-zinc-950/20 border-r border-zinc-200 dark:border-zinc-800 p-5 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
            
            {/* Trigger Palette section */}
            <div className="space-y-3">
              <h4 className="text-[9px] font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-widest px-1">Trigger Hooks</h4>
              <div className="flex flex-col gap-2">
                {[
                  { id: 'RECORD_CREATED', label: 'On Created', desc: 'When record is added' },
                  { id: 'RECORD_UPDATED', label: 'On Updated', desc: 'When record changes' },
                  { id: 'QUICK_ACTION', label: 'Quick Action', desc: 'Detail page button click' },
                  { id: 'CALL_ONLY', label: 'No Trigger', desc: 'Triggered by Workflow/API' }
                ].map((trig) => (
                  <button
                    key={trig.id}
                    type="button"
                    onClick={() => setTriggerType(trig.id)}
                    className={cn(
                      "p-3 border rounded-xl text-left transition-all flex flex-col gap-1 cursor-pointer",
                      triggerType === trig.id
                        ? "bg-white dark:bg-zinc-900 border-indigo-500/50 ring-1 ring-indigo-500/50 shadow-sm"
                        : "bg-transparent border-zinc-250 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      <Zap size={11} className={triggerType === trig.id ? 'text-indigo-500' : 'text-zinc-400'} />
                      <span>{trig.label}</span>
                    </div>
                    <span className="text-[8px] text-zinc-400 leading-normal">{trig.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions steps library palette */}
            <div className="space-y-3 pt-2">
              <h4 className="text-[9px] font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-widest px-1">Action Library</h4>
              <div className="flex flex-col gap-2">
                {[
                  { id: 'CREATE_RECORD', label: 'Create Record', desc: 'Insert new row', icon: Database },
                  { id: 'UPDATE_RECORD', label: 'Update Record', desc: 'Update row parameters', icon: RefreshCw },
                  { id: 'GET_RECORD', label: 'Fetch Record', desc: 'Lookup rows', icon: ArrowRight },
                  { id: 'SEND_EMAIL', label: 'Send Email', desc: 'Dispatch SMTP alert', icon: Mail },
                  { id: 'SEND_INTERNAL_PING', label: 'Internal Ping', desc: 'Log channel message', icon: MessageSquare }
                ].map((actionType) => {
                  const Icon = actionType.icon;
                  return (
                    <button
                      key={actionType.id}
                      onClick={() => handleAddAction(actionType.id)}
                      className="p-3 border border-zinc-250 dark:border-zinc-800 hover:border-indigo-500/50 rounded-xl text-left bg-transparent hover:bg-white dark:hover:bg-zinc-900 flex items-start gap-2.5 transition-all group cursor-pointer"
                    >
                      <div className="p-1.5 bg-indigo-500/10 text-indigo-500 rounded group-hover:bg-indigo-500 group-hover:text-white transition-colors shrink-0">
                        <Icon size={11} />
                      </div>
                      <div>
                        <p className="text-[9.5px] font-bold text-zinc-800 dark:text-zinc-200">{actionType.label}</p>
                        <p className="text-[7.5px] text-zinc-400 mt-0.5 leading-normal">{actionType.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* COLUMN 3: Sequence Steps Canvas (The Biggest One) */}
          <main className="flex-1 bg-zinc-50/20 dark:bg-zinc-950/10 p-8 overflow-y-auto custom-scrollbar flex flex-col gap-6 min-w-0">
            
            {/* Header control center */}
            <div className="flex items-center justify-between flex-shrink-0 border-b border-zinc-200 dark:border-zinc-800/80 pb-5">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Layers className="text-indigo-500 w-4 h-4" />
                  <span>Action Sequence Steps</span>
                </h2>
                <p className="text-zinc-500 text-xs mt-0.5">Design sequential task blocks triggered by system events.</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveRule}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer"
                >
                  Save Automation
                </button>
              </div>
            </div>

            {/* Canvas steps list */}
            <div className="flex-1 space-y-4">
              {actions.map((action, idx) => (
                <div 
                  key={idx}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "bg-white dark:bg-zinc-900 border rounded-2xl overflow-hidden shadow-sm transition-all duration-200",
                    draggedIndex === idx ? "opacity-35 border-dashed border-indigo-400" : "border-zinc-200 dark:border-zinc-800",
                    dragOverIndex === idx && draggedIndex !== idx ? "border-t-4 border-t-indigo-500 scale-[0.99] translate-y-1" : ""
                  )}
                >
                  <div 
                    onClick={() => setExpandedActionIdx(expandedActionIdx === idx ? null : idx)}
                    className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors select-none"
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
                    <div className="px-6 pb-6 pt-4 border-t border-zinc-250 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/20 space-y-4">
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
                    </div>
                  )}
                </div>
              ))}
              
              {actions.length === 0 && (
                <div className="py-20 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl flex flex-col items-center justify-center gap-3">
                  <Play size={24} className="text-zinc-350 dark:text-zinc-600" />
                  <p className="text-xs text-zinc-400">Your automation sequence is empty. Click actions from the library panel on the left to add steps.</p>
                </div>
              )}
            </div>
          </main>

          {/* COLUMN 4: Properties Sidebar & Logs History */}
          <aside className="w-80 flex-shrink-0 bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 p-5 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
            
            {/* Header Settings vs Runs History Tabs */}
            <div className="flex bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 shrink-0">
              <button
                onClick={() => setRightSidebarTab('properties')}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                  rightSidebarTab === 'properties'
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
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
                  "flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1",
                  rightSidebarTab === 'runs'
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                <Clock size={10} />
                Runs History
              </button>
            </div>

            {rightSidebarTab === 'properties' ? (
              <div className="space-y-6 flex-1">
                
                {/* Properties form */}
                <div className="space-y-3.5">
                  <h4 className="text-[9px] font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-widest px-1">Properties</h4>
                  
                  <div className="space-y-3 bg-zinc-55/35 dark:bg-zinc-900/10 p-4 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl">
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

                {/* Preconditions visual editor */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-1.5">
                    <h4 className="text-[9px] font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-widest px-1">Precondition Gates</h4>
                    <button
                      type="button"
                      onClick={() => setIsAdvancedCondition(!isAdvancedCondition)}
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
                        {visualConditions.map((row) => {
                          const selectedField = fields.find(f => f.id === row.fieldId || f.name === row.fieldId);
                          const operators = getFieldOperators(selectedField);
                          
                          return (
                            <div key={row.id} className="p-3 bg-zinc-55/40 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800/80 rounded-xl flex flex-col gap-2 relative group animate-in fade-in duration-100">
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
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-450 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
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
                        className="bg-zinc-55/20 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden"
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
                                <div key={sIdx} className="p-2 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-lg flex flex-col gap-1">
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
          </aside>
        </>
      ) : (
        /* Empty Workspace State */
        <div className="flex-1 flex items-center justify-center bg-zinc-50/20 dark:bg-zinc-950/10">
          <div className="max-w-sm text-center space-y-4">
            <div className="w-16 h-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl flex items-center justify-center mx-auto text-zinc-450 shadow-sm">
              <Zap size={28} className="text-zinc-400 dark:text-zinc-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Automation Workspace</h3>
              <p className="text-zinc-500 text-xs leading-relaxed">
                Select an automation script from the left sidebar or click **+ New Automation** to design background task flows.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
