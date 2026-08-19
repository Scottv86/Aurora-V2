import React, { useState } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Zap, 
  Wrench, 
  Search, 
  Eye, 
  ChevronRight, 
  ShieldAlert,
  Bot
} from 'lucide-react';
import { AgentBlueprint, AgentRunLog } from '../../../types/agent';

export interface AgentAnalyticsViewProps {
  blueprint: AgentBlueprint;
}

export const AgentAnalyticsView: React.FC<AgentAnalyticsViewProps> = ({ blueprint }) => {
  const [searchLog, setSearchLog] = useState('');
  const [selectedLog, setSelectedLog] = useState<AgentRunLog | null>(null);

  // Generate dynamic logs based on sandbox messages or default blueprint metrics
  const logs: AgentRunLog[] = blueprint.analytics?.recentRunLogs && blueprint.analytics.recentRunLogs.length > 0
    ? blueprint.analytics.recentRunLogs
    : (blueprint.sandboxMessages || []).filter(m => m.role === 'agent').map((m, i) => ({
        id: `run_${m.id}`,
        timestamp: m.timestamp,
        trigger: 'MANUAL',
        status: m.requiresApproval ? 'ESCALATED' : 'SUCCESS',
        tokensUsed: m.tokensUsed || 340,
        latencyMs: 420 + i * 40,
        query: 'Sandbox Test Execution',
        response: m.content,
        toolsUsed: (m.traces || []).filter(t => t.type === 'tool_call').map(t => t.toolName || 'Tool'),
        traces: m.traces || []
      }));

  const totalRuns = logs.length > 0 ? logs.length : 1;
  const successCount = logs.filter(l => l.status === 'SUCCESS').length;
  const successRate = logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 100;
  const totalTokens = logs.reduce((acc, l) => acc + l.tokensUsed, 0) || 1240;
  const avgLatency = logs.length > 0 ? Math.round(logs.reduce((acc, l) => acc + l.latencyMs, 0) / logs.length) : 380;

  const filteredLogs = logs.filter(l => 
    l.query.toLowerCase().includes(searchLog.toLowerCase()) ||
    l.response.toLowerCase().includes(searchLog.toLowerCase()) ||
    l.status.toLowerCase().includes(searchLog.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5 text-xs">
      {/* Top 4 KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-bold uppercase text-[10px] tracking-wider">Total Invocations</span>
            <Activity size={15} className="text-indigo-500" />
          </div>
          <p className="text-xl font-black text-zinc-900 dark:text-white">{totalRuns}</p>
          <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
            <CheckCircle2 size={10} /> Active & Tracking
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-bold uppercase text-[10px] tracking-wider">Success Rate</span>
            <CheckCircle2 size={15} className="text-emerald-500" />
          </div>
          <p className="text-xl font-black text-zinc-900 dark:text-white">{successRate}%</p>
          <span className="text-[10px] text-zinc-400">{logs.filter(l => l.status === 'ESCALATED').length} escalated to HITL</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-bold uppercase text-[10px] tracking-wider">Avg Latency</span>
            <Clock size={15} className="text-amber-500" />
          </div>
          <p className="text-xl font-black text-zinc-900 dark:text-white">{avgLatency}ms</p>
          <span className="text-[10px] text-zinc-400">LLM + Tool calling</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="font-bold uppercase text-[10px] tracking-wider">Token Usage</span>
            <Zap size={15} className="text-purple-500" />
          </div>
          <p className="text-xl font-black text-zinc-900 dark:text-white">{totalTokens.toLocaleString()}</p>
          <span className="text-[10px] text-zinc-400 font-mono">~${((totalTokens / 1000) * 0.00015).toFixed(4)} USD</span>
        </div>
      </div>

      {/* Execution Run Logs Table */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Activity size={15} className="text-indigo-500" />
            <span>Execution Audit Logs</span>
          </h4>

          <div className="relative w-48">
            <Search size={12} className="absolute left-2.5 top-2 text-zinc-400" />
            <input
              type="text"
              placeholder="Filter logs..."
              value={searchLog}
              onChange={(e) => setSearchLog(e.target.value)}
              className="w-full pl-7 pr-3 py-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[11px]"
            />
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-6 text-center text-zinc-400">
            No execution logs recorded yet. Send messages in the Test Chat to generate audit runs.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700/50 hover:border-indigo-500 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    log.status === 'SUCCESS' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600'
                  }`}>
                    {log.status === 'SUCCESS' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900 dark:text-white truncate">{log.query}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                        {log.trigger}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{log.response}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-3 text-[10px] text-zinc-400">
                  <span>{log.latencyMs}ms</span>
                  <span>{log.tokensUsed} tokens</span>
                  <span>{log.timestamp}</span>
                  <ChevronRight size={14} className="text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Run Details Modal / Drawer */}
      {selectedLog && (
        <div className="p-4 rounded-2xl bg-zinc-900 text-zinc-200 border border-zinc-800 space-y-3 font-mono text-[11px]">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="font-bold text-white font-sans">Run Inspection: {selectedLog.id}</span>
            <button onClick={() => setSelectedLog(null)} className="text-zinc-400 hover:text-white font-sans">Close</button>
          </div>
          <div>
            <span className="text-zinc-400 block text-[10px] uppercase">Query</span>
            <p className="font-sans text-white">{selectedLog.query}</p>
          </div>
          <div>
            <span className="text-zinc-400 block text-[10px] uppercase">Response</span>
            <p className="font-sans text-zinc-300 whitespace-pre-wrap">{selectedLog.response}</p>
          </div>
          {selectedLog.traces.length > 0 && (
            <div>
              <span className="text-zinc-400 block text-[10px] uppercase mb-1">Execution Steps ({selectedLog.traces.length})</span>
              <div className="space-y-1.5">
                {selectedLog.traces.map(t => (
                  <div key={t.id} className="p-2 rounded bg-zinc-800/80 border border-zinc-700 text-[10px]">
                    <div className="flex justify-between font-bold text-indigo-400 font-sans">
                      <span>{t.title}</span>
                      <span>{t.latencyMs}ms</span>
                    </div>
                    <p className="text-zinc-300 font-sans mt-0.5">{t.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
