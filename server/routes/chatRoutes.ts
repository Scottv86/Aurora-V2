import express from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { requireTenantAccess } from '../middleware/tenantMiddleware';
import { globalPrisma } from '../lib/prisma';
import { io } from '../socket';

const router = express.Router();

// Apply auth & tenant middleware
router.use(authenticate);
router.use(requireTenantAccess);

/**
 * Seed initial channels for a tenant if none exist in the database
 */
async function seedDefaultChannelsIfEmpty(tenantId: string, currentUserId: string, currentUserName: string) {
  const existingCount = await globalPrisma.chatChannel.count({
    where: { tenantId }
  });

  if (existingCount === 0) {
    console.log(`[Chat DB] Seeding default channels for tenant: ${tenantId}`);

    // 1. General Channel
    const genChannel = await globalPrisma.chatChannel.create({
      data: {
        tenantId,
        name: 'general',
        description: 'Company-wide announcements and general workspace discussions',
        topic: 'Welcome to Aurora! Share updates, news, and celebrate wins 🎉',
        type: 'public',
        isFavorite: true,
        createdBy: currentUserId,
        members: {
          create: [{ userId: currentUserId, role: 'admin' }]
        },
        messages: {
          create: [
            {
              tenantId,
              senderId: 'david-m',
              senderName: 'David Miller',
              senderRole: 'Product Director',
              content: 'Hey team! 👋 Welcome to the official Aurora real-time communication platform. All conversations, threads, and attachments are fully persistent in the database.',
              isPinned: true,
              pinnedBy: 'David Miller',
              pinnedAt: new Date(),
              reactions: {
                create: [
                  { userId: currentUserId, emoji: '🎉' },
                  { userId: 'david-m', emoji: '🚀' }
                ]
              }
            },
            {
              tenantId,
              senderId: 'sarah-c',
              senderName: 'Sarah Connor',
              senderRole: 'Lead Architect',
              content: 'The database synchronization is live and fully transactional. Great job team!',
              reactions: {
                create: [
                  { userId: currentUserId, emoji: '💯' }
                ]
              }
            }
          ]
        }
      }
    });

    // 2. Engineering Channel
    await globalPrisma.chatChannel.create({
      data: {
        tenantId,
        name: 'engineering',
        description: 'Frontend, backend, architecture, and dev discussions',
        topic: 'Aurora v2 sprint 🚀 | Daily sync 10:00 AM UTC',
        type: 'public',
        isFavorite: true,
        createdBy: currentUserId,
        members: {
          create: [{ userId: currentUserId, role: 'admin' }]
        },
        messages: {
          create: [
            {
              tenantId,
              senderId: 'sarah-c',
              senderName: 'Sarah Connor',
              senderRole: 'Lead Architect',
              content: "Here is the snippet for the PostgreSQL real-time socket events:\n\n```typescript\nio.on('connection', (socket) => {\n  socket.on('join_channel', (channelId) => {\n    socket.join(`channel_${channelId}`);\n  });\n});\n```\nAll data is stored directly in PostgreSQL with foreign keys and cascade rules.",
              reactions: {
                create: [
                  { userId: currentUserId, emoji: '🔥' }
                ]
              }
            }
          ]
        }
      }
    });

    // 3. Product Design Channel
    await globalPrisma.chatChannel.create({
      data: {
        tenantId,
        name: 'product-design',
        description: 'UI/UX mockups, design tokens, and feedback',
        topic: 'Design system tokens & component reviews',
        type: 'public',
        createdBy: currentUserId,
        members: {
          create: [{ userId: currentUserId, role: 'admin' }]
        },
        messages: {
          create: [
            {
              tenantId,
              senderId: 'sophia-c',
              senderName: 'Sophia Chen',
              senderRole: 'UI/UX Designer',
              content: 'Dark mode tokens and contrast refinements have been synced to the design system.',
              reactions: {
                create: [
                  { userId: currentUserId, emoji: '🎨' }
                ]
              }
            }
          ]
        }
      }
    });

    // 4. Sample Direct Message
    await globalPrisma.chatChannel.create({
      data: {
        tenantId,
        name: 'Sarah Connor',
        description: 'Direct Message',
        type: 'direct',
        createdBy: currentUserId,
        metadata: {
          dmRecipient: {
            id: 'sarah-c',
            name: 'Sarah Connor',
            email: 'sarah.c@aurora.io',
            role: 'Lead Architect',
            presence: 'online',
            status: { emoji: '⚡', text: 'Shipping features' }
          }
        },
        members: {
          create: [
            { userId: currentUserId, role: 'member' },
            { userId: 'sarah-c', role: 'member' }
          ]
        },
        messages: {
          create: [
            {
              tenantId,
              senderId: 'sarah-c',
              senderName: 'Sarah Connor',
              senderRole: 'Lead Architect',
              content: 'Hey! The database-backed chat is running smoothly. Let me know if you want to jump on a quick huddle.'
            }
          ]
        }
      }
    });
  }
}

