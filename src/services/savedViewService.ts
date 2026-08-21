import { API_BASE_URL } from '../config';
import { TableFilterState } from '../components/UI/TableFilterBar';

export interface SavedViewEntity {
  id: string;
  tenantId: string;
  userId?: string | null;
  scopeType: 'MODULE' | 'QUEUE' | 'WORKSPACE';
  scopeId: string;
  name: string;
  description?: string | null;
  icon?: string;
  color?: string | null;
  filterState: TableFilterState;
  isShared: boolean;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const fetchSavedViews = async (
  scopeType: string,
  scopeId: string,
  tenantId: string,
  token?: string
): Promise<SavedViewEntity[]> => {
  if (!tenantId || !scopeId) return [];
  const res = await fetch(`${API_BASE_URL}/api/saved-views?scopeType=${encodeURIComponent(scopeType)}&scopeId=${encodeURIComponent(scopeId)}`, {
    headers: {
      'x-tenant-id': tenantId,
      'Authorization': token ? `Bearer ${token}` : ''
    }
  });

  if (!res.ok) {
    throw new Error('Failed to fetch saved views');
  }

  return res.json();
};

export const saveSavedView = async (
  viewData: Partial<SavedViewEntity>,
  tenantId: string,
  token?: string
): Promise<SavedViewEntity> => {
  if (!tenantId) throw new Error('Tenant ID is required');

  const res = await fetch(`${API_BASE_URL}/api/saved-views`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(viewData)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save view');
  }

  return res.json();
};

export const deleteSavedView = async (
  viewId: string,
  tenantId: string,
  token?: string
): Promise<{ success: boolean; id: string }> => {
  if (!tenantId || !viewId) throw new Error('Tenant ID and View ID are required');

  const res = await fetch(`${API_BASE_URL}/api/saved-views/${viewId}`, {
    method: 'DELETE',
    headers: {
      'x-tenant-id': tenantId,
      'Authorization': token ? `Bearer ${token}` : ''
    }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete saved view');
  }

  return res.json();
};

export const setDefaultSavedView = async (
  viewId: string,
  isDefault: boolean,
  tenantId: string,
  token?: string
): Promise<SavedViewEntity> => {
  if (!tenantId || !viewId) throw new Error('Tenant ID and View ID are required');

  const res = await fetch(`${API_BASE_URL}/api/saved-views/${viewId}/default`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify({ isDefault })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update default view');
  }

  return res.json();
};
