import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { User, Tenant, Environment, BillingUsage, TenantMember, Team, Module } from '../types/platform';
import { API_BASE_URL } from '../config';
import { MenuConfig } from '../types/menu';
import { systemDefaultMenuConfig } from '../config/menuDefaults';
import { toast } from 'sonner';

interface PlatformContextType {
  user: User | null;
  tenant: Tenant | null;
  environment: Environment;
  setEnvironment: (env: Environment) => void;
  isLoading: boolean;
  refetchContext: () => Promise<void>;
  isDeveloper: boolean;
  capabilities: Set<string>;
  modules: Module[];
  modulesLoading: boolean;
  refreshModules: () => Promise<void>;
  menuConfig: MenuConfig | null;
  setMenuConfig: (config: MenuConfig) => void;
  updateMenuConfig: (config: MenuConfig, scope?: 'user' | 'tenant') => Promise<void>;
  billingUsage: BillingUsage | null;
  billingLoading: boolean;
  refreshBilling: () => Promise<void>;
  updateTenant: (updates: Partial<Tenant>) => Promise<void>;
  isAIAssistantOpen: boolean;
  setIsAIAssistantOpen: (open: boolean) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  isAppLauncherOpen: boolean;
  setIsAppLauncherOpen: (open: boolean) => void;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  breadcrumbOverrides: Record<string, string>;
  setBreadcrumbOverride: (id: string, label: string) => void;
  members: TenantMember[];
  membersLoading: boolean;
  refreshMembers: () => Promise<void>;
  teams: Team[];
  teamsLoading: boolean;
  refreshTeams: () => Promise<void>;
}

export const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

const fallbackContext: PlatformContextType = {
  user: null,
  tenant: null,
  environment: 'DEV',
  setEnvironment: () => {},
  isLoading: false,
  refetchContext: async () => {},
  isDeveloper: false,
  capabilities: new Set(),
  modules: [],
  modulesLoading: false,
  refreshModules: async () => {},
  menuConfig: null,
  setMenuConfig: () => {},
  updateMenuConfig: async () => {},
  billingUsage: null,
  billingLoading: false,
  refreshBilling: async () => {},
  updateTenant: async () => {},
  isAIAssistantOpen: false,
  setIsAIAssistantOpen: () => {},
  isChatOpen: false,
  setIsChatOpen: () => {},
  isAppLauncherOpen: false,
  setIsAppLauncherOpen: () => {},
  isNotificationsOpen: false,
  setIsNotificationsOpen: () => {},
  breadcrumbOverrides: {},
  setBreadcrumbOverride: () => {},
  members: [],
  membersLoading: false,
  refreshMembers: async () => {},
  teams: [],
  teamsLoading: false,
  refreshTeams: async () => {}
};

export const usePlatform = () => {
  const context = useContext(PlatformContext);
  if (context === undefined) {
    console.warn(
      '[usePlatform] Warning: usePlatform was called outside of PlatformProvider. ' +
      'Check if PlatformProvider is correctly wrapping the component tree in App.tsx. ' +
      'Returning fallback context to prevent application crash.'
    );
    return fallbackContext;
  }
  return context;
};


