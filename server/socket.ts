import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { supabaseAdmin } from './lib/supabaseAdmin';
import { globalPrisma } from './lib/prisma';

export let io: SocketIOServer;

// Real-Time Record Collaboration Presence Data Structure
export interface RecordCollaborator {
  socketId: string;
  userId: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  color: string;
  role: 'user' | 'agent';
  status: 'viewing' | 'editing';
  activeFieldId?: string;
  joinedAt: number;
  lastActiveAt: number;
}

const recordPresenceMap = new Map<string, Map<string, RecordCollaborator>>();
const recordTenantMap = new Map<string, string>();

export const getRecordCollaborators = (recordId: string): RecordCollaborator[] => {
  const roomMap = recordPresenceMap.get(recordId);
  return roomMap ? Array.from(roomMap.values()) : [];
};

export const broadcastRecordPresence = (recordId: string, recordKey?: string, tenantId?: string) => {
  if (io && recordId) {
    const list = getRecordCollaborators(recordId);
    const syncPayload = {
      recordId,
      recordKey,
      collaborators: list
    };
    io.to(`record_${recordId}`).emit('record:presence_sync', syncPayload);
    if (recordKey && recordKey !== recordId) {
      io.to(`record_${recordKey}`).emit('record:presence_sync', syncPayload);
    }

    // Also notify tenant room so module record list views (tables, split views, kanban) stay live
    const resolvedTenant = tenantId || recordTenantMap.get(recordId) || (recordKey ? recordTenantMap.get(recordKey) : undefined);
    if (resolvedTenant) {
      io.to(`tenant_${resolvedTenant}`).emit('record:presence_update', syncPayload);
    }
  }
};

export const setAIAgentPresence = (recordId: string, status: 'viewing' | 'editing', activeFieldId?: string, isLeaving = false, tenantId?: string) => {
  if (!io || !recordId) return;
  const aiKey = 'ai:aurora_assistant';
  if (tenantId) {
    recordTenantMap.set(recordId, tenantId);
  }
  if (!recordPresenceMap.has(recordId)) {
    recordPresenceMap.set(recordId, new Map());
  }
  const roomMap = recordPresenceMap.get(recordId)!;
  if (isLeaving) {
    roomMap.delete(aiKey);
    if (roomMap.size === 0) {
      recordPresenceMap.delete(recordId);
      recordTenantMap.delete(recordId);
    }
  } else {
    roomMap.set(aiKey, {
      socketId: aiKey,
      userId: aiKey,
      name: 'Aurora AI Co-Pilot',
      email: 'ai@aurora.internal',
      avatarUrl: '',
      color: '#6366f1',
      role: 'agent',
      status,
      activeFieldId,
      joinedAt: Date.now(),
      lastActiveAt: Date.now()
    });
  }
  broadcastRecordPresence(recordId, undefined, tenantId);
};

