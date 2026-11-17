import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSharedSocket } from '../lib/socketClient';
import { RecordCollaborator } from './useRecordPresence';

interface UseRecordListPresenceOptions {
  tenantId?: string;
  currentUserId?: string;
  enabled?: boolean;
}

export function useRecordListPresence({
  tenantId,
  currentUserId,
  enabled = true,
}: UseRecordListPresenceOptions) {
  const [presenceMap, setPresenceMap] = useState<Record<string, RecordCollaborator[]>>({});

  const socket = useMemo(() => {
    if (!enabled || !tenantId) return null;
    return getSharedSocket(undefined, tenantId);
  }, [enabled, tenantId]);

  useEffect(() => {
    if (!enabled || !socket || !tenantId) {
      setPresenceMap({});
      return;
    }

    // Request initial presence map for this tenant
    socket.emit('records:get_presence', { tenantId }, (res: any) => {
      if (res?.success && res.presenceMap) {
        setPresenceMap(res.presenceMap);
      }
    });

    const handleBatch = (data: { presenceMap?: Record<string, RecordCollaborator[]> }) => {
      if (data?.presenceMap && typeof data.presenceMap === 'object') {
        setPresenceMap(data.presenceMap);
      }
    };

    const handlePresenceUpdate = (data: {
      recordId: string;
      recordKey?: string;
      collaborators: RecordCollaborator[];
    }) => {
      if (!data?.recordId) return;

      setPresenceMap((prev) => {
        const next = { ...prev };
        const id = String(data.recordId);
        const key = data.recordKey ? String(data.recordKey) : null;
        const collabs = Array.isArray(data.collaborators) ? data.collaborators : [];

        if (collabs.length === 0) {
          delete next[id];
          if (key) delete next[key];
        } else {
          next[id] = collabs;
          if (key) next[key] = collabs;
        }

        return next;
      });
    };

    socket.on('records:presence_batch', handleBatch);
    socket.on('record:presence_update', handlePresenceUpdate);
    socket.on('record:presence_sync', handlePresenceUpdate);

    return () => {
      socket.off('records:presence_batch', handleBatch);
      socket.off('record:presence_update', handlePresenceUpdate);
      socket.off('record:presence_sync', handlePresenceUpdate);
    };
  }, [socket, enabled, tenantId]);

  const getRecordCollaborators = useCallback(
    (recordId?: string, recordKey?: string): RecordCollaborator[] => {
      if (!recordId && !recordKey) return [];
      const idKey = recordId ? String(recordId) : '';
      const rKey = recordKey ? String(recordKey) : '';

      const list = presenceMap[idKey] || (rKey ? presenceMap[rKey] : null) || [];

      // Filter out self if currentUserId is known
      if (currentUserId) {
        return list.filter((c) => c.userId !== currentUserId && c.socketId !== socket?.id);
      }
      return list.filter((c) => c.socketId !== socket?.id);
    },
    [presenceMap, currentUserId, socket?.id]
  );

  const isRecordActive = useCallback(
    (recordId?: string, recordKey?: string): boolean => {
      return getRecordCollaborators(recordId, recordKey).length > 0;
    },
    [getRecordCollaborators]
  );

  const isRecordBeingEdited = useCallback(
    (recordId?: string, recordKey?: string): boolean => {
      const collabs = getRecordCollaborators(recordId, recordKey);
      return collabs.some((c) => c.status === 'editing' || Boolean(c.activeFieldId));
    },
    [getRecordCollaborators]
  );

  return {
    presenceMap,
    getRecordCollaborators,
    isRecordActive,
    isRecordBeingEdited,
  };
}
