import { createContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { User, Tenant, Environment } from '../types/platform';
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
  modules: any[];
  modulesLoading: boolean;
  refreshModules: () => Promise<void>;
  menuConfig: MenuConfig | null;
  setMenuConfig: (config: MenuConfig) => void;
  updateMenuConfig: (config: MenuConfig, scope?: 'user' | 'tenant') => Promise<void>;
}

export const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

export const PlatformProvider = ({ children }: { children: ReactNode }) => {
  const { user: supabaseUser, loading: authLoading, session } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [environment, setEnvironment] = useState<Environment>('DEV');
  const [isLoading, setIsLoading] = useState(true);
  
  const [modules, setModules] = useState<any[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [menuConfig, setMenuConfig] = useState<MenuConfig | null>(null);

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

  useEffect(() => {
    if (authLoading) return;
    if (!supabaseUser) {
      setUser(null);
      setTenant(null);
      setModules([]);
      setMenuConfig(null);
      setIsLoading(false);
      return;
    }

    const fetchContext = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/platform/context`, {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
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
        if (data.menuConfig) {
          const mergedSections = systemDefaultMenuConfig.sections.map(defaultSection => {
            const savedSection = data.menuConfig.sections.find((s: any) => s.id === defaultSection.id);
            if (!savedSection) return defaultSection;
            // Find items in the default that aren't in the saved config
            const savedItemIds = new Set(savedSection.items.map((i: any) => i.id));
            const missingItems = defaultSection.items.filter(i => !savedItemIds.has(i.id));
            
            // Filter out saved items that are no longer in defaults, unless they are dynamically generated (e.g., modules)
            const currentDefaultItemIds = new Set(defaultSection.items.map(i => i.id));
            const validSavedItems = savedSection.items
              .filter((i: any) => currentDefaultItemIds.has(i.id) || i.id.startsWith('module:'))
              .map((savedItem: any) => {
                if (savedItem.id.startsWith('module:')) return savedItem;
                const defaultItem = defaultSection.items.find(i => i.id === savedItem.id);
                // Inherit code updates (like 'to', 'label') but preserve user's visibility setting
                return defaultItem ? { ...defaultItem, isVisible: savedItem.isVisible ?? defaultItem.isVisible } : savedItem;
              });

            return {
              ...savedSection,
              items: [...validSavedItems, ...missingItems]
            };
          });
          // Also include any saved sections that aren't in defaults (custom user sections)
          const defaultSectionIds = new Set(systemDefaultMenuConfig.sections.map(s => s.id));
          const customSections = data.menuConfig.sections.filter((s: any) => !defaultSectionIds.has(s.id));
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
    }
  }, [tenant?.id, supabaseUser]);

  return (
    <PlatformContext.Provider value={{ 
      user, 
      tenant, 
      environment, 
      setEnvironment, 
      isLoading,
      modules,
      modulesLoading,
      refreshModules,
      menuConfig,
      setMenuConfig,
      updateMenuConfig
    }}>
      {children}
    </PlatformContext.Provider>
  );
};
