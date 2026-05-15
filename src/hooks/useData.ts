import { useState, useEffect, useCallback } from 'react';
import { usePlatform } from './usePlatform';
import { useAuth } from './useAuth';
import { io, Socket } from 'socket.io-client';

const API_BASE_URL = 'http://127.0.0.1:3001/api/data';
const WS_BASE_URL = 'http://127.0.0.1:3001';

export const useData = (collectionName: 'records' | 'modules', options: { page?: number, limit?: number, append?: boolean } = {}) => {
  const { tenant } = usePlatform();
  const { user, session } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const { page = 1, limit = 50, append = false } = options;

  const fetchItems = useCallback(async (isManualRefetch = false) => {
    if (!tenant?.id || !user) {
      setLoading(false);
      return;
    }
    
    // Only show loading if we are NOT appending or if it's a manual refetch
    if (!append || isManualRefetch) {
      setLoading(true);
    }

    try {
      const token = session?.access_token;
      const url = new URL(`${API_BASE_URL}/${collectionName}`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', limit.toString());

      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (!res.ok) throw new Error('Failed to fetch data');
      const json = await res.json();
      
      let newItems = [];
      let totalCount = 0;

      if (collectionName === 'records') {
        newItems = json.records || [];
        totalCount = json.total || 0;
      } else if (collectionName === 'modules') {
        // modules endpoint doesn't support pagination yet in server, but let's be safe
        newItems = Array.isArray(json) ? json : (json.modules || []);
        totalCount = json.total || newItems.length;
      } else {
        newItems = json;
        totalCount = json.length;
      }

      setData(prev => {
        if (!append) return newItems;
        // Filter out items that already exist in the previous state to prevent duplicates
        const existingIds = new Set(prev.map((item: any) => item.id));
        const uniqueNewItems = newItems.filter((item: any) => !existingIds.has(item.id));
        return [...prev, ...uniqueNewItems];
      });
      
      setTotal(totalCount);
      
      // Update hasMore based on the total count and the combined length of data
      setHasMore(totalCount > (append ? (data.length + newItems.length) : newItems.length));

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, user, collectionName, page, limit, append]);

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
        });

        s.on('record_added', (record: any) => {
          if (collectionName === 'records') {
            setData(prev => {
              if (prev.find(p => p.id === record.id)) return prev;
              return [record, ...prev];
            });
            setTotal(t => t + 1);
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
            setTotal(t => Math.max(0, t - 1));
          }
        });
        
        s.on('disconnect', () => {
          console.log('[Socket] Disconnected');
        });

      } catch (err) {
        console.error('Socket connection failed', err);
      }
    };

    connectSocket();

    return () => {
      isActive = false;
      if (s) {
        s.disconnect();
      }
    };
  }, [tenant?.id, user, session?.access_token, collectionName]);

  const mutate = useCallback(async (action: 'UPDATE' | 'DELETE', payload: any, id?: string) => {
    const token = session?.access_token;
    const targetId = id || payload.id;
    if (!targetId) throw new Error('ID required for mutation');

    const method = action === 'DELETE' ? 'DELETE' : 'PATCH';
    const url = `${API_BASE_URL}/${collectionName}/${targetId}`;

    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-tenant-id': tenant?.id || ''
      },
      body: action === 'DELETE' ? undefined : JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Mutation failed');
    }

    let result = { success: true };
    if (res.status !== 204) {
      result = await res.json();
    }

    // Local state update for "snappy" feel (optimistic-ish, or at least immediate after success)
    if (action === 'DELETE') {
      setData(prev => prev.filter(p => p.id !== targetId));
      setTotal(t => Math.max(0, t - 1));
    } else {
      setData(prev => prev.map(p => p.id === targetId ? result : p));
    }

    return result;
  }, [tenant?.id, session?.access_token, collectionName]);

  return { data, loading, error, total, hasMore, refetch: () => fetchItems(true), mutate };
};
