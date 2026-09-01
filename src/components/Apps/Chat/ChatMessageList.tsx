import React, { useRef, useEffect } from 'react';
import { Hash, Lock, Pin, MessageSquare, Sparkles } from 'lucide-react';
import { ChatMessage, ChatChannel } from '../../../types/chat';
import { ChatMessageItem } from './ChatMessageItem';
import { useChat } from '../../../context/ChatContext';
import { cn } from '../../../lib/utils';

interface ChatMessageListProps {
  channel: ChatChannel;
  messages: ChatMessage[];
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({ channel, messages }) => {
  const { typingUsers, users, userPresence, isMessagesLoading } = useChat();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const welcomeContact = channel?.dmRecipient;
  const matchedWelcomeUser = welcomeContact?.id ? (userPresence[welcomeContact.id] || users.find(u => u.id === welcomeContact.id)) : users.find(u => u.name === channel?.name);
  const welcomeAvatar = welcomeContact?.avatarUrl || matchedWelcomeUser?.avatarUrl;

  // Group messages by date
  const groupMessagesByDate = (msgs: ChatMessage[]) => {
    const groups: { [dateStr: string]: ChatMessage[] } = {};
    msgs.forEach((msg) => {
      try {
        const dateObj = new Date(msg.createdAt);
        const dateStr = dateObj.toLocaleDateString(undefined, { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric', 
          year: dateObj.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined 
        });
        if (!groups[dateStr]) groups[dateStr] = [];
        groups[dateStr].push(msg);
      } catch (e) {
        if (!groups['Recent']) groups['Recent'] = [];
        groups['Recent'].push(msg);
      }
    });
    return groups;
  };

  const grouped = groupMessagesByDate(messages);
  const pinnedMessages = messages.filter(m => m.isPinned);

  if (isMessagesLoading && messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        <div className="max-w-4xl mx-auto w-full space-y-5 py-2">
          {/* Welcome Card Skeleton */}
          <div className="pb-4 pt-2 border-b border-zinc-100 dark:border-zinc-800/80 space-y-3 animate-pulse">
            <div className="w-12 h-12 rounded-2xl bg-zinc-200 dark:bg-zinc-800/80" />
            <div className="h-5 w-40 bg-zinc-200 dark:bg-zinc-800/80 rounded-md" />
            <div className="h-3 w-72 bg-zinc-100 dark:bg-zinc-800/50 rounded-md" />
          </div>
          {/* Message Row Skeletons */}
          <div className="space-y-4 pt-2">
            {[0, 1, 2, 3, 4].map((i) => {
              const widths = ['w-3/4', 'w-1/2', 'w-4/5', 'w-2/3', 'w-3/5'];
              return (
                <div key={i} className="flex items-start gap-3 py-2 px-1 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800/80 shrink-0" />
                  <div className="flex-1 space-y-2 py-0.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-3 w-28 bg-zinc-200 dark:bg-zinc-800/80 rounded" />
                      <div className="h-2.5 w-14 bg-zinc-100 dark:bg-zinc-800/50 rounded" />
                    </div>
                    <div className="space-y-1.5">
                      <div className={cn("h-3 bg-zinc-200/80 dark:bg-zinc-800/70 rounded", widths[i % widths.length])} />
                      {i % 2 === 0 && (
                        <div className="h-3 w-1/3 bg-zinc-100 dark:bg-zinc-800/40 rounded" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
      <div className="max-w-4xl mx-auto w-full space-y-4">
        {/* Pinned Messages Banner */}
        {channel.pinnedMessages && channel.pinnedMessages.length > 0 && (
          <div className="w-full mb-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <Pin size={14} className="fill-amber-500/20" />
              <span>{channel.pinnedMessages.length} Pinned {channel.pinnedMessages.length === 1 ? 'Message' : 'Messages'}</span>
            </div>
          </div>
        )}

      {/* Channel Header Welcome Card */}
      <div className="max-w-4xl mx-auto w-full pb-4 pt-2 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 shadow-sm overflow-hidden">
          {channel.type === 'direct' ? (
            welcomeAvatar ? (
              <img src={welcomeAvatar} alt={channel.name} className="w-full h-full object-cover" />
            ) : (
              <MessageSquare size={24} />
            )
          ) : channel.type === 'private' ? (
            <Lock size={24} />
          ) : (
            <Hash size={24} />
          )}
        </div>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-white">
          {channel.type === 'direct' ? (channel.dmRecipient?.name || channel.name) : `#${channel.name}`}
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
          {channel.type === 'direct' 
            ? `This is the start of your direct message history with ${channel.dmRecipient?.name || channel.name}. Send messages, share documents, and collaborate in real-time.`
            : (channel.description || `Welcome to the beginning of the #${channel.name} channel.`)}
        </p>
        {channel.topic && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-lg text-xs text-zinc-600 dark:text-zinc-300 font-medium">
            <span className="text-zinc-400">Topic:</span>
            <span>{channel.topic}</span>
          </div>
        )}
      </div>

      {/* Grouped Messages */}
      {Object.entries(grouped).map(([dateLabel, msgs]) => (
        <div key={dateLabel} className="space-y-1">
          {/* Date Separator */}
          <div className="relative flex items-center justify-center my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
            </div>
            <span className="relative px-3 py-0.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-950 rounded-full border border-zinc-200 dark:border-zinc-800 shadow-sm">
              {dateLabel}
            </span>
          </div>

          {/* Messages for this date */}
          <div className="space-y-1">
            {msgs.map((msg) => (
              <ChatMessageItem key={msg.id} message={msg} />
            ))}
          </div>
        </div>
      ))}

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 italic px-4 py-1 animate-pulse">
          <div className="flex gap-1 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]"></span>
          </div>
          <span>
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </span>
        </div>
      )}

      </div>
      <div ref={bottomRef} />
    </div>
  );
};
