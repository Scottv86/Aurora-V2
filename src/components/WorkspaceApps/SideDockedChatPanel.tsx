import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Hash,
  Lock,
  Plus,
  Phone,
  Users,
  X,
  Maximize2,
  ExternalLink
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';
import { usePlatform } from '../../hooks/usePlatform';
import { ChatMessageItem } from '../Apps/Chat/ChatMessageItem';
import { ChatComposer } from '../Apps/Chat/ChatComposer';
import { NewConversationModal } from '../Apps/Chat/NewConversationModal';
import { AudioCallModal } from '../Apps/Chat/AudioCallModal';
import { cn } from '../../lib/utils';

export const SideDockedChatPanel: React.FC = () => {
  const navigate = useNavigate();
  const {
    setSideDockedAppId,
    addBottomDockedApp
  } = usePlatform();

  const {
    channels,
    activeChannel,
    setActiveChannel,
    messages,
    unreadTotal,
    setIsCallingOpen,
    isMessagesLoading
  } = useChat();

  const [newModalType, setNewModalType] = useState<'channel' | 'direct' | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeChannel?.id]);

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-zinc-950 select-none overflow-hidden">
      {/* Clean Header (Modeled on SideDockedServiceDeskPanel) */}
      <div className="px-4 py-3 bg-zinc-50/80 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <MessageSquare size={15} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white tracking-tight truncate">
                Aurora Chat
              </h3>
              {unreadTotal > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                  {unreadTotal}
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
              {activeChannel
                ? activeChannel.type === 'direct'
                  ? activeChannel.dmRecipient?.name || activeChannel.name
                  : `#${activeChannel.name}`
                : `${channels.length} conversations`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {activeChannel && (
            <button
              onClick={() => setIsCallingOpen(true)}
              className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer"
              title="Start Huddle / Call"
            >
              <Phone size={13} />
            </button>
          )}
          <button
            onClick={() => {
              setSideDockedAppId(null);
              addBottomDockedApp('chat');
            }}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            title="Switch to Bottom Chat Heads"
          >
            <MessageSquare size={14} />
          </button>
          <button
            onClick={() => {
              setSideDockedAppId(null);
              navigate(activeChannel ? `/workspace/apps/chat/${activeChannel.id}` : '/workspace/apps/chat');
            }}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            title="Open In App"
          >
            <Maximize2 size={14} />
          </button>
          <button
            onClick={() => window.open('/workspace/apps/chat?standalone=true', '_blank', 'noopener,noreferrer')}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            title="Open Full Screen in New Tab"
          >
            <ExternalLink size={14} />
          </button>
          <button
            onClick={() => setSideDockedAppId(null)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            title="Close Panel"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Horizontal Channel & DM Switcher Pills */}
      <div className="px-3 py-2 bg-zinc-50/70 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5 overflow-x-auto shrink-0 custom-scrollbar">
        <button
          onClick={() => setNewModalType('direct')}
          className="px-2 py-1 rounded-lg text-xs font-medium bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/70 flex items-center gap-1 shrink-0 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
          title="New Channel or DM"
        >
          <Plus size={12} />
        </button>

        {channels.map((ch) => {
          const isSelected = activeChannel?.id === ch.id;
          const displayName = ch.type === 'direct' ? (ch.dmRecipient?.name || ch.name) : ch.name;
          return (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 border transition-all cursor-pointer',
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
              )}
            >
              {ch.type === 'direct' ? (
                <MessageSquare size={11} />
              ) : ch.type === 'group' ? (
                <Users size={11} />
              ) : ch.type === 'private' ? (
                <Lock size={11} />
              ) : (
                <Hash size={11} />
              )}
              <span className="truncate max-w-[110px]">{displayName}</span>
              {ch.unreadCount && ch.unreadCount > 0 ? (
                <span
                  className={cn(
                    'px-1 py-0.2 rounded-full text-[9px] font-bold',
                    isSelected ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'
                  )}
                >
                  {ch.unreadCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Messages Stream */}
      {activeChannel ? (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-white dark:bg-zinc-950 select-text custom-scrollbar">
            {isMessagesLoading && messages.length === 0 ? (
              <div className="space-y-3 py-4 animate-pulse">
                <div className="h-10 bg-zinc-100 dark:bg-zinc-900 rounded-xl w-4/5" />
                <div className="h-10 bg-zinc-100 dark:bg-zinc-900 rounded-xl w-3/4 ml-auto" />
                <div className="h-10 bg-zinc-100 dark:bg-zinc-900 rounded-xl w-4/5" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-xs text-zinc-400">
                No messages in this conversation yet. Say hello!
              </div>
            ) : (
              messages.map((msg) => <ChatMessageItem key={msg.id} message={msg} />)
            )}
            <div ref={messagesEndRef} />
          </div>

          <ChatComposer
            placeholder={
              activeChannel.type === 'direct'
                ? `Message ${activeChannel.dmRecipient?.name || activeChannel.name}...`
                : `Message #${activeChannel.name}...`
            }
          />
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-zinc-400">
          <MessageSquare className="w-7 h-7 mb-2 text-zinc-300 dark:text-zinc-700" />
          <p className="mb-3">Select or start a conversation</p>
          <button
            onClick={() => setNewModalType('channel')}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={12} /> New Channel
          </button>
        </div>
      )}

      <AnimatePresence>
        {newModalType && (
          <NewConversationModal
            initialType={newModalType}
            onClose={() => setNewModalType(null)}
          />
        )}
      </AnimatePresence>
      <AudioCallModal />
    </div>
  );
};
