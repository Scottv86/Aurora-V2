import React, { useState } from 'react';
import { 
  Play, 
  Terminal, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Search,
  Bug
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Workflow, WorkflowNode } from '../../../types/platform';
import { WorkflowEngine, WorkflowState } from '../../../../server/services/workflowEngine';
import { cn } from '../../../lib/utils';

interface WorkflowDebuggerProps {
  workflow: Workflow;
}

export const WorkflowDebugger: React.FC<WorkflowDebuggerProps> = ({ workflow }) => {
  const [mockRecord, setMockRecord] = useState<string>('{\n  "amount": 15000,\n  "status": "New",\n  "priority": "High"\n}');
  const [executionState, setExecutionState] = useState<WorkflowState | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = async () => {
    setIsSimulating(true);
    setError(null);
    try {
      const record = JSON.parse(mockRecord);
      // Since WorkflowEngine is on the server, we'll mimic its logic here 
      // or call a local version for the debugger
      const result = await WorkflowEngine.evaluate(record, workflow);
      setExecutionState(result);
    } catch (e: any) {
      setError(e.message || "Failed to parse mock record JSON");
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800 w-96 overflow-hidden">
      <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
            <Bug size={18} />
          </div>
          <h3 className="text-sm font-bold text-white tracking-tight">Logic Debugger</h3>
        </div>
        <button 
          onClick={runSimulation}
          disabled={isSimulating}
          className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
        >
          {isSimulating ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Play size={16} fill="currentColor" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {/* Mock Record Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Mock Record (JSON)</label>
            <Terminal size={12} className="text-zinc-600" />
          </div>
          <div className="relative group">
            <textarea
              value={mockRecord}
              onChange={(e) => setMockRecord(e.target.value)}
              className="w-full h-48 bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-[11px] font-mono text-indigo-300 focus:outline-none focus:border-indigo-500 transition-all resize-none shadow-inner"
              spellCheck={false}
            />
            {error && (
              <div className="absolute bottom-3 right-3 text-rose-500">
                <AlertCircle size={14} />
              </div>
            )}
          </div>
        </div>

        {/* Execution Path */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Execution Path</h4>
          
          <AnimatePresence mode="wait">
            {!executionState ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center px-6"
              >
                <Search size={32} className="text-zinc-800 mb-3" />
                <p className="text-[11px] text-zinc-500 leading-relaxed">Run a simulation to verify the decision logic and action triggers.</p>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                {executionState.history.map((step, idx) => {
                  const node = workflow.nodes.find(n => n.id === step.nodeId);
                  if (!node) return null;
                  
                  return (
                    <div key={idx} className="flex items-center gap-3 group">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center border-2 z-10 transition-colors",
                          idx === executionState.history.length - 1 
                            ? "bg-indigo-600 border-indigo-500 text-white" 
                            : "bg-zinc-900 border-zinc-800 text-zinc-500"
                        )}>
                          {idx === executionState.history.length - 1 ? <CheckCircle2 size={12} /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
                        </div>
                        {idx < executionState.history.length - 1 && <div className="w-0.5 h-6 bg-zinc-800" />}
                      </div>
                      
                      <div className="flex-1 pb-2">
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 group-hover:border-zinc-700 transition-all">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-white">{node.name}</span>
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded border",
                              node.type === 'STATUS' ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                              node.type === 'DECISION' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                              node.type === 'ACTION' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                              "bg-zinc-800 text-zinc-500 border-zinc-700"
                            )}>
                              {node.type}
                            </span>
                          </div>
                          <p className="text-[9px] text-zinc-500">{new Date(step.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Output Diagnostics */}
        {executionState && (
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-3">
             <div className="flex items-center gap-2">
               <CheckCircle2 size={14} className="text-emerald-500" />
               <h5 className="text-[10px] font-bold text-white uppercase tracking-widest">Diagnostics</h5>
             </div>
             <div className="space-y-1.5">
               <div className="flex justify-between text-[10px]">
                 <span className="text-zinc-500">End State:</span>
                 <span className="text-emerald-400 font-bold">{workflow.nodes.find(n => n.id === executionState.currentNodeId)?.name}</span>
               </div>
               <div className="flex justify-between text-[10px]">
                 <span className="text-zinc-500">Steps Jumped:</span>
                 <span className="text-emerald-400 font-bold">{executionState.history.length}</span>
               </div>
               <div className="flex justify-between text-[10px]">
                 <span className="text-zinc-500">Actions Triggered:</span>
                 <span className="text-emerald-400 font-bold">
                   {executionState.history.filter(h => workflow.nodes.find(n => n.id === h.nodeId)?.type === 'ACTION').length}
                 </span>
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
