import { useState, useEffect, useMemo, useRef } from 'react';
import { useUsers } from './useUsers';
import { useTeams } from './useTeams';
import { usePositions } from './usePositions';
import { usePermissionGroups } from './usePermissionGroups';
import { MODULES } from '../constants/modules';
import { PLATFORM_MODULES } from '../constants/platformModules';
import { usePlatform } from './usePlatform';
import { useAuth } from './useAuth';
import { LookupFilter } from '../types/platform';
import { useGlobalList } from './useGlobalList';
import { API_BASE_URL } from '../config';

export interface LookupItem {
  id: string;
  name: string;
  [key: string]: any;
}

const applyFilters = (data: any[], filters: LookupFilter[]) => {
  if (!filters || filters.length === 0) return data;
  
  return data.filter(item => {
    return filters.every(filter => {
      const itemValue = item[filter.field];
      const filterValue = filter.value;

      if (filter.operator === 'is_empty') return !itemValue || itemValue === '';
      if (filter.operator === 'not_empty') return !!itemValue && itemValue !== '';

      switch (filter.operator) {
        case 'equals':
          return String(itemValue) === String(filterValue);
        case 'not_equals':
          return String(itemValue) !== String(filterValue);
        case 'contains':
          return String(itemValue || '').toLowerCase().includes(String(filterValue || '').toLowerCase());
        case 'greater_than':
          return Number(itemValue) > Number(filterValue);
        case 'less_than':
          return Number(itemValue) < Number(filterValue);
        default:
          return true;
      }
    });
  });
};

// Global cache to share lookup data across hook instances
const lookupCache = new Map<string, { data: any[], timestamp: number }>();
const pendingRequests = new Map<string, Promise<any[]>>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

