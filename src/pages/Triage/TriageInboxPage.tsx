import { useState, useEffect } from 'react';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { 
  Inbox, Clock, RefreshCw, Send, ChevronRight, CheckCircle, 
  AlertCircle, MessageSquare, Zap
} from 'lucide-react';
import { toast } from 'sonner';

export const TriageInboxPage = () => {
  const { tenant, modules } = usePlatform();
  const { session } = useAuth();
  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || '';
  const [triageModule, setTriageModule] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [triageRules, setTriageRules] = useState<any[]>([]);

  // Comments state
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentBody, setNewCommentBody] = useState('');

  useEffect(() => {
    if (modules) {
      const triage = modules.find((m: any) => m.isIntakeTriage === true || m.config?.isIntakeTriage === true);
      setTriageModule(triage || null);
    }
  }, [modules]);

  useEffect(() => {
    if (triageModule) {
      loadInboxRecords();
      loadTriageRules();
    }
  }, [triageModule]);

  useEffect(() => {
    if (selectedRecord) {
      loadRecordComments(selectedRecord.id);
    }
  }, [selectedRecord]);

  const loadInboxRecords = async () => {
    if (!triageModule) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/data/records?moduleId=${triageModule.id}&page=1&limit=50`, {
        headers: { 
          'x-tenant-id': tenant?.id || '',
          'Authorization': `Bearer ${token}` 
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch (err) {
      toast.error('Failed to load triage queue');
    } finally {
      setLoading(false);
    }
  };

  const loadTriageRules = async () => {
    if (!triageModule) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/automations?moduleId=${triageModule.id}`, {
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
      console.error('Failed to load rules:', err);
    }
  };

  const loadRecordComments = async (recordId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/data/${recordId}/comments`, {
        headers: { 
          'x-tenant-id': tenant?.id || '',
          'Authorization': `Bearer ${token}` 
        }
      });
      if (res.ok) {
        const comms = await res.json();
        setComments(comms);
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  const handlePostComment = async () => {
    if (!newCommentBody.trim() || !selectedRecord) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/data/${selectedRecord.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || '',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ body: newCommentBody })
      });
      if (res.ok) {
        setNewCommentBody('');
        loadRecordComments(selectedRecord.id);
        toast.success('Comment added');
      }
    } catch (err) {
      toast.error('Failed to add comment');
    }
  };

  const handleTriggerRule = async (ruleId: string) => {
    if (!selectedRecord) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/automations/${ruleId}/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant?.id || '',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ recordId: selectedRecord.id })
      });

      if (res.ok) {
        toast.success('Routing rule executed successfully');
        setSelectedRecord(null);
        loadInboxRecords();
      } else {
        const errObj = await res.json();
        throw new Error(errObj.error || 'Failed to trigger routing rule');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex-1 bg-zinc-950 p-10 overflow-y-auto custom-scrollbar flex flex-col gap-8">
      {/* Header section */}
      <header className="flex items-center justify-between border-b border-zinc-900 pb-6 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black tracking-widest text-indigo-500 uppercase">Platform Triage</span>
            <span className="h-3 w-px bg-zinc-800"></span>
            <span className="text-[10px] font-bold text-zinc-400">Triage Workspace Inbox</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
            <Inbox className="text-indigo-400" size={24} />
            Ingested Triage Queue
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Review incoming submissions, trigger routing rules, or manually assign work pathways.</p>
        </div>

        <button 
          onClick={loadInboxRecords}
          className="p-2.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-805 rounded-xl text-zinc-300 hover:text-white transition-all shadow cursor-pointer"
          title="Refresh Queue"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      {/* Main split dashboard panel */}
      {triageModule ? (
        <div className="grid grid-cols-12 gap-8 items-start flex-1 min-h-0">
          
          {/* Submissions Stream List section */}
          <div className="col-span-7 bg-zinc-900/40 border border-zinc-900 rounded-3xl p-6 flex flex-col min-h-[480px]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-black text-zinc-450 uppercase tracking-widest">Inbox Items ({records.filter(r => r.status !== 'Archived').length})</h3>
                <p className="text-[10px] text-zinc-550 mt-0.5">Pending triage matching.</p>
              </div>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] custom-scrollbar pr-1">
              {records.filter(r => r.status !== 'Archived').map((rec) => {
                const recData = rec.data || {};
                const isSelected = selectedRecord?.id === rec.id;
                return (
                  <div 
                    key={rec.id}
                    onClick={() => setSelectedRecord(rec)}
                    className={`p-4 border rounded-2xl text-left cursor-pointer transition-all flex items-start justify-between ${
                      isSelected 
                        ? 'bg-indigo-950/20 border-indigo-500/30' 
                        : 'bg-zinc-950/40 border-zinc-900/60 hover:border-zinc-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-200">
                          {recData.submitted_by || recData.name || 'Anonymous Ingestion'}
                        </span>
                        <span className="text-[8px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-semibold uppercase">
                          {recData._submissionSource || 'API Webhook'}
                        </span>
                      </div>
                      <p className="text-[9.5px] text-zinc-400 mt-1 line-clamp-1">
                        {recData.description || 'No description provided.'}
                      </p>
                      <span className="text-[8px] text-zinc-500 font-medium mt-2 block flex items-center gap-1">
                        <Clock size={8} /> {new Date(rec.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <ChevronRight size={14} className="text-zinc-500 self-center" />
                  </div>
                );
              })}
              {records.filter(r => r.status !== 'Archived').length === 0 && (
                <div className="h-full flex flex-col items-center justify-center py-20 text-center text-zinc-650">
                  <CheckCircle size={28} className="text-emerald-500/30 mb-2" />
                  <p className="text-xs font-bold text-zinc-400">Triage Queue is empty!</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">All incoming entries have been successfully triaged and routed.</p>
                </div>
              )}
            </div>
          </div>

          {/* Item details and actions panel */}
          <div className="col-span-5">
            {selectedRecord ? (
              <div className="bg-zinc-900/20 border border-zinc-900 rounded-3xl p-6 space-y-6 flex flex-col">
                <div>
                  <h3 className="text-xs font-black text-zinc-450 uppercase tracking-widest">Submission Metadata</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">Record ID: {selectedRecord.id}</p>
                </div>

                {/* Form fields parameters */}
                <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl p-4 space-y-3.5">
                  {Object.entries(selectedRecord.data || {}).filter(([k]) => !k.startsWith('_')).map(([k, v]: any) => (
                    <div key={k} className="grid grid-cols-3 gap-2 text-[10px]">
                      <span className="text-zinc-550 font-bold capitalize">{k.replace(/_/g, ' ')}</span>
                      <span className="col-span-2 text-zinc-300 font-medium break-all font-mono">
                        {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Triage Manual actions rules */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-zinc-450 uppercase tracking-widest flex items-center gap-1">
                    <Zap size={10} className="text-indigo-400" /> Apply Triage Rules
                  </h4>
                  <div className="flex flex-col gap-2">
                    {triageRules.map((rule) => (
                      <button 
                        key={rule.id}
                        onClick={() => handleTriggerRule(rule.id)}
                        className="w-full p-3 border border-zinc-900 bg-zinc-950/20 hover:border-indigo-500/30 rounded-xl text-left flex items-center justify-between cursor-pointer transition-all hover:bg-zinc-900/40 group"
                      >
                        <div>
                          <p className="text-[10px] font-bold text-zinc-200 group-hover:text-indigo-400">{rule.name}</p>
                          <p className="text-[8px] text-zinc-500 mt-0.5 leading-normal">
                            Condition: {rule.conditions || 'Unconditional'}
                          </p>
                        </div>
                        <Send size={11} className="text-zinc-550 group-hover:text-indigo-400" />
                      </button>
                    ))}
                    {triageRules.length === 0 && (
                      <p className="text-[9px] text-zinc-550 italic">No custom triage rules configured.</p>
                    )}
                  </div>
                </div>

                {/* Activity notes stream section */}
                <div className="border-t border-zinc-900 pt-5 space-y-4">
                  <h4 className="text-[10px] font-black text-zinc-450 uppercase tracking-widest flex items-center gap-1">
                    <MessageSquare size={10} className="text-indigo-400" /> Activity Stream
                  </h4>

                  {/* Comment input */}
                  <div className="flex items-center gap-2">
                    <input 
                      type="text"
                      value={newCommentBody}
                      onChange={(e) => setNewCommentBody(e.target.value)}
                      className="flex-1 bg-zinc-950 border border-zinc-900 rounded-xl px-4 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                      placeholder="Comment & @mention team..."
                    />
                    <button 
                      onClick={handlePostComment}
                      className="p-2.5 bg-indigo-600 hover:bg-indigo-505 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <Send size={11} />
                    </button>
                  </div>

                  {/* Comments list feed */}
                  <div className="space-y-3 max-h-[160px] overflow-y-auto custom-scrollbar">
                    {comments.map((comm) => (
                      <div key={comm.id} className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-[8px] font-bold text-zinc-500">
                          <span className="text-zinc-400 font-semibold">{comm.author}</span>
                          <span>{new Date(comm.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-[10px] text-zinc-300 leading-normal">{comm.body}</p>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <p className="text-[9px] text-zinc-550 italic">No notes or collaboration comments left yet.</p>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="h-full border border-dashed border-zinc-900 rounded-3xl flex flex-col items-center justify-center p-8 text-center text-zinc-550">
                <AlertCircle size={28} className="text-zinc-700 mb-3" />
                <p className="text-xs font-bold text-zinc-400">No Item Selected</p>
                <p className="text-[10px] text-zinc-500 mt-0.5 max-w-sm">Select an inbox request from the stream queue to inspect form metadata, add logs, or trigger triage routing paths.</p>
              </div>
            )}
          </div>

        </div>
      ) : (
        <div className="flex-1 border border-dashed border-zinc-900 rounded-3xl flex flex-col items-center justify-center p-12 text-center text-zinc-550">
          <AlertCircle size={36} className="text-zinc-700 mb-4" />
          <h3 className="text-sm font-black text-zinc-300">Intake / Triage is not configured</h3>
          <p className="text-[10px] text-zinc-500 mt-1 max-w-md">The Intake system is currently disabled. Please contact your system administrator to enable the triage module inside Triage settings.</p>
        </div>
      )}
    </div>
  );
};