// 1. Get all channels & DMs for tenant (PostgreSQL Prisma Query)
router.get('/channels', async (req: any, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.user?.id || 'current-user';
    const userName = req.user?.email?.split('@')[0] || 'User';

    // Seed default channels if this tenant has none
    await seedDefaultChannelsIfEmpty(tenantId, userId, userName);

    const channels = await globalPrisma.chatChannel.findMany({
      where: {
        tenantId,
        isArchived: false,
        OR: [
          { type: 'public' },
          { members: { some: { userId } } },
          { createdBy: userId }
        ]
      },
      include: {
        members: true,
        messages: {
          where: { parentMessageId: null },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: [
        { isFavorite: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    // Fetch user presences
    const presences = await globalPrisma.chatUserPresence.findMany({
      where: { tenantId }
    });
    const presenceMap = new Map(presences.map(p => [p.userId, p]));

    const formatted = channels.map(chan => {
      const lastMsg = chan.messages[0];
      const meta = chan.metadata as any;
      let dmRecipient = meta?.dmRecipient;

      if (chan.type === 'direct' && dmRecipient) {
        const pres = presenceMap.get(dmRecipient.id);
        if (pres) {
          dmRecipient = {
            ...dmRecipient,
            presence: pres.presence,
            status: {
              emoji: pres.statusEmoji,
              text: pres.statusText
            }
          };
        }
      }

      return {
        id: chan.id,
        name: chan.name,
        description: chan.description,
        topic: chan.topic,
        type: chan.type,
        isFavorite: chan.isFavorite,
        isArchived: chan.isArchived,
        memberIds: chan.members.map(m => m.userId),
        unreadCount: 0,
        createdAt: chan.createdAt.toISOString(),
        createdBy: chan.createdBy,
        dmRecipient,
        lastMessage: lastMsg ? {
          id: lastMsg.id,
          senderName: lastMsg.senderName,
          content: lastMsg.content,
          createdAt: lastMsg.createdAt.toISOString()
        } : undefined
      };
    });

    res.json({ success: true, channels: formatted });
  } catch (err: any) {
    console.error('[Chat API] Error listing channels from DB:', err);
    res.status(500).json({ error: 'Failed to fetch chat channels from database' });
  }
});

// 2. Create channel or direct message in PostgreSQL
router.post('/channels', async (req: any, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.user?.id || 'current-user';
    const userName = req.user?.email?.split('@')[0] || 'User';
    const { name, description, topic, type, memberIds = [], dmRecipient } = req.body;

    const formattedName = type === 'public' || type === 'private'
      ? name.trim().toLowerCase().replace(/\s+/g, '-')
      : name.trim();
    const allMembers = Array.from(new Set([userId, ...memberIds]));

    const newChannel = await globalPrisma.chatChannel.create({
      data: {
        tenantId,
        name: formattedName,
        description: description || null,
        topic: topic || null,
        type: type || 'public',
        createdBy: userId,
        metadata: dmRecipient ? { dmRecipient } : undefined,
        members: {
          create: allMembers.map(mId => ({
            userId: mId,
            role: mId === userId ? 'admin' : 'member'
          }))
        },
        messages: {
          create: [
            {
              tenantId,
              senderId: 'system',
              senderName: 'System',
              content: type === 'direct'
                ? `Direct conversation started with ${dmRecipient?.name || name}`
                : type === 'group'
                ? `Group conversation started with ${formattedName}`
                : `${userName} created channel #${formattedName}`,
              isSystem: true
            }
          ]
        }
      },
      include: {
        members: true
      }
    });

    const responseChannel = {
      id: newChannel.id,
      name: newChannel.name,
      description: newChannel.description,
      topic: newChannel.topic,
      type: newChannel.type,
      isFavorite: newChannel.isFavorite,
      memberIds: newChannel.members.map(m => m.userId),
      unreadCount: 0,
      createdAt: newChannel.createdAt.toISOString(),
      createdBy: newChannel.createdBy,
      dmRecipient
    };

    if (io) {
      io.to(`tenant_${tenantId}`).emit('chat:channel_created', responseChannel);
    }

    res.json({ success: true, channel: responseChannel });
  } catch (err: any) {
    console.error('[Chat API] Error creating channel in DB:', err);
    res.status(500).json({ error: 'Failed to create channel in database' });
  }
});

// 3. Get messages for a channel (or thread) from PostgreSQL
router.get('/channels/:channelId/messages', async (req: any, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { channelId } = req.params;
    const { parentMessageId } = req.query;

    const messages = await globalPrisma.chatMessage.findMany({
      where: {
        channelId,
        tenantId,
        parentMessageId: parentMessageId ? (parentMessageId as string) : null
      },
      include: {
        attachments: true,
        reactions: true
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: 100
    });

    // Aggregate reactions per emoji
    const formatted = messages.map(msg => {
      const reactionMap = new Map<string, { emoji: string; count: number; userIds: string[] }>();
      msg.reactions.forEach(r => {
        if (!reactionMap.has(r.emoji)) {
          reactionMap.set(r.emoji, { emoji: r.emoji, count: 0, userIds: [] });
        }
        const item = reactionMap.get(r.emoji)!;
        item.count += 1;
        item.userIds.push(r.userId);
      });

      return {
        id: msg.id,
        channelId: msg.channelId,
        senderId: msg.senderId,
        senderName: msg.senderName,
        senderRole: msg.senderRole || undefined,
        senderAvatar: msg.senderAvatar || undefined,
        content: msg.content,
        isEdited: msg.isEdited,
        isPinned: msg.isPinned,
        pinnedBy: msg.pinnedBy || undefined,
        pinnedAt: msg.pinnedAt?.toISOString(),
        isSystem: msg.isSystem,
        parentMessageId: msg.parentMessageId || undefined,
        threadCount: msg.threadCount,
        lastReplyAt: msg.lastReplyAt?.toISOString(),
        attachments: msg.attachments.map(att => ({
          id: att.id,
          name: att.name,
          url: att.url,
          type: att.type as any,
          size: att.size,
          mimeType: att.mimeType || undefined
        })),
        reactions: Array.from(reactionMap.values()),
        createdAt: msg.createdAt.toISOString()
      };
    });

    res.json({ success: true, messages: formatted });
  } catch (err: any) {
    console.error('[Chat API] Error fetching messages from DB:', err);
    res.status(500).json({ error: 'Failed to fetch messages from database' });
  }
});

// 4. Send message to PostgreSQL
router.post('/channels/:channelId/messages', async (req: any, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { channelId } = req.params;
    const userId = req.user?.id || 'current-user';
    const userName = req.user?.email?.split('@')[0] || 'User';
    const { content, attachments = [], parentMessageId, senderName, senderRole, senderAvatar } = req.body;

    if (!content && attachments.length === 0) {
      return res.status(400).json({ error: 'Message content or attachment is required' });
    }

    // Try to resolve member profile details from tenantMember table if available
    let resolvedName = senderName || userName;
    let resolvedAvatar = senderAvatar || null;
    let resolvedRole = senderRole || userRole;

    try {
      const member = await globalPrisma.tenantMember.findFirst({
        where: { tenantId, userId },
        include: { position: true }
      });
      if (member) {
        const fullMemberName = [member.firstName, member.familyName].filter(Boolean).join(' ');
        if (fullMemberName && !senderName) resolvedName = fullMemberName;
        if (member.avatarUrl && !senderAvatar) resolvedAvatar = member.avatarUrl;
        if (member.position?.title && !senderRole) resolvedRole = member.position.title;
      }
    } catch (e) {}

    const createdMsg = await globalPrisma.$transaction(async (tx) => {
      const msg = await tx.chatMessage.create({
        data: {
          channelId,
          tenantId,
          senderId: userId,
          senderName: resolvedName,
          senderRole: resolvedRole,
          senderAvatar: resolvedAvatar,
          content: content || '',
          parentMessageId: parentMessageId || null,
          attachments: {
            create: attachments.map((att: any) => ({
              name: att.name,
              url: att.url,
              type: att.type || 'file',
              size: att.size || 0,
              mimeType: att.mimeType || null
            }))
          }
        },
        include: {
          attachments: true,
          reactions: true
        }
      });

      // Update parent thread count if this is a thread reply
      if (parentMessageId) {
        await tx.chatMessage.update({
          where: { id: parentMessageId },
          data: {
            threadCount: { increment: 1 },
            lastReplyAt: new Date()
          }
        });
      }

      // Touch channel updatedAt
      await tx.chatChannel.update({
        where: { id: channelId },
        data: { updatedAt: new Date() }
      });

      return msg;
    });

    const responseMsg = {
      id: createdMsg.id,
      channelId: createdMsg.channelId,
      senderId: createdMsg.senderId,
      senderName: createdMsg.senderName,
      senderRole: createdMsg.senderRole || undefined,
      senderAvatar: createdMsg.senderAvatar || undefined,
      content: createdMsg.content,
      isEdited: createdMsg.isEdited,
      isPinned: createdMsg.isPinned,
      parentMessageId: createdMsg.parentMessageId || undefined,
      threadCount: createdMsg.threadCount,
      attachments: createdMsg.attachments.map(a => ({
        id: a.id,
        name: a.name,
        url: a.url,
        type: a.type as any,
        size: a.size,
        mimeType: a.mimeType || undefined
      })),
      reactions: [],
      createdAt: createdMsg.createdAt.toISOString()
    };

    // Broadcast real-time message via socket.io
    if (io) {
      io.to(`tenant_${tenantId}`).emit('chat:message', responseMsg);
    }

    res.json({ success: true, message: responseMsg });
  } catch (err: any) {
    console.error('[Chat API] Error sending message to DB:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// 5. Toggle emoji reaction in PostgreSQL
router.post('/messages/:messageId/react', async (req: any, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user?.id || 'current-user';

    const existing = await globalPrisma.chatMessageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji
        }
      }
    });

    if (existing) {
      await globalPrisma.chatMessageReaction.delete({
        where: { id: existing.id }
      });
    } else {
      await globalPrisma.chatMessageReaction.create({
        data: {
          messageId,
          userId,
          emoji
        }
      });
    }

    // Get aggregated reactions for message
    const allReactions = await globalPrisma.chatMessageReaction.findMany({
      where: { messageId }
    });

    const reactionMap = new Map<string, { emoji: string; count: number; userIds: string[] }>();
    allReactions.forEach(r => {
      if (!reactionMap.has(r.emoji)) {
        reactionMap.set(r.emoji, { emoji: r.emoji, count: 0, userIds: [] });
      }
      const item = reactionMap.get(r.emoji)!;
      item.count += 1;
      item.userIds.push(r.userId);
    });

    const aggregated = Array.from(reactionMap.values());

    const targetMsg = await globalPrisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { channelId: true }
    });

    if (io && targetMsg) {
      io.to(`tenant_${tenantId}`).emit('chat:reaction_updated', {
        messageId,
        channelId: targetMsg.channelId,
        reactions: aggregated
      });
    }

    res.json({ success: true, reactions: aggregated });
  } catch (err: any) {
    console.error('[Chat API] Error toggling reaction in DB:', err);
    res.status(500).json({ error: 'Failed to update reaction' });
  }
});

