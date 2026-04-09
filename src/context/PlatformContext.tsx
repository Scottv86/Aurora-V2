import { createContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { User, Tenant, Environment } from '../types/platform';

interface PlatformContextType {
  user: User | null;
  tenant: Tenant | null;
  environment: Environment;
  setEnvironment: (env: Environment) => void;
  isLoading: boolean;
}

export const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

export const PlatformProvider = ({ children }: { children: ReactNode }) => {
  const { user: supabaseUser, loading: authLoading, tenantIds } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [environment, setEnvironment] = useState<Environment>('DEV');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!supabaseUser) {
      setUser(null);
      setTenant(null);
      setIsLoading(false);
      return;
    }

    // Since Firestore is gone, we'll gracefully stub out the user/tenant data.
    // In a full migration, we'd fetch these from a /api/platform/me endpoint.
    // For now, we'll set a basic profile from the supabase user.
    setUser({
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      tenantId: tenantIds[0] || null,
      role: 'TENANT_ADMIN' // Satisfy Role type
    } as User);

    // Mock tenant data to avoid UI breakages (Satisfy Tenant interface)
    if (tenantIds && tenantIds.length > 0) {
      console.log(`[PlatformContext] Associated with tenant: ${tenantIds[0]}`);
      setTenant({
        id: tenantIds[0],
        name: "Acme Corp",
        slug: "acme",
        subdomain: "acme",
        status: "ACTIVE",
        plan: "ENTERPRISE",
        createdAt: new Date().toISOString(),
        environments: ["DEV", "STAGING", "PROD"],
        currentEnvironment: "DEV"
      } as Tenant);
    } else {
      console.warn(`[PlatformContext] No tenant memberships detected.`);
      setTenant(null);
    }

    setIsLoading(false);
  }, [supabaseUser, authLoading, tenantIds]);

  return (
    <PlatformContext.Provider value={{ user, tenant, environment, setEnvironment, isLoading }}>
      {children}
    </PlatformContext.Provider>
  );
};
