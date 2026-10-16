import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { getScopedPrisma, ScopedPrismaClient } from '../lib/prisma';

export interface TenantRequest extends AuthRequest {
  tenantId?: string;
  db?: ScopedPrismaClient;
}

export const requireTenantAccess = (req: TenantRequest, res: Response, next: NextFunction) => {
  const rawTenantId = req.headers['x-tenant-id'];
  const tenantId = typeof rawTenantId === 'string' ? rawTenantId.trim() : '';
  
  if (!tenantId) {
    return res.status(400).json({ error: 'Missing or invalid x-tenant-id header' });
  }

  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  // SuperAdmins can access any tenant. Otherwise, must be in verified tenantIds list.
  if (!user.isSuperAdmin && !user.tenantIds.includes(tenantId)) {
    console.warn(`[TenantMiddleware Security Alert] User ${user.email} (${user.uid}) attempted unauthorized access to tenant: ${tenantId}`);
    return res.status(403).json({ error: 'Forbidden: No access to this tenant' });
  }

  // Attach tenantId and scoped DB client (RLS-enabled)
  req.tenantId = tenantId;
  req.db = getScopedPrisma(tenantId, user.uid, user.isSuperAdmin);

  next();
};

/**
 * Restricts access to Tenant Admins or SuperAdmins only.
 * Must be used after requireTenantAccess.
 */
export const requireTenantAdmin = (req: TenantRequest, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  const role = (user.roleId || '').toLowerCase();
  const isAdmin = user.isSuperAdmin || role === 'admin' || role === 'superadmin' || role === 'owner';

  if (!isAdmin) {
    return res.status(403).json({ error: 'Forbidden: Tenant Admin privileges required' });
  }

  next();
};
