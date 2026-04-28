import { useState } from 'react';
import { 
  X, 
  Send, 
  Smile, 
  Image as ImageIcon, 
  Type, 
  Mic,
  Bot,
  User as UserIcon,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { usePlatform } from '../../hooks/usePlatform';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: {
    type: string;
    title: string;
    snippet: string;
  };
}

const AuroraGlow = () => {
  return (
    <div className="absolute -left-[200px] top-0 bottom-0 w-[500px] pointer-events-none z-[-1]">
      {/* Shifted Core - positioned more 'underneath' the sidebar */}
      <div className="absolute inset-y-0 -right-40 w-[300px] bg-gradient-to-b from-teal-400/25 via-indigo-500/35 to-purple-500/25 blur-[60px]" />
      
      {/* Blobs also shifted inward */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-10 -right-20 w-[250px] h-[450px] bg-indigo-600/20 blur-[90px] rounded-full"
      />
      
      <motion.div
        animate={{
          scale: [1.1, 1, 1.1],
          opacity: [0.15, 0.3, 0.15],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-10 -right-20 w-[280px] h-[550px] bg-teal-500/15 blur-[100px] rounded-full"
      />
    </div>
  );
};

export const AIAssistant = () => {
  const { isAIAssistantOpen, setIsAIAssistantOpen } = usePlatform();
  const [input, setInput] = useState('');
  const [messages] = useState<Message[]>([
    {
      id: '1',
      role: 'user',
      content: 'Nina, how are all our special projects progressing?',
      timestamp: new Date(Date.now() - 3600000)
    },
    {
      id: '2',
      role: 'assistant',
      content: 'AI-Staff and Aurora your AI response, summarizes your activities, actions and response to concepts and connections.',
      timestamp: new Date(Date.now() - 3500000),
      context: {
        type: 'Project',
        title: 'Alpha (id: 123)',
        snippet: 'Notes from Oct 10... reference to composite data across global regions.'
      }
    }
  ]);

  return (
    <motion.aside
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-16 bottom-0 w-96 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-l border-zinc-200 dark:border-zinc-800 flex flex-col z-40 shadow-2xl shadow-black/20"
    >
      <AuroraGlow />
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-500/20">
            <Bot size={18} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">AI Staff Assistant</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Nina Online</span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setIsAIAssistantOpen(false)}
          className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={cn(
              "flex gap-3",
              msg.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
              msg.role === 'user' 
                ? "bg-indigo-500 border-indigo-400 text-white" 
                : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
            )}>
              {msg.role === 'user' ? <UserIcon size={14} /> : <Bot size={14} />}
            </div>

            <div className={cn(
              "flex flex-col gap-2 max-w-[85%]",
              msg.role === 'user' ? "items-end" : "items-start"
            )}>
              <div className={cn(
                "p-3 rounded-2xl text-sm leading-relaxed",
                msg.role === 'user' 
                  ? "bg-indigo-600 text-white rounded-tr-none" 
                  : "bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-tl-none border border-zinc-200/50 dark:border-zinc-800/50"
              )}>
                {msg.content}
              </div>

              {msg.context && (
                <div className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    <Sparkles size={10} className="text-indigo-500" />
                    Context found in {msg.context.type}:
                  </div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-white">
                    {msg.context.title}
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                    {msg.context.snippet}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a conversation..."
            className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 resize-none min-h-[100px] transition-all"
          />
          
          <div className="absolute bottom-3 left-4 flex items-center gap-3 text-zinc-400">
            <button className="hover:text-indigo-500 transition-colors"><Smile size={18} /></button>
            <button className="hover:text-indigo-500 transition-colors"><ImageIcon size={18} /></button>
            <button className="hover:text-indigo-500 transition-colors"><Type size={18} /></button>
          </div>

          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <button className="p-2 text-zinc-400 hover:text-indigo-500 transition-colors">
              <Mic size={18} />
            </button>
            <button className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </motion.aside>
  );
};
