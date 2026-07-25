import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Cpu, Terminal, Clock, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export interface StepTrace {
  id: string;
  name: string;
  durationMs?: number;
  status: 'running' | 'success' | 'failed';
  input?: any;
  output?: any;
}

export interface ThoughtTraceProps {
  thoughtText?: string;
  traces?: StepTrace[];
  defaultOpen?: boolean;
}

export const ThoughtTraceAccordion: React.FC<ThoughtTraceProps> = ({
  thoughtText,
  traces = [],
  defaultOpen = false
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyJSON = (id: string, data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedId(id);
    toast.success("Payload copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!thoughtText && (!traces || traces.length === 0)) return null;

  return (
    <div className="my-3 rounded-lg border border-slate-800 bg-slate-950/60 transition-all hover:border-slate-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-3.5 py-2 text-left text-xs font-medium text-slate-400 hover:text-slate-200"
      >
        <div className="flex items-center gap-2">
          <Cpu className="h-3.5 w-3.5 text-indigo-400" />
          <span>Thought Process & Execution Traces</span>
          {traces.length > 0 && (
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
              {traces.length} step{traces.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-slate-800/80 px-3.5 py-3 text-xs"
          >
            {/* Thought Monologue */}
            {thoughtText && (
              <div className="mb-3 rounded-md bg-slate-900/80 p-2.5 italic text-slate-300 border-l-2 border-indigo-500">
                "{thoughtText}"
              </div>
            )}

            {/* Step Traces */}
            {traces.length > 0 && (
              <div className="space-y-2">
                {traces.map((trace) => (
                  <div key={trace.id} className="rounded-md bg-slate-900 p-2.5 border border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-mono text-[11px] text-slate-200">
                        <Terminal className="h-3.5 w-3.5 text-slate-400" />
                        <span>{trace.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {trace.durationMs && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Clock className="h-3 w-3" />
                            {trace.durationMs}ms
                          </span>
                        )}
                        {trace.status === 'success' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                        {trace.status === 'failed' && <AlertCircle className="h-3.5 w-3.5 text-rose-400" />}
                      </div>
                    </div>

                    {/* Payloads */}
                    {(trace.input || trace.output) && (
                      <div className="mt-2 space-y-1.5 pt-2 border-t border-slate-800/50">
                        {trace.input && (
                          <div>
                            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-0.5">
                              <span>INPUT:</span>
                              <button 
                                onClick={() => copyJSON(`${trace.id}-in`, trace.input)}
                                className="text-slate-500 hover:text-slate-300"
                              >
                                {copiedId === `${trace.id}-in` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                            <pre className="max-h-24 overflow-y-auto rounded bg-slate-950 p-1.5 font-mono text-[10px] text-slate-300">
                              {JSON.stringify(trace.input, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
