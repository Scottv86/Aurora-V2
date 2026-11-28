import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { usePlatform } from './usePlatform';
import { useAuth } from './useAuth';
import { API_BASE_URL } from '../config';
import { RolePolicy, RoleSimulationResult } from '../types/roles';

export type PermissionGroup = RolePolicy;

export const usePermissionGroups = (enabled: boolean = true) => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const [groups, setGroups] = useState<RolePolicy[]>([]);
  const [loading, setLoading] = useState(enabled);

  const getHeaders = useCallback(
    (withJson = false) => ({
      ...(withJson ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${(import.meta as any).env?.VITE_DEV_TOKEN || session?.access_token}`,
      'x-tenant-id': tenant?.id || '',
    }),
    [session?.access_token, tenant?.id]
  );

  const fetchGroups = useCallback(async () => {
    if (!tenant?.id || !enabled) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/permissions/groups`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch roles');
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      toast.error('Could not load roles: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, enabled, getHeaders]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const fetchRoleById = useCallback(
    async (id: string): Promise<RolePolicy | null> => {
      if (!tenant?.id) return null;
      const res = await fetch(`${API_BASE_URL}/api/permissions/groups/${id}`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load role');
      return res.json();
    },
    [tenant?.id, getHeaders]
  );

  const createGroup = async (data: Partial<RolePolicy>): Promise<RolePolicy | undefined> => {
    if (!tenant?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/permissions/groups`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to create role');
      }
      const created = await res.json();
      await fetchGroups();
      return created;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const updateGroup = async (id: string, data: Partial<RolePolicy>): Promise<RolePolicy | undefined> => {
    if (!tenant?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/permissions/groups/${id}`, {
        method: 'PATCH',
        headers: getHeaders(true),
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to update role');
      }
      const updated = await res.json();
      await fetchGroups();
      return updated;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const cloneGroup = async (id: string): Promise<RolePolicy | undefined> => {
    if (!tenant?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/permissions/groups/${id}/clone`, {
        method: 'POST',
        headers: getHeaders(true),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to clone role');
      }
      const cloned = await res.json();
      await fetchGroups();
      return cloned;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const simulateGroup = async (id: string): Promise<RoleSimulationResult | null> => {
    if (!tenant?.id) return null;
    const res = await fetch(`${API_BASE_URL}/api/permissions/groups/${id}/simulate`, {
      method: 'POST',
      headers: getHeaders(true),
    });
    if (!res.ok) throw new Error('Failed to simulate role');
    return res.json();
  };

  const fetchDependencies = async (id: string) => {
    if (!tenant?.id) return { dependencies: [] };
    const res = await fetch(`${API_BASE_URL}/api/permissions/groups/${id}/dependencies`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load dependencies');
    return res.json();
  };

  const deleteGroup = async (id: string) => {
    if (!tenant?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/permissions/groups/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to delete role');
      }
      await fetchGroups();
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  return {
    groups,
    loading,
    fetchRoleById,
    createGroup,
    updateGroup,
    cloneGroup,
    simulateGroup,
    fetchDependencies,
    deleteGroup,
    refetch: fetchGroups,
  };
};
