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

export const useTeams = () => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeams = useCallback(async () => {
    if (!tenant?.id) return;
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

  const createTeam = async (data: { name: string, description: string }) => {
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

  return { teams, loading, createTeam, refetch: fetchTeams };
};