export const initSocket = (httpServer: HttpServer) => {
  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ];

  const configuredOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const socketOrigins = Array.from(new Set([...defaultOrigins, ...configuredOrigins]));

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || socketOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`WebSocket CORS blocked for origin: ${origin}`));
      },
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication Middleware (Supports both Workspace JWT and Public Site Visitor Tokens)
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    const visitorToken = socket.handshake.auth.visitorToken;
    const publicSiteId = socket.handshake.auth.siteId;

    if (!token && visitorToken) {
      socket.data.visitor = {
        visitorToken: String(visitorToken),
        siteId: publicSiteId ? String(publicSiteId) : undefined
      };
      return next();
    }

    if (!token) {
      return next(new Error('Authentication Error'));
    }

    try {
      const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);
      
      if (error || !supabaseUser) {
        console.error('[Socket Auth] Invalid token:', error);
        return next(new Error('Authentication Error'));
      }

      const user = await globalPrisma.user.findUnique({
        where: { id: supabaseUser.id },
        include: { memberships: true }
      });
      
      if (!user) {
        console.error('[Socket Auth] User not found in Registry:', supabaseUser.id);
        return next(new Error('User not found'));
      }

      socket.data.user = {
        uid: user.id,
        tenantIds: user.memberships.map(m => m.tenantId),
        isSuperAdmin: user.isSuperAdmin
      };
      
      next();
    } catch (err) {
      next(new Error('Authentication Error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id} (User: ${socket.data.user?.uid})`);

    // Clients can join rooms based on tenantId to get scoped updates
    socket.on('join_tenant', (tenantId: string) => {
      // Security check
      if (socket.data.user?.tenantIds.includes(tenantId) || socket.data.user?.isSuperAdmin) {
        socket.join(`tenant_${tenantId}`);
        console.log(`[Socket] ${socket.id} joined room tenant_${tenantId}`);
      }
    });

    socket.on('leave_tenant', (tenantId: string) => {
      socket.leave(`tenant_${tenantId}`);
    });

    // Chat Channel Rooms
    socket.on('join_channel', async (channelId: string) => {
      try {
        if (!channelId || typeof channelId !== 'string') return;
        const channel = await globalPrisma.chatChannel.findUnique({
          where: { id: channelId },
          select: { tenantId: true }
        });
        if (channel && (socket.data.user?.tenantIds.includes(channel.tenantId) || socket.data.user?.isSuperAdmin)) {
          socket.join(`channel_${channelId}`);
        } else {
          console.warn(`[Socket Security Alert] User ${socket.data.user?.uid} denied access to channel ${channelId}`);
        }
      } catch (err) {
        console.error('[Socket] Channel authorization error:', err);
      }
    });

    socket.on('leave_channel', (channelId: string) => {
      socket.leave(`channel_${channelId}`);
    });

    // Real-time typing indicator
    socket.on('chat:typing', (data: { tenantId: string; channelId: string; userId: string; userName: string; isTyping: boolean }) => {
      if (data.tenantId && (socket.data.user?.tenantIds.includes(data.tenantId) || socket.data.user?.isSuperAdmin)) {
        socket.to(`tenant_${data.tenantId}`).emit('chat:user_typing', data);
      }
    });

    // Service Desk Session Rooms (Accessible to Tenant Operators & Matching Site Visitor)
    socket.on('join_service_desk_session', async (sessionId: string) => {
      try {
        if (!sessionId || typeof sessionId !== 'string') return;
        const session = await (globalPrisma as any).serviceDeskSession.findUnique({
          where: { id: sessionId },
          select: { tenantId: true, visitorToken: true }
        });
        if (!session) return;

        const isAuthorizedStaff =
          socket.data.user?.tenantIds.includes(session.tenantId) || socket.data.user?.isSuperAdmin;
        const isAuthorizedVisitor =
          socket.data.visitor?.visitorToken && socket.data.visitor.visitorToken === session.visitorToken;

        if (isAuthorizedStaff || isAuthorizedVisitor) {
          socket.join(`service_desk_session_${sessionId}`);
        }
      } catch (err) {
        console.error('[Socket] Service Desk session join error:', err);
      }
    });

    socket.on('leave_service_desk_session', (sessionId: string) => {
      if (sessionId && typeof sessionId === 'string') {
        socket.leave(`service_desk_session_${sessionId}`);
      }
    });

    socket.on('service_desk:typing', (data: { sessionId: string; tenantId?: string; senderName: string; senderType: string; isTyping: boolean }) => {
      if (data?.sessionId) {
        socket.to(`service_desk_session_${data.sessionId}`).emit('service_desk:typing', data);
        if (data.tenantId) {
          socket.to(`tenant_${data.tenantId}`).emit('service_desk:typing', data);
        }
      }
    });

    // ----------------------------------------------------
    // Real-Time Record Collaboration & Presence Rooms
    // ----------------------------------------------------
    socket.on('record:join', (data: {
      recordId: string;
      recordKey?: string;
      tenantId?: string;
      user: {
        id: string;
        name: string;
        email?: string;
        avatarUrl?: string;
        color?: string;
        role?: 'user' | 'agent';
      };
    }) => {
      try {
        const { recordId, recordKey, tenantId, user } = data || {};
        if (!recordId || !user?.id) return;

        if (tenantId) {
          recordTenantMap.set(recordId, tenantId);
          if (recordKey) recordTenantMap.set(recordKey, tenantId);
        }

        socket.join(`record_${recordId}`);
        if (recordKey && recordKey !== recordId) {
          socket.join(`record_${recordKey}`);
        }

        if (!recordPresenceMap.has(recordId)) {
          recordPresenceMap.set(recordId, new Map());
        }

        const roomMap = recordPresenceMap.get(recordId)!;
        const now = Date.now();

        roomMap.set(socket.id, {
          socketId: socket.id,
          userId: user.id,
          name: user.name || 'Collaborator',
          email: user.email,
          avatarUrl: user.avatarUrl,
          color: user.color || '#6366f1',
          role: user.role || 'user',
          status: 'viewing',
          joinedAt: now,
          lastActiveAt: now,
        });

        broadcastRecordPresence(recordId, recordKey, tenantId);
      } catch (err) {
        console.error('[Socket] record:join error:', err);
      }
    });

    socket.on('record:leave', (data: { recordId: string; recordKey?: string }) => {
      try {
        const { recordId, recordKey } = data || {};
        if (!recordId) return;

        socket.leave(`record_${recordId}`);
        if (recordKey && recordKey !== recordId) {
          socket.leave(`record_${recordKey}`);
        }

        const roomMap = recordPresenceMap.get(recordId);
        const resolvedTenant = recordTenantMap.get(recordId);
        if (roomMap) {
          roomMap.delete(socket.id);
          if (roomMap.size === 0) {
            recordPresenceMap.delete(recordId);
            recordTenantMap.delete(recordId);
          }
        }
        broadcastRecordPresence(recordId, recordKey, resolvedTenant);
      } catch (err) {
        console.error('[Socket] record:leave error:', err);
      }
    });

    // Provide active record presence query for module record list views
    socket.on('records:get_presence', (data: { tenantId?: string }, callback?: (res: any) => void) => {
      try {
        const tenantId = data?.tenantId;
        const result: Record<string, RecordCollaborator[]> = {};
        recordPresenceMap.forEach((roomMap, recId) => {
          const recTenant = recordTenantMap.get(recId);
          if (!tenantId || !recTenant || recTenant === tenantId) {
            const list = Array.from(roomMap.values());
            if (list.length > 0) {
              result[recId] = list;
            }
          }
        });
        if (typeof callback === 'function') {
          callback({ success: true, presenceMap: result });
        } else {
          socket.emit('records:presence_batch', { presenceMap: result });
        }
      } catch (err) {
        console.error('[Socket] records:get_presence error:', err);
      }
    });

    socket.on('record:focus_field', (data: { recordId: string; recordKey?: string; fieldId: string }) => {
      try {
        const { recordId, recordKey, fieldId } = data || {};
        if (!recordId || !fieldId) return;

        let roomMap = recordPresenceMap.get(recordId) || (recordKey ? recordPresenceMap.get(recordKey) : undefined);
        if (!roomMap) {
          for (const [rId, m] of recordPresenceMap.entries()) {
            if (m.has(socket.id)) {
              roomMap = m;
              break;
            }
          }
        }
        const collaborator = roomMap?.get(socket.id);
        if (collaborator) {
          collaborator.status = 'editing';
          collaborator.activeFieldId = fieldId;
          collaborator.lastActiveAt = Date.now();
        }

        const focusPayload = {
          socketId: socket.id,
          userId: collaborator?.userId,
          name: collaborator?.name,
          color: collaborator?.color,
          avatarUrl: collaborator?.avatarUrl,
          fieldId,
        };

        socket.to(`record_${recordId}`).emit('record:field_focused', focusPayload);
        if (recordKey && recordKey !== recordId) {
          socket.to(`record_${recordKey}`).emit('record:field_focused', focusPayload);
        }

        broadcastRecordPresence(recordId, recordKey);
      } catch (err) {
        console.error('[Socket] record:focus_field error:', err);
      }
    });

    socket.on('record:blur_field', (data: { recordId: string; recordKey?: string; fieldId?: string }) => {
      try {
        const { recordId, recordKey, fieldId } = data || {};
        if (!recordId) return;

        let roomMap = recordPresenceMap.get(recordId) || (recordKey ? recordPresenceMap.get(recordKey) : undefined);
        if (!roomMap) {
          for (const [rId, m] of recordPresenceMap.entries()) {
            if (m.has(socket.id)) {
              roomMap = m;
              break;
            }
          }
        }
        const collaborator = roomMap?.get(socket.id);
        if (collaborator && (!fieldId || collaborator.activeFieldId?.toLowerCase() === fieldId.toLowerCase())) {
          collaborator.status = 'viewing';
          collaborator.activeFieldId = undefined;
          collaborator.lastActiveAt = Date.now();
        }

        const blurPayload = {
          socketId: socket.id,
          userId: collaborator?.userId,
          fieldId,
        };

        socket.to(`record_${recordId}`).emit('record:field_blurred', blurPayload);
        if (recordKey && recordKey !== recordId) {
          socket.to(`record_${recordKey}`).emit('record:field_blurred', blurPayload);
        }

        broadcastRecordPresence(recordId, recordKey);
      } catch (err) {
        console.error('[Socket] record:blur_field error:', err);
      }
    });

    socket.on('record:typing', (data: { recordId: string; recordKey?: string; fieldId: string; isTyping: boolean }) => {
      try {
        const { recordId, recordKey, fieldId, isTyping } = data || {};
        if (!recordId || !fieldId) return;

        const roomMap = recordPresenceMap.get(recordId);
        const collaborator = roomMap?.get(socket.id);
        if (collaborator) {
          collaborator.status = isTyping ? 'editing' : 'viewing';
          collaborator.activeFieldId = isTyping ? fieldId : undefined;
          collaborator.lastActiveAt = Date.now();
        }

        const typingPayload = {
          socketId: socket.id,
          userId: collaborator?.userId,
          name: collaborator?.name,
          color: collaborator?.color,
          fieldId,
          isTyping,
        };

        socket.to(`record_${recordId}`).emit('record:field_typing', typingPayload);
        if (recordKey && recordKey !== recordId) {
          socket.to(`record_${recordKey}`).emit('record:field_typing', typingPayload);
        }
      } catch (err) {
        console.error('[Socket] record:typing error:', err);
      }
    });

    socket.on('record:field_change', (data: {
      recordId: string;
      recordKey?: string;
      fieldId: string;
      value: any;
      metadata?: any;
    }) => {
      try {
        const { recordId, recordKey, fieldId, value, metadata } = data || {};
        if (!recordId || !fieldId) return;

        let roomMap = recordPresenceMap.get(recordId) || (recordKey ? recordPresenceMap.get(recordKey) : undefined);
        const collaborator = roomMap?.get(socket.id);
        if (collaborator) {
          collaborator.status = 'editing';
          collaborator.activeFieldId = fieldId;
          collaborator.lastActiveAt = Date.now();
        }

        const changePayload = {
          socketId: socket.id,
          userId: collaborator?.userId,
          name: collaborator?.name,
          color: collaborator?.color,
          avatarUrl: collaborator?.avatarUrl,
          fieldId,
          value,
          metadata
        };

        socket.to(`record_${recordId}`).emit('record:field_change', changePayload);
        if (recordKey && recordKey !== recordId) {
          socket.to(`record_${recordKey}`).emit('record:field_change', changePayload);
        }
      } catch (err) {
        console.error('[Socket] record:field_change error:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
      // Clean up record presence across all active rooms
      recordPresenceMap.forEach((roomMap, recordId) => {
        if (roomMap.has(socket.id)) {
          const resolvedTenant = recordTenantMap.get(recordId);
          roomMap.delete(socket.id);
          if (roomMap.size === 0) {
            recordPresenceMap.delete(recordId);
            recordTenantMap.delete(recordId);
          }
          broadcastRecordPresence(recordId, undefined, resolvedTenant);
        }
      });
    });
  });

  (global as any).io = io;
  return io;
};

// Helper for emitting events strictly to a specific tenant and active record collaboration rooms
export const emitTenantUpdate = (tenantId: string, event: string, payload: any) => {
  if (io && tenantId) {
    io.to(`tenant_${tenantId}`).emit(event, payload);

    // If this update relates to a record, also emit directly to collaborators in the record room
    const targetRecordId = payload?.id || payload?.recordId;
    if (targetRecordId) {
      io.to(`record_${targetRecordId}`).emit(event, payload);
    }
    const targetRecordKey = payload?._record_key || payload?.data?._record_key;
    if (targetRecordKey && targetRecordKey !== targetRecordId) {
      io.to(`record_${targetRecordKey}`).emit(event, payload);
    }

    // When a record is updated, reset any collaborator editing the updated field(s) to 'viewing'
    if (event === 'record_updated') {
      const roomMap = (targetRecordId && recordPresenceMap.get(targetRecordId)) ||
                      (targetRecordKey && recordPresenceMap.get(targetRecordKey));
      if (roomMap) {
        let changed = false;
        const updatedFields = Array.isArray(payload?.updatedFields) && payload.updatedFields.length > 0
          ? payload.updatedFields.map((f: string) => String(f).toLowerCase())
          : null;

        roomMap.forEach((collab) => {
          if (collab.activeFieldId) {
            const activeLower = String(collab.activeFieldId).toLowerCase();
            if (!updatedFields || updatedFields.includes(activeLower)) {
              collab.status = 'viewing';
              collab.activeFieldId = undefined;
              collab.lastActiveAt = Date.now();
              changed = true;
            }
          }
        });
        if (changed) {
          if (targetRecordId) broadcastRecordPresence(targetRecordId, targetRecordKey);
          if (targetRecordKey && targetRecordKey !== targetRecordId) broadcastRecordPresence(targetRecordKey, targetRecordId);
        }
      }
    }
  }
};

// Helper for emitting record updates directly to active record viewers/editors and the tenant
export const emitRecordUpdate = (tenantId: string, recordId: string, event: string, payload: any, recordKey?: string) => {
  if (io) {
    if (recordId) {
      io.to(`record_${recordId}`).emit(event, payload);
    }
    if (recordKey && recordKey !== recordId) {
      io.to(`record_${recordKey}`).emit(event, payload);
    }
    if (tenantId) {
      io.to(`tenant_${tenantId}`).emit(event, payload);
    }

    // When a record is updated, reset any collaborator editing the updated field(s) to 'viewing'
    if (event === 'record_updated') {
      const roomMap = (recordId && recordPresenceMap.get(recordId)) ||
                      (recordKey && recordPresenceMap.get(recordKey));
      if (roomMap) {
        let changed = false;
        const updatedFields = Array.isArray(payload?.updatedFields) && payload.updatedFields.length > 0
          ? payload.updatedFields.map((f: string) => String(f).toLowerCase())
          : null;

        roomMap.forEach((collab) => {
          if (collab.activeFieldId) {
            const activeLower = String(collab.activeFieldId).toLowerCase();
            if (!updatedFields || updatedFields.includes(activeLower)) {
              collab.status = 'viewing';
              collab.activeFieldId = undefined;
              collab.lastActiveAt = Date.now();
              changed = true;
            }
          }
        });
        if (changed) {
          if (recordId) broadcastRecordPresence(recordId, recordKey);
          if (recordKey && recordKey !== recordId) broadcastRecordPresence(recordKey, recordId);
        }
      }
    }
  }
};

// Helper for emitting events to both a Service Desk session room (visitor + staff) and the tenant operator room
export const emitServiceDeskSessionUpdate = (tenantId: string, sessionId: string, event: string, payload: any) => {
  if (io) {
    if (sessionId) {
      io.to(`service_desk_session_${sessionId}`).emit(event, payload);
    }
    if (tenantId) {
      io.to(`tenant_${tenantId}`).emit(event, payload);
    }
  }
};
