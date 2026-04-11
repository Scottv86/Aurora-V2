import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { usePlatform } from './usePlatform';
import { useAuth } from './useAuth';
import { TenantMember } from './useUsers';

const API_BASE_URL = 'http://localhost:3001/api/members';

export const useMember = (id: string | undefined) => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const [member, setMember] = useState<TenantMember | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMember = useCallback(async () => {
    if (!id || !tenant?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (!res.ok) throw new Error('Failed to fetch member details');
      const data = await res.json();
      setMember(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, tenant?.id, session?.access_token]);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  const updateMember = async (data: any) => {
    if (!id || !tenant?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'POST', // Using POST for the update endpoint as defined in my route
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update member');
      toast.success('Member updated successfully');
      fetchMember(); // Refresh data
      return await res.json();
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const deleteMember = async () => {
    if (!id || !tenant?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (!res.ok) throw new Error('Failed to delete member');
      toast.success('Member removed');
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  return { member, loading, updateMember, deleteMember, refetch: fetchMember };
};