export const PlatformProvider = ({ children }: { children: ReactNode }) => {
  const { user: supabaseUser, loading: authLoading, session } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [environment, setEnvironment] = useState<Environment>('DEV');
  const [isLoading, setIsLoading] = useState(true);
  const [capabilities, setCapabilities] = useState<Set<string>>(new Set());
  
  const [modules, setModules] = useState<any[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [menuConfig, setMenuConfig] = useState<MenuConfig | null>(null);
  const [billingUsage, setBillingUsage] = useState<BillingUsage | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAppLauncherOpen, setIsAppLauncherOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [breadcrumbOverrides, setBreadcrumbOverrides] = useState<Record<string, string>>({});
  
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  const userRef = useRef<User | null>(null);
  const tenantRef = useRef<Tenant | null>(null);

  useEffect(() => {
    userRef.current = user;
    tenantRef.current = tenant;
  }, [user, tenant]);

  const setBreadcrumbOverride = useCallback((id: string, label: string) => {
    setBreadcrumbOverrides(prev => ({ ...prev, [id]: label }));
  }, []);

  const isSeedingRef = useRef(false);

  const seedDefaultPages = useCallback(async (tenantId: string, token: string) => {
    if (isSeedingRef.current) return;
    isSeedingRef.current = true;

    try {
      console.log('[PlatformContext] Seeding default configurable pages...');

      // 1. Create Dashboard page
      const dashRes = await fetch(`${API_BASE_URL}/api/data/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId
        },
        body: JSON.stringify({
          name: 'Dashboard',
          category: 'Workspace Pages',
          iconName: 'LayoutDashboard',
          type: 'PAGE',
          enabled: true,
          status: 'ACTIVE',
          config: {
            widgets: [
              { id: `stats-grid-1`, type: 'stats-grid', title: 'Overview Stats', w: 12 },
              { id: `active-workflows-1`, type: 'active-workflows', title: 'Active Workflows', w: 12 }
            ]
          }
        })
      });

      // 2. Create My Work page
      const workRes = await fetch(`${API_BASE_URL}/api/data/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId
        },
        body: JSON.stringify({
          name: 'My Work',
          category: 'Workspace Pages',
          iconName: 'ClipboardList',
          type: 'PAGE',
          enabled: true,
          status: 'ACTIVE',
          config: {
            widgets: [
              { id: `work-queue-1`, type: 'work-queue', title: 'My Work Inbox', w: 12 }
            ]
          }
        })
      });

      if (dashRes.ok && workRes.ok) {
        const dashPage = await dashRes.json();
        const workPage = await workRes.json();

        // 3. Construct default Workspace menu section
        const newMenuConfig = {
          sections: [
            {
              id: 'workspace-section',
              title: 'Workspace',
              items: [
                {
                  id: `module:${dashPage.id}`,
                  label: 'Dashboard',
                  iconName: 'LayoutDashboard',
                  to: `/workspace/pages/${dashPage.id}`,
                  isVisible: true
                },
                {
                  id: `module:${workPage.id}`,
                  label: 'My Work',
                  iconName: 'ClipboardList',
                  to: `/workspace/pages/${workPage.id}`,
                  isVisible: true
                }
              ]
            }
          ]
        };

        // 4. Update tenant menu configuration
        const menuConfigRes = await fetch(`${API_BASE_URL}/api/platform/menu-config`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenantId
          },
          body: JSON.stringify({ config: newMenuConfig, scope: 'tenant' })
        });

        if (menuConfigRes.ok) {
          setMenuConfig(newMenuConfig);
        }

        // 5. Reload modules list
        const refreshRes = await fetch(`${API_BASE_URL}/api/data/modules`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenantId
          }
        });
        if (refreshRes.ok) {
          const freshMods = await refreshRes.json();
          setModules(freshMods);
        }

        toast.success('Successfully provisioned configurable Workspace Pages!');
      }
    } catch (err) {
      console.error('[PlatformContext] Error seeding default pages:', err);
    } finally {
      isSeedingRef.current = false;
    }
  }, []);

  const refreshModules = useCallback(async () => {
    if (!supabaseUser || !tenant?.id) return;
    
    setModulesLoading(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/data/modules`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (res.ok) {
        const data: Module[] = await res.json();
        setModules(data);

        // Auto-provision default pages if none exist yet
        const pages = data.filter((m: any) => m.type === 'PAGE');
        if (pages.length === 0) {
          seedDefaultPages(tenant.id, token);
        }
      }
    } catch (err) {
      console.error('[PlatformContext] Failed to fetch modules:', err);
    } finally {
      setModulesLoading(false);
    }
  }, [supabaseUser, tenant?.id, session?.access_token, seedDefaultPages]);

  const updateMenuConfig = async (config: MenuConfig, scope: 'user' | 'tenant' = 'user') => {
    if (!tenant?.id) return;

    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/platform/menu-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({ config, scope })
      });

      if (res.ok) {
        let resolvedConfig = config;
        // If it's an advanced mapping configuration (tenant scope), resolve it for the active user
        if (config && typeof config === 'object' && !Array.isArray(config) && ('default' in config || 'roles' in config || 'teams' in config || 'positions' in config || 'users' in config)) {
          const tConfig = config as any;
          const userAny = user as any;
          const memberId = userAny?.memberId || userAny?.cuid;
          const teamId = userAny?.teamId;
          const positionId = userAny?.positionId;
          const roleId = userAny?.roleId || userAny?.role || 'USER';

          resolvedConfig = 
            (memberId && tConfig.users?.[memberId]) ||
            (teamId && tConfig.teams?.[teamId]) ||
            (positionId && tConfig.positions?.[positionId]) ||
            (roleId && tConfig.roles?.[roleId]) ||
            tConfig.default ||
            systemDefaultMenuConfig;
        }
        setMenuConfig(resolvedConfig);
        toast.success(`Menu configuration saved to ${scope === 'tenant' ? 'organization' : 'profile'}.`);
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save configuration');
      }
    } catch (err: any) {
      console.error('[PlatformContext] Failed to update menu config:', err);
      toast.error(err.message);
    }
  };

  const updateTenant = async (updates: Partial<Tenant>) => {
    if (!tenant?.id) return;

    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      console.log('[PlatformContext] Updating tenant:', updates);
      const res = await fetch(`${API_BASE_URL}/api/platform/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        const data = await res.json();
        console.log('[PlatformContext] Update response:', data);
        setTenant(prev => prev ? { ...prev, ...data.tenant } : data.tenant);
        toast.success('Organization settings updated.');
      } else {
        const error = await res.json();
        console.log('[PlatformContext] Update error:', error);
        throw new Error(error.error || 'Failed to update settings');
      }
    } catch (err: any) {
      console.error('[PlatformContext] Failed to update tenant:', err);
      toast.error(err.message);
    }
  };

  const refreshBilling = useCallback(async () => {
    if (!supabaseUser || !tenant?.id) return;
    
    setBillingLoading(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/billing/usage`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (res.ok) {
        const data = await res.json();
        setBillingUsage(data);
      }
    } catch (err) {
      console.error('[PlatformContext] Failed to fetch billing usage:', err);
    } finally {
      setBillingLoading(false);
    }
  }, [supabaseUser, tenant?.id, session?.access_token]);

  const refreshMembers = useCallback(async () => {
    if (!supabaseUser || !tenant?.id) return;
    
    setMembersLoading(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/members`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (err) {
      console.error('[PlatformContext] Failed to fetch members:', err);
    } finally {
      setMembersLoading(false);
    }
  }, [supabaseUser, tenant?.id, session?.access_token]);

  const refreshTeams = useCallback(async () => {
    if (!supabaseUser || !tenant?.id) return;
    
    setTeamsLoading(true);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/teams`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
      }
    } catch (err) {
      console.error('[PlatformContext] Failed to fetch teams:', err);
    } finally {
      setTeamsLoading(false);
    }
  }, [supabaseUser, tenant?.id, session?.access_token]);


  const fetchContext = useCallback(async () => {
    if (!supabaseUser) return;

    // Only show global spinner if we don't have the core context yet
    if (!userRef.current || !tenantRef.current) {
      setIsLoading(true);
    }
    
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const response = await fetch(`${API_BASE_URL}/api/platform/context`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Sync failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Prevent redundant state updates if data hasn't changed
      // We check user and tenant separately to be more granular
      const currentUserStr = JSON.stringify(userRef.current);
      const tenantRefStr = JSON.stringify(tenantRef.current);
      
      const newUserStr = JSON.stringify(data.user);
      const newTenantStr = JSON.stringify(data.tenant);

      if (currentUserStr !== newUserStr) {
        const synchronizedUser = data.user ? {
          ...data.user,
          // Extract memberId and organizational details from the nested member object or top-level fallbacks
          memberId: data.user.memberId || data.member?.id || data.membership?.id || data.tenantMember?.id,
          cuid: data.user.memberId || data.member?.id || data.membership?.id || data.tenantMember?.id,
          teamId: data.user.teamId || data.user.team_id || data.member?.teamId || data.member?.team_id || data.membership?.teamId || data.membership?.team_id || data.tenantMember?.teamId || data.tenantMember?.team_id,
          team: data.user.team || data.member?.team || data.membership?.team || data.tenantMember?.team,
          positionId: data.user.positionId || data.user.position_id || data.member?.positionId || data.member?.position_id || data.membership?.positionId || data.membership?.position_id || data.tenantMember?.positionId || data.tenantMember?.position_id,
          position: data.user.position || data.member?.position || data.membership?.position || data.tenantMember?.position
        } : null;
        setUser(synchronizedUser);
      }

      if (tenantRefStr !== newTenantStr) {
        setTenant(data.tenant);
      }
      
      // Use backend menuConfig if available, otherwise fall back to system default (empty)
      let resolvedConfig: MenuConfig;
      if (data.menuConfig && Array.isArray(data.menuConfig.sections)) {
        resolvedConfig = data.menuConfig;
      } else {
        resolvedConfig = systemDefaultMenuConfig;
      }
      setMenuConfig(resolvedConfig);
    } catch (err: any) {
      console.error('[PlatformContext] Sync Critical Failure:', err.message);
      setUser(null);
      setTenant(null);
      setMenuConfig(null);
    } finally {
      setIsLoading(false);
    }
  }, [supabaseUser, session?.access_token]);

  const refetchContext = async () => {
    await fetchContext();
  };

  useEffect(() => {
    if (authLoading) return;
    
    if (!supabaseUser) {
      setUser(null);
      setTenant(null);
      setModules([]);
      setMenuConfig(null);
      setCapabilities(new Set());
      setIsLoading(false);
      return;
    }

    fetchContext();
  }, [supabaseUser, authLoading, fetchContext]);

  useEffect(() => {
    console.log('[PlatformTrace] PlatformProvider Mounted', { 
      hasSupabaseUser: !!supabaseUser, 
      authLoading, 
      hasSession: !!session 
    });
  }, []);

  // Fetch modules once tenant is available
  useEffect(() => {
    if (tenant?.id) {
      refreshModules();
      refreshBilling();
      refreshMembers();
      refreshTeams();
    }
  }, [tenant?.id, supabaseUser, refreshModules, refreshBilling, refreshMembers, refreshTeams]);

  return (
    <PlatformContext.Provider value={{ 
      user, 
      tenant, 
      environment, 
      setEnvironment, 
      isLoading,
      refetchContext,
      isDeveloper: user?.licenceType === 'Developer' || user?.isSuperAdmin || user?.role === 'TENANT_ADMIN' || user?.role === 'admin' || user?.role === 'Admin' || false,
      capabilities,
      modules,
      modulesLoading,
      refreshModules,
      menuConfig,
      setMenuConfig,
      updateMenuConfig,
      billingUsage,
      billingLoading,
      refreshBilling,
      updateTenant,
      isAIAssistantOpen,
      setIsAIAssistantOpen,
      isChatOpen,
      setIsChatOpen,
      isAppLauncherOpen,
      setIsAppLauncherOpen,
      isNotificationsOpen,
      setIsNotificationsOpen,
      breadcrumbOverrides,
      setBreadcrumbOverride,
      members,
      membersLoading,
      refreshMembers,
      teams,
      teamsLoading,
      refreshTeams
    }}>
      {/* 
          IMPORTANT: We must always render children here. 
          If we return null during loading, components like ProtectedRoute (which usePlatform)
          will throw "must be used within PlatformProvider" because the Provider was unmounted.
      */}
      {children}
    </PlatformContext.Provider>
  );
};
