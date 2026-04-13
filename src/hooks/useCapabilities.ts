import { useCallback, useMemo } from 'react';
import { usePlatform } from './usePlatform';
import { useAuth } from './useAuth';

export const useCapabilities = () => {
  const { user, tenant } = usePlatform();
  const { isSuperAdmin } = useAuth();

  const capabilities = useMemo(() => user?.capabilities || [], [user?.capabilities]);

  /**
   * Checks if the user has a specific capability.
   * Supports wildcards (e.g. 'manage:*' matches 'manage:staff')
   * SuperAdmins always have all capabilities.
   */
  const hasCapability = useCallback((requiredCap: string): boolean => {
    const isDeveloper = user?.licenceType === 'Developer' || isSuperAdmin;
    if (isDeveloper) return true; // Developers and SuperAdmins bypass capability checks within the tenant context
    if (capabilities.includes(requiredCap)) return true;

    // Wildcard check
    const [category, action] = requiredCap.split(':');
    if (capabilities.includes(`${category}:*`)) return true;
    if (capabilities.includes('*:*')) return true;

    return false;
  }, [capabilities, isSuperAdmin]);

  return {
    capabilities,
    hasCapability,
    isSuperAdmin
  };
};
