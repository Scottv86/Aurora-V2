import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { supabaseAdmin } from './lib/supabaseAdmin';
import { globalPrisma } from './lib/prisma';

export let io: SocketIOServer;

export const initSocket = (httpServer: HttpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication Middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
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

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

// Helper for emitting events to a specific tenant
export const emitTenantUpdate = (tenantId: string, event: string, payload: any) => {
  if (io) {
    io.to(`tenant_${tenantId}`).emit(event, payload);
  }
};
