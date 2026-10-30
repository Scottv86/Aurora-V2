import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config';

let sharedSocket: Socket | null = null;
let currentToken: string | undefined = undefined;
let activeTenants = new Set<string>();

/**
 * Returns a shared singleton Socket.IO connection for the workspace.
 * Eliminates duplicate WebSocket handshakes across PlatformContext, useData, Dashboard, and TriageInboxPage.
 */
export function getSharedSocket(token?: string, tenantId?: string): Socket {
  const resolvedToken = token || localStorage.getItem('aurora_token') || undefined;

  if (!sharedSocket || (resolvedToken && resolvedToken !== currentToken)) {
    if (sharedSocket) {
      sharedSocket.disconnect();
    }
    currentToken = resolvedToken;
    sharedSocket = io(API_BASE_URL || 'http://127.0.0.1:3001', {
      auth: { token: resolvedToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1500,
    });

    sharedSocket.on('connect', () => {
      activeTenants.forEach((tId) => {
        sharedSocket?.emit('join_tenant', tId);
      });
    });
  }

  if (tenantId) {
    activeTenants.add(tenantId);
    if (sharedSocket.connected) {
      sharedSocket.emit('join_tenant', tenantId);
    }
  }

  return sharedSocket;
}
