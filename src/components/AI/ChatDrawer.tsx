import { useState } from 'react';
import { 
  X, 
  Send, 
  Smile, 
  Image as ImageIcon, 
  Type, 
  Mic,
  MessageSquare,
  User as UserIcon
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { usePlatform } from '../../hooks/usePlatform';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const ChatDrawer = () => {
  const { isChatOpen, setIsChatOpen } = usePlatform();
  const [input, setInput] = useState('');
  const [messages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Welcome to the Team Chat! How can I help you today?',
      timestamp: new Date(Date.now() - 3600000)
    },
    {
      id: '2',
      role: 'user',
      content: 'Hey, I just wanted to check on the status of the latest module updates.',
      timestamp: new Date(Date.now() - 3500000)
    },
    {
      id: '3',
      role: 'assistant',
      content: 'The module updates are being finalized and will be ready for review by EOD.',
      timestamp: new Date(Date.now() - 3400000)
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
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
            <MessageSquare size={18} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Team Chat</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">3 Members Active</span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setIsChatOpen(false)}
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
                : "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
            )}>
              {msg.role === 'user' ? <UserIcon size={14} /> : <MessageSquare size={14} />}
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
              <span className="text-[10px] text-zinc-400 px-1">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
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
            placeholder="Send a message..."
            className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 resize-none min-h-[100px] transition-all"
          />
          
          <div className="absolute bottom-3 left-4 flex items-center gap-3 text-zinc-400">
            <button className="hover:text-emerald-500 transition-colors"><Smile size={18} /></button>
            <button className="hover:text-emerald-500 transition-colors"><ImageIcon size={18} /></button>
            <button className="hover:text-emerald-500 transition-colors"><Type size={18} /></button>
          </div>

          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <button className="p-2 text-zinc-400 hover:text-emerald-500 transition-colors">
              <Mic size={18} />
            </button>
            <button className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </motion.aside>
  );
};
