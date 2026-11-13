import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { supabaseAdmin } from './lib/supabaseAdmin';
import { globalPrisma } from './lib/prisma';

export let io: SocketIOServer;

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

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  (global as any).io = io;
  return io;
};

// Helper for emitting events strictly to a specific tenant
export const emitTenantUpdate = (tenantId: string, event: string, payload: any) => {
  if (io && tenantId) {
    io.to(`tenant_${tenantId}`).emit(event, payload);
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
