import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

/**
 * POST /api/auth/sync
 * Securely synchronize the user with the global Prisma registry and return session state.
 */
router.post('/sync', authenticate, async (req: AuthRequest, res: Response) => {
  console.log(`[AuthRoute] Sync requested for: ${req.user?.email}`);
  
  if (!req.user) {
    console.error('[AuthRoute] Sync failed: No user in request');
    return res.status(401).json({ error: 'Auth failed: User not found' });
  }

  console.log(`[AuthRoute] Sync successful for ${req.user.email}. Tenants: ${req.user.tenantIds.length}`);

  res.json({
    status: 'success',
    isSuperAdmin: req.user.isSuperAdmin,
    tenantIds: req.user.tenantIds,
    roleId: req.user.roleId
  });
});

export default router;