// 6. Toggle pin in PostgreSQL
router.post('/messages/:messageId/pin', async (req: any, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { messageId } = req.params;
    const userName = req.user?.email?.split('@')[0] || 'User';

    const currentMsg = await globalPrisma.chatMessage.findUnique({
      where: { id: messageId }
    });

    if (!currentMsg) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const updated = await globalPrisma.chatMessage.update({
      where: { id: messageId },
      data: {
        isPinned: !currentMsg.isPinned,
        pinnedBy: !currentMsg.isPinned ? userName : null,
        pinnedAt: !currentMsg.isPinned ? new Date() : null
      }
    });

    if (io) {
      io.to(`tenant_${tenantId}`).emit('chat:message_updated', {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        pinnedAt: updated.pinnedAt?.toISOString()
      });
    }

    res.json({ success: true, message: updated });
  } catch (err: any) {
    console.error('[Chat API] Error pinning message in DB:', err);
    res.status(500).json({ error: 'Failed to update pin' });
  }
});

// 7. Edit message in PostgreSQL
router.patch('/messages/:messageId', async (req: any, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { messageId } = req.params;
    const { content } = req.body;

    const updated = await globalPrisma.chatMessage.update({
      where: { id: messageId },
      data: {
        content,
        isEdited: true,
        updatedAt: new Date()
      }
    });

    if (io) {
      io.to(`tenant_${tenantId}`).emit('chat:message_updated', {
        ...updated,
        createdAt: updated.createdAt.toISOString()
      });
    }

    res.json({ success: true, message: updated });
  } catch (err: any) {
    console.error('[Chat API] Error editing message in DB:', err);
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

// 8. Delete message from PostgreSQL
router.delete('/messages/:messageId', async (req: any, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { messageId } = req.params;

    const msg = await globalPrisma.chatMessage.findUnique({
      where: { id: messageId }
    });

    if (!msg) {
      return res.status(404).json({ error: 'Message not found' });
    }

    await globalPrisma.chatMessage.delete({
      where: { id: messageId }
    });

    if (io) {
      io.to(`tenant_${tenantId}`).emit('chat:message_deleted', {
        messageId,
        channelId: msg.channelId
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('[Chat API] Error deleting message from DB:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// 9. Get workspace users & presence directory from PostgreSQL
router.get('/users', async (req: any, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    const members = await globalPrisma.tenantMember.findMany({
      where: { tenantId },
      include: {
        position: true,
        team: true
      },
      take: 50
    });

    const presences = await globalPrisma.chatUserPresence.findMany({
      where: { tenantId }
    });
    const presenceMap = new Map(presences.map(p => [p.userId, p]));

    const users = members.map(m => {
      const pres = m.userId ? presenceMap.get(m.userId) : null;
      const displayName = [m.firstName, m.familyName].filter(Boolean).join(' ') || m.workEmail?.split('@')[0] || 'Team Member';

      return {
        id: m.userId || m.id,
        name: displayName,
        email: m.workEmail || m.personalEmail || undefined,
        avatarUrl: m.avatarUrl || undefined,
        role: m.position?.title || (m.roleId === 'Admin' ? 'Administrator' : 'Team Member'),
        presence: pres?.presence || 'online',
        status: pres?.statusText ? {
          emoji: pres.statusEmoji || '⚡',
          text: pres.statusText
        } : undefined
      };
    });

    // If tenant members list is empty, return default directory
    if (users.length === 0) {
      const defaultContacts = [
        { id: 'sarah-c', name: 'Sarah Connor', email: 'sarah.c@aurora.io', role: 'Lead Architect', presence: 'online', status: { emoji: '⚡', text: 'Shipping features' } },
        { id: 'david-m', name: 'David Miller', email: 'david.m@aurora.io', role: 'Product Director', presence: 'busy', status: { emoji: '📅', text: 'In quarterly planning' } },
        { id: 'alex-r', name: 'Alex Rivera', email: 'alex.r@aurora.io', role: 'Fullstack Engineer', presence: 'away', status: { emoji: '☕', text: 'Grabbing coffee' } },
        { id: 'sophia-c', name: 'Sophia Chen', email: 'sophia.c@aurora.io', role: 'UI/UX Designer', presence: 'online', status: { emoji: '🎨', text: 'Designing UI tokens' } }
      ];
      return res.json({ success: true, users: defaultContacts });
    }

    res.json({ success: true, users });
  } catch (err: any) {
    console.error('[Chat API] Error fetching users from DB:', err);
    res.status(500).json({ error: 'Failed to fetch users from database' });
  }
});

// 10. Update user presence & status in PostgreSQL
router.post('/presence', async (req: any, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.user?.id || 'current-user';
    const { status, statusEmoji, statusText } = req.body;

    const presenceRecord = await globalPrisma.chatUserPresence.upsert({
      where: { userId },
      update: {
        presence: status || 'online',
        statusEmoji: statusEmoji || null,
        statusText: statusText || null,
        lastActiveAt: new Date()
      },
      create: {
        userId,
        tenantId,
        presence: status || 'online',
        statusEmoji: statusEmoji || null,
        statusText: statusText || null,
        lastActiveAt: new Date()
      }
    });

    if (io) {
      io.to(`tenant_${tenantId}`).emit('chat:presence_updated', {
        userId,
        status: presenceRecord.presence,
        statusEmoji: presenceRecord.statusEmoji,
        statusText: presenceRecord.statusText
      });
    }

    res.json({ success: true, presence: presenceRecord });
  } catch (err: any) {
    console.error('[Chat API] Error updating presence in DB:', err);
    res.status(500).json({ error: 'Failed to update presence' });
  }
});

export default router;
