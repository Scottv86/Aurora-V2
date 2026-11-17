import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getSharedSocket } from '../lib/socketClient';

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

const COLLABORATOR_COLORS = [
  '#2563eb', // Blue
  '#8b5cf6', // Violet
  '#d97706', // Amber
  '#ec4899', // Pink
  '#059669', // Emerald
  '#0891b2', // Cyan
  '#7c3aed', // Purple
  '#dc2626', // Red
  '#10b981', // Teal
  '#ea580c', // Orange
];

export function getDeterministicColor(str?: string): string {
  if (!str) return COLLABORATOR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLLABORATOR_COLORS.length;
  return COLLABORATOR_COLORS[index];
}

interface UseRecordPresenceOptions {
  recordId?: string;
  recordKey?: string;
  user?: any;
  tenantId?: string;
  token?: string;
  enabled?: boolean;
  onRemoteFieldChange?: (fieldId: string, value: any, metadata?: any) => void;
}

export function useRecordPresence({
  recordId,
  recordKey,
  user,
  tenantId,
  token,
  enabled = true,
  onRemoteFieldChange,
}: UseRecordPresenceOptions) {
  const [collaborators, setCollaborators] = useState<RecordCollaborator[]>([]);
  const currentActiveFieldRef = useRef<string | null>(null);
  const onRemoteFieldChangeRef = useRef(onRemoteFieldChange);
  useEffect(() => {
    onRemoteFieldChangeRef.current = onRemoteFieldChange;
  }, [onRemoteFieldChange]);

  const currentUserId = user?.id || user?.userId || user?.uid || 'guest';
  const currentUserName =
    user?.firstName || user?.lastName
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
      : user?.name || user?.displayName || user?.email?.split('@')[0] || 'You';

  const myColor = useMemo(() => getDeterministicColor(currentUserId), [currentUserId]);

  const socket = useMemo(() => {
    if (!enabled || !tenantId) return null;
    return getSharedSocket(token, tenantId);
  }, [enabled, token, tenantId]);

  useEffect(() => {
    if (!enabled || !recordId || !socket) {
      setCollaborators([]);
      return;
    }

    const payload = {
      recordId,
      recordKey,
      tenantId,
      user: {
        id: currentUserId,
        name: currentUserName,
        email: user?.email,
        avatarUrl: user?.avatarUrl,
        color: myColor,
        role: 'user' as const,
      },
    };

    // Join record presence room
    socket.emit('record:join', payload);

    const handlePresenceSync = (data: { recordId: string; recordKey?: string; collaborators: RecordCollaborator[] }) => {
      const incomingId = String(data?.recordId || '');
      const incomingKey = String(data?.recordKey || '');
      const myId = String(recordId || '');
      const myKey = String(recordKey || '');

      const matches =
        !incomingId ||
        incomingId === myId ||
        incomingId === myKey ||
        (incomingKey && (incomingKey === myId || incomingKey === myKey));

      if (matches && Array.isArray(data.collaborators)) {
        setCollaborators(data.collaborators);
      }
    };

    const handleFieldFocused = (data: { socketId: string; userId: string; fieldId: string; name: string; color: string; avatarUrl?: string }) => {
      setCollaborators((prev) =>
        prev.map((c) => {
          if (c.socketId === data.socketId || c.userId === data.userId) {
            return {
              ...c,
              status: 'editing',
              activeFieldId: data.fieldId,
              lastActiveAt: Date.now(),
            };
          }
          return c;
        })
      );
    };

    const handleFieldBlurred = (data: { socketId: string; userId: string; fieldId?: string }) => {
      setCollaborators((prev) =>
        prev.map((c) => {
          if (c.socketId === data.socketId || c.userId === data.userId) {
            return {
              ...c,
              status: 'viewing',
              activeFieldId: undefined,
              lastActiveAt: Date.now(),
            };
          }
          return c;
        })
      );
    };

    const handleFieldTyping = (data: { socketId: string; userId: string; fieldId: string; isTyping: boolean }) => {
      setCollaborators((prev) =>
        prev.map((c) => {
          if (c.socketId === data.socketId || c.userId === data.userId) {
            return {
              ...c,
              status: data.isTyping ? 'editing' : 'viewing',
              activeFieldId: data.isTyping ? data.fieldId : c.activeFieldId,
              lastActiveAt: Date.now(),
            };
          }
          return c;
        })
      );
    };

    const handleRemoteFieldChange = (data: { socketId: string; userId: string; fieldId: string; value: any; metadata?: any }) => {
      if (data.socketId === socket.id || data.userId === currentUserId) return;
      onRemoteFieldChangeRef.current?.(data.fieldId, data.value, data.metadata);
    };

    socket.on('record:presence_sync', handlePresenceSync);
    socket.on('record:field_focused', handleFieldFocused);
    socket.on('record:field_blurred', handleFieldBlurred);
    socket.on('record:field_typing', handleFieldTyping);
    socket.on('record:field_change', handleRemoteFieldChange);

    return () => {
      if (currentActiveFieldRef.current) {
        socket.emit('record:blur_field', { recordId, recordKey, fieldId: currentActiveFieldRef.current });
      }
      socket.emit('record:leave', { recordId, recordKey });
      socket.off('record:presence_sync', handlePresenceSync);
      socket.off('record:field_focused', handleFieldFocused);
      socket.off('record:field_blurred', handleFieldBlurred);
      socket.off('record:field_typing', handleFieldTyping);
      socket.off('record:field_change', handleRemoteFieldChange);
    };
  }, [recordId, recordKey, socket, currentUserId, currentUserName, user?.email, user?.avatarUrl, myColor, enabled, tenantId]);

  const focusField = useCallback(
    (fieldId: string) => {
      if (!recordId || !socket || !fieldId) return;
      currentActiveFieldRef.current = fieldId;
      socket.emit('record:focus_field', { recordId, recordKey, fieldId });
    },
    [recordId, recordKey, socket]
  );

  const blurField = useCallback(
    (fieldId?: string) => {
      if (!recordId || !socket) return;
      currentActiveFieldRef.current = null;
      socket.emit('record:blur_field', { recordId, recordKey, fieldId });
    },
    [recordId, recordKey, socket]
  );

  const reportTyping = useCallback(
    (fieldId: string, isTyping: boolean) => {
      if (!recordId || !socket || !fieldId) return;
      socket.emit('record:typing', { recordId, recordKey, fieldId, isTyping });
    },
    [recordId, recordKey, socket]
  );

  const sendFieldChange = useCallback(
    (fieldId: string, value: any, metadata?: any) => {
      if (!recordId || !socket || !fieldId) return;
      socket.emit('record:field_change', {
        recordId,
        recordKey,
        fieldId,
        value,
        metadata,
      });
    },
    [recordId, recordKey, socket]
  );

  // Filter out self so we can easily display others' presence
  const otherCollaborators = useMemo(() => {
    return collaborators.filter((c) => c.socketId !== socket?.id && c.userId !== currentUserId);
  }, [collaborators, socket?.id, currentUserId]);

  // Map of fieldId -> Collaborators active on that field
  const activeFieldCollaborators = useMemo(() => {
    const map: Record<string, RecordCollaborator[]> = {};
    otherCollaborators.forEach((c) => {
      if (c.activeFieldId) {
        const k = c.activeFieldId.toLowerCase();
        if (!map[k]) map[k] = [];
        map[k].push(c);
      }
    });
    return map;
  }, [otherCollaborators]);

  const getFieldCollaborators = useCallback(
    (f?: { id?: string; name?: string; label?: string } | null): RecordCollaborator[] => {
      if (!f) return [];
      const idKey = f.id ? f.id.toLowerCase() : '';
      const nameKey = f.name ? f.name.toLowerCase() : '';
      const labelKey = f.label ? f.label.toLowerCase() : '';

      return (
        activeFieldCollaborators[idKey] ||
        (nameKey && activeFieldCollaborators[nameKey]) ||
        (labelKey && activeFieldCollaborators[labelKey]) ||
        []
      );
    },
    [activeFieldCollaborators]
  );

  return {
    collaborators,
    otherCollaborators,
    activeFieldCollaborators,
    getFieldCollaborators,
    focusField,
    blurField,
    reportTyping,
    sendFieldChange,
    myColor,
  };
}
