import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  Sliders, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  RefreshCw, 
  Cpu, 
  User 
} from 'lucide-react';
import { AgentBlueprint, AgentArchitectChatMessage, AgentFewShotExample } from '../../../types/agent';
import { architectAgentBlueprint } from '../../../services/agentBuilderService';
import { toast } from 'sonner';

export interface AgentArchitectPanelProps {
  blueprint: AgentBlueprint;
  onChange: (updated: Partial<AgentBlueprint>) => void;
}

export const AgentArchitectPanel: React.FC<AgentArchitectPanelProps> = ({
  blueprint,
  onChange
}) => {
  const [viewMode, setViewMode] = useState<'chat' | 'direct'>('chat');
  const [inputPrompt, setInputPrompt] = useState('');
  const [isArchitectThinking, setIsArchitectThinking] = useState(false);

  const messages: AgentArchitectChatMessage[] = blueprint.chatHistory || [];

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = textToSend || inputPrompt;
    if (!prompt.trim() || isArchitectThinking) return;

    const userMsg: AgentArchitectChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMsg];
    onChange({ chatHistory: newHistory });
    setInputPrompt('');
    setIsArchitectThinking(true);

    try {
      const response = await architectAgentBlueprint(prompt, blueprint, blueprint.knowledgeSources);
      
      const architectMsg: AgentArchitectChatMessage = {
        id: `msg_arch_${Date.now()}`,
        role: 'architect',
        text: response.replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: response.suggestedActions,
        appliedChangesSummary: response.blueprintDelta ? 'Updated system instructions and tool assignments.' : undefined,
        proposedBlueprintDelta: response.blueprintDelta
      };

      const finalHistory = [...newHistory, architectMsg];
      
      if (response.blueprintDelta) {
        onChange({
          ...response.blueprintDelta,
          chatHistory: finalHistory
        });
        toast.success('Agent blueprint refined by Architect');
      } else {
        onChange({ chatHistory: finalHistory });
      }
    } catch (err: any) {
      toast.error('Architect failed to respond: ' + (err.message || 'Unknown error'));
    } finally {
      setIsArchitectThinking(false);
    }
  };

  const addFewShotExample = () => {
    const newEx: AgentFewShotExample = {
      id: `ex_${Date.now()}`,
      userInput: 'Sample user question...',
      expectedThought: 'Step-by-step reasoning plan...',
      expectedOutput: 'Desired agent response format...'
    };
    onChange({
      fewShotExamples: [...blueprint.fewShotExamples, newEx]
    });
  };

  const updateFewShotExample = (id: string, delta: Partial<AgentFewShotExample>) => {
    const updated = blueprint.fewShotExamples.map(ex => 
      ex.id === id ? { ...ex, ...delta } : ex
    );
    onChange({ fewShotExamples: updated });
  };

  const removeFewShotExample = (id: string) => {
    onChange({
      fewShotExamples: blueprint.fewShotExamples.filter(ex => ex.id !== id)
    });
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-950">
      {/* Header & Mode Switcher */}
      <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-zinc-950">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white">
              Agent Architect & Directives
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {viewMode === 'chat' ? 'Conversational co-pilot shaping agent behavior' : 'Direct system instructions and LLM parameters'}
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl text-xs font-bold">
          <button
            onClick={() => setViewMode('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'chat'
                ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Sparkles size={13} />
            <span>Chat with Architect</span>
          </button>
          <button
            onClick={() => setViewMode('direct')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'direct'
                ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Sliders size={13} />
            <span>Direct Config</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'chat' ? (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'architect' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
                    <Sparkles size={16} />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 space-y-2 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {msg.appliedChangesSummary && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
                      <CheckCircle2 size={12} />
                      <span>{msg.appliedChangesSummary}</span>
                    </div>
                  )}

                  {/* Suggested Quick Actions */}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap gap-1.5">
                      {msg.suggestedActions.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendMessage(action)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all text-left"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="text-[9px] text-zinc-400 text-right">
                    {msg.timestamp}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-zinc-800 text-zinc-200 flex items-center justify-center shrink-0 mt-0.5">
                    <User size={16} />
                  </div>
                )}
              </div>
            ))}

            {isArchitectThinking && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shrink-0 animate-pulse">
                  <Sparkles size={16} />
                </div>
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-indigo-500" />
                  <span>Agent Architect is synthesizing behavioral directives...</span>
                </div>
              </div>
            )}
          </div>

          {/* Prompt Input Box */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Instruct the Architect (e.g., 'Make this agent handle customer invoice disputes and verify Stripe payments')..."
                className="flex-1 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={!inputPrompt.trim() || isArchitectThinking}
                className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span>Send</span>
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Direct Configuration Mode */
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Identity & Role */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Agent Name
              </label>
              <input
                type="text"
                value={blueprint.name}
                onChange={(e) => onChange({ name: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                Role Title
              </label>
              <input
                type="text"
                value={blueprint.roleTitle}
                onChange={(e) => onChange({ roleTitle: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={blueprint.description}
              onChange={(e) => onChange({ description: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Model Selection & Temperature */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <Cpu size={15} className="text-indigo-500" />
                Foundation LLM Engine
              </span>
              <select
                value={blueprint.modelConfig.model}
                onChange={(e) => onChange({
                  modelConfig: { ...blueprint.modelConfig, model: e.target.value }
                })}
                className="px-3 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-zinc-900 dark:text-white"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast & Real-time)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Reasoning)</option>
                <option value="claude-3-7-sonnet">Claude 3.7 Sonnet (Hybrid Thinking)</option>
                <option value="gpt-4o">OpenAI GPT-4o</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-zinc-600 dark:text-zinc-400">Temperature (Creativity vs Determinism)</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                  {blueprint.modelConfig.temperature}
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={blueprint.modelConfig.temperature}
                onChange={(e) => onChange({
                  modelConfig: { ...blueprint.modelConfig, temperature: parseFloat(e.target.value) }
                })}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>

          {/* System Instructions / Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                System Instructions & Behavioral Directives
              </label>
              <span className="text-[10px] text-zinc-400">
                {blueprint.systemInstructions.length} characters
              </span>
            </div>
            <textarea
              rows={8}
              value={blueprint.systemInstructions}
              onChange={(e) => onChange({ systemInstructions: e.target.value })}
              className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
              placeholder="Define core system directives..."
            />
          </div>

          {/* Few-Shot Examples */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Few-Shot Training Examples ({blueprint.fewShotExamples.length})
              </label>
              <button
                onClick={addFewShotExample}
                className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <Plus size={14} />
                <span>Add Example</span>
              </button>
            </div>

            {blueprint.fewShotExamples.map((ex) => (
              <div
                key={ex.id}
                className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2 relative group"
              >
                <button
                  onClick={() => removeFewShotExample(ex.id)}
                  className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity"
                  title="Remove example"
                >
                  <Trash2 size={14} />
                </button>

                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">User Input</span>
                  <input
                    type="text"
                    value={ex.userInput}
                    onChange={(e) => updateFewShotExample(ex.id, { userInput: e.target.value })}
                    className="w-full mt-1 px-2.5 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <span className="text-[10px] font-bold text-indigo-500 uppercase">Expected Output</span>
                  <textarea
                    rows={2}
                    value={ex.expectedOutput}
                    onChange={(e) => updateFewShotExample(ex.id, { expectedOutput: e.target.value })}
                    className="w-full mt-1 p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
