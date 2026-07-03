import { useState, useEffect } from 'react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { 
  ShieldCheck, ToggleLeft, ToggleRight, Plus, Trash2,
  Info, Link, Settings
} from 'lucide-react';
import { toast } from 'sonner';

interface VisualCondition {
  fieldId: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'is_empty' | 'is_not_empty';
  value: string;
}

interface VisualMapping {
  type: 'source' | 'custom' | 'ignore';
  value: string;
}
type VisualMappings = Record<string, VisualMapping>;

const compileConditions = (list: VisualCondition[]): string => {
  if (list.length === 0) return '';
  
  const parts = list.map(cond => {
    const { fieldId, operator, value } = cond;
    if (!fieldId) return 'true';
    
    const escapedValue = (value || '').replace(/"/g, '\\"');
    
    switch (operator) {
      case 'equals':
        return `String(record['${fieldId}'] || '') === "${escapedValue}"`;
      case 'contains':
        return `String(record['${fieldId}'] || '').toLowerCase().includes("${escapedValue}".toLowerCase())`;
      case 'starts_with':
        return `String(record['${fieldId}'] || '').toLowerCase().startsWith("${escapedValue}".toLowerCase())`;
      case 'ends_with':
        return `String(record['${fieldId}'] || '').toLowerCase().endsWith("${escapedValue}".toLowerCase())`;
      case 'is_empty':
        return `(!record['${fieldId}'] || String(record['${fieldId}']).trim() === '')`;
      case 'is_not_empty':
        return `(record['${fieldId}'] && String(record['${fieldId}']).trim() !== '')`;
      default:
        return 'true';
    }
  });
  
  return parts.filter(p => p !== 'true').join(' && ') || '';
};

const parseConditions = (condStr: string): VisualCondition[] => {
  if (!condStr || condStr.trim() === '') return [];
  
  const parts = condStr.split(' && ');
  const list: VisualCondition[] = [];
  
  for (const part of parts) {
    const trimmed = part.trim();
    
    const equalsMatch = trimmed.match(/^String\(record\['([^']+)'\]\s*\|\|\s*''\)\s*===\s*"([^"]*)"$/);
    if (equalsMatch) {
      list.push({ fieldId: equalsMatch[1], operator: 'equals', value: equalsMatch[2] });
      continue;
    }
    
    const containsMatch = trimmed.match(/^String\(record\['([^']+)'\]\s*\|\|\s*''\)\.toLowerCase\(\)\.includes\("([^"]*)"\.toLowerCase\(\)\)$/);
    if (containsMatch) {
      list.push({ fieldId: containsMatch[1], operator: 'contains', value: containsMatch[2] });
      continue;
    }
    
    const startsMatch = trimmed.match(/^String\(record\['([^']+)'\]\s*\|\|\s*''\)\.toLowerCase\(\)\.startsWith\("([^"]*)"\.toLowerCase\(\)\)$/);
    if (startsMatch) {
      list.push({ fieldId: startsMatch[1], operator: 'starts_with', value: startsMatch[2] });
      continue;
    }
    
    const endsMatch = trimmed.match(/^String\(record\['([^']+)'\]\s*\|\|\s*''\)\.toLowerCase\(\)\.endsWith\("([^"]*)"\.toLowerCase\(\)\)$/);
    if (endsMatch) {
      list.push({ fieldId: endsMatch[1], operator: 'ends_with', value: endsMatch[2] });
      continue;
    }
    
    const emptyMatch = trimmed.match(/^\(!record\['([^']+)'\]\s*\|\|\s*String\(record\['[^']+'\]\)\.trim\(\)\s*===\s*''\)$/);
    if (emptyMatch) {
      list.push({ fieldId: emptyMatch[1], operator: 'is_empty', value: '' });
      continue;
    }
    
    const notEmptyMatch = trimmed.match(/^\(record\['([^']+)'\]\s*&&\s*String\(record\['[^']+'\]\)\.trim\(\)\s*!==\s*''\)$/);
    if (notEmptyMatch) {
      list.push({ fieldId: notEmptyMatch[1], operator: 'is_not_empty', value: '' });
      continue;
    }

    const legacyIncludes = trimmed.match(/^([a-zA-Z0-9_-]+)\.includes\("([^"]*)"\)$/);
    if (legacyIncludes) {
      list.push({ fieldId: legacyIncludes[1], operator: 'contains', value: legacyIncludes[2] });
      continue;
    }

    const legacyEquals = trimmed.match(/^([a-zA-Z0-9_-]+)\s*===\s*"([^"]*)"$/);
    if (legacyEquals) {
      list.push({ fieldId: legacyEquals[1], operator: 'equals', value: legacyEquals[2] });
      continue;
    }
    
    list.push({ fieldId: 'email', operator: 'contains', value: trimmed });
  }
  
  return list;
};

