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
  const { session } = useAuth();
  
  const { members: users, loading: usersLoading } = useUsers(lookupSource === 'platform' && platformEntity === 'users');
  const { teams, loading: teamsLoading } = useTeams(lookupSource === 'platform' && platformEntity === 'teams');
  const { positions: roles, loading: rolesLoading } = usePositions(lookupSource === 'platform' && platformEntity === 'roles');
  const { groups: securityGroups, loading: groupsLoading } = usePermissionGroups(lookupSource === 'platform' && platformEntity === 'security_groups');
  const { list: gList, items: gItems, loading: gLoading } = useGlobalList(lookupSource === 'global_list' ? globalListId : null);
  
  const [rawData, setRawData] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Track the current source configuration to avoid redundant fetches
  const lastConfigRef = useRef<string>("");
  const configKey = `${lookupSource}-${platformEntity}-${targetModuleId}-${targetPlatformModuleId}-${globalListId}-${tenant?.id}`;

  useEffect(() => {
    if (!lookupSource) {
      setRawData([]);
      setLoading(false);
      return;
    }

    // Handle Local/Platform sources (sync with their respective hooks)
    if (lookupSource === 'platform' || lookupSource === 'tenant_users') {
      const entity = platformEntity || 'users';
      
      if (entity === 'users') {
        setRawData(users.map(u => ({ 
          id: u.id, 
          name: lookupDisplayField ? u[lookupDisplayField] : (u.name || u.email), 
          ...u 
        })));
        setLoading(usersLoading);
        return;
      }
      if (entity === 'teams') {
        setRawData(teams.map(t => ({ id: t.id, name: lookupDisplayField ? t[lookupDisplayField] : t.name, ...t })));
        setLoading(teamsLoading);
        return;
      }
      if (entity === 'roles') {
        setRawData(roles.map(r => ({ id: r.id, name: lookupDisplayField ? r[lookupDisplayField] : r.name, ...r })));
        setLoading(rolesLoading);
        return;
      }
      if (entity === 'security_groups') {
        setRawData(securityGroups.map(g => ({ id: g.id, name: lookupDisplayField ? g[lookupDisplayField] : g.name, ...g })));
        setLoading(groupsLoading);
        return;
      }
      
      // If it's "modules" but no specific target, show the list of platform modules (sync)
      if (entity === 'modules' && !targetPlatformModuleId) {
        setRawData(MODULES.map(m => ({ id: m.id, name: m.name })));
        setLoading(false);
        return;
      }
    }

    // Handle Global Lists (sync with useGlobalList)
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
      return;
    }

    // Handle Async sources (Module Records & Platform Module Records)
    const isAsync = (lookupSource === 'module_records' && targetModuleId) || 
                    (lookupSource === 'platform' && platformEntity === 'modules' && targetPlatformModuleId);

    if (isAsync) {
      // Only fetch if config has actually changed
      if (lastConfigRef.current === configKey) return;
      lastConfigRef.current = configKey;

      const fetchData = async () => {
        setLoading(true);
        try {
          let results: any[] = [];
          
          if (lookupSource === 'module_records' && targetModuleId) {
            const res = await fetch(`http://localhost:3001/api/data/records?moduleId=${targetModuleId}`, {
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
              const res = await fetch(`http://localhost:3001${platformMod.apiEndpoint}`, {
                headers: {
                  'Authorization': `Bearer ${session?.access_token}`,
                  'x-tenant-id': tenant?.id || ''
                }
              });
              if (res.ok) {
                const json = await res.json();
                results = (Array.isArray(json) ? json : (json.records || [])).map((r: any) => {
                  if (lookupDisplayField && r[lookupDisplayField]) {
                    return { id: r.id, name: r[lookupDisplayField], ...r };
                  }
                  if (platformMod.id === 'people-organisations') {
                    const name = r.partyType === 'PERSON' 
                      ? `${r.person?.firstName} ${r.person?.lastName}`
                      : r.organization?.legalName;
                    return { 
                      id: r.id, 
                      name: name || r.id, 
                      ...r,
                      ...(r.person || {}),
                      ...(r.organization || {})
                    };
                  }
                  return { id: r.id, name: r.name || r.id, ...r };
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
    }
  }, [
    configKey,
    users, usersLoading,
    teams, teamsLoading,
    roles, rolesLoading,
    securityGroups, groupsLoading,
    gItems, gLoading,
    session?.access_token
  ]);

  const filteredData = useMemo(() => applyFilters(rawData, activeFilters), [rawData, activeFilters]);

  return { data: filteredData, loading };
};
