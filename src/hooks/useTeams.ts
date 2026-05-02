import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { usePlatform } from './usePlatform';
import { useAuth } from './useAuth';

export interface Team {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  agentCount: number;
  avatar?: string;
}

const API_BASE_URL = 'http://localhost:3001/api/teams';

export const useTeams = (enabled: boolean = true) => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(enabled);

  const fetchTeams = useCallback(async () => {
    if (!tenant?.id || !enabled) return;
    setLoading(true);
    try {
      const res = await fetch(API_BASE_URL, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (!res.ok) throw new Error('Failed to fetch teams');
      const data = await res.json();
      setTeams(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, session?.access_token]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const createTeam = async (data: { name: string, description: string, avatarUrl?: string }) => {
    if (!tenant?.id) return;
    try {
      const res = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create team');
      const newTeam = await res.json();
      setTeams(prev => [...prev, newTeam]);
      toast.success(`Team "${data.name}" created successfully`);
      return newTeam;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const updateTeam = async (id: string, data: Partial<Team> & { avatarUrl?: string }) => {
    if (!tenant?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update team');
      const updated = await res.json();
      setTeams(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));
      toast.success('Team updated successfully');
      return updated;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const deleteTeam = async (id: string) => {
    if (!tenant?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (!res.ok) throw new Error('Failed to delete team');
      setTeams(prev => prev.filter(t => t.id !== id));
      toast.success('Team deleted');
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  return { teams, loading, createTeam, updateTeam, deleteTeam, refetch: fetchTeams };
};

export const useTeam = (id?: string) => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const [team, setTeam] = useState<Team & { members?: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTeam = useCallback(async () => {
    if (!tenant?.id || !id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Failed to fetch team');
      }
      const data = await res.json();
      setTeam(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, id, session?.access_token]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const updateTeam = async (data: Partial<Team> & { avatarUrl?: string }) => {
    if (!tenant?.id || !id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update team');
      const updated = await res.json();
      setTeam(prev => prev ? { ...prev, ...updated } : null);
      toast.success('Team details updated');
      return updated;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const deleteTeam = async () => {
    if (!tenant?.id || !id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (!res.ok) throw new Error('Failed to delete team');
      toast.success('Team permanently removed');
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  return { team, loading, updateTeam, deleteTeam, refetch: fetchTeam };
};
