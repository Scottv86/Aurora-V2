import React, { useState } from 'react';
import { 
  Play, 
  RotateCcw, 
  AlertTriangle, 
  Activity, 
  Cpu, 
  Wrench, 
  BookOpen, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Code, 
  Clock, 
  Bot, 
  Layers, 
  ArrowRight,
  BarChart2,
  Brain,
  Sparkles
} from 'lucide-react';
import { AgentBlueprint, AgentSandboxMessage } from '../../../types/agent';
import { simulateAgentExecution } from '../../../services/agentBuilderService';
import { AgentAnalyticsView } from './AgentAnalyticsView';
import { toast } from 'sonner';

export interface AgentSandboxStudioProps {
  blueprint: AgentBlueprint;
  onChange: (updated: Partial<AgentBlueprint>) => void;
}

export const AgentSandboxStudio: React.FC<AgentSandboxStudioProps> = ({
  blueprint,
  onChange
}) => {
  const [activeTab, setActiveTab] = useState<'sandbox' | 'analytics' | 'blueprint'>('sandbox');
  const [testInput, setTestInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);

  const messages: AgentSandboxMessage[] = blueprint.sandboxMessages || [];

  const handleSendTestMessage = async (customPrompt?: string) => {
    const prompt = customPrompt || testInput;
    if (!prompt.trim() || isRunning) return;

    const userMsg: AgentSandboxMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMsg];
    onChange({ sandboxMessages: newHistory });
    setTestInput('');
    setIsRunning(true);

    try {
      const agentResponse = await simulateAgentExecution(blueprint, prompt, newHistory);
      onChange({
        sandboxMessages: [...newHistory, agentResponse]
      });
      if (agentResponse.traces && agentResponse.traces.length > 0) {
        setExpandedTraceId(agentResponse.id);
      }
    } catch (err: any) {
      toast.error('Simulation failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsRunning(false);
    }
  };

  const handleClearSandbox = () => {
    onChange({ sandboxMessages: [] });
    toast.info('Sandbox session cleared');
  };

  const quickPrompts = [
    'Check customer invoice status for #INV-90412',
    'Summarize attached SOP policy rules',
    'Execute platform query on recent audit events'
  ];

  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800">
      {/* Top Header */}
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-zinc-950">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <Play size={15} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white">
              Agent Runtime Sandbox
            </h3>
            <p className="text-[10px] text-zinc-500">
              Interactive test execution & live tool trace inspection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 3 View Tabs */}
          <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('sandbox')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeTab === 'sandbox'
                  ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Test Chat
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                activeTab === 'analytics'
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <BarChart2 size={12} />
              <span>Analytics</span>
            </button>
            <button
              onClick={() => setActiveTab('blueprint')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeTab === 'blueprint'
                  ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Blueprint
            </button>
          </div>

          {activeTab === 'sandbox' && messages.length > 0 && (
            <button
              onClick={handleClearSandbox}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              title="Reset Sandbox"
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'sandbox' ? (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Bot size={22} />
                </div>
                <div className="max-w-xs space-y-1">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                    Agent Ready for Testing
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    Send a test prompt to evaluate how <strong>{blueprint.name}</strong> reasons, uses tools, and grounds its answers.
                  </p>
                </div>

                <div className="w-full max-w-sm space-y-1.5 pt-2">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Try a test scenario</span>
                  {quickPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendTestMessage(prompt)}
                      className="w-full p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 hover:border-indigo-500 text-zinc-700 dark:text-zinc-300 text-xs font-medium text-left transition-all flex items-center justify-between group shadow-sm"
                    >
                      <span className="truncate">{prompt}</span>
                      <ArrowRight size={13} className="opacity-0 group-hover:opacity-100 text-indigo-500 transition-opacity shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-2 ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[92%] rounded-2xl p-4 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm'
                        : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/70 text-zinc-800 dark:text-zinc-200 shadow-sm w-full'
                    }`}
                  >
                    {msg.role === 'agent' && (
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-700/50 text-[10px]">
                        <div className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400">
                          <Bot size={13} />
                          <span>{blueprint.name}</span>
                          <span className="text-zinc-400 font-normal">({blueprint.modelConfig.model})</span>
                        </div>
                        {msg.confidenceScore && (
                          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                            <ShieldCheck size={12} />
                            <span>{(msg.confidenceScore * 100).toFixed(0)}% Confidence</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step-by-Step Reasoning & Tool Trace Box */}
                    {msg.traces && msg.traces.length > 0 && (
                      <div className="mb-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/60 overflow-hidden">
                        <button
                          onClick={() => setExpandedTraceId(expandedTraceId === msg.id ? null : msg.id)}
                          className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Activity size={13} className="text-indigo-500" />
                            <span>Agent Execution Trace ({msg.traces.length} steps)</span>
                          </div>
                          {expandedTraceId === msg.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        {expandedTraceId === msg.id && (
                          <div className="p-3 border-t border-zinc-200 dark:border-zinc-700/60 space-y-2 text-[11px]">
                            {msg.traces.map((trace) => (
                              <div
                                key={trace.id}
                                className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/50 space-y-1 font-mono text-[10px]"
                              >
                                <div className="flex items-center justify-between font-bold">
                                  <div className="flex items-center gap-1.5">
                                    {trace.type === 'thought' && <Cpu size={12} className="text-blue-500" />}
                                    {trace.type === 'memory_retrieval' && <Brain size={12} className="text-purple-500" />}
                                    {trace.type === 'memory_write' && <Sparkles size={12} className="text-amber-500" />}
                                    {trace.type === 'tool_call' && <Wrench size={12} className="text-amber-500" />}
                                    {trace.type === 'context_retrieval' && <BookOpen size={12} className="text-emerald-500" />}
                                    {trace.type === 'guardrail_check' && <ShieldCheck size={12} className="text-purple-500" />}
                                    {trace.type === 'sub_agent_call' && <Bot size={12} className="text-pink-500" />}
                                    <span className="text-zinc-800 dark:text-zinc-200 font-sans text-xs">{trace.title}</span>
                                  </div>
                                  {trace.latencyMs && (
                                    <span className="text-zinc-400 text-[9px] flex items-center gap-1">
                                      <Clock size={10} />
                                      {trace.latencyMs}ms
                                    </span>
                                  )}
                                </div>
                                <p className="text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap font-sans">
                                  {trace.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Final Response Content */}
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {msg.requiresApproval && (
                      <div className="mt-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 font-semibold">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={15} />
                          <span>Action flagged for Human Supervisor sign-off.</span>
                        </div>
                        <button className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-[10px] font-bold hover:bg-amber-700">
                          Approve Action
                        </button>
                      </div>
                    )}

                    <div className="mt-2 text-[9px] text-zinc-400 flex items-center justify-between">
                      <span>{msg.timestamp}</span>
                      {msg.tokensUsed && <span>{msg.tokensUsed} tokens</span>}
                    </div>
                  </div>
                </div>
              ))
            )}

            {isRunning && (
              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white animate-spin">
                  <Activity size={16} />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-zinc-900 dark:text-white">Executing Agent Reasoning Loop...</p>
                  <p className="text-[10px] text-zinc-400">Inspecting tools, evaluating guardrails, synthesizing response</p>
                </div>
              </div>
            )}
          </div>

          {/* Test Input Box */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendTestMessage();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Type a test scenario or message to run in sandbox..."
                className="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={!testInput.trim() || isRunning}
                className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span>Run</span>
                <Play size={13} />
              </button>
            </form>
          </div>
        </div>
      ) : activeTab === 'analytics' ? (
        /* Analytics View */
        <AgentAnalyticsView blueprint={blueprint} />
      ) : (
        /* Blueprint View */
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 space-y-3">
            <h4 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Layers size={16} className="text-indigo-500" />
              Agent Architecture Topology
            </h4>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                    <Bot size={20} />
                  </div>
                  <div>
                    <h5 className="font-bold text-indigo-950 dark:text-indigo-200">{blueprint.name}</h5>
                    <p className="text-[10px] text-indigo-700 dark:text-indigo-400">{blueprint.roleTitle}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                  {blueprint.status}
                </span>
              </div>

              {/* Connected Tools & Sub-Agents */}
              <div className="pl-4 border-l-2 border-zinc-200 dark:border-zinc-700 space-y-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Bound Capabilities & Delegations</span>
                <div className="grid grid-cols-2 gap-2">
                  {blueprint.tools.filter(t => t.enabled).map(tool => (
                    <div key={tool.id} className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
                      <Wrench size={13} className="text-amber-500 shrink-0" />
                      <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 truncate">{tool.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Knowledge Sources */}
              <div className="pl-4 border-l-2 border-zinc-200 dark:border-zinc-700 space-y-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Grounding Knowledge</span>
                {blueprint.knowledgeSources.length === 0 ? (
                  <p className="text-[11px] text-zinc-400">Zero file grounding attached</p>
                ) : (
                  <div className="space-y-1.5">
                    {blueprint.knowledgeSources.map(source => (
                      <div key={source.id} className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                        <span className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate">{source.name}</span>
                        <span className="text-[10px] text-zinc-400">{source.size}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Raw JSON Spec */}
          <div className="p-4 rounded-2xl bg-zinc-900 text-zinc-300 font-mono text-[10px] space-y-2 border border-zinc-800">
            <div className="flex items-center justify-between text-zinc-400 pb-2 border-b border-zinc-800">
              <span className="font-bold flex items-center gap-1.5">
                <Code size={13} />
                Raw Agent Blueprint Spec
              </span>
              <span>JSON</span>
            </div>
            <pre className="overflow-x-auto max-h-60 whitespace-pre-wrap leading-tight">
              {JSON.stringify(blueprint, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
