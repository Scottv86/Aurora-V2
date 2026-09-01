import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Send, 
  Smile, 
  Paperclip, 
  MessageSquare, 
  Maximize2, 
  Hash, 
  Lock, 
  ChevronDown, 
  Clock, 
  Phone,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { ChatService } from '../../services/chatService';
import { ChatChannel, ChatMessage } from '../../types/chat';
import { ChatMessageItem } from '../Apps/Chat/ChatMessageItem';
import { ChatComposer } from '../Apps/Chat/ChatComposer';
import { ChatProvider, useChat } from '../../context/ChatContext';

const ChatDrawerInner: React.FC = () => {
  const navigate = useNavigate();
  const { setIsChatOpen } = usePlatform();
  const { 
    channels, 
    activeChannel, 
    setActiveChannel, 
    messages, 
    sendMessage,
    setIsCallingOpen 
  } = useChat();
  
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);

  const handleExpandToFullApp = () => {
    setIsChatOpen(false);
    if (activeChannel) {
      navigate(`/workspace/apps/chat`);
    } else {
      navigate('/workspace/apps/chat');
    }
  };

  const channelTitle = activeChannel 
    ? (activeChannel.type === 'direct' ? (activeChannel.dmRecipient?.name || activeChannel.name) : `#${activeChannel.name}`)
    : 'Select Channel';

  return (
    <motion.aside
      initial={{ x: 420, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 420, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-16 bottom-0 w-96 bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 flex flex-col z-40 shadow-2xl shadow-black/30 select-none"
    >
      {/* Header */}
      <div className="p-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-950 relative z-30">
        <div className="relative">
          <button
            onClick={() => setShowChannelDropdown(!showChannelDropdown)}
            className="flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2 py-1.5 rounded-xl transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm shadow-indigo-500/20">
              {activeChannel?.type === 'direct' ? <MessageSquare size={14} /> : <Hash size={14} />}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-zinc-900 dark:text-white truncate max-w-[150px]">
                  {channelTitle}
                </span>
                <ChevronDown size={12} className="text-zinc-400" />
              </div>
              <span className="text-[10px] text-zinc-400 font-medium">Switch conversation</span>
            </div>
          </button>

          {/* Click-outside backdrop */}
          {showChannelDropdown && (
            <div 
              className="fixed inset-0 z-40 bg-transparent" 
              onClick={() => setShowChannelDropdown(false)} 
            />
          )}

          {/* Conversation Switcher Dropdown */}
          {showChannelDropdown && (
            <div className="absolute left-0 top-12 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 max-h-80 overflow-y-auto custom-scrollbar ring-1 ring-black/10 dark:ring-white/10">
              <div className="px-2 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Channels
              </div>
              {channels.filter(c => c.type === 'public' || c.type === 'private').map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveChannel(c);
                    setShowChannelDropdown(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs transition-colors",
                    activeChannel?.id === c.id
                      ? "bg-indigo-600 text-white font-semibold"
                      : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  <Hash size={14} className={activeChannel?.id === c.id ? "text-white" : "text-zinc-400"} />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}

              <div className="px-2 pt-3 pb-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-t border-zinc-100 dark:border-zinc-800 mt-1.5">
                Direct Messages
              </div>
              {channels.filter(c => c.type === 'direct').map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveChannel(c);
                    setShowChannelDropdown(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs transition-colors",
                    activeChannel?.id === c.id
                      ? "bg-indigo-600 text-white font-semibold"
                      : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  <MessageSquare size={14} className={activeChannel?.id === c.id ? "text-white" : "text-zinc-400"} />
                  <span className="truncate">{c.dmRecipient?.name || c.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleExpandToFullApp}
            title="Expand to Full Chat App"
            className="p-1.5 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Maximize2 size={16} />
          </button>
          <button 
            onClick={() => setIsChatOpen(false)}
            title="Close sidebar"
            className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-xs text-zinc-400">
            No messages in this channel yet. Say hello! 👋
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessageItem key={msg.id} message={msg} />
          ))
        )}
      </div>

      {/* Mini Composer */}
      <ChatComposer 
        placeholder={`Message ${channelTitle}...`} 
      />
    </motion.aside>
  );
};

export const ChatDrawer: React.FC = () => {
  return (
    <ChatProvider>
      <ChatDrawerInner />
    </ChatProvider>
  );
};
