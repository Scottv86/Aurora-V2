import { DATA_API_URL } from '../config';
import { MODULES } from '../constants/modules';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const MODULE_TTL_MS = 60_000; // 60s fresh window (SWR revalidates in background after)
const RECORDS_TTL_MS = 20_000; // 20s fresh window

const moduleCache = new Map<string, CacheEntry<any>>();
const recordsCache = new Map<string, CacheEntry<{ records: any[]; total: number }>>();
const recordByIdCache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();

export const getCachedModule = (moduleId: string, contextModules: any[] = []): any | null => {
  if (!moduleId) return null;
  const cached = moduleCache.get(moduleId);
  if (cached?.data) return cached.data;
  const fromContext = contextModules.find((m) => m.id === moduleId);
  if (fromContext) return fromContext;
  const prebuilt = MODULES.find((m) => m.id === moduleId);
  return prebuilt || null;
};

export const getCachedRecords = (
  moduleId: string,
  page: number = 1,
  pageSize: number = 25
): { records: any[]; total: number } | null => {
  const key = `${moduleId}:${page}:${pageSize}`;
  return recordsCache.get(key)?.data || null;
};

export const getAllCachedRecordsAcrossWorkspace = (): { record: any; moduleId: string }[] => {
  const seen = new Set<string>();
  const results: { record: any; moduleId: string }[] = [];
  recordsCache.forEach((entry, key) => {
    const moduleId = key.split(':')[0];
    if (Array.isArray(entry.data?.records)) {
      for (const rec of entry.data.records) {
        if (rec?.id && !seen.has(rec.id)) {
          seen.add(rec.id);
          results.push({ record: rec, moduleId: rec.moduleId || moduleId });
        }
      }
    }
  });
  recordByIdCache.forEach((entry, id) => {
    if (!seen.has(id) && entry.data) {
      seen.add(id);
      results.push({ record: entry.data, moduleId: entry.data.moduleId || '' });
    }
  });
  return results;
};

export const getCachedRecordById = (recordId: string): any | null => {
  if (!recordId) return null;
  return recordByIdCache.get(recordId)?.data || null;
};

export const primeRecordCache = (record: any) => {
  if (record?.id) {
    recordByIdCache.set(record.id, { data: record, timestamp: Date.now() });
  }
};

export const invalidateModuleRecordsCache = (moduleId?: string) => {
  if (!moduleId) {
    recordsCache.clear();
    return;
  }
  for (const key of Array.from(recordsCache.keys())) {
    if (key.startsWith(`${moduleId}:`)) {
      recordsCache.delete(key);
    }
  }
};

export const fetchModule = async (
  moduleId: string,
  tenantId: string,
  token: string,
  contextModules: any[] = [],
  options?: { forceRefresh?: boolean }
) => {
  const effectiveToken = token || localStorage.getItem('aurora_token') || '';
  const now = Date.now();
  const cached = moduleCache.get(moduleId);

  if (!options?.forceRefresh && cached && now - cached.timestamp < MODULE_TTL_MS) {
    return cached.data;
  }

  const reqKey = `module:${tenantId}:${moduleId}`;
  if (inFlightRequests.has(reqKey)) {
    return inFlightRequests.get(reqKey)!;
  }

  const performFetch = async () => {
    if (effectiveToken && effectiveToken !== 'undefined' && tenantId) {
      try {
        const res = await fetch(`${DATA_API_URL}/modules/${moduleId}`, {
          headers: {
            'Authorization': `Bearer ${effectiveToken}`,
            'x-tenant-id': tenantId
          }
        });
        if (res.ok) {
          const data = await res.json();
          moduleCache.set(moduleId, { data, timestamp: Date.now() });
          return data;
        }
      } catch (err) {
        console.warn('[dataService] Failed to fetch module from DB, falling back to static context:', err);
      }
    }

    const prebuilt = MODULES.find((m) => m.id === moduleId);
    const contextModule = contextModules.find((m) => m.id === moduleId);

    if (contextModule) {
      moduleCache.set(moduleId, { data: contextModule, timestamp: Date.now() });
      return contextModule;
    }
    if (prebuilt) return prebuilt as any;
    if (cached?.data) return cached.data;

    throw new Error('Failed to fetch module');
  };

  const promise = performFetch().finally(() => {
    inFlightRequests.delete(reqKey);
  });
  inFlightRequests.set(reqKey, promise);
  return promise;
};

export const fetchRecords = async (
  moduleId: string,
  tenantId: string,
  token: string,
  page: number = 1,
  pageSize: number = 25,
  options?: { forceRefresh?: boolean }
) => {
  const effectiveToken = token || localStorage.getItem('aurora_token') || '';
  if (!effectiveToken || effectiveToken === 'undefined' || !tenantId) {
    return { records: [], total: 0 };
  }

  const cacheKey = `${moduleId}:${page}:${pageSize}`;
  const now = Date.now();
  const cached = recordsCache.get(cacheKey);

  if (!options?.forceRefresh && cached && now - cached.timestamp < RECORDS_TTL_MS) {
    return cached.data;
  }

  const reqKey = `records:${tenantId}:${cacheKey}`;
  if (inFlightRequests.has(reqKey)) {
    return inFlightRequests.get(reqKey)!;
  }

  const performFetch = async () => {
    const res = await fetch(`${DATA_API_URL}/records?moduleId=${moduleId}&page=${page}&limit=${pageSize}`, {
      headers: {
        'Authorization': `Bearer ${effectiveToken}`,
        'x-tenant-id': tenantId
      }
    });
    if (!res.ok) throw new Error('Failed to fetch records');
    const data = await res.json();
    const normalized = Array.isArray(data)
      ? { records: data, total: data.length }
      : { records: data.records || [], total: data.total ?? (data.records?.length || 0) };

    recordsCache.set(cacheKey, { data: normalized, timestamp: Date.now() });
    for (const rec of normalized.records) {
      if (rec?.id) {
        recordByIdCache.set(rec.id, { data: rec, timestamp: Date.now() });
      }
    }
    return data;
  };

  const promise = performFetch().finally(() => {
    inFlightRequests.delete(reqKey);
  });
  inFlightRequests.set(reqKey, promise);
  return promise;
};

export const bulkCreateRecords = async (
  moduleId: string,
  records: Record<string, any>[],
  tenantId: string,
  token: string,
  options?: { associations?: any[]; path?: string }
) => {
  const res = await fetch(`${DATA_API_URL}/records/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
    },
    body: JSON.stringify({
      moduleId,
      records,
      associations: options?.associations,
      path: options?.path
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to bulk create records');
  }
  invalidateModuleRecordsCache(moduleId);
  return data;
};
