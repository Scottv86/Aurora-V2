import { useState, useEffect } from 'react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { 
  ShieldCheck, Plus, Trash2,
  Info, Settings, ShieldAlert, GitFork, Loader2, Play
} from 'lucide-react';
import { toast } from 'sonner';
import { Tabs } from '../../components/UI/TabsAndModal';
import { RoutingSandboxModal } from '../../components/Triage/RoutingSandboxModal';

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
  const { tenant, modules, modulesLoading, refreshModules } = usePlatform();
  const { session } = useAuth();
  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || '';
  const isNested = window.location.pathname.includes('/platform-modules/');
  const [activeTab, setActiveTab] = useState<'routing' | 'security'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') === 'security' ? 'security' : 'routing';
  });
  
  const tabs = [
    { id: 'routing', label: 'Routing & Channels', icon: GitFork },
    { id: 'security', label: 'Security & Quarantine', icon: ShieldCheck }
  ];
  
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);

  const [quarantineRecords, setQuarantineRecords] = useState<any[]>([]);
  const [quarantineLoading, setQuarantineLoading] = useState(false);
  const [inspectedRecord, setInspectedRecord] = useState<any>(null);
  const [triageModule, setTriageModule] = useState<any>(null);
  const [triageRules, setTriageRules] = useState<any[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);

  // Rule editor form state
  const [ruleName, setRuleName] = useState('');
  const [targetModuleId, setTargetModuleId] = useState('');
  const [archiveSource, setArchiveSource] = useState(true);
  const [triggerMode, setTriggerMode] = useState<'IMMEDIATE' | 'GLOBAL_SCHEDULE' | 'CUSTOM_SCHEDULE'>('GLOBAL_SCHEDULE');
  const [customScheduleType, setCustomScheduleType] = useState<'INTERVAL' | 'DAILY' | 'WEEKLY'>('INTERVAL');
  const [customIntervalValue, setCustomIntervalValue] = useState<number>(15);
  const [customIntervalUnit, setCustomIntervalUnit] = useState<'minutes' | 'hours'>('minutes');
  const [customTime, setCustomTime] = useState<string>('09:00');
  const [customDays, setCustomDays] = useState<string[]>(['1', '2', '3', '4', '5']);
  const [sourceModuleId, setSourceModuleId] = useState('public_form');

  const compileCustomCron = () => {
    if (customScheduleType === 'INTERVAL') {
      if (customIntervalUnit === 'minutes') {
        return `*/${customIntervalValue} * * * *`;
      } else {
        return `0 */${customIntervalValue} * * *`;
      }
    } else if (customScheduleType === 'DAILY') {
      const [hour, minute] = customTime.split(':');
      return `${minute || '0'} ${hour || '9'} * * *`;
    } else if (customScheduleType === 'WEEKLY') {
      const [hour, minute] = customTime.split(':');
      const daysStr = customDays.length > 0 ? customDays.join(',') : '*';
      return `${minute || '0'} ${hour || '9'} * * ${daysStr}`;
    }
    return '*/15 * * * *';
  };

  const getBusinessModules = (list: any[]) => {
    if (!list) return [];
    return list.filter((m: any) => {
      if (m.enabled === false || m.status === 'INACTIVE') return false;
      if (m.category?.toLowerCase() === 'platform') return false;
      if (m.type === 'PLATFORM' || m.type === 'SYSTEM') return false;
      if (m.isGlobal) return false;
      if (m.config?.isPlatform || m.config?.isSystem) return false;
      if (triageModule && m.id === triageModule.id) return false;
      if (m.isIntakeTriage || m.config?.isIntakeTriage) return false;
      
      const lowerName = m.name.toLowerCase();
      if (lowerName.includes('triage') || lowerName.includes('intake') || lowerName.includes('automation')) return false;

      return true;
    });
  };

  const parseCronExpression = (cron: string) => {
    if (!cron || cron === 'GLOBAL') {
      setCustomScheduleType('INTERVAL');
      setCustomIntervalValue(15);
      setCustomIntervalUnit('minutes');
      setCustomTime('09:00');
      setCustomDays(['1', '2', '3', '4', '5']);
      return;
    }

    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) return;

    const [minute, hour, , , dayOfWeek] = parts;

    if (minute.startsWith('*/')) {
      setCustomScheduleType('INTERVAL');
      setCustomIntervalValue(parseInt(minute.substring(2)) || 15);
      setCustomIntervalUnit('minutes');
    } else if (hour.startsWith('*/') && minute === '0') {
      setCustomScheduleType('INTERVAL');
      setCustomIntervalValue(parseInt(hour.substring(2)) || 1);
      setCustomIntervalUnit('hours');
    } else if (dayOfWeek !== '*' && dayOfWeek !== '?') {
      setCustomScheduleType('WEEKLY');
      const cleanHour = hour.padStart(2, '0');
      const cleanMin = minute.padStart(2, '0');
      setCustomTime(`${cleanHour}:${cleanMin}`);
      setCustomDays(dayOfWeek.split(','));
    } else {
      setCustomScheduleType('DAILY');
      const cleanHour = hour.padStart(2, '0');
      const cleanMin = minute.padStart(2, '0');
      setCustomTime(`${cleanHour}:${cleanMin}`);
    }
  };
  const [conditionsList, setConditionsList] = useState<VisualCondition[]>([]);
  const [fieldMappings, setFieldMappings] = useState<VisualMappings>({});

  const getSourceFieldsList = () => {
    if (sourceModuleId && sourceModuleId !== 'public_form') {
      let sourceModule = modules?.find((m: any) => m.id === sourceModuleId);
      let activeForm = null;

      if (!sourceModule && modules) {
        for (const m of modules) {
          const form = m.forms?.find((f: any) => f.id === sourceModuleId);
          if (form) {
            sourceModule = m;
            activeForm = form;
            break;
          }
        }
      }

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

        if (activeForm) {
          const formFieldIds = new Set(activeForm.fields?.map((ff: any) => ff.id) || []);
          const allFields = flattenFields(sourceModule.layout);
          return allFields.filter(f => formFieldIds.has(f.id));
        }

        return flattenFields(sourceModule.layout);
      }
    }
    return triageModule?.layout || [];
  };

  const getFieldDatabaseKey = (f: any): string => {
    if (f.id && f.id.startsWith('field-')) {
      return f.id;
    }
    return f.name || f.id || '';
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
        toast.success(`Global distribution schedule updated`);
        await refreshModules();
      } else {
        throw new Error('Failed to update global schedule');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save global schedule');
    }
  };

  const handleSaveSlaConfig = async (newSlaConfig: any) => {
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
            slaConfig: newSlaConfig
          }
        })
      });

      if (res.ok) {
        toast.success('SLA settings updated');
        await refreshModules();
      } else {
        throw new Error('Failed to update SLA settings');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save SLA settings');
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
      } else {
        setTriggerMode('CUSTOM_SCHEDULE');
        parseCronExpression(trigger.cronExpression || '*/15 * * * *');
      }
      setSourceModuleId(trigger.formId || 'public_form');
    } else {
      setTriggerMode('IMMEDIATE');
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
    setRuleName('New Routing Rule');
    setConditionsList([]);
    setTriggerMode('GLOBAL_SCHEDULE');
    setSourceModuleId('public_form');
    setTargetModuleId('');
    setFieldMappings({});
    setArchiveSource(true);
    setCustomScheduleType('INTERVAL');
    setCustomIntervalValue(15);
    setCustomIntervalUnit('minutes');
    setCustomTime('09:00');
    setCustomDays(['1', '2', '3', '4', '5']);
  };

  const handleSaveRule = async (asDraft: boolean = false) => {
    if (!ruleName) {
      toast.error('Rule name is required');
      return;
    }
    if (!targetModuleId) {
      toast.error('Please select a target module');
      return;
    }

    const isEdit = selectedRuleId !== 'new';
    const compiledCondition = compileConditions(conditionsList);
    const serializedMapping = serializeMappings(fieldMappings);

    let triggers = [];
    if (triggerMode === 'IMMEDIATE') {
      triggers = [{ type: 'FORM_SUBMITTED', formId: sourceModuleId || 'public_form' }];
    } else if (triggerMode === 'GLOBAL_SCHEDULE') {
      triggers = [{ type: 'CRON', cronExpression: 'GLOBAL', moduleId: triageModule.id, formId: sourceModuleId || 'public_form' }];
    } else {
      const compiledCron = compileCustomCron();
      triggers = [{ type: 'CRON', cronExpression: compiledCron, moduleId: triageModule.id, formId: sourceModuleId || 'public_form' }];
    }

    const ruleData = {
      name: ruleName,
      moduleId: triageModule.id,
      isActive: !asDraft,
      status: asDraft ? 'DRAFT' : 'PUBLISHED',
      parentRuleId: (isEdit && asDraft) ? selectedRuleId : undefined,
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
        toast.success('Routing rule saved successfully');
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
        toast.success('Routing rule deleted');
        setSelectedRuleId(null);
        loadTriageConfig();
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const loadQuarantineRecords = async () => {
    try {
      setQuarantineLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/automations/quarantine`, {
        headers: {
          'x-tenant-id': tenant?.id || '',
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('[Quarantine] Fetch response status:', res.status, res.statusText);
      if (res.ok) {
        const data = await res.json();
        setQuarantineRecords(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned ${res.status}`);
      }
    } catch (err: any) {
      console.error('Failed to load quarantine log:', err);
      toast.error(`Failed to load quarantine logs: ${err.message}`);
    } finally {
      setQuarantineLoading(false);
    }
  };

  const handleDeleteQuarantine = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this quarantined record?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/automations/quarantine/${id}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': tenant?.id || '',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        toast.success('Quarantined record permanently deleted');
        loadQuarantineRecords();
      } else {
        throw new Error('Failed to delete quarantined record');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleReleaseQuarantine = async (id: string) => {
    if (!confirm('Are you sure you want to release this record to the active Work Distribution queue?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/automations/quarantine/${id}/release`, {
        method: 'POST',
        headers: {
          'x-tenant-id': tenant?.id || '',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        toast.success('Record successfully released to queue');
        loadQuarantineRecords();
      } else {
        const errObj = await res.json();
        throw new Error(errObj.error || 'Failed to release quarantined record');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    if (activeTab === 'security') {
      loadQuarantineRecords();
    }
  }, [activeTab, tenant?.id, token]);



  const renderSecurityTab = () => {
    return (
      <div className="flex flex-col gap-6 flex-1 min-h-0">
        <div className="bg-zinc-900/40 border border-zinc-900 rounded-3xl p-6 space-y-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-amber-500" size={18} />
            <div>
              <h3 className="text-xs font-black text-zinc-450 uppercase tracking-widest">Inbound Security Quarantine</h3>
              <p className="text-[10px] text-zinc-450 mt-0.5">Isolated records flagged by inbound security screening rules.</p>
            </div>
          </div>

          {quarantineLoading ? (
            <div className="py-12 text-center text-xs text-zinc-550 font-bold animate-pulse">Loading quarantine logs...</div>
          ) : quarantineRecords.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-zinc-900 rounded-2xl">
              <p className="text-[10px] text-zinc-550 italic">No items currently in quarantine.</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-900/80 text-[10px] font-black text-zinc-450 uppercase tracking-wider">
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Source Name</th>
                    <th className="py-3 px-4">Threat Type</th>
                    <th className="py-3 px-4">Blocked At</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40">
                  {quarantineRecords.map((rec) => (
                    <tr key={rec.id} className="text-xs text-zinc-300 hover:bg-zinc-900/10">
                      <td className="py-3 px-4 font-bold">{rec.sourceChannel}</td>
                      <td className="py-3 px-4 text-zinc-400">{rec.sourceName}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(rec.reasons || []).map((reason: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-rose-500/10 text-rose-400 border border-rose-500/10" title={reason}>
                              {reason.split(':')[0]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-zinc-450 font-mono text-[10px]">
                        {new Date(rec.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-bold uppercase ${
                          rec.status === 'QUARANTINED' 
                            ? 'bg-amber-950/30 text-amber-400 border border-amber-500/10' 
                            : 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/10'
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => setInspectedRecord(rec)}
                          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700/50 text-[9px] font-bold text-zinc-200 cursor-pointer"
                        >
                          Inspect
                        </button>
                        {rec.status === 'QUARANTINED' && (
                          <button
                            onClick={() => handleReleaseQuarantine(rec.id)}
                            className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-[9px] font-bold text-emerald-400 cursor-pointer"
                          >
                            Release
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteQuarantine(rec.id)}
                          className="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-[9px] font-bold text-rose-400 cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`flex-1 flex flex-col gap-8 ${isNested ? 'p-0 bg-transparent' : 'bg-zinc-950 p-10 overflow-y-auto custom-scrollbar'}`}>
      {/* Header section */}
      {!isNested && (
        <header className="flex items-center justify-between border-b border-zinc-900 pb-6 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest text-indigo-500 uppercase">Work Distribution Settings</span>
              <span className="h-3 w-px bg-zinc-800"></span>
              <span className="text-[10px] font-bold text-zinc-450">Platform Settings</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
              <ShieldCheck className="text-indigo-400" size={24} />
              Work Distribution
            </h1>
            <p className="text-xs text-zinc-400 mt-1">Configure tenancy-wide rules to automatically route, validate, and distribute incoming requests.</p>
          </div>
        </header>
      )}

      {/* Sub-navigation tabs */}
      <Tabs 
        tabs={tabs} 
        activeTab={activeTab} 
        onChange={(id) => setActiveTab(id as any)} 
        firstTabPadding={false}
      />

      {activeTab === 'routing' ? (
        modulesLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-zinc-550">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
            <p className="text-xs font-bold text-zinc-450 font-sans">Loading Work Distribution settings...</p>
          </div>
        ) : triageModule ? (
          <div className="grid grid-cols-12 gap-8 items-start flex-1 min-h-0">
            {/* Rules Dashboard section */}
            <div className="col-span-4 bg-zinc-900/40 border border-zinc-900 rounded-3xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-zinc-450 uppercase tracking-widest">Routing Rules</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Matched sequentially on intake.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsSandboxOpen(true)}
                    className="p-2 bg-teal-500/10 hover:bg-teal-500/25 text-teal-400 border border-teal-500/20 rounded-xl transition-all cursor-pointer"
                    title="Open Routing Sandbox"
                  >
                    <Play size={13} className="fill-current" />
                  </button>
                  <button 
                    onClick={handleCreateRule}
                    className="p-2 bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/20 rounded-xl transition-all cursor-pointer"
                    title="Create Routing Rule"
                  >
                    <Plus size={13} />
                  </button>
                </div>
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
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[10px] text-zinc-400 font-mono">
                            Route to {targetMod ? targetMod.name : 'Unknown Module'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            rule.status === 'DRAFT' || !rule.isActive
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                          }`}>
                            {rule.status || (rule.isActive ? 'Published' : 'Draft')}
                          </span>
                        </div>
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
                  <div className="bg-zinc-950/20 border border-dashed border-zinc-900 rounded-2xl p-6 text-center text-zinc-550 select-none animate-in fade-in duration-200">
                    <p className="text-[10px] text-zinc-500 italic">No routing rules configured yet.</p>
                  </div>
                )}
              </div>

              {/* Global Queue Schedule Settings */}
              <div className="border-t border-zinc-900 pt-6 space-y-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="text-[10px] font-black text-zinc-450 uppercase tracking-widest">Global Distribution Schedule</h4>
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

                {/* SLA Configuration */}
                <div className="border-t border-zinc-900/60 pt-4 space-y-3">
                  <div>
                    <h4 className="text-[10px] font-black text-zinc-450 uppercase tracking-widest">SLA Escalation Rules</h4>
                    <p className="text-[8px] text-zinc-400">Define response thresholds for incoming triage items.</p>
                  </div>
                  
                  <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-4 space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500">Warning Period (Hours)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={triageModule?.config?.slaConfig?.warningHours ?? 0.5}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0.5;
                            handleSaveSlaConfig({
                              ...(triageModule?.config?.slaConfig || {}),
                              warningHours: val
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500">Breach Period (Hours)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={triageModule?.config?.slaConfig?.breachHours ?? 24}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 24;
                            handleSaveSlaConfig({
                              ...(triageModule?.config?.slaConfig || {}),
                              breachHours: val
                            });
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Rule Editor detail section */}
            <div className="col-span-8">
              {selectedRuleId ? (
                <div className="bg-zinc-900/20 border border-zinc-900 rounded-3xl p-8 space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-zinc-300">Routing Rule Configuration</h3>
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

                    <div className="space-y-3 col-span-2">
                      <label className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider block">Rule Trigger Settings</label>
                      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 grid grid-cols-2 gap-4">
                        <div className="space-y-1 col-span-2">
                          <label className="text-[9px] font-bold text-zinc-500">Trigger Mode</label>
                          <div className="grid grid-cols-3 gap-3 mt-1">
                            <label className={`p-4 border rounded-2xl cursor-pointer flex flex-col gap-1 transition-all ${
                              triggerMode === 'IMMEDIATE' 
                                ? 'bg-indigo-950/20 border-indigo-500/40 ring-1 ring-indigo-500/40' 
                                : 'bg-zinc-950/40 border-zinc-900 hover:border-zinc-800'
                            }`}>
                              <input 
                                type="radio" 
                                name="triggerMode"
                                checked={triggerMode === 'IMMEDIATE'}
                                onChange={() => {
                                  setTriggerMode('IMMEDIATE');
                                }}
                                className="sr-only"
                              />
                              <span className="text-xs font-bold text-zinc-200">Run Immediately</span>
                              <span className="text-[8.5px] text-zinc-500 leading-normal">Execute routing rules instantly upon new form submissions.</span>
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
                                }}
                                className="sr-only"
                              />
                              <span className="text-xs font-bold text-zinc-200">Global Schedule</span>
                              <span className="text-[8.5px] text-zinc-500 leading-normal">Run according to the shared Work Distribution interval.</span>
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
                                }}
                                className="sr-only"
                              />
                              <span className="text-xs font-bold text-zinc-200">Custom Schedule</span>
                              <span className="text-[8.5px] text-zinc-500 leading-normal">Specify a custom cron interval for this specific rule.</span>
                            </label>
                          </div>
                        </div>

                        {triggerMode === 'CUSTOM_SCHEDULE' && (
                          <div className="col-span-2 space-y-4 p-4 bg-zinc-950/40 border border-zinc-900 rounded-2xl animate-in fade-in duration-200">
                            <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-zinc-500">Pattern</label>
                                <select 
                                  value={customScheduleType}
                                  onChange={(e) => setCustomScheduleType(e.target.value as any)}
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 cursor-pointer"
                                >
                                  <option value="INTERVAL">At regular intervals</option>
                                  <option value="DAILY">Daily</option>
                                  <option value="WEEKLY">Weekly</option>
                                </select>
                              </div>

                              {customScheduleType === 'INTERVAL' && (
                                <>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-zinc-500">Run every</label>
                                    <input 
                                      type="number"
                                      min={1}
                                      value={customIntervalValue}
                                      onChange={(e) => setCustomIntervalValue(parseInt(e.target.value) || 1)}
                                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-zinc-500">Unit</label>
                                    <select 
                                      value={customIntervalUnit}
                                      onChange={(e) => setCustomIntervalUnit(e.target.value as any)}
                                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 cursor-pointer"
                                    >
                                      <option value="minutes">Minutes</option>
                                      <option value="hours">Hours</option>
                                    </select>
                                  </div>
                                </>
                              )}

                              {(customScheduleType === 'DAILY' || customScheduleType === 'WEEKLY') && (
                                <div className="space-y-1 col-span-2">
                                  <label className="text-[9px] font-bold text-zinc-500">Time of Day</label>
                                  <input 
                                    type="time"
                                    value={customTime}
                                    onChange={(e) => setCustomTime(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none"
                                  />
                                </div>
                              )}
                            </div>

                            {customScheduleType === 'WEEKLY' && (
                              <div className="space-y-1.5 animate-in fade-in duration-200">
                                <label className="text-[9px] font-bold text-zinc-500">Days of the Week</label>
                                <div className="flex gap-2.5 flex-wrap mt-1">
                                  {[
                                    { label: 'Mon', value: '1' },
                                    { label: 'Tue', value: '2' },
                                    { label: 'Wed', value: '3' },
                                    { label: 'Thu', value: '4' },
                                    { label: 'Fri', value: '5' },
                                    { label: 'Sat', value: '6' },
                                    { label: 'Sun', value: '0' }
                                  ].map((d) => {
                                    const isSelected = customDays.includes(d.value);
                                    return (
                                      <button
                                        key={d.value}
                                        type="button"
                                        onClick={() => {
                                          if (isSelected) {
                                            setCustomDays(prev => prev.filter(x => x !== d.value));
                                          } else {
                                            setCustomDays(prev => [...prev, d.value]);
                                          }
                                        }}
                                        className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                                          isSelected 
                                            ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400' 
                                            : 'bg-zinc-900 border-zinc-800 text-zinc-450 hover:border-zinc-700'
                                        }`}
                                      >
                                        {d.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[10px] font-bold text-zinc-400">Intake Data Source (Form)</label>
                      <select 
                        value={sourceModuleId}
                        onChange={(e) => setSourceModuleId(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-2.5 text-xs text-zinc-200 cursor-pointer"
                      >
                        <option value="public_form">All Intake Forms</option>
                        {getBusinessModules(modules).flatMap((m: any) => {
                          const forms = m.forms || [];
                          const publicForms = forms.filter((f: any) => f.usage === 'public_link');
                          return publicForms.map((f: any) => (
                            <option key={f.id} value={f.id}>{m.name} - {f.name}</option>
                          ));
                        })}
                      </select>
                    </div>

                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[10px] font-bold text-zinc-400 font-mono">Routing Action: Route Record</label>
                      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-450">Destination Business Module</label>
                          <select 
                            value={targetModuleId}
                            onChange={(e) => setTargetModuleId(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 cursor-pointer"
                          >
                            <option value="">Select Destination Module...</option>
                            {getBusinessModules(modules).map((m: any) => (
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
                              const fields = flattenFields(targetModule?.layout || []);
                              
                              if (fields.length === 0) {
                                return <p className="text-[10px] text-zinc-500 italic">No custom fields found on the destination module.</p>;
                              }

                              return (
                                <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-1.5">
                                  {fields.map(f => {
                                    const mapping = fieldMappings[f.id] || { type: 'ignore', value: '' };
                                    return (
                                      <div key={f.id} className="flex items-center justify-between gap-4 bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-900">
                                        <div className="flex flex-col">
                                          <span className="text-xs font-bold text-zinc-300">{f.label || f.name}</span>
                                          <span className="text-[8px] text-zinc-500 uppercase font-mono font-black mt-0.5">{f.type}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <select
                                            value={mapping.type}
                                            onChange={(e) => {
                                              const type = e.target.value as any;
                                              setFieldMappings(prev => ({
                                                ...prev,
                                                [f.id]: { type, value: type === 'ignore' ? '' : prev[f.id]?.value || '' }
                                              }));
                                            }}
                                            className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] text-zinc-300 cursor-pointer"
                                          >
                                            <option value="ignore">Ignore Field</option>
                                            <option value="source">Source Match</option>
                                            <option value="custom">Static Value</option>
                                          </select>

                                          {mapping.type === 'source' && (
                                            <select
                                              value={mapping.value}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                setFieldMappings(prev => ({
                                                  ...prev,
                                                  [f.id]: { ...prev[f.id], value: val }
                                                }));
                                              }}
                                              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] text-zinc-300 cursor-pointer max-w-[120px]"
                                            >
                                              <option value="">Select Field...</option>
                                              {getSourceFieldsList().map((sf: any) => (
                                                <option key={sf.id || sf.name} value={getFieldDatabaseKey(sf)}>{sf.label || sf.name}</option>
                                              ))}
                                            </select>
                                          )}

                                          {mapping.type === 'custom' && (
                                            <input 
                                              type="text"
                                              value={mapping.value}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                setFieldMappings(prev => ({
                                                  ...prev,
                                                  [f.id]: { ...prev[f.id], value: val }
                                                }));
                                              }}
                                              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] text-zinc-300 focus:outline-none w-[120px]"
                                              placeholder="Static value..."
                                            />
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()
                          ) : (
                            <p className="text-[10px] text-zinc-500 italic">Select a destination module to configure mapping setup.</p>
                          )}
                        </div>

                        <div className="border-t border-zinc-900 pt-4 col-span-2 flex items-center justify-between text-xs text-zinc-400">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={archiveSource} 
                              onChange={(e) => setArchiveSource(e.target.checked)}
                              className="rounded border-zinc-850 bg-zinc-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-950 cursor-pointer"
                            />
                            <span>Archive source Intake record automatically upon routing</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-zinc-900/60 pt-6 flex items-center justify-end gap-3">
                    <button
                      onClick={() => setSelectedRuleId(null)}
                      className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-950/20 hover:bg-zinc-900/40 text-xs font-bold text-zinc-300 rounded-xl transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveRule(true)}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-350 hover:text-white border border-zinc-700/80 rounded-xl transition-all cursor-pointer"
                    >
                      Save as Draft
                    </button>
                    <button
                      onClick={() => handleSaveRule(false)}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-xl transition-all shadow-lg shadow-indigo-600/10 cursor-pointer"
                    >
                      Save & Publish
                    </button>
                  </div>
                </div>
              ) : (
                /* Detail Pane Empty State */
                <div className="h-full border border-dashed border-zinc-900 rounded-3xl flex flex-col items-center justify-center p-8 text-center text-zinc-550 bg-zinc-950/10">
                  <Settings size={28} className="text-zinc-650 animate-spin-slow mb-3" />
                  <p className="text-xs font-bold text-zinc-450">Routing Rules Editor</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5 max-w-sm">Select a rule in the sequence dashboard or click the plus button to create a new routing pathway.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 border border-dashed border-zinc-900 rounded-3xl flex flex-col items-center justify-center p-12 text-center text-zinc-550">
            <Info size={36} className="text-zinc-700 mb-4" />
            <h3 className="text-sm font-black text-zinc-300">Work Distribution is not configured</h3>
            <p className="text-[10px] text-zinc-500 mt-1 max-w-md">The Work Distribution system is currently being provisioned. Please wait or refresh the page to load the configuration.</p>
          </div>
        )
      ) : (
        renderSecurityTab()
      )}

      {/* Inspect Payload Modal */}
      {inspectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-850 pb-3">
              <div>
                <h4 className="text-sm font-black text-white">Inspecting Inbound Payload</h4>
                <p className="text-[10px] text-zinc-550">Record ID: {inspectedRecord.id}</p>
              </div>
              <button 
                onClick={() => setInspectedRecord(null)}
                className="text-zinc-450 hover:text-zinc-300 text-xs font-bold px-2.5 py-1 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-950/20 cursor-pointer"
              >
                Close
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[350px] bg-zinc-950 p-4 rounded-2xl border border-zinc-900 font-mono text-[10px] text-zinc-400 custom-scrollbar select-text">
              <pre>{JSON.stringify(inspectedRecord.payload, null, 2)}</pre>
            </div>
            
            <div className="flex justify-between items-center pt-2 text-[10px] text-zinc-500 border-t border-zinc-850">
              <div>
                Security Flags: <span className="font-bold text-rose-400">{inspectedRecord.reasons.join(', ')}</span>
              </div>
              <div className="space-x-2">
                {inspectedRecord.status === 'QUARANTINED' && (
                  <button 
                    onClick={() => {
                      const recId = inspectedRecord.id;
                      setInspectedRecord(null);
                      handleReleaseQuarantine(recId);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer text-[10px]"
                  >
                    Release to Queue
                  </button>
                )}
                <button 
                  onClick={() => {
                    const recId = inspectedRecord.id;
                    setInspectedRecord(null);
                    handleDeleteQuarantine(recId);
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl cursor-pointer text-[10px]"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <RoutingSandboxModal
        isOpen={isSandboxOpen}
        onClose={() => setIsSandboxOpen(false)}
        triageRules={triageRules}
        token={token}
        tenantId={tenant?.id || ''}
      />
    </div>
  );
};
