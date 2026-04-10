import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { globalPrisma } from '../lib/prisma';

const router = Router();

/**
 * GET /api/platform/context
 * Returns the full context for the current authenticated user session,
 * including tenant information and user profile.
 */
router.get('/context', async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Auth failed: User session missing' });
  }

  try {
    const { uid, tenantIds } = req.user;

    // Fetch user details from DB
    const user = await globalPrisma.user.findUnique({
      where: { id: uid },
      include: {
        memberships: {
          include: {
            tenant: true
          }
        }
      }
    });

    if (!user) {
      console.warn(`[PlatformAPI] User ${uid} NOT FOUND in database`);
      return res.status(404).json({ error: 'User record not found in system' });
    }

    // Determine primary tenant
    // We prioritize actual database memberships over the token's snapshot
    let primaryMembership = user.memberships[0];
    let tenant = primaryMembership?.tenant || null;

    console.log(`[PlatformAPI] Context check: user=${user.email} admin=${user.isSuperAdmin} total_members=${user.memberships.length} primary=${tenant?.name || 'NONE'}`);

    // Fallback for SuperAdmins who might not have explicit memberships
    if (!tenant && user.isSuperAdmin) {
      console.log(`[PlatformAPI] SuperAdmin ${user.email} has no memberships. Fetching global fallback tenant.`);
      tenant = await globalPrisma.tenant.findFirst({
        orderBy: { createdAt: 'asc' }
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        isSuperAdmin: user.isSuperAdmin,
        role: primaryMembership?.roleId || (user.isSuperAdmin ? 'SUPERADMIN' : 'USER')
      },
      tenant: tenant ? {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        plan: tenant.planTier,
        status: tenant.status,
        createdAt: tenant.createdAt,
        environments: ['production']
      } : null
    });
  } catch (error: any) {
    console.error('[PlatformAPI] Context error:', error);
    res.status(500).json({ error: 'Failed to retrieve platform context' });
  }
});

export default router;
