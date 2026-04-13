import { Response, NextFunction } from 'express';
import { TenantRequest } from './tenantMiddleware';
import { resolveCapabilities } from '../lib/permissions';

/**
 * Authorization Middleware Factory
 * Checks if the current TenantMember has the required capability.
 * SuperAdmins bypass all checks.
 * 
 * @param capability The string identifying the required permission (e.g., 'manage:staff')
 */
export const authorize = (capability: string) => {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { user, db, tenantId } = req;

      if (!user) {
        return res.status(401).json({ error: 'Unauthenticated' });
      }

      // 1. SuperAdmin Bypass
      if (user.isSuperAdmin) {
        return next();
      }

      if (!db || !tenantId) {
        return res.status(500).json({ error: 'Tenant context missing for authorization' });
      }

      // 2. Fetch the current member's capabilities
      // We look up the TenantMember for this user within this tenant
      const member = await db.tenantMember.findFirst({
        where: { 
          userId: user.uid,
          tenantId: tenantId
        },
        include: {
          permissionGroups: true
        }
      });

      if (!member) {
        return res.status(403).json({ error: 'Forbidden: No member record found for this workspace' });
      }

      // 2.5 Tenant Admin Bypass
      if (member.roleId === 'admin') {
        return next();
      }

      // 3. Flatten capabilities
      const groupIds = member.permissionGroups.map(pg => pg.permissionGroupId);
      const capabilities = await resolveCapabilities(groupIds, tenantId);
      const allCapabilities = new Set(capabilities);

      // 4. Check for presence of required capability
      // Support basic wildcard: if they have 'manage:*', they match 'manage:staff'
      const [category, action] = capability.split(':');
      const hasDirectCap = allCapabilities.has(capability);
      const hasWildcardCap = allCapabilities.has(`${category}:*`) || allCapabilities.has('*:*');

      if (!hasDirectCap && !hasWildcardCap) {
        return res.status(403).json({ 
          error: `Forbidden: Missing required capability [${capability}]`,
          required: capability,
          userGroupCount: member.permissionGroups.length
        });
      }

      // 5. Success
      next();
    } catch (err: any) {
      console.error('[Authorize Middleware Error]:', err);
      res.status(500).json({ error: 'Internal authorization error' });
    }
  };
};
