import React, { useState, useEffect } from 'react';
import { X, Play, ShieldAlert, CheckCircle2, HelpCircle } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { Button } from '../UI/Primitives';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface RoutingSandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  triageRules: any[];
  token: string;
  tenantId: string;
  singleRuleMode?: boolean;
  ruleName?: string;
  sourceFields?: any[];
  modules?: any[];
}

export const RoutingSandboxModal: React.FC<RoutingSandboxModalProps> = ({
  isOpen,
  onClose,
  triageRules,
  token,
  tenantId,
  singleRuleMode = false,
  ruleName = '',
  sourceFields = [],
  modules = []
}) => {
  const [submittedBy, setSubmittedBy] = useState('John Doe');
  const [email, setEmail] = useState('john.doe@example.com');
  const [description, setDescription] = useState('Need help with password resets and onboarding details.');
  const [payloadFields, setPayloadFields] = useState<Record<string, any>>({});
  const [customJson, setCustomJson] = useState('{\n  "additional_notes": "Urgent request"\n}');
  const [useCustomJson, setUseCustomJson] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    if (sourceFields && sourceFields.length > 0) {
      const initial: Record<string, any> = {};
      sourceFields.forEach(f => {
        const key = f.id && f.id.startsWith('field-') ? f.id : (f.name || f.id || '');
        initial[key] = f.type === 'boolean' ? false : '';
      });
      setPayloadFields(initial);
    } else {
      setPayloadFields({});
    }
    setResults(null);
  }, [sourceFields, isOpen]);


  const handleRunSimulation = async () => {
    setLoading(true);
    try {
      let payload: Record<string, any> = {};

      if (useCustomJson) {
        try {
          payload = JSON.parse(customJson);
        } catch (e) {
          toast.error('Invalid custom JSON payload');
          setLoading(false);
          return;
        }
      } else if (singleRuleMode && sourceFields && sourceFields.length > 0) {
        payload = { ...payloadFields };
        
        // Convert numeric strings to actual numbers
        sourceFields.forEach(f => {
          const key = f.id && f.id.startsWith('field-') ? f.id : (f.name || f.id || '');
          if (f.type === 'number' && payload[key] !== undefined && payload[key] !== '') {
            payload[key] = Number(payload[key]);
          }
        });
      } else {
        payload = {
          submitted_by: submittedBy,
          email: email,
          description: description
        };
      }

      // Automatically inject _formId and _originalModuleId from rule trigger to prevent trigger form mismatch
      const activeRule = triageRules?.[0];
      const trigger = activeRule?.triggers?.[0];
      if (trigger && trigger.formId && trigger.formId !== 'public_form') {
        payload._formId = trigger.formId;
        payload._originalModuleId = trigger.formId;
      }

      const res = await fetch(`${API_BASE_URL}/api/automations/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId
        },
        body: JSON.stringify({
          payload,
          rules: triageRules
        })
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data);
        toast.success('Simulation run completed!');
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to simulate');
      }
    } catch (err: any) {
      toast.error(err.message || 'Simulation error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative bg-zinc-950 border border-zinc-900 rounded-3xl w-full max-w-6xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl z-10"
          >
            {/* Header */}
        <div className="flex justify-between items-center px-8 py-5 border-b border-zinc-900 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest text-indigo-500 uppercase">
                {singleRuleMode ? 'Rule Sandbox' : 'Routing Sandbox'}
              </span>
              <span className="h-3 w-px bg-zinc-800"></span>
              <span className="text-[10px] font-bold text-zinc-450">
                {singleRuleMode ? 'Isolated Simulation' : 'Dry-Run Simulator'}
              </span>
            </div>
            <h4 className="text-sm font-black text-white mt-1">
              {singleRuleMode ? `Test Rule: ${ruleName || 'Unnamed Rule'}` : 'Test Work Distribution Logic'}
            </h4>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-900 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Split */}
        <div className="flex-1 flex min-h-0 overflow-y-auto">
          {/* Left panel: Inputs */}
          <div className="w-1/2 border-r border-zinc-900 p-8 space-y-6 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h5 className="text-xs font-black text-zinc-300 uppercase tracking-wider">Test Payload</h5>
              <button 
                onClick={() => setUseCustomJson(!useCustomJson)}
                className="text-[9.5px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest"
              >
                {useCustomJson ? 'Use Form Fields' : 'Use Raw JSON'}
              </button>
            </div>

            {!useCustomJson ? (
              singleRuleMode && sourceFields && sourceFields.length > 0 ? (
                <div className="space-y-4">
                  {sourceFields.map((f: any) => {
                    const key = f.id && f.id.startsWith('field-') ? f.id : (f.name || f.id || '');
                    const val = payloadFields[key] ?? '';
                    return (
                      <div key={f.id}>
                        <label className="block text-[10px] font-bold text-zinc-450 uppercase mb-1.5">{f.label || f.name}</label>
                        {f.type === 'textarea' ? (
                          <textarea
                            value={val}
                            onChange={(e) => setPayloadFields(prev => ({ ...prev, [key]: e.target.value }))}
                            rows={3}
                            className="w-full bg-zinc-900/50 border border-zinc-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none resize-none"
                          />
                        ) : f.type === 'boolean' ? (
                          <div className="flex items-center gap-2 py-1">
                            <input
                              type="checkbox"
                              checked={!!val}
                              onChange={(e) => setPayloadFields(prev => ({ ...prev, [key]: e.target.checked }))}
                              className="rounded border-zinc-900 bg-zinc-950 text-indigo-650 focus:ring-indigo-500 focus:ring-offset-zinc-950 cursor-pointer"
                            />
                            <span className="text-xs text-zinc-400">Yes / Enabled</span>
                          </div>
                        ) : (f.type === 'select' || f.type === 'dropdown') ? (
                          <select
                            value={val}
                            onChange={(e) => setPayloadFields(prev => ({ ...prev, [key]: e.target.value }))}
                            className="w-full bg-zinc-900/50 border border-zinc-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                          >
                            <option value="" className="bg-zinc-950 text-white">Select...</option>
                            {Array.isArray(f.options) && f.options.map((opt: any, idx: number) => {
                              const optVal = typeof opt === 'object' && opt !== null ? (opt.value ?? opt.id ?? '') : opt;
                              const optLabel = typeof opt === 'object' && opt !== null ? (opt.label ?? opt.name ?? optVal) : opt;
                              return (
                                <option key={idx} value={optVal} className="bg-zinc-950 text-white">{optLabel}</option>
                              );
                            })}
                          </select>
                        ) : (
                          <input
                            type={f.type === 'number' ? 'number' : 'text'}
                            value={val}
                            onChange={(e) => setPayloadFields(prev => ({ ...prev, [key]: e.target.value }))}
                            className="w-full bg-zinc-900/50 border border-zinc-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-450 uppercase mb-1.5">Submitted By</label>
                    <input 
                      type="text" 
                      value={submittedBy}
                      onChange={(e) => setSubmittedBy(e.target.value)}
                      className="w-full bg-zinc-900/50 border border-zinc-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-450 uppercase mb-1.5">Email Address</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-zinc-900/50 border border-zinc-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-450 uppercase mb-1.5">Description (Intake Text)</label>
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="w-full bg-zinc-900/50 border border-zinc-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none resize-none"
                    />
                  </div>
                </div>
              )
            ) : (
              <div>
                <label className="block text-[10px] font-bold text-zinc-450 uppercase mb-1.5">Raw JSON Ingestion Fields</label>
                <textarea 
                  value={customJson}
                  onChange={(e) => setCustomJson(e.target.value)}
                  rows={10}
                  className="w-full font-mono bg-zinc-950 border border-zinc-900 focus:border-indigo-500 rounded-xl px-3 py-2 text-[11px] text-zinc-300 focus:outline-none resize-none"
                />
              </div>
            )}

            <Button 
              onClick={handleRunSimulation}
              disabled={loading}
              className="w-full justify-center gap-2 font-bold"
            >
              <Play size={14} className="fill-current" />
              {loading ? 'Executing Simulator...' : 'Run Sandbox Simulation'}
            </Button>
          </div>

          {/* Right panel: Simulation trace */}
          <div className="w-1/2 p-8 flex flex-col min-h-0 overflow-y-auto custom-scrollbar bg-zinc-950/20">
            <h5 className="text-xs font-black text-zinc-300 uppercase tracking-wider border-b border-zinc-900 pb-3 mb-4 shrink-0">Simulation Trace Results</h5>

            {!results ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-550">
                <HelpCircle size={28} className="text-zinc-700 mb-2 animate-bounce-slow" />
                <p className="text-xs font-bold">Waiting for simulation run</p>
                <p className="text-[10px] text-zinc-500 mt-0.5 max-w-xs leading-normal">Configure your payload details and click the execution button to verify your routing logic.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-6 min-h-0">
                {/* Result header banner */}
                <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                  results.matchedRuleId 
                    ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-950/20 border-rose-500/20 text-rose-400'
                }`}>
                  {results.matchedRuleId ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <ShieldAlert size={18} className="shrink-0 mt-0.5" />}
                  <div>
                    <h6 className="text-xs font-black uppercase tracking-wider">
                      {results.matchedRuleId ? (singleRuleMode ? 'Rule Matched Condition' : 'Payload Routed Successfully') : (singleRuleMode ? 'Rule Condition Did Not Match' : 'No Rules Matched')}
                    </h6>
                    <p className="text-[10px] text-zinc-450 mt-1 leading-normal">
                      {results.matchedRuleId 
                        ? (singleRuleMode ? 'The simulator evaluated this rule and the conditions matched the input fields.' : 'The simulator matched a routing sequence rule and mapped the inbound payload fields.') 
                        : (singleRuleMode ? 'The payload input values did not satisfy the conditions defined for this rule.' : 'The payload passed all rules without matching conditions. It will default to remaining in the central triage queue.')}
                    </p>
                  </div>
                </div>

                {/* Rule trace list */}
                <div className="space-y-3">
                  <h6 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Rule Sequence Evaluation</h6>
                  <div className="space-y-2">
                    {results.simulationLogs.map((log: any, idx: number) => (
                      <div key={log.ruleId} className="flex items-center justify-between p-3 bg-zinc-900/30 border border-zinc-900 rounded-xl">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[9px] font-bold text-zinc-500 font-mono">#{idx + 1}</span>
                          <span className="text-xs font-bold text-zinc-300">{log.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-zinc-500 font-medium">{log.reason}</span>
                          {log.matched ? (
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/30" />
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-zinc-800" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mapped Data preview */}
                {results.matchedRuleId && results.mappedData && (() => {
                  const targetModule = modules?.find((m: any) => m.id === results.targetModuleId);
                  const targetModuleName = targetModule ? targetModule.name : 'Unknown Module';
                  const targetModuleCategory = targetModule?.category || 'Intake';
                  
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
                  const targetFields = targetModule ? flattenFields(targetModule.layout || []) : [];

                  return (
                    <div className="space-y-3 mt-2">
                      <h6 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Simulated Mapping Output</h6>
                      <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-5 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase block tracking-wider">Destination</span>
                            <span className="text-white font-black text-sm mt-0.5 block">{targetModuleName}</span>
                          </div>
                          <div className="text-right font-mono text-[10px] text-zinc-450">
                            <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-black uppercase text-[8px] tracking-wider block mb-1 w-fit ml-auto">
                              {targetModuleCategory}
                            </span>
                            ID: {results.targetModuleId}
                          </div>
                        </div>
                        
                        <div className="border-t border-zinc-900/60 my-3" />
                        
                        <div className="grid grid-cols-12 gap-2 text-[9.5px] font-black text-zinc-550 uppercase tracking-widest pb-1.5 border-b border-zinc-900/45 shrink-0 select-none">
                          <div className="col-span-5">Field Name</div>
                          <div className="col-span-4">Key (Slug) / ID</div>
                          <div className="col-span-3 text-right">Mapped Value</div>
                        </div>

                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                          {Object.entries(results.mappedData).map(([k, v]) => {
                            const targetField = targetFields.find((f: any) => f.id === k || f.name === k);
                            const fieldName = targetField ? (targetField.label || targetField.name) : 'Unknown Field';
                            const fieldSlug = targetField ? targetField.name : k;
                            const fieldId = targetField ? targetField.id : k;
                            
                            return (
                              <div key={k} className="grid grid-cols-12 gap-2 items-start text-xs py-1 border-b border-zinc-900/10">
                                <div className="col-span-5 text-zinc-200 font-semibold truncate" title={fieldName}>
                                  {fieldName}
                                </div>
                                <div className="col-span-4 font-mono text-[9px] text-zinc-500 truncate" title={`Slug: ${fieldSlug}\nID: ${fieldId}`}>
                                  <span className="text-zinc-400 font-bold block">{fieldSlug}</span>
                                  {fieldId !== fieldSlug && <span className="text-[8px] text-zinc-650 block mt-0.5">{fieldId}</span>}
                                </div>
                                <div className="col-span-3 text-right text-teal-400 font-black truncate" title={String(v || '""')}>
                                  {String(v || '""')}
                                </div>
                              </div>
                            );
                          })}
                          {Object.keys(results.mappedData).length === 0 && (
                            <div className="py-6 text-center text-[10px] text-zinc-550 italic">
                              No fields were mapped for this routing block.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>
  );
};
