import React, { useCallback } from 'react';
import { toast } from 'sonner';
import { usePlatform } from './usePlatform';
import { useAuth } from './useAuth';
import { Team } from '../types/platform';

const API_BASE_URL = 'http://localhost:3001/api/teams';

export const useTeams = (enabled: boolean = true) => {
  const { tenant, teams, teamsLoading, refreshTeams } = usePlatform();
  const { session } = useAuth();

  const createTeam = async (data: { name: string, description: string, avatarUrl?: string }) => {
    if (!tenant?.id) return;
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create team');
      const newTeam = await res.json();
      await refreshTeams();
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
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update team');
      const updated = await res.json();
      await refreshTeams();
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
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (!res.ok) throw new Error('Failed to delete team');
      await refreshTeams();
      toast.success('Team deleted');
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  return { 
    teams: enabled ? teams : [], 
    loading: enabled ? teamsLoading : false, 
    createTeam, 
    updateTeam, 
    deleteTeam, 
    refetch: refreshTeams 
  };
};

export const useTeam = (id?: string) => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const [team, setTeam] = React.useState<Team & { members?: any[] } | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchTeam = useCallback(async () => {
    if (!tenant?.id || !id) return;
    setLoading(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
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

  React.useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const updateTeam = async (data: Partial<Team> & { avatarUrl?: string }) => {
    if (!tenant?.id || !id) return;
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
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

export type { Team };
