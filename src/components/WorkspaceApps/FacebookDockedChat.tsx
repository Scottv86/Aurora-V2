import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Hash,
  Lock,
  Users,
  Minus,
  X,
  Send,
  PanelRight,
  Maximize2,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Search
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { usePlatform } from '../../hooks/usePlatform';
import { ChatService } from '../../services/chatService';
import { ChatChannel, ChatMessage } from '../../types/chat';
import { useAuth } from '../../hooks/useAuth';

interface DockedChatHead {
  channelId: string;
  minimized: boolean;
}

export const FacebookDockedChat: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const {
    tenant,
    removeBottomDockedApp,
    setSideDockedAppId,
    setIsServiceDeskSideDocked,
    setIsCalculatorDocked
  } = usePlatform();
  const token = session?.access_token || (import.meta as any).env.VITE_DEV_TOKEN;

  const {
    channels,
    activeChannel,
    messages: activeChannelMessages,
    unreadTotal,
    sendMessageToChannel,
    setActiveChannel
  } = useChat();

  const [isRosterExpanded, setIsRosterExpanded] = useState(true);
  const [rosterSearch, setRosterSearch] = useState('');
  const [dockedHeads, setDockedHeads] = useState<DockedChatHead[]>(() => {
    try {
      const saved = localStorage.getItem('aurora_chat_bottom_heads');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [headMessages, setHeadMessages] = useState<Record<string, ChatMessage[]>>({});
  const [composerTexts, setComposerTexts] = useState<Record<string, string>>({});
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    try {
      localStorage.setItem('aurora_chat_bottom_heads', JSON.stringify(dockedHeads));
    } catch {}
  }, [dockedHeads]);

  useEffect(() => {
    if (dockedHeads.length === 0) {
      setIsRosterExpanded(true);
    }
  }, [dockedHeads.length]);

  // Sync activeChannel messages into headMessages cache
  useEffect(() => {
    if (activeChannel?.id && activeChannelMessages.length > 0) {
      setHeadMessages((prev) => ({
        ...prev,
        [activeChannel.id]: activeChannelMessages
      }));
    }
  }, [activeChannel?.id, activeChannelMessages]);

  // Load messages for opened chat heads
  useEffect(() => {
    dockedHeads.forEach((h) => {
      if (!headMessages[h.channelId]) {
        ChatService.getMessages(h.channelId, undefined, token || undefined, tenant?.id)
          .then((msgs) => {
            setHeadMessages((prev) => ({ ...prev, [h.channelId]: msgs }));
          })
          .catch(() => {});
      }
    });
  }, [dockedHeads, token, tenant?.id]);

  // Auto-scroll open heads
  useEffect(() => {
    dockedHeads.forEach((h) => {
      const el = scrollRefs.current[h.channelId];
      if (el && !h.minimized) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }, [headMessages, dockedHeads]);

  const openChatHead = (channel: ChatChannel) => {
    setActiveChannel(channel);
    setDockedHeads((prev) => {
      const exists = prev.find((h) => h.channelId === channel.id);
      if (exists) {
        return prev.map((h) => (h.channelId === channel.id ? { ...h, minimized: false } : h));
      }
      return [...prev.slice(-2), { channelId: channel.id, minimized: false }];
    });
    setIsRosterExpanded(false);
  };

  const toggleMinimizeHead = (channelId: string) => {
    setDockedHeads((prev) =>
      prev.map((h) => (h.channelId === channelId ? { ...h, minimized: !h.minimized } : h))
    );
  };

  const closeHead = (channelId: string) => {
    setDockedHeads((prev) => prev.filter((h) => h.channelId !== channelId));
  };

  const handleSendInHead = async (channel: ChatChannel) => {
    const text = (composerTexts[channel.id] || '').trim();
    if (!text) return;
    setComposerTexts((prev) => ({ ...prev, [channel.id]: '' }));
    const sent = await sendMessageToChannel(channel.id, text);
    if (sent) {
      setHeadMessages((prev) => ({
        ...prev,
        [channel.id]: [...(prev[channel.id] || []).filter((m) => m.id !== sent.id), sent]
      }));
    }
  };

  const filteredChannels = channels.filter((c) => {
    const label = c.type === 'direct' ? (c.dmRecipient?.name || c.name) : c.name;
    return label.toLowerCase().includes(rosterSearch.toLowerCase());
  });

  return (
    <div className="flex items-end gap-3 pointer-events-none select-none font-sans">
      {/* 1. Collapsible Chat Heads */}
      {dockedHeads.map((head) => {
        const channel = channels.find((c) => c.id === head.channelId);
        if (!channel) return null;

        const isDirect = channel.type === 'direct';
        const displayName = isDirect ? (channel.dmRecipient?.name || channel.name) : `#${channel.name}`;
        const msgs = headMessages[channel.id] || (activeChannel?.id === channel.id ? activeChannelMessages : []);

        if (head.minimized) {
          return (
            <div
              key={channel.id}
              onClick={() => toggleMinimizeHead(channel.id)}
              className="pointer-events-auto w-56 h-10 rounded-t-xl px-3 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border border-b-0 border-zinc-200 dark:border-zinc-800 shadow-lg flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  {isDirect ? <MessageSquare size={11} /> : <Hash size={11} />}
                </div>
                <span className="text-xs font-semibold truncate">{displayName}</span>
                {channel.unreadCount && channel.unreadCount > 0 ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                ) : null}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeHead(channel.id);
                }}
                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          );
        }

        return (
          <div
            key={channel.id}
            className="pointer-events-auto w-80 h-[440px] rounded-t-xl bg-white dark:bg-zinc-950 border border-b-0 border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden relative"
          >
            {/* Chat Head Header */}
            <div className="px-3 py-2.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div
                onClick={() => toggleMinimizeHead(channel.id)}
                className="flex items-center gap-2 min-w-0 cursor-pointer flex-1"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                  {isDirect ? (
                    displayName.charAt(0).toUpperCase()
                  ) : channel.type === 'private' ? (
                    <Lock size={13} />
                  ) : (
                    <Hash size={13} />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                    {displayName}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                    {channel.topic || (isDirect ? 'Direct Message' : 'Team Channel')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => {
                    setActiveChannel(channel);
                    removeBottomDockedApp('chat');
                    setIsServiceDeskSideDocked(false);
                    setIsCalculatorDocked(false);
                    setSideDockedAppId('chat');
                  }}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-white cursor-pointer"
                  title="Side Mount"
                >
                  <PanelRight size={12} />
                </button>
                <button
                  onClick={() => {
                    removeBottomDockedApp('chat');
                    navigate(`/workspace/apps/chat/${channel.id}`);
                  }}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-white cursor-pointer"
                  title="Open In App"
                >
                  <Maximize2 size={12} />
                </button>
                <button
                  onClick={() => toggleMinimizeHead(channel.id)}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-white cursor-pointer"
                  title="Minimize"
                >
                  <Minus size={12} />
                </button>
                <button
                  onClick={() => closeHead(channel.id)}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-white cursor-pointer"
                  title="Close"
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* Messages Stream */}
            <div
              ref={(el) => {
                scrollRefs.current[channel.id] = el;
              }}
              className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-white dark:bg-zinc-950 select-text custom-scrollbar"
            >
              {msgs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                  No messages yet. Say hello!
                </div>
              ) : (
                msgs.map((m) => (
                  <div key={m.id} className="space-y-0.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] font-bold text-zinc-900 dark:text-white truncate">
                        {m.senderName}
                      </span>
                      <span className="text-[9px] text-zinc-400 shrink-0">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/60 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 break-words">
                      {m.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Compact Composer */}
            <div className="p-2.5 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={composerTexts[channel.id] || ''}
                  onChange={(e) =>
                    setComposerTexts((prev) => ({ ...prev, [channel.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendInHead(channel);
                    }
                  }}
                  placeholder={`Message ${displayName}...`}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() => handleSendInHead(channel)}
                  className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shrink-0"
                >
                  <Send size={12} />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* 2. Rightmost Aurora Chat Bar Trigger & Roster */}
      <div className="pointer-events-auto flex flex-col items-end">
        {isRosterExpanded && (
          <div className="mb-2 w-76 max-h-[420px] rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={15} className="text-emerald-600 dark:text-emerald-400" />
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-white">Aurora Chat</div>
                  <div className="text-[10px] text-zinc-500">{channels.length} conversations</div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    removeBottomDockedApp('chat');
                    setIsServiceDeskSideDocked(false);
                    setIsCalculatorDocked(false);
                    setSideDockedAppId('chat');
                  }}
                  className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"
                  title="Side Mount"
                >
                  <PanelRight size={13} />
                </button>
                <button
                  onClick={() => {
                    removeBottomDockedApp('chat');
                    navigate('/workspace/apps/chat');
                  }}
                  className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"
                  title="Open In App"
                >
                  <Maximize2 size={13} />
                </button>
                <button
                  onClick={() => window.open('/workspace/apps/chat?standalone=true', '_blank', 'noopener,noreferrer')}
                  className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"
                  title="Full Screen New Tab"
                >
                  <ExternalLink size={13} />
                </button>
              </div>
            </div>

            <div className="p-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="Filter channels & DMs..."
                  className="w-full pl-7 pr-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/80 custom-scrollbar">
              {filteredChannels.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400">No conversations found</div>
              ) : (
                filteredChannels.map((ch) => {
                  const isDirect = ch.type === 'direct';
                  const name = isDirect ? (ch.dmRecipient?.name || ch.name) : `#${ch.name}`;
                  return (
                    <div
                      key={ch.id}
                      onClick={() => openChatHead(ch)}
                      className="p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 shrink-0">
                          {isDirect ? (
                            <MessageSquare size={12} />
                          ) : ch.type === 'group' ? (
                            <Users size={12} />
                          ) : ch.type === 'private' ? (
                            <Lock size={12} />
                          ) : (
                            <Hash size={12} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                            {name}
                          </div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                            {ch.lastMessage?.content || ch.topic || (isDirect ? 'Direct Message' : 'Channel')}
                          </div>
                        </div>
                      </div>

                      {ch.unreadCount && ch.unreadCount > 0 ? (
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold shrink-0">
                          {ch.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Bottom Dock Pill Trigger */}
        <div className="h-10 rounded-t-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 flex items-center gap-2.5 shadow-xl border border-b-0 border-emerald-500 cursor-pointer transition-colors">
          <div
            onClick={() => setIsRosterExpanded((prev) => !prev)}
            className="flex items-center gap-2 flex-1"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-200 ring-1 ring-white/40" />
            <MessageSquare size={14} />
            <span className="text-xs font-semibold">Aurora Chat</span>
            {unreadTotal > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-white text-emerald-700 text-[10px] font-bold">
                {unreadTotal}
              </span>
            )}
            {isRosterExpanded ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              removeBottomDockedApp('chat');
            }}
            className="p-1 rounded hover:bg-white/15 text-emerald-100 hover:text-white cursor-pointer"
            title="Close Dock"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};
