import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { usePlatform } from './usePlatform';
import { useAuth } from './useAuth';
import { API_BASE_URL } from '../config';

export interface PermissionGroup {
  id: string;
  name: string;
  description?: string;
  capabilities?: string[];
  parentGroupId?: string | null;
}

export const usePermissionGroups = (enabled: boolean = true) => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState(enabled);

  const fetchGroups = useCallback(async () => {
    if (!tenant?.id || !enabled) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/permissions/groups`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (!res.ok) throw new Error('Failed to fetch permission groups');
      const data = await res.json();
      setGroups(data);
    } catch (err: any) {
      console.error(err);
      toast.error('Could not load permission groups: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, session?.access_token]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const createGroup = async (data: Partial<PermissionGroup>) => {
    if (!tenant?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/permissions/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create group');
      }
      await fetchGroups();
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const updateGroup = async (id: string, data: Partial<PermissionGroup>) => {
    if (!tenant?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/permissions/groups/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update group');
      }
      await fetchGroups();
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const deleteGroup = async (id: string) => {
    if (!tenant?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/permissions/groups/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete group');
      }
      await fetchGroups();
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  return { groups, loading, createGroup, updateGroup, deleteGroup, refetch: fetchGroups };
};
