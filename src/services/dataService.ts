import { DATA_API_URL } from '../config';
import { MODULES } from '../constants/modules';

export const fetchModule = async (moduleId: string, tenantId: string, token: string, contextModules: any[] = []) => {
  const prebuilt = MODULES.find(m => m.id === moduleId);
  const contextModule = contextModules.find(m => m.id === moduleId);
  
  if (prebuilt) return prebuilt as any;
  if (contextModule) return contextModule;
  
  const res = await fetch(`${DATA_API_URL}/modules/${moduleId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
    }
  });
  if (!res.ok) throw new Error('Failed to fetch module');
  return res.json();
};

export const fetchRecords = async (moduleId: string, tenantId: string, token: string, page: number = 1, pageSize: number = 25) => {
  const res = await fetch(`${DATA_API_URL}/records?moduleId=${moduleId}&page=${page}&limit=${pageSize}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
    }
  });
  if (!res.ok) throw new Error('Failed to fetch records');
  return res.json();
};
