import React, { useState } from 'react';
import { 
  X, 
  Users, 
  Pin, 
  FileText, 
  Bell, 
  Hash, 
  Lock, 
  Info, 
  Download, 
  Check, 
  UserPlus 
} from 'lucide-react';
import { motion } from 'motion/react';
import { useChat } from '../../../context/ChatContext';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

export const ChatDetailsPane: React.FC = () => {
  const { activeChannel, setIsInfoOpen, users, userPresence, messages } = useChat();
  const [tab, setTab] = useState<'members' | 'pins' | 'files'>('members');

  if (!activeChannel) return null;

  const pinnedMessages = messages.filter(m => m.isPinned);
  const attachments = messages.flatMap(m => m.attachments || []);

  const channelMembers = users.filter(u => 
    activeChannel.memberIds?.includes(u.id) || activeChannel.type === 'public'
  );

  const getPresenceDot = (status?: string) => {
    const s = String(status || '').toUpperCase();
    switch (s) {
      case 'AVAILABLE':
      case 'ONLINE':
        return 'bg-emerald-500';
      case 'AWAY_TWIN':
      case 'AWAY':
        return 'bg-amber-500 shadow-sm shadow-amber-500/50';
      case 'DND_INTERCEPT':
      case 'BUSY':
        return 'bg-rose-500';
      case 'NIGHT_SHIFT':
        return 'bg-purple-600';
      default:
        return 'bg-zinc-400';
    }
  };

  return (
    <motion.aside 
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 384, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
      className="h-full bg-zinc-100/90 dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col z-20 shrink-0 select-none shadow-xl overflow-hidden"
    >
      <div className="w-96 h-full flex flex-col shrink-0">
        {/* Header */}
      <div className="h-14 px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white/70 dark:bg-zinc-900 shrink-0">
        <div className="flex items-center gap-2">
          <Info size={16} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Channel Details</h3>
        </div>
        <button
          onClick={() => setIsInfoOpen(false)}
          className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold px-2 bg-zinc-50 dark:bg-zinc-900/60">
        <button
          onClick={() => setTab('members')}
          className={cn(
            "flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-all",
            tab === 'members'
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          )}
        >
          <Users size={14} />
          <span>Members ({channelMembers.length})</span>
        </button>
        <button
          onClick={() => setTab('pins')}
          className={cn(
            "flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-all",
            tab === 'pins'
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          )}
        >
          <Pin size={14} />
          <span>Pinned ({pinnedMessages.length})</span>
        </button>
        <button
          onClick={() => setTab('files')}
          className={cn(
            "flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-all",
            tab === 'files'
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          )}
        >
          <FileText size={14} />
          <span>Files ({attachments.length})</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {tab === 'members' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Channel Roster</span>
              <button
                onClick={() => toast.info('Add members dialog')}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <UserPlus size={13} />
                <span>Add Member</span>
              </button>
            </div>

            <div className="space-y-2">
              {channelMembers.map((member) => {
                const presence = userPresence[member.id]?.presence || member.presence || 'offline';
                const status = userPresence[member.id]?.status || member.status;
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-zinc-950",
                          getPresenceDot(presence)
                        )} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                          {member.name}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {status?.text ? `${status.emoji || ''} ${status.text}` : member.role || 'Member'}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-semibold text-zinc-400 capitalize">
                      {presence}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'pins' && (
          <div className="space-y-3">
            {pinnedMessages.length === 0 ? (
              <div className="text-center py-10 text-xs text-zinc-400">
                No pinned messages in this channel yet. Pin important announcements using the message action menu.
              </div>
            ) : (
              pinnedMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[10px] text-zinc-400">
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">{msg.senderName}</span>
                    <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-zinc-800 dark:text-zinc-200 line-clamp-3">
                    {msg.content}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'files' && (
          <div className="space-y-3">
            {attachments.length === 0 ? (
              <div className="text-center py-10 text-xs text-zinc-400">
                No files shared in this channel yet.
              </div>
            ) : (
              attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">{att.name}</p>
                      <p className="text-[10px] text-zinc-400">{att.type.toUpperCase()}</p>
                    </div>
                  </div>
                  <a
                    href={att.url}
                    download={att.name}
                    className="p-1.5 text-zinc-400 hover:text-indigo-600 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <Download size={14} />
                  </a>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      </div>
    </motion.aside>
  );
};
