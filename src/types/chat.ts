export type ChannelType = 'public' | 'private' | 'direct' | 'group';

export type UserPresenceStatus = 'online' | 'busy' | 'away' | 'offline' | 'AVAILABLE' | 'AWAY_TWIN' | 'DND_INTERCEPT' | 'NIGHT_SHIFT' | 'OFFLINE';

export interface ChatUserStatus {
  emoji?: string;
  text?: string;
  clearAt?: string;
}

export interface ChatUser {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
  presence: UserPresenceStatus;
  status?: ChatUserStatus;
  lastActiveAt?: string;
}

export interface ChatAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'file' | 'audio' | 'video';
  size?: number;
  mimeType?: string;
  thumbnailUrl?: string;
}

export interface ChatReaction {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRole?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: string;
  threadCount?: number;
  lastReplyAt?: string;
  parentMessageId?: string;
  attachments?: ChatAttachment[];
  reactions?: ChatReaction[];
  readBy?: string[]; // userIds
  isSystem?: boolean;
}

export interface ChatChannel {
  id: string;
  name: string;
  description?: string;
  type: ChannelType;
  topic?: string;
  memberIds: string[];
  members?: ChatUser[];
  unreadCount?: number;
  lastMessage?: {
    id: string;
    senderName: string;
    content: string;
    createdAt: string;
  };
  isFavorite?: boolean;
  isArchived?: boolean;
  createdAt: string;
  createdBy?: string;
  // For DMs: recipient info
  dmRecipient?: ChatUser;
  pinnedMessages?: ChatMessage[];
}

export interface TypingIndicator {
  channelId: string;
  userId: string;
  userName: string;
}
