import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config';
import { ChatChannel, ChatMessage, ChatUser, ChatReaction, UserPresenceStatus } from '../types/chat';
import { ChatService } from '../services/chatService';
import { useAuth } from '../hooks/useAuth';
import { usePlatform } from '../hooks/usePlatform';
import { useDigitalTwin } from './DigitalTwinContext';
import { toast } from 'sonner';
import { ChatNotificationToast } from '../components/Apps/Chat/ChatNotificationToast';
import { playChatNotificationSound } from '../lib/audioNotification';

interface ChatContextType {
  channels: ChatChannel[];
  activeChannel: ChatChannel | null;
  setActiveChannel: (channel: ChatChannel | null) => void;
  setActiveChannelById: (channelId: string) => void;
  messages: ChatMessage[];
  threadParentMessage: ChatMessage | null;
  threadReplies: ChatMessage[];
  openThread: (message: ChatMessage | null) => void;
  users: ChatUser[];
  userPresence: Record<string, ChatUser>;
  typingUsers: string[]; // for active channel
  unreadTotal: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sendMessage: (content: string, attachments?: any[], parentMessageId?: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  togglePin: (messageId: string) => Promise<void>;
  createChannel: (params: { name: string; description?: string; topic?: string; type: 'public' | 'private' | 'direct'; memberIds?: string[]; dmRecipient?: ChatUser }) => Promise<ChatChannel | null>;
  updateUserStatus: (presence: UserPresenceStatus, emoji?: string, text?: string) => Promise<void>;
  setTyping: (isTyping: boolean) => void;
  isInfoOpen: boolean;
  setIsInfoOpen: (open: boolean) => void;
  isCallingOpen: boolean;
  setIsCallingOpen: (open: boolean) => void;
  isLoading: boolean;
  isMessagesLoading: boolean;
  refreshChannels: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const { tenant, user: platformUser } = usePlatform();
  const { presenceStatus } = useDigitalTwin();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadParentMessage, setThreadParentMessage] = useState<ChatMessage | null>(null);
  const [threadReplies, setThreadReplies] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [userPresence, setUserPresence] = useState<Record<string, ChatUser>>({});
  const [typingMap, setTypingMap] = useState<Record<string, { [userId: string]: string }>>({}); // channelId -> { userId: userName }
  const [searchQuery, setSearchQuery] = useState('');
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isCallingOpen, setIsCallingOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(true);

  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelsRef = useRef<ChatChannel[]>([]);
  channelsRef.current = channels;
  const usersRef = useRef<ChatUser[]>([]);
  usersRef.current = users;
  const activeChannelRef = useRef<ChatChannel | null>(null);
  activeChannelRef.current = activeChannel;

  const currentUserId = user?.id || platformUser?.id || platformUser?.memberId || 'current-user';

  const platformName = platformUser?.firstName && (platformUser?.lastName || platformUser?.familyName)
    ? `${platformUser.firstName} ${platformUser.lastName || platformUser.familyName}`
    : (platformUser?.name || platformUser?.firstName || platformUser?.lastName || platformUser?.familyName);

  const currentUserName = platformName || (user?.user_metadata as any)?.full_name || (user?.user_metadata as any)?.name || user?.email?.split('@')[0] || 'User';
  const currentUserAvatar = platformUser?.avatarUrl || platformUser?.avatar_url || (user?.user_metadata as any)?.avatar_url || (user?.user_metadata as any)?.picture;
  const currentUserRole = platformUser?.position?.title || platformUser?.position || platformUser?.role || (user as any)?.role || (user?.email === 'superadmin@aurora.com' ? 'Workspace Admin' : 'Team Member');

