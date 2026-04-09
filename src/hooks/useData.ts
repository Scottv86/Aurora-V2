import { useState, useEffect, useCallback } from 'react';
import { usePlatform } from './usePlatform';
import { useAuth } from './useAuth';
import { io, Socket } from 'socket.io-client';

const API_BASE_URL = 'http://localhost:3001/api/data';
const WS_BASE_URL = 'http://localhost:3001';

export const useData = (collectionName: 'records' | 'modules') => {
  const { tenant } = usePlatform();
  const { user, session } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!tenant?.id || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = session?.access_token;
      const res = await fetch(`${API_BASE_URL}/${collectionName}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (!res.ok) throw new Error('Failed to fetch data');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, user, collectionName]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (!tenant?.id || !user) return;

    let s: Socket | null = null;
    let isActive = true;

    const connectSocket = async () => {
      try {
        const token = session?.access_token;
        if (!isActive) return;

        s = io(WS_BASE_URL, {
          auth: { token }
        });

        s.on('connect', () => {
          s?.emit('join_tenant', tenant.id);
          console.log(`[Socket] Connected to ${WS_BASE_URL} and joined tenant ${tenant.id}`);
        });

        s.on('record_added', (record: any) => {
          if (collectionName === 'records') {
            setData(prev => {
              // Quick dedup
              if (prev.find(p => p.id === record.id)) return prev;
              return [record, ...prev];
            });
          }
        });

        s.on('record_updated', (record: any) => {
          if (collectionName === 'records') {
            setData(prev => prev.map(p => p.id === record.id ? record : p));
          }
        });

        s.on('record_deleted', (id: string) => {
          if (collectionName === 'records') {
            setData(prev => prev.filter(p => p.id !== id));
          }
        });
        
        s.on('disconnect', () => {
          console.log('[Socket] Disconnected from API');
        });

      } catch (err) {
        console.error('Socket connection failed', err);
      }
    };

    connectSocket();

    return () => {
      isActive = false;
      if (s) {
        s.emit('leave_tenant', tenant.id);
        s.disconnect();
      }
    };
  }, [tenant?.id, user, collectionName]);

  const mutate = async (action: 'CREATE' | 'UPDATE' | 'DELETE', payload: any, id?: string) => {
    if (!tenant?.id || !user) throw new Error("Not connected");
    const token = session?.access_token;
    let url = `${API_BASE_URL}/${collectionName}`;
    let method = 'POST';
    if (action === 'UPDATE' && id) {
      url += `/${id}`;
      method = 'PUT';
    } else if (action === 'DELETE' && id) {
      url += `/${id}`;
      method = 'DELETE';
    }

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenant.id
      },
      body: payload ? JSON.stringify(payload) : undefined
    });

    if (!res.ok) throw new Error(`Mutation failed: ${res.statusText}`);
    return res.json();
  };

  return { data, loading, error, refetch: fetchItems, mutate };
};
