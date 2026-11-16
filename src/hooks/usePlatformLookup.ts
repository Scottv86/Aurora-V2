import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
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
    optionsSource,
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
  const { moduleId, id } = useParams();
  const activeModuleId = moduleId || id;
  
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
  
  const effectiveSource = lookupSource || optionsSource;
  const { list: gList, items: gItems, loading: gLoading } = useGlobalList(effectiveSource === 'global_list' ? globalListId : null);
  
  
  // Track the current source configuration to avoid redundant fetches

  const lastConfigRef = useRef<string>("");
  const configKey = `${effectiveSource}-${platformEntity}-${targetModuleId}-${targetPlatformModuleId}-${globalListId}-${field?.connectorId || ''}-${tenant?.id}`;

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

    if (effectiveSource === 'global_list') {
      if (!gLoading && gItems && gList) {
        // If lookupDisplayField is set, try to find the corresponding column ID
        let displayColId = gList.columns[0]?.id;
        if (lookupDisplayField) {
          const col = gList.columns.find(c => c.id === lookupDisplayField || c.name === lookupDisplayField);
          if (col) displayColId = col.id;
        }

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
    effectiveSource, lookupSource, optionsSource, platformEntity, lookupDisplayField, targetPlatformModuleId, globalListId,
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
    if (effectiveSource === 'global_list') return gLoading;
    return false;
  }, [lookupSource, effectiveSource, platformEntity, usersLoading, teamsLoading, positionsLoading, groupsLoading, gLoading]);

  const isDirectoryLookup =
    (effectiveSource === 'platform' &&
      ((platformEntity === 'modules' && targetPlatformModuleId === 'people-organisations') ||
        platformEntity === 'people-organisations' ||
        platformEntity === 'directory')) ||
    field?.type === 'party';

  // 2. Async Data Source (State management for network fetches — synchronously pre-hydrated for Directory)
  const [asyncData, setAsyncData] = useState<LookupItem[]>(() => {
    const cached = lookupCache.get(configKey);
    if (cached && cached.data.length > 0) return cached.data;
    if (isDirectoryLookup) {
      try {
        const raw = localStorage.getItem('aurora_directory_summary_cache_v1');
        if (raw) {
          const entries: [string, any][] = JSON.parse(raw);
          if (Array.isArray(entries)) {
            return entries.map(([id, r]) => ({
              id,
              name: r.displayName || 'Unnamed Entity',
              ...r,
              ...(r.person || {}),
              ...(r.organization || {}),
            }));
          }
        }
      } catch {
        // Ignore storage read error
      }
    }
    return [];
  });
  const [asyncLoading, setAsyncLoading] = useState(false);

  const isAsync = (effectiveSource === 'module_records' && targetModuleId) || 
                  (effectiveSource === 'platform' && platformEntity === 'modules' && targetPlatformModuleId) ||
                  isDirectoryLookup ||
                  (effectiveSource === 'connector' && field?.connectorId);

  // Determine final data and loading state
  const rawData = isAsync ? asyncData : syncData;
  const loading = isAsync ? asyncLoading : isSyncLoading;


  // 2. Async Effect: Handles Network-based fetches (Module Records, Platform Modules, and Connectors)
  useEffect(() => {
    const isAsync = (effectiveSource === 'module_records' && targetModuleId) || 
                    (effectiveSource === 'platform' && platformEntity === 'modules' && targetPlatformModuleId) ||
                    isDirectoryLookup ||
                    (effectiveSource === 'connector' && field?.connectorId);

    if (!isAsync || !tenant?.id) return;

    const token = (import.meta as any).env?.VITE_DEV_TOKEN || session?.access_token || localStorage.getItem('aurora_token');
    if (!token) return;

    // Check cache first (ignore cached empty array if it was cached during initial load)
    const cached = lookupCache.get(configKey);
    if (cached && cached.data.length > 0 && (Date.now() - cached.timestamp < CACHE_TTL)) {
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
          let fetchOk = false;
          
          if (lookupSource === 'module_records' && targetModuleId) {
            const url = `${API_BASE_URL}/api/data/records?moduleId=${targetModuleId}`;
            const res = await fetch(url, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'x-tenant-id': tenant?.id || ''
              }
            });
            if (res.ok) {
              fetchOk = true;
              const json = await res.json();
              results = (json.records || []).map((r: any) => ({
                id: r.id,
                name: lookupDisplayField ? r[lookupDisplayField] : (r.fullName || r.name || r.title || r.subject || r.subjectLine || r.id),
                ...r
              }));
            }
          } else if (
            (lookupSource === 'platform' && platformEntity === 'modules' && targetPlatformModuleId) ||
            isDirectoryLookup
          ) {
            const effectiveModId = isDirectoryLookup ? 'people-organisations' : targetPlatformModuleId;
            const platformMod = PLATFORM_MODULES.find(m => m.id === effectiveModId);
            if (platformMod) {
              const url = `${API_BASE_URL}${platformMod.apiEndpoint}`;
              const res = await fetch(url, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'x-tenant-id': tenant?.id || ''
                }
              });
              if (res.ok) {
                fetchOk = true;
                const json = await res.json();
                const rawItems = Array.isArray(json) ? json : (json.records || json.parties || json.items || []);
                results = rawItems.map((r: any) => {
                  let item = { ...r };
                  if (platformMod.id === 'people-organisations') {
                    const personName = r.person ? `${r.person.firstName || ''} ${r.person.lastName || ''}`.trim() : '';
                    const orgName = r.organization?.legalName || r.organization?.tradingName || '';
                    const resolvedName = r.displayName || (r.partyType === 'PERSON' ? personName : orgName) || 'Unnamed Entity';
                    const primaryAddr = Array.isArray(r.addresses) && r.addresses[0]
                      ? [r.addresses[0].line1, r.addresses[0].city, r.addresses[0].state, r.addresses[0].postalCode].filter(Boolean).join(', ')
                      : '';
                    item = {
                      ...item,
                      ...(r.person || {}),
                      ...(r.organization || {}),
                      ...(r.customData || {}),
                      name: resolvedName,
                      fullName: resolvedName,
                      displayName: resolvedName,
                      primaryAddress: primaryAddr,
                    };
                  }
                  const displayName = (lookupDisplayField && item[lookupDisplayField]) ? String(item[lookupDisplayField]) : (item.name || item.fullName || item.id || 'Unnamed Record');
                  return { id: r.id, name: displayName, ...item };
                });
              }
            }
          } else if (effectiveSource === 'connector' && field?.connectorId) {
            const url = `${API_BASE_URL}/api/nexus-proxy/execute`;
            const res = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-tenant-id': tenant?.id || ''
              },
              body: JSON.stringify({
                connectorId: field.connectorId,
                moduleId: activeModuleId,
                noReshape: true,
                payload: {}
              })
            });
            if (res.ok) {
              fetchOk = true;
              const json = await res.json();
              const rawData = json.data || json;
              const arrayData = Array.isArray(rawData) ? rawData : (rawData && typeof rawData === 'object' && Object.keys(rawData).length > 0) ? [rawData] : [];
              results = arrayData.map((item: any, idx: number) => {
                const rawItem = typeof item === 'object' ? item : { value: item };
                const labelField = field.connectorLabelField || 'name';
                const valueField = field.connectorValueField || 'id';
                return {
                  id: String(rawItem[valueField] !== undefined ? rawItem[valueField] : (rawItem.id || rawItem.value || idx)),
                  name: String(rawItem[labelField] !== undefined ? rawItem[labelField] : (rawItem.name || rawItem.value || JSON.stringify(rawItem))),
                  ...rawItem
                };
              });
            }
          }

          // Update cache only when fetch succeeded
          if (fetchOk) {
            lookupCache.set(configKey, { data: results, timestamp: Date.now() });
          }
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

    const handleDirectoryUpdate = () => {
      if (isDirectoryLookup) {
        lookupCache.delete(configKey);
        lastConfigRef.current = '';
        fetchData();
      }
    };
    window.addEventListener('aurora:directory-updated', handleDirectoryUpdate);
    return () => window.removeEventListener('aurora:directory-updated', handleDirectoryUpdate);
  }, [configKey, tenant?.id, session?.access_token, isDirectoryLookup, lookupDisplayField, effectiveSource, lookupSource, optionsSource, targetModuleId, targetPlatformModuleId, activeModuleId, field?.connectorId, field?.connectorLabelField, field?.connectorValueField]);



  const filteredData = useMemo(() => applyFilters(rawData, activeFilters), [rawData, activeFilters]);

  return { data: filteredData, loading };
};
