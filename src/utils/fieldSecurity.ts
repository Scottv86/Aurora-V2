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
  if (user?.isSuperAdmin || rawRole.includes('admin') || rawRole.includes('owner') || rawRole === 'tenant_admin') {
    return fieldSecurity.admin ? 'admin' : null;
  }
  if (user?.role && fieldSecurity[user.role]) return user.role;
  if (rawRole.includes('manager') || rawRole.includes('lead')) {
    return fieldSecurity.manager ? 'manager' : null;
  }
  if (rawRole.includes('guest') || rawRole.includes('external')) {
    return fieldSecurity.guest ? 'guest' : null;
  }
  return fieldSecurity.staff ? 'staff' : null;
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
