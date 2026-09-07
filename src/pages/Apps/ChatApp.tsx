import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Hash, 
  Lock, 
  MessageSquare, 
  Phone, 
  Info, 
  Plus
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { ChatProvider, useChat } from '../../context/ChatContext';
import { ChatSidebar } from '../../components/Apps/Chat/ChatSidebar';
import { ChatMessageList } from '../../components/Apps/Chat/ChatMessageList';
import { ChatComposer } from '../../components/Apps/Chat/ChatComposer';
import { ChatThreadPane } from '../../components/Apps/Chat/ChatThreadPane';
import { ChatDetailsPane } from '../../components/Apps/Chat/ChatDetailsPane';
import { NewConversationModal } from '../../components/Apps/Chat/NewConversationModal';
import { AudioCallModal } from '../../components/Apps/Chat/AudioCallModal';
import { cn } from '../../lib/utils';

const ChatAppContent: React.FC = () => {
  const { conversationId } = useParams();
  const { 
    activeChannel, 
    setActiveChannelById, 
    messages, 
    threadParentMessage, 
    isInfoOpen, 
    setIsInfoOpen, 
    setIsCallingOpen,
    users,
    userPresence,
    isLoading
  } = useChat();

  const [newModalType, setNewModalType] = useState<'channel' | 'direct' | null>(null);

  useEffect(() => {
    if (conversationId) {
      setActiveChannelById(conversationId);
    }
  }, [conversationId, setActiveChannelById]);

  const activeContact = activeChannel?.dmRecipient;
  const matchedActiveUser = activeContact?.id ? (userPresence[activeContact.id] || users.find(u => u.id === activeContact.id)) : users.find(u => u.name === activeChannel?.name);
  const activeDmAvatar = activeContact?.avatarUrl || matchedActiveUser?.avatarUrl;

  return (
    <div className="fixed inset-0 z-40 w-screen h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white overflow-hidden flex">
      {/* 1. Left Sidebar: Channels & Direct Messages */}
      <ChatSidebar onOpenNewModal={(type) => setNewModalType(type)} />

      {/* 2. Main Chat Area */}
      {isLoading && !activeChannel ? (
        <div className="flex-1 flex flex-col h-full min-w-0 bg-white dark:bg-zinc-950">
          {/* Header Skeleton */}
          <div className="h-14 px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-100/90 dark:bg-zinc-900 shrink-0 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-7 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
              <div className="h-7 w-7 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
            </div>
          </div>
          {/* Body Skeleton */}
          <div className="flex-1 p-6 space-y-4 max-w-4xl mx-auto w-full animate-pulse">
            <div className="h-5 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-3 w-80 bg-zinc-100 dark:bg-zinc-800/60 rounded" />
            <div className="pt-4 space-y-4">
              <div className="h-12 bg-zinc-100/80 dark:bg-zinc-900/60 rounded-2xl w-full" />
              <div className="h-12 bg-zinc-100/80 dark:bg-zinc-900/60 rounded-2xl w-full" />
              <div className="h-12 bg-zinc-100/80 dark:bg-zinc-900/60 rounded-2xl w-full" />
            </div>
          </div>
        </div>
      ) : activeChannel ? (
        <div className="flex-1 flex flex-col h-full min-w-0 bg-white dark:bg-zinc-950">
          {/* Top Channel Header */}
          <header className="h-14 px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-100/90 dark:bg-zinc-900 shrink-0">
            <div className="flex items-center gap-3 truncate">
              <div className="flex items-center gap-1.5 truncate">
                {activeChannel.type === 'direct' ? (
                  <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 overflow-hidden shrink-0">
                    {activeDmAvatar ? (
                      <img src={activeDmAvatar} alt={activeChannel.name} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      (activeChannel.dmRecipient?.name || activeChannel.name).charAt(0).toUpperCase()
                    )}
                  </div>
                ) : activeChannel.type === 'private' ? (
                  <Lock size={16} className="text-zinc-500" />
                ) : (
                  <Hash size={18} className="text-zinc-500" />
                )}
                
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                  {activeChannel.type === 'direct' 
                    ? (activeChannel.dmRecipient?.name || activeChannel.name)
                    : activeChannel.name}
                </h2>
              </div>

              {activeChannel.topic && (
                <span className="hidden md:inline-block text-xs text-zinc-400 truncate max-w-md border-l border-zinc-200 dark:border-zinc-800 pl-3">
                  {activeChannel.topic}
                </span>
              )}
            </div>

            {/* Right Action Tools */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Start Audio/Video Call (Slack Huddle / Teams Call) */}
              <button
                onClick={() => setIsCallingOpen(true)}
                title="Start Huddle / Call"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                <Phone size={13} className="fill-emerald-500/20" />
                <span>Huddle</span>
              </button>

              {/* Toggle Details Pane */}
              <button
                onClick={() => setIsInfoOpen(!isInfoOpen)}
                title="Channel Details & Members"
                className={cn(
                  "p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors",
                  isInfoOpen && "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                )}
              >
                <Info size={16} />
              </button>
            </div>
          </header>

          {/* Main Message Stream */}
          <ChatMessageList channel={activeChannel} messages={messages} />

          {/* Message Input Composer */}
          <ChatComposer 
            placeholder={
              activeChannel.type === 'direct'
                ? `Message ${activeChannel.dmRecipient?.name || activeChannel.name}...`
                : `Message #${activeChannel.name}...`
            }
          />
        </div>
      ) : (
        /* Empty State if no active channel selected */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-50/50 dark:bg-zinc-950">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-lg shadow-indigo-500/10">
            <MessageSquare size={32} />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">Welcome to Aurora Chat</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1 mb-4">
            Select a channel or direct message from the sidebar, or create a new conversation to start collaborating.
          </p>
          <button
            onClick={() => setNewModalType('channel')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center gap-2"
          >
            <Plus size={14} />
            <span>Create Channel</span>
          </button>
        </div>
      )}

      {/* 3. Right Slide Panes: Threads or Channel Info */}
      <AnimatePresence>
        {threadParentMessage && <ChatThreadPane key="thread-pane" />}
        {isInfoOpen && !threadParentMessage && <ChatDetailsPane key="details-pane" />}
      </AnimatePresence>

      {/* 4. Modals */}
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

export const ChatApp: React.FC = () => {
  return (
    <ChatProvider>
      <ChatAppContent />
    </ChatProvider>
  );
};

export default ChatApp;