export const usePlatformLookup = (field: any) => {
  const { 
    lookupSource, 
    platformEntity, 
    targetModuleId, 
    targetPlatformModuleId, 
    globalListId, 
    lookupFilters = [], 
    userFilters,
    lookupDisplayField
  } = field || {};
  const activeFilters = useMemo(() => lookupFilters.length > 0 ? lookupFilters : (userFilters || []), [JSON.stringify(lookupFilters), JSON.stringify(userFilters)]);
  
  const { tenant } = usePlatform();
  
  // Debug log to ensure context is available
  useEffect(() => {
    if (!tenant) {
      console.warn('[usePlatformLookup] Platform context found but tenant is null');
    }
  }, [tenant]);
  const { session } = useAuth();
  
  const { members: users, loading: usersLoading } = useUsers(lookupSource === 'platform' && platformEntity === 'users');
  const { teams, loading: teamsLoading } = useTeams(lookupSource === 'platform' && platformEntity === 'teams');
  const { positions, loading: positionsLoading } = usePositions(lookupSource === 'platform' && (platformEntity === 'roles' || platformEntity === 'positions'));
  const { groups: securityGroups, loading: groupsLoading } = usePermissionGroups(lookupSource === 'platform' && platformEntity === 'security_groups');
  const { list: gList, items: gItems, loading: gLoading } = useGlobalList(lookupSource === 'global_list' ? globalListId : null);
  
  
  // Track the current source configuration to avoid redundant fetches

  const lastConfigRef = useRef<string>("");
  const configKey = `${lookupSource}-${platformEntity}-${targetModuleId}-${targetPlatformModuleId}-${globalListId}-${tenant?.id}`;

  // 1. Synchronous Data Source Resolver (Memoized)
  const syncData = useMemo<LookupItem[]>(() => {
    if (lookupSource === 'platform' || lookupSource === 'tenant_users') {
      const entity = platformEntity || 'users';
      
      if (entity === 'users') {
        return users.map(u => ({ 
          id: u.id, 
          name: lookupDisplayField ? (u as any)[lookupDisplayField] : (u.name || u.email), 
          ...u 
        }));
      } else if (entity === 'teams') {
        return teams.map(t => ({ 
          id: t.id, 
          name: lookupDisplayField ? (t as any)[lookupDisplayField] : t.name, 
          ...t 
        }));
      } else if (entity === 'roles' || entity === 'positions') {
        return positions.map(p => ({ 
          id: p.id, 
          name: lookupDisplayField ? (p as any)[lookupDisplayField] : p.title, 
          ...p 
        }));
      } else if (entity === 'security_groups') {
        return securityGroups.map(g => ({ 
          id: g.id, 
          name: lookupDisplayField ? (g as any)[lookupDisplayField] : g.name, 
          ...g 
        }));
      } else if (entity === 'modules' && !targetPlatformModuleId) {
        return MODULES.map(m => ({ id: m.id, name: m.name }));
      }
    }

    if (lookupSource === 'global_list') {
      if (!gLoading && gItems && gList) {
        const displayColId = gList.columns[0]?.id;
        return gItems.map(item => ({ 
          id: item.id, 
          name: String(item.data[displayColId] || ''),
          value: item.data[displayColId],
          ...item.data
        }));
      }
    }

    return [];
  }, [
    lookupSource, platformEntity, lookupDisplayField, targetPlatformModuleId,
    users, teams, positions, securityGroups, gItems, gList, gLoading
  ]);

  // Combined Loading State
  const isSyncLoading = useMemo(() => {
    if (lookupSource === 'platform' || lookupSource === 'tenant_users') {
      const entity = platformEntity || 'users';
      if (entity === 'users') return usersLoading;
      if (entity === 'teams') return teamsLoading;
      if (entity === 'roles' || entity === 'positions') return positionsLoading;
      if (entity === 'security_groups') return groupsLoading;
    }
    if (lookupSource === 'global_list') return gLoading;
    return false;
  }, [lookupSource, platformEntity, usersLoading, teamsLoading, positionsLoading, groupsLoading, gLoading]);

  // 2. Async Data Source (State management for network fetches)
  const [asyncData, setAsyncData] = useState<LookupItem[]>([]);
  const [asyncLoading, setAsyncLoading] = useState(false);
  
  const isAsync = (lookupSource === 'module_records' && targetModuleId) || 
                  (lookupSource === 'platform' && platformEntity === 'modules' && targetPlatformModuleId);

  // Determine final data and loading state
  const rawData = isAsync ? asyncData : syncData;
  const loading = isAsync ? asyncLoading : isSyncLoading;


  // 2. Async Effect: Handles Network-based fetches (Module Records & Platform Modules)
  useEffect(() => {
    const isAsync = (lookupSource === 'module_records' && targetModuleId) || 
                    (lookupSource === 'platform' && platformEntity === 'modules' && targetPlatformModuleId);

    if (!isAsync) return;

    // Check cache first
    const cached = lookupCache.get(configKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      setAsyncData(cached.data);
      setAsyncLoading(false);
      return;
    }

    // Only fetch if config has actually changed
    if (lastConfigRef.current === configKey && asyncData.length > 0) return;
    lastConfigRef.current = configKey;

    const fetchData = async () => {
      // If there's already a request in flight for this config, wait for it
      if (pendingRequests.has(configKey)) {
        setAsyncLoading(true);
        try {
          const results = await pendingRequests.get(configKey)!;
          setAsyncData(results);
        } finally {
          setAsyncLoading(false);
        }
        return;
      }

      setAsyncLoading(true);
      
      const fetchPromise = (async () => {
        try {
          let results: any[] = [];
          
          if (lookupSource === 'module_records' && targetModuleId) {
            const url = `${API_BASE_URL}/api/data/records?moduleId=${targetModuleId}`;
            console.log(`[usePlatformLookup] Fetching module records: ${url}`, { tenantId: tenant?.id });
            const res = await fetch(url, {
              headers: {
                'Authorization': `Bearer ${session?.access_token}`,
                'x-tenant-id': tenant?.id || ''
              }
            });
            if (res.ok) {
              const json = await res.json();
              results = (json.records || []).map((r: any) => ({
                id: r.id,
                name: lookupDisplayField ? r[lookupDisplayField] : (r.fullName || r.name || r.title || r.subject || r.subjectLine || r.id),
                ...r
              }));
            }
          } else if (lookupSource === 'platform' && platformEntity === 'modules' && targetPlatformModuleId) {
            const platformMod = PLATFORM_MODULES.find(m => m.id === targetPlatformModuleId);
            if (platformMod) {
              const url = `${API_BASE_URL}${platformMod.apiEndpoint}`;
              const res = await fetch(url, {
                headers: {
                  'Authorization': `Bearer ${session?.access_token}`,
                  'x-tenant-id': tenant?.id || ''
                }
              });
              if (res.ok) {
                const json = await res.json();
                results = (Array.isArray(json) ? json : (json.records || [])).map((r: any) => {
                  let item = { ...r };
                  if (platformMod.id === 'people-organisations') {
                    const personName = r.person ? `${r.person.firstName || ''} ${r.person.lastName || ''}`.trim() : '';
                    const orgName = r.organization?.legalName || '';
                    item = { ...item, ...(r.person || {}), ...(r.organization || {}), name: r.partyType === 'PERSON' ? personName : orgName };
                  }
                  const displayName = (lookupDisplayField && item[lookupDisplayField]) ? String(item[lookupDisplayField]) : (item.name || item.fullName || item.id || 'Unnamed Record');
                  return { id: r.id, name: displayName, ...item };
                });
              }
            }
          }

          // Update cache
          lookupCache.set(configKey, { data: results, timestamp: Date.now() });
          return results;
        } catch (err) {
          console.error('Lookup fetch error:', err);
          return [];
        } finally {
          pendingRequests.delete(configKey);
        }
      })();

      pendingRequests.set(configKey, fetchPromise);
      
      const results = await fetchPromise;
      setAsyncData(results);
      setAsyncLoading(false);
    };

    fetchData();
  }, [configKey, session?.access_token, lookupDisplayField, lookupSource, targetModuleId, targetPlatformModuleId]);



  const filteredData = useMemo(() => applyFilters(rawData, activeFilters), [rawData, activeFilters]);

  return { data: filteredData, loading };
};
