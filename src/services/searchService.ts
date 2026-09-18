import { API_BASE_URL } from '../config';
import { SavedSearchEntity, SearchExecutionPayload, SearchExecutionResult } from '../types/searchBuilder';

export const fetchSavedSearches = async (
  tenantId: string,
  token?: string
): Promise<SavedSearchEntity[]> => {
  if (!tenantId) return [];
  const res = await fetch(`${API_BASE_URL}/api/searches`, {
    headers: {
      'x-tenant-id': tenantId,
      'Authorization': token ? `Bearer ${token}` : ''
    }
  });
  if (!res.ok) {
    throw new Error('Failed to fetch searches');
  }
  return res.json();
};

export const fetchSavedSearch = async (
  id: string,
  tenantId: string,
  token?: string
): Promise<SavedSearchEntity> => {
  const res = await fetch(`${API_BASE_URL}/api/searches/${encodeURIComponent(id)}`, {
    headers: {
      'x-tenant-id': tenantId,
      'Authorization': token ? `Bearer ${token}` : ''
    }
  });
  if (!res.ok) {
    throw new Error('Failed to fetch search definition');
  }
  return res.json();
};

export const saveSavedSearch = async (
  search: Partial<SavedSearchEntity>,
  tenantId: string,
  token?: string
): Promise<SavedSearchEntity> => {
  const res = await fetch(`${API_BASE_URL}/api/searches`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(search)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to save search');
  }
  return res.json();
};

export const deleteSavedSearch = async (
  id: string,
  tenantId: string,
  token?: string
): Promise<boolean> => {
  const res = await fetch(`${API_BASE_URL}/api/searches/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'x-tenant-id': tenantId,
      'Authorization': token ? `Bearer ${token}` : ''
    }
  });
  return res.ok;
};

export const executeSearch = async (
  payload: SearchExecutionPayload,
  tenantId: string,
  token?: string
): Promise<SearchExecutionResult> => {
  const res = await fetch(`${API_BASE_URL}/api/searches/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to execute search');
  }
  return res.json();
};

export const compileSearchSql = async (
  payload: any,
  tenantId: string,
  token?: string
): Promise<string> => {
  const res = await fetch(`${API_BASE_URL}/api/searches/compile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) return '';
  const data = await res.json();
  return data.sql || '';
};
