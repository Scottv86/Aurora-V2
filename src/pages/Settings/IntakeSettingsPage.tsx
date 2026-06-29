import { useState, useEffect } from 'react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { 
  ShieldCheck, ToggleLeft, ToggleRight, Plus, Trash2,
  Info, Link, Settings
} from 'lucide-react';
import { toast } from 'sonner';

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
  const [ruleCondition, setRuleCondition] = useState('');
  const [targetModuleId, setTargetModuleId] = useState('');
  const [fieldMappingText, setFieldMappingText] = useState('{\n  "name": "{{ trigger.record.submitted_by }}",\n  "description": "{{ trigger.record.description }}"\n}');
  const [archiveSource, setArchiveSource] = useState(true);

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

  const handleSelectRule = (rule: any) => {
    setSelectedRuleId(rule.id);
    setRuleName(rule.name);
    setRuleCondition(rule.conditions || '');
    
    const routeAction = rule.actions?.find((a: any) => a.type === 'ROUTE_TO_MODULE');
    if (routeAction) {
      setTargetModuleId(routeAction.config.targetModuleId || '');
      setFieldMappingText(JSON.stringify(routeAction.config.fieldMapping || {}, null, 2));
      setArchiveSource(routeAction.config.archiveSource !== false);
    } else {
      setTargetModuleId('');
      setFieldMappingText('{}');
      setArchiveSource(true);
    }
  };

  const handleCreateRule = () => {
    setSelectedRuleId('new');
    setRuleName('New Triage Route Rule');
    setRuleCondition('email.includes("@company.com")');
    setTargetModuleId('');
    setFieldMappingText('{\n  "name": "{{ trigger.record.submitted_by }}",\n  "description": "{{ trigger.record.description }}"\n}');
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

    let parsedMapping = {};
    try {
      parsedMapping = JSON.parse(fieldMappingText);
    } catch (err) {
      toast.error('Field mapping is not valid JSON');
      return;
    }

    const ruleData = {
      name: ruleName,
      moduleId: triageModule.id,
      isActive: true,
      conditions: ruleCondition || null,
      triggers: [{ type: 'FORM_SUBMITTED', formId: 'public_form' }],
      actions: [
        {
          type: 'ROUTE_TO_MODULE',
          config: {
            targetModuleId,
            fieldMapping: parsedMapping,
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
                <div className="py-8 text-center border border-dashed border-zinc-850 rounded-2xl">
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

                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-bold text-zinc-400">JavaScript Matching Condition (optional)</label>
                    <input 
                      type="text"
                      value={ruleCondition}
                      onChange={(e) => setRuleCondition(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                      placeholder="e.g. email.includes('@company.com')"
                    />
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

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-450">Fields Mapping Template (JSON)</label>
                        <textarea 
                          value={fieldMappingText}
                          onChange={(e) => setFieldMappingText(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 font-mono text-[10px] text-zinc-200 h-32 focus:outline-none focus:border-indigo-500/50"
                        />
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
