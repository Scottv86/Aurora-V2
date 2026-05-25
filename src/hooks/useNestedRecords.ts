import { useQuery } from '@tanstack/react-query';
import { usePlatform } from './usePlatform';
import { useAuth } from './useAuth';
import { DATA_API_URL } from '../config';

export const useNestedRecords = (parentRecordId?: string) => {
  const { tenant } = usePlatform();
  const { session } = useAuth();

  const { data: records = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ['nestedRecords', tenant?.id, parentRecordId],
    queryFn: async () => {
      if (!tenant?.id || !parentRecordId) return [];
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${DATA_API_URL}/records?associationId=${parentRecordId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        }
      });
      
      if (!res.ok) throw new Error('Failed to fetch nested records');
      const data = await res.json();
      return data.records || [];
    },
    enabled: !!tenant?.id && !!parentRecordId,
    staleTime: 5000
  });

  return { 
    records, 
    loading, 
    error: error ? (error as Error).message : null, 
    refetch 
  };
};
