import React from 'react';
import { ArrowUpRight, Check, X, Hash, Lock, Users } from 'lucide-react';
import { toast } from 'sonner';

export interface ChatToastPayload {
  messageId: string;
  channelId: string;
  channelName: string;
  channelType?: 'public' | 'private' | 'direct' | 'group';
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRole?: string;
  content: string;
  hasAttachments?: boolean;
}

interface ChatNotificationToastProps {
  toastId: string | number;
  payload: ChatToastPayload;
  onOpenChannel: (channelId: string) => void;
  onMarkRead?: (channelId: string) => void;
}

export const ChatNotificationToast: React.FC<ChatNotificationToastProps> = ({
  toastId,
  payload,
  onOpenChannel,
  onMarkRead
}) => {
  const isDirect = payload.channelType === 'direct';
  const isGroup = payload.channelType === 'group';
  const isPrivate = payload.channelType === 'private';

  const initial = (payload.senderName || 'U').charAt(0).toUpperCase();

  return (
    <div className="w-[360px] max-w-[95vw] bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl shadow-2xl p-3.5 flex flex-col gap-2.5 font-sans animate-in slide-in-from-top-4 duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-200 dark:border-indigo-800 overflow-hidden shadow-xs">
            {payload.senderAvatar ? (
              <img src={payload.senderAvatar} alt={payload.senderName} className="w-full h-full object-cover rounded-full" />
            ) : isGroup ? (
              <Users size={13} />
            ) : (
              initial
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                {payload.senderName}
              </span>
              {payload.senderRole && (
                <span className="text-[10px] text-zinc-400 font-medium truncate max-w-[100px]">
                  • {payload.senderRole}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium truncate mt-0.5">
              {isDirect ? (
                <span>Direct Message</span>
              ) : isPrivate ? (
                <>
                  <Lock size={10} className="shrink-0" />
                  <span className="truncate">{payload.channelName}</span>
                </>
              ) : isGroup ? (
                <>
                  <Users size={10} className="shrink-0" />
                  <span className="truncate">{payload.channelName}</span>
                </>
              ) : (
                <>
                  <Hash size={10} className="shrink-0" />
                  <span className="truncate">{payload.channelName}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-800/50">
            Chat
          </span>
          <button
            onClick={() => toast.dismiss(toastId)}
            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Body: Message Snippet */}
      <div 
        onClick={() => {
          onOpenChannel(payload.channelId);
          toast.dismiss(toastId);
        }}
        className="group cursor-pointer rounded-xl p-2.5 bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 transition-all space-y-1"
      >
        <p className="text-xs text-zinc-700 dark:text-zinc-200 line-clamp-2 leading-relaxed break-words font-normal">
          {payload.content || (payload.hasAttachments ? '📎 Sent an attachment' : 'New message')}
        </p>
      </div>

      {/* Quick Action Footer */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <button
          onClick={() => {
            onOpenChannel(payload.channelId);
            toast.dismiss(toastId);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
        >
          <span>Open Chat</span>
          <ArrowUpRight size={13} />
        </button>

        {onMarkRead && (
          <button
            onClick={() => {
              onMarkRead(payload.channelId);
              toast.dismiss(toastId);
            }}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
            title="Mark as Read"
          >
            <Check size={13} />
            <span>Read</span>
          </button>
        )}
      </div>
    </div>
  );
};
