import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { usePlatform } from './usePlatform';
import { useAuth } from './useAuth';

export interface Occupant {
  id: string;
  name: string;
  isSynthetic: boolean;
}

export interface Position {
  id: string;
  positionNumber: string;
  title: string;
  description?: string;
  parentId?: string;
  parentTitle?: string;
  occupants: Occupant[];
  occupantCount: number;
  createdAt: string;
}

const API_BASE_URL = 'http://localhost:3001/api/positions';

export const usePositions = () => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPositions = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const res = await fetch(API_BASE_URL, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (!res.ok) throw new Error('Failed to fetch positions');
      const data = await res.json();
      setPositions(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, session?.access_token]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const createPosition = async (data: Partial<Position>) => {
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
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create position');
      }
      const newPosition = await res.json();
      setPositions(prev => [...prev, newPosition]);
      toast.success(`Position ${data.title} created`);
      return newPosition;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const updatePosition = async (id: string, data: Partial<Position>) => {
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
      if (!res.ok) throw new Error('Failed to update position');
      const updated = await res.json();
      setPositions(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
      toast.success('Position updated');
      return updated;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const deletePosition = async (id: string) => {
    if (!tenant?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (!res.ok) throw new Error('Failed to delete position');
      setPositions(prev => prev.filter(p => p.id !== id));
      toast.success('Position removed');
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  return { positions, loading, createPosition, updatePosition, deletePosition, refetch: fetchPositions };
};

export const usePosition = (id?: string) => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const [position, setPosition] = useState<Position | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPosition = useCallback(async () => {
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
        throw new Error(errorData.details || errorData.error || 'Failed to fetch position');
      }
      const data = await res.json();
      setPosition(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenant?.id, id, session?.access_token]);

  useEffect(() => {
    fetchPosition();
  }, [fetchPosition]);

  const updatePosition = async (data: Partial<Position>) => {
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
      if (!res.ok) throw new Error('Failed to update position');
      const updated = await res.json();
      setPosition(prev => prev ? { ...prev, ...updated } : null);
      toast.success('Position updated successfully');
      return updated;
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const deletePosition = async () => {
    if (!tenant?.id || !id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (!res.ok) throw new Error('Failed to delete position');
      toast.success('Position removed');
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  return { position, loading, updatePosition, deletePosition, refetch: fetchPosition };
};
