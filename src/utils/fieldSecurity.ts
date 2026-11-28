export interface FieldSecurityPermission {
  read: boolean;
  write: boolean;
  masked: boolean;
  hidden: boolean;
}

const DEFAULT_PERM: FieldSecurityPermission = {
  read: true,
  write: true,
  masked: false,
  hidden: false,
};

export function resolveSecurityRoleKey(user: any, fieldSecurity?: Record<string, any> | null): string | null {
  if (!fieldSecurity || typeof fieldSecurity !== 'object') return null;
  const rawRole = String(user?.role || user?.roleId || '').toLowerCase();
  
  // 1. SuperAdmin / TenantAdmin
  if (user?.isSuperAdmin || rawRole.includes('admin') || rawRole.includes('owner') || rawRole === 'tenant_admin') {
    return fieldSecurity.admin ? 'admin' : (fieldSecurity[rawRole] ? rawRole : null);
  }

  // 2. Permission group matching
  const groupIds: string[] = Array.isArray(user?.permissionGroupIds)
    ? user.permissionGroupIds
    : (Array.isArray(user?.permissionGroups)
        ? user.permissionGroups.map((g: any) => typeof g === 'string' ? g : g.id || g.permissionGroupId)
        : []);

  for (const gid of groupIds) {
    if (gid && fieldSecurity[gid]) return gid;
  }

  // 3. Direct role key
  const directRole = user?.role || user?.roleId;
  if (directRole && fieldSecurity[directRole]) return directRole;

  // 4. Archetype fallbacks
  if (rawRole.includes('manager') || rawRole.includes('lead')) {
    return fieldSecurity.manager ? 'manager' : null;
  }
  if (rawRole.includes('guest') || rawRole.includes('external')) {
    return fieldSecurity.guest ? 'guest' : null;
  }
  return fieldSecurity.staff ? 'staff' : null;
}

export function isUserAuthorizedForModule(user: any, moduleOrConfig: any): boolean {
  if (!user || user.isSuperAdmin) return true;
  const rawRole = String(user?.role || user?.roleId || '').toLowerCase();
  if (rawRole.includes('admin') || rawRole.includes('owner') || rawRole === 'tenant_admin') {
    return true;
  }

  // 1. Check centralized Role Builder modulePolicies first
  const moduleId = moduleOrConfig?.id;
  const centralModPolicy = moduleId ? user?.effectivePolicies?.modulePolicies?.[moduleId] : undefined;
  if (centralModPolicy) {
    return centralModPolicy.access !== false && centralModPolicy.read !== false;
  }

  const config = moduleOrConfig?.config && typeof moduleOrConfig.config === 'object'
    ? moduleOrConfig.config
    : (moduleOrConfig || {});

  const accessControl = config.accessControl;
  if (!accessControl || accessControl.mode !== 'restricted') {
    if (config.requiredCapability && user.capabilities) {
      const caps = Array.isArray(user.capabilities) ? user.capabilities : [];
      if (!caps.includes(config.requiredCapability) && !caps.includes('*:*')) {
        return false;
      }
    }
    return true;
  }

  const allowedGroups: string[] = Array.isArray(accessControl.allowedGroupIds) ? accessControl.allowedGroupIds : [];
  const allowedRoles: string[] = Array.isArray(accessControl.allowedRoles) ? accessControl.allowedRoles : [];

  if (allowedGroups.length === 0 && allowedRoles.length === 0) {
    return true;
  }

  const userGroupIds: string[] = Array.isArray(user?.permissionGroupIds)
    ? user.permissionGroupIds
    : (Array.isArray(user?.permissionGroups)
        ? user.permissionGroups.map((g: any) => typeof g === 'string' ? g : g.id || g.permissionGroupId)
        : []);

  const hasGroup = allowedGroups.some((gId: string) => userGroupIds.includes(gId));
  const hasRole = allowedRoles.some((r: string) => r.toLowerCase() === rawRole);

  return hasGroup || hasRole;
}

