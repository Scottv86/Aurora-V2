import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  Paperclip, 
  Sparkles, 
  ChevronDown, 
  Settings,
  Check,
  Loader2,
  Brain
} from 'lucide-react';


import { SolutionChatMessage } from '../../../types/solutions';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';

export interface OrchestratorChatPanelProps {
  messages: SolutionChatMessage[];
  onSendMessage: (text: string, model: string) => void;
  onApplySuggestedAction: (actionText: string) => void;
  onSaveToNote?: (text: string) => void;
  isThinking?: boolean;
  thinkingSteps?: { id: string; label: string; status: 'pending' | 'active' | 'completed' }[];
}

export const OrchestratorChatPanel: React.FC<OrchestratorChatPanelProps> = ({
  messages,
  onSendMessage,
  onApplySuggestedAction,
  onSaveToNote,
  isThinking = false,
  thinkingSteps = []
}) => {
  const { user: platformUser } = usePlatform();
  const { user: authUser } = useAuth();
  const currentUser: any = platformUser || authUser;

  const getUserDisplayName = () => {
    if (currentUser) {
      const fullName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
      if (fullName) return fullName;
      if (currentUser.name) return currentUser.name;
      if (currentUser.user_metadata?.full_name) return currentUser.user_metadata.full_name;
      if (currentUser.user_metadata?.name) return currentUser.user_metadata.name;
      if (currentUser.email) {
        const prefix = currentUser.email.split('@')[0];
        const parts = prefix.split(/[._-]/).filter(Boolean);
        if (parts.length > 0) {
          return parts.map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

        }
      }
    }
    return 'User';
  };

  const userName = getUserDisplayName();
  const userAvatarUrl = currentUser?.avatarUrl || currentUser?.avatar_url || currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture;
  const userInitials = (() => {
    if (currentUser?.firstName && currentUser?.lastName) {
      return `${currentUser.firstName[0]}${currentUser.lastName[0]}`.toUpperCase();
    }
    if (userName && userName !== 'User') {
      const parts = userName.split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return userName.slice(0, 2).toUpperCase();
    }
    return 'U';
  })();


  const [inputText, setInputText] = useState('');
  const [selectedModel, setSelectedModel] = useState('default');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);




  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, thinkingSteps]);

  const handleSend = () => {
    if (!inputText.trim() || isThinking) return;
    onSendMessage(inputText.trim(), selectedModel);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceToggle = () => {
    if (!isRecording) {
      setIsRecording(true);
      toast.info('Listening for voice input...');
      setTimeout(() => {
        setIsRecording(false);
        setInputText(prev => (prev ? `${prev} Make the intake form extensive and include a dynamic service selection dropdown.` : 'Make the intake form extensive and include a dynamic service selection dropdown.'));
        toast.success('Voice input transcribed.');
      }, 3000);
    } else {
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/60 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl shadow-black/5 dark:shadow-none p-5 relative">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200/60 dark:border-white/5">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
              <span>Chat</span>
            </h3>
          </div>
        </div>


        <div className="flex items-center gap-2">
          <button 
            onClick={() => toast.info('Chat session history synced')}
            className="p-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-400 transition-colors"
            title="Chat Options"
          >
            <Settings size={14} />

          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 custom-scrollbar pr-1">
        {messages.map((msg) => {
          const isAurora = msg.role === 'aurora';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isAurora ? '' : 'flex-row-reverse'}`}
            >

              {/* Avatar */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border text-xs font-bold overflow-hidden shadow-sm ${
                isAurora
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                  : 'bg-indigo-600 border-indigo-500 text-white'
              }`}>
                {isAurora ? (
                  'A'
                ) : userAvatarUrl ? (
                  <img src={userAvatarUrl} alt={userName} className="w-full h-full object-cover" />
                ) : (
                  <span>{userInitials}</span>
                )}
              </div>

              {/* Message Content Bubble */}
              <div className={`max-w-[85%] space-y-2`}>
                <div className={`flex items-center gap-2 ${isAurora ? '' : 'justify-end'}`}>
                  <span className="text-[11px] font-bold text-zinc-900 dark:text-white">
                    {isAurora ? 'Aurora' : userName}
                  </span>
                  <span className="text-[10px] text-zinc-400">{msg.timestamp}</span>
                </div>


                <div className={`p-4 rounded-2xl border text-xs leading-relaxed relative ${
                  isAurora
                    ? 'bg-white/80 dark:bg-zinc-900/90 border-zinc-200/80 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-200 shadow-sm'
                    : 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/10'
                }`}>
                  {msg.text}

                  {/* Source Badges */}
                  {isAurora && msg.groundedSources && msg.groundedSources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex flex-wrap items-center gap-1.5 text-[9px] font-bold">
                      {msg.groundedSources.map((sourceName, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          {sourceName}
                        </span>
                      ))}
                    </div>
                  )}


                </div>

                {/* Save to Note Action Button (Matching Gemini Notebook) */}
                {isAurora && onSaveToNote && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      onClick={() => onSaveToNote(msg.text)}
                      className="px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold transition-all flex items-center gap-1.5 border border-zinc-200/80 dark:border-zinc-700/80 cursor-pointer shadow-xs"
                      title="Save this AI response into Studio Saved Notes (Right pane)"
                    >
                      <Sparkles size={11} className="text-indigo-500" />
                      <span>Save to note</span>
                    </button>
                  </div>
                )}

                {/* Suggested Action Chips */}
                {isAurora && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {msg.suggestedActions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => onApplySuggestedAction(action)}
                        className="px-2.5 py-1 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles size={11} />
                        <span>{action}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* DYNAMIC AI THINKING & ARCHITECTING ANIMATED BUBBLE WITH REAL-TIME STEPS */}
        {isThinking && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-500 flex items-center justify-center shrink-0 text-xs font-bold shadow-md shadow-emerald-500/10 animate-pulse">
              A
            </div>
            <div className="space-y-1.5 max-w-[85%]">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-zinc-900 dark:text-white">Aurora AI Orchestrator</span>
                <span className="text-[10px] text-indigo-400 font-mono font-bold animate-pulse">Thinking...</span>
              </div>

              <div className="p-4 rounded-2xl bg-white/90 dark:bg-zinc-900/90 border border-indigo-500/30 text-zinc-800 dark:text-zinc-200 shadow-lg space-y-3">
                <div className="flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />
                  <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{thinkingSteps.find(s => s.status === 'active')?.label || 'Processing Solution Request...'}</span>
                  </span>
                </div>

                <div className="space-y-2 pl-6 border-l-2 border-indigo-500/30 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                  {thinkingSteps.map((step) => (
                    <div key={step.id} className="flex items-center gap-2 transition-all">
                      {step.status === 'completed' ? (
                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/30 text-[10px] font-bold">
                          ✓
                        </div>
                      ) : step.status === 'active' ? (
                        <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0 ml-1" />
                      )}
                      <span className={`text-xs ${
                        step.status === 'completed' 
                          ? 'text-emerald-500 font-semibold' 
                          : step.status === 'active' 
                          ? 'text-indigo-400 font-bold' 
                          : 'text-zinc-500'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>



      {/* Prompt Bar Input */}
      <div className="pt-3 border-t border-zinc-200/60 dark:border-white/5 space-y-2">
        <div className="relative bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-2 shadow-inner focus-within:ring-2 focus-within:ring-indigo-500/30 transition-all">
          <input
            type="text"
            placeholder="Ask Aurora to design modules, workflows, or integrations..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none outline-none px-3 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400"
          />


          <div className="flex items-center justify-between pt-2 px-2 border-t border-zinc-100 dark:border-zinc-800/60">
            {/* Attachment & Voice Action Icons */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleVoiceToggle}
                className={`p-2 rounded-xl transition-all ${
                  isRecording
                    ? 'bg-rose-500/20 text-rose-500 animate-pulse'
                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
                title={isRecording ? 'Recording voice...' : 'Voice Input'}
              >
                <Mic size={15} />
              </button>

              <button
                onClick={() => toast.info('Attach context file to prompt')}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                title="Attach Context File"
              >
                <Paperclip size={15} />
              </button>
            </div>

            {/* Send Prompt Button */}
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="p-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold transition-all shadow-md cursor-pointer"
            >
              <Send size={15} />
            </button>
          </div>
        </div>

        {/* Consolidated Model & Tier Selector Bar (Identical to Aurora Vibe & AI Services Settings) */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1 relative">
          <span className="font-medium flex items-center gap-1">
            <Sparkles size={13} className="text-indigo-500" /> AI Model & Tier:
          </span>

          <div className="relative">
            <button
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className="flex items-center gap-1.5 font-bold text-zinc-700 dark:text-zinc-300 hover:text-indigo-500 transition-colors py-1 px-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 shadow-sm"
            >
              <span>
                {selectedModel === 'default' ? 'Gemini 3.1 Flash-Lite (Default)' :
                 selectedModel === 'low' ? 'Gemini 3.1 Flash-Lite (Low Tier)' :
                 selectedModel === 'medium' ? 'Claude 3.5 Sonnet (Medium Tier)' :
                 selectedModel === 'high' ? 'GPT-4o (High Tier)' : selectedModel}
              </span>
              <ChevronDown size={12} className={`text-zinc-400 transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isModelDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute right-0 bottom-full mb-2 w-80 backdrop-blur-2xl bg-white/95 dark:bg-zinc-950/95 border border-zinc-200 dark:border-zinc-800/90 rounded-2xl shadow-2xl p-3 z-50 space-y-3"
                >
                  {/* Platform Default Section */}
                  <div>
                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between">
                      <span>Platform Default Model</span>
                      <span className="text-[9px] text-emerald-400 font-mono font-bold">Free Tier</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedModel('default');
                        setIsModelDropdownOpen(false);
                      }}
                      className={`w-full flex items-start justify-between p-2.5 rounded-xl text-xs font-semibold transition-all text-left border ${
                        selectedModel === 'default'
                          ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400 shadow-sm'
                          : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                            Gemini 3.1 Flash-Lite
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                              Native Free Tier
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal mt-0.5 leading-snug">
                            Fast, zero-configuration baseline model powered by Google AI Studio.
                          </p>
                        </div>
                      </div>
                      {selectedModel === 'default' && <Check className="h-4 w-4 text-indigo-500 shrink-0 ml-2 mt-0.5" />}
                    </button>
                  </div>

                  {/* Preset Capability Tiers configured in AI Services Settings */}
                  <div className="border-t border-zinc-200/60 dark:border-zinc-800/80 pt-2.5">
                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between">
                      <span>Preset Capability Tiers</span>
                      <span className="text-[9px] text-indigo-400 font-mono">AI Services Settings</span>
                    </div>
                    <div className="space-y-1">
                      {[
                        { id: 'low', label: 'Low Tier', sub: 'Gemini 3.1 Flash-Lite (Fast / Budget)' },
                        { id: 'medium', label: 'Medium Tier', sub: 'Claude 3.5 Sonnet (Balanced)' },
                        { id: 'high', label: 'High Tier', sub: 'GPT-4o / DeepSeek (Pro Reasoning)' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setSelectedModel(t.id);
                            setIsModelDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-all text-left border ${
                            selectedModel === t.id
                              ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400 font-bold shadow-sm'
                              : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-xs">{t.label}</div>
                            <div className="text-[10px] text-zinc-400 font-normal">{t.sub}</div>
                          </div>
                          {selectedModel === t.id && <Check className="h-4 w-4 text-indigo-500 shrink-0 ml-2" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