const serializeMappings = (mappings: VisualMappings): Record<string, string> => {
  const result: Record<string, string> = {};
  
  Object.entries(mappings).forEach(([targetId, config]) => {
    if (config.type === 'ignore') return;
    if (config.type === 'source') {
      result[targetId] = `{{ trigger.record.${config.value} }}`;
    } else {
      result[targetId] = config.value || '';
    }
  });
  
  return result;
};

const parseMappings = (rawMap: Record<string, string>): VisualMappings => {
  const result: VisualMappings = {};
  
  Object.entries(rawMap || {}).forEach(([targetId, rawValue]) => {
    if (!rawValue) {
      result[targetId] = { type: 'ignore', value: '' };
      return;
    }
    
    const match = String(rawValue).match(/^\{\{\s*trigger\.record\.([a-zA-Z0-9_-]+)\s*\}\}$/);
    if (match) {
      result[targetId] = { type: 'source', value: match[1] };
    } else {
      result[targetId] = { type: 'custom', value: String(rawValue) };
    }
  });
  
  return result;
};

export const IntakeSettingsPage = () => {
  const { tenant, modules, refreshModules } = usePlatform();
  const { session } = useAuth();
  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || '';
  const [loading, setLoading] = useState(false);
  const [triageModule, setTriageModule] = useState<any>(null);
  const [triageRules, setTriageRules] = useState<any[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);

  // Rule editor form state
  const [ruleName, setRuleName] = useState('');
  const [targetModuleId, setTargetModuleId] = useState('');
  const [archiveSource, setArchiveSource] = useState(true);
  const [triggerMode, setTriggerMode] = useState<'IMMEDIATE' | 'GLOBAL_SCHEDULE' | 'CUSTOM_SCHEDULE'>('GLOBAL_SCHEDULE');
  const [cronExpression, setCronExpression] = useState('GLOBAL');
  const [sourceModuleId, setSourceModuleId] = useState('public_form');
  const [conditionsList, setConditionsList] = useState<VisualCondition[]>([]);
  const [fieldMappings, setFieldMappings] = useState<VisualMappings>({});

  const getSourceFieldsList = () => {
    if (sourceModuleId && sourceModuleId !== 'public_form') {
      const sourceModule = modules?.find((m: any) => m.id === sourceModuleId);
      if (sourceModule) {
        const flattenFields = (layoutFields: any[]): any[] => {
          const result: any[] = [];
          (layoutFields || []).forEach(f => {
            if (f.type !== 'section') {
              result.push(f);
            }
            if (f.fields && Array.isArray(f.fields)) {
              result.push(...flattenFields(f.fields));
            }
          });
          return result;
        };
        return flattenFields(sourceModule.layout);
      }
    }
    return triageModule?.layout || [];
  };

  useEffect(() => {
    loadTriageConfig();
  }, [modules]);

  const loadTriageConfig = async () => {
    if (!modules) return;
    const triage = modules.find((m: any) => m.isIntakeTriage === true || m.config?.isIntakeTriage === true) as any;
    setTriageModule(triage || null);

    if (triage) {

      try {
        const res = await fetch(`${API_BASE_URL}/api/automations?moduleId=${triage.id}`, {
          headers: { 
            'x-tenant-id': tenant?.id || '',
            'Authorization': `Bearer ${token}` 
          }
        });
        if (res.ok) {
          const rules = await res.json();
          setTriageRules(rules);
        }
      } catch (err) {
        console.error('Failed to load triage rules:', err);
      }
    }
  };

  const handleToggleTriage = async () => {
    setLoading(true);
    try {
      if (triageModule) {
        // Disable: update module config
        const {
          id,
          name,
          category,
          iconName,
          type,
          enabled,
          isGlobal,
          templateId,
          status,
          createdAt,
          isIntakeTriage,
          ...restConfig
        } = triageModule;

        const res = await fetch(`${API_BASE_URL}/api/data/modules/${triageModule.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': tenant?.id || '',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name,
            category,
            iconName,
            type,
            enabled,
            isGlobal,
            templateId,
            ...restConfig
          })
        });

        if (res.ok) {
          toast.success('Central Triage system disabled successfully');
          setTriageModule(null);
          setTriageRules([]);
          await refreshModules();
        } else {
          throw new Error('Failed to update triage module config');
        }
      } else {
        // Enable: Find if there's a template or create a new one
        const res = await fetch(`${API_BASE_URL}/api/data/modules`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': tenant?.id || '',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: 'Central Intake & Triage',
            category: 'Intake & Requests',
            iconName: 'FileText',
            type: 'WORK_ITEM',
            isIntakeTriage: true,
            layout: [
              { id: 'f1', name: 'submitted_by', label: 'Submitted By', type: 'text', colSpan: 6, rowIndex: 0 },
              { id: 'f2', name: 'email', label: 'Email', type: 'text', colSpan: 6, rowIndex: 0 },
              { id: 'f3', name: 'description', label: 'Description', type: 'longText', colSpan: 12, rowIndex: 1 }
            ]
          })
        });

        if (res.ok) {
          toast.success('Central Triage system enabled!');
          await refreshModules();
        } else {
          throw new Error('Failed to create triage module');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGlobalSchedule = async (newCron: string) => {
    if (!triageModule) return;
    try {
      const {
        id,
        name,
        category,
        iconName,
        type,
        enabled,
        isGlobal,
        templateId,
        status,
        createdAt,
        isIntakeTriage,
        ...restConfig
      } = triageModule;

      const res = await fetch(`${API_BASE_URL}/api/data/modules/${triageModule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || '',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          category,
          iconName,
          type,
          enabled,
          isGlobal,
          templateId,
          ...restConfig,
          config: {
            ...(triageModule.config || {}),
            globalSchedule: newCron
          }
        })
      });

      if (res.ok) {
        toast.success(`Global queue schedule updated`);
        await refreshModules();
      } else {
        throw new Error('Failed to update global schedule');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save global schedule');
    }
  };

  const handleSelectRule = (rule: any) => {
    setSelectedRuleId(rule.id);
    setRuleName(rule.name);
    setConditionsList(parseConditions(rule.conditions || ''));
    
    const trigger = rule.triggers?.[0];
    if (trigger?.type === 'CRON') {
      if (trigger.cronExpression === 'GLOBAL') {
        setTriggerMode('GLOBAL_SCHEDULE');
        setCronExpression('GLOBAL');
      } else {
        setTriggerMode('CUSTOM_SCHEDULE');
        setCronExpression(trigger.cronExpression || '*/5 * * * *');
      }
      setSourceModuleId(trigger.formId || 'public_form');
    } else {
      setTriggerMode('IMMEDIATE');
      setCronExpression('GLOBAL');
      setSourceModuleId(trigger?.formId || 'public_form');
    }

    const routeAction = rule.actions?.find((a: any) => a.type === 'ROUTE_TO_MODULE');
    if (routeAction) {
      setTargetModuleId(routeAction.config.targetModuleId || '');
      setFieldMappings(parseMappings(routeAction.config.fieldMapping || {}));
      setArchiveSource(routeAction.config.archiveSource !== false);
    } else {
      setTargetModuleId('');
      setFieldMappings({});
      setArchiveSource(true);
    }
  };

  const handleCreateRule = () => {
    setSelectedRuleId('new');
    setRuleName('New Triage Route Rule');
    setConditionsList([]);
    setTriggerMode('GLOBAL_SCHEDULE');
    setCronExpression('GLOBAL');
    setSourceModuleId('public_form');
    setTargetModuleId('');
    setFieldMappings({});
    setArchiveSource(true);
  };

  const handleSaveRule = async () => {
    if (!ruleName) {
      toast.error('Rule name is required');
      return;
    }
    if (!targetModuleId) {
      toast.error('Please select a target module');
      return;
    }

    const compiledCondition = compileConditions(conditionsList);
    const serializedMapping = serializeMappings(fieldMappings);

    let triggers = [];
    if (triggerMode === 'IMMEDIATE') {
      triggers = [{ type: 'FORM_SUBMITTED', formId: sourceModuleId || 'public_form' }];
    } else if (triggerMode === 'GLOBAL_SCHEDULE') {
      triggers = [{ type: 'CRON', cronExpression: 'GLOBAL', moduleId: triageModule.id, formId: sourceModuleId || 'public_form' }];
    } else {
      triggers = [{ type: 'CRON', cronExpression: cronExpression || '*/5 * * * *', moduleId: triageModule.id, formId: sourceModuleId || 'public_form' }];
    }

    const ruleData = {
      name: ruleName,
      moduleId: triageModule.id,
      isActive: true,
      conditions: compiledCondition || null,
      triggers,
      actions: [
        {
          type: 'ROUTE_TO_MODULE',
          config: {
            targetModuleId,
            fieldMapping: serializedMapping,
            archiveSource
          }
        }
      ]
    };

    try {
      const isEdit = selectedRuleId !== 'new';
      const url = isEdit 
        ? `${API_BASE_URL}/api/automations/${selectedRuleId}`
        : `${API_BASE_URL}/api/automations`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || '',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(ruleData)
      });

      if (res.ok) {
        toast.success('Triage rule saved successfully');
        setSelectedRuleId(null);
        loadTriageConfig();
      } else {
        const errObj = await res.json();
        throw new Error(errObj.error || 'Failed to save rule');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/automations/${ruleId}`, {
        method: 'DELETE',
        headers: { 
          'x-tenant-id': tenant?.id || '',
          'Authorization': `Bearer ${token}` 
        }
      });
      if (res.ok) {
        toast.success('Triage rule deleted');
        setSelectedRuleId(null);
        loadTriageConfig();
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const publicFormLink = triageModule 
    ? `${window.location.origin}/portal?moduleId=${triageModule.id}`
    : '';



  return (
    <div className="flex-1 bg-zinc-950 p-10 overflow-y-auto custom-scrollbar flex flex-col gap-8">
      {/* Header section */}
      <header className="flex items-center justify-between border-b border-zinc-900 pb-6 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black tracking-widest text-indigo-500 uppercase">Triage Settings</span>
            <span className="h-3 w-px bg-zinc-800"></span>
            <span className="text-[10px] font-bold text-zinc-400">Platform Settings</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
            <ShieldCheck className="text-indigo-400" size={24} />
            Central Triage & Intake
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Configure tenancy-wide rules to automatically triage, validate, and route incoming requests.</p>
        </div>

        <button 
          onClick={handleToggleTriage}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg ${
            triageModule 
              ? 'bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:bg-zinc-700/85 hover:border-zinc-600'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/10'
          }`}
        >
          {triageModule ? <ToggleRight className="text-indigo-400" /> : <ToggleLeft className="text-zinc-400" />}
          {triageModule ? 'Disable Triage Module' : 'Enable Triage Module'}
        </button>
      </header>

      {/* Main Workspace split panel */}
      {triageModule ? (
        <div className="grid grid-cols-12 gap-8 items-start flex-1 min-h-0">
          {/* Rules Dashboard section */}
          <div className="col-span-4 bg-zinc-900/40 border border-zinc-900 rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-zinc-450 uppercase tracking-widest">Triage Routing Rules</h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">Matched sequentially on ingestion.</p>
              </div>
              <button 
                onClick={handleCreateRule}
                className="p-2 bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/20 rounded-xl transition-all cursor-pointer"
                title="Create Triage Rule"
              >
                <Plus size={13} />
              </button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
              {triageRules.map((rule) => {
                const routeAction = rule.actions?.find((a: any) => a.type === 'ROUTE_TO_MODULE');
                const targetMod = modules?.find((m: any) => m.id === routeAction?.config?.targetModuleId);
                return (
                  <div 
                    key={rule.id}
                    onClick={() => handleSelectRule(rule)}
                    className={`p-4 border rounded-2xl text-left cursor-pointer transition-all flex items-start justify-between ${
                      selectedRuleId === rule.id 
                        ? 'bg-indigo-950/20 border-indigo-500/30' 
                        : 'bg-zinc-950/30 border-zinc-900 hover:border-zinc-800'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-zinc-200">{rule.name}</p>
                      <p className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1.5 font-mono">
                        Route to {targetMod ? targetMod.name : 'Unknown Module'}
                      </p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRule(rule.id);
                      }}
                      className="p-1 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-500 rounded transition-colors"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
              {triageRules.length === 0 && (
                <div className="py-8 text-center border border-dashed border-zinc-800 rounded-2xl">
                  <p className="text-[10px] text-zinc-500 italic">No triage routing rules configured yet.</p>
                </div>
              )}
            </div>

            {/* Ingestion Info Panel */}
            <div className="border-t border-zinc-900 pt-6 space-y-4">
              <div>
                <h4 className="text-[10px] font-black text-zinc-450 uppercase tracking-widest">Ingestion Gateways</h4>
                <p className="text-[8px] text-zinc-400">Share these links to ingest external client records directly.</p>
              </div>

              {/* Public Form link */}
              <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-300">
                  <span className="flex items-center gap-1.5 text-zinc-200">
                    <Link size={10} className="text-indigo-400" /> Public Link
                  </span>
                  <a href={publicFormLink} target="_blank" className="text-indigo-400 hover:underline">Open</a>
                </div>
                <div className="bg-zinc-900 p-2.5 rounded font-mono text-[9px] text-zinc-400 break-all select-all select-none">
                  {publicFormLink}
                </div>
              </div>

              {/* Global Queue Schedule Settings */}
              <div className="border-t border-zinc-900/60 pt-4 space-y-3">
                <div>
                  <h4 className="text-[10px] font-black text-zinc-450 uppercase tracking-widest">Global Queue Schedule</h4>
                  <p className="text-[8px] text-zinc-400">Processing interval for rules set to use the Global Schedule.</p>
                </div>
                
                <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-4 space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500">Distribution Interval</label>
                    <select
                      value={
                        ['*/5 * * * *', '*/15 * * * *', '0 * * * *', '0 0 * * *'].includes(triageModule?.config?.globalSchedule || '*/5 * * * *')
                          ? (triageModule?.config?.globalSchedule || '*/5 * * * *')
                          : 'CUSTOM'
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        const nextCron = val !== 'CUSTOM' ? val : '*/5 9-17 * * 1-5';
                        handleSaveGlobalSchedule(nextCron);
                      }}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 cursor-pointer"
                    >
                      <option value="*/5 * * * *">Every 5 Minutes</option>
                      <option value="*/15 * * * *">Every 15 Minutes</option>
                      <option value="0 * * * *">Hourly</option>
                      <option value="0 0 * * *">Daily at Midnight</option>
                      <option value="CUSTOM">Custom Cron Expression</option>
                    </select>
                  </div>

                  {(!['*/5 * * * *', '*/15 * * * *', '0 * * * *', '0 0 * * *'].includes(triageModule?.config?.globalSchedule || '*/5 * * * *') || triageModule?.config?.globalSchedule === 'CUSTOM') && (
                    <div className="space-y-1 animate-in fade-in duration-200">
                      <label className="text-[9px] font-bold text-zinc-550">Cron Expression</label>
                      <input
                        type="text"
                        value={triageModule?.config?.globalSchedule || '*/5 * * * *'}
                        onChange={(e) => handleSaveGlobalSchedule(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 font-mono text-xs text-zinc-250 focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Rule Editor detail section */}
          <div className="col-span-8">
            {selectedRuleId ? (
              <div className="bg-zinc-900/20 border border-zinc-900 rounded-3xl p-8 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-zinc-300">Triage Rule configuration</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Specify conditions and target mapping fields.</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-bold text-zinc-400">Rule Name</label>
                    <input 
                      type="text"
                      value={ruleName}
                      onChange={(e) => setRuleName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                      placeholder="e.g. Route Employees Requests"
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Rule Matching Conditions</label>
                      <button
                        type="button"
                        onClick={() => {
                          const fields = getSourceFieldsList();
                          const firstField = fields?.[0]?.name || fields?.[0]?.id || 'email';
                          setConditionsList(prev => [...prev, { fieldId: firstField, operator: 'contains', value: '' }]);
                        }}
                        className="flex items-center gap-1 text-[9px] font-black text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-2 py-1 rounded-lg uppercase tracking-wider transition-all cursor-pointer"
                      >
                        <Plus size={10} />
                        Add Condition
                      </button>
                    </div>

                    {conditionsList.length === 0 ? (
                      <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-4 text-center text-[10px] font-medium text-zinc-500">
                        Always matches (No conditions set - runs for all incoming queue submissions).
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {conditionsList.map((cond, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-zinc-950/60 border border-zinc-900/60 p-2.5 rounded-2xl animate-in fade-in slide-in-from-top-1 duration-150">
                            <select
                              value={cond.fieldId}
                              onChange={(e) => {
                                const val = e.target.value;
                                setConditionsList(prev => prev.map((c, i) => i === idx ? { ...c, fieldId: val } : c));
                              }}
                              className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none cursor-pointer shrink-0 min-w-[140px]"
                            >
                              {getSourceFieldsList().map((f: any) => (
                                <option key={f.id || f.name} value={f.name || f.id}>{f.label || f.name}</option>
                              ))}
                            </select>

                            <select
                              value={cond.operator}
                              onChange={(e) => {
                                const val = e.target.value as any;
                                setConditionsList(prev => prev.map((c, i) => i === idx ? { ...c, operator: val } : c));
                              }}
                              className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none cursor-pointer shrink-0"
                            >
                              <option value="equals">Equals</option>
                              <option value="contains">Contains</option>
                              <option value="starts_with">Starts With</option>
                              <option value="ends_with">Ends With</option>
                              <option value="is_empty">Is Empty</option>
                              <option value="is_not_empty">Is Not Empty</option>
                            </select>

                            {cond.operator !== 'is_empty' && cond.operator !== 'is_not_empty' ? (
                              <input
                                type="text"
                                value={cond.value}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setConditionsList(prev => prev.map((c, i) => i === idx ? { ...c, value: val } : c));
                                }}
                                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/30"
                                placeholder="Value..."
                              />
                            ) : (
                              <div className="flex-1 text-[10px] text-zinc-650 font-bold uppercase tracking-wider px-2">No value required</div>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setConditionsList(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                              title="Remove Condition"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-bold text-zinc-400">Trigger Mode</label>
                    <div className="grid grid-cols-3 gap-4">
                      <label className={`p-4 border rounded-2xl cursor-pointer flex flex-col gap-1 transition-all ${
                        triggerMode === 'IMMEDIATE' 
                          ? 'bg-indigo-950/20 border-indigo-500/40 ring-1 ring-indigo-500/40' 
                          : 'bg-zinc-950/40 border-zinc-900 hover:border-zinc-800'
                      }`}>
                        <input 
                          type="radio" 
                          name="triggerMode"
                          checked={triggerMode === 'IMMEDIATE'}
                          onChange={() => setTriggerMode('IMMEDIATE')}
                          className="sr-only"
                        />
                        <span className="text-xs font-bold text-zinc-200">Immediately</span>
                        <span className="text-[8.5px] text-zinc-500 leading-normal">Route records instantly on form ingestion.</span>
                      </label>

                      <label className={`p-4 border rounded-2xl cursor-pointer flex flex-col gap-1 transition-all ${
                        triggerMode === 'GLOBAL_SCHEDULE' 
                          ? 'bg-indigo-950/20 border-indigo-500/40 ring-1 ring-indigo-500/40' 
                          : 'bg-zinc-950/40 border-zinc-900 hover:border-zinc-800'
                      }`}>
                        <input 
                          type="radio" 
                          name="triggerMode"
                          checked={triggerMode === 'GLOBAL_SCHEDULE'}
                          onChange={() => {
                            setTriggerMode('GLOBAL_SCHEDULE');
                            setCronExpression('GLOBAL');
                          }}
                          className="sr-only"
                        />
                        <span className="text-xs font-bold text-zinc-200">Global Schedule</span>
                        <span className="text-[8.5px] text-zinc-500 leading-normal">Run according to the shared Inbound queue interval.</span>
                      </label>

                      <label className={`p-4 border rounded-2xl cursor-pointer flex flex-col gap-1 transition-all ${
                        triggerMode === 'CUSTOM_SCHEDULE' 
                          ? 'bg-indigo-950/20 border-indigo-500/40 ring-1 ring-indigo-500/40' 
                          : 'bg-zinc-950/40 border-zinc-900 hover:border-zinc-800'
                      }`}>
                        <input 
                          type="radio" 
                          name="triggerMode"
                          checked={triggerMode === 'CUSTOM_SCHEDULE'}
                          onChange={() => {
                            setTriggerMode('CUSTOM_SCHEDULE');
                            setCronExpression('*/5 * * * *');
                          }}
                          className="sr-only"
                        />
                        <span className="text-xs font-bold text-zinc-200">Custom Schedule</span>
                        <span className="text-[8.5px] text-zinc-500 leading-normal">Configure a custom cron frequency for this rule.</span>
                      </label>
                    </div>
                  </div>

                  {triggerMode === 'CUSTOM_SCHEDULE' && (
                    <div className="grid grid-cols-2 gap-6 col-span-2 animate-in fade-in duration-200">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400">Distribution Schedule</label>
                        <select 
                          value={
                            ['*/5 * * * *', '*/15 * * * *', '0 * * * *', '0 0 * * *'].includes(cronExpression)
                              ? cronExpression
                              : 'CUSTOM'
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val !== 'CUSTOM') {
                              setCronExpression(val);
                            } else {
                              setCronExpression('*/5 9-17 * * 1-5');
                            }
                          }}
                          className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2 text-xs text-zinc-200 cursor-pointer"
                        >
                          <option value="*/5 * * * *">Every 5 Minutes</option>
                          <option value="*/15 * * * *">Every 15 Minutes</option>
                          <option value="0 * * * *">Hourly</option>
                          <option value="0 0 * * *">Daily at Midnight</option>
                          <option value="CUSTOM">Custom Cron Expression</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400">Cron Expression</label>
                        <input 
                          type="text"
                          value={cronExpression}
                          onChange={(e) => setCronExpression(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                          placeholder="e.g. */5 * * * *"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-bold text-zinc-400">Ingestion Data Source (Form)</label>
                    <select 
                      value={sourceModuleId}
                      onChange={(e) => setSourceModuleId(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2.5 text-xs text-zinc-200 cursor-pointer"
                    >
                      <option value="public_form">All Ingestion Forms</option>
                      {modules?.filter((m: any) => m.id !== triageModule.id && m.isIntakeTriage !== true && m.config?.isIntakeTriage !== true).map((m: any) => (
                        <option key={m.id} value={m.id}>{m.name} Form</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-bold text-zinc-400 font-mono">Triage Action: Route Record</label>
                    <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-450">Destination Business Module</label>
                        <select 
                          value={targetModuleId}
                          onChange={(e) => setTargetModuleId(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 cursor-pointer"
                        >
                          <option value="">Select Destination Module...</option>
                          {modules?.filter((m: any) => m.id !== triageModule.id && m.isIntakeTriage !== true && m.config?.isIntakeTriage !== true).map((m: any) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider block">Fields Mapping Setup</label>
                        {targetModuleId ? (
                          (() => {
                            const targetModule = modules?.find((m: any) => m.id === targetModuleId);
                            const flattenFields = (layoutFields: any[]): any[] => {
                              const result: any[] = [];
                              (layoutFields || []).forEach(f => {
                                if (f.type !== 'section') {
                                  result.push(f);
                                }
                                if (f.fields && Array.isArray(f.fields)) {
                                  result.push(...flattenFields(f.fields));
                                }
                              });
                              return result;
                            };
                            const customFields = targetModule ? flattenFields(targetModule.layout) : [];
                            const allTargetFields = [
                              { id: 'name', label: 'Record Name / Title', type: 'text' },
                              { id: 'description', label: 'Record Description', type: 'longText' },
                              ...customFields
                            ];

                            return (
                              <div className="border border-zinc-900 rounded-2xl bg-zinc-950/20 overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="border-b border-zinc-900 text-[9px] font-bold text-zinc-500 uppercase tracking-wider bg-zinc-950/40">
                                      <th className="px-4 py-2">Destination Field</th>
                                      <th className="px-4 py-2">Mapping Type</th>
                                      <th className="px-4 py-2">Source Value</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {allTargetFields.map((field) => {
                                      const currentMap = fieldMappings[field.id] || { type: 'ignore', value: '' };

                                      return (
                                        <tr key={field.id} className="border-b border-zinc-900/60 last:border-0 hover:bg-zinc-900/10 transition-colors">
                                          <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                              <span className="text-xs font-semibold text-zinc-200">{field.label || field.name || field.id}</span>
                                              <span className="text-[9px] text-zinc-500 font-mono mt-0.5 uppercase">
                                                {field.id === 'name' || field.id === 'description' ? 'Standard' : `Custom (${field.type})`}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="px-4 py-3">
                                            <select
                                              value={currentMap.type}
                                              onChange={(e) => {
                                                const val = e.target.value as any;
                                                const fields = getSourceFieldsList();
                                                const defaultSourceField = fields?.[0]?.name || fields?.[0]?.id || 'email';
                                                setFieldMappings(prev => ({
                                                  ...prev,
                                                  [field.id]: { type: val, value: val === 'source' ? defaultSourceField : '' }
                                                }));
                                              }}
                                              className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none cursor-pointer min-w-[150px]"
                                            >
                                              <option value="ignore">Do Not Map</option>
                                              <option value="source">Map from Ingested Field</option>
                                              <option value="custom">Custom Static Value</option>
                                            </select>
                                          </td>
                                          <td className="px-4 py-3">
                                            {currentMap.type === 'source' && (
                                              <select
                                                value={currentMap.value}
                                                onChange={(e) => {
                                                  const val = e.target.value;
                                                  setFieldMappings(prev => ({
                                                    ...prev,
                                                    [field.id]: { ...prev[field.id], value: val }
                                                  }));
                                                }}
                                                className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none cursor-pointer w-full"
                                              >
                                                {getSourceFieldsList().map((f: any) => (
                                                  <option key={f.id || f.name} value={f.name || f.id}>{f.label || f.name}</option>
                                                ))}
                                              </select>
                                            )}

                                            {currentMap.type === 'custom' && (
                                              <input
                                                type="text"
                                                value={currentMap.value}
                                                onChange={(e) => {
                                                  const val = e.target.value;
                                                  setFieldMappings(prev => ({
                                                    ...prev,
                                                    [field.id]: { ...prev[field.id], value: val }
                                                  }));
                                                }}
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/30"
                                                placeholder="Static text..."
                                              />
                                            )}

                                            {currentMap.type === 'ignore' && (
                                              <span className="text-[10px] text-zinc-650 font-bold tracking-wider uppercase pl-2">Ignored</span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="bg-zinc-950/40 border border-zinc-900 border-dashed rounded-2xl p-6 text-center text-[10px] font-medium text-zinc-500">
                            Select a destination module above to configure fields mapping.
                          </div>
                        )}
                      </div>

                      <label className="flex items-center gap-2.5 cursor-pointer text-[10px] text-zinc-300 font-bold select-none pt-1">
                        <input 
                          type="checkbox"
                          checked={archiveSource}
                          onChange={(e) => setArchiveSource(e.target.checked)}
                          className="rounded border-zinc-800 bg-zinc-900 text-indigo-600 focus:ring-indigo-500/50"
                        />
                        Archive source Intake record automatically upon routing
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-900/60">
                  <button 
                    onClick={() => setSelectedRuleId(null)}
                    className="px-4 py-2 border border-zinc-900 hover:border-zinc-800 rounded-xl text-xs font-bold text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveRule}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Save Rule
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full border border-dashed border-zinc-900 rounded-3xl flex flex-col items-center justify-center p-8 text-center text-zinc-550">
                <Settings size={28} className="text-zinc-600 animate-spin-slow mb-3" />
                <p className="text-xs font-bold text-zinc-400">Triage Rules Editor</p>
                <p className="text-[10px] text-zinc-500 mt-0.5 max-w-sm">Select a rule in the sequence dashboard or click the plus button to create a new triage pathway.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 border border-dashed border-zinc-900 rounded-3xl flex flex-col items-center justify-center p-12 text-center text-zinc-550">
          <Info size={36} className="text-zinc-700 mb-4" />
          <h3 className="text-sm font-black text-zinc-300">Central Intake/Triage is inactive</h3>
          <p className="text-[10px] text-zinc-500 mt-1 max-w-md">Enable the triage system to mount the centralized incoming mailbox and sequential routing rules.</p>
        </div>
      )}
    </div>
  );
};
