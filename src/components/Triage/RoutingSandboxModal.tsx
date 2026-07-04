import React, { useState } from 'react';
import { X, Play, ShieldAlert, CheckCircle2, HelpCircle } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { Button } from '../UI/Primitives';
import { toast } from 'sonner';

interface RoutingSandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  triageRules: any[];
  token: string;
  tenantId: string;
}

export const RoutingSandboxModal: React.FC<RoutingSandboxModalProps> = ({
  isOpen,
  onClose,
  triageRules,
  token,
  tenantId
}) => {
  const [submittedBy, setSubmittedBy] = useState('John Doe');
  const [email, setEmail] = useState('john.doe@example.com');
  const [description, setDescription] = useState('Need help with password resets and onboarding details.');
  const [customJson, setCustomJson] = useState('{\n  "additional_notes": "Urgent request"\n}');
  const [useCustomJson, setUseCustomJson] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  if (!isOpen) return null;

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
      } else {
        payload = {
          submitted_by: submittedBy,
          email: email,
          description: description
        };
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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-900 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-5 border-b border-zinc-900 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest text-indigo-500 uppercase">Routing Sandbox</span>
              <span className="h-3 w-px bg-zinc-800"></span>
              <span className="text-[10px] font-bold text-zinc-450">Dry-Run Simulator</span>
            </div>
            <h4 className="text-sm font-black text-white mt-1">Test Work Distribution Logic</h4>
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
                      {results.matchedRuleId ? 'Payload Routed Successfully' : 'No Rules Matched'}
                    </h6>
                    <p className="text-[10px] text-zinc-450 mt-1 leading-normal">
                      {results.matchedRuleId 
                        ? 'The simulator matched a routing sequence rule and mapped the inbound payload fields.' 
                        : 'The payload passed all rules without matching conditions. It will default to remaining in the central triage queue.'}
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
                {results.matchedRuleId && results.mappedData && (
                  <div className="space-y-3 mt-2">
                    <h6 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Simulated Mapping Output</h6>
                    <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4 space-y-2.5">
                      <div className="text-[10px] font-mono text-zinc-400">
                        <span className="text-zinc-500">Destination ID:</span> {results.targetModuleId}
                      </div>
                      <div className="border-t border-zinc-900/60 my-2" />
                      <div className="space-y-1.5 max-h-[150px] overflow-y-auto custom-scrollbar">
                        {Object.entries(results.mappedData).map(([k, v]) => (
                          <div key={k} className="flex justify-between items-center text-xs">
                            <span className="text-zinc-450 font-medium">{k}</span>
                            <span className="text-zinc-200 font-bold">{String(v || '""')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
