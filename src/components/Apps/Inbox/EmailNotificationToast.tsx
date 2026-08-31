import React from 'react';
import { Check, Archive, ArrowUpRight, X } from 'lucide-react';
import { toast } from 'sonner';

export interface EmailToastPayload {
  threadId: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  snippet: string;
  accountName?: string;
  accountEmail?: string;
}

interface EmailNotificationToastProps {
  toastId: string | number;
  payload: EmailToastPayload;
  onOpenThread: (threadId: string) => void;
  onMarkRead: (threadId: string) => void;
  onArchive: (threadId: string) => void;
}

export const EmailNotificationToast: React.FC<EmailNotificationToastProps> = ({
  toastId,
  payload,
  onOpenThread,
  onMarkRead,
  onArchive
}) => {
  return (
    <div className="w-[360px] max-w-[95vw] bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl shadow-2xl p-3.5 flex flex-col gap-2.5 font-sans animate-in slide-in-from-top-4 duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-blue-500/15 dark:bg-blue-500/25 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-500/20 shadow-xs">
            {payload.senderName?.charAt(0)?.toUpperCase() || 'M'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                {payload.senderName || payload.senderEmail}
              </span>
            </div>
            {payload.accountName && (
              <p className="text-[10px] text-zinc-400 truncate leading-none mt-0.5">
                via {payload.accountName}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded-md">New</span>
          <button
            onClick={() => toast.dismiss(toastId)}
            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Body: Subject & Snippet */}
      <div 
        onClick={() => {
          onOpenThread(payload.threadId);
          toast.dismiss(toastId);
        }}
        className="group cursor-pointer rounded-xl p-2.5 bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 transition-all space-y-1"
      >
        <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {payload.subject || 'No Subject'}
        </p>
        {payload.snippet && (
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
            {payload.snippet}
          </p>
        )}
      </div>

      {/* Quick Action Footer */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <button
          onClick={() => {
            onOpenThread(payload.threadId);
            toast.dismiss(toastId);
          }}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
        >
          <span>Open</span>
          <ArrowUpRight size={13} />
        </button>

        <button
          onClick={() => {
            onMarkRead(payload.threadId);
            toast.dismiss(toastId);
          }}
          className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
          title="Mark as Read"
        >
          <Check size={13} />
          <span>Read</span>
        </button>

        <button
          onClick={() => {
            onArchive(payload.threadId);
            toast.dismiss(toastId);
          }}
          className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
          title="Archive"
        >
          <Archive size={13} />
          <span>Archive</span>
        </button>
      </div>
    </div>
  );
};
