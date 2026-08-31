import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Archive, 
  Trash2, 
  Reply, 
  ReplyAll, 
  Forward, 
  MoreVertical, 
  Paperclip, 
  Download, 
  FolderPlus, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  Layers, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  Printer,
  FileText,
  UserCheck,
  Send,
  Loader2
} from 'lucide-react';
import { EmailThread, EmailMessage, EmailAttachment } from '../../../types/inbox';
import { InboxService } from '../../../services/inboxService';
import { usePlatform } from '../../../hooks/usePlatform';
import { useAuth } from '../../../hooks/useAuth';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

interface InboxThreadViewProps {
  thread: EmailThread;
  onStarThread: (threadId: string, currentStarred: boolean, e: React.MouseEvent) => void;
  onArchiveThread: (threadId: string) => void;
  onTrashThread: (threadId: string) => void;
  onOpenConvertModal: (thread: EmailThread) => void;
  onQuickReply: (text: string) => void;
  onOpenComposerWithContext: (mode: 'reply' | 'replyAll' | 'forward', message: EmailMessage) => void;
}

export const InboxThreadView: React.FC<InboxThreadViewProps> = ({
  thread,
  onStarThread,
  onArchiveThread,
  onTrashThread,
  onOpenConvertModal,
  onQuickReply,
  onOpenComposerWithContext
}) => {
  const { user: platformUser } = usePlatform();
  const { user: authUser } = useAuth();

  const currentUserName = 
    platformUser?.name ||
    (platformUser?.firstName ? `${platformUser.firstName} ${platformUser.lastName || ''}`.trim() : '') ||
    authUser?.user_metadata?.full_name ||
    authUser?.user_metadata?.name ||
    (authUser?.user_metadata?.first_name ? `${authUser.user_metadata.first_name} ${authUser.user_metadata.last_name || ''}`.trim() : '') ||
    authUser?.email?.split('@')[0] ||
    'Kenny Powers';

  const currentUserAvatarUrl = 
    platformUser?.avatarUrl || 
    authUser?.user_metadata?.avatar_url || 
    authUser?.user_metadata?.avatar || 
    authUser?.user_metadata?.picture || 
    '';

  const [expandedMessageIds, setExpandedMessageIds] = useState<string[]>([]);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [savingAttachmentId, setSavingAttachmentId] = useState<string | null>(null);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [collaborators, setCollaborators] = useState<{ id: string; name: string; status: string }[]>([]);

  useEffect(() => {
    // By default expand the last message, or all if only 1
    if (thread.messages.length > 0) {
      const lastMsg = thread.messages[thread.messages.length - 1];
      setExpandedMessageIds([lastMsg.id]);
    }

    // Fetch AI Smart Replies for this thread
    setLoadingReplies(true);
    InboxService.generateSmartReplies(thread)
      .then(replies => setSmartReplies(replies))
      .catch(() => setSmartReplies([]))
      .finally(() => setLoadingReplies(false));

    // Send presence heartbeat
    const userStr = localStorage.getItem('aurora_user');
    let currentUserName = 'Staff Member';
    let currentUserId = 'user_1';
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        currentUserName = u.name || u.firstName || 'Staff Member';
        currentUserId = u.id || 'user_1';
      } catch (_) {}
    }

    InboxService.sendPresenceHeartbeat(thread.id, currentUserId, currentUserName, 'viewing')
      .then(active => setCollaborators(active.filter(c => c.id !== currentUserId)))
      .catch(() => setCollaborators([]));

    const presenceInterval = setInterval(() => {
      InboxService.sendPresenceHeartbeat(thread.id, currentUserId, currentUserName, 'viewing')
        .then(active => setCollaborators(active.filter(c => c.id !== currentUserId)))
        .catch(() => {});
    }, 10000);

    return () => {
      clearInterval(presenceInterval);
      InboxService.sendPresenceHeartbeat(thread.id, currentUserId, currentUserName, 'idle').catch(() => {});
    };
  }, [thread.id]);

  const handleSnoozeQuick = async (hours: number) => {
    try {
      const snoozedUntil = new Date(Date.now() + hours * 3600000).toISOString();
      await InboxService.snoozeThread(thread.id, snoozedUntil);
      setShowSnoozeMenu(false);
      onArchiveThread(thread.id);
      toast.success(`Conversation snoozed for ${hours < 24 ? `${hours} hours` : `${hours / 24} days`}`);
    } catch (_) {
      toast.error('Failed to snooze thread');
    }
  };

  const toggleMessageExpand = (id: string) => {
    setExpandedMessageIds(prev => 
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const handleSaveToDrive = async (attachment: EmailAttachment) => {
    try {
      setSavingAttachmentId(attachment.id);
      const driveItemId = await InboxService.saveAttachmentToDrive({
        filename: attachment.filename,
        contentType: attachment.contentType,
        contentBase64: attachment.contentBase64,
        size: attachment.size
      }, 'TENANT_SHARED');
      toast.success(`Saved "${attachment.filename}" to Aurora Drive!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save to Drive');
    } finally {
      setSavingAttachmentId(null);
    }
  };

  const formatFullDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString([], { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (_) {
      return iso;
    }
  };

  return (
    <div className="flex-1 h-full bg-white dark:bg-zinc-950 flex flex-col overflow-hidden select-text">
      
      {/* Top Header & Actions Bar */}
      <div className="px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md shrink-0 space-y-3">
        
        {/* Row 1: Action Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          
          {/* Left: Collaboration Status & Assignee */}
          <div className="flex items-center gap-2">
            {/* Shared Status Selector */}
            <select
              value={thread.sharedStatus || 'OPEN'}
              onChange={async (e) => {
                const val = e.target.value as 'OPEN' | 'PENDING' | 'RESOLVED';
                await InboxService.updateThreadStatus(thread.id, val);
                toast.success(`Status updated to ${val}`);
              }}
              className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold border border-zinc-200 dark:border-zinc-700/80 outline-none cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <option value="OPEN">🟢 Open</option>
              <option value="PENDING">🟡 Pending</option>
              <option value="RESOLVED">⚪ Resolved</option>
            </select>

            {/* Assignee Selector */}
            <select
              value={thread.assignedTo || ''}
              onChange={async (e) => {
                const val = e.target.value;
                await InboxService.assignThread(thread.id, val);
                toast.success(val ? `Assigned to ${val}` : 'Unassigned');
              }}
              className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold border border-zinc-200 dark:border-zinc-700/80 outline-none cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <option value="">👤 Unassigned</option>
              <option value="Sarah Jenkins">Sarah Jenkins</option>
              <option value="Alex Rivera">Alex Rivera</option>
              <option value="David Chen">David Chen</option>
              <option value="AI Triage Agent">🤖 AI Triage Agent</option>
            </select>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5">
            {/* Star */}
            <button
              onClick={(e) => onStarThread(thread.id, thread.isStarred, e)}
              className={cn(
                "p-1.5 rounded-lg transition-colors cursor-pointer",
                thread.isStarred ? "text-amber-400" : "text-zinc-400 hover:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              )}
              title={thread.isStarred ? "Starred" : "Star conversation"}
            >
              <Star size={16} className={thread.isStarred ? "fill-amber-400 text-amber-400" : ""} />
            </button>

            {/* Snooze Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Snooze conversation"
              >
                <Clock size={16} />
              </button>

              {showSnoozeMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-30 p-1 text-xs divide-y divide-zinc-100 dark:divide-zinc-800 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-1 space-y-0.5">
                    <button
                      onClick={() => handleSnoozeQuick(4)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium cursor-pointer"
                    >
                      Later Today (+4 hours)
                    </button>
                    <button
                      onClick={() => handleSnoozeQuick(24)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium cursor-pointer"
                    >
                      Tomorrow (9:00 AM)
                    </button>
                    <button
                      onClick={() => handleSnoozeQuick(168)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium cursor-pointer"
                    >
                      Next Week (Monday)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Convert to Module Record Button */}
            <button
              onClick={() => onOpenConvertModal(thread)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold border border-zinc-200 dark:border-zinc-700/80 text-xs transition-all cursor-pointer shadow-sm"
              title="Convert email to an Aurora Module Record"
            >
              <Layers size={13} />
              <span>Convert to Record</span>
            </button>

            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

            {/* Archive */}
            <button
              onClick={() => onArchiveThread(thread.id)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Archive"
            >
              <Archive size={16} />
            </button>

            {/* Trash */}
            <button
              onClick={() => onTrashThread(thread.id)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Row 2: Full Width Thread Title & Tags */}
        <div className="space-y-1.5 pt-1">
          <h1 className="text-lg lg:text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-snug break-words">
            {thread.subject || '(No Subject)'}
          </h1>

          <div className="flex items-center gap-1.5 flex-wrap">
            {thread.labels?.map(lbl => (
              <span
                key={lbl}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60"
              >
                {lbl}
              </span>
            ))}

            {thread.linkedRecords?.map(rec => (
              <span
                key={rec.id}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/40 flex items-center gap-1"
              >
                <Layers size={10} />
                Linked to {rec.moduleName} ({rec.recordKey})
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* Real-time Collision Banner (if collaborators active) */}
      {collaborators.length > 0 && (
        <div className="px-6 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <span className="font-semibold">
            {collaborators.map(c => c.name).join(', ')} {collaborators.length === 1 ? 'is' : 'are'} currently viewing this thread.
          </span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        
        {thread.messages.map((message, idx) => {
          const isExpanded = expandedMessageIds.includes(message.id);
          const isLast = idx === thread.messages.length - 1;

          const isCurrentUser = 
            message.from.name === currentUserName ||
            message.from.name === 'Kenny Powers' ||
            message.from.name === 'Staff Member' ||
            message.from.name === 'Ashley Schaffer' ||
            message.from.name === 'Aurora User' ||
            (platformUser?.email && message.from.address === platformUser.email) ||
            (authUser?.email && message.from.address === authUser.email) ||
            message.from.address === 'kenny.powers@aurora.internal' ||
            message.from.address === 'user@aurora.internal';

          const senderDisplayName = isCurrentUser ? currentUserName : (message.from.name || message.from.address);
          const avatarImg = message.from.avatarUrl || (isCurrentUser ? currentUserAvatarUrl : undefined);

          return (
            <div
              key={message.id}
              className={cn(
                "bg-white dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden transition-all",
                isExpanded ? "p-5" : "p-3.5 hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer"
              )}
              onClick={() => !isExpanded && toggleMessageExpand(message.id)}
            >
              
              {/* Message Header */}
              <div className="flex items-start justify-between gap-4">
                
                <div className="flex items-start gap-3 min-w-0">
                  {/* Sender Avatar */}
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm shadow-blue-500/20 overflow-hidden">
                    {avatarImg ? (
                      <img src={avatarImg} alt={senderDisplayName} className="w-full h-full object-cover" />
                    ) : (
                      senderDisplayName.substring(0, 2).toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white">
                        {senderDisplayName}
                      </span>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        &lt;{message.from.address}&gt;
                      </span>
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                        <ShieldCheck size={10} /> TLS Verified
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                      to {message.to.map(t => t.name || t.address).join(', ')}
                    </p>
                  </div>
                </div>

                {/* Right Date & Expand Button */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-zinc-400 font-medium">
                    {formatFullDate(message.date)}
                  </span>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMessageExpand(message.id);
                    }}
                    className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

              </div>

              {/* Message Content (when expanded) */}
              {isExpanded && (
                <div className="mt-5 space-y-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
                  
                  {/* HTML/Text Email Body */}
                  <div 
                    className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-sans prose dark:prose-invert max-w-none break-words"
                    dangerouslySetInnerHTML={{ __html: message.bodyHtml || message.bodyText }}
                  />

                  {/* Attachments Section */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/60 space-y-2.5">
                      <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Paperclip size={13} />
                        {message.attachments.length} Attachment{message.attachments.length > 1 ? 's' : ''}
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {message.attachments.map(att => (
                          <div
                            key={att.id}
                            className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 flex items-center justify-between gap-3 group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                <FileText size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                  {att.filename}
                                </p>
                                <p className="text-[10px] text-zinc-400 font-mono">
                                  {Math.round(att.size / 1024)} KB
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleSaveToDrive(att)}
                                disabled={savingAttachmentId === att.id}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-bold transition-all cursor-pointer"
                                title="Save to Aurora Drive"
                              >
                                {savingAttachmentId === att.id ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <FolderPlus size={12} />
                                )}
                                <span>Save to Drive</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message Action Footer */}
                  <div className="flex items-center gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800/40">
                    <button
                      onClick={() => onOpenComposerWithContext('reply', message)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Reply size={14} />
                      <span>Reply</span>
                    </button>

                    <button
                      onClick={() => onOpenComposerWithContext('replyAll', message)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <ReplyAll size={14} />
                      <span>Reply All</span>
                    </button>

                    <button
                      onClick={() => onOpenComposerWithContext('forward', message)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Forward size={14} />
                      <span>Forward</span>
                    </button>
                  </div>

                </div>
              )}

            </div>
          );
        })}

        {/* AI Smart Replies Chips Bar */}
        <div className="pt-2 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
            <Sparkles size={13} className="text-amber-500" />
            <span>AI Smart Reply Suggestions:</span>
          </div>

          {loadingReplies ? (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Loader2 size={13} className="animate-spin" />
              <span>Analyzing conversation context...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {smartReplies.map((replyText, i) => (
                <button
                  key={i}
                  onClick={() => onQuickReply(replyText)}
                  className="px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-all text-left shadow-sm hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  "{replyText}"
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Bottom Quick Reply Action Bar */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/70 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
        <button
          onClick={() => onOpenComposerWithContext('reply', thread.messages[thread.messages.length - 1])}
          className="flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 text-xs transition-all text-left shadow-sm cursor-pointer"
        >
          <Reply size={15} />
          <span>Click here to Reply or start typing...</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenComposerWithContext('replyAll', thread.messages[thread.messages.length - 1])}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ReplyAll size={14} />
            <span>Reply All</span>
          </button>
        </div>
      </div>

    </div>
  );
};
