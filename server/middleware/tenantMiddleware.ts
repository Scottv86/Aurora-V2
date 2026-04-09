import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { getScopedPrisma, ScopedPrismaClient } from '../lib/prisma';

export interface TenantRequest extends AuthRequest {
  tenantId?: string;
  db?: ScopedPrismaClient;
}

export const requireTenantAccess = (req: TenantRequest, res: Response, next: NextFunction) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  
  if (!tenantId) {
    return res.status(400).json({ error: 'Missing x-tenant-id header' });
  }

  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  // SuperAdmins can access any tenant. Otherwise, must be in tenantIds list.
  if (!user.isSuperAdmin && !user.tenantIds.includes(tenantId)) {
    return res.status(403).json({ error: 'Forbidden: No access to this tenant' });
  }

  // Attach tenantId and scoped DB client (RLS-enabled)
  req.tenantId = tenantId;
  req.db = getScopedPrisma(tenantId, user.uid, user.isSuperAdmin);

  next();
};
