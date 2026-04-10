import { createContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { User, Tenant, Environment } from '../types/platform';
import { API_BASE_URL } from '../config';

interface PlatformContextType {
  user: User | null;
  tenant: Tenant | null;
  environment: Environment;
  setEnvironment: (env: Environment) => void;
  isLoading: boolean;
  modules: any[];
  modulesLoading: boolean;
  refreshModules: () => Promise<void>;
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

  useEffect(() => {
    if (authLoading) return;
    if (!supabaseUser) {
      setUser(null);
      setTenant(null);
      setModules([]);
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
        console.log(`[PlatformContext] Sync Success: ${data.user.email} @ ${data.tenant?.name || 'No Tenant'}`);
      } catch (err: any) {
        console.error('[PlatformContext] Sync Critical Failure:', err.message);
        setUser(null);
        setTenant(null);
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
      refreshModules
    }}>
      {children}
    </PlatformContext.Provider>
  );
};
