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
  
  const [rawData, setRawData] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Track the current source configuration to avoid redundant fetches
  const lastConfigRef = useRef<string>("");
  const configKey = `${lookupSource}-${platformEntity}-${targetModuleId}-${targetPlatformModuleId}-${globalListId}-${tenant?.id}`;

  // 1. Sync Effect: Handles Local/Platform sources and Global Lists
  useEffect(() => {
    if (!lookupSource) {
      setRawData([]);
      setLoading(false);
      return;
    }

    if (lookupSource === 'platform' || lookupSource === 'tenant_users') {
      const entity = platformEntity || 'users';
      
      if (entity === 'users') {
        setRawData(users.map(u => ({ 
          id: u.id, 
          name: lookupDisplayField ? u[lookupDisplayField] : (u.name || u.email), 
          ...u 
        })));
        setLoading(usersLoading);
      } else if (entity === 'teams') {
        setRawData(teams.map(t => ({ 
          id: t.id, 
          name: lookupDisplayField ? t[lookupDisplayField] : t.name, 
          ...t 
        })));
        setLoading(teamsLoading);
      } else if (entity === 'roles' || entity === 'positions') {
        setRawData(positions.map(p => ({ 
          id: p.id, 
          name: lookupDisplayField ? p[lookupDisplayField] : (p.title || p.name), 
          ...p 
        })));
        setLoading(positionsLoading);
      } else if (entity === 'security_groups') {
        setRawData(securityGroups.map(g => ({ 
          id: g.id, 
          name: lookupDisplayField ? g[lookupDisplayField] : g.name, 
          ...g 
        })));
        setLoading(groupsLoading);
      } else if (entity === 'modules' && !targetPlatformModuleId) {
        setRawData(MODULES.map(m => ({ id: m.id, name: m.name })));
        setLoading(false);
      }
      return;
    }

    if (lookupSource === 'global_list') {
      if (!gLoading && gItems && gList) {
        const displayColId = gList.columns[0]?.id;
        setRawData(gItems.map(item => ({ 
          id: item.id, 
          name: String(item.data[displayColId] || ''),
          value: item.data[displayColId],
          ...item.data
        })));
        setLoading(false);
      } else {
        setLoading(gLoading);
      }
    }
  }, [
    lookupSource, platformEntity, lookupDisplayField,
    users, usersLoading,
    teams, teamsLoading,
    positions, positionsLoading,
    securityGroups, groupsLoading,
    gItems, gLoading, gList
  ]);

  // 2. Async Effect: Handles Network-based fetches (Module Records & Platform Modules)
  useEffect(() => {
    const isAsync = (lookupSource === 'module_records' && targetModuleId) || 
                    (lookupSource === 'platform' && platformEntity === 'modules' && targetPlatformModuleId);

    if (!isAsync) return;

    // Only fetch if config has actually changed or we have no data
    if (lastConfigRef.current === configKey && rawData.length > 0) return;
    lastConfigRef.current = configKey;

    const fetchData = async () => {
      setLoading(true);
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
            console.log(`[usePlatformLookup] Received module records:`, json.records?.length || 0);
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
            console.log(`[usePlatformLookup] Fetching platform module: ${url}`, { tenantId: tenant?.id });
            const res = await fetch(url, {
              headers: {
                'Authorization': `Bearer ${session?.access_token}`,
                'x-tenant-id': tenant?.id || ''
              }
            });
            if (res.ok) {
              const json = await res.json();
              console.log(`[usePlatformLookup] Received platform records for ${targetPlatformModuleId}:`, Array.isArray(json) ? json.length : (json.records?.length || 0));
              results = (Array.isArray(json) ? json : (json.records || [])).map((r: any) => {
                let item = { ...r };
                if (platformMod.id === 'people-organisations') {
                  const personName = r.person ? `${r.person.firstName || ''} ${r.person.lastName || ''}`.trim() : '';
                  const orgName = r.organization?.legalName || '';
                  const computedName = r.partyType === 'PERSON' ? personName : orgName;
                  
                  item = { 
                    ...item, 
                    ...(r.person || {}), 
                    ...(r.organization || {}),
                    name: computedName
                  };
                }

                const displayName = (lookupDisplayField && item[lookupDisplayField]) 
                  ? String(item[lookupDisplayField]) 
                  : (item.name || item.fullName || item.id || 'Unnamed Record');

                return { id: r.id, name: displayName, ...item };
              });
            }
          }
        }

        setRawData(results);
      } catch (err) {
        console.error('Lookup fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [configKey, session?.access_token, lookupDisplayField]);

  const filteredData = useMemo(() => applyFilters(rawData, activeFilters), [rawData, activeFilters]);

  return { data: filteredData, loading };
};
