import React, { useState } from 'react';
import { 
  Smile, 
  MessageSquare, 
  Pin, 
  Edit3, 
  Trash2, 
  Copy, 
  Check, 
  FileText, 
  Download, 
  CornerDownRight
} from 'lucide-react';
import { ChatMessage } from '../../../types/chat';
import { useChat } from '../../../context/ChatContext';
import { useAuth } from '../../../hooks/useAuth';
import { usePlatform } from '../../../hooks/usePlatform';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

interface ChatMessageItemProps {
  message: ChatMessage;
  isThreadView?: boolean;
}

const COMMON_REACTIONS = ['👍', '❤️', '🔥', '🚀', '🎉', '😂', '👀', '💯'];

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message, isThreadView = false }) => {
  const { toggleReaction, togglePin, editMessage, deleteMessage, openThread } = useChat();
  const { user } = useAuth();
  const { user: platformUser } = usePlatform();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const currentUserId = user?.id || platformUser?.id || platformUser?.memberId || 'current-user';
  const platformFamilyName = (platformUser as any)?.familyName;
  const platformName = platformUser?.firstName && (platformUser?.lastName || platformFamilyName)
    ? `${platformUser.firstName} ${platformUser.lastName || platformFamilyName}`
    : (platformUser?.name || platformUser?.firstName || platformUser?.lastName || platformFamilyName);
  const currentUserName = platformName || (user?.user_metadata as any)?.full_name || (user?.user_metadata as any)?.name || user?.email?.split('@')[0] || 'User';

  const isMe = message.senderId === currentUserId || 
               message.senderName === currentUserName || 
               (platformName && message.senderName === platformName) ||
               message.senderName === user?.email?.split('@')[0];

  const isOwner = isMe || (user as any)?.isSuperAdmin;

  const handleSaveEdit = async () => {
    if (editContent.trim()) {
      await editMessage(message.id, editContent);
      setIsEditing(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  // Render markdown / code snippet / formatted text
  const renderMessageContent = (content: string, isSelf: boolean) => {
    // Check for code blocks ```lang ... ```
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', value: content.substring(lastIndex, match.index) });
      }
      parts.push({ type: 'code', lang: match[1] || 'plaintext', value: match[2] });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', value: content.substring(lastIndex) });
    }

    if (parts.length === 0) {
      parts.push({ type: 'text', value: content });
    }

    return (
      <div className={cn(
        "space-y-2 text-xs md:text-sm leading-relaxed break-words select-text",
        isSelf ? "text-white" : "text-zinc-800 dark:text-zinc-200"
      )}>
        {parts.map((part, idx) => {
          if (part.type === 'code') {
            return (
              <div key={idx} className="my-2 rounded-xl bg-zinc-950 text-zinc-100 border border-zinc-800 text-xs overflow-hidden text-left">
                <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 font-mono text-[11px]">
                  <span>{part.lang}</span>
                  <button
                    onClick={() => {
                      handleCopy(part.value);
                      setCopiedCode(`${idx}`);
                      setTimeout(() => setCopiedCode(null), 2000);
                    }}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    {copiedCode === `${idx}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedCode === `${idx}` ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 overflow-x-auto font-mono text-emerald-400">
                  <code>{part.value}</code>
                </pre>
              </div>
            );
          }

          return (
            <p key={idx} className="whitespace-pre-wrap">
              {part.value}
            </p>
          );
        })}
      </div>
    );
  };

  if (message.isSystem) {
    return (
      <div className="flex items-center justify-center my-3">
        <span className="px-3 py-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 rounded-full border border-zinc-200 dark:border-zinc-800">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      "group relative flex gap-3 px-4 py-2 hover:bg-zinc-500/5 transition-colors rounded-2xl",
      isMe ? "flex-row-reverse" : "flex-row",
      message.isPinned && "bg-amber-500/5 dark:bg-amber-500/10 border-l-2 border-amber-500"
    )}>
      {/* Sender Avatar */}
      <div className="shrink-0 pt-1">
        {message.senderAvatar ? (
          <img
            src={message.senderAvatar}
            alt={message.senderName || 'Avatar'}
            className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 shadow-sm"
          />
        ) : (
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm",
            isMe 
              ? "bg-gradient-to-tr from-indigo-600 to-violet-600 ring-2 ring-indigo-500/20" 
              : "bg-gradient-to-tr from-zinc-600 to-zinc-800"
          )}>
            {message.senderName ? message.senderName.charAt(0).toUpperCase() : 'U'}
          </div>
        )}
      </div>

      {/* Main Bubble & Content Area */}
      <div className={cn(
        "flex flex-col max-w-[82%] sm:max-w-[75%]",
        isMe ? "items-end" : "items-start"
      )}>
        {/* Header: Name, Role, Timestamp, Pinned tag */}
        <div className={cn(
          "flex items-center gap-1.5 mb-1 px-1",
          isMe ? "flex-row-reverse" : "flex-row"
        )}>
          <span className="text-xs font-bold text-zinc-900 dark:text-white capitalize">
            {isMe ? 'You' : message.senderName}
          </span>
          {message.senderRole && !isMe && (
            <span className="px-1.5 py-0.2 text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded">
              {message.senderRole}
            </span>
          )}
          <span className="text-[10px] text-zinc-400 font-medium">
            {formatTimestamp(message.createdAt)}
          </span>
          {message.isEdited && (
            <span className="text-[10px] text-zinc-400 italic">(edited)</span>
          )}
          {message.isPinned && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 ml-1">
              <Pin size={10} className="fill-amber-500" />
              Pinned
            </span>
          )}
        </div>

        {/* Message Bubble */}
        {isEditing ? (
          <div className="w-full mt-1 space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-2.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-2xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[70px]"
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => {
                  setEditContent(message.content);
                  setIsEditing(false);
                }}
                className="px-3 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs hover:bg-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className={cn(
            "p-3.5 shadow-sm transition-all",
            isMe
              ? "bg-indigo-600 text-white rounded-2xl rounded-tr-xs"
              : "bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800/80 text-zinc-900 dark:text-zinc-100 rounded-2xl rounded-tl-xs"
          )}>
            {renderMessageContent(message.content, isMe)}

            {/* Attachments inside bubble */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {message.attachments.map((att) => (
                  <div
                    key={att.id}
                    className={cn(
                      "flex items-center gap-2.5 p-2 rounded-xl text-xs max-w-sm border",
                      isMe 
                        ? "bg-indigo-700/80 border-indigo-500 text-white" 
                        : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      isMe ? "bg-white/20 text-white" : "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
                    )}>
                      <FileText size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{att.name}</p>
                      {att.size && (
                        <p className={cn("text-[10px]", isMe ? "text-indigo-200" : "text-zinc-400")}>
                          {(att.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      )}
                    </div>
                    <a
                      href={att.url}
                      download={att.name}
                      className={cn("p-1 rounded", isMe ? "text-indigo-200 hover:text-white" : "text-zinc-400 hover:text-indigo-600")}
                    >
                      <Download size={14} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reactions List */}
        {message.reactions && message.reactions.length > 0 && (
          <div className={cn(
            "mt-1.5 flex flex-wrap gap-1.5",
            isMe ? "justify-end" : "justify-start"
          )}>
            {message.reactions.map((r, i) => {
              const hasReacted = r.userIds.includes(currentUserId);
              return (
                <button
                  key={i}
                  onClick={() => toggleReaction(message.id, r.emoji)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs transition-all border",
                    hasReacted
                      ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 text-indigo-700 dark:text-indigo-300 font-semibold shadow-sm"
                      : "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200"
                  )}
                >
                  <span>{r.emoji}</span>
                  <span className="text-[11px]">{r.count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Thread replies button */}
        {!isThreadView && message.threadCount && message.threadCount > 0 ? (
          <button
            onClick={() => openThread(message)}
            className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <CornerDownRight size={13} />
            <span>{message.threadCount} {message.threadCount === 1 ? 'reply' : 'replies'}</span>
          </button>
        ) : null}

        {/* Floating Action Menu on Hover (Anchored to Bubble) */}
        <div className={cn(
          "absolute -top-3.5 hidden group-hover:flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-full shadow-lg px-1.5 py-0.5 gap-0.5 z-30 animate-in fade-in zoom-in-95",
          isMe ? "right-10" : "left-10"
        )}>
          {/* Quick Reactions */}
          <div className="flex items-center gap-0.5 pr-1 border-r border-zinc-200 dark:border-zinc-800">
            {['👍', '❤️', '🔥', '🚀'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => toggleReaction(message.id, emoji)}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-xs transition-transform hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Reaction Picker Button */}
          <div className="relative">
            <button
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              title="Add Reaction"
              className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
            >
              <Smile size={13} />
            </button>

            {showReactionPicker && (
              <div className={cn(
                "absolute top-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-2 grid grid-cols-4 gap-1 z-50 animate-in fade-in zoom-in-95 min-w-[140px]",
                isMe ? "right-0" : "left-0"
              )}>
                {COMMON_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      toggleReaction(message.id, emoji);
                      setShowReactionPicker(false);
                    }}
                    className="p-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-center transition-transform hover:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reply in Thread */}
          {!isThreadView && (
            <button
              onClick={() => openThread(message)}
              title="Reply in thread"
              className="p-1 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
            >
              <MessageSquare size={13} />
            </button>
          )}

          {/* Pin Message */}
          <button
            onClick={() => togglePin(message.id)}
            title={message.isPinned ? "Unpin message" : "Pin message"}
            className={cn(
              "p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors",
              message.isPinned ? "text-amber-500" : "text-zinc-400 hover:text-amber-500"
            )}
          >
            <Pin size={13} className={message.isPinned ? "fill-amber-500" : ""} />
          </button>

          {/* Edit & Delete (if owner) */}
          {isOwner && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                title="Edit message"
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
              >
                <Edit3 size={13} />
              </button>
              <button
                onClick={() => deleteMessage(message.id)}
                title="Delete message"
                className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}

          {/* Copy text */}
          <button
            onClick={() => handleCopy(message.content)}
            title="Copy message"
            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
          >
            <Copy size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
