import { useState, useEffect, useCallback } from 'react';
import { usePlatform } from './usePlatform';
import { useAuth } from './useAuth';
import { DATA_API_URL } from '../config';

export const useNestedRecords = (parentRecordId?: string) => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNested = useCallback(async () => {
    if (!tenant?.id || !parentRecordId) return;
    
    setLoading(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${DATA_API_URL}/records?associationId=${parentRecordId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        }
      });
      
      if (!res.ok) throw new Error('Failed to fetch nested records');
      const data = await res.json();
      setRecords(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, parentRecordId, session?.access_token]);

  useEffect(() => {
    fetchNested();
  }, [fetchNested]);

  return { records, loading, error, refetch: fetchNested };
};
