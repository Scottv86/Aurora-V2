import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

/**
 * POST /api/auth/sync
 * Securely synchronize the user with the global Prisma registry and return session state.
 */
router.post('/sync', authenticate, async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Auth failed: User not found' });
  }

  res.json({
    status: 'success',
    isSuperAdmin: req.user.isSuperAdmin,
    tenantIds: req.user.tenantIds,
    roleId: req.user.roleId
  });
});

export default router;
