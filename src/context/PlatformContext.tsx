import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { User, Tenant, Environment, BillingUsage } from '../types/platform';
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
  isDeveloper: boolean;
  capabilities: Set<string>;
  modules: any[];
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
}

export const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

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

  const setBreadcrumbOverride = useCallback((id: string, label: string) => {
    setBreadcrumbOverrides(prev => ({ ...prev, [id]: label }));
  }, []);

  const refreshModules = async () => {
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
        const data = await res.json();
        setModules(data);
      }
    } catch (err) {
      console.error('[PlatformContext] Failed to fetch modules:', err);
    } finally {
      setModulesLoading(false);
    }
  };

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
        setMenuConfig(config);
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
        setTenant(prev => prev ? { ...prev, ...data.tenant } : data.tenant);
        toast.success('Organization settings updated.');
      } else {
        const error = await res.json();
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

  useEffect(() => {
    console.log('[PlatformContext] Initializing sync effect...', { 
      hasSupabaseUser: !!supabaseUser, 
      authLoading,
      tokenPresent: !!session?.access_token 
    });

    if (authLoading) return;
    
    if (!supabaseUser) {
      console.log('[PlatformContext] No supabase user. Clearing state.');
      setUser(null);
      setTenant(null);
      setModules([]);
      setMenuConfig(null);
      setCapabilities(new Set());
      setIsLoading(false);
      return;
    }

    const fetchContext = async () => {
      // Only show global spinner if we don't have the core context yet
      if (!user || !tenant) {
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
        setUser(data.user);
        setTenant(data.tenant);
        
        // Use backend menuConfig if available, otherwise fall back to system default
        // Merge any new default items that may have been added since the config was saved
        let resolvedConfig: MenuConfig;
        if (data.menuConfig && Array.isArray(data.menuConfig.sections)) {
          const mergedSections = systemDefaultMenuConfig.sections.map(defaultSection => {
            // Support legacy ID mapping during transition
            const savedSection = (data.menuConfig.sections as any[]).find((s: any) => 
              s.id === defaultSection.id || (defaultSection.id === 'platform' && s.id === 'operations')
            );
            
            if (!savedSection) return defaultSection;
            
            // Find items in the default that aren't in the saved config
            const savedItemIds = new Set((savedSection.items || []).map((i: any) => i.id));
            const missingItems = defaultSection.items.filter(i => {
              // Handle item rename transition: if we have 'people' or 'entities' saved but now expect 'people-orgs'
              if (i.id === 'people-orgs' && (savedItemIds.has('people') || savedItemIds.has('entities'))) return false;
              return !savedItemIds.has(i.id);
            });
            
            // Filter out saved items that are no longer in defaults, unless they are dynamically generated
            const currentDefaultItemIds = new Set(defaultSection.items.map(i => i.id));
            const validSavedItems = (savedSection.items || [])
              .filter((i: any) => 
                currentDefaultItemIds.has(i.id) || 
                (i.id === 'people' && currentDefaultItemIds.has('people-orgs')) ||
                (i.id === 'entities' && currentDefaultItemIds.has('people-orgs')) ||
                (i.id && i.id.startsWith('module:'))
              )
              .map((savedItem: any) => {
                if (savedItem.id.startsWith('module:')) return savedItem;
                
                // Handle item rename transition
                const isLegacy = savedItem.id === 'people' || savedItem.id === 'entities';
                const lookupId = (isLegacy && currentDefaultItemIds.has('people-orgs')) ? 'people-orgs' : savedItem.id;
                const defaultItem = defaultSection.items.find(i => i.id === lookupId);
                
                // Inherit code updates (like 'to', 'label') but preserve user's visibility setting
                return defaultItem ? { ...defaultItem, isVisible: savedItem.isVisible ?? defaultItem.isVisible } : savedItem;
              });

            return {
              ...savedSection,
              id: defaultSection.id, // Ensure we use the new ID
              title: defaultSection.title, // Ensure we use the new Title
              items: [...(validSavedItems || []), ...(missingItems || [])]
            };
          });
          // Legacy Transition: Filter out 'operations' from custom sections if 'platform' is now in defaults
          const defaultSectionIds = new Set(systemDefaultMenuConfig.sections.map(s => s.id));
          const customSections = data.menuConfig.sections.filter((s: any) => {
            if (s.id === 'operations' && defaultSectionIds.has('platform')) return false;
            return !defaultSectionIds.has(s.id);
          });
          resolvedConfig = { sections: [...mergedSections, ...customSections] };
        } else {
          resolvedConfig = systemDefaultMenuConfig;
        }
        setMenuConfig(resolvedConfig);

        console.log(`[PlatformContext] Sync Success: ${data.user.email} @ ${data.tenant?.name || 'No Tenant'}`);
      } catch (err: any) {
        console.error('[PlatformContext] Sync Critical Failure:', err.message);
        setUser(null);
        setTenant(null);
        setMenuConfig(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContext();
  }, [supabaseUser, authLoading, session?.access_token]);

  // Fetch modules once tenant is available
  useEffect(() => {
    if (tenant?.id) {
      refreshModules();
      refreshBilling();
    }
  }, [tenant?.id, supabaseUser, refreshBilling]);

  return (
    <PlatformContext.Provider value={{ 
      user, 
      tenant, 
      environment, 
      setEnvironment, 
      isLoading,
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
      setBreadcrumbOverride
    }}>
      {children}
    </PlatformContext.Provider>
  );
};
