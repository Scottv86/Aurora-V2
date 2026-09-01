import { API_BASE_URL } from '../config';
import { ChatChannel, ChatMessage, ChatUser, ChatReaction } from '../types/chat';

const CHAT_STORAGE_PREFIX = 'aurora_chat_data_v1';

export class ChatService {
  private static getHeaders(token?: string, tenantId?: string): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (tenantId) {
      headers['x-tenant-id'] = tenantId;
    }
    return headers;
  }

  /**
   * Fetch all channels and direct messages
   */
  static async getChannels(token?: string, tenantId?: string): Promise<ChatChannel[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/channels`, {
        headers: this.getHeaders(token, tenantId),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.channels) {
        localStorage.setItem(`${CHAT_STORAGE_PREFIX}_channels_${tenantId}`, JSON.stringify(data.channels));
        return data.channels;
      }
    } catch (err) {
      console.warn('[ChatService] Fallback to local storage for channels:', err);
    }

    // Local Storage / Fallback seed
    const cached = localStorage.getItem(`${CHAT_STORAGE_PREFIX}_channels_${tenantId}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }

    return this.getInitialChannels(tenantId);
  }

  /**
   * Create a new channel or start a DM
   */
  static async createChannel(
    params: { name: string; description?: string; topic?: string; type: 'public' | 'private' | 'direct'; memberIds?: string[]; dmRecipient?: ChatUser },
    token?: string,
    tenantId?: string
  ): Promise<ChatChannel> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/channels`, {
        method: 'POST',
        headers: this.getHeaders(token, tenantId),
        body: JSON.stringify(params),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.channel) return data.channel;
      }
    } catch (err) {
      console.warn('[ChatService] Error creating channel on server:', err);
    }

    // Local creation fallback
    const newChan: ChatChannel = {
      id: `chan-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: params.name.trim().toLowerCase().replace(/\s+/g, '-'),
      description: params.description || '',
      topic: params.topic || '',
      type: params.type,
      memberIds: params.memberIds || [],
      unreadCount: 0,
      createdAt: new Date().toISOString(),
      dmRecipient: params.dmRecipient
    };

    const channels = await this.getChannels(token, tenantId);
    channels.push(newChan);
    localStorage.setItem(`${CHAT_STORAGE_PREFIX}_channels_${tenantId}`, JSON.stringify(channels));
    return newChan;
  }

  /**
   * Fetch messages for a channel (or thread)
   */
  static async getMessages(channelId: string, parentMessageId?: string, token?: string, tenantId?: string): Promise<ChatMessage[]> {
    try {
      const url = new URL(`${API_BASE_URL}/api/chat/channels/${channelId}/messages`);
      if (parentMessageId) {
        url.searchParams.set('parentMessageId', parentMessageId);
      }
      const res = await fetch(url.toString(), {
        headers: this.getHeaders(token, tenantId),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.messages) {
        return data.messages;
      }
    } catch (err) {
      console.warn('[ChatService] Fallback to local storage for messages:', err);
    }

    const key = `${CHAT_STORAGE_PREFIX}_msgs_${channelId}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const all: ChatMessage[] = JSON.parse(cached);
        if (parentMessageId) {
          return all.filter(m => m.parentMessageId === parentMessageId);
        }
        return all.filter(m => !m.parentMessageId);
      } catch (e) {}
    }

    const defaultMsgs = this.getInitialMessages(channelId);
    localStorage.setItem(key, JSON.stringify(defaultMsgs));
    if (parentMessageId) {
      return defaultMsgs.filter(m => m.parentMessageId === parentMessageId);
    }
    return defaultMsgs.filter(m => !m.parentMessageId);
  }

  /**
   * Send a message
   */
  static async sendMessage(
    channelId: string,
    message: { content: string; attachments?: any[]; parentMessageId?: string; senderId?: string; senderName?: string; senderRole?: string; senderAvatar?: string },
    token?: string,
    tenantId?: string
  ): Promise<ChatMessage> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/channels/${channelId}/messages`, {
        method: 'POST',
        headers: this.getHeaders(token, tenantId),
        body: JSON.stringify(message),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) return data.message;
      }
    } catch (err) {
      console.warn('[ChatService] Error sending message on server:', err);
    }

    // Local fallback
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      channelId,
      senderId: message.senderId || 'current-user',
      senderName: message.senderName || 'You',
      senderRole: message.senderRole || 'Team Member',
      senderAvatar: message.senderAvatar,
      content: message.content,
      attachments: message.attachments || [],
      parentMessageId: message.parentMessageId,
      reactions: [],
      createdAt: new Date().toISOString()
    };

    const key = `${CHAT_STORAGE_PREFIX}_msgs_${channelId}`;
    const cached = localStorage.getItem(key);
    const msgs: ChatMessage[] = cached ? JSON.parse(cached) : [];
    msgs.push(newMsg);
    localStorage.setItem(key, JSON.stringify(msgs));

    return newMsg;
  }

  /**
   * Toggle emoji reaction
   */
  static async toggleReaction(messageId: string, emoji: string, _userId: string, token?: string, tenantId?: string): Promise<ChatReaction[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/messages/${messageId}/react`, {
        method: 'POST',
        headers: this.getHeaders(token, tenantId),
        body: JSON.stringify({ emoji }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reactions) return data.reactions;
      }
    } catch (err) {
      console.warn('[ChatService] Error toggling reaction on server:', err);
    }
    return [];
  }

  /**
   * Toggle pin message
   */
  static async togglePin(messageId: string, token?: string, tenantId?: string): Promise<ChatMessage | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/messages/${messageId}/pin`, {
        method: 'POST',
        headers: this.getHeaders(token, tenantId),
      });
      if (res.ok) {
        const data = await res.json();
        return data.message;
      }
    } catch (err) {
      console.warn('[ChatService] Error toggling pin:', err);
    }
    return null;
  }

  /**
   * Edit message
   */
  static async editMessage(messageId: string, content: string, token?: string, tenantId?: string): Promise<ChatMessage | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/messages/${messageId}`, {
        method: 'PATCH',
        headers: this.getHeaders(token, tenantId),
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.message;
      }
    } catch (err) {
      console.warn('[ChatService] Error editing message:', err);
    }
    return null;
  }

  /**
   * Delete message
   */
  static async deleteMessage(messageId: string, token?: string, tenantId?: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/messages/${messageId}`, {
        method: 'DELETE',
        headers: this.getHeaders(token, tenantId),
      });
      return res.ok;
    } catch (err) {
      console.warn('[ChatService] Error deleting message:', err);
      return false;
    }
  }

  /**
   * Fetch workspace contacts / directory
   */
  static async getUsers(token?: string, tenantId?: string): Promise<ChatUser[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/users`, {
        headers: this.getHeaders(token, tenantId),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.users) return data.users;
      }
    } catch (err) {
      console.warn('[ChatService] Fallback to default user contacts:', err);
    }

    return [
      { id: 'sarah-c', name: 'Sarah Connor', email: 'sarah.c@aurora.io', role: 'Lead Architect', presence: 'online', status: { emoji: '⚡', text: 'Shipping features' } },
      { id: 'david-m', name: 'David Miller', email: 'david.m@aurora.io', role: 'Product Director', presence: 'busy', status: { emoji: '📅', text: 'In quarterly planning' } },
      { id: 'alex-r', name: 'Alex Rivera', email: 'alex.r@aurora.io', role: 'Fullstack Engineer', presence: 'away', status: { emoji: '☕', text: 'Grabbing coffee' } },
      { id: 'sophia-c', name: 'Sophia Chen', email: 'sophia.c@aurora.io', role: 'UI/UX Designer', presence: 'online', status: { emoji: '🎨', text: 'Designing UI tokens' } },
      { id: 'michael-t', name: 'Michael Torres', email: 'michael.t@aurora.io', role: 'DevOps Lead', presence: 'offline' },
      { id: 'emma-w', name: 'Emma Watson', email: 'emma.w@aurora.io', role: 'QA Lead', presence: 'online', status: { emoji: '🔍', text: 'Testing release build' } }
    ];
  }

  /**
   * Update user presence status
   */
  static async updatePresence(status: string, statusEmoji?: string, statusText?: string, token?: string, tenantId?: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/chat/presence`, {
        method: 'POST',
        headers: this.getHeaders(token, tenantId),
        body: JSON.stringify({ status, statusEmoji, statusText }),
      });
    } catch (err) {
      console.warn('[ChatService] Error updating presence:', err);
    }
  }

  // --- Helpers for Initial Seed Data ---
  private static getInitialChannels(tenantId?: string): ChatChannel[] {
    const now = Date.now();
    const t = tenantId || 'default';
    return [
      {
        id: `chan-gen-${t}`,
        name: 'general',
        description: 'Company-wide announcements and general workspace discussions',
        type: 'public',
        topic: 'Welcome to Aurora! Share updates, news, and celebrate wins 🎉',
        memberIds: ['current-user', 'sarah-c', 'david-m', 'alex-r', 'sophia-c'],
        unreadCount: 0,
        isFavorite: true,
        createdAt: new Date(now - 86400000 * 7).toISOString(),
        createdBy: 'system'
      },
      {
        id: `chan-eng-${t}`,
        name: 'engineering',
        description: 'Frontend, backend, architecture, and dev discussions',
        type: 'public',
        topic: 'Aurora v2 release sprint 🚀 | Daily sync 10:00 AM UTC',
        memberIds: ['current-user', 'sarah-c', 'alex-r'],
        unreadCount: 1,
        isFavorite: true,
        createdAt: new Date(now - 86400000 * 5).toISOString(),
        createdBy: 'system'
      },
      {
        id: `chan-design-${t}`,
        name: 'product-design',
        description: 'UI/UX mockups, design tokens, and feedback',
        type: 'public',
        topic: 'Design system tokens & new component library reviews',
        memberIds: ['current-user', 'sophia-c', 'david-m'],
        unreadCount: 0,
        createdAt: new Date(now - 86400000 * 4).toISOString(),
        createdBy: 'system'
      },
      {
        id: `dm-sarah-${t}`,
        name: 'Sarah Connor',
        description: 'Direct Message',
        type: 'direct',
        memberIds: ['current-user', 'sarah-c'],
        unreadCount: 2,
        createdAt: new Date(now - 86400000 * 2).toISOString(),
        dmRecipient: {
          id: 'sarah-c',
          name: 'Sarah Connor',
          email: 'sarah.c@aurora.io',
          role: 'Lead Architect',
          presence: 'online',
          status: { emoji: '⚡', text: 'Shipping features' }
        }
      },
      {
        id: `dm-david-${t}`,
        name: 'David Miller',
        description: 'Direct Message',
        type: 'direct',
        memberIds: ['current-user', 'david-m'],
        unreadCount: 0,
        createdAt: new Date(now - 86400000 * 3).toISOString(),
        dmRecipient: {
          id: 'david-m',
          name: 'David Miller',
          email: 'david.m@aurora.io',
          role: 'Product Director',
          presence: 'busy',
          status: { emoji: '📅', text: 'In quarterly planning' }
        }
      }
    ];
  }

  private static getInitialMessages(channelId: string): ChatMessage[] {
    const now = Date.now();
    if (channelId.includes('eng')) {
      return [
        {
          id: 'msg-eng-1',
          channelId,
          senderId: 'sarah-c',
          senderName: 'Sarah Connor',
          senderRole: 'Lead Architect',
          content: "Here is the snippet for the new WebSockets handler connection middleware:\n\n```typescript\nio.on('connection', (socket) => {\n  socket.on('join_channel', (channelId) => {\n    socket.join(`channel_${channelId}`);\n  });\n});\n```\nLet me know if you have any questions on the event lifecycle!",
          createdAt: new Date(now - 4800000).toISOString(),
          reactions: [
            { emoji: '🔥', count: 2, userIds: ['alex-r', 'current-user'] },
            { emoji: '👍', count: 1, userIds: ['current-user'] }
          ]
        },
        {
          id: 'msg-eng-2',
          channelId,
          senderId: 'alex-r',
          senderName: 'Alex Rivera',
          senderRole: 'Fullstack Engineer',
          content: 'Reviewed and tested locally. Low latency and solid reconnection behavior!',
          createdAt: new Date(now - 1200000).toISOString(),
          reactions: [{ emoji: '🙌', count: 2, userIds: ['sarah-c', 'current-user'] }]
        }
      ];
    }

    if (channelId.includes('sarah')) {
      return [
        {
          id: 'msg-dm1-1',
          channelId,
          senderId: 'sarah-c',
          senderName: 'Sarah Connor',
          senderRole: 'Lead Architect',
          content: 'Hey! Did you get a chance to check the latest platform module builder updates?',
          createdAt: new Date(now - 3000000).toISOString()
        },
        {
          id: 'msg-dm1-2',
          channelId,
          senderId: 'sarah-c',
          senderName: 'Sarah Connor',
          senderRole: 'Lead Architect',
          content: 'Also, let me know if you want to jump on a quick huddle whenever you are free. ☕',
          createdAt: new Date(now - 1800000).toISOString()
        }
      ];
    }

    return [
      {
        id: 'msg-gen-1',
        channelId,
        senderId: 'david-m',
        senderName: 'David Miller',
        senderRole: 'Product Director',
        content: 'Hey team! 👋 Welcome to the updated Aurora platform communication hub. Feel free to start discussions, share updates, and collaborate across all channels.',
        createdAt: new Date(now - 7200000).toISOString(),
        reactions: [
          { emoji: '🎉', count: 4, userIds: ['sarah-c', 'alex-r', 'sophia-c', 'current-user'] },
          { emoji: '🚀', count: 3, userIds: ['sarah-c', 'current-user', 'david-m'] }
        ],
        isPinned: true,
        pinnedBy: 'David Miller',
        pinnedAt: new Date(now - 7100000).toISOString()
      },
      {
        id: 'msg-gen-2',
        channelId,
        senderId: 'sarah-c',
        senderName: 'Sarah Connor',
        senderRole: 'Lead Architect',
        content: 'Super excited for this! The new real-time channels and threads are going to make cross-functional workflows so much smoother.',
        createdAt: new Date(now - 5400000).toISOString(),
        threadCount: 2,
        lastReplyAt: new Date(now - 3600000).toISOString(),
        reactions: [
          { emoji: '💯', count: 2, userIds: ['david-m', 'current-user'] }
        ]
      },
      {
        id: 'msg-gen-3',
        channelId,
        senderId: 'sophia-c',
        senderName: 'Sophia Chen',
        senderRole: 'UI/UX Designer',
        content: 'I uploaded the brand new UI theme kits and asset styles for anyone wanting to inspect our design tokens! 🎨',
        createdAt: new Date(now - 3600000).toISOString(),
        attachments: [
          {
            id: 'att-1',
            name: 'Aurora-Design-Tokens-v2.pdf',
            url: '#',
            type: 'file',
            size: 2450000,
            mimeType: 'application/pdf'
          }
        ],
        reactions: [
          { emoji: '❤️', count: 3, userIds: ['sarah-c', 'david-m', 'current-user'] }
        ]
      }
    ];
  }
}