  // 1. Initial load for channels and user directory
  const loadChannelsAndUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedChannels, fetchedUsers] = await Promise.all([
        ChatService.getChannels(token || undefined, tenant?.id),
        ChatService.getUsers(token || undefined, tenant?.id)
      ]);
      setChannels(fetchedChannels);
      setUsers(fetchedUsers);

      const pMap: Record<string, ChatUser> = {};
      fetchedUsers.forEach(u => {
        pMap[u.id] = u;
      });
      setUserPresence(pMap);

      // Default active channel to general if not selected
      if (!activeChannel && fetchedChannels.length > 0) {
        const general = fetchedChannels.find(c => c.name === 'general') || fetchedChannels[0];
        setActiveChannel(general);
      }
    } catch (err) {
      console.error('[ChatContext] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token, tenant?.id, activeChannel]);

  useEffect(() => {
    loadChannelsAndUsers();
  }, [loadChannelsAndUsers]);

  // Sync global Digital Twin presence to Chat Presence and WebSockets
  useEffect(() => {
    if (!presenceStatus || !tenant?.id) return;
    
    // Update local presence map for current user
    setUserPresence(prev => ({
      ...prev,
      [currentUserId]: {
        ...(prev[currentUserId] || { id: currentUserId, name: currentUserName, presence: 'AVAILABLE' }),
        presence: presenceStatus as any
      }
    }));

    // Broadcast updated global presence to backend/tenant
    if (token) {
      ChatService.updatePresence(presenceStatus as any, undefined, undefined, token, tenant?.id).catch(() => {});
    }
  }, [presenceStatus, currentUserId, currentUserName, tenant?.id, token]);

  // 2. Load messages when active channel changes
  const loadChannelMessages = useCallback(async (channelId: string) => {
    setIsMessagesLoading(true);
    try {
      const msgs = await ChatService.getMessages(channelId, undefined, token || undefined, tenant?.id);
      setMessages(msgs);
    } catch (err) {
      console.error('[ChatContext] Error loading messages:', err);
    } finally {
      setIsMessagesLoading(false);
    }
  }, [token, tenant?.id]);

  useEffect(() => {
    if (activeChannel?.id) {
      loadChannelMessages(activeChannel.id);
      // Reset thread when channel changes
      setThreadParentMessage(null);
      setThreadReplies([]);
      
      // Clear unread count for active channel
      setChannels(prev => prev.map(c => c.id === activeChannel.id ? { ...c, unreadCount: 0 } : c));
    }
  }, [activeChannel?.id, loadChannelMessages]);

  // 3. Load thread replies when thread opens
  useEffect(() => {
    if (activeChannel?.id && threadParentMessage?.id) {
      ChatService.getMessages(activeChannel.id, threadParentMessage.id, token || undefined, tenant?.id)
        .then(replies => setThreadReplies(replies))
        .catch(console.error);
    } else {
      setThreadReplies([]);
    }
  }, [activeChannel?.id, threadParentMessage?.id, token, tenant?.id]);

  // 4. WebSocket setup
  useEffect(() => {
    const socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (tenant?.id) {
        socket.emit('join_tenant', tenant.id);
      }
      if (activeChannel?.id) {
        socket.emit('join_channel', activeChannel.id);
      }
    });

    // Real-time new message
    socket.on('chat:message', (newMsg: ChatMessage) => {
      const isFromMe = newMsg.senderId === currentUserId;
      const isCurrentActive = activeChannelRef.current?.id === newMsg.channelId;

      // Play sound and show toast notification if message is from another user
      if (!isFromMe) {
        playChatNotificationSound();

        // If user is not currently viewing this channel, show rich toast notification
        if (!isCurrentActive) {
          const targetChannel = channelsRef.current.find(c => c.id === newMsg.channelId);
          const channelName = targetChannel?.name || 'Chat';
          const channelType = targetChannel?.type || 'public';
          const senderAvatar = newMsg.senderAvatar || usersRef.current.find(u => u.id === newMsg.senderId)?.avatarUrl;

          toast.custom((t) => (
            <ChatNotificationToast
              toastId={t}
              payload={{
                messageId: newMsg.id,
                channelId: newMsg.channelId,
                channelName,
                channelType,
                senderId: newMsg.senderId,
                senderName: newMsg.senderName,
                senderAvatar,
                senderRole: newMsg.senderRole,
                content: newMsg.content,
                hasAttachments: newMsg.attachments && newMsg.attachments.length > 0
              }}
              onOpenChannel={(cId) => {
                const found = channelsRef.current.find(c => c.id === cId);
                if (found) setActiveChannel(found);
              }}
              onMarkRead={(cId) => {
                setChannels(prev => prev.map(c => c.id === cId ? { ...c, unreadCount: 0 } : c));
              }}
            />
          ), { duration: 6000 });
        }
      }

      // Check if message belongs to active channel
      if (activeChannelRef.current && newMsg.channelId === activeChannelRef.current.id) {
        if (newMsg.parentMessageId) {
          // Thread reply
          setThreadReplies(prev => [...prev.filter(m => m.id !== newMsg.id), newMsg]);
          setMessages(prev => prev.map(m => m.id === newMsg.parentMessageId ? {
            ...m,
            threadCount: (m.threadCount || 0) + 1,
            lastReplyAt: newMsg.createdAt
          } : m));
        } else {
          // Main channel message
          setMessages(prev => [...prev.filter(m => m.id !== newMsg.id), newMsg]);
        }
      } else {
        // Increment unread count for other channel
        setChannels(prev => prev.map(c => c.id === newMsg.channelId ? {
          ...c,
          unreadCount: (c.unreadCount || 0) + 1,
          lastMessage: {
            id: newMsg.id,
            senderName: newMsg.senderName,
            content: newMsg.content,
            createdAt: newMsg.createdAt
          }
        } : c));
      }
    });

    // Message reactions
    socket.on('chat:reaction_updated', (data: { messageId: string; channelId: string; reactions: ChatReaction[] }) => {
      setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, reactions: data.reactions } : m));
      setThreadReplies(prev => prev.map(m => m.id === data.messageId ? { ...m, reactions: data.reactions } : m));
      if (threadParentMessage?.id === data.messageId) {
        setThreadParentMessage(prev => prev ? { ...prev, reactions: data.reactions } : null);
      }
    });

    // Message updated (edited / pinned)
    socket.on('chat:message_updated', (updatedMsg: ChatMessage) => {
      setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
      setThreadReplies(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
      if (threadParentMessage?.id === updatedMsg.id) {
        setThreadParentMessage(updatedMsg);
      }
    });

    // Message deleted
    socket.on('chat:message_deleted', (data: { messageId: string; channelId: string }) => {
      setMessages(prev => prev.filter(m => m.id !== data.messageId));
      setThreadReplies(prev => prev.filter(m => m.id !== data.messageId));
      if (threadParentMessage?.id === data.messageId) {
        setThreadParentMessage(null);
      }
    });

    // Channel created
    socket.on('chat:channel_created', (newChan: ChatChannel) => {
      setChannels(prev => {
        if (prev.some(c => c.id === newChan.id)) return prev;
        return [...prev, newChan];
      });
    });

    // User typing
    socket.on('chat:user_typing', (data: { channelId: string; userId: string; userName: string; isTyping: boolean }) => {
      if (data.userId === currentUserId) return;
      setTypingMap(prev => {
        const channelTypers = { ...(prev[data.channelId] || {}) };
        if (data.isTyping) {
          channelTypers[data.userId] = data.userName;
        } else {
          delete channelTypers[data.userId];
        }
        return { ...prev, [data.channelId]: channelTypers };
      });
    });

    // Presence update
    socket.on('chat:presence_updated', (data: { userId: string; status: any; statusEmoji?: string; statusText?: string }) => {
      setUserPresence(prev => {
        const existing = prev[data.userId];
        if (!existing) return prev;
        return {
          ...prev,
          [data.userId]: {
            ...existing,
            presence: data.status,
            status: {
              emoji: data.statusEmoji,
              text: data.statusText
            }
          }
        };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [token, tenant?.id, activeChannel, currentUserId, threadParentMessage?.id]);

  // Set active channel by id
  const setActiveChannelById = useCallback((channelId: string) => {
    const found = channels.find(c => c.id === channelId);
    if (found) {
      setActiveChannel(found);
    }
  }, [channels]);

  // Open thread
  const openThread = useCallback((msg: ChatMessage | null) => {
    setThreadParentMessage(msg);
  }, []);

  // Send message
  const sendMessage = useCallback(async (content: string, attachments: any[] = [], parentMessageId?: string) => {
    if (!activeChannel) return;

    // Optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      channelId: activeChannel.id,
      senderId: currentUserId,
      senderName: currentUserName,
      senderRole: currentUserRole,
      senderAvatar: currentUserAvatar,
      content,
      attachments,
      parentMessageId,
      reactions: [],
      createdAt: new Date().toISOString()
    };

    if (parentMessageId) {
      setThreadReplies(prev => [...prev, optimisticMsg]);
      setMessages(prev => prev.map(m => m.id === parentMessageId ? {
        ...m,
        threadCount: (m.threadCount || 0) + 1,
        lastReplyAt: optimisticMsg.createdAt
      } : m));
    } else {
      setMessages(prev => [...prev, optimisticMsg]);
    }

    try {
      const realMsg = await ChatService.sendMessage(
        activeChannel.id,
        {
          content,
          attachments,
          parentMessageId,
          senderId: currentUserId,
          senderName: currentUserName,
          senderRole: currentUserRole,
          senderAvatar: currentUserAvatar
        },
        token || undefined,
        tenant?.id
      );

      // Replace optimistic message with server real message
      if (parentMessageId) {
        setThreadReplies(prev => prev.map(m => m.id === tempId ? realMsg : m));
      } else {
        setMessages(prev => prev.map(m => m.id === tempId ? realMsg : m));
      }
    } catch (err) {
      console.error('[ChatContext] Failed to send message:', err);
      toast.error('Failed to send message');
    }
  }, [activeChannel, currentUserId, currentUserName, currentUserRole, currentUserAvatar, token, tenant?.id]);

  // Edit message
  const editMessage = useCallback(async (messageId: string, content: string) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content, isEdited: true } : m));
    setThreadReplies(prev => prev.map(m => m.id === messageId ? { ...m, content, isEdited: true } : m));
    await ChatService.editMessage(messageId, content, token || undefined, tenant?.id);
  }, [token, tenant?.id]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
    setThreadReplies(prev => prev.filter(m => m.id !== messageId));
    if (threadParentMessage?.id === messageId) {
      setThreadParentMessage(null);
    }
    await ChatService.deleteMessage(messageId, token || undefined, tenant?.id);
    toast.success('Message deleted');
  }, [threadParentMessage?.id, token, tenant?.id]);

  // Toggle reaction
  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    // Optimistic reaction update
    const updateMsgReactions = (m: ChatMessage) => {
      if (m.id !== messageId) return m;
      const reactions = [...(m.reactions || [])];
      const existing = reactions.find(r => r.emoji === emoji);
      if (existing) {
        if (existing.userIds.includes(currentUserId)) {
          existing.userIds = existing.userIds.filter(id => id !== currentUserId);
          existing.count = existing.userIds.length;
        } else {
          existing.userIds.push(currentUserId);
          existing.count = existing.userIds.length;
        }
      } else {
        reactions.push({ emoji, count: 1, userIds: [currentUserId] });
      }
      return { ...m, reactions: reactions.filter(r => r.count > 0) };
    };

    setMessages(prev => prev.map(updateMsgReactions));
    setThreadReplies(prev => prev.map(updateMsgReactions));
    if (threadParentMessage?.id === messageId) {
      setThreadParentMessage(prev => prev ? updateMsgReactions(prev) : null);
    }

    await ChatService.toggleReaction(messageId, emoji, currentUserId, token || undefined, tenant?.id);
  }, [currentUserId, threadParentMessage?.id, token, tenant?.id]);

  // Toggle pin
  const togglePin = useCallback(async (messageId: string) => {
    const target = messages.find(m => m.id === messageId);
    const newPinned = !target?.isPinned;

    setMessages(prev => prev.map(m => m.id === messageId ? {
      ...m,
      isPinned: newPinned,
      pinnedBy: newPinned ? currentUserName : undefined,
      pinnedAt: newPinned ? new Date().toISOString() : undefined
    } : m));

    await ChatService.togglePin(messageId, token || undefined, tenant?.id);
    toast.success(newPinned ? 'Message pinned to channel' : 'Message unpinned');
  }, [messages, currentUserName, token, tenant?.id]);

  // Create channel / DM
  const createChannel = useCallback(async (params: {
    name: string;
    description?: string;
    topic?: string;
    type: 'public' | 'private' | 'direct';
    memberIds?: string[];
    dmRecipient?: ChatUser;
  }) => {
    try {
      const created = await ChatService.createChannel(params, token || undefined, tenant?.id);
      setChannels(prev => [...prev, created]);
      setActiveChannel(created);
      toast.success(params.type === 'direct' ? 'Direct message started' : `Channel #${created.name} created!`);
      return created;
    } catch (err) {
      toast.error('Failed to create channel');
      return null;
    }
  }, [token, tenant?.id]);

  // User presence & status
  const updateUserStatus = useCallback(async (presence: 'online' | 'busy' | 'away' | 'offline', emoji?: string, text?: string) => {
    await ChatService.updatePresence(presence, emoji, text, token || undefined, tenant?.id);
    toast.success('Status updated');
  }, [token, tenant?.id]);

  // Typing indicator
  const setTyping = useCallback((isTyping: boolean) => {
    if (!socketRef.current || !activeChannel || !tenant?.id) return;

    socketRef.current.emit('chat:typing', {
      tenantId: tenant.id,
      channelId: activeChannel.id,
      userId: currentUserId,
      userName: currentUserName,
      isTyping
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('chat:typing', {
          tenantId: tenant.id,
          channelId: activeChannel.id,
          userId: currentUserId,
          userName: currentUserName,
          isTyping: false
        });
      }, 3000);
    }
  }, [activeChannel, currentUserId, currentUserName, tenant?.id]);

  // Active channel typing users
  const typingUsers = useMemo(() => {
    if (!activeChannel) return [];
    const map = typingMap[activeChannel.id] || {};
    return Object.values(map);
  }, [activeChannel, typingMap]);

  // Total unread count across all channels
  const unreadTotal = useMemo(() => {
    return channels.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }, [channels]);

  return (
    <ChatContext.Provider
      value={{
        channels,
        activeChannel,
        setActiveChannel,
        setActiveChannelById,
        messages,
        threadParentMessage,
        threadReplies,
        openThread,
        users,
        userPresence,
        typingUsers,
        unreadTotal,
        searchQuery,
        setSearchQuery,
        sendMessage,
        editMessage,
        deleteMessage,
        toggleReaction,
        togglePin,
        createChannel,
        updateUserStatus,
        setTyping,
        isInfoOpen,
        setIsInfoOpen,
        isCallingOpen,
        setIsCallingOpen,
        isLoading,
        isMessagesLoading,
        refreshChannels: loadChannelsAndUsers
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
