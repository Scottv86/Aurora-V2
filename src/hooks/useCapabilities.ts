import { useCallback, useMemo } from 'react';
import { usePlatform } from './usePlatform';
import { useAuth } from './useAuth';
import { FieldVisibility, ModulePolicy } from '../types/roles';

export const useCapabilities = () => {
  const { user } = usePlatform();
  const { isSuperAdmin } = useAuth();

  const capabilities = useMemo(() => user?.capabilities || [], [user?.capabilities]);
  const effectivePolicies = useMemo(() => (user as any)?.effectivePolicies || null, [user]);

  /**
   * Checks if the user has a specific capability.
   * Supports wildcards (e.g. 'manage:*' matches 'manage:staff')
   * SuperAdmins and Developers always bypass capability checks within tenant context.
   */
  const hasCapability = useCallback((requiredCap: string): boolean => {
    const isDeveloper = user?.licenceType === 'Developer' || isSuperAdmin;
    if (isDeveloper) return true;
    if (capabilities.includes(requiredCap)) return true;

    const category = requiredCap.split(':')[0];
    if (capabilities.includes(`${category}:*`)) return true;
    if (capabilities.includes('*:*')) return true;

    return false;
  }, [capabilities, isSuperAdmin, user?.licenceType]);

  /**
   * Checks centralized Role Builder module-level permissions (create/read/update/delete/export/access).
   */
  const canModule = useCallback(
    (moduleId: string, action: keyof Pick<ModulePolicy, 'access' | 'create' | 'read' | 'update' | 'delete' | 'export'>): boolean => {
      if (isSuperAdmin || user?.role === 'admin' || user?.role === 'SUPERADMIN') return true;
      const modPolicy: ModulePolicy | undefined = effectivePolicies?.modulePolicies?.[moduleId];
      if (!modPolicy) return true; // Default allow unless explicitly restricted by role policy
      if (!modPolicy.access) return false;
      return Boolean(modPolicy[action]);
    },
    [effectivePolicies, isSuperAdmin, user?.role]
  );

  /**
   * Returns field-level visibility ('editable' | 'readonly' | 'masked' | 'hidden') for a module field.
   */
  const getFieldVisibility = useCallback(
    (moduleId: string, fieldId: string): FieldVisibility => {
      if (isSuperAdmin || user?.role === 'admin' || user?.role === 'SUPERADMIN') return 'editable';
      return effectivePolicies?.modulePolicies?.[moduleId]?.fields?.[fieldId]?.visibility || 'editable';
    },
    [effectivePolicies, isSuperAdmin, user?.role]
  );

  return {
    capabilities,
    effectivePolicies,
    hasCapability,
    canModule,
    getFieldVisibility,
    isSuperAdmin
  };
};
