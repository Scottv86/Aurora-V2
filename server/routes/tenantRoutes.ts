import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/authMiddleware';
import { globalPrisma } from '../lib/prisma';

const router = Router();

/**
 * PATCH /api/tenants/:id/config
 * Saves the navigation_manifest for a specific tenant.
 */
router.patch('/:id/config', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { navigation_manifest } = req.body;
  const { isSuperAdmin, tenantIds } = req.user!;

  // Security: Ensure user has access to this tenant or is superadmin
  if (!isSuperAdmin && !tenantIds.includes(id)) {
    return res.status(403).json({ error: 'Access denied to this tenant configuration' });
  }

  try {
    await globalPrisma.tenant.update({
      where: { id },
      data: { menuConfig: navigation_manifest }
    });

    res.json({ success: true, message: 'Navigation manifest updated' });
  } catch (error) {
    console.error('[TenantAPI] Config update error:', error);
    res.status(500).json({ error: 'Failed to update tenant configuration' });
  }
});

export default router;