export function extractFieldSecurityMap(moduleOrConfig: any): Record<string, any> | null {
  if (!moduleOrConfig || typeof moduleOrConfig !== 'object') return null;
  return (
    moduleOrConfig.fieldSecurity ||
    moduleOrConfig.config?.fieldSecurity ||
    moduleOrConfig.moduleSettings?.fieldSecurity ||
    null
  );
}

export function getFieldSecurityPermission(
  fieldId: string,
  moduleOrConfig: any,
  user: any
): FieldSecurityPermission {
  if (!fieldId) return DEFAULT_PERM;

  // 1. Check centralized Role Builder field policies first
  const isAdmin =
    user?.isSuperAdmin ||
    String(user?.role || user?.roleId || '').toLowerCase().includes('admin') ||
    String(user?.role || user?.roleId || '').toLowerCase().includes('owner');

  if (!isAdmin) {
    const moduleId = moduleOrConfig?.id || moduleOrConfig?.moduleId;
    const centralField = moduleId
      ? user?.effectivePolicies?.modulePolicies?.[moduleId]?.fields?.[fieldId]
      : undefined;
    if (centralField?.visibility) {
      const vis = centralField.visibility;
      if (vis === 'hidden') return { read: false, write: false, masked: false, hidden: true };
      if (vis === 'masked') return { read: true, write: false, masked: true, hidden: false };
      if (vis === 'readonly') return { read: true, write: false, masked: false, hidden: false };
      return DEFAULT_PERM;
    }
  }

  // 2. Fallback to legacy module.config.fieldSecurity
  const fieldSecurity = extractFieldSecurityMap(moduleOrConfig);
  if (!fieldSecurity) return DEFAULT_PERM;

  const roleKey = resolveSecurityRoleKey(user, fieldSecurity);
  let rawPerm: any = null;

  if (roleKey && fieldSecurity[roleKey] && typeof fieldSecurity[roleKey] === 'object') {
    rawPerm = fieldSecurity[roleKey][fieldId];
  } else if (fieldSecurity[fieldId] && typeof fieldSecurity[fieldId] === 'object' && roleKey) {
    rawPerm = fieldSecurity[fieldId][roleKey];
  }

  if (!rawPerm) return DEFAULT_PERM;

  if (typeof rawPerm === 'string') {
    const mode = rawPerm.toLowerCase();
    return {
      read: mode !== 'hidden',
      write: mode === 'write' || mode === 'full',
      masked: mode === 'masked',
      hidden: mode === 'hidden',
    };
  }

  return {
    read: rawPerm.read !== false && rawPerm.hidden !== true,
    write: rawPerm.write !== false && rawPerm.hidden !== true && rawPerm.masked !== true,
    masked: Boolean(rawPerm.masked),
    hidden: Boolean(rawPerm.hidden || rawPerm.read === false),
  };
}

export function isFieldHiddenBySecurity(fieldId: string, moduleOrConfig: any, user: any): boolean {
  return getFieldSecurityPermission(fieldId, moduleOrConfig, user).hidden;
}

export function isFieldReadOnlyBySecurity(fieldId: string, moduleOrConfig: any, user: any): boolean {
  const perm = getFieldSecurityPermission(fieldId, moduleOrConfig, user);
  return !perm.write || perm.masked;
}

export function isFieldMaskedBySecurity(fieldId: string, moduleOrConfig: any, user: any): boolean {
  return getFieldSecurityPermission(fieldId, moduleOrConfig, user).masked;
}

export function formatMaskedFieldValue(val: any): string {
  if (val === undefined || val === null || val === '') return '';
  const strVal = String(val);
  if (strVal.startsWith('••••')) return strVal;
  return strVal.length > 4
    ? `${'•'.repeat(Math.min(8, strVal.length - 4))}${strVal.slice(-4)}`
    : '••••••••';
}
