import { X, Bot } from 'lucide-react';
import { motion } from 'motion/react';
import { usePlatform } from '../../hooks/usePlatform';
import { CompactAIAssistantView } from '../WorkspaceApps/CompactAIAssistantView';

export const AIAssistant = () => {
  const { setIsAIAssistantOpen } = usePlatform();

  return (
    <motion.aside
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-[52px] bottom-0 w-96 bg-zinc-950 border-l border-zinc-800 flex flex-col z-40 shadow-2xl shadow-black/20"
    >
      {/* Header */}
      <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
            <Bot size={18} className="text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Aurora AI Assistant</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Connected</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsAIAssistantOpen(false)}
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
          title="Close AI Assistant"
        >
          <X size={18} />
        </button>
      </div>

      {/* Live Antigravity Chat */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <CompactAIAssistantView compactLevel="side" />
      </div>
    </motion.aside>
  );
};
