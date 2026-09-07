import React from 'react';
import { X, CornerDownRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useChat } from '../../../context/ChatContext';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatComposer } from './ChatComposer';

export const ChatThreadPane: React.FC = () => {
  const { threadParentMessage, threadReplies, openThread } = useChat();

  if (!threadParentMessage) return null;

  return (
    <motion.aside 
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 384, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
      className="h-full bg-zinc-100/90 dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col z-20 shrink-0 select-none shadow-xl overflow-hidden"
    >
      <div className="w-96 h-full flex flex-col shrink-0">
        {/* Thread Header */}
      <div className="h-14 px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white/70 dark:bg-zinc-900 shrink-0">
        <div className="flex items-center gap-2">
          <CornerDownRight size={16} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Thread</h3>
          <span className="text-xs text-zinc-500 font-medium">
            ({threadReplies.length} {threadReplies.length === 1 ? 'reply' : 'replies'})
          </span>
        </div>
        <button
          onClick={() => openThread(null)}
          className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages Stream: Parent message on top + list of replies */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
        {/* Parent Root Message */}
        <div className="p-2 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40 rounded-2xl">
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 px-2 pt-1">
            Original Message
          </div>
          <ChatMessageItem message={threadParentMessage} isThreadView={true} />
        </div>

        {/* Thread Replies Divider */}
        {threadReplies.length > 0 ? (
          <div className="relative flex items-center justify-center my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
            </div>
            <span className="relative px-2.5 py-0.5 text-[10px] font-bold text-zinc-500 bg-white dark:bg-zinc-950 rounded-full border border-zinc-200 dark:border-zinc-800">
              Replies
            </span>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-zinc-400">
            No replies yet. Start the discussion thread below!
          </div>
        )}

        {/* List of Replies */}
        <div className="space-y-1">
          {threadReplies.map((reply) => (
            <ChatMessageItem key={reply.id} message={reply} isThreadView={true} />
          ))}
        </div>
      </div>

      {/* Thread Reply Composer */}
      <ChatComposer
        placeholder="Reply in thread..."
        parentMessageId={threadParentMessage.id}
        autoFocus={true}
      />
      </div>
    </motion.aside>
  );
};
